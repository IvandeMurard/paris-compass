// Regenerates the ordered session table in docs/SESSIONS.md from what is measurable:
// the ticket files on disk and the live issue state on GitHub. Everything a human
// decided — model choice, per-session prompt additions, why the order is what it is —
// lives outside the generated block and is never touched.
//
// The point is the rule CLAUDE.md carries: a document is not a measurement. A table
// typed by hand goes stale the moment a session closes an issue; a derived one cannot.

import { readFileSync, writeFileSync, readdirSync } from "fs"
import { execFileSync } from "child_process"
import { resolve } from "path"

const DOC = resolve("docs/SESSIONS.md")
const TICKETS = resolve("docs/tickets")
const BEGIN = "<!-- BEGIN sessions -- généré par `npm.cmd run sessions`, ne pas éditer à la main -->"
const END = "<!-- END sessions -->"

/** Order is a human decision, so it is declared here rather than inferred. Unlisted
 *  tickets fall to the end, sorted by id — visible, never silently dropped. */
const ORDER = [
  "w0-deploy",
  "w0-history",
  "w0-provenance",
  "w0-fiche",
  "w0-mcp-verif",
  "w0-cron",
  "w0-retenue",
  "w0-plu",
  "w1-chantiers",
  "w1-terrasses",
  "w1-survie",
]

/** Which model for which class of work — also a judgement, not a measurement. */
const MODEL: Record<string, string> = {
  "w0-plu": "Sonnet 5",
  "w1-chantiers": "Sonnet 5",
  "w1-terrasses": "Sonnet 5",
}
const DEFAULT_MODEL = "Opus 5"

interface Issue {
  number: number
  title: string
  state: string
  labels: { name: string }[]
}

interface Row {
  id: string
  title: string
  priority: string
  issue?: Issue
}

function readTickets(): Row[] {
  return readdirSync(TICKETS)
    .filter((f) => /^w\d+-.*\.md$/.test(f))
    .map((f) => {
      // Files land as CRLF on this machine (core.autocrlf), and a title may carry a
      // second em dash once a session appends its outcome to it — so split on either
      // ending and stop the title at the first dash only.
      const head = readFileSync(resolve(TICKETS, f), "utf8").split(/\r?\n/)[0].trim()
      // "# [P0] w0-history — titre" (— may recur further right)
      const m = head.match(/^#\s*\[(P[012])\]\s*([\w-]+)\s*—\s*(.*)$/)
      const id = f.slice(0, -3)
      return { id, priority: m?.[1] ?? "?", title: m?.[3]?.trim() ?? id }
    })
}

function readIssues(): Issue[] {
  // gh is the only way to know whether an issue is still open. If it is missing or
  // unauthenticated, we refuse to rewrite rather than publish a table built on guesses.
  const out = execFileSync(
    "gh",
    ["issue", "list", "--state", "all", "--limit", "200", "--json", "number,title,state,labels"],
    { encoding: "utf8" },
  )
  return JSON.parse(out) as Issue[]
}

function build(rows: Row[]): string {
  const rank = (id: string) => {
    const i = ORDER.indexOf(id)
    return i === -1 ? ORDER.length : i
  }
  const planned = rows
    .filter((r) => ORDER.includes(r.id))
    .sort((a, b) => rank(a.id) - rank(b.id))

  const lines: string[] = [BEGIN, ""]
  lines.push(`*Table dérivée de \`docs/tickets/\` et de l'état GitHub, régénérée le ${today()}.*`)
  lines.push("")
  lines.push("| # | Ticket | Issue | État | Prio | Modèle |")
  lines.push("| --- | --- | --- | --- | --- | --- |")

  let n = 0
  for (const r of planned) {
    const done = r.issue?.state === "CLOSED"
    n += 1
    const num = r.issue ? `[#${r.issue.number}](https://github.com/IvandeMurard/paris-compass/issues/${r.issue.number})` : "—"
    const label = done ? `~~\`${r.id}\`~~` : `\`${r.id}\``
    const state = r.issue ? (done ? "**fait**" : "ouvert") : "**pas d'issue**"
    const idx = done ? `~~${n}~~` : `${n}`
    lines.push(`| ${idx} | ${label} | ${num} | ${state} | ${r.priority} | ${MODEL[r.id] ?? DEFAULT_MODEL} |`)
  }

  const rest = rows.filter((r) => !ORDER.includes(r.id) && r.issue?.state !== "CLOSED")
  lines.push("")
  lines.push(`**Hors de cette file : ${rest.length} tickets ouverts**, à prendre après la vague 0 — `)
  lines.push("le détail par vague est dans [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).")

  const orphans = rows.filter((r) => !r.issue)
  if (orphans.length > 0) {
    lines.push("")
    lines.push(`> ⚠️ **${orphans.length} ticket(s) sans issue GitHub** : ${orphans.map((o) => `\`${o.id}\``).join(", ")}.`)
  }

  lines.push("")
  lines.push(END)
  return lines.join("\n")
}

function today(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

function main() {
  const rows = readTickets()
  let issues: Issue[]
  try {
    issues = readIssues()
  } catch (e) {
    console.error("Impossible d'interroger GitHub (gh absent, non authentifié, ou hors ligne).")
    console.error("La table n'est PAS réécrite : mieux vaut une table datée qu'une table devinée.")
    process.exit(1)
    return
  }

  for (const r of rows) {
    // Issue titles carry the id: "[P0] w0-history — ...". Match on the id alone so a
    // reworded title never breaks the link.
    r.issue = issues.find((i) => new RegExp(`\\b${r.id}\\b`).test(i.title))
  }

  const doc = readFileSync(DOC, "utf8")
  const i = doc.indexOf(BEGIN)
  const j = doc.indexOf(END)
  if (i === -1 || j === -1) {
    console.error(`Marqueurs absents de ${DOC}. Attendu :\n${BEGIN}\n${END}`)
    process.exit(1)
  }

  const next = doc.slice(0, i) + build(rows) + doc.slice(j + END.length)
  if (next === doc) {
    console.log("docs/SESSIONS.md — déjà à jour.")
    return
  }
  writeFileSync(DOC, next)
  const closed = rows.filter((r) => r.issue?.state === "CLOSED").length
  console.log(`docs/SESSIONS.md — table régénérée : ${rows.length} tickets, ${closed} fermé(s).`)
}

main()
