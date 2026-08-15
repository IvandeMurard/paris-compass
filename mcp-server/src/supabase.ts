// Supabase access for the MCP server.
//
// Deliberately the anon key, the same one the browser ships — never a service
// key. The agent is the second persona of PERIMETRE.md §1, not a privileged
// caller: "même noyau de calcul, même exigence de traçabilité". Everything
// this server can read is exactly what an anonymous visitor can read, which
// is also what eval's I11 verifies on every `compass_*` function.

import { existsSync } from "fs"
import { resolve } from "path"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const ENV_FILE = resolve(import.meta.dirname, "../.env")
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY are required (see mcp-server/.env.example). " +
      "Same project and same anon key as the app's VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.",
  )
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false },
})
