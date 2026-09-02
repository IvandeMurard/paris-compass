// Runs before `vite build` (prebuild hook). Fails the build when the published bundle would
// be born without its Supabase configuration.
//
// **Why it exists.** On 2 September 2026 the published bundle contained `const zL=void 0,ob=void 0`
// where the URL and the publishable key should have been: `.env` was ignored, so the build that
// runs from the repository saw nothing, and `createClient(undefined, …)` threw at module
// evaluation — before any render. The page was blank, with no message anywhere. A build that
// cannot work should stop, not ship.
//
// **Why here and not in `vite.config.ts`.** That file is edited by Lovable and any change made
// there is reverted — the same reason `vitest.config.ts` and `vite.config.local.ts` exist as
// separate files. The `prebuild` hook is ours.
//
// **What it does not catch,** and this is the real limit: a builder invoking `vite build`
// directly skips npm's hooks entirely. If Lovable ever publishes that way, this guard never
// runs — which is why the second line of defence is `src/main.tsx`, inside the bundle itself,
// where no build path can bypass it.
//
// `build:dev` was named in that paragraph until 2 September 2026, wrongly: npm does honour a
// `prebuild:dev` hook — measured, not assumed — and the script now carries one. A limit written
// from memory is how a hole gets left open on purpose.

import { loadEnv } from "vite"

import { REQUIRED_KEYS } from "./envPublic"

// `vite build` defaults to production; `--mode x` is passed through as the first argument.
const mode = process.argv[2] ?? "production"

// The same call Vite makes: `.env` files for this mode, plus VITE_-prefixed process.env.
// Asking the question any other way would answer about a different environment than the build's.
const env = loadEnv(mode, process.cwd(), "VITE_")

const missing = REQUIRED_KEYS.filter((key) => (env[key] ?? "") === "")

if (missing.length > 0) {
  console.error(`\nBuild interrompu — configuration du front absente en mode « ${mode} ».\n`)
  for (const key of missing) {
    console.error(`  manquante : ${key}`)
  }
  console.error(
    "\nCes valeurs sont figées dans le bundle au build. Sans elles, `createClient` lève à" +
      "\nl'évaluation du module et la page publiée reste blanche, sans message.\n" +
      "\nElles vivent dans `.env`, qui est suivi par git — ce n'est pas un secret, c'est l'URL du" +
      "\nprojet et la clé publiable du rôle `anon`. Si le fichier manque, le récupérer depuis" +
      "\nl'espace de travail Lovable ou depuis `.env.local`. Voir DIAGNOSTIC.md §32.\n",
  )
  process.exit(1)
}

console.log(`Configuration du front présente en mode « ${mode} » : ${REQUIRED_KEYS.join(", ")}.`)
