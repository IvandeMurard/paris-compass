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
    environment: 'node',
    // `scripts/` a rejoint la liste le 25 août, pour un seul test — celui qui vérifie que la
    // table de correspondance cron -> source de .github/workflows/ingestion.yml n'a pas dérivé
    // du bloc `on.schedule`. Le workflow échoue bruyamment sur une planification inconnue,
    // mais seulement quand le cron se déclenche : deux fois l'an pour la géographie. Un test
    // le dit à chaque `npm.cmd run test`.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
