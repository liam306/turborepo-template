import { describe, it, expect } from 'vitest';
import { paginateItems } from '../pagination';

describe('paginateItems utility', () => {
  const sampleItems = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  it('slices items for the first page with given limit', () => {
    const result = paginateItems(sampleItems, 1, 10);

    expect(result.data).toHaveLength(10);
    expect(result.data[0].id).toBe(1);
    expect(result.data[9].id).toBe(10);
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });
  });

  it('slices items for subsequent pages correctly', () => {
    const result = paginateItems(sampleItems, 3, 10);

    expect(result.data).toHaveLength(5);
    expect(result.data[0].id).toBe(21);
    expect(result.data[4].id).toBe(25);
    expect(result.meta).toEqual({
      page: 3,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });

  it('handles empty arrays gracefully', () => {
    const result = paginateItems([], 1, 10);

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it('handles invalid or out-of-bounds page and limit values', () => {
    const result = paginateItems(sampleItems, -5, 0);

    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(1);
  });
});
