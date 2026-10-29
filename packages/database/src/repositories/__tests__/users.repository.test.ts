import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { DbOrTx } from '../../client';
import { user } from '../../schema/auth';
import { usersRepository } from '../users.repository';

function queryDouble(result: unknown[] = []) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const chain: Record<string, unknown> = {
    then(resolve: (value: unknown[]) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
  };
  for (const method of [
    'select',
    'from',
    'where',
    'limit',
    'offset',
    'orderBy',
    '$dynamic',
    'update',
    'set',
    'returning',
    'for',
    'delete',
  ]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  return { db: chain as unknown as DbOrTx, calls };
}

test('usersRepository exposes base soft delete methods on user table', async () => {
  const client = queryDouble([{ id: 'usr_1', email: 'test@example.com' }]);
  const found = await usersRepository.findById(client.db, 'usr_1');
  assert.deepEqual(found, { id: 'usr_1', email: 'test@example.com' });
  assert.equal(
    client.calls.find((call) => call.method === 'from')?.args[0],
    user,
  );
});

test('usersRepository.findByEmail finds active user by normalized email', async () => {
  const client = queryDouble([{ id: 'usr_1', email: 'test@example.com' }]);
  const found = await usersRepository.findByEmail(
    client.db,
    'test@example.com',
  );
  assert.deepEqual(found, { id: 'usr_1', email: 'test@example.com' });
  assert.equal(
    client.calls.find((call) => call.method === 'from')?.args[0],
    user,
  );
  assert.equal(
    client.calls.find((call) => call.method === 'limit')?.args[0],
    1,
  );
});

test('usersRepository.findFirstAdmin finds admin user', async () => {
  const client = queryDouble([{ id: 'admin_1', role: 'admin' }]);
  const found = await usersRepository.findFirstAdmin(client.db);
  assert.deepEqual(found, { id: 'admin_1', role: 'admin' });
  assert.equal(
    client.calls.find((call) => call.method === 'from')?.args[0],
    user,
  );
  assert.equal(
    client.calls.find((call) => call.method === 'limit')?.args[0],
    1,
  );
});

test('usersRepository.findSessionByIdAndUserId queries matching session', async () => {
  const client = queryDouble([{ id: 'sess_1', userId: 'usr_1' }]);
  const found = await usersRepository.findSessionByIdAndUserId(
    client.db,
    'sess_1',
    'usr_1',
  );
  assert.deepEqual(found, { id: 'sess_1', userId: 'usr_1' });
});

test('usersRepository.deleteSession deletes specified session', async () => {
  const client = queryDouble([]);
  await usersRepository.deleteSession(client.db, 'sess_1');
  assert.equal(
    client.calls.find((call) => call.method === 'from')?.args[0],
    undefined,
  );
});
