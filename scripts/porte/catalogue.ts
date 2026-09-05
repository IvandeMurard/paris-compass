// Which sources of the catalogue are actually verified — w1-catalogue (#73), point 3, and it
// is the deliverable rather than the probes themselves.
//
// `docs/PLAN-ACTION-VACANCE.md` carries a table of thirty-odd sources with, for each, its
// producer, its status, its licence and its trap. `src/services/opendata/sources.ts` publishes
// part of it on /sources. Both are held by hand: they ASSERT that a source is connected under
// such-and-such a licence, and nothing cross-checks it. The failure mode is documented rather
// than supposed — #56, 25 August 2026: INSEE REPLACED its resource instead of archiving it,
// the pinned URL answered 404, and nobody knew until somebody ran the loader.
//
// So the population is ENUMERATED, exactly as scripts/porte/arms.ts enumerates npm scripts and
// scripts/porte/cadences.ts enumerates the sources a migration declares. Every row of the
// catalogue table is a source; each must be classified exactly once — either a probe in
// scripts/porte/catalogue.json says how to ask it, or that same file carries a written reason
// why it is not asked. Never a silence. This is the third application of the rule, and the
// first whose population lives in prose.
//
// ── Why the markdown table rather than a list held here ───────────────────────────────────
//
// The catalogue IS the place a source comes into existence in this repository: a dataset is
// written into that table on the day somebody decides it is a candidate, months before any
// loader exists. Copying it into a TypeScript array would create the second inventory #70 was
// closed to avoid, and the two would drift on the first row added to only one of them. Read
// where the value is produced — the same reasoning that made cadences.ts read the migrations
// rather than the database.
//
// ── What a `refusée` source is, and why it is not asked anything ──────────────────────────
//
// A refusal is a decision, not an outage to watch. Probing SeLoger every morning to confirm
// that its terms of use still forbid reuse would be an alert that can only ever say the same
// thing, and this repository has already ruled on what happens to those. `écartée` — a track
// closed after verification, like the DIA one on 27 August 2026 — is the same class.
//
// Deliberately without a markdown parser, for the reason arms.ts and cadences.ts already give:
// a handful of pipes does not justify a dependency. Carriage returns are normalised first —
// the trap that cost half an hour on 31 August 2026, written in docs/REPRISE-PIEGES.md.

import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

/** The heading the catalogue table sits under. Named once, so a rename is a single red. */
const HEADING = "## Catalogue des sources"

/**
 * The statuses the catalogue may declare, and what each one means for this check.
 *
 * `interroge: false` is the refusal side — a decision rather than a source to watch. An
 * unknown status is NEVER folded into a neighbouring one: a word nobody here has read is a
 * word nobody here has decided about, and guessing in the generous direction is how a check
 * stops checking. It is a red of its own.
 */
export const STATUSES: Record<string, { canonical: string; interroge: boolean }> = {
  "connectée": { canonical: "connectee", interroge: true },
  "ingérée": { canonical: "ingeree", interroge: true },
  "planifiée": { canonical: "planifiee", interroge: true },
  "nouvelle": { canonical: "nouvelle", interroge: true },
  "partenariat": { canonical: "partenariat", interroge: true },
  "refusée": { canonical: "refusee", interroge: false },
  "écartée": { canonical: "ecartee", interroge: false },
}

export type CanonicalStatus = string

export interface CatalogueEntry {
  /** The source's name as the table spells it — the key everything else is written against. */
  name: string
  producteur: string
  /** The status cell, verbatim, annotations included. */
  statutBrut: string
  canonical: CanonicalStatus
  /** True when the status cell says the source is on screen, e.g. « ingérée · affichée ». */
  affichee: boolean
  /** The licence cell, verbatim. What a probe is asked to corroborate. */
  licence: string
}

/**
 * Markdown emphasis and links removed, whitespace collapsed. The cell as a human reads it.
 *
 * Underscores are deliberately KEPT. They are markdown emphasis in principle and dataset
 * identifiers in fact — `plub_protcom` is the name of a layer — and stripping them renamed a
 * source to something no portal answers to. The catalogue never uses `_` for emphasis.
 */
function plain(cell: string): string {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * The canonical status, read from the FIRST word of the cell.
 *
 * The cell carries annotations — « ingérée · affichée », « écartée — non publiée, vérifié le
 * 27/08 » — and the annotation is the part that changes. Reading the first word keeps the
 * classification stable while the note beside it evolves. The limit, and it is worth stating:
 * a status written as « planifiée, sauf 2017 » would be read as planned outright, and nothing
 * here would notice the exception. The cell is not a place to hide a second decision.
 */
export function statusOf(cell: string): { canonical: CanonicalStatus; affichee: boolean } {
  const word = /^[a-zà-öø-ÿ]+/i.exec(cell.trim().replace(/[*`]/g, ""))?.[0]?.toLowerCase() ?? ""
  return {
    canonical: STATUSES[word]?.canonical ?? "inconnu",
    affichee: /affich/i.test(cell),
  }
}

/** True when a source of this status is asked anything at all. */
export function estInterrogee(canonical: CanonicalStatus): boolean {
  for (const value of Object.values(STATUSES)) {
    if (value.canonical === canonical) return value.interroge
  }
  // `inconnu` included: an unread status is not a licence to stay silent, it is its own red.
  return true
}

/**
 * Reads the catalogue table.
 *
 * Only the rows under `## Catalogue des sources` and before the next `##` heading are read:
 * the file carries other tables — « Écarts corrigés », the ticket lists — and a check that
 * read them all would classify prose as sources. The header row and the `---` separator are
 * dropped by requiring four cells and a first one that is neither empty nor the column title.
 */
export function readCatalogue(
  path = resolve(ROOT, "docs/PLAN-ACTION-VACANCE.md"),
): CatalogueEntry[] {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const start = text.indexOf("\n" + HEADING + "\n")
  if (start === -1) throw new Error(HEADING + " introuvable dans " + path)
  const rest = text.slice(start + HEADING.length + 2)
  const end = rest.search(/\n## /)
  const block = end === -1 ? rest : rest.slice(0, end)

  const entries: CatalogueEntry[] = []
  for (const line of block.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("|")) continue
    const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map(plain)
    if (cells.length < 4) continue
    const [name, producteur, statutBrut, licence] = cells
    if (!name || name === "Source" || /^-+$/.test(name)) continue
    entries.push({ name, producteur, statutBrut, licence, ...statusOf(statutBrut) })
  }
  return entries
}

/** How an endpoint is read. Each one is implemented in scripts/porte/catalogue-verify.ts. */
export type Lecture = "opendatasoft" | "datagouv" | "arcgis" | "http"

export interface Probe {
  lecture: Lecture
  /** The endpoint itself — never the portal page that describes it (CLAUDE.md, `Measured<T>`). */
  endpoint: string
  /**
   * The licence string the endpoint's own metadata must still carry, or null.
   *
   * Null is legal only alongside `licence-non-lisible`: an endpoint that publishes no licence
   * field is a fact to write down, not a check less. BDCom's ArcGIS layer answers with an
   * empty `copyrightText` and BODACC's portal entry with `license: null` — both measured
   * 5 September 2026 — so for those two the licence in the catalogue rests on a reading a
   * human did, and this file says so rather than pretending a machine confirmed it.
   */
  "licence-attendue": string | null
  "licence-non-lisible"?: string
  note?: string
}

export interface ProbeFile {
  verifications: Record<string, Probe>
  "sans-verification": Record<string, string>
}

export function readProbes(path = resolve(ROOT, "scripts/porte/catalogue.json")): ProbeFile {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<ProbeFile>
  return {
    verifications: parsed.verifications ?? {},
    "sans-verification": parsed["sans-verification"] ?? {},
  }
}

export type CatalogueState =
  | "verifiee"
  | "excusee"
  | "hors-population"
  | "muette"
  | "contradictoire"
  | "orpheline"
  | "statut-inconnu"

export interface CatalogueVerdict {
  name: string
  state: CatalogueState
  canonical: CanonicalStatus
  /** The licence the catalogue announces — what a probe is asked to corroborate. */
  licence: string
  /** The probe that asks it, or the written reason it is not asked. */
  detail: string
  probe?: Probe
}

/**
 * Classifies every catalogue row, and reports the entries that no longer name one.
 *
 * `orpheline` is the direction a table of exemptions always forgets — a reason kept for a
 * source that has left the catalogue is prose claiming to cover something that does not
 * exist. `contradictoire` is the other: a source both probed and excused means one of the two
 * is a leftover, and guessing which would be the check deciding on the author's behalf. Both
 * were learned by scripts/porte/arms.ts and scripts/porte/cadences.ts before this.
 */
export function classifyCatalogue(
  entries: CatalogueEntry[],
  probes: Record<string, Probe>,
  excuses: Record<string, string>,
): CatalogueVerdict[] {
  const verdicts: CatalogueVerdict[] = entries.map((entry) => {
    const base = { name: entry.name, canonical: entry.canonical, licence: entry.licence }
    const probe = probes[entry.name]
    const excuse = excuses[entry.name]

    if (entry.canonical === "inconnu") {
      return {
        ...base,
        state: "statut-inconnu",
        detail:
          "statut « " + entry.statutBrut + " » que scripts/porte/catalogue.ts ne sait pas lire. " +
          "Le nommer dans STATUSES en disant s'il s'interroge ou non — jamais le laisser " +
          "tomber dans le statut voisin.",
      }
    }

    if (!estInterrogee(entry.canonical)) {
      if (probe || excuse) {
        return {
          ...base,
          state: "contradictoire",
          detail:
            "statut « " + entry.statutBrut + " » : un refus est une décision, pas une panne à " +
            "surveiller, et catalogue.json lui donne pourtant une entrée. La retirer.",
        }
      }
      return {
        ...base,
        state: "hors-population",
        detail: "statut « " + entry.statutBrut + " » — non interrogée",
      }
    }

    if (probe && excuse) {
      return {
        ...base,
        state: "contradictoire",
        detail: "vérifiée par " + probe.endpoint + " et pourtant excusée : « " + excuse + " »",
      }
    }
    if (probe) {
      if (probe["licence-attendue"] === null && !probe["licence-non-lisible"]?.trim()) {
        return {
          ...base,
          state: "contradictoire",
          detail:
            "aucune licence attendue et aucune raison écrite de ne pas en attendre. Un endpoint " +
            "qui ne publie pas de licence est un fait à consigner, pas un contrôle en moins.",
        }
      }
      return { ...base, state: "verifiee", detail: probe.endpoint, probe }
    }
    if (excuse && excuse.trim() !== "") return { ...base, state: "excusee", detail: excuse }

    return {
      ...base,
      state: "muette",
      detail:
        "statut « " + entry.statutBrut + " », licence « " + entry.licence + " » annoncée par le " +
        "catalogue, et rien ne la recoupe. Lui donner une entrée dans `verifications` de " +
        "scripts/porte/catalogue.json, ou écrire dans `sans-verification` pourquoi elle n'en a pas.",
    }
  })

  const known = new Set(entries.map((e) => e.name))
  for (const name of [...Object.keys(probes), ...Object.keys(excuses)]) {
    if (!known.has(name)) {
      verdicts.push({
        name,
        state: "orpheline",
        canonical: "inconnu",
        licence: "—",
        detail: "catalogue.json nomme une source que le catalogue ne porte plus",
      })
    }
  }

  return verdicts
}

/** The states that leave nobody anything to do. Everything else is a red. */
export function estClasse(state: CatalogueState): boolean {
  return state === "verifiee" || state === "excusee" || state === "hors-population"
}

/** The one call a check, a report or the sabotage needs: reads the repository and classifies it. */
export function catalogueDesSources(): CatalogueVerdict[] {
  const probes = readProbes()
  return classifyCatalogue(readCatalogue(), probes.verifications, probes["sans-verification"])
}
