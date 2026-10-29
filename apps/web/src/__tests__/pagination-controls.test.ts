import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  PaginationControls,
  calculatePaginationRange,
} from '../components/ui/pagination-controls';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, any>) => {
    if (params) {
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        `[${key}]`,
      );
    }
    return `[${key}]`;
  },
}));

describe('PaginationControls (Seam 4)', () => {
  it('calculates item range correctly', () => {
    expect(calculatePaginationRange(1, 10, 25)).toEqual({
      start: 1,
      end: 10,
      total: 25,
    });
    expect(calculatePaginationRange(3, 10, 25)).toEqual({
      start: 21,
      end: 25,
      total: 25,
    });
    expect(calculatePaginationRange(1, 10, 0)).toEqual({
      start: 0,
      end: 0,
      total: 0,
    });
  });

  it('renders disabled state for first page controls', () => {
    const html = renderToString(
      React.createElement(PaginationControls, {
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false,
        },
        onPageChange: vi.fn(),
      }),
    );

    expect(html).toContain('disabled=""');
  });
});
