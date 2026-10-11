// La coupe du rapport de clôture, jouée sur des entrées substituées ET sur les tickets du dépôt.
//
// **Pourquoi les deux moitiés, contrairement à scripts/session-epiques.test.ts.** Celle-là ne
// pouvait pas jouer sur la population réelle, qui vit sur GitHub. Ici la population est sur le
// disque — `docs/tickets/` — donc la règle peut être jouée contre elle sans réseau ni jeton.
//
// Ce qui N'EST PAS prouvé ici : qu'un ticket dont l'issue est FERMÉE porte bien un titre de
// clôture. Cet appariement-là a besoin de l'état GitHub, et il n'a pas de bras. C'est la limite
// écrite dans DIAGNOSTIC.md §54, et le garde-fou qui l'a rendue visible est l'état de l'issue lu
// par `brief` lui-même, pas cette coupe.

import { readFileSync, readdirSync, statSync } from "fs"
import { join, resolve } from "path"

import { describe, expect, it } from "vitest"

import { coupeRapport, etatDeLIssue } from "./brief"
import { Issue, issuesDuTicket } from "./session-issues"

const TICKETS = resolve("docs/tickets")
const lire = (f: string) => readFileSync(resolve(TICKETS, f), "utf8").replace(/\r\n/g, "\n")

describe("coupeRapport — la règle", () => {
  it("coupe sur « Fait le », la forme d'origine", () => {
    const r = coupeRapport(["# Ticket", "corps", "## Fait le 24 août 2026", "rapport"])
    expect(r).toEqual({ utiles: 2, rapport: 2 })
  })

  it("coupe sur « Fait les », le pluriel", () => {
    expect(coupeRapport(["# T", "# Fait les 24 et 25 août 2026", "x"]).utiles).toBe(1)
  })

  // Les trois formes qui ne coupaient pas avant le 15 septembre 2026.
  it("coupe sur « Livré — », la forme des tickets de vague 6", () => {
    const r = coupeRapport(["# T", "corps", "## Livré — 15 septembre 2026", "rapport"])
    expect(r).toEqual({ utiles: 2, rapport: 2 })
  })

  it("coupe sur « Livré le … », l'autre orthographe du même verbe", () => {
    expect(coupeRapport(["# T", "## Livré le 14 septembre 2026 — ce qui est démontré"]).utiles).toBe(1)
  })

  it("coupe sur « Fait — mesuré le … », sans « le » collé au verbe", () => {
    expect(coupeRapport(["# T", "## Fait — mesuré le 24 août 2026 contre le distant"]).utiles).toBe(1)
  })

  // La contre-preuve : la coupe est lexicale PARCE QUE la date ne discrimine pas. Ces titres-là
  // vivent dans des tickets ouverts, et les couper amputerait le brief de son sujet.
  it("ne coupe PAS sur un titre daté qui n'est pas un rapport de clôture", () => {
    for (const titre of [
      "## Avancement — 12 septembre 2026, les trois migrations POSÉES",
      "## État — 11 septembre 2026 (w1-filosofi)",
      "## Relevé des appelants de `scoreLocation` — mesuré le 24 août 2026",
      "## Ce que la pose a mesuré — 12 septembre 2026",
      "## Le référencement, tranché par Ivan le 11 septembre 2026",
      "## Pourquoi il passe ici et pas plus tôt — décidé par Ivan le 11 septembre 2026",
    ]) {
      expect(coupeRapport(["# T", titre, "suite"]), titre).toEqual({ utiles: 3, rapport: 0 })
    }
  })

  it("ne coupe pas sur « Fait quand », le critère d'acceptation de tout ticket", () => {
    expect(coupeRapport(["# T", "## Fait quand", "1. ..."]).rapport).toBe(0)
  })
})

describe("coupeRapport — la population du dépôt", () => {
  const fichiers = readdirSync(TICKETS).filter((f) => /^w\d+-.*\.md$/.test(f))

  it("la population n'est pas vide", () => {
    expect(fichiers.length).toBeGreaterThan(40)
  })

  // Le défaut du 15 septembre 2026 : quatre des vingt rapports de clôture sur le disque ne
  // correspondaient à rien, donc `brief` disait « en entier » et servait à la session son propre
  // rapport comme travail à faire. Ce contrôle rougit si un cinquième verbe apparaît sans être
  // ajouté à RAPPORT_CLOS.
  it("tout titre de clôture du disque est reconnu par la coupe", () => {
    const rate: string[] = []
    for (const f of fichiers) {
      const lignes = lire(f).split("\n")
      const suspect = lignes.find((l) => /^#{1,3} (Fait|Livr|Clos|Fermé|Terminé)/.test(l) && !/^#{1,3} Fait quand\b/.test(l))
      if (suspect && coupeRapport(lignes).rapport === 0) rate.push(`${f} -> ${suspect}`)
    }
    expect(rate).toEqual([])
  })

  it("aucun ticket n'est coupé à zéro ligne utile", () => {
    for (const f of fichiers) {
      expect(coupeRapport(lire(f).split("\n")).utiles, f).toBeGreaterThan(0)
    }
  })
})


// ── L'appariement ticket↔issue ────────────────────────────────────────────────────────────
//
// Le défaut du 15 septembre 2026 (#189) : `brief` appariait `\b<id>\b` n'importe où dans le
// titre, quand la table d'ordre est ancrée en tête depuis #131. Les deux moitiés du contrôle
// ci-dessous répondent chacune à une moitié du défaut : la première rejoue les deux cas
// mesurés, la seconde empêche qu'un troisième appariement réapparaisse ailleurs.

/** La population substituée qui porte les deux erreurs mesurées, et rien d'autre.
 *
 *  Les titres sont ceux du dépôt, relevés au `gh issue view` le 15 septembre 2026 et tronqués ;
 *  ce qui décide — l'ancre, la mention, le préfixe plus long — est intact. L'ordre est celui
 *  que `gh issue list` rend, du plus récent au plus ancien : c'est lui que l'ancien `find`
 *  suivait, donc le sabotage plus bas en dépend. */
const POPULATION: Issue[] = [
  // La mention. Ce titre-là volait la ligne de #119 : `w6-contexte` y apparaît, sans être
  // l'identifiant du ticket que l'issue traite.
  { number: 142, title: "[P0] Le site publie ne porte pas w6-contexte, fusionne depuis deux jours", state: "CLOSED", labels: [], body: "" },
  // L'inverse, et il est OUVERT : une mention peut aussi faire croire qu'un ticket livré est vivant.
  { number: 129, title: "ContextFinding peut afficher le jeton brut, et trois petites dettes de w6-contexte", state: "OPEN", labels: [], body: "" },
  { number: 119, title: "[P1] w6-contexte — La fiche de contexte devient le produit", state: "CLOSED", labels: [], body: "" },
  // Le préfixe : `-` n'est pas un caractère de mot, donc `\b` ne fermait pas l'identifiant.
  { number: 81, title: "[P1] w1-observabilite-echappement — La porte se compte elle-même", state: "CLOSED", labels: [], body: "" },
  { number: 72, title: "[P1] w1-observabilite — Classer les requêtes, jamais les gens", state: "CLOSED", labels: [], body: "" },
]

describe("etatDeLIssue — l'appariement ancré", () => {
  it("rend #119 pour w6-contexte, pas l'issue qui le mentionne", () => {
    expect(etatDeLIssue(POPULATION, "w6-contexte")).toEqual({ num: "119", clos: true })
  })

  it("rend #72 pour w1-observabilite, pas l'issue du préfixe plus long", () => {
    expect(etatDeLIssue(POPULATION, "w1-observabilite")).toEqual({ num: "72", clos: true })
  })

  // Le sabotage : sans lui, la population ci-dessus pourrait cesser de porter le défaut sans
  // que rien ne le dise, et les deux contrôles passeraient au vert en ne prouvant plus rien.
  it("l'ancien appariement, lui, se trompait sur cette même population", () => {
    const ancien = (id: string) =>
      POPULATION.find((i) => new RegExp("\\b" + id + "\\b").test(i.title))?.number
    expect(ancien("w6-contexte")).toBe(142)
    expect(ancien("w1-observabilite")).toBe(81)
  })

  // La contre-preuve du « Fait quand » de #189, point 2 : un ticket qu'aucune issue n'ancre
  // rend « inconnu ». Il ne rend JAMAIS le numéro d'une issue qui le nomme en passant — et
  // depuis #187 ce numéro porterait un ordre « ARRÊTE-TOI ».
  it("rend inconnu plutôt que le numéro d'une issue qui mentionne le ticket", () => {
    const mention: Issue[] = [
      { number: 200, title: "[P1] Un défaut trouvé en lisant w9-fantome", state: "CLOSED", labels: [], body: "" },
    ]
    expect(etatDeLIssue(mention, "w9-fantome")).toEqual({ num: "?", clos: null })
  })

  it("refuse plutôt que de choisir quand deux issues portent le titre officiel", () => {
    const deux: Issue[] = [
      { number: 300, title: "[P1] w9-double — la première", state: "OPEN", labels: [], body: "" },
      { number: 301, title: "[P1] w9-double — la seconde", state: "CLOSED", labels: [], body: "" },
    ]
    const r = etatDeLIssue(deux, "w9-double")
    expect(r.ambigu).toEqual([300, 301])
    expect(r.clos).toBeNull()
  })
})

describe("les deux appariements — celui du brief et celui de la table", () => {
  const ids = readdirSync(TICKETS)
    .filter((f) => /^w\d+-.*\.md$/.test(f))
    .map((f) => f.slice(0, -3))

  // Point 3 du « Fait quand » : recouper les deux côtés. La table passe par `issuesDuTicket`
  // (scripts/sessions.ts), le brief par `etatDeLIssue` — et sur la même population ils doivent
  // dire le même numéro, pour les tickets du dépôt comme pour les pièges ci-dessus.
  it("disent le même numéro sur la même population", () => {
    for (const id of [...ids, "w6-contexte", "w1-observabilite", "w9-fantome"]) {
      const table = issuesDuTicket(POPULATION, id)
      const brief = etatDeLIssue(POPULATION, id)
      expect(brief.num, id).toBe(table.length === 1 ? String(table[0].number) : "?")
    }
  })
})

/** Tous les scripts TypeScript du dépôt — dérivé, jamais listé : une liste tenue à la main
 *  serait juste le jour où on l'écrit, et c'est un fichier NEUF que ce contrôle doit attraper. */
function scripts(dir = resolve("scripts")): string[] {
  return readdirSync(dir).flatMap((f) => {
    const chemin = join(dir, f)
    if (statSync(chemin).isDirectory()) return scripts(chemin)
    return /\.(ts|mts|mjs)$/.test(f) ? [chemin] : []
  })
}

describe("un seul propriétaire de l'appariement", () => {
  // Ce que le contrôle précédent ne rattrape pas : tant que les deux côtés appellent le même
  // `issuesDuTicket`, leur recoupement est vrai par construction. Ce qui le garde vrai est
  // ici — un fichier qui se remettrait à lire la population complète des issues pour son
  // propre compte, comme brief.ts le faisait jusqu'au 15 septembre 2026.
  //
  // Le signal est `--state all` : c'est ce que demande un appariement, et lui seul. Les autres
  // appels à `gh issue list` du dépôt — scripts/porte/etat.ts, scripts/porte/signal.ts — lisent
  // les rouges ouverts d'une étiquette, jamais la population entière.
  it("aucun autre script ne lit la population complète des issues", () => {
    const coupables = scripts()
      // Deux exclusions, et deux raisons différentes : le propriétaire de l'appariement, qui a
      // le droit de lire la population ; et ce fichier-ci, dont le texte de la règle contient
      // par force le motif qu'elle traque.
      .filter((f) => !f.endsWith("session-issues.ts") && !f.endsWith("brief.test.ts"))
      .filter((f) => {
        const src = readFileSync(f, "utf8").replace(/\s+/g, " ")
        return /"issue", "list"/.test(src) && /"--state", "all"/.test(src)
      })
      .map((f) => f.slice(resolve("scripts").length + 1))
    expect(coupables).toEqual([])
  })
})
