// A ceiling on the two documents every session pays for — decided by Ivan, 7 September 2026.
//
// Why a mechanical ceiling rather than a rule asking for concision. The repository has tried
// concision twice and lost twice. Measured on 7 September 2026, in bytes on `main`:
//
//                     23 Aug    31 Aug (after the split)    7 Sep
//   CLAUDE.md          4 Ko            10 Ko               20 Ko
//   docs/REPRISE.md   46 Ko            39 Ko               98 Ko
//
// The 31 August split cut REPRISE.md from 89 Ko to 39 Ko and DIAGNOSTIC.md from 175 Ko to 16.
// Seven days later REPRISE.md was **larger than before the split**, and CLAUDE.md had grown
// fivefold. Nothing was wrong with any single addition — each was a real rule or a real
// measurement. The failure is structural: every session adds, none removes, and prose asking
// for brevity has never once held here.
//
// What HAS held is `SEUIL_PROMPT` in scripts/brief.ts: a number, checked, that made a session
// move a doctrine into CLAUDE.md rather than add a clause to the common prompt. That is the
// only documentary limit this repository has ever kept, so it is the form copied here.
//
// **These two files and not the others, and that is the whole point.** CLAUDE.md is loaded on
// every session whether it is needed or not; REPRISE.md is the one page a session is told to
// read first. Their bytes are paid before any work begins. DIAGNOSTIC-CORRIGES.md is 196 Ko and
// costs nothing, because nobody reads it without an index telling them which section to open.
// A ceiling on a file read on demand would be bureaucracy; a ceiling on a file read every time
// is a budget.
//
// **How to make this test pass again, and the order matters.** Move a section out — a closed
// entry of REPRISE.md belongs in docs/REPRISE-ARCHIVE.md, the dated evidence of a rule belongs
// in docs/REGLES-INCIDENTS.md. Only then, if the file is genuinely at its useful floor, discuss
// the number with Ivan. Raising the ceiling to make the red go away is the same move as
// loosening a baseline to silence the gate, and CLAUDE.md forbids that one by name.
//
// **What this does not catch.** Bytes are not cost: a dense 10 Ko page can be worth more to a
// session than a padded 30 Ko one, and this test cannot tell them apart. It also says nothing
// about the other nine documents, which can grow freely — deliberately, because they are read
// by section. It bounds what is paid unconditionally, nothing else.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "..", "..")

interface Plafond {
  chemin: string
  octets: number
  pourquoi: string
}

/**
 * Bytes of the file with Windows line endings removed — and that normalisation is the whole
 * difference between a budget and a coin toss.
 *
 * `core.autocrlf` is true on the machine this repository is developed on, so a file checked out
 * here carries CRLF and the same file on the CI runner carries LF. REPRISE.md is ~1 350 lines:
 * the identical content measures 1 350 bytes more on Windows than on Linux. A ceiling read from
 * `statSync().size` would therefore pass on one and fail on the other, which is worse than no
 * ceiling — a check that depends on where it runs gets disabled the first time it lies.
 *
 * Third time this repository pays for CRLF: scripts/sessions.ts parsed no priority because `.`
 * does not cross a carriage return, scripts/brief.ts read the wrong block for the same family of reason,
 * and this. The fix is the same one brief.ts already uses.
 */
function octetsNormalises(chemin: string): number {
  const texte = readFileSync(chemin, "utf8").replace(/\r\n/g, "\n")
  return Buffer.byteLength(texte, "utf8")
}

/**
 * The ceilings, and where each number comes from.
 *
 * Neither is a round number chosen for comfort: each is the file's size on the day the ceiling
 * was set, plus the margin named below. A ceiling far above the current size would let the
 * growth continue and only fire once the damage was done.
 */
const PLAFONDS: Plafond[] = [
  {
    chemin: "CLAUDE.md",
    octets: 18_100,
    // 18 001 bytes on 7 September 2026 (line endings normalised), after six rules gave their
    // dated evidence to docs/REGLES-INCIDENTS.md — 21 400 before, so 16 % less and nothing
    // lost. The margin is ~100 bytes. Adding a rule must now cost a removal, not a decision
    // deferred to later.
    pourquoi: "chargé à CHAQUE session, qu'on en ait besoin ou non",
  },
  {
    chemin: "docs/REPRISE.md",
    octets: 103_000,
    // 100 422 bytes on 7 September 2026, normalised. The margin is ~2,5 Ko and deliberate: a
    // session was running when this ceiling was written, and ambushing work already in flight
    // would teach it that the gate is capricious rather than strict. It is a one-off. The file
    // is 2,5× its post-split size and the next session to touch it should be moving a closed
    // entry to docs/REPRISE-ARCHIVE.md, not spending this margin.
    pourquoi: "la première page qu'une session est priée de lire",
  },
]

describe("le budget des documents lus à chaque session", () => {
  for (const p of PLAFONDS) {
    it(`${p.chemin} tient sous ${p.octets} octets`, () => {
      const taille = octetsNormalises(resolve(ROOT, p.chemin))
      expect(
        taille,
        `${p.chemin} fait ${taille} octets pour un plafond de ${p.octets} — ${p.pourquoi}.\n` +
          `Sortir une section plutôt que monter le nombre : une entrée close de REPRISE.md va ` +
          `dans docs/REPRISE-ARCHIVE.md, la preuve datée d'une règle dans ` +
          `docs/REGLES-INCIDENTS.md. Monter le plafond pour éteindre ce rouge est le geste que ` +
          `CLAUDE.md interdit sur les baselines de la porte.`,
      ).toBeLessThanOrEqual(p.octets)
    })
  }

  it("mesure des fichiers qui existent, sinon il ne mesure rien", () => {
    // The failure mode this rule shares with every enumeration in scripts/porte/: a check that
    // silently stops checking. A renamed file would make statSync throw rather than pass, but
    // a ceiling pointing at nothing would be worse than no ceiling — it would look green.
    for (const p of PLAFONDS) {
      expect(readFileSync(resolve(ROOT, p.chemin), "utf8").length, p.chemin).toBeGreaterThan(1000)
    }
  })

  it("garde la preuve déplacée plutôt que de l'avoir perdue", () => {
    // 8 250 octets sont sortis de CLAUDE.md le 7 septembre. Le risque du dégraissage n'est pas
    // la taille, c'est qu'une règle perde ce qui la rendait croyable — donc le fichier qui
    // l'accueille doit exister et porter les six renvois.
    const incidents = readFileSync(resolve(ROOT, "docs/REGLES-INCIDENTS.md"), "utf8")
    const claude = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8")
    const renvois = claude.match(/docs\/REGLES-INCIDENTS\.md/g) ?? []
    expect(renvois.length, "CLAUDE.md ne renvoie plus vers la preuve déplacée").toBeGreaterThanOrEqual(6)
    expect(incidents.length, "docs/REGLES-INCIDENTS.md est vide ou tronqué").toBeGreaterThan(6000)
  })
})
