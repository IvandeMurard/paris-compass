// Which model and which reasoning effort a session should be launched with.
//
// Extracted from scripts/sessions.ts on 13 September 2026, for one reason: that file calls
// main() at import time — it talks to GitHub and rewrites docs/SESSIONS.md — so brief.ts could
// not import the model table from it. The alternative was a second copy of the table in
// brief.ts, which is the failure mode this repository has paid for five times: a population
// written by hand next to one that is derived. One owner, two readers.
//
// ── What is a decision and what is derived ───────────────────────────────────────────────
//
// MODEL is a HUMAN decision, per ticket, and stays one: only Ivan knows that an ingestion
// ticket whose shape is already settled does not need the larger model. It is an exception
// list over DEFAULT_MODEL rather than a full mapping, so a ticket added tomorrow inherits the
// safe default instead of falling out of the table.
//
// EFFORT is DERIVED from two things the repository already holds — the model class and the
// ticket's own priority — so there is no third list to keep in phase. The rule is written
// below rather than tabulated per ticket, which is the same choice CLAUDE.md makes about the
// number of gate arms: a list rots at the next entry, a rule does not.
//
// ── What this is NOT ─────────────────────────────────────────────────────────────────────
//
// This is a recommendation to the person at the terminal, not a measurement. Nothing here has
// been A/B tested on this repository, and saying otherwise would be exactly the "documentation
// presented as a measure" that CLAUDE.md forbids. It encodes a judgement: the sessions that
// have cost this project the most were the ones that shipped a rule guarding nothing (#132,
// #133, porte:publie), and all three carried the P0 label or touched the instruments.

/** Tickets whose class of work does not need the larger model. Everything else gets the default. */
export const MODEL: Record<string, string> = {
  "w0-plu": "Sonnet 5",
  "w1-chantiers": "Sonnet 5",
  "w1-terrasses": "Sonnet 5",
  "w2-idfm": "Sonnet 5",
  "w2-filosofi": "Sonnet 5",
  "w2-mobiliscope": "Sonnet 5",
  "w2-bpe-marches-velo": "Sonnet 5",
  "w4-meubles": "Sonnet 5",
  "w4-ecoles": "Sonnet 5",
  "w4-frequentation": "Sonnet 5",
  "w3-osm-notes": "Sonnet 5",
}

export const DEFAULT_MODEL = "Opus 5"

export const modeleDe = (id: string): string => MODEL[id] ?? DEFAULT_MODEL

/** "# [P0] w6-fiche-robuste — titre" → "P0". Same shape sessions.ts parses for the table. */
export function prioriteDe(premiereLigne: string): string {
  return premiereLigne.trim().match(/^#\s*\[(P[012])\]/)?.[1] ?? "?"
}

export interface Choix {
  modele: string
  effort: "medium" | "high" | "max"
  raison: string
}

/**
 * The launch settings for one ticket.
 *
 * Three levels, and the order of the tests is the rule:
 *
 *   1. P0 wins over everything, model included. P0 is also the fourth sign that a review is
 *      due (`docs/SESSIONS.md`, « La revue ») — the repository already decided these tickets
 *      deserve a second reading, so they deserve a slower first one.
 *   2. Otherwise the plumbing tickets — those MODEL routes to the smaller model — run at
 *      medium: an ingestion whose endpoint, licence and cadence are already settled is
 *      mechanical work, and effort spent there buys nothing.
 *   3. Everything else is high.
 *
 * A "?" priority — a ticket whose first line does not carry [P0]/[P1]/[P2] — is treated as
 * high rather than medium. The direction of the error is deliberate: a malformed header
 * should cost compute, never care.
 */
export function choixDe(id: string, premiereLigne: string): Choix {
  const modele = modeleDe(id)
  const priorite = prioriteDe(premiereLigne)

  if (priorite === "P0") {
    return { modele, effort: "max", raison: "P0 — et P0 est aussi le quatrième signe qu'une revue est due" }
  }
  if (modele !== DEFAULT_MODEL) {
    return { modele, effort: "medium", raison: `${modele} — plomberie d'ingestion, la forme est déjà tranchée` }
  }
  return { modele, effort: "high", raison: `${priorite} sur ${modele} — jugement, pas exécution` }
}
