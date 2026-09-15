// What GitHub says about the issues — read once, shared by every reader that needs it.
//
// Extracted from scripts/sessions.ts on 15 September 2026, for the reason session-choix.ts
// already gives about the model table: that file calls main() at import time, so nothing can
// borrow from it without talking to GitHub and rewriting docs/SESSIONS.md as a side effect.
// One owner, several readers — rather than a second copy of the matching rule next to the
// first, which is the failure this repository has now paid for six times.
//
// ── The three rules that live here and nowhere else ───────────────────────────────────────
//
//  1. **The ticket↔issue link is the title convention, ANCHORED**: `[P1] w6-contexte — …`.
//     Matching the id *anywhere* in a title was robust to a reworded title and fragile to
//     something far more common — another issue that merely NAMES the ticket. On 11 September
//     2026 an issue titled "… et trois petites dettes de w6-contexte" took the row from #119
//     and the table published the wrong issue number for the ticket a session was working on
//     (#131). The anchor is the fix, and now there is one anchor rather than one per reader.
//
//  2. **Refuse rather than guess.** If `gh` is absent, unauthenticated or offline, callers
//     rewrite nothing and judge nothing: better a dated table than a guessed one.
//
//  3. **A listing that silently truncates is worse than no listing.** `gh issue list --limit N`
//     returns the N most recent issues; past N, the OLDEST simply stop being returned — and the
//     epics are #41 to #48, the oldest things in the repository. A population that quietly
//     loses its subject does not go red, it goes GREEN. So the limit is asserted, never
//     trusted. Measured 15 September 2026: 111 issues for a limit of 400.

import { execFileSync } from "child_process"

export interface Issue {
  number: number
  title: string
  state: string
  labels: { name: string }[]
  body: string
}

/** High enough that the assertion below is a guard and not a chore. See rule 3. */
const LIMITE = 400

/** Raised when GitHub could not be asked, or answered something that cannot be trusted. */
export class RefusGitHub extends Error {}

/**
 * Every issue of the repository, open and closed, with its labels and its body.
 *
 * The body comes along because the epics carry their ticket list in it: one listing serves
 * both the order table and the epic cross-check, rather than nine round trips.
 */
export function lireIssues(): Issue[] {
  let brut: string
  try {
    brut = execFileSync(
      "gh",
      [
        "issue",
        "list",
        "--state",
        "all",
        "--limit",
        String(LIMITE),
        "--json",
        "number,title,state,labels,body",
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    )
  } catch (e) {
    throw new RefusGitHub(`gh n'a pas répondu : ${(e as Error).message}`)
  }

  const issues = JSON.parse(brut) as Issue[]
  if (issues.length >= LIMITE) {
    throw new RefusGitHub(
      `gh a rendu ${issues.length} issues pour une limite de ${LIMITE} : le relevé est ` +
        `tronqué, et ce sont les PLUS ANCIENNES qui manquent — donc les épics. Une ` +
        `population amputée ne rougit pas, elle verdit. Monter LIMITE dans ` +
        `scripts/session-issues.ts, ou pagination.`,
    )
  }
  return issues
}

export const etiquettes = (i: Issue): string[] => i.labels.map((l) => l.name)

export interface Entete {
  priorite: string
  id: string
  titre: string
}

/**
 * The official title of a ticket issue, parsed — `[P1] w6-contexte — La fiche de contexte …`.
 *
 * Anchored at the start and requiring the em dash: this IS rule 1, and everything that binds a
 * ticket to an issue goes through it. Returns null for an issue that is not a ticket issue —
 * the repository holds 79 issues starting with `[Pn]`, and only 60 of them name a ticket.
 */
export function enteteDuTitre(titre: string): Entete | null {
  const m = titre.match(/^\[(P[012])\]\s+([\w-]+)\s+—\s*(.*)$/)
  return m ? { priorite: m[1], id: m[2], titre: m[3].trim() } : null
}

/**
 * The issues claiming a given ticket id. Zero, one, or — the case worth saying out loud — more.
 *
 * Two issues claiming one ticket is an ambiguity, and an ambiguity resolved in silence is how
 * the wrong number gets published. Callers report the list and stop; `find` cannot report a
 * choice it never knew it had.
 */
export function issuesDuTicket(issues: Issue[], id: string): Issue[] {
  return issues.filter((i) => enteteDuTitre(i.title)?.id === id)
}
