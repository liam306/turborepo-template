import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../../schema';
import { usersRepository } from '../users.repository';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/app_db';

describe('usersRepository (Integration - Seam 1)', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    sql = postgres(databaseUrl, { max: 5 });
    db = drizzle(sql, { schema });
  });

  afterAll(async () => {
    await sql.end();
  });

  it('inserts active user, excludes soft-deleted records from default queries, and restores atomically', async () => {
    const testId = `test_usr_${Date.now()}`;
    const email = `${testId}@example.com`;

    // 1. Insert user
    const created = await usersRepository.insert(db as any, {
      id: testId,
      name: 'Integration User',
      email,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(created.id).toBe(testId);
    expect(created.email).toBe(email);

    // 2. Find by ID returns active user
    const found = await usersRepository.findById(db as any, testId);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(testId);

    // 3. Find by email
    const foundByEmail = await usersRepository.findByEmail(db as any, email);
    expect(foundByEmail?.id).toBe(testId);

    // 4. Soft delete
    const deleted = await usersRepository.softDelete(db as any, testId);
    expect(deleted?.deletedAt).toBeInstanceOf(Date);

    // 5. Default query excludes soft-deleted user
    const hidden = await usersRepository.findById(db as any, testId);
    expect(hidden).toBeNull();

    const hiddenByEmail = await usersRepository.findByEmail(db as any, email);
    expect(hiddenByEmail).toBeNull();

    // 6. Explicit includeDeleted retrieves it
    const withDeleted = await usersRepository.findById(db as any, testId, {
      includeDeleted: true,
    });
    expect(withDeleted?.id).toBe(testId);
    expect(withDeleted?.deletedAt).toBeInstanceOf(Date);

    // 7. Restore sets deletedAt back to null
    const restored = await usersRepository.restore(db as any, testId);
    expect(restored?.deletedAt).toBeNull();

    const visibleAgain = await usersRepository.findById(db as any, testId);
    expect(visibleAgain?.id).toBe(testId);

    // Cleanup
    await (db as any).delete(schema.user).where(eq(schema.user.id, testId));
  });

  it('enforces email uniqueness constraint', async () => {
    const email = `unique_${Date.now()}@example.com`;
    const user1Id = `usr_1_${Date.now()}`;
    const user2Id = `usr_2_${Date.now()}`;

    await usersRepository.insert(db as any, {
      id: user1Id,
      name: 'User 1',
      email,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Inserting duplicate email must throw
    await expect(
      usersRepository.insert(db as any, {
        id: user2Id,
        name: 'User 2',
        email,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toThrow();

    // Cleanup
    await (db as any).delete(schema.user).where(eq(schema.user.id, user1Id));
  });

  it('rolls back all modifications when an error occurs inside transaction', async () => {
    const testId = `rollback_${Date.now()}`;
    const email = `${testId}@example.com`;

    try {
      await (db as any).transaction(async (tx: any) => {
        await usersRepository.insert(tx, {
          id: testId,
          name: 'Rollback User',
          email,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // Deliberate error to trigger rollback
        throw new Error('Simulated failure during transaction');
      });
    } catch {
      // Expected rollback
    }

    // Record should not exist
    const found = await usersRepository.findById(db as any, testId, {
      includeDeleted: true,
    });
    expect(found).toBeNull();
  });

  it('manages sessions and accounts in integration environment', async () => {
    const userId = `sess_usr_${Date.now()}`;
    const email = `${userId}@example.com`;

    await usersRepository.insert(db as any, {
      id: userId,
      name: 'Session User',
      email,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create session
    const sessionId1 = `s1_${Date.now()}`;
    const sessionId2 = `s2_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 86400000);

    await (db as any).insert(schema.session).values([
      {
        id: sessionId1,
        token: `tok_${sessionId1}`,
        userId,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sessionId2,
        token: `tok_${sessionId2}`,
        userId,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const activeSessions = await usersRepository.findActiveSessionsByUserId(
      db as any,
      userId,
    );
    expect(activeSessions.length).toBe(2);

    // Delete other sessions keeping sessionId1
    await usersRepository.deleteOtherSessions(db as any, userId, sessionId1);
    const remaining = await usersRepository.findActiveSessionsByUserId(
      db as any,
      userId,
    );
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(sessionId1);

    // Delete all sessions
    await usersRepository.deleteSessionsByUserId(db as any, userId);
    const emptySessions = await usersRepository.findActiveSessionsByUserId(
      db as any,
      userId,
    );
    expect(emptySessions.length).toBe(0);

    // Cleanup
    await (db as any).delete(schema.user).where(eq(schema.user.id, userId));
  });
});
