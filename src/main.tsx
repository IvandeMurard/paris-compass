import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'

// Last line of defence for the blank page of 2 September 2026 — DIAGNOSTIC.md §32.
//
// `scripts/build/envGuard.ts` already stops a bundle being produced without these two values,
// but it rides on npm's `prebuild` hook: `vite build` invoked directly skips it. This check
// lives inside the bundle, where no build path can go around it.
//
// **Why App is imported dynamically.** Static imports are hoisted and evaluated before the
// first statement of this module. `App` reaches `@/integrations/supabase/client`, which calls
// `createClient(SUPABASE_URL, …)`; with an undefined URL that throws during evaluation — so a
// guard written below a static `import App` would never run. The dynamic import is what makes
// this check reachable at all. It costs one request before first paint, and buys a page that
// says what is wrong instead of one that says nothing.
//
// It repairs nothing: the values are frozen at build time. It makes a misconfiguration read.

const CONFIG = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}

const missing = Object.entries(CONFIG)
  .filter(([, value]) => !value)
  .map(([key]) => key)

const root = document.getElementById('root')!

if (missing.length > 0) {
  root.innerHTML = `
    <main style="font-family: system-ui, sans-serif; max-width: 34rem; margin: 4rem auto; padding: 0 1.5rem; line-height: 1.6; color: #1c1917">
      <h1 style="font-size: 1.25rem; margin: 0 0 .75rem">Compass n'est pas configuré</h1>
      <p style="margin: 0 0 .75rem">
        Ce build a été produit sans ${missing.length > 1 ? 'les variables' : 'la variable'}
        <code style="background: #f5f5f4; padding: .1em .35em; border-radius: .2em">${missing.join('</code>, <code style="background: #f5f5f4; padding: .1em .35em; border-radius: .2em">')}</code>.
        Les données ne peuvent pas être chargées.
      </p>
      <p style="margin: 0; color: #57534e; font-size: .9rem">
        This build was produced without the configuration it needs. Nothing is broken on your side.
      </p>
    </main>
  `
} else {
  void import('./App.tsx').then(({ default: App }) => {
    createRoot(root).render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    )
  })
}
