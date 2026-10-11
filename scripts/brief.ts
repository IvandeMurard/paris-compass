// Assembles the prompt for one session: `npm.cmd run brief w0-appelant`.
//
// It exists because reading cost grew with the number of sessions done. On 26 August,
// docs/REPRISE.md had reached 2 788 lines, 62 % of which was the narrative of twelve
// previous sessions — every session paid for all of them to find three paragraphs of state.
// The narrative moved to docs/JOURNAL.md; this script makes sure a session is told what to
// read rather than which files to open.
//
// Derived from docs/SESSIONS.md and docs/tickets/, so it cannot drift from them.

import { readFileSync, readdirSync, existsSync } from "fs"
import { resolve } from "path"

import { etatCourant } from "./porte/etat"
import { choixDe } from "./session-choix"
import { Issue, RefusGitHub, issuesDuTicket, lireIssues } from "./session-issues"

const SESSIONS = resolve("docs/SESSIONS.md")
const TICKETS = resolve("docs/tickets")

/** core.autocrlf rewrites these files on checkout, so nothing here may assume "\n".
 *  The same `\r` broke the priority parse in sessions.ts on 24 August. */
const lire = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n")

/** Above this, the common prompt is told to shed a clause rather than keep accreting. */
const SEUIL_PROMPT = 75

/** Sections of docs/REPRISE.md that carry state or rules. The rest is history.
 *  The page was split in three on 31 August: the traps moved to docs/REPRISE-PIEGES.md
 *  and the closed entries to docs/REPRISE-ARCHIVE.md, so two of these names left with them. */
const REPRISE_UTILE = [
  "L'état mesuré le plus récent",
  "Environnement — ce qui ne tourne pas sur ce poste",
  "Décisions qui ne se déduisent pas du code",
  "La suite, par ordre",
  "Ce qu'il ne faut pas faire",
]

function ticketId(arg: string): string {
  const bare = arg.replace(/^#/, "").replace(/\.md$/, "")
  if (existsSync(resolve(TICKETS, `${bare}.md`))) return bare
  const all = readdirSync(TICKETS).filter((f) => /^w\d+-.*\.md$/.test(f)).map((f) => f.slice(0, -3))
  const hit = all.filter((t) => t.includes(bare))
  if (hit.length === 1) return hit[0]
  console.error(hit.length === 0 ? `Aucun ticket ne correspond à "${arg}".` : `Ambigu : ${hit.join(", ")}`)
  console.error(`Tickets : ${all.join(", ")}`)
  process.exit(1)
}

/** Anchored on the block's own first line, not on its position: the section around it
 *  gained a `powershell` example on 26 August and a positional match silently took that
 *  one instead. What identifies the prompt is that it starts with "Ticket <ID>". */
function promptCommun(doc: string): string {
  const m = doc.match(/```\n(Ticket <ID>[\s\S]*?)```/)
  if (!m) {
    console.error("Bloc « Le prompt commun » introuvable dans docs/SESSIONS.md.")
    process.exit(1)
  }
  return m[1].trimEnd()
}

/** The per-session addition, if docs/SESSIONS.md carries one for this ticket. */
function consignes(doc: string, id: string): string | null {
  const heads = [...doc.matchAll(/^## Sessions? .*$/gm)]
  for (let i = 0; i < heads.length; i++) {
    const head = heads[i][0]
    if (!head.includes(id)) continue
    const start = heads[i].index!
    const end = i + 1 < heads.length ? heads[i + 1].index! : doc.length
    const bloc = doc.slice(start, end).match(/```\n([\s\S]*?)```/)
    return bloc ? bloc[1].trimEnd() : null
  }
  return null
}

/** The heading that opens the report of a session already closed.
 *
 *  Lexical, and it has to be: a heading that merely carries a date is NOT a closure report —
 *  measured on 15 September 2026, `## Avancement — ...`, `## Etat — ...`, `## Releve des
 *  appelants ...` and three others carry one inside tickets that are still open. Recognising by
 *  date alone would cut six open tickets short. So the verb is the signal, and this is the list
 *  of verbs actually used on disk.
 *
 *  `Livre` was added on 15 September: the cut was written for `Fait le ...` and four of the
 *  twenty closure reports on disk did not match it — `w0-provenance`, `w6-fiche-corpus`,
 *  `w6-amenites-corpus` and `w6-fiche-delai`, the three most recent among them. A brief for a
 *  closed ticket therefore said "en entier" and handed the session its own closure report as
 *  work to do. */
// `\b` ne peut PAS fermer `Livré` : `é` n'est pas un caractere de mot pour une regex JS, donc la
// frontiere n'existe pas entre lui et l'espace qui suit, et l'alternative ne matchait jamais.
// Mesure du 15 septembre 2026 : les trois rapports « Livré » du disque passaient au travers.
const RAPPORT_CLOS = /^#{1,3} (Fait (le|les)\b|Fait\s+[\u2014-]|Livr\u00e9e?s?(?=\s|$))/

/** Where the ticket stops being the brief and starts being the last session's report. */
export function coupeRapport(lignes: string[]): { utiles: number; rapport: number } {
  const coupe = lignes.findIndex((l) => RAPPORT_CLOS.test(l))
  return coupe === -1
    ? { utiles: lignes.length, rapport: 0 }
    : { utiles: coupe, rapport: lignes.length - coupe }
}

export type EtatIssue = {
  num: string
  clos: boolean | null
  /** Set when several issues carry the ticket's official title. The caller refuses; see below. */
  ambigu?: number[]
}

/** The ticket↔issue link, read from a population already in hand.
 *
 *  It goes through `issuesDuTicket` — the SAME call scripts/sessions.ts makes for the order
 *  table — and that is the whole point of this function existing. Until 15 September 2026 this
 *  file matched `\b<id>\b` anywhere in a title, and both ways of getting that wrong were
 *  measured: an issue that merely NAMES the ticket stole its row (`w6-contexte` → #142 instead
 *  of #119), and `-` not being a word character meant `\b` could not close an id prefix
 *  (`w1-observabilite` → #81, the issue of `w1-observabilite-echappement`, instead of #72).
 *  The repository had already paid for exactly that in #131 and anchored the table's matching;
 *  this file had stayed on the old way. One owner, three readers.
 *
 *  `clos: null` means "not known" — GitHub unreachable, or no issue carrying the anchored id.
 *  That is not "open": the caller must say it does not know rather than imply the ticket is live.
 *
 *  Exported for the cross-check in brief.test.ts. */
export function etatDeLIssue(issues: Issue[], id: string): EtatIssue {
  const officielles = issuesDuTicket(issues, id)
  if (officielles.length === 0) return { num: "?", clos: null }
  if (officielles.length > 1) return { num: "?", clos: null, ambigu: officielles.map((i) => i.number) }
  const hit = officielles[0]
  return { num: String(hit.number), clos: hit.state.toUpperCase() === "CLOSED" }
}

/** The population, or null when GitHub could not be asked. A brief still assembles offline —
 *  it just says it cannot tell whether the ticket is already delivered. The refusal is printed
 *  rather than swallowed: a truncated listing and an absent `gh` both land here, and they are
 *  not the same thing to fix. */
function issuesOuRien(): Issue[] | null {
  try {
    return lireIssues()
  } catch (e) {
    process.stderr.write(
      `\n[note] ${e instanceof RefusGitHub ? e.message : (e as Error).message}\n`,
    )
    return null
  }
}

function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error("Usage : npm.cmd run brief <ticket>   (ex. brief w0-appelant, ou brief appelant)")
    process.exit(1)
  }
  const id = ticketId(arg)
  const issues = issuesOuRien()
  const { num, clos, ambigu } = issues
    ? etatDeLIssue(issues, id)
    : ({ num: "?", clos: null } as EtatIssue)

  // Deux issues qui portent le titre officiel d'un ticket, c'est une ambiguïté, et une
  // ambiguïté tranchée en silence est la façon dont le mauvais numéro se publie —
  // scripts/sessions.ts s'arrête là-dessus depuis #176. Ici l'enjeu a grandi le 15 septembre
  // 2026 : le numéro porte un ordre « ARRÊTE-TOI », donc deviner reviendrait à arrêter une
  // session sur l'état d'une autre issue.
  if (ambigu) {
    console.error(
      `${id} : ${ambigu.length} issues portent le titre officiel du ticket — ` +
        ambigu.map((n) => `#${n}`).join(", ") +
        `.\nUne seule issue par ticket. Renommer les autres : le titre « [Pn] ${id} — » est ` +
        `ce qui lie le brief au ticket, pas une mention du nom.`,
    )
    process.exit(1)
  }
  const doc = lire(SESSIONS)

  const ticket = lire(resolve(TICKETS, `${id}.md`)).split(/\n/)
  // Everything from the first closure heading is the report of a session already done.
  const { utiles, rapport } = coupeRapport(ticket)

  const parts: string[] = []

  // A closed issue is not a ticket: it is a delivery already made, and a session dispatched on
  // one spends itself re-deriving a criterion that no longer decides anything. This goes FIRST,
  // above the common prompt, for the same reason the overdue red does — a session must inherit
  // the decision, not discover it at the end. Measured on 15 September 2026: `#180` was closed
  // and merged at 11:09, and `brief w6-fiche-delai` still assembled a full session prompt for it
  // with no mention of the closure, because the lookup asked for `--state all` and then read only
  // `number` and `title`.
  if (clos === true) {
    parts.push(
      [
        `ARRETE-TOI ET LIS CECI D'ABORD — l'issue #${num} est FERMEE.`,
        "",
        `Le ticket \`${id}\` a deja ete livre. Ce qui suit est le prompt ordinaire, assemble`,
        "pour un ticket qui ne l'est plus : son « Fait quand » est un critere perime, et le",
        "redemontrer ne change rien dans le depot.",
        "",
        "Ce qu'il faut faire a la place, dans cet ordre :",
        `  1. \`gh issue view ${num} --comments\` — la demonstration de cloture y est.`,
        `  2. \`docs/tickets/${id}.md\`, section de cloture — la methode et les chiffres.`,
        "  3. Si le travail est bien fait, DIS-LE et arrete-toi. Ne relivre pas.",
        "  4. S'il ne l'est pas, c'est une issue NEUVE, pas celle-ci.",
      ].join("\n"),
    )
  }

  parts.push(promptCommun(doc).replace(/<ID>/g, id).replace(/<NUM>/g, num))

  const extra = consignes(doc, id)
  if (extra) parts.push(extra)

  // Un rouge en retard passe AVANT le ticket : la session qui commence doit savoir qu'elle
  // hérite d'une décision, pas la découvrir en fin de course. En dessous du seuil, rien —
  // sinon le bloc devient le décor que le prompt commun est déjà accusé d'être.
  // La mesure qui justifie CET endroit-là plutôt qu'un canal de plus est en tête de
  // scripts/porte/etat.ts : la notification arrive, et elle n'est pas ce qui déclenche
  // la lecture — c'est une session qui l'est.
  const rouges = etatCourant()
  if (rouges.code === 1) {
    parts.push(
      [
        "AVANT LE TICKET — la porte a un rouge ouvert depuis plus d'un jour :",
        "",
        ...rouges.lignes,
        "",
        "Lis-le. S'il relève de ton ticket, traite-le ; sinon dis-le dans ton résumé et laisse",
        "l'issue ouverte — mais ne commence pas comme s'il n'existait pas.",
      ].join("\n"),
    )
  }

  parts.push(
    [
      "Ce qu'il faut lire, et rien de plus :",
      "",
      `  docs/tickets/${id}.md` +
        (rapport > 0
          ? `   — les ${utiles} premières lignes seulement. Tout ce qui suit le titre de\n` +
            `      clôture, ligne ${utiles + 1} (${rapport} lignes), est le rapport d'une session\n` +
            `      déjà close : pas ton sujet.`
          : "   — en entier."),
      "",
      "  docs/REPRISE.md, ces sections :",
      ...REPRISE_UTILE.map((s) => `      « ${s} »`),
      "",
      "  docs/REPRISE-PIEGES.md — jamais en entier : y chercher au grep les mots du",
      "  ticket avant de diagnostiquer quoi que ce soit.",
      "",
      "  Les sections de docs/PLAN.md, docs/PERIMETRE.md et DIAGNOSTIC.md que le",
      "  ticket cite nommément. Pas les fichiers entiers. Un « DIAGNOSTIC.md §N »",
      "  se résout par l'index en tête de DIAGNOSTIC.md : il dit si la section est",
      "  restée là ou si elle est passée dans DIAGNOSTIC-CORRIGES.md.",
      "",
      "NE LIS PAS docs/JOURNAL.md. C'est le récit des sessions passées, sans autorité",
      "sur l'état courant. Il ne se consulte que sur une question précise — pourquoi",
      "telle décision a été prise — et jamais en entier.",
    ].join("\n"),
  )

  // Comment lancer la session, AVANT le prompt et sur stderr — comme les rouges en fin de
  // sortie. Ce n'est pas du texte à coller : c'est un réglage que la personne devant le
  // terminal pose dans l'application avant de coller quoi que ce soit, et le noyer dans le
  // bloc collable serait le meilleur moyen qu'il ne soit jamais appliqué.
  const choix = choixDe(id, ticket[0] ?? "")
  process.stderr.write(
    `\n[lancement] modèle ${choix.modele} · effort ${choix.effort}\n` +
      `            ${choix.raison}\n` +
      `            Le modèle est une décision, l'effort en est dérivé — scripts/session-choix.ts.\n`,
  )

  // The banner is inside the collable block because the session must read it, and repeated here
  // on stderr because the person at the terminal decides whether to paste at all.
  if (clos === true) {
    process.stderr.write(
      `\n[STOP] issue #${num} est FERMEE — \`${id}\` est deja livre.\n` +
        `       Ce prompt est assemble pour un ticket clos. Ne le colle pas sans avoir lu\n` +
        `       \`gh issue view ${num} --comments\`.\n`,
    )
  } else if (clos === null) {
    process.stderr.write(
      `\n[note] Etat de l'issue inconnu (GitHub injoignable, ou aucune issue ne nomme \`${id}\`).\n` +
        `       Ce brief ne peut donc PAS dire si le ticket est deja livre.\n`,
    )
  }

  console.log(`\n=== ${id} · issue #${num}${clos === true ? " — FERMEE" : ""} — à coller tel quel ===\n`)
  console.log(parts.join("\n\n"))
  console.log()

  // The common prompt grows the way docs/REPRISE.md did: a clause per session that got
  // something wrong, none ever removed. Nothing bounds it, so say when it crosses a line
  // rather than hope someone notices — 70 lines on 26 August, seven standing clauses.
  const n = promptCommun(doc).split("\n").length
  if (n > SEUIL_PROMPT) {
    console.error(
      `[note] Le prompt commun fait ${n} lignes (seuil ${SEUIL_PROMPT}). Il grossit d'une\n` +
        `       clause par session. Regarde s'il en porte une que CLAUDE.md dit déjà —\n` +
        `       CLAUDE.md est chargé tout seul, le prompt se paie à chaque session.\n`,
    )
  }

  // Le dernier mot de la sortie, sur stderr comme la note du prompt commun : ce n'est pas du
  // texte à coller, c'est ce que la personne devant le terminal doit voir avant de coller.
  process.stderr.write(rouges.lignes.join("\n") + "\n")
}

// Le meme garde-fou que scripts/generate-sitemap.ts : sans lui, importer ce module pour tester
// `coupeRapport` lance la session entiere et sort en 1 sur l'argument manquant.
if (process.argv[1] && resolve(process.argv[1]).endsWith("brief.ts")) {
  main()
}
