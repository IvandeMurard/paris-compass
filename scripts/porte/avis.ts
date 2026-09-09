// The advisories arm — the rule that Dependabot alone could not enforce.
//
//   npm.cmd run avis
//
// ── The incident ──────────────────────────────────────────────────────────────────────────
//
// 9 September 2026. Six Dependabot alerts landed in the same minute, on three packages and two
// manifests, one of them rated High. None was reachable in this product. Nobody had judged
// them, because nothing ever asked anybody to: the repository received ALERTS and never
// received a PROPOSAL — there was no .github/dependabot.yml — so they accumulated until they
// arrived as a batch, which is the shape an alert takes when it is about to be ignored.
//
// Reading the six advisories one by one took a session. Re-deriving that reading in six months
// would take another. That reading is what the register holds.
//
// ── What this arm decides, and what it refuses to decide ──────────────────────────────────
//
// It decides ONE thing: does every advisory npm reports against this repository carry a WRITTEN
// reachability verdict. It never decides that an advisory is harmless — a human writes that,
// with a date and a named condition, and signs it by committing it.
//
// It is therefore not a severity gate. A CVSS score is computed without knowing this product;
// « High » says what the flaw does at its worst somewhere, never what it reaches here. The
// question that matters is reachability, and no scanner can answer it.
//
// ── The trap it names out loud ────────────────────────────────────────────────────────────
//
// `npm audit` reports `fixAvailable` as the latest major it would install — for #89 it said
// vitest@5.0.0 — while the actual first patched version is the upper bound of the vulnerable
// range, 4.1.11, one major lower. CLAUDE.md forbids `npm audit fix --force` for exactly this:
// four days were lost on a « correctif = vite 8 » that was really vite 6.4.3. So this arm
// prints both numbers side by side and points at the range bound first. The lesson stops
// depending on somebody remembering it.
//
// ── What it does NOT catch, and this is deliberate ────────────────────────────────────────
//
//   - It reads npm's advisory feed. A flaw with no published advisory is invisible to it, and
//     so is a compromised package nobody has reported yet.
//   - It verifies that a verdict is WRITTEN, never that the verdict is TRUE — the same limit
//     the observability rule carries (#81), and the same reason: a register holds prose.
//     `invalide-si` narrows that gap where a verdict rests on a fact the repository can check,
//     but it cannot close it.

import { readFileSync } from "node:fs"

/** One advisory, as npm reports it, joined to what the lockfile knows about its scope. */
export interface Avis {
  ghsa: string
  paquet: string
  severite: string
  titre: string
  /** The vulnerable range, verbatim: `>=2.1.0 <4.1.11`. */
  plage: string
  /** The upper bound of that range — the smallest version that fixes it. */
  borneCorrigee: string | null
  /** What `npm audit fix --force` would install. Often much higher than `borneCorrigee`. */
  proposeParNpm: string | null
  proposeUneMajeure: boolean
  /** True when the lockfile marks every path to this package as a devDependency. */
  developpement: boolean
  manifeste: string
}

/** One written verdict. The date is not decoration: a verdict is a measurement. */
export interface Jugement {
  paquet: string
  atteignable: boolean
  raison: string
  /** The condition under which this verdict stops holding. Never « ça devrait aller ». */
  redeviendraitAtteignableSi: string
  mesureLe: string
  /**
   * Optional, and the only part a machine can re-check: patterns whose PRESENCE in the
   * repository contradicts the reason. hono is unreachable because the MCP server speaks only
   * over a pipe — the day somebody mounts an HTTP transport that sentence is false, and the
   * verdict must go red before anybody happens to re-read this file.
   */
  invalideSi?: { motif: string; dans: string[] }
}

export interface Registre {
  juges: Record<string, Jugement>
}

export type EtatVerdict = "jugé" | "non jugé" | "atteignable" | "prose morte" | "raison caduque"

export interface Verdict {
  ghsa: string
  paquet: string
  manifeste: string
  etat: EtatVerdict
  /** Why this verdict, in one line a human can act on. */
  dire: string
}

/**
 * The smallest version that fixes an advisory, read off the vulnerable range.
 *
 * npm writes ranges as `>=2.1.0 <4.1.11` or `<4.13.5`. The upper bound IS the first patched
 * version — that is what a range means. Reading it here rather than trusting `fixAvailable` is
 * the whole point of the arm, so it is a named function with its own tests.
 */
export function borneCorrigee(plage: string): string | null {
  const match = plage.match(/<\s*([0-9][^\s|]*)/)
  return match ? match[1] : null
}

/** Reads the register. A malformed register is a red, never a silently empty one. */
export function lireRegistre(chemin: string): Registre {
  const brut = JSON.parse(readFileSync(chemin, "utf8")) as Record<string, unknown>
  const juges = brut.juges
  if (juges === null || typeof juges !== "object" || Array.isArray(juges)) {
    throw new Error(`${chemin} : la clé « juges » manque ou n'est pas un objet.`)
  }
  return { juges: juges as Record<string, Jugement> }
}

/**
 * The rule itself, kept pure so it can be played on fixtures rather than on the network.
 *
 * `contenus` maps a repository path to its text, for `invalideSi`. The caller reads the files;
 * this function only decides. The same discipline that keeps `src/core` pure buys the same
 * thing here: a rule that can be tested offline, by `test`, which carries no secret.
 */
export function verdicts(
  avis: Avis[],
  registre: Registre,
  contenus: Record<string, string> = {},
): Verdict[] {
  const rendus: Verdict[] = []
  const vus = new Set<string>()

  for (const a of avis) {
    vus.add(a.ghsa)
    const juge = registre.juges[a.ghsa]

    if (!juge) {
      rendus.push({
        ghsa: a.ghsa,
        paquet: a.paquet,
        manifeste: a.manifeste,
        etat: "non jugé",
        dire:
          `Aucun verdict écrit. Lire l'avis — https://github.com/advisories/${a.ghsa} — puis ` +
          `soit monter jusqu'à ${a.borneCorrigee ?? "la borne de la plage"}, soit écrire ici ` +
          `pourquoi ce produit ne l'atteint pas, et sous quelle condition ça cesserait d'être vrai.`,
      })
      continue
    }

    if (!juge.raison.trim() || !juge.redeviendraitAtteignableSi.trim() || !juge.mesureLe.trim()) {
      rendus.push({
        ghsa: a.ghsa,
        paquet: a.paquet,
        manifeste: a.manifeste,
        etat: "non jugé",
        dire:
          "Verdict incomplet : il faut une raison, la condition qui l'annulerait, et la date de " +
          "la mesure. Un verdict sans condition est une opinion, et une opinion ne se recoupe pas.",
      })
      continue
    }

    if (juge.atteignable) {
      rendus.push({
        ghsa: a.ghsa,
        paquet: a.paquet,
        manifeste: a.manifeste,
        etat: "atteignable",
        dire:
          `Jugée ATTEIGNABLE le ${juge.mesureLe} : ${juge.raison} ` +
          `Monter à ${a.borneCorrigee ?? "la borne de la plage"}. Ceci ne se range pas.`,
      })
      continue
    }

    const caduque = raisonCaduque(juge, contenus)
    if (caduque) {
      rendus.push({
        ghsa: a.ghsa,
        paquet: a.paquet,
        manifeste: a.manifeste,
        etat: "raison caduque",
        dire:
          `La raison écrite le ${juge.mesureLe} ne tient plus : ${caduque} ` +
          `Elle disait — ${juge.redeviendraitAtteignableSi}`,
      })
      continue
    }

    rendus.push({
      ghsa: a.ghsa,
      paquet: a.paquet,
      manifeste: a.manifeste,
      etat: "jugé",
      dire: `Non atteignable, mesuré le ${juge.mesureLe}. ${juge.raison}`,
    })
  }

  // Prose that no longer describes anything. cadence.json refuses it for a vanished script and
  // this refuses it for a vanished advisory, for one reason: a register nobody prunes stops
  // being read, and a register nobody reads stops being a gate.
  for (const [ghsa, juge] of Object.entries(registre.juges)) {
    if (vus.has(ghsa)) continue
    rendus.push({
      ghsa,
      paquet: juge.paquet,
      manifeste: "—",
      etat: "prose morte",
      dire:
        "Plus aucun manifeste ne porte cet avis : la montée a eu lieu, ou le paquet est parti. " +
        "Retirer l'entrée. Ce qu'elle a appris se garde dans docs/JOURNAL.md, pas ici.",
    })
  }

  return rendus
}

/** The one part of a verdict a machine can contradict. Returns what it found, or null. */
function raisonCaduque(juge: Jugement, contenus: Record<string, string>): string | null {
  if (!juge.invalideSi) return null
  const motif = new RegExp(juge.invalideSi.motif)
  for (const chemin of juge.invalideSi.dans) {
    const texte = contenus[chemin]
    if (texte !== undefined && motif.test(texte)) {
      return `« ${juge.invalideSi.motif} » se lit maintenant dans ${chemin}.`
    }
  }
  return null
}

/** A verdict that stops the gate. Everything else is green. */
export function estRouge(v: Verdict): boolean {
  return v.etat !== "jugé"
}
