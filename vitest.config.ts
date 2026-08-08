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
    include: ['src/**/*.test.ts'],
  },
});
