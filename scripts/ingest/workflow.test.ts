// The ingestion workflow reads itself: its cron -> source lookup must stay aligned with its
// own `on.schedule` block.
//
// Why a test rather than trust: .github/workflows/ingestion.yml carries four schedules in one
// file, and a `case` translating them into dataset names. Changing an hour in `on.schedule`
// without changing the matching `case` arm produces a schedule the job does not recognise. The
// workflow does notice — it exits with an error — but **only on the day that cron fires**:
// twice a year for geography, once a quarter for BDCom. A load that fails to start for six
// months is exactly the silent breakage w0-cron exists to remove.
//
// Deliberately without a YAML library: the file is under our control, and adding a dependency
// to read four strings would be dear (CLAUDE.md — check advisories before adding one).

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

const WORKFLOW = resolve(import.meta.dirname, "../../.github/workflows/ingestion.yml")
const yaml = readFileSync(WORKFLOW, "utf8")

/**
 * The file without its comment lines.
 *
 * Needed, and found while writing this test: the workflow *explains* why it does not use
 * `pull_request_target`, and a naive search for that string found the explanation. A check that
 * mistakes a warning for the thing it warns against is a check that cries wolf — and one that
 * eventually gets disarmed.
 */
const structure = yaml
  .replace(/\r\n/g, "\n")
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n")

/** The `- cron: "..."` entries of the `on.schedule` block. */
function declaredCrons(): string[] {
  return [...structure.matchAll(/^\s*-\s*cron:\s*"([^"]+)"/gm)].map((m) => m[1])
}

/** The `"..." ) source=name` arms of the "Quelle source" step. */
function caseArms(): { cron: string; source: string }[] {
  return [...structure.matchAll(/^\s*"([^"]+)"\)\s*source=(\w+)\s*;;/gm)].map((m) => ({
    cron: m[1],
    source: m[2],
  }))
}

/** The options of `workflow_dispatch.inputs.source`. */
function dispatchOptions(): string[] {
  const block = /options:\s*\[([^\]]+)\]/.exec(structure)?.[1] ?? ""
  return block.split(",").map((s) => s.trim()).filter(Boolean)
}

describe("workflow d'ingestion", () => {
  it("déclare quatre planifications, une par cadence", () => {
    // Four sources, four rhythms. A single cadence would be wrong for at least three of them
    // — PLAN.md §2.2bis.
    expect(declaredCrons()).toHaveLength(4)
  })

  it("traduit chaque planification déclarée en un jeu", () => {
    const armed = new Set(caseArms().map((a) => a.cron))
    for (const cron of declaredCrons()) {
      expect(armed, `la planification « ${cron} » n'a pas de branche dans l'étape « Quelle source »`).toContain(cron)
    }
  })

  it("ne garde aucune branche orpheline", () => {
    // The other direction: an arm whose schedule has gone is dead code that gives the
    // impression a dataset is being refreshed.
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
    // Public repository: `pull_request_target` would run a workflow from any branch with
    // access to the secrets, including the privileged connection string.
    expect(structure).not.toMatch(/pull_request_target/)
    expect(structure).not.toMatch(/^\s*pull_request:/m)
  })

  it("sérialise les chargements et ne les interrompt pas", () => {
    // Two loaders writing at once tread on each other; and killing the running one rolls back
    // its transaction, losing the run instead of replacing it.
    expect(structure).toMatch(/group:\s*ingestion/)
    expect(structure).toMatch(/cancel-in-progress:\s*false/)
  })

  it("ne demande que la lecture du dépôt, et le droit d'ouvrir l'issue qui dit l'échec", () => {
    // `issues: write` arrived with #71 point 4 and is the only widening: the job still pushes
    // nothing. It is checked in both directions — the write it needs, and no `write-all`.
    expect(structure).toMatch(/permissions:\s*\n\s*contents:\s*read/)
    expect(structure).not.toMatch(/contents:\s*write/)
  })

  it("ne porte qu'un secret, et jamais la clé anon", () => {
    const secrets = [...structure.matchAll(/secrets\.(\w+)/g)].map((m) => m[1])
    expect(new Set(secrets)).toEqual(new Set(["DATABASE_URL"]))
    // The publishable key is public: it has no business here, least of all under a name that
    // would suggest it is enough to load with.
    expect(structure).not.toMatch(/ANON_KEY|PUBLISHABLE/)
  })

  it("relève la fraîcheur même quand le chargement a échoué", () => {
    // The reading matters most on failure: it shows last_success_at did not move.
    expect(structure).toMatch(/if:\s*always\(\)/)
  })

  it("signale un chargement en échec, et seulement quand la cadence était tenue", () => {
    // #71 point 4. Until 31 August 2026 this file carried no `if: failure()` at all: a load
    // that fell over was silent, and `run_by = 'schedule'` went on claiming the automation
    // worked while `ingested_at` aged. `github.event_name == 'schedule'` is the same
    // distinction recordRun makes — a run launched from the Actions tab has somebody watching.
    expect(structure, "aucun signal d'échec dans le workflow d'ingestion").toMatch(/if:\s*failure\(\)/)
    const signal = /if:\s*failure\(\)[\s\S]*$/.exec(structure)?.[0] ?? ""
    expect(signal).toMatch(/github\.event_name\s*==\s*'schedule'/)
    expect(signal).toMatch(/porte:signal/)
  })

  it("signale sur le même canal que la porte planifiée, jamais sur un canal à lui", () => {
    // Three protocols producing three report formats is three things to read, therefore zero
    // things read — #71 and #73. Same label, same three-block body, same one-open-issue rule.
    const signal = /if:\s*failure\(\)[\s\S]*$/.exec(structure)?.[0] ?? ""
    expect(signal).toMatch(/--label\s+porte-rouge/)
    expect(signal).toMatch(/porte:rapport/)
  })

  it("ne met aucun journal de chargeur dans le corps publié", () => {
    // The repository is public and the loaders print connectionTarget(). The body carries the
    // run's URL — the journal behind it is not public — and never the log itself.
    const signal = /if:\s*failure\(\)[\s\S]*$/.exec(structure)?.[0] ?? ""
    expect(signal).toMatch(/--echec-ingestion/)
    expect(signal).not.toMatch(/\.log/)
  })

  it("demande le droit d'ouvrir une issue, et rien de plus", () => {
    expect(structure).toMatch(/permissions:\s*\n\s*contents:\s*read\s*\n\s*issues:\s*write/)
    expect(structure).not.toMatch(/permissions:[\s\S]{0,120}write-all/)
  })

  it("rejoue la confirmation SIRENE après BDCom, sans quoi le cron quotidien détruit les corroborations", () => {
    // bodacc.ts rebuilds bodacc_announcement wholesale, which cascades to operator_confirmed.
    // Without this chain the daily cron would wipe, every night, the 3 147 `corrobore` levels
    // SIRENE establishes — and SIRENE only runs monthly.
    const arm = /bodacc\)([\s\S]*?);;/.exec(structure)?.[1] ?? ""
    const bodaccAt = arm.indexOf("ingest/bodacc.ts")
    const confirmAt = arm.indexOf("--confirm-only")
    expect(bodaccAt, "la branche bodacc ne lance pas bodacc.ts").toBeGreaterThan(-1)
    expect(confirmAt, "la branche bodacc n'enchaîne pas la confirmation SIRENE").toBeGreaterThan(-1)
    expect(confirmAt).toBeGreaterThan(bodaccAt)
  })

  it("rejoue la géographie après BDCom, jamais l'inverse", () => {
    // geography.ts attaches every premise to its quartier and street segment. Reloading the
    // census without replaying the attachment would leave new premises out of the per-quartier
    // aggregates — a silent loss.
    const arm = /bdcom\)([\s\S]*?);;/.exec(structure)?.[1] ?? ""
    const bdcomAt = arm.indexOf("ingest/bdcom.ts")
    const geoAt = arm.indexOf("ingest/geography.ts")
    expect(bdcomAt, "la branche bdcom ne lance pas bdcom.ts").toBeGreaterThan(-1)
    expect(geoAt, "la branche bdcom n'enchaîne pas geography.ts").toBeGreaterThan(-1)
    expect(geoAt).toBeGreaterThan(bdcomAt)
  })
})
