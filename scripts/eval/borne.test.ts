// La borne BODACC des baselines, rendue mécanique — #227, 6 octobre 2026.
//
// Un comptage gelé ne juge un changement de pipeline que sur une population qui ne grandit pas
// toute seule. BODACC grandit chaque nuit : un comptage qui le lit sans borne rougit sur la
// croissance de la source, et une porte qui crie sur ce qui est normal apprend à être ignorée.
// Le raisonnement et ses mesures : `note_borne_bodacc` dans eval/baselines/ingestion.json.
//
// Ce que ce test ne rattrape pas : il lit le TEXTE du SQL. Une vue ou une fonction neuve qui
// lirait BODACC sous un autre nom lui échappe — `compass_address_timeline` est nommée ici parce
// qu'elle est la seule, au 6 octobre 2026, par laquelle une baseline atteint BODACC.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const BORNE = "2026-08-14"

interface Compte {
  value: number
  sql: string
  publie?: unknown
}

/** A count reads BODACC when it names one of its tables, or the timeline that unions them in. */
function litBodacc(sql: string): boolean {
  return /\bbodacc_|compass_address_timeline/.test(sql)
}

function estBorne(sql: string): boolean {
  return (
    sql.includes(`a.published_on <= date '${BORNE}'`) ||
    sql.includes(`t.occurred_on <= date '${BORNE}'`)
  )
}

/** The names of the counts that read BODACC without the cutoff. A published figure is exempt. */
export function sansBorne(comptes: Record<string, Compte>): string[] {
  return Object.entries(comptes)
    .filter(([, c]) => c.publie === undefined && litBodacc(c.sql) && !estBorne(c.sql))
    .map(([nom]) => nom)
}

const fichier = JSON.parse(
  readFileSync(resolve(__dirname, "../../eval/baselines/ingestion.json"), "utf8"),
) as { counts: Record<string, Compte>; note_borne_bodacc: string }

describe("un comptage qui lit BODACC porte la borne du gel", () => {
  it("vaut pour toutes les baselines du fichier", () => {
    expect(sansBorne(fichier.counts)).toEqual([])
  })

  it("compte bien les neuf qu'elle concerne, pour qu'un retrait ne passe pas en silence", () => {
    const bornes = Object.entries(fichier.counts).filter(([, c]) => estBorne(c.sql))
    expect(bornes.map(([nom]) => nom).sort()).toEqual([
      "bodacc_avis_confirmes_sur_place",
      "bodacc_avis_infirmes",
      "bodacc_cessions_avec_prix",
      "bodacc_etablissements_localises",
      "cessions_local_identifiable",
      "confiance_corrobore",
      "confiance_etabli",
      "confiance_indetermine",
      "confiance_probable",
    ])
  })

  it("laisse le chiffre publié suivre les données servies", () => {
    const mediane = fichier.counts.prix_median_local_identifiable
    expect(mediane.publie).toBeDefined()
    expect(estBorne(mediane.sql)).toBe(false)
  })

  it("rougit sur un comptage BODACC neuf écrit sans la borne", () => {
    const sabote = {
      ...fichier.counts,
      bodacc_neuf: { value: 1, sql: "select count(*) n from public.bodacc_judgment" },
    }
    expect(sansBorne(sabote)).toEqual(["bodacc_neuf"])
  })

  it("ne réclame rien d'une source que chaque chargement remplace", () => {
    expect(sansBorne({ s: { value: 1, sql: "select count(*) n from public.sirene_establishment" } })).toEqual([])
  })

  it("garde la note qui dit pourquoi, à la même date", () => {
    expect(fichier.note_borne_bodacc).toContain("14 AOUT 2026")
  })
})
