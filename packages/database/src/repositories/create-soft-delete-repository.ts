import { count, eq, type InferSelectModel } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { repositoryReadFilter } from './repository-filters';
import type {
  SoftDeleteRepository,
  SoftDeleteRepositoryConfig,
  SoftDeleteTable,
} from './repository.types';

/** Create table-bound methods without capturing a DB or transaction client. */
export function createSoftDeleteRepository<TTable extends SoftDeleteTable>(
  table: TTable,
  config: SoftDeleteRepositoryConfig = {},
): SoftDeleteRepository<TTable> {
  // Drizzle's conditional .from() parameter cannot resolve a generic TTable.
  // Widen only the query-builder table, not the public input/output contract.
  const queryTable: PgTable = table;
  // Full-table select/returning use exactly queryTable's columns, with no joins
  // or projection. Restore the concrete model at this single internal boundary.
  const rows = (result: unknown[]): InferSelectModel<TTable>[] =>
    result as InferSelectModel<TTable>[];
  return {
    async findById(db, id, options) {
      const result = await db
        .select()
        .from(queryTable)
        .where(repositoryReadFilter(table, eq(table.id, id), options))
        .limit(1);
      return rows(result)[0] ?? null;
    },

    async findMany(db, options = {}) {
      let query = db
        .select()
        .from(queryTable)
        .where(repositoryReadFilter(table, options.where, options))
        .$dynamic();
      const orderBy = options.orderBy ?? config.defaultOrderBy;
      if (orderBy !== undefined) query = query.orderBy(orderBy);
      if (options.limit !== undefined) query = query.limit(options.limit);
      if (options.offset !== undefined) query = query.offset(options.offset);
      return rows(await query);
    },

    async count(db, where, options) {
      const [result] = await db
        .select({ value: count() })
        .from(queryTable)
        .where(repositoryReadFilter(table, where, options));
      return Number(result?.value ?? 0);
    },

    async insert(db, values) {
      const [created] = rows(
        await db.insert(queryTable).values(values).returning(),
      );
      if (!created) throw new Error('Repository insert returned no row');
      return created;
    },

    async update(db, id, values) {
      const result = await db
        .update(queryTable)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning();
      return rows(result)[0] ?? null;
    },

    async softDelete(db, id) {
      const now = new Date();
      const result = await db
        .update(queryTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(table.id, id))
        .returning();
      return rows(result)[0] ?? null;
    },

    async restore(db, id) {
      const result = await db
        .update(queryTable)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning();
      return rows(result)[0] ?? null;
    },
  };
}
