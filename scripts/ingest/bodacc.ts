// BODACC ingestion: Paris goodwill sales and insolvency proceedings.
//
//   npx.cmd tsx scripts/ingest/bodacc.ts          # from 2015
//   npx.cmd tsx scripts/ingest/bodacc.ts 2010     # further back
//
// Run after scripts/ingest/bdcom.ts and geography.ts: the attachment step
// borrows coordinates from the BDCom premises sharing each address.

import type { Client } from "pg"

import { confirmOperators } from "./lib/confirm"
import { assertPrivileged, connect, inTransaction, insertRows, log, recordRun } from "./lib/db"

const PORTAL =
  "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales"

/**
 * 2015 by default. BDCom's first vintage is 2017, and the point of BODACC here
 * is to fill the gaps between three-yearly surveys — a couple of years of lead
 * time is enough for that. Earlier years are available by argument and are worth
 * loading for a longer price series, at the cost of a longer run.
 */
const DEFAULT_SINCE = 2015

/** Paris only, matching the product's scope. */
const DEPARTMENT = "75"

const FAMILIES = ["vente", "collective"] as const
type Family = (typeof FAMILIES)[number]

interface Announcement {
  id: string
  dateparution: string
  familleavis: string
  typeavis: string
  registre: string[] | null
  commercant: string | null
  tribunal: string | null
  url_complete: string | null
  listeetablissements: string | null
  listepersonnes: string | null
  jugement: string | null
}

/**
 * The record endpoint refuses an offset past 10 000 and Paris alone has 67 424
 * sales and 202 720 insolvency notices, so the whole load goes through filtered
 * exports — one window per year, which keeps every response a sane size.
 */
async function exportYear(family: Family, year: number): Promise<Announcement[]> {
  const params = new URLSearchParams({
    where:
      `familleavis="${family}" and numerodepartement="${DEPARTMENT}" ` +
      `and dateparution>="${year}-01-01" and dateparution<"${year + 1}-01-01"`,
    select:
      "id,dateparution,familleavis,typeavis,registre,commercant,tribunal,url_complete," +
      "listeetablissements,listepersonnes,jugement",
    limit: "-1",
  })
  const response = await fetch(`${PORTAL}/exports/json?${params}`, {
    headers: { "User-Agent": "paris-compass ingestion (github.com/IvandeMurard/paris-compass)" },
  })
  if (!response.ok) throw new Error(`BODACC ${family} ${year} responded ${response.status}`)
  return (await response.json()) as Announcement[]
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * The price rides inside a sentence: "Fonds acquis par achat au prix stipulé de
 * 170000,00 euros." It is parsed out, and the sentence is stored beside the
 * number so the figure stays checkable against its source — a number produced by
 * a regular expression is precisely the kind that must not travel alone.
 *
 * Measured on a 200-notice sample: 98% parse. The other 2% keep `origin_raw`
 * with a null price rather than being dropped or guessed at.
 */
const PRICE = /prix\s+(?:stipulé|principal|de\s+vente)?\s*(?:de\s+)?([0-9][0-9\s.,  ]*)\s*(?:euros|EUR|€)/i

function parsePrice(sentence: string | null): number | null {
  if (!sentence) return null
  const match = PRICE.exec(sentence)
  if (!match) return null
  // French formatting: thin spaces group thousands, the comma is the decimal mark.
  const cleaned = match[1].replace(/[\s.  ]/g, "").replace(",", ".")
  const value = Number(cleaned)
  return Number.isFinite(value) && value > 0 && value < 1e11 ? value : null
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const asArray = <T,>(value: T | T[] | null | undefined): T[] =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value]

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed === "" ? null : trimmed
}

/** 75011 -> 11. Anything outside Paris yields null rather than a wrong district. */
function arrondissementOf(postcode: string | null): number | null {
  if (!postcode || !/^75\d{3}$/.test(postcode)) return null
  const value = Number(postcode.slice(2))
  return value >= 1 && value <= 20 ? value : null
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

interface Address {
  numeroVoie?: string
  typeVoie?: string
  nomVoie?: string
  codePostal?: string
  ville?: string
}

interface Establishment {
  origineFonds?: string
  activite?: string
  adresse?: Address
}

/**
 * Insolvency notices carry no establishment — their only address is the
 * company's registered office, published under `listepersonnes`. For a small
 * trader that is usually the shop; for anything larger it is not, which is why
 * the row records where the address came from.
 */
interface Person {
  denomination?: string
  activite?: string
  adresseSiegeSocial?: Address
}

/**
 * Replaces ONE year of ONE family, a MONTH at a time: the year is fetched once, before any
 * transaction opens, then each month is replaced in its own short transaction and followed by a
 * plain VACUUM — so the transactions hold nothing but writes.
 *
 * Why a month and not the year — #239, measured on the two first real runs. Replacing a year at a
 * time held the peak, but left its working room in the files for good: the 7 October run took
 * the base from 351 to 394 MB, the 8 October run left it at 392 — a steady ~40 MB of reusable
 * space in the three BODACC tables (heap and indexes), about the size of the largest year. Under
 * a 500 MB ceiling that space is not free: it pushed SIRENE's Friday reload, which cannot reuse
 * it, past the 450 MB threshold of `npm run disque`. The working room is the largest piece
 * replaced; a month is about a twelfth of a year.
 *
 * Why piece by piece at all — #239, DIAGNOSTIC-CORRIGES.md §62. The load used to delete every
 * notice and rewrite 165 000 rows in one transaction of four and a half minutes, then UPDATE
 * every establishment to give it a position. Each daily run left the three tables at twice
 * their size, and the reload itself needed room for the old rows and the new ones at once:
 * +128 MB at the peak, measured 6 October 2026, on a project that turns read-only at 500 MB.
 * The plain VACUUM after each month hands the space back for the next one to reuse. Readers
 * are never blocked: DELETE, not TRUNCATE, so they keep seeing the previous version of a month
 * until its transaction commits.
 *
 * Everything is still re-read every day, so a correction or a withdrawal by DILA reaches the
 * base as it did before.
 */
async function loadYear(client: Client, family: Family, year: number): Promise<number | null> {
  const fetched = await exportYear(family, year)
  // An empty answer for a year that holds notices is a portal hiccup, not a withdrawal of a
  // whole year: keep what is held rather than wipe it.
  if (fetched.length === 0) return null

  // One row per notice id, whatever the export repeats: the establishments and the judgment
  // are written per notice, so a repeated id would duplicate them.
  const notices = [...new Map(fetched.map((n) => [n.id, n])).values()]

  const byMonth = new Map<number, Announcement[]>()
  for (const n of notices) {
    const month = Number(String(n.dateparution).slice(5, 7))
    if (!(month >= 1 && month <= 12)) throw new Error(`BODACC ${family} ${year} : date illisible « ${n.dateparution} »`)
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month)!.push(n)
  }

  // EVERY month of the year, including those this export returns empty: the year is not empty
  // (checked above), so an empty month is DILA having nothing — or having withdrawn what it had —
  // and its old notices must go, exactly as the year-wide delete removed them before.
  for (let month = 1; month <= 12; month += 1) {
    const part = byMonth.get(month) ?? []
    await inTransaction(client, async () => {
      // The month's previous version, then any notice of this month that sits under another
      // date — a re-dated notice would otherwise survive in its old month, twice. Cascades to
      // bodacc_establishment and bodacc_judgment.
      await client.query(
        `delete from public.bodacc_announcement
          where (family = $1 and published_on >= make_date($2, $3, 1)
                             and published_on < make_date($2, $3, 1) + interval '1 month')
             or id = any($4::text[])`,
        [family, year, month, part.map((n) => n.id)],
      )
      if (part.length > 0) await writeNotices(client, family, part)
    })
    await client.query("vacuum public.bodacc_announcement, public.bodacc_establishment, public.bodacc_judgment")
  }
  return notices.length
}

async function writeNotices(client: Client, family: Family, notices: Announcement[]): Promise<void> {
  const announcements = notices.map((n) => [
    n.id,
    family,
    text(n.typeavis) ?? "annonce",
    n.dateparution,
    // `registre` repeats the SIREN spaced and unspaced; keep the digits only.
    text(asArray(n.registre).map((r) => String(r).replace(/\s/g, ""))[0]),
    text(n.commercant),
    text(n.tribunal),
    text(n.url_complete),
  ])

  await insertRows(
    client,
    "public.bodacc_announcement",
    ["id", "family", "notice_type", "published_on", "siren", "trader_name", "tribunal", "url"],
    announcements,
    "on conflict (id) do nothing",
  )

  const establishments: unknown[][] = []
  const judgments: unknown[][] = []

  const row = (
    noticeId: string,
    address: Address,
    activity: string | null,
    origin: string | null,
    source: "etablissement" | "siege_social",
  ): unknown[] => {
    const postcode = text(address.codePostal)
    const price = parsePrice(origin)
    return [
      noticeId,
      text(address.numeroVoie),
      text(address.typeVoie),
      text(address.nomVoie),
      postcode,
      arrondissementOf(postcode),
      activity,
      origin,
      price,
      price === null ? null : "origine_fonds",
      source,
    ]
  }

  for (const notice of notices) {
    const list = parseJson<{ etablissement?: Establishment | Establishment[] }>(
      notice.listeetablissements,
    )
    const sold = asArray(list?.etablissement).filter(Boolean)
    for (const e of sold) {
      establishments.push(
        row(notice.id, e.adresse ?? {}, text(e.activite), text(e.origineFonds), "etablissement"),
      )
    }

    // Only when the notice publishes no establishment of its own — otherwise
    // the registered office would duplicate an address we already know
    // precisely, and weaken it.
    if (sold.length === 0) {
      const people = parseJson<{ personne?: Person | Person[] }>(notice.listepersonnes)
      for (const p of asArray(people?.personne)) {
        if (!p?.adresseSiegeSocial?.nomVoie) continue
        establishments.push(
          row(notice.id, p.adresseSiegeSocial, text(p.activite), null, "siege_social"),
        )
      }
    }

    const judgment = parseJson<{ famille?: string; nature?: string; date?: string }>(
      notice.jugement,
    )
    if (judgment) {
      judgments.push([
        notice.id,
        text(judgment.famille),
        text(judgment.nature),
        // Some notices carry no date, or a partial one; a bad date must not
        // fail the batch, so anything unparseable becomes null.
        /^\d{4}-\d{2}-\d{2}$/.test(String(judgment.date ?? "")) ? judgment.date : null,
      ])
    }
  }

  await insertRows(
    client,
    "public.bodacc_establishment",
    ["announcement_id", "house_number", "way_type", "way_name", "postcode",
      "arrondissement", "activity", "origin_raw", "price_eur", "price_source",
      "address_source"],
    establishments,
  )
  await insertRows(
    client,
    "public.bodacc_judgment",
    ["announcement_id", "family", "nature", "judged_on"],
    judgments,
    "on conflict (announcement_id) do nothing",
  )
  const ids = notices.map((n) => n.id)
  await attach(client, ids)
  // In the year's own transaction: the year commits WITH its SIRENE verdicts. Left to the
  // chained `sirene.ts --confirm-only`, every reloaded row stood unconfirmed until that step ran,
  // and a run broken halfway left the finished years without them — the review of #243.
  await confirmOperators(client, ids)
}

/**
 * BODACC publishes no coordinates, so a notice borrows the position of the BDCom
 * premises at the same address. Matching is on the shared street key plus the
 * house number — never on the address string, whose casing and punctuation
 * differ between the two sources.
 *
 * Scoped to the notices just written. It used to update every establishment of every year
 * on every run, which rewrote the whole table daily — #239. The positions themselves come from
 * tmp_address_geom, built once per run by main().
 */
async function attach(client: Client, noticeIds: string[]): Promise<void> {
  await client.query(
    `update public.bodacc_establishment e
        set geom = p.geom
       from tmp_address_geom p
      where e.announcement_id = any($1::text[])
        and e.street_key = p.street_key
        and e.house_number_int = p.num`,
    [noticeIds],
  )
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const since = Number(process.argv[2]) || DEFAULT_SINCE
  if (since < 2008 || since > new Date().getFullYear()) {
    throw new Error(`année de départ invalide : ${since}`)
  }

  assertPrivileged()
  const startedAt = Date.now()
  const client = await connect()
  try {
    // One address -> position map for the whole run, held by this session and dropped with it.
    await client.query(`
      create temporary table tmp_address_geom as
      select l.street_key, l.num, ST_Centroid(ST_Collect(l.geom::geometry))::geography as geom
        from public.premise_location l
       where l.street_key is not null and l.num is not null
       group by l.street_key, l.num
    `)
    await client.query("create index on tmp_address_geom (street_key, num)")

    // Every year is still re-read, so a correction or a withdrawal by DILA reaches the base —
    // the reason the load was rebuilt wholesale. What changed is the unit of replacement: a
    // month, in its own transaction, with a plain VACUUM after it so the next month reuses the
    // space instead of growing the files. See loadYear.
    const thisYear = new Date().getFullYear()
    let skipped = 0
    for (const family of FAMILIES) {
      log(`famille ${family}`, `depuis ${since}`)
      for (let year = since; year <= thisYear; year += 1) {
        const written = await loadYear(client, family, year)
        if (written === null) {
          skipped += 1
          log(`  ${family} ${year}`, "aucune annonce rendue — l'année en base est gardée telle quelle")
          continue
        }
        log(`  ${family} ${year}`, `${written} annonces, remplacées mois par mois`)
      }
    }
    if (skipped > 0) log("années non rendues par le portail", String(skipped))

    const summary = await client.query<{ label: string; n: string }>(`
      select 'cessions'                as label, count(*)::text as n from public.bodacc_announcement where family = 'vente'
      union all select 'procédures collectives', count(*)::text from public.bodacc_announcement where family = 'collective'
      union all select 'établissements',         count(*)::text from public.bodacc_establishment
      union all select 'avec un prix lu',        count(*)::text from public.bodacc_establishment where price_eur is not null
      union all select 'situés sur une adresse BDCom', count(*)::text from public.bodacc_establishment where geom is not null
    `)
    log("terminé")
    for (const row of summary.rows) log(`  ${row.label}`, row.n)

    // The newest notice actually held, not the date of the run. If DILA has published nothing
    // for a week, this stays a week old — which is the true answer, and the one a caller needs
    // in order to know whether a recent sale would already be visible.
    const newest = await client.query<{ as_of: string | null; n: string }>(
      `select max(published_on)::text as as_of, count(*)::text as n from public.bodacc_announcement`,
    )
    await recordRun(client, "bodacc", {
      rowCount: Number(newest.rows[0]?.n ?? 0),
      sourceAsOf: newest.rows[0]?.as_of ?? "inconnu",
      durationMs: Date.now() - startedAt,
    })
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  log("ÉCHEC", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
