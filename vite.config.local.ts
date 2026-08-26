import { defineConfig } from "vite";
import path from "path";
import { componentTagger } from "lovable-tagger";

// A second build path, for a machine where the first one cannot run.
//
// **Why it exists.** `vite.config.ts` loads `@vitejs/plugin-react-swc`, whose native binary
// `swc.win32-arm64-msvc.node` is refused by Windows Smart App Control on this machine
// (measured 26 August 2026: `An Application Control policy has blocked this file`). Smart App
// Control has no per-file allowlist — it is on or off, and turning it off cannot be undone
// without reinstalling Windows. So the build was made to stop needing that binary rather than
// the machine made to accept it.
//
// **Why a separate file rather than an edit.** Exactly the reason `vitest.config.ts` gives:
// `vite.config.ts` is also edited by Lovable, which resumes on 1 September and would revert
// any change made there. This file is ours; that one stays theirs.
//
// **What changes, and what does not.** No React plugin: vite transpiles TSX with esbuild,
// whose `esbuild.exe` loads fine here — measured, not assumed. `jsx: "automatic"` is what the
// React plugin would otherwise configure, so the same JSX runtime is used. What is lost is
// Fast Refresh, which only matters to `vite dev` and not to a build gate. Everything else —
// the alias, the port, and `componentTagger()` in development mode — is copied verbatim from
// `vite.config.ts` so the two paths exercise the same tree.
//
// **What this does NOT prove, and the second point is the one that matters.**
//
//  1. A bundle built here is not byte-identical to the one Lovable and any CI produce through
//     SWC — 1 114.64 kB against 1 112.62 kB, measured the same day on the same tree. It
//     answers "does this tree bundle", not "does it bundle the way production does".
//  2. **It does not cover what `build:dev` exists for.** CLAUDE.md keeps the second build
//     because production mode does not mount `lovable-tagger`, so a broken Lovable link would
//     pass unseen. Measured here on 26 August: building `--mode development` with
//     `componentTagger()` and without it gives the **same bundle hash**, `index-CqoGBwpQ.js`.
//     The tagger contributes nothing on this path, so a breakage in it stays just as invisible
//     as in production mode. Whether it contributes anything on the SWC path is unknown — that
//     path cannot run on this machine, which is the whole reason this file exists.
//
// The tagger is kept in the list anyway: it costs nothing, it keeps the two configs readable
// side by side, and it starts working the day a version makes it active here.
//
// Keep the two configs in step: a plugin added to `vite.config.ts` belongs here too, or this
// path silently stops testing the real one.
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [mode === "development" && componentTagger()].filter(Boolean),
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
