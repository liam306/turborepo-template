import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFileHardDeletes } from '../lib/codebase-rules/hard-deletes.mjs';

test('detects single line and multiline db.delete(user)', () => {
  const code = `
    async function remove(id) {
      await db.delete(user).where(eq(user.id, id));
      await db.delete(
        users
      );
    }
  `;
  const diagnostics = checkFileHardDeletes(
    '/workspace/apps/api/src/users/users.service.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics[0].message.includes('.delete(user)'));
  assert.ok(diagnostics[1].message.includes('.delete(users)'));
});

test('detects namespace schema.table delete and this.db.delete', () => {
  const code = `
    async function purge() {
      await this.db.delete(schema.user);
      await tx.delete(schema.users);
    }
  `;
  const diagnostics = checkFileHardDeletes(
    '/workspace/apps/api/src/users/users.service.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics[0].message.includes('.delete(user)'));
  assert.ok(diagnostics[1].message.includes('.delete(users)'));
});

test('detects raw SQL tagged template DELETE FROM domain table', () => {
  const code = `
    async function rawClean() {
      await db.execute(sql\`DELETE FROM "user" WHERE id = \${id}\`);
    }
  `;
  const diagnostics = checkFileHardDeletes(
    '/workspace/apps/api/src/users/users.service.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 1);
  assert.ok(diagnostics[0].message.includes('DELETE FROM user'));
});

test('allows delete on non-prohibited tables and Map/Set operations', () => {
  const code = `
    function cleanup() {
      db.delete(temporarySessions);
      const userMap = new Map();
      userMap.delete('user');
      const activeSet = new Set();
      activeSet.delete(user);
    }
  `;
  const diagnostics = checkFileHardDeletes(
    '/workspace/apps/api/src/sessions/sessions.service.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 0);
});
