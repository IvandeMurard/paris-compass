// Ce que la lecture d'un rouge décide — w1-porte-lue (#77).
//
// Deux moitiés, comme scripts/porte/arms.test.ts : la règle jouée sur des entrées substituées,
// où vit le sabotage — un rouge vieilli d'une heure et le verdict doit basculer — puis la règle
// jouée contre le dépôt tel qu'il est, qui est la seule moitié capable d'attraper le jour où
// quelqu'un retire l'appel de scripts/brief.ts.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { ageEnHeures, palier, PALIERS_JOURS, rendu, SEUIL_DECISION_JOURS, titreEscalade } from "./etat"

const ROOT = resolve(__dirname, "../..")
const MAINTENANT = new Date("2026-09-05T12:00:00Z")
const rouge = (number: number, heures: number, title = "Porte planifiée — décision requise") => ({
  number,
  title,
  createdAt: new Date(MAINTENANT.getTime() - heures * 3_600_000).toISOString(),
})

describe("l'âge d'un rouge", () => {
  it("compte en heures pleines", () => {
    expect(ageEnHeures("2026-09-04T12:30:00Z", MAINTENANT)).toBe(23)
  })

  it("ne rend jamais un âge négatif — une horloge en avance n'est pas un rouge de demain", () => {
    expect(ageEnHeures("2026-09-06T12:00:00Z", MAINTENANT)).toBe(0)
  })
})

describe("le verdict rendu à une session qui démarre", () => {
  it("sort en 0 quand rien n'est ouvert, et le dit en une ligne", () => {
    const etat = rendu([], MAINTENANT)
    expect(etat.code).toBe(0)
    expect(etat.lignes).toHaveLength(1)
  })

  it("sort en 3 sur un rouge de la nuit même : ouvert, pas encore en retard", () => {
    expect(rendu([rouge(78, 23)], MAINTENANT).code).toBe(3)
  })

  it("bascule en 1 à l'heure exacte du seuil — le sabotage", () => {
    // Une heure sépare les deux appels, et c'est la seule chose qui change.
    expect(rendu([rouge(78, SEUIL_DECISION_JOURS * 24 - 1)], MAINTENANT).code).toBe(3)
    expect(rendu([rouge(78, SEUIL_DECISION_JOURS * 24)], MAINTENANT).code).toBe(1)
  })

  it("nomme le numéro et l'âge, parce que c'est ce qui évite d'ouvrir GitHub", () => {
    const lignes = rendu([rouge(74, 51)], MAINTENANT).lignes.join("\n")
    expect(lignes).toContain("#74")
    expect(lignes).toMatch(/2 j\s+3 h/)
  })

  it("un seul rouge en retard suffit à mettre l'ensemble en décision requise", () => {
    expect(rendu([rouge(78, 2), rouge(74, 96)], MAINTENANT).code).toBe(1)
  })
})

describe("l'escalade par le titre — rare, jamais quotidienne", () => {
  it("laisse le titre intact avant le premier palier", () => {
    expect(titreEscalade("Porte planifiée — décision requise", 1.9)).toBe("Porte planifiée — décision requise")
  })

  it("porte l'âge au palier atteint, et à lui seul", () => {
    expect(titreEscalade("Porte planifiée — décision requise", 3)).toContain("depuis 2 jours")
    expect(titreEscalade("Porte planifiée — décision requise", 9)).toContain("depuis 7 jours")
  })

  it("est idempotent : rejoué le lendemain, il n'écrit rien", () => {
    const j3 = titreEscalade("Porte planifiée — décision requise", 3)
    expect(titreEscalade(j3, 4)).toBe(j3)
  })

  it("remplace le palier au lieu de l'empiler", () => {
    const j3 = titreEscalade("Porte planifiée — décision requise", 3)
    expect(titreEscalade(j3, 8)).toBe("Porte planifiée — décision requise — ouverte depuis 7 jours")
    expect(titreEscalade(j3, 8).match(/ouverte depuis/g)).toHaveLength(1)
  })

  it("ne connaît que deux paliers sur la vie entière d'une issue", () => {
    const titres = new Set<string>()
    for (let jour = 0; jour <= 60; jour++) titres.add(titreEscalade("Porte planifiée — décision requise", jour))
    // Le titre d'origine plus un par palier. Trois formes en soixante matins.
    expect(titres.size).toBe(PALIERS_JOURS.length + 1)
  })

  it("les paliers du lecteur sont ceux de l'écrivain — une seule table", () => {
    const signal = readFileSync(resolve(ROOT, "scripts/porte/signal.ts"), "utf8")
    expect(signal, "signal.ts doit lire les paliers de etat.ts, jamais les recopier").toContain(
      'from "./etat"',
    )
    expect(signal).not.toMatch(/PALIERS_JOURS\s*=/)
  })
})

describe("la règle contre le dépôt tel qu'il est", () => {
  it("brief.ts joue l'état des rouges — sans quoi le rouge retombe là où personne ne lit", () => {
    const brief = readFileSync(resolve(ROOT, "scripts/brief.ts"), "utf8")
    expect(brief, "scripts/brief.ts n'appelle plus etatCourant()").toContain("etatCourant()")
  })

  it("palier() ne rend que des valeurs de la table déclarée", () => {
    for (let jour = 0; jour <= 60; jour++) {
      const p = palier(jour)
      expect(p === 0 || (PALIERS_JOURS as readonly number[]).includes(p)).toBe(true)
    }
  })
})
