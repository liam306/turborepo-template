import assert from 'node:assert/strict';
import { test } from 'vitest';
import { asc, desc, eq, isNotNull } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { DbOrTx } from '../../client';
import { user } from '../../schema/auth';
import { createSoftDeleteRepository } from '../create-soft-delete-repository';
import { repositoryReadFilter } from '../repository-filters';

const dialect = new PgDialect();

/** Query-chain unit double only; does not emulate PostgreSQL transactions. */
function queryDouble(result: unknown[]) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const chain = {
    then(resolve: (value: unknown[]) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
  } as Record<string, unknown>;
  for (const method of [
    'select',
    'from',
    'where',
    'limit',
    'offset',
    'orderBy',
    '$dynamic',
    'insert',
    'values',
    'update',
    'set',
    'returning',
  ]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  return { db: chain as unknown as DbOrTx, calls };
}

test('read filter combines caller conditions with the active-row policy', () => {
  const filter = repositoryReadFilter(user, eq(user.role, 'user'));
  assert.ok(filter);
  const query = dialect.sqlToQuery(filter);
  assert.match(query.sql, /"user"\."deleted_at" is null/);
  assert.match(query.sql, /"user"\."role" = \$1/);
  assert.deepEqual(query.params, ['user']);
  assert.equal(
    repositoryReadFilter(user, undefined, { includeDeleted: true }),
    undefined,
  );
  const deletedOnly = repositoryReadFilter(
    user,
    isNotNull(user.deletedAt),
    { includeDeleted: true },
  );
  assert.ok(deletedOnly);
  assert.doesNotMatch(dialect.sqlToQuery(deletedOnly).sql, / is null/);
  assert.match(dialect.sqlToQuery(deletedOnly).sql, / is not null/);
});

test('construction captures no client; aliases use supplied client and table', async () => {
  const base = createSoftDeleteRepository(user);
  const alias = { findById: base.findById };
  const record = { id: 'usr_123' };
  const client = queryDouble([record]);
  const transaction = queryDouble([]);
  assert.equal(await alias.findById(client.db, 'usr_123'), record);
  assert.equal(await alias.findById(transaction.db, 'missing'), null);
  assert.equal(
    client.calls.find((call) => call.method === 'from')?.args[0],
    user,
  );
  assert.equal(
    transaction.calls.find((call) => call.method === 'limit')?.args[0],
    1,
  );
});

test('list preserves zero pagination and caller ordering overrides defaults', async () => {
  const defaultOrderBy = desc(user.createdAt);
  const base = createSoftDeleteRepository(user, { defaultOrderBy });
  const client = queryDouble([]);
  await base.findMany(client.db, { limit: 0, offset: 0 });
  assert.equal(
    client.calls.find((call) => call.method === 'orderBy')?.args[0],
    defaultOrderBy,
  );
  assert.equal(
    client.calls.find((call) => call.method === 'limit')?.args[0],
    0,
  );
  assert.equal(
    client.calls.find((call) => call.method === 'offset')?.args[0],
    0,
  );
  const callerOrderBy = asc(user.name);
  const override = queryDouble([]);
  await base.findMany(override.db, { orderBy: callerOrderBy });
  assert.equal(
    override.calls.find((call) => call.method === 'orderBy')?.args[0],
    callerOrderBy,
  );
});

test('count normalizes numeric results and uses the read filter', async () => {
  const client = queryDouble([{ value: '3' }]);
  assert.equal(await createSoftDeleteRepository(user).count(client.db), 3);
  const filter = client.calls.find((call) => call.method === 'where')?.args[0];
  assert.ok(filter);
  assert.equal(
    await createSoftDeleteRepository(user).count(queryDouble([]).db),
    0,
  );
});

test('insert, update, softDelete, and restore handle timestamps and return rows', async () => {
  const base = createSoftDeleteRepository(user);
  const now = new Date('2026-10-29T10:00:00Z');
  const record = { id: 'usr_123', name: 'Test', updatedAt: now };

  const insertClient = queryDouble([record]);
  const inserted = await base.insert(insertClient.db, {
    id: 'usr_123',
    name: 'Test',
    email: 'test@example.com',
  });
  assert.equal(inserted, record);

  const updateClient = queryDouble([record]);
  const updated = await base.update(updateClient.db, 'usr_123', { name: 'Updated' });
  assert.equal(updated, record);
  const updateSet = updateClient.calls.find((call) => call.method === 'set')?.args[0] as Record<string, unknown>;
  assert.equal(updateSet.name, 'Updated');
  assert.ok(updateSet.updatedAt instanceof Date);

  const deleteClient = queryDouble([record]);
  const deleted = await base.softDelete(deleteClient.db, 'usr_123');
  assert.equal(deleted, record);
  const deleteSet = deleteClient.calls.find((call) => call.method === 'set')?.args[0] as Record<string, unknown>;
  assert.ok(deleteSet.deletedAt instanceof Date);
  assert.equal(deleteSet.deletedAt, deleteSet.updatedAt);

  const restoreClient = queryDouble([record]);
  const restored = await base.restore(restoreClient.db, 'usr_123');
  assert.equal(restored, record);
  const restoreSet = restoreClient.calls.find((call) => call.method === 'set')?.args[0] as Record<string, unknown>;
  assert.equal(restoreSet.deletedAt, null);
  assert.ok(restoreSet.updatedAt instanceof Date);
});
