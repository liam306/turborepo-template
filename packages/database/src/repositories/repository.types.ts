import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { DbOrTx } from '../client';

/** Required column capabilities; both timestamp timezone modes are supported. */
export type SoftDeleteTable = PgTable & {
  id: AnyPgColumn<{ data: string; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
  deletedAt: AnyPgColumn<{ data: Date; notNull: false }>;
};

export interface RepositoryReadOptions {
  /** Include active and deleted rows. Deleted-only reads also need a predicate. */
  includeDeleted?: boolean;
}

export interface RepositoryFindManyOptions extends RepositoryReadOptions {
  /** Combined with the default deletion filter, never substituted for it. */
  where?: SQL;
  /** Overrides the factory's default ordering when provided. */
  orderBy?: SQL;
  /** Applied when defined, including zero; no extra repository-level validation. */
  limit?: number;
  /** Applied when defined, including zero; no extra repository-level validation. */
  offset?: number;
}

export interface SoftDeleteRepositoryConfig {
  /** Used by findMany when the caller does not specify orderBy. */
  defaultOrderBy?: SQL;
}

/**
 * Technical contract, internal to the database package.
 *
 * Reads exclude deleted rows by default. To read only deleted rows, combine
 * includeDeleted: true with isNotNull(table.deletedAt).
 * Every call receives its DB/transaction client; implementations must not capture
 * a connection or replace a passed transaction with a global client.
 */
export interface SoftDeleteRepository<TTable extends SoftDeleteTable> {
  /** Match ID, limit one, and return null when no visible row exists. */
  findById(
    db: DbOrTx,
    id: string,
    options?: RepositoryReadOptions,
  ): Promise<InferSelectModel<TTable> | null>;

  /** Apply deletion/caller filters, ordering, and optional pagination. */
  findMany(
    db: DbOrTx,
    options?: RepositoryFindManyOptions,
  ): Promise<InferSelectModel<TTable>[]>;

  /** Apply the same deletion policy as reads; return a numeric count. */
  count(
    db: DbOrTx,
    whereClause?: SQL,
    options?: RepositoryReadOptions,
  ): Promise<number>;

  /**
   * Return the inserted row, never undefined. A missing returning row is an
   * internal invariant failure, not a public error message. The API's existing
   * exception boundary is responsible for sanitizing internal errors.
   */
  insert(
    db: DbOrTx,
    values: InferInsertModel<TTable>,
  ): Promise<InferSelectModel<TTable>>;

  /**
   * Match ID only, including deleted rows; override updatedAt with the current
   * time. Preserve Partial<insert model> compatibility, including ID/timestamps.
   * Return null when the ID does not exist.
   */
  update(
    db: DbOrTx,
    id: string,
    values: Partial<InferInsertModel<TTable>>,
  ): Promise<InferSelectModel<TTable> | null>;

  /**
   * Match ID only; set deletedAt and updatedAt to one shared Date value.
   * Repeated deletion refreshes timestamps; a missing ID returns null.
   */
  softDelete(db: DbOrTx, id: string): Promise<InferSelectModel<TTable> | null>;

  /**
   * Match ID only; clear deletedAt and refresh updatedAt, including active rows.
   * Repeated restore refreshes updatedAt; a missing ID returns null.
   */
  restore(db: DbOrTx, id: string): Promise<InferSelectModel<TTable> | null>;
}
