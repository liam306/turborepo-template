import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../',
);
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });
dotenv.config({ quiet: true });

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    maxWorkers: 2,
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/schema/index.ts', 'src/index.ts'],
    },
  },
});
