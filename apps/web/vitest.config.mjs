import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    maxWorkers: 2,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/app/**',
        'src/instrumentation.ts',
        'src/config/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
