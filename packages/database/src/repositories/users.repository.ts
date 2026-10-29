import { and, desc, eq, gt, isNull, type SQL } from 'drizzle-orm';
import { user, session, account } from '../schema/auth';
import type { DbOrTx } from '../client';
import { createSoftDeleteRepository } from './create-soft-delete-repository';
import type { RepositoryReadOptions } from './repository.types';

export type UserRecord = typeof user.$inferSelect;
export type NewUserRecord = typeof user.$inferInsert;
export type SessionRecord = typeof session.$inferSelect;
export type AccountRecord = typeof account.$inferSelect;

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
    return await db
      .select()
      .from(account)
      .where(eq(account.userId, userId));
  },

  async findAccountByProvider(
    db: DbOrTx,
    userId: string,
    providerId: string,
  ): Promise<AccountRecord | null> {
    const [row] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, providerId)))
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

  async deleteSessionsByUserId(
    db: DbOrTx,
    userId: string,
  ): Promise<void> {
    await db.delete(session).where(eq(session.userId, userId));
  },

  async deleteAccountsByUserId(
    db: DbOrTx,
    userId: string,
  ): Promise<void> {
    await db.delete(account).where(eq(account.userId, userId));
  },
};
