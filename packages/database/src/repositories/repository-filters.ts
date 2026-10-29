import { and, isNull, type SQL } from 'drizzle-orm';
import type {
  RepositoryReadOptions,
  SoftDeleteTable,
} from './repository.types';

/** Retain caller predicates while enforcing the default active-row policy. */
export function repositoryReadFilter(
  table: SoftDeleteTable,
  where?: SQL,
  options: RepositoryReadOptions = {},
): SQL | undefined {
  return and(
    options.includeDeleted ? undefined : isNull(table.deletedAt),
    where,
  );
}
