import { defineConfig } from 'vitest/config';
import path from 'path';

// Kept separate from vite.config.ts on purpose: that file is also edited by Lovable, and
// the test setup has no business colliding with the build setup.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // `node` stays the default, and that is a rule rather than an inheritance: a decision
    // about words, provenance or geometry must be testable without a DOM, which is why
    // `figureText.ts` and `contextText.ts` exist as plain modules. One file opts out with
    // `@vitest-environment jsdom` — `ContextMap.test.tsx`, the one thing in this repo whose
    // defect only exists once Leaflet is mounted (#156). Adding jsdom to the default would
    // hide the next component that could have been tested without one.
    environment: 'node',
    // `scripts/` a rejoint la liste le 25 août, pour un seul test — celui qui vérifie que la
    // table de correspondance cron -> source de .github/workflows/ingestion.yml n'a pas dérivé
    // du bloc `on.schedule`. Le workflow échoue bruyamment sur une planification inconnue,
    // mais seulement quand le cron se déclenche : deux fois l'an pour la géographie. Un test
    // le dit à chaque `npm.cmd run test`.
    // `.tsx` joined the pattern on 13 septembre 2026 : un test qui MONTE un composant a besoin
    // de JSX, et le défaut de `#156` n'existe qu'une fois Leaflet monté. Aucun autre fichier
    // n'en profite pour l'instant, et c'est voulu.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
  },
});
