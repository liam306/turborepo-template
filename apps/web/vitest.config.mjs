import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    maxWorkers: 2,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
