import { and, desc, eq, gt, isNull, ne, type SQL } from 'drizzle-orm';
import { user, session, account } from '../schema/auth';
import type { DbOrTx } from '../client';
import { createSoftDeleteRepository } from './create-soft-delete-repository';
import type { RepositoryReadOptions } from './repository.types';

export type UserRecord = typeof user.$inferSelect;
export type NewUserRecord = typeof user.$inferInsert;
export type SessionRecord = typeof session.$inferSelect;
export type NewSessionRecord = typeof session.$inferInsert;
export type AccountRecord = typeof account.$inferSelect;
export type NewAccountRecord = typeof account.$inferInsert;

const base = createSoftDeleteRepository(user, {
  defaultOrderBy: desc(user.createdAt),
});

export const usersRepository = {
  findById: base.findById,
  findMany: base.findMany,
  count: base.count,
  insert: base.insert,
  update: base.update,
  softDelete: base.softDelete,
  restore: base.restore,

  async findByEmail(
    db: DbOrTx,
    email: string,
    options: RepositoryReadOptions = {},
  ): Promise<UserRecord | null> {
    const conditions: SQL[] = [eq(user.email, email.trim().toLowerCase())];
    if (!options.includeDeleted) {
      conditions.push(isNull(user.deletedAt));
    }
    const [row] = await db
      .select()
      .from(user)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  },

  async findFirstAdmin(
    db: DbOrTx,
    options: RepositoryReadOptions = {},
  ): Promise<UserRecord | null> {
    const conditions: SQL[] = [eq(user.role, 'admin')];
    if (!options.includeDeleted) {
      conditions.push(isNull(user.deletedAt));
    }
    const [row] = await db
      .select()
      .from(user)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  },

  async findByIdWithLock(
    db: DbOrTx,
    id: string,
    options: RepositoryReadOptions = {},
  ): Promise<UserRecord | null> {
    const conditions: SQL[] = [eq(user.id, id)];
    if (!options.includeDeleted) {
      conditions.push(isNull(user.deletedAt));
    }
    const [row] = await db
      .select()
      .from(user)
      .where(and(...conditions))
      .for('update');
    return row ?? null;
  },

  async findAccountsByUserId(
    db: DbOrTx,
    userId: string,
  ): Promise<AccountRecord[]> {
    return await db.select().from(account).where(eq(account.userId, userId));
  },

  async findAccountByProvider(
    db: DbOrTx,
    userId: string,
    providerId: string,
  ): Promise<AccountRecord | null> {
    const [row] = await db
      .select()
      .from(account)
      .where(
        and(eq(account.userId, userId), eq(account.providerId, providerId)),
      )
      .limit(1);
    return row ?? null;
  },

  async findActiveSessionsByUserId(
    db: DbOrTx,
    userId: string,
  ): Promise<SessionRecord[]> {
    return await db
      .select()
      .from(session)
      .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
      .orderBy(desc(session.createdAt));
  },

  async findSessionByIdAndUserId(
    db: DbOrTx,
    sessionId: string,
    userId: string,
  ): Promise<SessionRecord | null> {
    const [row] = await db
      .select()
      .from(session)
      .where(and(eq(session.id, sessionId), eq(session.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async deleteSession(db: DbOrTx, sessionId: string): Promise<void> {
    await db.delete(session).where(eq(session.id, sessionId));
  },

  async deleteOtherSessions(
    db: DbOrTx,
    userId: string,
    currentSessionId?: string,
  ): Promise<void> {
    if (!currentSessionId) {
      await db.delete(session).where(eq(session.userId, userId));
    } else {
      await db
        .delete(session)
        .where(
          and(eq(session.userId, userId), ne(session.id, currentSessionId)),
        );
    }
  },

  async deleteSessionsByUserId(db: DbOrTx, userId: string): Promise<void> {
    await db.delete(session).where(eq(session.userId, userId));
  },

  async createAccount(
    db: DbOrTx,
    values: NewAccountRecord,
  ): Promise<AccountRecord> {
    const [created] = await db.insert(account).values(values).returning();
    if (!created) throw new Error('Account insert returned no row');
    return created;
  },

  async updateAccount(
    db: DbOrTx,
    accountId: string,
    values: Partial<NewAccountRecord>,
  ): Promise<AccountRecord | null> {
    const [updated] = await db
      .update(account)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(account.id, accountId))
      .returning();
    return updated ?? null;
  },

  async deleteAccountsByUserId(db: DbOrTx, userId: string): Promise<void> {
    await db.delete(account).where(eq(account.userId, userId));
  },
};
