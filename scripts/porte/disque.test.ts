// Le bras du disque — w1-chargeurs-gonflement (#239). The rule that ships, played against the
// cases that must go red: jugerDisque and prochaineExecution are imported from disque.ts, never
// re-implemented here. The numbers are the ones measured on 6 October 2026, not inventions.

import { describe, expect, it } from "vitest"

import { readWorkflows, scheduledSources } from "./cadences"
import {
  ajoutDuBloc,
  etatGlobal,
  jugerDisque,
  lireConfig,
  prochaineExecution,
  type Mesure,
} from "./disque"

const config = lireConfig()
/** Tuesday 6 October 2026, noon UTC — the day the arm was written. */
const MARDI = new Date("2026-10-06T12:00:00Z")
const dans = (jours: number) => new Date(MARDI.getTime() + jours * 86_400_000)

const sain: Mesure = {
  baseMo: 349, // 393 measured, minus the 44 MB of BDCom staging emptied by #239
  pics: [{ nom: "sirene_stock", ajoutMo: 9, prochain: dans(3) }],
  croissanceMoParJour: 0.04,
  tables: [{ table: "premise_location", totalMo: 38, ratio: 1.3 }],
}

describe("prochaineExecution lit les crons des workflows comme GitHub", () => {
  it("trouve le vendredi soir suivant", () => {
    expect(prochaineExecution("53 20 * * 5", MARDI)?.toISOString()).toBe("2026-10-09T20:53:00.000Z")
  })

  it("trouve le prochain trimestre de BDCom", () => {
    expect(prochaineExecution("11 5 5 1,4,7,10 *", MARDI)?.toISOString()).toBe("2027-01-05T05:11:00.000Z")
  })

  it("passe au lendemain quand l'heure du jour est passée", () => {
    expect(prochaineExecution("17 3 * * *", MARDI)?.toISOString()).toBe("2026-10-07T03:17:00.000Z")
  })

  it("lit un jour du mois ET un jour de la semaine comme l'un OU l'autre", () => {
    // 1st of the month or any Sunday: from Tuesday 6 October, Sunday the 11th comes first.
    expect(prochaineExecution("0 0 1 * 0", MARDI)?.toISOString()).toBe("2026-10-11T00:00:00.000Z")
  })

  it("refuse une forme qu'il ne sait pas lire plutôt que de deviner", () => {
    expect(() => prochaineExecution("*/5 * * * *", MARDI)).toThrow()
  })

  it("sait dater chaque source planifiée des workflows réels", () => {
    // The population is derived from the workflows, not listed: a cron written in a form this
    // arm cannot read fails here, the day it is written.
    const sources = scheduledSources(readWorkflows())
    expect(sources.size).toBeGreaterThan(5)
    for (const [, where] of sources) {
      expect(prochaineExecution(where.split(" — ")[1], MARDI)).not.toBeNull()
    }
  })

  it("trouve un cron pour chaque chargement que le bras surveille", () => {
    const sources = scheduledSources(readWorkflows())
    for (const bloc of config.blocs) expect(sources.has(bloc.source), bloc.source).toBe(true)
  })
})

describe("le bras juge avant le plafond, pas au plafond", () => {
  it("reste vert sur la base d'après #239", () => {
    expect(etatGlobal(jugerDisque(sain, config, MARDI))).toBe("vert")
  })

  it("rougit sur un chargement qui franchira le seuil dans les trente jours", () => {
    // The real case of 6 October 2026: SIRENE stock reloaded in one transaction, 82 MB on top of
    // a base of 393 — 514 MB on the dashboard, past the ceiling, three days away.
    const m = { ...sain, baseMo: 393, pics: [{ nom: "sirene_stock", ajoutMo: 74, prochain: dans(3) }] }
    const constats = jugerDisque(m, config, MARDI)
    expect(etatGlobal(constats)).toBe("rouge")
    expect(constats.find((c) => c.quoi === "pic sirene_stock")?.detail).toContain("2026-10-09")
  })

  it("prévient sans rougir quand le même chargement est loin — c'est le temps de se retourner", () => {
    const m = { ...sain, pics: [{ nom: "bdcom", ajoutMo: 136, prochain: dans(91) }] }
    expect(etatGlobal(jugerDisque(m, config, MARDI))).toBe("signal")
  })

  it("rougit sur un chargement au-delà du seuil dont la date est inconnue", () => {
    const m = { ...sain, pics: [{ nom: "inconnu", ajoutMo: 136, prochain: null }] }
    expect(etatGlobal(jugerDisque(m, config, MARDI))).toBe("rouge")
  })

  it("rougit quand la base elle-même a passé le seuil", () => {
    expect(etatGlobal(jugerDisque({ ...sain, baseMo: 420, pics: [] }, config, MARDI))).toBe("rouge")
  })

  it("prévient quand la croissance atteindra le seuil dans l'horizon, et rougit si c'est proche", () => {
    // 349 MB Postgres is ~385 on the dashboard, 65 MB under the 450 threshold.
    expect(etatGlobal(jugerDisque({ ...sain, croissanceMoParJour: 1 }, config, MARDI))).toBe("signal")
    expect(etatGlobal(jugerDisque({ ...sain, croissanceMoParJour: 3 }, config, MARDI))).toBe("rouge")
  })

  it("signale une table regonflée — un chargeur revenu au DELETE ou à l'UPDATE de tout", () => {
    // premise_location as it stood on 6 October 2026: 69 MB of heap for 19 MB of rows.
    const m = { ...sain, tables: [{ table: "premise_location", totalMo: 141, ratio: 3.7 }] }
    const constats = jugerDisque(m, config, MARDI)
    expect(etatGlobal(constats)).toBe("signal")
    expect(constats.some((c) => c.quoi === "gonflement premise_location")).toBe(true)
  })

  it("ne juge pas le gonflement d'une petite table, où l'estimation est du bruit", () => {
    const m = { ...sain, tables: [{ table: "ingestion_run", totalMo: 0.1, ratio: 9 }] }
    expect(etatGlobal(jugerDisque(m, config, MARDI))).toBe("vert")
  })
})

describe("un chargement partitionné compte son plus gros morceau, pas sa table", () => {
  const stock = config.blocs.find((b) => b.nom === "sirene_stock")!
  const sirene = config.blocs.find((b) => b.nom === "sirene")!

  it("divise le stock SIRENE par sa plus grosse part", () => {
    expect(ajoutDuBloc(stock, 74, 0.12)).toBeCloseTo(74 * 0.12)
  })

  it("compte tout un bloc qui ne déclare pas de partition", () => {
    expect(ajoutDuBloc(sirene, 15, 0.12)).toBe(15 * sirene.facteur)
  })
})

describe("le seuil reste sous le plafond de Supabase", () => {
  it("ne laisse pas le seuil rejoindre le plafond", () => {
    // Raising part_du_plafond to 1 would make this arm go red on the day the base turns
    // read-only — the failure it exists to prevent.
    expect(config.part_du_plafond).toBeLessThan(1)
    expect(config.plafond_mo_tableau_de_bord).toBe(500)
  })
})
