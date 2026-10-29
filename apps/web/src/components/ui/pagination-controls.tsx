'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { IPaginatedMeta } from '@repo/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function calculatePaginationRange(
  page: number,
  limit: number,
  total: number,
) {
  if (total === 0) {
    return { start: 0, end: 0, total: 0 };
  }
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return { start, end, total };
}

export interface PaginationControlsProps {
  meta: IPaginatedMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  className?: string;
}

export function PaginationControls({
  meta,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  className,
}: PaginationControlsProps) {
  const t = useTranslations('pagination');

  const { page, limit, total, totalPages } = meta;
  const { start, end } = calculatePaginationRange(page, limit, total);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-4 order-2 sm:order-1">
        <span>
          {t('showing', {
            start,
            end,
            total,
          })}
        </span>

        {showPageSizeSelector && onLimitChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs whitespace-nowrap">{t('perPage')}:</span>
            <Select
              value={String(limit)}
              onValueChange={(val) => onLimitChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-[72px] text-xs">
                <SelectValue placeholder={String(limit)} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          aria-label={t('first')}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label={t('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-2 text-xs font-medium text-foreground">
          {t('page')} {page} {t('of')} {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label={t('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          aria-label={t('last')}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
