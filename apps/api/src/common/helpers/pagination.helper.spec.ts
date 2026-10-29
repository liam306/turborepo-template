import {
  calculatePaginationMeta,
  getPaginationOffset,
} from './pagination.helper';

describe('pagination.helper', () => {
  describe('calculatePaginationMeta', () => {
    it('calculates pagination meta accurately for standard pages', () => {
      const meta = calculatePaginationMeta(50, 1, 10);
      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('identifies middle and last page correctly', () => {
      const middle = calculatePaginationMeta(50, 3, 10);
      expect(middle.hasNextPage).toBe(true);
      expect(middle.hasPrevPage).toBe(true);

      const last = calculatePaginationMeta(50, 5, 10);
      expect(last.hasNextPage).toBe(false);
      expect(last.hasPrevPage).toBe(true);
    });

    it('handles zero total items and clamps page/limit', () => {
      const meta = calculatePaginationMeta(0, -1, 10);
      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('defaults to page 1 and limit 20 when parameters are omitted', () => {
      const meta = calculatePaginationMeta(100);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(20);
      expect(meta.totalPages).toBe(5);
    });
  });

  describe('getPaginationOffset', () => {
    it('calculates limit and offset correctly', () => {
      expect(getPaginationOffset(1, 20)).toEqual({ limit: 20, offset: 0 });
      expect(getPaginationOffset(2, 20)).toEqual({ limit: 20, offset: 20 });
      expect(getPaginationOffset(3, 15)).toEqual({ limit: 15, offset: 30 });
    });

    it('clamps negative or zero page and limit to safe defaults', () => {
      expect(getPaginationOffset(0, 0)).toEqual({ limit: 20, offset: 0 });
      expect(getPaginationOffset(-2, 10)).toEqual({ limit: 10, offset: 0 });
    });
  });
});
