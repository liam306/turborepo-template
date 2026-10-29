import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { DbOrTx } from '../../client';
import { user, session, account } from '../../schema/auth';
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
    'insert',
    'values',
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

test('usersRepository.findByIdWithLock executes query with for update lock', async () => {
  const client = queryDouble([{ id: 'usr_locked' }]);
  const found = await usersRepository.findByIdWithLock(client.db, 'usr_locked');
  assert.deepEqual(found, { id: 'usr_locked' });
  assert.equal(
    client.calls.find((call) => call.method === 'for')?.args[0],
    'update',
  );
});

test('usersRepository.findAccountsByUserId and findAccountByProvider query accounts', async () => {
  const client = queryDouble([
    { id: 'acc_1', userId: 'usr_1', providerId: 'google' },
  ]);
  const accounts = await usersRepository.findAccountsByUserId(
    client.db,
    'usr_1',
  );
  assert.equal(accounts.length, 1);
  assert.equal(
    client.calls.find((call) => call.method === 'from')?.args[0],
    account,
  );

  const singleClient = queryDouble([
    { id: 'acc_1', userId: 'usr_1', providerId: 'google' },
  ]);
  const acc = await usersRepository.findAccountByProvider(
    singleClient.db,
    'usr_1',
    'google',
  );
  assert.deepEqual(acc, { id: 'acc_1', userId: 'usr_1', providerId: 'google' });
});

test('usersRepository.findActiveSessionsByUserId queries and orders sessions', async () => {
  const client = queryDouble([{ id: 'sess_1', userId: 'usr_1' }]);
  const sessions = await usersRepository.findActiveSessionsByUserId(
    client.db,
    'usr_1',
  );
  assert.equal(sessions.length, 1);
  assert.equal(
    client.calls.find((call) => call.method === 'from')?.args[0],
    session,
  );
  assert.ok(client.calls.find((call) => call.method === 'orderBy'));
});

test('usersRepository.deleteOtherSessions and deleteSessionsByUserId delete sessions', async () => {
  const clientAll = queryDouble([]);
  await usersRepository.deleteSessionsByUserId(clientAll.db, 'usr_1');
  assert.equal(
    clientAll.calls.find((call) => call.method === 'delete')?.args[0],
    session,
  );

  const clientOthers = queryDouble([]);
  await usersRepository.deleteOtherSessions(
    clientOthers.db,
    'usr_1',
    'sess_keep',
  );
  assert.equal(
    clientOthers.calls.find((call) => call.method === 'delete')?.args[0],
    session,
  );
});

test('usersRepository.createAccount inserts and returns created account', async () => {
  const newAccount = {
    id: 'acc_new',
    accountId: 'usr_1',
    providerId: 'credential',
    userId: 'usr_1',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
  const client = queryDouble([newAccount]);
  const created = await usersRepository.createAccount(client.db, newAccount);
  assert.deepEqual(created, newAccount);
  assert.equal(
    client.calls.find((call) => call.method === 'insert')?.args[0],
    account,
  );
});
