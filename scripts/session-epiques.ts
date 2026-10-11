// Les listes de tickets des huit épics, dérivées des étiquettes plutôt que cochées à la main.
//
// (Comments below in English, as CLAUDE.md asks; the sentences this module PRINTS are French,
// because they are read by a session at a terminal.)
//
// ── The defect, measured 15 September 2026 ────────────────────────────────────────────────
//
// Each `[épic] Vague N` issue carried a checklist typed by hand, by issue number, and nothing
// ever compared it to the issues actually labelled `vague-N`. Counted that morning:
//
//   #41 vague 0 — 10 lines for 12 labelled tickets
//   #42 vague 1 —  7 lines for 17
//   #47 vague 6 —  5 lines for 12
//
// The whole gate/instrument family — #70, #71, #72, #73, #76, #77, #81, #82 — carried
// `vague-1` and appeared in NO list at all. The five other epics happened to be right, which is
// the shape this repository knows: a hand-kept population is right on the day it is typed.
//
// It is the same defect scripts/sessions.ts was written against one level down, and this is its
// missing counterpart: `sessions` regenerates the order table and `sessions:check` cross-checks
// it, so the epics get the two same directions rather than a third way of being right once.
//
// ── What is derived and what is a human decision ──────────────────────────────────────────
//
// **Derived**: WHICH tickets belong to an epic — the issues labelled `vague-N`, minus the epic
// itself. Never a list of numbers, here or anywhere.
//
// **Human, and preserved verbatim**: the preamble, the « Fait quand » section, and — less
// obviously — the ORDER of the lines. #43 to #46 and #48 are ordered by what to do first, not
// by issue number, and regenerating them into numeric order would destroy a decision while
// claiming to fix a fact. So an existing line keeps its place; a newcomer lands at the end,
// sorted by number, visible; a ticket that lost the label goes. That is exactly what `ORDER` in
// scripts/sessions.ts does with an unlisted ticket, and for the same reason.
//
// The cross-check is therefore order-INSENSITIVE: it compares claims keyed by issue number, the
// way sessions.ts compares rows keyed by ticket id. Reordering an epic by hand is not drift.
//
// ── What this does NOT catch, and it is not a small list ──────────────────────────────────
//
//   · It cross-checks labels against boxes. It never says a label is the RIGHT one: a ticket
//     labelled `vague-4` that belongs to wave 2 is green on both sides.
//   · A ticket carrying NO wave label is invisible to both directions — no epic claims it and
//     no line is missing. `sessions:check` sees it only if it also has a ticket file.
//   · It reads a checkbox against `state`, never against reality: an issue closed by mistake
//     makes the box wrong in the same breath as it makes the epic wrong.

import { Issue, Entete, enteteDuTitre, etiquettes } from "./session-issues"

const ETIQUETTE_EPIC = "epic"
const PREFIXE_VAGUE = "vague-"

/** The heading whose block is regenerated. Everything else in the body is somebody's prose. */
const TITRE_BLOC = /^##\s+Tickets\s*$/
const AUTRE_TITRE = /^##\s+/

/**
 * One line of an epic checklist.
 *
 * `- [x] #6 \`w0-cron\` **P0** — Ingestion planifiée + date de fraîcheur par source`
 *
 * The em dash is required and comes after the priority marker, so a title carrying its own em
 * dash — several do — cannot be cut in the wrong place.
 */
const LIGNE = /^\s*-\s*\[([ xX])\]\s*#(\d+)\s+`?([\w-]+)`?\s*\*\*(P[012])\*\*\s*—\s*(.*)$/

export interface LigneEpique {
  coche: boolean
  numero: number
  id: string
  priorite: string
  titre: string
}

export interface Bloc {
  /** Everything up to and including the `## Tickets` heading, verbatim. */
  avant: string[]
  /** The raw lines between the heading and the next `##`. */
  brutes: string[]
  /** `## Fait quand` onwards, verbatim. */
  apres: string[]
  eol: string
}

/** Splits a body into the block that is regenerated and the prose that never is. */
export function decouperBloc(corps: string): Bloc | null {
  const eol = corps.includes("\r\n") ? "\r\n" : "\n"
  const lignes = corps.replace(/\r\n/g, "\n").split("\n")
  const debut = lignes.findIndex((l) => TITRE_BLOC.test(l))
  if (debut === -1) return null
  let fin = lignes.length
  for (let i = debut + 1; i < lignes.length; i += 1) {
    if (AUTRE_TITRE.test(lignes[i])) {
      fin = i
      break
    }
  }
  return {
    avant: lignes.slice(0, debut + 1),
    brutes: lignes.slice(debut + 1, fin),
    apres: lignes.slice(fin),
    eol,
  }
}

export function lireLigne(brute: string): LigneEpique | null {
  const m = brute.match(LIGNE)
  if (!m) return null
  return {
    coche: m[1].toLowerCase() === "x",
    numero: Number(m[2]),
    id: m[3],
    priorite: m[4],
    titre: m[5].trim(),
  }
}

/** A line is a checklist entry, or blank, or something a human wrote and we must not eat. */
const estVide = (l: string): boolean => l.trim() === ""
const ressembleAUneLigne = (l: string): boolean => /^\s*-\s*\[[ xX]\]/.test(l)

export function rendreLigne(issue: Issue, entete: Entete): string {
  const coche = issue.state === "CLOSED" ? "x" : " "
  return `- [${coche}] #${issue.number} \`${entete.id}\` **${entete.priorite}** — ${entete.titre}`
}

export const epiquesDe = (issues: Issue[]): Issue[] =>
  issues.filter((i) => etiquettes(i).includes(ETIQUETTE_EPIC))

/** The wave an epic declares, or null when its labels do not name exactly one. */
export function vagueDe(epique: Issue): string | null {
  const vagues = etiquettes(epique).filter((n) => n.startsWith(PREFIXE_VAGUE))
  return vagues.length === 1 ? vagues[0] : null
}

/** The tickets of a wave: everything carrying the label, minus the epic that carries it too. */
export const ticketsDeLaVague = (issues: Issue[], vague: string): Issue[] =>
  issues
    .filter((i) => etiquettes(i).includes(vague) && !etiquettes(i).includes(ETIQUETTE_EPIC))
    .sort((a, b) => a.number - b.number)

export type Genre =
  | "vague"
  | "bloc"
  | "illisible"
  | "manquante"
  | "intruse"
  | "case"
  | "convention"
  | "double"

export interface Ecart {
  epique: number
  genre: Genre
  dit: string
}

/**
 * The three drifts the ticket asks for, plus the four that make them readable.
 *
 * The first three are the point: a labelled ticket absent from the list, a line naming an issue
 * that no longer carries the label (or does not exist), and a box contradicting the issue's
 * state. The other four exist because a check that cannot READ its input must say so rather
 * than conclude from it — an unparsable line, a missing block, an epic whose labels name no
 * wave, and a labelled issue whose title names no ticket would each otherwise look like an
 * empty population, and an empty population is green.
 */
export function recouperEpique(epique: Issue, issues: Issue[]): Ecart[] {
  const ecarts: Ecart[] = []
  const dire = (genre: Genre, dit: string) => ecarts.push({ epique: epique.number, genre, dit })

  const vague = vagueDe(epique)
  if (!vague) {
    dire(
      "vague",
      `ses étiquettes ne nomment pas exactement une vague (${etiquettes(epique).join(", ") || "aucune"}) — ` +
        `la population de sa liste ne peut pas se dériver`,
    )
    return ecarts
  }

  const bloc = decouperBloc(epique.body ?? "")
  if (!bloc) {
    dire("bloc", "aucune section `## Tickets` — il n'y a rien à recouper")
    return ecarts
  }

  for (const brute of bloc.brutes) {
    if (estVide(brute) || lireLigne(brute)) continue
    dire("illisible", `ligne illisible : ${brute.trim()}`)
  }

  const listees = new Map<number, LigneEpique>()
  for (const brute of bloc.brutes) {
    const ligne = lireLigne(brute)
    if (ligne) listees.set(ligne.numero, ligne)
  }

  const attendues = ticketsDeLaVague(issues, vague)
  const vus = new Map<string, number>()
  for (const issue of attendues) {
    const entete = enteteDuTitre(issue.title)
    if (!entete) {
      dire(
        "convention",
        `#${issue.number} porte ${vague} et son titre ne suit pas « [Pn] <ticket> — … » : ` +
          `« ${issue.title} ». C'est ce titre qui lie une issue à un ticket.`,
      )
      continue
    }
    const deja = vus.get(entete.id)
    if (deja !== undefined) {
      dire("double", `#${deja} et #${issue.number} nomment tous deux le ticket \`${entete.id}\``)
      continue
    }
    vus.set(entete.id, issue.number)

    const ligne = listees.get(issue.number)
    if (!ligne) {
      dire(
        "manquante",
        `#${issue.number} \`${entete.id}\` porte ${vague} et ne figure pas dans la liste`,
      )
      continue
    }
    const close = issue.state === "CLOSED"
    if (ligne.coche !== close) {
      dire(
        "case",
        `#${issue.number} \`${entete.id}\` est ${close ? "close" : "ouverte"} et sa case est ` +
          `${ligne.coche ? "cochée" : "vide"}`,
      )
    }
  }

  const etiquetees = new Set(attendues.map((i) => i.number))
  const connues = new Map(issues.map((i) => [i.number, i]))
  for (const [numero, ligne] of listees) {
    if (etiquetees.has(numero)) continue
    const issue = connues.get(numero)
    dire(
      "intruse",
      issue
        ? `#${numero} \`${ligne.id}\` est dans la liste et ne porte plus ${vague} ` +
            `(${etiquettes(issue).join(", ") || "aucune étiquette"})`
        : `#${numero} \`${ligne.id}\` est dans la liste et n'existe pas`,
    )
  }

  return ecarts
}

/** Every drift of every epic, in issue order. */
export function recouperLesEpiques(issues: Issue[]): Ecart[] {
  const epiques = epiquesDe(issues).sort((a, b) => a.number - b.number)
  return epiques.flatMap((e) => recouperEpique(e, issues))
}

/**
 * The epic's body with its `## Tickets` block rebuilt — or null when nothing would change, or
 * when the population cannot be derived (in which case `recouperEpique` says why).
 *
 * Order is preserved rather than imposed. See the header: the five epics nobody rewrote today
 * are ordered by what to do first.
 */
export function corpsRegenere(epique: Issue, issues: Issue[]): string | null {
  const vague = vagueDe(epique)
  if (!vague) return null
  const bloc = decouperBloc(epique.body ?? "")
  if (!bloc) return null

  const attendues = new Map<number, { issue: Issue; entete: Entete }>()
  for (const issue of ticketsDeLaVague(issues, vague)) {
    const entete = enteteDuTitre(issue.title)
    if (entete && !attendues.has(issue.number)) attendues.set(issue.number, { issue, entete })
  }

  const place: number[] = []
  const garde = new Set<number>()
  for (const brute of bloc.brutes) {
    const ligne = lireLigne(brute)
    if (!ligne || !attendues.has(ligne.numero) || garde.has(ligne.numero)) continue
    place.push(ligne.numero)
    garde.add(ligne.numero)
  }
  for (const numero of [...attendues.keys()].sort((a, b) => a - b)) {
    if (!garde.has(numero)) place.push(numero)
  }

  // Anything in the block that is neither a checklist line nor blank is somebody's note, and it
  // stays — above the list, because its place relative to individual lines cannot be known.
  const notes = bloc.brutes.filter((l) => !estVide(l) && !ressembleAUneLigne(l))

  const corps = place.map((n) => {
    const { issue, entete } = attendues.get(n)!
    return rendreLigne(issue, entete)
  })

  const lignes = [...bloc.avant, ...notes, ...corps, "", ...bloc.apres]
  const suivant = lignes.join(bloc.eol)
  return suivant === (epique.body ?? "") ? null : suivant
}
