import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    maxWorkers: 2,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
