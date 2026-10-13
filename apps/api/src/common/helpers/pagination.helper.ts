import { IPaginatedMeta } from '@repo/types';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export function calculatePaginationMeta(
  total: number,
  page = 1,
  limit = 20,
): IPaginatedMeta {
  const currentPage = Math.max(1, Number(page) || 1);
  const currentLimit = Math.max(1, Number(limit) || 20);
  const totalPages = Math.ceil(total / currentLimit) || 1;

  return {
    page: currentPage,
    limit: currentLimit,
    total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

export interface PaginationOffsetResult {
  limit: number;
  offset: number;
}

export function getPaginationOffset(
  page = 1,
  limit = 20,
): PaginationOffsetResult {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  return {
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}
