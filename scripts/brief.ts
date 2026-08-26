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
import { execFileSync } from "child_process"
import { resolve } from "path"

const SESSIONS = resolve("docs/SESSIONS.md")
const TICKETS = resolve("docs/tickets")

/** core.autocrlf rewrites these files on checkout, so nothing here may assume "\n".
 *  The same `\r` broke the priority parse in sessions.ts on 24 August. */
const lire = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n")

/** Above this, the common prompt is told to shed a clause rather than keep accreting. */
const SEUIL_PROMPT = 75

/** Sections of docs/REPRISE.md that carry state or rules. The rest is history. */
const REPRISE_UTILE = [
  "Ce qui existe et fonctionne",
  "Décisions qui ne se déduisent pas du code",
  "Pièges qui ont coûté du temps",
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

function issueNumber(id: string): string {
  try {
    const out = execFileSync("gh", ["issue", "list", "--state", "all", "--limit", "200",
      "--json", "number,title"], { encoding: "utf8" })
    const hit = (JSON.parse(out) as { number: number; title: string }[])
      .find((i) => new RegExp(`\\b${id}\\b`).test(i.title))
    return hit ? String(hit.number) : "?"
  } catch {
    return "?"
  }
}

function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error("Usage : npm.cmd run brief <ticket>   (ex. brief w0-appelant, ou brief appelant)")
    process.exit(1)
  }
  const id = ticketId(arg)
  const num = issueNumber(id)
  const doc = lire(SESSIONS)

  const ticket = lire(resolve(TICKETS, `${id}.md`)).split(/\n/)
  // Everything from the first "Fait le …" heading is the report of a session already done.
  const coupe = ticket.findIndex((l) => /^#{1,3} Fait (le|les) /.test(l))
  const utiles = coupe === -1 ? ticket.length : coupe
  const rapport = coupe === -1 ? 0 : ticket.length - coupe

  const parts = [promptCommun(doc).replace(/<ID>/g, id).replace(/<NUM>/g, num)]

  const extra = consignes(doc, id)
  if (extra) parts.push(extra)

  parts.push(
    [
      "Ce qu'il faut lire, et rien de plus :",
      "",
      `  docs/tickets/${id}.md` +
        (rapport > 0
          ? `   — les ${utiles} premières lignes seulement. Tout ce qui suit "Fait le…"\n` +
            `      (${rapport} lignes) est le rapport d'une session déjà close : pas ton sujet.`
          : "   — en entier."),
      "",
      "  docs/REPRISE.md, ces sections :",
      ...REPRISE_UTILE.map((s) => `      « ${s} »`),
      "",
      "  Les sections de docs/PLAN.md, docs/PERIMETRE.md et DIAGNOSTIC.md que le",
      "  ticket cite nommément. Pas les fichiers entiers.",
      "",
      "NE LIS PAS docs/JOURNAL.md. C'est le récit des sessions passées, sans autorité",
      "sur l'état courant. Il ne se consulte que sur une question précise — pourquoi",
      "telle décision a été prise — et jamais en entier.",
    ].join("\n"),
  )

  console.log(`\n=== ${id} · issue #${num} — à coller tel quel ===\n`)
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
}

main()
