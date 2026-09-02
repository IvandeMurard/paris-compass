// The gate that makes the `.gitignore` exception hold without anyone remembering it.
//
// Two questions from the common prompt, answered here rather than in a commit message:
//
//   1. Does it survive a reload? Yes — the file is read from disk on every `npm.cmd run test`,
//      so a secret written into it later turns the gate red, and so does the file being
//      deleted or ignored again. Nothing depends on whoever edits it next being careful.
//   2. Does it protect a consumer that does not exist yet? It protects the repository, which
//      is public — the consumer being every reader of it, including ones who arrive by search.
//
// What it does NOT catch, stated because every rule has an edge: a secret pushed in some other
// file, and a secret that lived in `.env` for one commit and was removed in the next. Git keeps
// the first version. The rule stops the habit, not the accident already committed.

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { inspect, inspectValue, isClean, parseEnv } from "./envPublic"

const ROOT = resolve(__dirname, "..", "..")
const ENV_PATH = resolve(ROOT, ".env")

function git(...args: string[]): { ok: boolean; out: string } {
  try {
    return { ok: true, out: execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim() }
  } catch (error) {
    const out = (error as { stdout?: string }).stdout ?? ""
    return { ok: false, out: out.trim() }
  }
}

describe("`.env` est la configuration publique du front, et rien d'autre", () => {
  it("est présent et suivi par git", () => {
    // Its absence is exactly the defect of 2 September: the published build had no values and
    // rendered nothing. An untracked `.env` reproduces it in silence.
    expect(git("ls-files", "--error-unmatch", ".env").ok).toBe(true)
  })

  it("n'est pas réignoré par `.gitignore`", () => {
    // `git check-ignore` exits 1 when the path is not ignored — that is the passing case.
    expect(git("check-ignore", "-q", ".env").ok).toBe(false)
  })

  it("ne porte que des clés autorisées, toutes les requises, et aucun secret", () => {
    const verdict = inspect(readFileSync(ENV_PATH, "utf8"))
    // Named in the failure so the message says which key, not just « rouge ».
    expect(verdict.unknown).toEqual([])
    expect(verdict.missing).toEqual([])
    expect(verdict.secrets.map((f) => `${f.key} ${f.reason}`)).toEqual([])
    expect(isClean(verdict)).toBe(true)
  })

  it("n'a pas désignoré les `.env` du reste de l'arbre", () => {
    // Measured 2 September 2026, and the reason `!/.env` is anchored: removing the bare `.env`
    // line un-ignored every `.env` in the tree, and the first `git add -A` staged
    // `mcp-server/.env`. It held only a URL and an anonymous key that day — the anchor is what
    // makes the next time a fact about the rule rather than about luck.
    expect(git("check-ignore", "-q", "mcp-server/.env").ok).toBe(true)
    expect(git("ls-files", "*.env").out.split("\n").filter(Boolean)).toEqual([".env"])
  })

  it("garde `.env.local` hors du dépôt", () => {
    // The file that does hold a secret — DATABASE_URL, password included. The exception above
    // must not have widened to it.
    expect(git("check-ignore", "-q", ".env.local").ok).toBe(true)
    expect(git("ls-files", "--error-unmatch", ".env.local").ok).toBe(false)
  })
})

describe("ce que la règle refuse", () => {
  it("refuse une clé qui n'est pas de la liste", () => {
    expect(inspect("DATABASE_URL=postgresql://x\n").unknown).toEqual(["DATABASE_URL"])
  })

  it("refuse une clé secrète Supabase, même sous un nom autorisé", () => {
    const found = inspectValue("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_secret_abcdef")
    expect(found.map((f) => f.reason)).toContain("porte une clé secrète Supabase (`sb_secret_`)")
  })

  it("refuse une chaîne de connexion", () => {
    const found = inspectValue("VITE_SUPABASE_URL", "postgresql://postgres:s3cr3t@host:5432/postgres")
    expect(found.length).toBeGreaterThan(0)
  })

  it("lit le rôle dans le jeton plutôt que de le deviner au préfixe", () => {
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")
    const jwt = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`
    const found = inspectValue("VITE_SUPABASE_PUBLISHABLE_KEY", jwt)
    expect(found.map((f) => f.reason)).toContain("porte un jeton dont le rôle est `service_role`, pas `anon`")
  })

  it("accepte un jeton de rôle `anon`, au cas où Lovable régénère à l'ancien format", () => {
    const payload = Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")
    expect(inspectValue("VITE_SUPABASE_PUBLISHABLE_KEY", `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`)).toEqual([])
  })

  it("refuse une URL qui n'est pas celle d'un projet Supabase", () => {
    expect(inspectValue("VITE_SUPABASE_URL", "https://exemple.test")).toHaveLength(1)
    expect(inspectValue("VITE_SUPABASE_URL", "https://dbefhvmyfmmhjeetdddu.supabase.co")).toEqual([])
  })

  it("dit qu'une valeur requise manque plutôt que de la traiter comme absente sans suite", () => {
    expect(inspect("VITE_SUPABASE_URL=\n").missing).toContain("VITE_SUPABASE_URL")
  })
})

describe("lecture du format dotenv", () => {
  it("ignore commentaires et lignes vides, et déshabille les guillemets", () => {
    const entries = parseEnv('# commentaire\n\nVITE_SUPABASE_URL="https://a.supabase.co"\n')
    expect(entries.get("VITE_SUPABASE_URL")).toBe("https://a.supabase.co")
    expect(entries.size).toBe(1)
  })

  it("garde le `=` interne d'une valeur", () => {
    expect(parseEnv("VITE_SUPABASE_PROJECT_ID=a=b\n").get("VITE_SUPABASE_PROJECT_ID")).toBe("a=b")
  })
})
