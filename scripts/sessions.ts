// Regenerates the ordered session table in docs/SESSIONS.md from what is measurable:
// the ticket files on disk and the live issue state on GitHub. Everything a human
// decided — model choice, per-session prompt additions, why the order is what it is —
// lives outside the generated block and is never touched.
//
// The point is the rule CLAUDE.md carries: a document is not a measurement. A table
// typed by hand goes stale the moment a session closes an issue; a derived one cannot.
//
// **A derived table still goes stale if nobody derives it.** Being generated proves the
// table was true *once*, which is exactly the trap this repository keeps rediscovering: a
// measured figure without its date becomes false in silence. Hence `--check`, which answers
// "is what is committed still true?" without writing anything:
//
//   npm.cmd run sessions        regenerates and writes
//   npm.cmd run sessions:check  compares and exits 1 if the committed table has drifted
//
// `--check` compares the **claims**, not the bytes: the "régénérée le …" line is expected to
// differ every day and a check that failed on it would be noise, and noise is how a check
// gets disabled. It reports which ticket moved, so the diff is readable without a diff.

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
  // Opened 24 August by w0-fiche and left to sit for two days: the fix was SQL, the
  // ticket was interface. It comes after w0-retenue rather than before because the
  // census w0-retenue posed is what makes it demonstrable that this case escapes it —
  // I23 and I24 are green while the defect is alive, and that is their definition
  // rather than a hole in them.
  "w0-conclusion",
  // Both opened 25 August by w0-retenue, which found them without looking for them.
  // w0-appelant first, and the order is the recommendation rather than a preference:
  // it decides w1-licence-derivee's blast radius. If `authenticated` stops being
  // privileged, the mislabelled licence is only ever seen by the service role — the
  // people who operate Compass and already know 2017's licence. The reverse is not
  // true. And w0-appelant is free today: auth.users holds 0 accounts (measured
  // 25 August); once signup opens, the same fix takes data away from people who had it.
  "w0-appelant",
  "w1-licence-derivee",
  // Le socle avant l'ecran, direction du 31 aout. #70 donne une cadence aux quatre
  // sources qui n'en ont pas, #71 fait tourner la porte et rend ses echecs audibles,
  // #72 ouvre le tuyau d'observabilite avant qu'il y ait du trafic a observer.
  "w1-cadence",
  "w1-porte-planifiee",
  // #77 avant #72, decide le 5 septembre. #71 et #73 ont bati une alerte qui part
  // correctement et tombe ou personne ne se tient — #74 est restee deux jours non lue.
  // Batir un troisieme producteur de signal avant que le premier atteigne quelqu'un
  // ajoute du bruit a du bruit. Et #72 n'a aucun trafic a observer.
  "w1-porte-lue",
  "w1-observabilite",
  "w1-catalogue",
  "w1-ppri",
  "w1-dia",
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

/** The block without its regeneration date — what the table actually claims. */
function claims(block: string): string[] {
  return block
    .split("\n")
    .filter((line) => !/^\*Table dérivée de/.test(line.trim()))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * The rows a reader would compare by hand, keyed by ticket id.
 *
 * Used only to say *what* drifted. Reporting "the table differs" would send the next session
 * to a diff; reporting "w1-terrasses: ouvert → fait" ends the question on the spot.
 */
function rowsById(block: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of block.split("\n")) {
    const m = line.match(/\|\s*~?~?\d+~?~?\s*\|\s*~*`?([\w-]+)`?~*\s*\|(.*)$/)
    if (m) out.set(m[1], m[2].trim())
  }
  return out
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

  const expected = build(rows)
  const committed = doc.slice(i, j + END.length)
  const closed = rows.filter((r) => r.issue?.state === "CLOSED").length

  if (process.argv.includes("--check")) {
    const drifted = claims(committed).join("\n") !== claims(expected).join("\n")
    if (!drifted) {
      console.log(
        `docs/SESSIONS.md — la table dit vrai : ${rows.length} tickets, ${closed} fermé(s), ` +
          `recoupé à l'état GitHub.`,
      )
      return
    }

    const before = rowsById(committed)
    const after = rowsById(expected)
    console.error("docs/SESSIONS.md — la table committée ne dit plus l'état GitHub.")
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const b = before.get(id)
      const a = after.get(id)
      if (b === a) continue
      if (b === undefined) console.error(`  + ${id} — absent de la table`)
      else if (a === undefined) console.error(`  − ${id} — présent dans la table, plus dans la file`)
      else console.error(`  ~ ${id}\n      committé : ${b}\n      réel     : ${a}`)
    }
    console.error("Corriger avec : npm.cmd run sessions")
    process.exit(1)
  }

  const next = doc.slice(0, i) + expected + doc.slice(j + END.length)
  if (next === doc) {
    console.log("docs/SESSIONS.md — déjà à jour.")
    return
  }
  writeFileSync(DOC, next)
  console.log(`docs/SESSIONS.md — table régénérée : ${rows.length} tickets, ${closed} fermé(s).`)
}

main()
