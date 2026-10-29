import type { IPaginatedResult } from '@repo/types';

/**
 * Paginates an in-memory array of items with standard metadata.
 */
export function paginateItems<T>(
  items: T[],
  page: number = 1,
  limit: number = 10,
): IPaginatedResult<T> {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safeLimit = Math.max(1, Math.floor(limit ?? 10));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const data = items.slice(startIndex, endIndex);

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}
