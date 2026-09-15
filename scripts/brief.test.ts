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

import { readFileSync, readdirSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { coupeRapport } from "./brief"

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
