// Le ledger distant contre les migrations suivies par git — w1-ledger (#82), et la cinquième
// application de « énumérer, pas lister » après les scripts npm (arms.ts, #71), les sources
// d'ingestion (cadences.ts, #70), le catalogue (catalogue.ts, #73) et les appelants de
// PostgREST (observabilite.ts, #81).
//
// ── The hole this closes ──────────────────────────────────────────────────────────────────
//
// On 5 September 2026 the remote carried, for twenty-four hours, a schema the repository did
// not know about: `20260905000006_geometrie_finie.sql` was applied — ledger at 53 — while
// `supabase/migrations/` tracked 52. Eleven arms looked at the repository and at the remote
// that morning and not one compared them, because none of them was pointed at that pair:
// `eval` compares the remote to rules, `verify:mcp` compares the MCP tools to the remote,
// `catalogue` compares the catalogue to external endpoints, `freshness` compares cadences to
// load dates, `sessions:check` compares the order table to GitHub, `porte:publie` compares the
// served bundle to its configuration. The measurement that found the gap was made by hand, the
// next day, because somebody read a session message and wondered.
//
// The capability had existed: `scripts/eval/_dump-fn.ts` and `_cmp-fn.ts` compared a function's
// body in the database to the versioned file. They were swept away on 26 August with `.fn-dump/`
// by a `git add -A`, as throwaway tooling, and the gap was named the same day — *le dépôt ne
// sait pas vérifier mécaniquement que ce qui est déployé correspond à ce qui est versionné*.
// Ten days later that is exactly the hole the incident went through. A control deleted because
// it was throwaway did not make its need throwaway.
//
// ── Doctrine — the reason this arm is not one more reading of the remote ───────────────────
//
// `supabase/migrations/` DESCRIBES a schema; it does not OBSERVE one. The ledger is the
// measurement, the repository is the prose, and this is the only arm that cross-checks one by
// the other. CLAUDE.md's rule — « une documentation n'est pas une mesure » — applied to the
// schema itself.
//
// ── Tracked by git, never the disk, and the nuance IS the defect ───────────────────────────
//
// The file was on disk on 5 September; it was not tracked. A rule reading `readdirSync` would
// have been green all along and would have missed the only incident it exists for. So the
// population comes from `git ls-files`, the one authority that knows what this repository
// carries — the reflex observabilite.ts and envPublic.test.ts already have, here for the
// opposite reason: there, an untracked draft had to be SEEN; here, an untracked file is exactly
// what must not count as versioned.
//
// ── The two directions do not mean the same thing ─────────────────────────────────────────
//
// A migration in the ledger and not in the repository is a schema nobody can rebuild: it is a
// red, and the decision is to commit the file or to say why it will never exist. A migration in
// the repository and not in the ledger is work not yet laid down — normal between writing a
// file and pushing it — so it is « changé, sans décision requise ». Adding the two into one
// count would say « 2 écarts » for two facts that ask for opposite things.
//
// ── Bodies, and what was measured before promising anything ───────────────────────────────
//
// Point 3 of the ticket made this conditional on a measurement: the ledger has to keep the
// text. It does. `supabase_migrations.schema_migrations` carries `statements text[]` — measured
// 6 September 2026 on dbefhvmyfmmhjeetdddu: 53 rows, none null, none empty, the last one 20
// statements, and the first of them the file's own header comment. So the comparison goes past
// the identifiers, which is the half `_cmp-fn.ts` took away with it.
//
// The normalisation was measured rather than chosen. Joining the statements and collapsing
// whitespace, treating `;` as whitespace, made 51 of the 53 rows identical to their tracked
// file, character for character. Joining on `;` instead — the shape that looks more faithful —
// matched 0 of 53, then 2 of 53 with a trailing separator: the CLI does not preserve where the
// semicolons were. So the comparison is deliberately blind to whitespace and to semicolon
// placement, and that is a limit, written below.
//
// The two rows that did NOT match are a real finding, and they are recorded rather than
// silenced — DIAGNOSTIC.md §39. `20260825000002` and `20260825000003` were edited on 25 August
// (commit 89aa8ac) AFTER being applied, to move their comments from French to English as
// CLAUDE.md asks. Nothing executable differs — measured statement by statement — but the
// deployed `comment on column public.ingestion_run.run_by` is in French while the repository
// says English, and no rereading of the repository could ever have said so.
//
// ── Why a recorded divergence is not an exemption table ───────────────────────────────────
//
// The ledger is history: it holds the text that was applied, on the day it was applied. A file
// edited afterwards diverges from it FOREVER, and no migration can ever repair that row. A
// permanent red is the muted alert this repository refuses everywhere else. So a divergence
// gets written into `scripts/porte/ledger.json` with its reason — and with the fingerprint of
// BOTH sides. The fingerprints are what stop it from being a blanket excuse: the reason covers
// one measured state and no other, and the day either side moves again, the entry stops
// matching and the arm goes red. arms.ts, catalogue.json and observabilite.json each learned
// the orphan direction; this one adds the stale direction, which is the same lesson about prose
// that has stopped describing anything.
//
// ── What this does NOT catch, and it is the ledger's limit rather than the arm's ───────────
//
// A schema changed BY HAND on the remote — a `create index` typed into the SQL editor, a column
// dropped — leaves no trace in the ledger at all. The ledger records what `supabase db push`
// applied, and nothing else; this arm will never see such a change, and neither would any
// amount of care in reading it. That is why docs/REPRISE-PIEGES.md says not to apply SQL by
// hand when a push is refused, and it is now the reason rather than a preference. What DOES
// catch a hand-made change is the rest of the protocol: `eval`'s invariants read the live
// catalogue — I42 enumerates the geography columns from `pg_attribute` — so a table born
// outside a migration enters them red.
//
// Three narrower limits: the comparison is blind to whitespace and semicolon placement, as
// measured above; a ledger row whose `statements` is null cannot be compared beyond its
// identifier, and says so rather than passing; and a file rewritten with the SAME normalised
// body as the ledger is indistinguishable from one never touched, which is the correct answer.

import { execFileSync } from "child_process"
import { createHash } from "crypto"
import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

/** `<version>_<name>.sql` — the shape the Supabase CLI derives both halves of a row from. */
const MIGRATION = /^(\d{14})_(.+)\.sql$/

/** One tracked migration file, as the repository carries it. */
export interface Migration {
  /** The 14-digit timestamp. The key both sides are joined on. */
  version: string
  /** The part after the underscore, which is what the CLI stores in `name`. */
  name: string
  /** Repository-relative path, forward slashes. */
  path: string
  /** The file as written, unnormalised. */
  body: string
}

/** One row of `supabase_migrations.schema_migrations`, as the remote holds it. */
export interface LedgerRow {
  version: string
  name: string | null
  /** The applied text, split into statements by the CLI. Null when the remote kept none. */
  statements: string[] | null
}

/**
 * The comparable form of a migration body — measured, not chosen. See the header.
 *
 * Blind to whitespace and to semicolon placement, because the CLI does not preserve either.
 * Carriage returns go first: a file checked out on Windows carries them and the remote does
 * not, so without this every single row would diverge on a machine and none on a runner — a
 * check whose verdict depends on the operating system is the defect DIAGNOSTIC.md §33 cost.
 */
export function normaliser(sql: string): string {
  return sql.replace(/\r\n/g, "\n").replace(/;/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * A short fingerprint of a normalised body, for writing a measured state down in JSON.
 *
 * Twelve hex characters of SHA-256: enough that two bodies do not collide by accident, short
 * enough that a person reading `ledger.json` sees a reason rather than a wall of hash.
 */
export function empreinte(sql: string): string {
  return createHash("sha256").update(normaliser(sql), "utf8").digest("hex").slice(0, 12)
}

/**
 * The migrations git tracks, read from git rather than from the disk.
 *
 * `ls-files` and nothing else: no `--others`, deliberately and against the reflex
 * observabilite.ts has. An untracked migration is precisely what 5 September looked like, and
 * counting it here would make the arm green on the one state it exists to catch.
 */
export function migrationsSuivies(root = ROOT): Migration[] {
  const listed = execFileSync("git", ["ls-files", "--", "supabase/migrations"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".sql"))

  const migrations: Migration[] = []
  for (const path of listed) {
    const parsed = MIGRATION.exec(path.split("/").pop() ?? "")
    if (!parsed) continue
    let body: string
    try {
      body = readFileSync(resolve(root, path), "utf8")
    } catch {
      // Tracked and gone from disk — a deletion staged but not committed. The identifier is
      // still the truth of what git carries, so the row stays with an empty body and the
      // comparison will call it out rather than skip it.
      body = ""
    }
    migrations.push({ version: parsed[1], name: parsed[2], path, body })
  }
  return migrations
}

/** A divergence somebody has measured, written down, and dated. */
export interface DivergenceAdmise {
  /** Why the two sides differ, and it must be a fact about the past, not a preference. */
  raison: string
  /** `empreinte()` of the tracked file at the time the reason was written. */
  depot: string
  /** `empreinte()` of the joined ledger statements at the same time. */
  ledger: string
}

/** The recorded divergences, keyed by version. */
export function readDivergencesAdmises(
  path = resolve(ROOT, "scripts/porte/ledger.json"),
): Record<string, DivergenceAdmise> {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    "corps-diverge"?: Record<string, DivergenceAdmise>
  }
  return parsed["corps-diverge"] ?? {}
}

export type LedgerState =
  /** Same identifier, same name, same normalised body. */
  | "apparie"
  /** Bodies differ, and ledger.json records this exact pair of fingerprints. */
  | "corps-admis"
  /** Bodies differ and nothing says why. */
  | "corps-diverge"
  /** ledger.json records a divergence, but one of the two sides has moved since. */
  | "corps-admis-perime"
  /** Same version, different name: the file was renamed after being applied. */
  | "nom-diverge"
  /** The remote kept no statements for this row, so only the identifier could be compared. */
  | "corps-inconnu"
  /** In the ledger, tracked by nobody. A schema no one can rebuild. */
  | "absent-du-depot"
  /** Tracked, never applied. Work written and not yet laid down. */
  | "absent-du-ledger"
  /** ledger.json names a version neither side carries. */
  | "admise-orpheline"

export interface LedgerVerdict {
  version: string
  state: LedgerState
  /** What a reader needs to act, or to know that nothing is being asked of them. */
  detail: string
}

/**
 * Compares the two lists, in both directions, and names the identifiers in each.
 *
 * Everything this arm decides is decided here, on values, with no database and no filesystem:
 * that is what lets `ledger.test.ts` and the seventh act of `porte:sabotage` play the REAL rule
 * with substituted inputs rather than a copy of it — scripts/eval/census.ts says why that
 * distinction is the whole worth of a demonstration.
 */
export function classifyLedger(
  rows: LedgerRow[],
  files: Migration[],
  admises: Record<string, DivergenceAdmise>,
): LedgerVerdict[] {
  const parVersion = new Map(files.map((f) => [f.version, f]))
  const verdicts: LedgerVerdict[] = []

  for (const row of rows) {
    const file = parVersion.get(row.version)
    if (!file) {
      verdicts.push({
        version: row.version,
        state: "absent-du-depot",
        detail:
          `« ${row.name ?? "sans nom"} » est posée sur le distant et aucun fichier suivi par git ne la ` +
          "porte : le schéma appliqué ne peut être reconstruit par personne. Vérifier d'abord " +
          "`git status supabase/migrations/` — le fichier est peut-être sur le disque, non suivi, " +
          "ce qui est exactement l'état du 5 septembre 2026.",
      })
      continue
    }
    if (row.name !== null && row.name !== file.name) {
      verdicts.push({
        version: row.version,
        state: "nom-diverge",
        detail:
          `le ledger a posé « ${row.name} », le dépôt suit « ${file.name} » : le fichier a été ` +
          "renommé après son application, et le nom d'une migration est ce par quoi elle se cite.",
      })
      continue
    }
    if (row.statements === null || row.statements.length === 0) {
      verdicts.push({
        version: row.version,
        state: "corps-inconnu",
        detail:
          `« ${file.name} » est appariée par son identifiant, et le distant n'a gardé aucun texte ` +
          "pour elle : le corps n'a pas pu être comparé. Rien n'est affirmé sur son contenu.",
      })
      continue
    }

    const cotéLedger = row.statements.join(" ")
    if (normaliser(cotéLedger) === normaliser(file.body)) {
      verdicts.push({
        version: row.version,
        state: "apparie",
        detail: `« ${file.name} » — identifiant et corps identiques`,
      })
      continue
    }

    const admise = admises[row.version]
    if (!admise) {
      verdicts.push({
        version: row.version,
        state: "corps-diverge",
        detail:
          `« ${file.name} » porte le même identifiant des deux côtés et un corps différent — ` +
          `dépôt ${empreinte(file.body)}, ledger ${empreinte(cotéLedger)}. Deux causes possibles ` +
          "et elles n'appellent pas la même chose : le fichier a été réécrit après son " +
          "application, ou le fichier suivi n'est pas celui qui a été posé.",
      })
      continue
    }
    const depotBouge = admise.depot !== empreinte(file.body)
    const ledgerBouge = admise.ledger !== empreinte(cotéLedger)
    if (depotBouge || ledgerBouge) {
      const cote = depotBouge && ledgerBouge ? "les deux côtés ont" : depotBouge ? "le dépôt a" : "le ledger a"
      verdicts.push({
        version: row.version,
        state: "corps-admis-perime",
        detail:
          `ledger.json consigne une divergence pour « ${file.name} », et ${cote} bougé depuis : ` +
          `consigné dépôt ${admise.depot} / ledger ${admise.ledger}, mesuré dépôt ` +
          `${empreinte(file.body)} / ledger ${empreinte(cotéLedger)}. La raison écrite décrit un ` +
          "état qui n'est plus celui-là.",
      })
      continue
    }
    verdicts.push({
      version: row.version,
      state: "corps-admis",
      detail: `« ${file.name} » — divergence consignée : ${admise.raison}`,
    })
  }

  const auLedger = new Set(rows.map((r) => r.version))
  for (const file of files) {
    if (auLedger.has(file.version)) continue
    verdicts.push({
      version: file.version,
      state: "absent-du-ledger",
      detail:
        `« ${file.name} » est suivie par git et le distant ne l'a pas posée : du travail écrit et ` +
        "pas encore appliqué. Normal entre l'écriture et la poussée ; anormal le lendemain.",
    })
  }

  const connues = new Set([...auLedger, ...files.map((f) => f.version)])
  for (const version of Object.keys(admises)) {
    if (connues.has(version)) continue
    verdicts.push({
      version,
      state: "admise-orpheline",
      detail:
        "ledger.json consigne une divergence pour une migration qu'aucun des deux côtés ne porte : " +
        "la raison est de la prose qui ne décrit plus rien.",
    })
  }

  return verdicts.sort((a, b) => a.version.localeCompare(b.version))
}

/** The states that leave nobody anything to do. */
export function estApparie(state: LedgerState): boolean {
  return state === "apparie" || state === "corps-admis"
}

/**
 * The states that ask for a decision — everything that is neither green nor merely unsettled.
 *
 * `absent-du-ledger` and `corps-inconnu` are deliberately absent: the first is work in flight,
 * the second is a limit of the remote's own bookkeeping. Neither is a defect of this repository,
 * and waking somebody for them every morning is how an alert gets muted — #71.
 */
export function demandeUneDecision(state: LedgerState): boolean {
  return !estApparie(state) && state !== "absent-du-ledger" && state !== "corps-inconnu"
}
