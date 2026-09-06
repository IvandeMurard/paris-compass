// Which files reach PostgREST, and whether each one declares the escapement — w1-observabilite-
// echappement (#81), and the fourth application of « énumérer, pas lister » after the npm
// scripts (arms.ts, #71), the ingestion sources (cadences.ts, #70) and the catalogue
// (catalogue.ts, #73).
//
// ── The hole this closes, and why #72 stopped one step short ──────────────────────────────
//
// #72 found the defect by provoking it: the gate was counting itself. Ten buckets on a product
// with no traffic, all at Châtelet — the neighbourhood a reader would have believed the most
// asked for, and the one nobody had asked for. `eval:anon` and `verify:mcp` go through
// PostgREST with the real publishable key, so their calls COMMIT and are indistinguishable
// from a visitor's.
//
// The escapement is declarative: the header `x-compass-observabilite: off`, or
// `COMPASS_OBSERVABILITE=off` in a child process's environment. And #72's report concluded
// that nothing could guard it: *un appel non journalisé ne laisse par définition aucune trace,
// donc aucun invariant ne peut voir cette absence.*
//
// That is exact AT EXECUTION, and that is where the reasoning stops too early. The absence of a
// WRITE is invisible; the absence of a DECLARATION is not. The file that calls PostgREST is on
// disk, and it either carries the escapement or it does not. So the population is derived from
// the repository and every member is classified exactly once — the escapement, or a written
// reason. Never a silence. A twelfth arm born tomorrow is unclassified, and `test` goes red.
//
// ── What the population is, and how it is read ────────────────────────────────────────────
//
// Every file the repository carries — `git ls-files --cached --others --exclude-standard`, so
// tracked files AND the file a session has just written but not yet added, while node_modules,
// `dist/` and `.build/` stay out because `.gitignore` already keeps them out. Two signals mark
// a file as reaching PostgREST, and both are the way this repository actually does it:
//
//   - it builds a Supabase client — `@supabase/supabase-js` imported AND `createClient` called;
//   - or it names `/rest/v1/`, the path PostgREST serves under.
//
// Comment lines are stripped first, for the reason arms.ts already gives about workflows: a
// file that EXPLAINS why `createClient(undefined, …)` used to throw must not be read as calling
// it. Two files in this repository do exactly that — `scripts/build/envGuard.ts` and
// `src/main.tsx` — and both were false positives before the stripping was added.
//
// ── What this does NOT catch, and the limit is sharp ──────────────────────────────────────
//
// The rule checks that a file DECLARES the escapement, never that it APPLIES it to every call.
// A file that posed the header on one client and not on a second would pass. A call emitted
// from outside the repository — a manual test, a `curl` — is seen by nothing. A caller reaching
// PostgREST through some third way, `postgrest-js` on its own or a path assembled by
// concatenation, is matched by neither signal. A gitignored file OUTSIDE the code directories
// named in `CODE_DIRS` is not read — see `repositoryFiles`, where the ignored sweep and the
// reason for its scope are written.
//
// ── Why `*.test.*` files are out of the population ────────────────────────────────────────
//
// Because they carry the rule's own fixtures. This module's test writes
// `"@supabase/supabase-js"` and `/rest/v1/` inside string literals to prove the detection
// works, and a population that read them would have counted the check as one of the things it
// checks — measured 6 September 2026, and it classified as « échappé » for the worst possible
// reason: the fixture that proves the header is recognised.
//
// The hole that opens, and it is closed rather than merely named: a vitest test that DID reach
// PostgREST would not be seen here. So `testsImportingClient` is the compensating net — an
// import is how a test would actually reach it, and a fixture is never an import. Today it
// returns nothing, and observabilite.test.ts asserts that it stays that way.

import { execFileSync } from "child_process"
import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

/** Only these are read: nothing else in the repository calls PostgREST from JavaScript. */
const SOURCE = /\.(?:ts|tsx|mjs|cjs|js|jsx)$/

/** A test plays the rule; it is not one of the things the rule is about. See the header. */
export const TEST = /\.test\.(?:ts|tsx|mjs|cjs|js|jsx)$/

/**
 * A file with its comment lines and block comments removed. What the runtime actually sees.
 *
 * Full-line `//` only, never a trailing one: `https://…` lives inside a string in half the
 * files here, and a naive strip would cut a URL in two. A trailing comment naming
 * `createClient` therefore still counts the file in — the safe direction, since it ends in a
 * red somebody reads rather than a silence nobody does.
 *
 * Carriage returns go first. A file saved once with Windows endings leaves every line ending
 * in `\r`, and anchored patterns stop matching without anything looking wrong — half an hour
 * on 31 August 2026, written down in docs/REPRISE-PIEGES.md.
 */
export function code(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n")
}

export type Acces = "client" | "rest"

export interface Appelant {
  /** Repository-relative path, forward slashes — the key everything else is written against. */
  path: string
  /** How it reaches PostgREST: it builds a client, or it names the REST path itself. */
  acces: Acces[]
  /** True when the file names the escapement, header or environment variable. */
  declare: boolean
}

/** True when this file text builds a Supabase client. */
export function buildsClient(body: string): boolean {
  return /@supabase\/supabase-js/.test(body) && /\bcreateClient\s*[<(]/.test(body)
}

/** True when this file text names PostgREST's own path. */
export function namesRestPath(body: string): boolean {
  return /\/rest\/v1\//.test(body)
}

/**
 * True when this file text declares the escapement.
 *
 * Both spellings count, and they are the two halves of one decision: a file that poses the
 * header itself, and a file that hands `COMPASS_OBSERVABILITE` to a child process which will
 * pose it — `mcp-server/src/verify.ts` does the second for the server it spawns.
 */
export function declaresEscapement(body: string): boolean {
  return /x-compass-observabilite|COMPASS_OBSERVABILITE/.test(body)
}

/**
 * The directories a session writes code in. The ignored sweep below is scoped to them.
 *
 * Naming them rather than sweeping the tree is what keeps `node_modules`, `dist/` and
 * `mcp-server/.build/` out — all three are ignored, all three are enormous, and none of them
 * is written by hand.
 */
const CODE_DIRS = ["scripts", "src", "mcp-server/src", "supabase/functions", "eval"]

/** Never read, whatever a pathspec drags in: these are produced, not written. */
const PRODUCED = /(?:^|\/)(?:node_modules|dist|\.build|\.temp)\//

function git(root: string, args: string[]): string[] {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && SOURCE.test(line) && !PRODUCED.test(line))
}

/**
 * Every file the repository carries, as paths relative to the root.
 *
 * `--others --exclude-standard` is what makes this see the file a session wrote five minutes
 * ago and has not staged. Walking the disk would have worked too and would have swept in
 * `node_modules` and every build output; asking git is asking the one authority that already
 * knows what belongs to this repository — the reflex scripts/build/envPublic.test.ts has.
 *
 * ── And the second call, which is the one that was missing ────────────────────────────────
 *
 * `--exclude-standard` honours `.gitignore`, and `.gitignore` line 94 ignores
 * `scripts/tmp-*.ts` — the session drafts, ignored since 5 September 2026 so that a `git add
 * -A` cannot carry them off. Measured 6 September 2026: the probe written for this ticket's
 * counter-test, which reaches PostgREST with the real publishable key and poses no escapement,
 * was INVISIBLE to this rule under that name and visible the moment it was renamed. A session
 * draft is the likeliest twelfth caller there is — it is exactly what this ticket's own probe
 * was — so the guard against one accident was quietly opening the door to another.
 *
 * So the ignored files that are PRESENT under the code directories are read too. Ignored means
 * « do not commit this », never « do not look at this »: a draft that pollutes `question_tally`
 * pollutes it whether or not git tracks it. The scope keeps the sweep to what a person writes.
 */
export function repositoryFiles(root = ROOT): string[] {
  const carried = git(root, ["ls-files", "--cached", "--others", "--exclude-standard"])
  const ignored = git(root, [
    "ls-files",
    "--others",
    "--ignored",
    "--exclude-standard",
    "--",
    ...CODE_DIRS,
  ])
  return [...new Set([...carried, ...ignored])]
}

/**
 * The test files that IMPORT a PostgREST client — the compensating net for excluding tests.
 *
 * An import is how a test would actually reach the base; a fixture written to exercise the
 * detection never is one. This is deliberately blunt: it names any test that pulls in
 * `@supabase/supabase-js` or the front's own client module, and a test that legitimately needed
 * one would have to be argued for rather than slipped in.
 */
export function testsImportingClient(root = ROOT, files = repositoryFiles(root)): string[] {
  const found: string[] = []
  for (const path of files) {
    if (!TEST.test(path)) continue
    let body: string
    try {
      body = code(readFileSync(resolve(root, path), "utf8"))
    } catch {
      continue
    }
    if (/^\s*import[^\n]*from\s*["'][^"']*(?:@supabase\/supabase-js|integrations\/supabase\/client)["']/m.test(body)) {
      found.push(path)
    }
  }
  return found
}

/** Reads the repository and keeps the files that reach PostgREST. */
export function readCallers(root = ROOT, files = repositoryFiles(root)): Appelant[] {
  const callers: Appelant[] = []
  for (const path of files) {
    if (TEST.test(path)) continue
    let body: string
    try {
      body = code(readFileSync(resolve(root, path), "utf8"))
    } catch {
      // Listed by git and gone from disk — a deletion mid-session. Not this rule's business.
      continue
    }
    const acces: Acces[] = []
    if (buildsClient(body)) acces.push("client")
    if (namesRestPath(body)) acces.push("rest")
    if (acces.length === 0) continue
    callers.push({ path, acces, declare: declaresEscapement(body) })
  }
  return callers
}

/** The written reasons for reaching PostgREST without the escapement, keyed by path. */
export function readReasons(
  path = resolve(ROOT, "scripts/porte/observabilite.json"),
): Record<string, string> {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    "sans-echappement"?: Record<string, string>
  }
  return parsed["sans-echappement"] ?? {}
}

export type CallerState = "echappe" | "excuse" | "muet" | "contradictoire" | "orphelin"

export interface CallerVerdict {
  path: string
  state: CallerState
  /** How the file reaches PostgREST. Empty for an orphaned entry: it reaches nothing. */
  acces: Acces[]
  /** The escapement it declares, or the written reason it does not. */
  detail: string
}

/**
 * Classifies every caller, and reports the reasons that no longer name one.
 *
 * `orphelin` is the direction a table of exemptions always forgets — a reason kept for a file
 * that has stopped calling PostgREST, or has gone, is prose claiming to cover something that
 * does not exist. `contradictoire` is the other: a file that both poses the escapement and
 * carries a written reason for not posing it means one of the two is a leftover, and guessing
 * which would be the check deciding on the author's behalf. arms.ts and catalogue.ts learned
 * both before this.
 */
export function classifyCallers(
  callers: Appelant[],
  reasons: Record<string, string>,
): CallerVerdict[] {
  const verdicts: CallerVerdict[] = callers.map((caller) => {
    const reason = reasons[caller.path]
    const base = { path: caller.path, acces: caller.acces }

    if (caller.declare && reason) {
      return {
        ...base,
        state: "contradictoire" as const,
        detail: `pose l'échappement et porte pourtant une raison de ne pas le poser : « ${reason} »`,
      }
    }
    if (caller.declare) {
      return {
        ...base,
        state: "echappe" as const,
        detail: "déclare `x-compass-observabilite` / `COMPASS_OBSERVABILITE`",
      }
    }
    if (reason && reason.trim() !== "") {
      return { ...base, state: "excuse" as const, detail: reason }
    }

    return {
      ...base,
      state: "muet" as const,
      detail:
        "atteint PostgREST sans déclarer l'échappement, et observabilite.json ne dit pas pourquoi. " +
        "Poser `x-compass-observabilite: off`, ou écrire dans `sans-echappement` la raison d'être compté.",
    }
  })

  const known = new Set(callers.map((c) => c.path))
  for (const path of Object.keys(reasons)) {
    if (!known.has(path)) {
      verdicts.push({
        path,
        state: "orphelin",
        acces: [],
        detail: "observabilite.json excuse un fichier qui n'atteint plus PostgREST, ou qui n'existe plus",
      })
    }
  }

  return verdicts
}

/** The states that leave nobody anything to do. Everything else is a red. */
export function estClasse(state: CallerState): boolean {
  return state === "echappe" || state === "excuse"
}

/** The one call a check, a report or the sabotage needs: reads the repository and classifies it. */
export function appelantsDePostgrest(): CallerVerdict[] {
  return classifyCallers(readCallers(), readReasons())
}
