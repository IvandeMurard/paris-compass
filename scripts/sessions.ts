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
  "w1-porte-publiee",
  "w1-observabilite",
  "w1-catalogue",
  // Quatrieme application de "enumerer, pas lister", nee de #72 : la porte se comptait
  // elle-meme. Le rapport de #72 conclut qu'aucun invariant ne peut voir l'absence — vrai
  // a l'execution, faux a la declaration : le fichier qui appelle PostgREST est sur le
  // disque et porte ou ne porte pas l'echappement.
  "w1-observabilite-echappement",
  // Ne le passe pas devant #81 sans raison : les deux sont des enumerations, mais
  // celle-ci regarde le distant et non le depot, et elle est nee d'un incident reel —
  // #68 a laisse le distant en avance d'une migration pendant vingt-quatre heures
  // sans qu'aucun des onze bras puisse le voir.
  "w1-ledger",

  // --- Ce qui reste des vagues 0 et 1 ---------------------------------------------------
  // w1-historique n'était dans aucune file : ouverte le 10 août, bloquée sur l'APUR, elle
  // tombait dans « hors de cette file » et n'apparaissait donc que comme un chiffre. Un
  // ticket bloqué doit se voir bloqué — c'est à ça que sert BLOQUE plus bas.
  "w1-historique",
  // Reporté par la direction du 31 août (le socle avant l'écran) et repris ici en tête de
  // Q4 pour une raison mesurée : Géorisques est l'une des onze sources qui ont déjà une
  // sonde verte dans catalogue.json. Toutes celles des vagues 2 à 4 sont sans endpoint
  // épinglé. Commencer par la seule dont le tuyau est déjà vérifié coûte une session, pas
  // une session plus une négociation.
  "w1-ppri",
  "w1-dia",

  // --- Q4 2026 ---------------------------------------------------------------------------
  // Mesuré le 6 septembre sur scripts/porte/catalogue.json : sur les 35 sources du
  // catalogue, 11 ont une sonde et AUCUNE d'entre elles n'appartient aux vagues 2 à 4. Les
  // vingt et une autres portent chacune la raison de ne pas en avoir, et ces raisons ne se
  // valent pas — c'est ce qui ordonne ce bloc plus sûrement que les priorités déclarées :
  //
  //   endpoint seulement à choisir (data.gouv, opendata.paris.fr, licence ouverte) — une
  //     session suffit : w2-idfm, w2-filosofi, w2-mobiliscope, w4-meubles, w4-ecoles,
  //     w4-frequentation, w2-bpe-marches-velo
  //   compte ou jeton à ouvrir — une décision d'Ivan AVANT la session : w3-mapillary,
  //     w2-air-bruit, w7-inpi
  //   plusieurs producteurs ou licence « selon registre » — un arbitrage : w4-abf,
  //     w4-erp-copro-ads, w7-foncier
  //
  // Aucune source nouvelle, donc rien à négocier et rien à épingler : elle tire du corpus
  // déjà posé des réponses que rien ne pose aujourd'hui. Sous la direction « fiabilité,
  // rapidité, solidité du back-end », c'est le meilleur rapport de la file, et son préfixe
  // w6 est trompeur — ce ticket n'est pas de l'écran.
  "w6-analyse",
  // Le seul P0 encore ouvert, et il reste en tête malgré son blocage plutôt que d'être
  // rétrogradé en silence : le trou produit n°1 ne cesse pas d'être le trou produit n°1
  // parce qu'un jeton manque. Ce qu'il attend est écrit dans BLOQUE.
  "w3-mapillary",
  // Les quatre que rien n'arrête. IDFM d'abord : c'est le seul qui remplace un proxy déjà
  // affiché — le piéton — par une mesure, et remplacer un proxy vaut mieux qu'ajouter une
  // couche.
  "w2-idfm",
  "w2-filosofi",
  "w2-mobiliscope",
  "w4-meubles",
  // Puis les deux qui demandent une démarche, dans l'ordre de ce qu'elle coûte : une clé
  // d'API pour Airparif, un arbitrage entre producteurs pour l'ABF.
  "w2-air-bruit",
  "w4-abf",
  // --- L'IA au-dessus du cœur : encore du back-end, malgré le mot IA ----------------------
  // w5-entity avant les autres parce qu'il attaque le 36,7 % de « probable » à sa cause —
  // l'appariement BODACC × BDCom — quand les autres l'habillent. w6-mcp étant fermée,
  // w5-entretien n'est plus bloquée, et l'ordre de bataille du plan la place tôt en Q4.
  // w6-mcp est fermee depuis le 27 aout : elle reste dans l'ordre parce que w5-entretien en
  // dependait, et une file qui efface ce qui a debloque le reste ne se relit pas.
  "w6-mcp",
  "w5-entity",
  "w5-entretien",
  "w5-confiance-agent",
  "w5-parse",
  // --- L'écran, en second, et c'est la direction du 31 août qui le dit -------------------
  "w6-liberations",
  "w6-dossier",
  "w6-modes",
  "w5-explain-metier",
  // --- P2 : de l'appoint, à prendre quand une session est courte -------------------------
  "w3-osm-notes",
  "w2-bpe-marches-velo",
  "w4-ecoles",
  "w4-frequentation",
  "w4-erp-copro-ads",
  // --- 2027, et le rappeler ici évite de les croire à portée ------------------------------
  "w7-etude-chantiers",
  "w7-foncier",
  "w7-inpi",
  "w7-kit",
]

/**
 * Ce qui empêche un ticket d'être pris, quand ce n'est pas le code.
 *
 * Pourquoi cette table existe : « ouvert » et « ouvert mais personne ne peut y toucher » se
 * lisaient pareil, et w1-historique — bloquée sur l'APUR depuis le 10 août — n'était même pas
 * dans la file. Une session qui ouvre docs/SESSIONS.md et prend le premier ticket ouvert perd
 * alors sa première demi-heure à découvrir le blocage.
 *
 * Ce que la table ne fait pas, volontairement : elle ne reporte pas le ticket et ne le sort
 * pas de l'ordre. Un blocage est une chose à lever, pas une chose à cacher, et le sortir de la
 * file le rendrait invisible — exactement ce qui est arrivé à w1-historique.
 */
const BLOQUE: Record<string, string> = {
  "w1-historique": "APUR — courrier le 10 août 2026, relance le 24, sans réponse au 6 septembre.",
  "w3-mapillary":
    "jeton d'API Mapillary à créer, et l'attribution CC-BY-SA à trancher avant d'ingérer " +
    "(la question est ouverte dans `catalogue.json`). Décision d'Ivan, pas travail de session.",
  "w2-air-bruit": "clé d'API Airparif à demander. Bruitparif n'a pas d'endpoint ouvert épinglé.",
  "w7-foncier": "convention Ville / APUR / Cerema — accès réservé aux acteurs publics.",
}

/**
 * Which model for which class of work — also a judgement, not a measurement.
 *
 * Le critère, tel qu'il a été appliqué aux trois premiers et étendu à Q4 : Sonnet pour une
 * ingestion dont la forme est déjà connue — un endpoint ouvert, un schéma à transcrire, une
 * cadence à déclarer, des invariants sur le modèle des précédents. Opus dès qu'il faut
 * *décider* : une licence à interpréter, une attribution à trancher, un appariement probable,
 * une phrase que le produit assumera. Ce n'est pas la difficulté du SQL qui départage, c'est
 * la présence ou non d'un arbitrage irréversible dans le ticket.
 */
const MODEL: Record<string, string> = {
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
    const bloque = !done && BLOQUE[r.id] !== undefined
    const state = r.issue ? (done ? "**fait**" : bloque ? "**bloqué**" : "ouvert") : "**pas d'issue**"
    const idx = done ? `~~${n}~~` : `${n}`
    lines.push(`| ${idx} | ${label} | ${num} | ${state} | ${r.priority} | ${MODEL[r.id] ?? DEFAULT_MODEL} |`)
  }

  // Les raisons sous la table plutôt que dans une colonne : une raison utile est une phrase,
  // et une phrase dans une cellule casse la lecture des cinq autres colonnes.
  const bloques = planned.filter((r) => r.issue?.state !== "CLOSED" && BLOQUE[r.id])
  if (bloques.length > 0) {
    lines.push("")
    lines.push(`**${bloques.length} tickets attendent autre chose que du code.** Ils restent à leur`)
    lines.push("place dans l'ordre — un blocage se lève, il ne se cache pas — mais ne pas les ouvrir")
    lines.push("en session tant que la ligne ci-dessous tient :")
    lines.push("")
    for (const r of bloques) lines.push(`- \`${r.id}\` — ${BLOQUE[r.id]}`)
  }

  // Depuis le 6 septembre l'ordre couvre les 51 tickets, donc cette phrase parle d'un cas qui
  // ne se produit plus qu'à l'écriture d'un ticket neuf — et c'est précisément là qu'elle sert.
  const rest = rows.filter((r) => !ORDER.includes(r.id) && r.issue?.state !== "CLOSED")
  lines.push("")
  if (rest.length === 0) {
    lines.push("**Tous les tickets du dépôt sont dans cette file.** Un ticket neuf tombera ici,")
    lines.push("hors ordre, tant que `ORDER` de `scripts/sessions.ts` ne lui aura pas donné sa place —")
    lines.push("le détail par vague est dans [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).")
  } else {
    lines.push(`**Hors de cette file : ${rest.length} tickets ouverts**, sans place déclarée dans \`ORDER\` — `)
    lines.push("le détail par vague est dans [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).")
  }

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
