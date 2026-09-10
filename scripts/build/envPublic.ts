// What `.env` is allowed to contain, now that it is tracked in a public repository.
//
// The file went from ignored to tracked on 2 September 2026 because ignoring it did not make
// the two values secret — it only made the published build blind to them, and production
// rendered nothing at all (DIAGNOSTIC.md §32). The values are the project URL and the `anon`
// publishable key, both of which every visitor's browser already carries.
//
// The allowlist below is the rule that keeps the exception narrow. The pattern checks that
// follow are not redundant with it: they catch the case the allowlist cannot see, which is a
// real secret pasted into a key that *is* allowed — a service key dropped into
// VITE_SUPABASE_PUBLISHABLE_KEY reads as legitimate to a check that only looks at names.

export const ALLOWED_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  // Lovable regenerates `.env` and writes this third one. Allowed so a regeneration does not
  // turn the gate red, but not required: nothing in `src/` reads it (measured 2 September).
  "VITE_SUPABASE_PROJECT_ID",
] as const

export const REQUIRED_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const

/**
 * The Supabase project this repository targets, and the only one `.env` may name.
 *
 * Why a constant rather than a comment. The allowlist above already anticipates that Lovable
 * regenerates `.env` — it says so. What it cannot see is the regeneration pointing somewhere
 * ELSE: every key allowed, no secret pasted, shape perfect, wrong project. Measured on
 * 10 September 2026, commit `71e5bf0` pushed straight to `main` during the twenty minutes the
 * pull-request requirement was lifted so Lovable could catch up: `.env` came back naming
 * `nwnhhvogwrzstslxtxca`, with a different publishable key, and every existing check stayed
 * green.
 *
 * The consequence is not subtle — a build from that `.env` queries a project holding none of
 * the 63 migrations, none of the ingested sources. `docs/REPRISE.md` calls this the trap of the
 * three Supabase projects, and until now the repository only warned about it in prose.
 *
 * **What this does NOT catch.** It compares a string in a file, so it says nothing about which
 * project the *published bundle* actually carries — that is `npm.cmd run porte:publie`, and on
 * 8 September that arm was red for two days for exactly this reason while `.env` itself was
 * still correct. A right `.env` and a wrong deploy is a real state; this only removes one of
 * the two ways to get there.
 */
export const EXPECTED_PROJECT_REF = "dbefhvmyfmmhjeetdddu"

/**
 * The project ref a Supabase URL names, or null when the URL does not look like one.
 *
 * Deliberately tolerant of the shape: what matters is the twenty-character ref, not the rest of
 * the host, so a `.supabase.in` or a custom domain does not silently pass unread.
 */
export function projectRef(url: string): string | null {
  return /https:\/\/([a-z0-9]{20})\./.exec(url.trim())?.[1] ?? null
}

export interface Finding {
  key: string
  reason: string
}

/** Reads the dotenv shape only: `KEY=value`, `#` comments, blank lines. No interpolation. */
export function parseEnv(text: string): Map<string, string> {
  const entries = new Map<string, string>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === "" || line.startsWith("#")) continue
    const cut = line.indexOf("=")
    if (cut === -1) continue
    const key = line.slice(0, cut).trim()
    let value = line.slice(cut + 1).trim()
    if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'")) && value.endsWith(value[0])) {
      value = value.slice(1, -1)
    }
    entries.set(key, value)
  }
  return entries
}

/** A JWT carries its role in the payload. Reading it beats guessing from the prefix. */
function jwtRole(value: string): string | null {
  const parts = value.split(".")
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
    return typeof payload?.role === "string" ? payload.role : null
  } catch {
    // Not a JWT after all — say so rather than claim a role.
    return null
  }
}

export function inspectValue(key: string, value: string): Finding[] {
  const found: Finding[] = []

  if (value.includes("sb_secret_")) {
    found.push({ key, reason: "porte une clé secrète Supabase (`sb_secret_`)" })
  }
  if (/postgres(ql)?:\/\//i.test(value)) {
    found.push({ key, reason: "porte une chaîne de connexion à la base (`postgresql://`)" })
  }
  const role = jwtRole(value)
  if (role !== null && role !== "anon") {
    found.push({ key, reason: `porte un jeton dont le rôle est \`${role}\`, pas \`anon\`` })
  }
  if (role === null && value.includes("service_role")) {
    found.push({ key, reason: "mentionne `service_role`" })
  }

  if (key === "VITE_SUPABASE_URL" && value !== "" && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(value)) {
    found.push({ key, reason: "n'a pas la forme `https://<ref>.supabase.co`" })
  }
  if (key === "VITE_SUPABASE_PUBLISHABLE_KEY" && value !== "") {
    const publishable = value.startsWith("sb_publishable_") || role === "anon"
    if (!publishable) {
      found.push({ key, reason: "n'est ni une clé `sb_publishable_` ni un jeton de rôle `anon`" })
    }
  }

  return found
}

export interface Verdict {
  unknown: string[]
  missing: string[]
  secrets: Finding[]
}

export function inspect(text: string): Verdict {
  const entries = parseEnv(text)
  const unknown = [...entries.keys()].filter((key) => !ALLOWED_KEYS.includes(key as never))
  const missing = REQUIRED_KEYS.filter((key) => (entries.get(key) ?? "") === "")
  const secrets = [...entries].flatMap(([key, value]) => inspectValue(key, value))
  return { unknown, missing, secrets }
}

export function isClean(verdict: Verdict): boolean {
  return verdict.unknown.length === 0 && verdict.missing.length === 0 && verdict.secrets.length === 0
}
