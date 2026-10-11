// The control that fails when the workflows stop agreeing on their Node version — the hole
// #170 left open by name, closed 14 September 2026.
//
// Two halves, exactly as arms.test.ts, catalogue.test.ts and observabilite.test.ts have them.
// The first plays the rule against substituted inputs, which is where the sabotage lives: a
// file moved off the accord and the check must go red, the divergence declared and it must go
// green again. The second plays it against `.github/workflows/` as it stands, which is what
// will catch the fourth workflow somebody writes in three months — the case no fixture can
// anticipate, and the only one that actually matters.
//
// **Why this lives in `test` and not behind an npm script.** It is static and offline: it reads
// three files in the repository and compares strings. An arm would have to be scheduled and
// justified in scripts/porte/cadence.json, and it would report a divergence once a morning
// instead of before the merge that introduced it. The defect this exists against was a
// PROPOSAL going green while the gate was red — the check belongs where a proposal is judged.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import {
  accordDe,
  champsManquants,
  classifyWorkflows,
  epinglesDeNode,
  estClasse,
  readDivergences,
  readPins,
  readWorkflows,
  structure,
  usesNode,
  type Divergence,
  type Workflow,
} from "./node"

const ROOT = resolve(__dirname, "..", "..")

/** A setup-node step pinning `version`, written the way the three real workflows write it. */
const epingle = (version: string): string =>
  `jobs:\n  j:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: "${version}"\n          cache: npm\n      - run: npm ci\n`

const ACCORDES: Workflow[] = [
  { file: "ingestion.yml", text: epingle("22") },
  { file: "porte.yml", text: epingle("22") },
  { file: "pr.yml", text: epingle("22") },
]

/** The repository as it actually was before #170: pr.yml left behind on 20. */
const AVANT_170: Workflow[] = [
  { file: "ingestion.yml", text: epingle("22") },
  { file: "porte.yml", text: epingle("22") },
  { file: "pr.yml", text: epingle("20") },
]

const COMPLETE: Divergence = {
  version: "20",
  raison: "Une raison écrite, assez longue pour dire ce qui empêche ce fichier de suivre les autres.",
  date: "2026-09-14",
  leveeSi: "l'action tierce accepte la version commune",
}

describe("la règle, jouée sur des entrées substituées", () => {
  it("tient trois fichiers d'accord pour accordés", () => {
    const verdicts = classifyWorkflows(ACCORDES, {})
    expect(verdicts.map((v) => v.state)).toEqual(["accorde", "accorde", "accorde"])
    expect(verdicts.every((v) => estClasse(v.state))).toBe(true)
  })

  it("rougit sur l'incident réel : pr.yml en 20 quand les deux autres sont en 22 — le sabotage", () => {
    const verdicts = classifyWorkflows(AVANT_170, {})
    const pr = verdicts.find((v) => v.file === "pr.yml")
    expect(pr?.state).toBe("divergent")
    expect(pr?.detail).toContain("« 20 »")
    expect(pr?.detail).toContain("« 22 »")
    // And the two that agree are not dragged down with it: a check that reddened everything
    // would pass the assertion above and be worth nothing.
    expect(verdicts.filter((v) => v.state === "divergent")).toHaveLength(1)
  })

  it("revient au vert une fois l'épingle alignée", () => {
    // The counter-test, and the half a sabotage usually forgets.
    expect(classifyWorkflows(ACCORDES, {}).every((v) => estClasse(v.state))).toBe(true)
  })

  it("reste vert sur une divergence DÉCLARÉE, avec sa raison", () => {
    const verdicts = classifyWorkflows(AVANT_170, { "pr.yml": COMPLETE })
    const pr = verdicts.find((v) => v.file === "pr.yml")
    expect(pr?.state).toBe("excuse")
    expect(pr?.detail).toContain("2026-09-14")
    expect(verdicts.every((v) => estClasse(v.state))).toBe(true)
  })

  it("n'excuse rien sur une déclaration incomplète", () => {
    // A `{}` in node.json would otherwise be a silence with a key on it. Each of the four
    // fields is load-bearing: the version is what gets cross-checked against disk, the date is
    // what makes the reason re-derivable, and `leveeSi` is what makes the entry disposable.
    for (const champ of ["version", "raison", "date", "leveeSi"] as const) {
      const amputee = { ...COMPLETE, [champ]: "   " }
      const verdicts = classifyWorkflows(AVANT_170, { "pr.yml": amputee })
      const pr = verdicts.find((v) => v.file === "pr.yml")
      expect(pr?.state, `une déclaration sans ${champ} excuse encore`).toBe("divergent")
      expect(pr?.detail).toContain(champ)
    }
    expect(champsManquants(undefined)).toHaveLength(4)
  })

  it("rougit sur une déclaration qui ne nomme pas la version réellement épinglée", () => {
    // The stale half: the file moved to 21, the declaration still says 20. One of the two is a
    // leftover, and guessing which would be the check deciding on the author's behalf.
    const verdicts = classifyWorkflows(AVANT_170, { "pr.yml": { ...COMPLETE, version: "18" } })
    expect(verdicts.find((v) => v.file === "pr.yml")?.state).toBe("contradictoire")
  })

  it("rougit sur une divergence déclarée qui n'existe plus", () => {
    // The day somebody aligns pr.yml and forgets the entry, the prose claims a divergence the
    // repository no longer has. arms.ts, catalogue.ts and observabilite.ts all learned this.
    const verdicts = classifyWorkflows(ACCORDES, { "pr.yml": { ...COMPLETE, version: "22" } })
    expect(verdicts.find((v) => v.file === "pr.yml")?.state).toBe("contradictoire")
  })

  it("rougit sur une entrée orpheline — un workflow qui n'existe plus", () => {
    const verdicts = classifyWorkflows(ACCORDES, { "disparu.yml": COMPLETE })
    expect(verdicts.find((v) => v.file === "disparu.yml")?.state).toBe("orphelin")
  })

  it("rougit sur un workflow qui joue Node sans épingler de version", () => {
    // The divergence's quieter form: no pin at all, so the runner's default, which moves under
    // the repository without anybody choosing it.
    const muet: Workflow = { file: "neuf.yml", text: "jobs:\n  j:\n    steps:\n      - run: npm ci\n" }
    const verdicts = classifyWorkflows([...ACCORDES, muet], {})
    expect(verdicts.find((v) => v.file === "neuf.yml")?.state).toBe("muet")
  })

  it("ne réclame rien d'un workflow qui ne joue pas Node", () => {
    // The proportion that matters, and garde-fous.test.ts says why: a control that reddens on a
    // legitimate file gets removed whole, and the divergence comes back with it.
    const sansNode: Workflow = {
      file: "etiquettes.yml",
      text: "jobs:\n  j:\n    steps:\n      - uses: actions/labeler@v5\n",
    }
    const verdicts = classifyWorkflows([...ACCORDES, sansNode], {})
    expect(verdicts.find((v) => v.file === "etiquettes.yml")?.state).toBe("sans-node")
    expect(verdicts.every((v) => estClasse(v.state))).toBe(true)
  })

  it("rougit sur deux épingles différentes dans un même fichier", () => {
    const deuxJobs: Workflow = {
      file: "deux.yml",
      text: `${epingle("22")}${epingle("20")}`,
    }
    const verdicts = classifyWorkflows([...ACCORDES, deuxJobs], {})
    expect(verdicts.find((v) => v.file === "deux.yml")?.state).toBe("divergent")
  })
})

describe("la lecture d'une épingle, jouée sur des textes substitués", () => {
  it("lit une épingle citée, nue, ou suivie d'un commentaire", () => {
    expect(readPins('        node-version: "22"')).toEqual(["22"])
    expect(readPins("        node-version: 22")).toEqual(["22"])
    expect(readPins('        node-version: "22" # aligné le 14 septembre')).toEqual(["22"])
    expect(readPins("        node-version: '20.11.1'")).toEqual(["20.11.1"])
  })

  it("ne lit pas un commentaire comme une épingle", () => {
    // NOT hypothetical: pr.yml's setup-node step carries six comment lines about Node 20
    // directly above the pin that says 22, and a naive read of that file finds both numbers.
    // This is arms.ts's rule about workflow comments, one population over.
    const commente = '# node-version: "20" — ce qu\'on épinglait avant\n        node-version: "22"'
    expect(readPins(commente)).toEqual(["22"])
  })

  it("ne coupe pas un cron en croyant lire un commentaire", () => {
    // `structure` drops whole comment lines only; the trailing-`#` cut happens at the point of
    // use, so a value carrying a `#` elsewhere in the file is left alone.
    expect(structure('    - cron: "29 7 * * *"')).toContain("29 7 * * *")
  })

  it("ne prend pas node-version-file pour une épingle", () => {
    // Deliberate, and the safe direction: such a workflow pins nothing here and classifies
    // « muet ». The decision to follow a file gets made by a person, not inferred.
    expect(readPins("        node-version-file: .nvmrc")).toEqual([])
  })

  it("voit qu'un workflow joue Node, sans se déclencher sur le mot", () => {
    expect(usesNode("      - run: npm ci")).toBe(true)
    expect(usesNode("      - uses: actions/setup-node@v4")).toBe(true)
    expect(usesNode("      - run: npx tsx scripts/ingest/freshness.ts")).toBe(true)
    // `node` seul n'est pas un signal : un nom d'étape ou une phrase le porte trop souvent, et
    // un contrôle qui rougit sur un mot est un contrôle qu'on desserre.
    expect(usesNode("      - name: Un nœud de plus, node compris")).toBe(false)
  })
})

describe("l'accord, dérivé et jamais écrit", () => {
  it("dérive l'accord des fichiers eux-mêmes", () => {
    expect(accordDe(ACCORDES, {})).toBe("22")
    // And it follows a deliberate upgrade without being told — the whole reason no reference
    // version is written down anywhere.
    expect(accordDe(ACCORDES.map((w) => ({ ...w, text: epingle("24") })), {})).toBe("24")
  })

  it("ne laisse pas une divergence déclarée définir l'accord", () => {
    // pr.yml excused on 20 must not be able to drag the accord to 20 and turn the other two
    // into the outliers. That inversion is how an exemption table quietly rewrites the rule.
    expect(accordDe(AVANT_170, { "pr.yml": COMPLETE })).toBe("22")
  })

  it("nomme comme divergent le fichier minoritaire, pas les autres", () => {
    expect(accordDe(AVANT_170, {})).toBe("22")
  })
})

describe("la règle, jouée sur le dépôt tel qu'il est", () => {
  it("dérive la population de .github/workflows/, et elle n'est pas vide", () => {
    const files = readWorkflows().map((w) => w.file)
    // No expected count is asserted: the directory is meant to grow, and a count written here
    // would be the inventory this rule exists to replace. What is asserted is that the
    // enumeration answered and reaches the three files the incident was about.
    expect(files.length).toBeGreaterThanOrEqual(3)
    expect(files).toContain("ingestion.yml")
    expect(files).toContain("porte.yml")
    expect(files).toContain("pr.yml")
  })

  it("classe chaque workflow exactement une fois — jamais un silence", () => {
    const verdicts = epinglesDeNode()
    const rouges = verdicts.filter((v) => !estClasse(v.state))
    expect(
      rouges.map((v) => `${v.state} — ${v.file} : ${v.detail}`),
      "un workflow ne s'accorde pas avec les autres sur sa version de Node, et node.json ne dit pas pourquoi",
    ).toEqual([])
  })

  it("les trois workflows de l'incident restent classés, et l'accord tient", () => {
    // Named rather than left to the rule above, because these three are the fix of #170 and
    // this is its non-regression: whatever else the directory grows, these must never be the
    // silent ones.
    //
    // `estClasse` and not `accorde`, and the distinction was PAID: the first version of this
    // test demanded `accorde` for the three, which made a legitimately declared divergence on
    // pr.yml fail the suite — measured while playing the second counter-proof, 14 September
    // 2026. That would have been this file contradicting node.json, and a control that forbids
    // the escape hatch it advertises is a control somebody deletes.
    const verdicts = epinglesDeNode()
    for (const file of ["ingestion.yml", "porte.yml", "pr.yml"]) {
      const v = verdicts.find((w) => w.file === file)
      expect(v && estClasse(v.state), `${file} : ${v?.state} — ${v?.detail}`).toBe(true)
    }
    // The version itself is asserted ONCE and only as a dated measurement — 14 September 2026,
    // Node 22, after #170. A deliberate upgrade is expected to change this line WITH the
    // workflows; what must never change without them is the agreement above.
    expect(accordDe(readWorkflows(), readDivergences())).toBe("22")
  })

  it("n'accepte aucune raison vague dans node.json", () => {
    for (const [file, d] of Object.entries(readDivergences())) {
      expect(champsManquants(d), `déclaration incomplète pour ${file}`).toEqual([])
      expect(d.raison.trim().length, `raison trop courte pour ${file}`).toBeGreaterThan(80)
      expect(d.date, `date non datable pour ${file}`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("porte sa propre limite par écrit, et nomme engines", () => {
    // CLAUDE.md: dire ce que la règle ne rattrape pas — elle en a toujours une. Celle-ci
    // compare les épingles ENTRE ELLES, jamais à ce qu'un coureur installe ni à ce que le champ
    // `engines` d'une dépendance exige, et c'est pourtant `engines` de jsdom qui avait révélé
    // le problème une première fois. Une limite écrite dans un commentaire qu'on peut effacer
    // sans que rien ne bouge n'est pas écrite.
    const regle = readFileSync(resolve(ROOT, "scripts/porte/node.ts"), "utf8")
    expect(regle).toMatch(/engines/)
    expect(regle).toMatch(/14 September 2026/)
    const declare = readFileSync(resolve(ROOT, "scripts/porte/node.json"), "utf8")
    expect(declare).toMatch(/engines/)
  })
})
