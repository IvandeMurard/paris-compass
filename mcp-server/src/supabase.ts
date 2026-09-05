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

// Le projet public de Compass, écrit ici — délibérément, depuis le 2 septembre 2026, quand ce
// serveur est devenu un paquet npm (#35).
//
// **Ces deux valeurs ne sont pas des secrets, et ne peuvent pas l'être** : le navigateur de
// chaque visiteur du site les porte déjà, et le rôle `anon` est en lecture seule sous RLS — ce
// que l'invariant I11 vérifie à chaque passage de `eval`. Les écrire ici est ce qui permet à un
// agent extérieur — une collectivité, une CCI — de brancher le serveur sans connaître la
// configuration d'un dépôt qu'il n'a pas lu. Les exiger de lui rendrait le « Fait quand » de
// #35 littéralement irréalisable : il n'a aucun moyen de les obtenir.
//
// L'environnement prime, et c'est ce qui garde le paquet réutilisable : un dépôt dérivé
// (`w7-kit`) pointe son propre projet sans republier, et `verify.ts` s'en sert pour jouer
// « base injoignable » sans toucher au vrai.
const PUBLIC_PROJECT_URL = "https://dbefhvmyfmmhjeetdddu.supabase.co"
const PUBLIC_ANON_KEY = "sb_publishable_Bi93N6usVvRbJrVYb-45dw_jR4xsKOD"

const url = process.env.SUPABASE_URL || PUBLIC_PROJECT_URL
const anonKey = process.env.SUPABASE_ANON_KEY || PUBLIC_ANON_KEY

if (!url || !anonKey) {
  // Atteignable seulement si quelqu'un a vidé les constantes ci-dessus en publiant.
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY resolved to nothing. The published package carries the " +
      "public project's values; set both in the environment to point at another one.",
  )
}

/**
 * Hors mesure — w1-observabilite (#72).
 *
 * `verify:mcp` appelle les vrais outils contre la vraie base avec la vraie clé publiable : ses
 * quarante et un contrôles COMMITENT, donc sans cet en-tête la porte se compterait elle-même
 * dans `question_tally` tous les matins, au même point et au même rayon. L'échappement est
 * déclaratif et volontaire, et c'est un réglage d'ENVIRONNEMENT et non un défaut : un agent qui
 * installe le paquet ne pose rien et est compté, ce qui est le but.
 */
const horsMesure = process.env.COMPASS_OBSERVABILITE === "off"

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false },
  ...(horsMesure ? { global: { headers: { "x-compass-observabilite": "off" } } } : {}),
})
