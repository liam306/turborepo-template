import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    maxWorkers: 2,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
