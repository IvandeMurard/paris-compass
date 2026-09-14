// Whether the workflows still agree on which Node they pin — and the fifth application of
// « énumérer, pas lister », after the npm scripts (arms.ts, #71), the ingestion sources
// (cadences.ts, #70), the catalogue (catalogue.ts, #73) and the PostgREST callers
// (observabilite.ts, #81).
//
// ── The incident, measured 14 September 2026 ──────────────────────────────────────────────
//
// `.github/workflows/pr.yml` pinned Node 20 while `porte.yml` and `ingestion.yml` pinned 22,
// and nothing compared the three. Since #157 a tested path builds a Supabase client,
// `realtime-js` wants a native WebSocket that Node 20 does not have, and
// `src/hooks/useAddressContext.test.ts` failed on EVERY proposal — 1 file out of 51, 676 tests
// green — while the morning gate, on 22, stayed green. **A green proposal therefore did not
// mean a green gate**, which is the one thing a proposal gate exists to mean.
//
// `pr.yml` was aligned on 22 in #170 (commit 8843cc8), and the comment posted there declared
// its own limit: « rien ne recoupe encore les trois fichiers entre eux ». This module is that
// recoupement.
//
// ── Why a comparison rather than a declared reference ─────────────────────────────────────
//
// The obvious shape is a number written down somewhere — « Node is 22 » — and every file
// checked against it. That shape rots the way #70's hand-written cadence rotted: the day Node
// 24 lands, three files move and the written number is wrong in silence, or it is right and
// three files are wrong, and either way somebody must remember a fourth place exists.
//
// So nothing is written down. The accord is DERIVED from the files themselves: the pins must
// be equal to one another. A deliberate upgrade touches the three workflows and this control
// stays green without being told; a file left behind is the only thing it reddens on. What the
// repository has to maintain is the agreement, not a copy of it.
//
// ── The population, and how it is read ────────────────────────────────────────────────────
//
// Every file in `.github/workflows/`, enumerated with `readdirSync` — the same reflex arms.ts
// and cadences.ts already have for the same directory, and the reason a workflow written
// tomorrow is in the population before anyone thinks to add it. Each is classified exactly
// once. Never a silence.
//
// Comment lines go first, for the reason arms.ts gives: a workflow that EXPLAINS a version it
// does not pin must not be read as pinning it. That is not hypothetical here — pr.yml's
// setup-node step carries six comment lines about Node 20 sitting directly above the pin that
// says 22, and a naive read of that file finds both numbers.
//
// ── What this does NOT catch, and the limits are sharp ────────────────────────────────────
//
//   - It compares the PINS TO EACH OTHER, never to what a runner actually installs. Three
//     files agreeing on "22" agree on a string; `actions/setup-node` resolves it to whatever
//     22.x it finds that morning, and a defect living in one patch release is invisible here.
//   - It knows nothing of what any dependency's `engines` field REQUIRES. That is not a small
//     omission: `jsdom`'s `engines` is what surfaced this problem a first time. A repository
//     whose three workflows agree on a Node that every dependency refuses is green here and
//     red everywhere else. Reading `engines` across the tree is a different control, and it
//     would need the installed tree rather than the workflows.
//   - It does not read `.nvmrc`, `package.json#engines`, Dockerfiles, or a developer's local
//     Node. The gate that matters is CI, and CI is what is enumerated.
//   - `node-version-file:` is NOT understood as a pin. A workflow that switched to it would
//     carry no `node-version` and would classify `muet` — red. That is the safe direction and
//     it is deliberate: it forces the decision to be made by a person rather than inferred.
//   - A matrix pin (`node-version: ${{ matrix.node }}`) is read as the literal string, so it
//     diverges and reddens. Same reasoning: a matrix is a real change of shape.

import { readFileSync, readdirSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "../..")

/**
 * A workflow with its comment lines removed, and its carriage returns with them.
 *
 * Verbatim the reasoning of arms.ts: a file saved once with Windows endings leaves every line
 * ending in `\r`, anchored patterns stop matching, and nothing looks wrong. Half an hour on
 * 31 August 2026, written down in docs/REPRISE-PIEGES.md.
 *
 * Idempotent on purpose — `readWorkflows` strips once and `readPins` strips again, so a test
 * can hand either a raw fixture or an already-read workflow and get the same answer.
 */
export function structure(yaml: string): string {
  return yaml
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n")
}

export interface Workflow {
  /** File name inside `.github/workflows/`. The key everything else is written against. */
  file: string
  /** Its text, comment lines already stripped. */
  text: string
}

/** Every workflow file the directory carries, comment lines stripped, in a stable order. */
export function readWorkflows(dir = resolve(ROOT, ".github/workflows")): Workflow[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort()
    .map((file) => ({ file, text: structure(readFileSync(resolve(dir, file), "utf8")) }))
}

/**
 * One pin's value, cleaned of what YAML lets sit around it.
 *
 * A trailing `# …` is cut here rather than in `structure`, which only drops whole lines: a
 * full-line strip would have to decide what to do with `cron: "29 7 * * *"` and every other
 * value carrying a `#`, and cutting at the point of use is the narrower rule.
 */
function valeur(raw: string): string {
  return raw
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim()
}

/** Every Node version this workflow pins, in file order. Usually one; never assumed to be. */
export function readPins(text: string): string[] {
  return [...structure(text).matchAll(/^[ \t]*node-version:[ \t]*(.+)$/gm)]
    .map((m) => valeur(m[1]))
    .filter((v) => v !== "")
}

/**
 * True when this workflow runs Node at all.
 *
 * `actions/setup-node` is the strong signal and the interesting one — a setup-node step with
 * no `node-version` is exactly the silent case, the one that takes whatever the runner ships.
 * The package managers are the second: a workflow calling `npm ci` without setting Node up is
 * still running Node, and still on the runner's default.
 *
 * Bare `node` is deliberately NOT a signal. It is a common enough word in prose and in step
 * names that matching it would redden a workflow that merely mentions it, and a control that
 * reddens on a word is a control that gets loosened.
 */
export function usesNode(text: string): boolean {
  const body = structure(text)
  return /actions\/setup-node/.test(body) || /(?:^|[\s|&;"'(])(?:npm|npx|pnpm|yarn)(?:\.cmd)?\s/.test(body)
}

/**
 * A divergence somebody decided to keep, with everything needed to re-judge it later.
 *
 * Four fields and all four required, the shape avis.json settled on for security advisories:
 * a verdict without the condition that would cancel it is an opinion, and an opinion does not
 * get re-derived six months later. `leveeSi` is the field that makes the entry disposable —
 * it says what has to become true for the divergence to end, so a later session can check it
 * instead of inheriting it.
 */
export interface Divergence {
  /** The version this file is expected to pin. Checked against what it actually pins. */
  version: string
  /** Why this file must not follow the others. */
  raison: string
  /** When that was measured. A figure without its date is a figure nobody can re-derive. */
  date: string
  /** What would have to become true for the divergence to be lifted. */
  leveeSi: string
}

/** The declared divergences, keyed by workflow file name. */
export function readDivergences(
  path = resolve(ROOT, "scripts/porte/node.json"),
): Record<string, Divergence> {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    divergences?: Record<string, Divergence>
  }
  return parsed.divergences ?? {}
}

/** The fields a declaration is missing. An incomplete declaration excuses nothing. */
export function champsManquants(d: Divergence | undefined): string[] {
  if (!d) return ["version", "raison", "date", "leveeSi"]
  const manque: string[] = []
  for (const champ of ["version", "raison", "date", "leveeSi"] as const) {
    if (typeof d[champ] !== "string" || d[champ].trim() === "") manque.push(champ)
  }
  return manque
}

/**
 * The version the workflows agree on, or null when none of them pins anything.
 *
 * A declared divergence does not vote: a file excused from the accord must not be able to
 * define it. When every pinned file is declared — degenerate, and it would mean the accord has
 * been declared away entirely — the vote falls back to all pins rather than returning null,
 * because null would silently classify everything as agreeing and that is the one outcome a
 * check like this must never produce.
 *
 * The mode, not the first: with three files at 20, 22, 22 it names pr.yml as the outlier
 * rather than the other two. **What matters is that there is more than one value** — that is
 * the red. The mode only decides which file gets named in the message, and ties break on the
 * version string so that two runs of this module never disagree.
 */
export function accordDe(workflows: Workflow[], divergences: Record<string, Divergence>): string | null {
  const depouiller = (files: Workflow[]): Map<string, number> => {
    const votes = new Map<string, number>()
    for (const { text } of files) {
      for (const pin of readPins(text)) votes.set(pin, (votes.get(pin) ?? 0) + 1)
    }
    return votes
  }

  const eligibles = workflows.filter((w) => !divergences[w.file])
  let votes = depouiller(eligibles)
  if (votes.size === 0) votes = depouiller(workflows)
  if (votes.size === 0) return null
  return [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
}

export type PinState =
  | "accorde"
  | "excuse"
  | "sans-node"
  | "divergent"
  | "contradictoire"
  | "orphelin"
  | "muet"

export interface PinVerdict {
  file: string
  state: PinState
  /** The versions this file pins. Empty for a file that pins none, and for an orphaned entry. */
  pins: string[]
  detail: string
}

/**
 * Classifies every workflow, and reports the declarations that no longer name one.
 *
 * `orphelin` and `contradictoire` are the two directions a table of exemptions always forgets,
 * and arms.ts, catalogue.ts and observabilite.ts each learned them the same way. Here they are
 * sharper than usual, because a stale declaration about Node is worse than no declaration: it
 * asserts that a divergence was thought about, on a file where it no longer exists.
 */
export function classifyWorkflows(
  workflows: Workflow[],
  divergences: Record<string, Divergence>,
): PinVerdict[] {
  const accord = accordDe(workflows, divergences)

  const verdicts: PinVerdict[] = workflows.map(({ file, text }) => {
    const pins = readPins(text)
    const declaree = divergences[file]
    const base = { file, pins }

    if (pins.length === 0) {
      if (declaree) {
        return {
          ...base,
          state: "orphelin" as const,
          detail: "node.json déclare une divergence pour un workflow qui n'épingle plus aucune version de Node",
        }
      }
      if (usesNode(text)) {
        return {
          ...base,
          state: "muet" as const,
          detail:
            "joue Node sans épingler de version : il prend celle du coureur, qui change sans préavis et " +
            "que rien ici ne recoupe. Poser `node-version` dans son `actions/setup-node`.",
        }
      }
      return { ...base, state: "sans-node" as const, detail: "ne joue pas Node : rien à accorder" }
    }

    const distinctes = [...new Set(pins)]
    if (distinctes.length > 1) {
      return {
        ...base,
        state: "divergent" as const,
        detail: `épingle ${distinctes.length} versions de Node dans un même fichier : ${distinctes.join(", ")}`,
      }
    }
    const version = distinctes[0]

    if (declaree) {
      const manque = champsManquants(declaree)
      if (manque.length > 0) {
        return {
          ...base,
          state: "divergent" as const,
          detail:
            `node.json porte une déclaration incomplète — il manque ${manque.join(", ")}. ` +
            "Une déclaration sans raison, sans date ou sans condition de levée n'excuse rien.",
        }
      }
      if (declaree.version !== version) {
        return {
          ...base,
          state: "contradictoire" as const,
          detail:
            `node.json déclare une divergence sur « ${declaree.version} » quand le fichier épingle ` +
            `« ${version} » : l'un des deux est un reste.`,
        }
      }
      if (version === accord) {
        return {
          ...base,
          state: "contradictoire" as const,
          detail:
            `node.json déclare une divergence qui n'existe plus : le fichier épingle « ${version} », ` +
            "comme les autres. Retirer l'entrée.",
        }
      }
      return {
        ...base,
        state: "excuse" as const,
        detail: `${declaree.raison} (mesuré le ${declaree.date} ; levée si ${declaree.leveeSi})`,
      }
    }

    if (accord !== null && version !== accord) {
      return {
        ...base,
        state: "divergent" as const,
        detail:
          `épingle Node « ${version} » quand les autres workflows s'accordent sur « ${accord} ». ` +
          "Une proposition verte doit vouloir dire une porte verte : aligner l'épingle, ou écrire " +
          "la raison de la divergence dans scripts/porte/node.json.",
      }
    }

    return { ...base, state: "accorde" as const, detail: `épingle Node « ${version} », comme les autres` }
  })

  const connus = new Set(workflows.map((w) => w.file))
  for (const file of Object.keys(divergences)) {
    if (!connus.has(file)) {
      verdicts.push({
        file,
        state: "orphelin",
        pins: [],
        detail: "node.json déclare une divergence pour un workflow qui n'existe plus",
      })
    }
  }

  return verdicts
}

/** The states that leave nobody anything to do. Everything else is a red. */
export function estClasse(state: PinState): boolean {
  return state === "accorde" || state === "excuse" || state === "sans-node"
}

/** The one call a check needs: reads `.github/workflows/` and classifies it. */
export function epinglesDeNode(): PinVerdict[] {
  return classifyWorkflows(readWorkflows(), readDivergences())
}
