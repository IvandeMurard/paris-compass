// The age of every red still open, computed where somebody is about to read it — w1-porte-lue
// (#77). This is the reading side of the gate; scripts/porte/signal.ts is the writing side.
//
// What the measurement of 5 September 2026 says, and it is the whole reason this module
// exists. The notification is NOT missing: `repos/IvandeMurard/paris-compass/subscription`
// answers `subscribed: true, ignored: false` since 27 June 2026, and the inbox thread for
// issue #74 exists with `reason: subscribed`. It arrived, and it sat. #74 opened 1 September
// at 12:49 UTC and got its first human comment on 2 September at 15:58 — twenty-seven hours.
// #78 opened 5 September at 11:33, was closed at 13:15, and its notification thread was STILL
// `unread: true` when this was measured afterwards: the issue was found and closed through a
// path that never went through the notification at all.
//
// That path is a session. So the red has to fall into the one thing a session cannot start
// without reading — the prompt that scripts/brief.ts prints — and not into a twelfth channel
// nobody watches either.
//
// The thresholds live here rather than in signal.ts because BOTH sides need the same ones: the
// reader that says how old a red is, and the writer that renames it when it crosses a step.
// Two copies of a threshold is two thresholds.

import { execFileSync } from "child_process"

/** Days after which an open red is a decision that is late, not a decision being taken. */
export const SEUIL_DECISION_JOURS = 1

/**
 * The steps at which the alert escalates, and the only ones.
 *
 * Deliberately not daily. `scripts/porte/signal.ts` refuses to open a second issue for the same
 * defect because « une alerte qui produit une notification par jour pour le même défaut est une
 * alerte que quelqu'un filtrera » — renaming it every morning would rebuild exactly the filter
 * it avoids, one level up. Two renames per issue over its whole life, at most.
 */
export const PALIERS_JOURS = [2, 7] as const

export interface RougeOuvert {
  number: number
  title: string
  createdAt: string
}

/** Whole hours between two instants, negative clamped: a clock skew must not read as an age. */
export function ageEnHeures(depuis: string, maintenant: Date): number {
  const ms = maintenant.getTime() - new Date(depuis).getTime()
  return Math.max(0, Math.floor(ms / 3_600_000))
}

/** The step an age has crossed — 0 while it has crossed none. */
export function palier(ageJours: number): number {
  let atteint = 0
  for (const seuil of PALIERS_JOURS) if (ageJours >= seuil) atteint = seuil
  return atteint
}

const SUFFIXE = / — ouverte depuis \d+ jours$/

/**
 * The title an issue of this age should carry.
 *
 * Idempotent by construction: the suffix is stripped before it is reapplied, so a title that is
 * already right is returned unchanged and signal.ts has nothing to write. « Porte planifiée —
 * décision requise » reads the same on day one and on day five; the issue list is where a red
 * is actually scanned, and it is the one place the age was invisible.
 */
export function titreEscalade(titre: string, ageJours: number): string {
  const base = titre.replace(SUFFIXE, "")
  const atteint = palier(ageJours)
  return atteint === 0 ? base : `${base} — ouverte depuis ${atteint} jours`
}

/** 0 rien à faire · 3 changé sans décision · 1 décision requise — the grammar of report.ts. */
export type Code = 0 | 1 | 3

export interface Etat {
  code: Code
  lignes: string[]
}

/**
 * What a session is told, and the exit code that goes with it.
 *
 * A red younger than a day is a 3 and not a 1 on purpose: the morning it opens, nothing is late
 * yet, and a line that shouts on the first hour teaches a reader to skip the line.
 */
export function rendu(rouges: RougeOuvert[], maintenant: Date): Etat {
  if (rouges.length === 0) {
    return { code: 0, lignes: ["[porte] aucun rouge ouvert."] }
  }
  const ages = rouges.map((r) => ({ ...r, heures: ageEnHeures(r.createdAt, maintenant) }))
  const vieux = ages.filter((r) => r.heures >= SEUIL_DECISION_JOURS * 24)
  const code: Code = vieux.length > 0 ? 1 : 3

  const entete =
    code === 1
      ? `[porte] ${vieux.length} rouge(s) ouvert(s) depuis plus de ${SEUIL_DECISION_JOURS} jour — DÉCISION REQUISE`
      : `[porte] ${rouges.length} rouge(s) ouvert(s), aucun depuis plus de ${SEUIL_DECISION_JOURS} jour.`

  return {
    code,
    lignes: [
      entete,
      ...ages.map(
        (r) =>
          `        #${r.number}  ${String(Math.floor(r.heures / 24)).padStart(2)} j ${String(r.heures % 24).padStart(2)} h  ${r.title.replace(SUFFIXE, "")}`,
      ),
      `        gh issue view ${ages[0].number} --comments`,
    ],
  }
}

/**
 * The open reds, asked of GitHub.
 *
 * An unreachable or unauthenticated `gh` must never be read as « aucun rouge » — that is the
 * exact failure this module exists against, a silence taken for a green. It throws, and the
 * caller says « indéterminé ». Same reasoning as refusing to open an issue on an upstream
 * outage: a thing that did not answer has not said no.
 */
export function lireRougesOuverts(label = "porte-rouge"): RougeOuvert[] {
  const out = execFileSync(
    "gh",
    ["issue", "list", "--label", label, "--state", "open", "--limit", "50", "--json", "number,title,createdAt"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim()
  return JSON.parse(out || "[]") as RougeOuvert[]
}

/** `rendu` over the live repository, or the indeterminate line when GitHub could not be asked. */
export function etatCourant(maintenant = new Date()): Etat {
  try {
    return rendu(lireRougesOuverts(), maintenant)
  } catch {
    return {
      code: 3,
      lignes: [
        "[porte] état des rouges INDÉTERMINÉ — `gh` n'a pas répondu (absent, ou non authentifié).",
        "        Ce n'est pas un vert. `gh auth status`, puis `npm.cmd run porte:etat`.",
      ],
    }
  }
}
