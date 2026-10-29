import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFileImportBoundaries } from '../lib/codebase-rules/import-boundaries.mjs';

test('packages/core importing @nestjs or @repo/database triggers errors', () => {
  const code = `
    import { Injectable } from '@nestjs/common';
    import { db } from '@repo/database';
    import type { IUser } from '@repo/types';
  `;
  const diagnostics = checkFileImportBoundaries(
    '/workspace/packages/core/src/service.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics[0].message.includes('@nestjs/common'));
  assert.ok(diagnostics[1].message.includes('@repo/database'));
});

test('packages/types importing anything other than zero workspaces triggers error', () => {
  const code = `
    import { format } from '@repo/utils';
    import { pgTable } from 'drizzle-orm/pg-core';
  `;
  const diagnostics = checkFileImportBoundaries(
    '/workspace/packages/types/src/index.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 2);
});

test('apps/web or apps/mobile importing @repo/database triggers error', () => {
  const code = `
    import { db } from '@repo/database';
  `;
  const diagnostics = checkFileImportBoundaries(
    '/workspace/apps/web/src/lib/db.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, 'IMPORT_BOUNDARY');
});

test('relative escape from package into forbidden workspace triggers error', () => {
  const code = `
    import { db } from '../../database/src/client';
  `;
  const diagnostics = checkFileImportBoundaries(
    '/workspace/packages/core/src/calc.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 1);
  assert.ok(diagnostics[0].message.includes('@repo/database'));
});

test('valid imports within layer pass with zero diagnostics', () => {
  const code = `
    import { round } from '@repo/utils';
    import type { IResult } from '@repo/types';
  `;
  const diagnostics = checkFileImportBoundaries(
    '/workspace/packages/core/src/scoring.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 0);
});
