// The scheduled gate reads itself — w1-porte-planifiee (#71).
//
// The sibling of scripts/ingest/workflow.test.ts, and for the same reason: this workflow fires
// once a day, so a mistake in it is discovered by the day not happening. Same choice of no YAML
// library, same stripping of comment lines first — a file that *explains* why it does not do
// something must not be read as doing it.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

const WORKFLOW = resolve(import.meta.dirname, "../../.github/workflows/porte.yml")
const yaml = readFileSync(WORKFLOW, "utf8")

const structure = yaml
  .replace(/\r\n/g, "\n")
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n")

describe("workflow de la porte", () => {
  it("porte une cadence, et pas seulement un bouton", () => {
    // The whole ticket: `eval`, `eval:anon` and `verify:mcp` all waited for a hand.
    expect(structure).toMatch(/^\s*schedule:/m)
    expect(structure).toMatch(/^\s*-\s*cron:\s*"[^"]+"/m)
  })

  it("joue les trois bras que le ticket nomme", () => {
    for (const arm of ["eval", "eval:anon", "verify:mcp"]) {
      expect(structure, `${arm} n'est pas joué`).toMatch(new RegExp(`npm run ${arm.replace(":", ":")}(?![\\w:.-])`))
    }
  })

  it("garde le code de sortie numérique de chaque bras", () => {
    // `continue-on-error` would flatten 3 into "failed", and 3 is the only thing standing
    // between this alert and crying on an upstream outage.
    expect(structure).not.toMatch(/continue-on-error/)
    expect(structure).toMatch(/&&\s*code=0\s*\|\|\s*code=\$\?/)
  })

  it("ne juge jamais une base en cours de chargement", () => {
    // Shared with ingestion.yml, and never cancelling: a baseline read while BODACC is being
    // rebuilt is a red nobody owns, and that is how an alert gets muted.
    expect(structure).toMatch(/group:\s*ingestion/)
    expect(structure).toMatch(/cancel-in-progress:\s*false/)
  })

  it("n'ouvre une issue que sur une décision requise, et que sur une cadence tenue", () => {
    const signal = /name:\s*Signaler[\s\S]*$/.exec(structure)?.[0] ?? ""
    expect(signal).toMatch(/steps\.rapport\.outputs\.decision\s*==\s*'true'/)
    expect(signal).toMatch(/github\.event_name\s*==\s*'schedule'/)
    expect(signal).toMatch(/--label\s+porte-rouge/)
  })

  it("ne s'expose à aucun déclencheur qui exécuterait du code externe", () => {
    // Public repository, and this job holds the privileged connection string.
    expect(structure).not.toMatch(/pull_request_target/)
    expect(structure).not.toMatch(/^\s*pull_request:/m)
  })

  it("ne demande que la lecture du dépôt et l'ouverture d'une issue", () => {
    expect(structure).toMatch(/permissions:\s*\n\s*contents:\s*read\s*\n\s*issues:\s*write/)
    expect(structure).not.toMatch(/contents:\s*write/)
  })

  it("ne donne la chaîne privilégiée qu'au bras qui en a besoin", () => {
    // `eval` is the only arm holding DATABASE_URL. `eval:anon` deliberately holds none: it
    // exercises exactly what a visitor without a key reaches.
    const evalStep = /name:\s*eval\n[\s\S]*?(?=\n      - name:)/.exec(structure)?.[0] ?? ""
    expect(evalStep).toMatch(/DATABASE_URL/)
    const anonStep = /name:\s*eval:anon\n[\s\S]*?(?=\n      - name:)/.exec(structure)?.[0] ?? ""
    expect(anonStep).not.toMatch(/DATABASE_URL/)
    expect(anonStep).toMatch(/VITE_SUPABASE_PUBLISHABLE_KEY/)
  })

  it("s'arrête sur un secret absent au lieu de rendre trois bras rouges", () => {
    // Measured 31 August 2026: the repository carried DATABASE_URL and nothing else. A missing
    // secret is a configuration defect this repository owns — it must be named as such, once,
    // and not arrive as three arms failing for one cause.
    const preflight = /name:\s*Les secrets sont là[\s\S]*?(?=\n      - )/.exec(structure)?.[0] ?? ""
    for (const secret of ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"]) {
      expect(preflight, `${secret} n'est pas vérifié avant de jouer les bras`).toContain(secret)
    }
    expect(preflight).toMatch(/exit 1/)
  })

  it("porte la mesure qui justifie sa cadence, avec sa date", () => {
    // CLAUDE.md: un chiffre mesuré porte sa date. A cadence justified by a figure whose date
    // is missing is a cadence nobody can re-derive — and #69 is exactly what happens then.
    expect(yaml).toMatch(/31 August 2026/)
    expect(yaml).toMatch(/306 s/)
  })
})
