// Le workflow d'ingestion se relit lui-même : sa table de correspondance cron -> source
// doit rester alignée sur son propre bloc `on.schedule`.
//
// Pourquoi un test plutôt que la confiance : `.github/workflows/ingestion.yml` porte quatre
// planifications dans un seul fichier, et un `case` qui les traduit en nom de jeu. Changer une
// heure dans `on.schedule` sans changer la ligne correspondante du `case` produit une
// planification que le job ne reconnaît pas. Le workflow s'en aperçoit — il sort en erreur —
// mais **seulement le jour où ce cron se déclenche** : deux fois l'an pour la géographie, une
// fois par trimestre pour BDCom. Un chargement qui ne part pas pendant six mois est exactement
// la panne silencieuse que w0-cron existe pour supprimer.
//
// Volontairement sans bibliothèque YAML : le fichier est sous notre contrôle, et ajouter une
// dépendance pour lire quatre chaînes serait cher payé (CLAUDE.md — vérifier les avis avant
// d'ajouter une dépendance).

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

const WORKFLOW = resolve(import.meta.dirname, "../../.github/workflows/ingestion.yml")
const yaml = readFileSync(WORKFLOW, "utf8")

/**
 * Le fichier sans ses lignes de commentaire.
 *
 * Nécessaire, et trouvé en écrivant ce test : le workflow *explique* pourquoi il n'utilise pas
 * `pull_request_target`, et la recherche naïve de cette chaîne trouvait l'explication. Un
 * contrôle qui confond une mise en garde avec la chose contre laquelle elle met en garde est
 * un contrôle qui crie au loup — et qu'on finit par désarmer.
 */
const structure = yaml
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n")

/** Les `- cron: "..."` du bloc `on.schedule`. */
function declaredCrons(): string[] {
  return [...structure.matchAll(/^\s*-\s*cron:\s*"([^"]+)"/gm)].map((m) => m[1])
}

/** Les branches `"..." ) source=nom` de l'étape « Quelle source ». */
function caseArms(): { cron: string; source: string }[] {
  return [...structure.matchAll(/^\s*"([^"]+)"\)\s*source=(\w+)\s*;;/gm)].map((m) => ({
    cron: m[1],
    source: m[2],
  }))
}

/** Les options de `workflow_dispatch.inputs.source`. */
function dispatchOptions(): string[] {
  const block = /options:\s*\[([^\]]+)\]/.exec(structure)?.[1] ?? ""
  return block.split(",").map((s) => s.trim()).filter(Boolean)
}

describe("workflow d'ingestion", () => {
  it("déclare quatre planifications, une par cadence", () => {
    // Quatre sources, quatre rythmes. Une cadence unique serait fausse pour au moins trois
    // d'entre elles — PLAN.md §2.2bis.
    expect(declaredCrons()).toHaveLength(4)
  })

  it("traduit chaque planification déclarée en un jeu", () => {
    const armed = new Set(caseArms().map((a) => a.cron))
    for (const cron of declaredCrons()) {
      expect(armed, `la planification « ${cron} » n'a pas de branche dans l'étape « Quelle source »`).toContain(cron)
    }
  })

  it("ne garde aucune branche orpheline", () => {
    // L'autre sens : une branche dont la planification a disparu est du code mort qui donne
    // l'illusion qu'un jeu est rafraîchi.
    const declared = new Set(declaredCrons())
    for (const arm of caseArms()) {
      expect(declared, `la branche « ${arm.cron} » -> ${arm.source} ne correspond à aucune planification`).toContain(arm.cron)
    }
  })

  it("associe chaque planification à un jeu distinct", () => {
    const sources = caseArms().map((a) => a.source)
    expect(new Set(sources).size, "deux planifications pointent sur le même jeu").toBe(sources.length)
  })

  it("propose au déclenchement manuel exactement les jeux planifiés", () => {
    expect([...dispatchOptions()].sort()).toEqual(caseArms().map((a) => a.source).sort())
  })

  it("n'expose le job à aucun déclencheur qui exécuterait du code externe", () => {
    // Dépôt public : `pull_request_target` exécuterait le workflow d'une branche quelconque
    // avec accès aux secrets, dont la chaîne de connexion privilégiée.
    expect(structure).not.toMatch(/pull_request_target/)
    expect(structure).not.toMatch(/^\s*pull_request:/m)
  })

  it("sérialise les chargements et ne les interrompt pas", () => {
    // Deux chargeurs qui écrivent en même temps se marchent dessus ; et tuer celui qui tourne
    // annule sa transaction, donc perd l'exécution au lieu de la remplacer.
    expect(structure).toMatch(/group:\s*ingestion/)
    expect(structure).toMatch(/cancel-in-progress:\s*false/)
  })

  it("ne demande que la lecture du dépôt", () => {
    expect(structure).toMatch(/permissions:\s*\n\s*contents:\s*read/)
  })

  it("ne porte qu'un secret, et jamais la clé anon", () => {
    const secrets = [...structure.matchAll(/secrets\.(\w+)/g)].map((m) => m[1])
    expect(new Set(secrets)).toEqual(new Set(["DATABASE_URL"]))
    // La clé publiable est publique : elle n'a rien à faire ici, et surtout pas sous un nom
    // qui laisserait croire qu'elle suffit à charger.
    expect(structure).not.toMatch(/ANON_KEY|PUBLISHABLE/)
  })

  it("relève la fraîcheur même quand le chargement a échoué", () => {
    // C'est en cas d'échec que le relevé compte : il montre que last_success_at n'a pas bougé.
    expect(structure).toMatch(/if:\s*always\(\)/)
  })

  it("rejoue la géographie après BDCom, jamais l'inverse", () => {
    // geography.ts rattache chaque local à son quartier et à son tronçon. Recharger le
    // recensement sans rejouer le rattachement laisserait les nouveaux locaux hors des
    // agrégats par quartier — une perte silencieuse.
    const arm = /bdcom\)([\s\S]*?);;/.exec(structure)?.[1] ?? ""
    const bdcomAt = arm.indexOf("ingest/bdcom.ts")
    const geoAt = arm.indexOf("ingest/geography.ts")
    expect(bdcomAt, "la branche bdcom ne lance pas bdcom.ts").toBeGreaterThan(-1)
    expect(geoAt, "la branche bdcom n'enchaîne pas geography.ts").toBeGreaterThan(-1)
    expect(geoAt).toBeGreaterThan(bdcomAt)
  })
})
