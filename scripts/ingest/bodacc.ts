// BODACC ingestion: Paris goodwill sales and insolvency proceedings.
//
//   npx.cmd tsx scripts/ingest/bodacc.ts          # from 2015
//   npx.cmd tsx scripts/ingest/bodacc.ts 2010     # further back
//
// Run after scripts/ingest/bdcom.ts and geography.ts: the attachment step
// borrows coordinates from the BDCom premises sharing each address.

import type { Client } from "pg"

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

async function loadFamily(client: Client, family: Family, since: number): Promise<number> {
  const thisYear = new Date().getFullYear()
  let total = 0

  for (let year = since; year <= thisYear; year += 1) {
    const notices = await exportYear(family, year)
    if (notices.length === 0) continue

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

    total += notices.length
    log(`  ${family} ${year}`, `${notices.length} annonces, ${establishments.length} établissements`)
  }
  return total
}

/**
 * BODACC publishes no coordinates, so a notice borrows the position of the BDCom
 * premises at the same address. Matching is on the shared street key plus the
 * house number — never on the address string, whose casing and punctuation
 * differ between the two sources.
 */
async function attach(client: Client): Promise<void> {
  const attached = await client.query(`
    update public.bodacc_establishment e
       set geom = p.geom
      from (
        select l.street_key, l.num, ST_Centroid(ST_Collect(l.geom::geometry))::geography as geom
        from public.premise_location l
        where l.street_key is not null and l.num is not null
        group by l.street_key, l.num
      ) p
     where e.street_key = p.street_key
       and e.house_number_int = p.num
  `)
  log("  rattachement à une adresse BDCom", `${attached.rowCount} établissements`)
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
    await inTransaction(client, async () => {
      // Rebuilt wholesale: BODACC republishes corrections as new notices, so a
      // partial refresh would leave superseded rows behind with nothing marking
      // them as stale.
      await client.query("delete from public.bodacc_announcement")
      for (const family of FAMILIES) {
        log(`famille ${family}`, `depuis ${since}`)
        await loadFamily(client, family, since)
      }
      await attach(client)
    })

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
