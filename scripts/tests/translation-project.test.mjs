import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeProjectTranslations } from '../lib/translation-project.mjs';

test('resolves translator passed across files to validation factory (Seam 3)', () => {
  const rootDir = '/virtual/project';
  const files = {
    '/virtual/project/apps/web/src/components/MyDialog.tsx': `
      import { useTranslations } from 'next-intl';
      import { createAiModelCandidateSchema } from '../lib/validations/admin';
      export function MyDialog() {
        const t = useTranslations('admin.aiConfig');
        const schema = createAiModelCandidateSchema(t);
        return null;
      }
    `,
    '/virtual/project/apps/web/src/lib/validations/admin.ts': `
      export function createAiModelCandidateSchema(t) {
        return {
          modelId: t('modelIdRequired'),
        };
      }
    `,
  };

  const readFile = (filePath) => files[filePath];
  const fileExists = (filePath) => Boolean(files[filePath]);

  const result = analyzeProjectTranslations({
    rootDir,
    appName: 'web',
    srcDir: '/virtual/project/apps/web/src',
    sourceFiles: Object.keys(files),
    readFile,
    fileExists,
  });

  const keys = result.occurrences.map((o) => o.key);
  assert.ok(
    keys.includes('admin.aiConfig.modelIdRequired'),
    `Expected admin.aiConfig.modelIdRequired in ${JSON.stringify(keys)}`,
  );
  const match = result.occurrences.find(
    (o) => o.key === 'admin.aiConfig.modelIdRequired',
  );
  assert.equal(match.file, 'apps/web/src/lib/validations/admin.ts');
});

test('resolves barrel re-export and @/ alias path (Seam 3)', () => {
  const rootDir = '/virtual/project';
  const files = {
    '/virtual/project/apps/web/src/components/MyDialog.tsx': `
      import { useTranslations } from 'next-intl';
      import { createAiModelCandidateSchema } from '@/lib/validations';
      export function MyDialog() {
        const t = useTranslations('admin.aiConfig');
        createAiModelCandidateSchema(t);
      }
    `,
    '/virtual/project/apps/web/src/lib/validations/index.ts': `
      export * from './admin';
    `,
    '/virtual/project/apps/web/src/lib/validations/admin.ts': `
      export function createAiModelCandidateSchema(t) {
        t('modelIdRequired');
      }
    `,
  };

  const readFile = (filePath) => files[filePath];
  const fileExists = (filePath) => Boolean(files[filePath]);

  const result = analyzeProjectTranslations({
    rootDir,
    appName: 'web',
    srcDir: '/virtual/project/apps/web/src',
    sourceFiles: Object.keys(files),
    readFile,
    fileExists,
  });

  const keys = result.occurrences.map((o) => o.key);
  assert.ok(
    keys.includes('admin.aiConfig.modelIdRequired'),
    `Expected admin.aiConfig.modelIdRequired in ${JSON.stringify(keys)}`,
  );
});

test('regular function with parameter named t is not treated as translator', () => {
  const rootDir = '/virtual/project';
  const files = {
    '/virtual/project/apps/web/src/utils/math.ts': `
      export function scale(t) {
        return t('notKey');
      }
      export function run() {
        scale((x) => x);
      }
    `,
  };

  const readFile = (filePath) => files[filePath];
  const fileExists = (filePath) => Boolean(files[filePath]);

  const result = analyzeProjectTranslations({
    rootDir,
    appName: 'web',
    srcDir: '/virtual/project/apps/web/src',
    sourceFiles: Object.keys(files),
    readFile,
    fileExists,
  });

  const keys = result.occurrences.map((o) => o.key);
  assert.equal(keys.length, 0);
});
