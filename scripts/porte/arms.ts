// Which arms of the gate are actually triggered by something — w1-porte-planifiee (#71),
// point 3, and it is what makes the rest of this ticket durable.
//
// The hole this closes is #70's, one level up. `w0-cron` gave a cadence to the four sources
// that existed on 25 August; the four that arrived afterwards never registered, because a
// cadence laid down by hand on the datasets of a given day is an inventory, and an inventory
// does not update itself. The gate can rot the same way: six arms in six months, one of them
// played by nobody, and nothing says so.
//
// So the population is ENUMERATED, never listed. Every npm script in package.json is an arm
// candidate, and each must be classified exactly once — either some scheduled workflow invokes
// it, or `scripts/porte/cadence.json` carries a written reason why it has no trigger. Never a
// silence. A ninth script born tomorrow is unclassified, and the check goes red.
//
// Deliberately without a YAML parser, for the reason scripts/ingest/workflow.test.ts already
// gives: the workflows are under our control, and adding a dependency to read a handful of
// strings would be dear. Comment lines are stripped first — a workflow that *explains* why it
// does not run something must not be read as running it.

import { readFileSync, readdirSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

export interface NpmScript {
  name: string
  command: string
}

/** Every script package.json declares, in declaration order. */
export function readScripts(path = resolve(ROOT, "package.json")): NpmScript[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { scripts?: Record<string, string> }
  return Object.entries(parsed.scripts ?? {}).map(([name, command]) => ({ name, command }))
}

/** The written reasons for having no trigger, keyed by script name. */
export function readExcuses(path = resolve(ROOT, "scripts/porte/cadence.json")): Record<string, string> {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { unscheduled?: Record<string, string> }
  return parsed.unscheduled ?? {}
}

/**
 * A workflow file with its comment lines removed.
 *
 * The carriage returns go too. A file saved once with Windows endings leaves every line ending
 * in `\r`, and the anchored patterns below stop matching without anything looking wrong — a
 * check that silently stops checking is the failure this module exists against. It cost half
 * an hour on 31 August 2026.
 */
function structure(yaml: string): string {
  return yaml
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n")
}

/** True when a workflow carries an `on.schedule` block, comment lines excluded. */
export function hasCadence(text: string): boolean {
  const body = structure(text)
  return /^\s*schedule:/m.test(body) && /^\s*-\s*cron:/m.test(body)
}

/**
 * Every workflow file, comment lines stripped. `classifyArms` keeps the ones with a cadence.
 *
 * Reading them all rather than filtering here is deliberate: the rule about what counts as a
 * trigger then lives in one place, and a caller cannot hand `classifyArms` a button-only
 * workflow and have it pass for a cadence — which is what the sabotage of #71 tries.
 */
export function readWorkflows(dir = resolve(ROOT, ".github/workflows")): { file: string; text: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((file) => ({ file, text: readFileSync(resolve(dir, file), "utf8") }))
    .map(({ file, text }) => ({ file, text: structure(text) }))
}

/**
 * The `scripts/….ts|mjs|js` files a command runs, so a workflow calling one directly counts.
 *
 * ingestion.yml plays `npx tsx scripts/ingest/freshness.ts` rather than `npm run freshness`,
 * and matching only on `npm run` would have declared that arm unscheduled while it runs every
 * night.
 *
 * The limit, and it is real: two scripts pointing at the same file cannot be told apart here.
 * `verify:mcp` and `smoke:mcp` both run `scripts/verify-mcp.mjs`, so a workflow naming that
 * path would vouch for both — and only one of them decides anything. Today neither workflow
 * names it, both go through `npm run`, and the distinction holds; if that changes, this is
 * where it breaks.
 */
export function targetsOf(command: string): string[] {
  return [...command.matchAll(/\bscripts\/[\w./-]+\.(?:ts|mjs|js)\b/g)].map((m) => m[0])
}

/** npm's own `pre`/`post` hooks: they fire with the script they wrap, so they inherit its fate. */
function wrapped(name: string): string | null {
  const hook = /^(pre|post)(.+)$/.exec(name)
  return hook ? hook[2] : null
}

function invokedByName(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`npm(?:\\.cmd)?\\s+run(?:-script)?\\s+${escaped}(?![\\w:.-])`).test(text)
}

export type ArmState = "planifie" | "excuse" | "muet" | "contradictoire" | "orphelin"

export interface ArmVerdict {
  name: string
  state: ArmState
  /** Which scheduled workflow triggers it, or the written reason it has none. */
  detail: string
}

/**
 * Classifies every script, and reports the excuses that no longer name anything.
 *
 * `orphelin` is the other direction, and it is the half a check like this usually forgets: a
 * reason left behind for a script that has gone is prose claiming to cover something that does
 * not exist, and it is how a table of exemptions quietly stops describing the repository.
 * scripts/ingest/workflow.test.ts learned the same lesson about orphaned `case` arms.
 */
export function classifyArms(
  scripts: NpmScript[],
  workflows: { file: string; text: string }[],
  excuses: Record<string, string>,
): ArmVerdict[] {
  const triggeredBy = (script: NpmScript): string | null => {
    for (const { file, text } of workflows) {
      // A workflow reachable only by `workflow_dispatch` is a button, and a button is exactly
      // what this ticket exists to stop relying on. Asked here rather than only at the reading
      // edge, so the rule holds whoever calls it — including the sabotage.
      if (!hasCadence(text)) continue
      if (invokedByName(text, script.name)) return file
      if (targetsOf(script.command).some((t) => text.includes(t))) return file
      const host = wrapped(script.name)
      if (host && invokedByName(text, host)) return `${file} (via npm run ${host})`
    }
    return null
  }

  const verdicts: ArmVerdict[] = scripts.map((script) => {
    const trigger = triggeredBy(script)
    const excuse = excuses[script.name]
    if (trigger && excuse) {
      return {
        name: script.name,
        state: "contradictoire",
        detail: `planifié par ${trigger} et pourtant excusé : « ${excuse} »`,
      }
    }
    if (trigger) return { name: script.name, state: "planifie", detail: trigger }
    if (excuse && excuse.trim() !== "") return { name: script.name, state: "excuse", detail: excuse }
    return {
      name: script.name,
      state: "muet",
      detail:
        "aucun workflow planifié ne le joue, et cadence.json ne dit pas pourquoi. " +
        "Le planifier, ou écrire la raison de ne pas le faire.",
    }
  })

  const declared = new Set(scripts.map((s) => s.name))
  for (const name of Object.keys(excuses)) {
    if (!declared.has(name)) {
      verdicts.push({
        name,
        state: "orphelin",
        detail: "cadence.json excuse un script que package.json ne déclare plus",
      })
    }
  }

  return verdicts
}

/** The one call a check or a report needs: reads the repository and classifies it. */
export function armsOfTheGate(): ArmVerdict[] {
  return classifyArms(readScripts(), readWorkflows(), readExcuses())
}
