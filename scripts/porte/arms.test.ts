// The control that fails if an arm of the gate exists without being scheduled — #71, point 3.
//
// Two halves, and both are needed. The first plays the rule against substituted inputs, which
// is where the sabotage lives: a probe added and the check must go red, the probe removed and
// it must go green again. The second plays it against the repository as it stands, which is
// what will catch the ninth script somebody adds in three months — the case no fixture can
// anticipate, and the only one that actually matters.

import { describe, expect, it } from "vitest"

import { armsOfTheGate, classifyArms, hasCadence, readExcuses, readScripts, readWorkflows, targetsOf } from "./arms"

const WORKFLOWS = [
  {
    file: "porte.yml",
    text: 'on:\n  schedule:\n    - cron: "29 7 * * *"\njobs:\n  porte:\n    steps:\n      - run: npm run eval\n      - run: npm run eval:anon\n',
  },
]

describe("la règle, jouée sur des entrées substituées", () => {
  it("tient un script joué par un workflow planifié pour planifié", () => {
    const verdicts = classifyArms([{ name: "eval", command: "tsx scripts/eval/run.ts" }], WORKFLOWS, {})
    expect(verdicts[0].state).toBe("planifie")
  })

  it("ne confond pas eval avec eval:anon", () => {
    // `npm run eval` must not vouch for `eval:anon`, nor the other way round: a prefix match
    // would let a whole family of arms ride on one scheduled sibling.
    const verdicts = classifyArms(
      [{ name: "eval", command: "tsx scripts/eval/run.ts" }, { name: "eval:sonde", command: "tsx scripts/eval/sonde.ts" }],
      WORKFLOWS,
      {},
    )
    expect(verdicts.find((v) => v.name === "eval:sonde")?.state).toBe("muet")
  })

  it("rougit sur un bras ajouté sans planification — le sabotage", () => {
    const verdicts = classifyArms(
      [{ name: "eval", command: "tsx scripts/eval/run.ts" }, { name: "eval:sonde", command: "tsx scripts/eval/sonde.ts" }],
      WORKFLOWS,
      {},
    )
    const probe = verdicts.find((v) => v.name === "eval:sonde")
    expect(probe?.state).toBe("muet")
    expect(probe?.detail).toContain("cadence.json")
  })

  it("revient au vert quand la sonde est retirée — le contre-test", () => {
    // Without this half, a check that went red on every input would pass the sabotage and be
    // worth nothing.
    const verdicts = classifyArms([{ name: "eval", command: "tsx scripts/eval/run.ts" }], WORKFLOWS, {})
    expect(verdicts.every((v) => v.state === "planifie")).toBe(true)
  })

  it("accepte une raison écrite, et refuse une raison vide", () => {
    const scripts = [{ name: "dev", command: "vite" }]
    expect(classifyArms(scripts, WORKFLOWS, { dev: "serveur de développement" })[0].state).toBe("excuse")
    expect(classifyArms(scripts, WORKFLOWS, { dev: "   " })[0].state).toBe("muet")
  })

  it("rougit sur une raison écrite pour un script disparu", () => {
    const verdicts = classifyArms([], WORKFLOWS, { "eval:disparu": "une raison" })
    expect(verdicts[0].state).toBe("orphelin")
  })

  it("rougit quand un script est à la fois planifié et excusé", () => {
    const verdicts = classifyArms([{ name: "eval", command: "tsx scripts/eval/run.ts" }], WORKFLOWS, { eval: "pas besoin" })
    expect(verdicts[0].state).toBe("contradictoire")
  })

  it("ignore un workflow qui n'a pas de cadence", () => {
    // A workflow reachable only by `workflow_dispatch` is a button, and a button is what this
    // ticket exists to stop relying on.
    const bouton = [{ file: "manuel.yml", text: "on:\n  workflow_dispatch:\njobs:\n  x:\n    steps:\n      - run: npm run eval\n" }]
    expect(classifyArms([{ name: "eval", command: "tsx scripts/eval/run.ts" }], bouton, {})[0].state).toBe("muet")
  })

  it("compte un script appelé par son fichier, pas seulement par son nom", () => {
    // ingestion.yml runs `npx tsx scripts/ingest/freshness.ts` directly. Matching only on
    // `npm run` would have declared that arm unscheduled while it runs every night.
    const direct = [
      {
        file: "ingestion.yml",
        text: 'on:\n  schedule:\n    - cron: "17 3 * * *"\njobs:\n  i:\n    steps:\n      - run: npx tsx scripts/ingest/freshness.ts\n',
      },
    ]
    const verdicts = classifyArms([{ name: "freshness", command: "tsx scripts/ingest/freshness.ts" }], direct, {})
    expect(verdicts[0].state).toBe("planifie")
  })

  it("fait suivre à un crochet npm le sort du script qu'il enveloppe", () => {
    const withBuild = [
      { file: "porte.yml", text: 'on:\n  schedule:\n    - cron: "29 7 * * *"\njobs:\n  p:\n    steps:\n      - run: npm run build\n' },
    ]
    const verdicts = classifyArms(
      [{ name: "build", command: "vite build" }, { name: "prebuild", command: "tsx scripts/generate-sitemap.ts" }],
      withBuild,
      {},
    )
    expect(verdicts.find((v) => v.name === "prebuild")?.state).toBe("planifie")
  })

  it("lit les fichiers qu'une commande exécute", () => {
    expect(targetsOf("tsx scripts/eval/run.ts")).toEqual(["scripts/eval/run.ts"])
    expect(targetsOf("node scripts/verify-mcp.mjs --smoke")).toEqual(["scripts/verify-mcp.mjs"])
    expect(targetsOf("vite build")).toEqual([])
  })

  it("ne lit pas une ligne de commentaire comme un déclencheur", () => {
    // The reason scripts/ingest/workflow.test.ts strips comments first: a workflow that
    // *explains* why it does not run something must not be read as running it.
    const commented = [
      {
        file: "porte.yml",
        text: 'on:\n  schedule:\n    - cron: "29 7 * * *"\njobs:\n  p:\n    steps:\n      - run: echo rien\n',
      },
    ]
    const withComment = [{ ...commented[0], text: commented[0].text }]
    const verdicts = classifyArms([{ name: "eval", command: "tsx scripts/eval/run.ts" }], withComment, {})
    expect(verdicts[0].state).toBe("muet")
  })
})

describe("la règle, jouée sur ce dépôt-ci", () => {
  it("ne laisse aucun script de package.json sans déclencheur ni raison écrite", () => {
    const verdicts = armsOfTheGate()
    const silent = verdicts.filter((v) => v.state === "muet")
    expect(
      silent.map((v) => v.name),
      "un bras de porte existe sans être planifié : le planifier dans .github/workflows/, " +
        "ou écrire dans scripts/porte/cadence.json pourquoi il n'a pas de cadence",
    ).toEqual([])
  })

  it("ne garde aucune raison écrite pour un script disparu", () => {
    const orphans = armsOfTheGate().filter((v) => v.state === "orphelin")
    expect(orphans.map((v) => v.name)).toEqual([])
  })

  it("n'excuse aucun script qui est par ailleurs planifié", () => {
    const both = armsOfTheGate().filter((v) => v.state === "contradictoire")
    expect(both.map((v) => v.name)).toEqual([])
  })

  it("planifie les trois bras que #71 nomme", () => {
    const verdicts = armsOfTheGate()
    for (const arm of ["eval", "eval:anon", "verify:mcp"]) {
      expect(verdicts.find((v) => v.name === arm)?.state, `${arm} n'est pas planifié`).toBe("planifie")
    }
  })

  it("lit au moins un workflow qui porte une cadence", () => {
    // If the workflows directory were renamed or emptied, every arm would read as unscheduled
    // and the test above would go red for the right reason — but this one names the cause.
    expect(readWorkflows().some((w) => hasCadence(w.text))).toBe(true)
    expect(readScripts().length).toBeGreaterThan(0)
    expect(Object.keys(readExcuses()).length).toBeGreaterThan(0)
  })
})
