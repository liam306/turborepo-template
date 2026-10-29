import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { IPaginatedMeta } from '@repo/types';
import { cn } from '@/lib/utils';

export interface MobilePaginationControlsProps {
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
  pageSizeOptions = [10, 20, 50],
  showPageSizeSelector = true,
  className,
}: MobilePaginationControlsProps) {
  const { t } = useTranslation();

  const { page, limit, total, totalPages } = meta;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <View className={cn('py-3 space-y-3', className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {t('pagination.showing', {
            start,
            end,
            total,
          })}
        </Text>

        {showPageSizeSelector && onLimitChange ? (
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {t('pagination.perPage')}:
            </Text>
            {pageSizeOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => onLimitChange(opt)}
                className={cn(
                  'rounded-lg px-2 py-1',
                  limit === opt
                    ? 'bg-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800',
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-medium',
                    limit === opt
                      ? 'text-white'
                      : 'text-slate-600 dark:text-slate-300',
                  )}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
        <TouchableOpacity
          onPress={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className={cn(
            'flex-row items-center rounded-xl px-3 py-1.5',
            canPrev ? 'bg-slate-100 dark:bg-slate-800' : 'opacity-40',
          )}
        >
          <ChevronLeft size={16} color="#64748b" />
          <Text className="ml-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            {t('pagination.prev')}
          </Text>
        </TouchableOpacity>

        <Text className="text-xs font-semibold text-slate-900 dark:text-white">
          {t('pagination.page')} {page} {t('pagination.of')} {totalPages}
        </Text>

        <TouchableOpacity
          onPress={() => onPageChange(page + 1)}
          disabled={!canNext}
          className={cn(
            'flex-row items-center rounded-xl px-3 py-1.5',
            canNext ? 'bg-slate-100 dark:bg-slate-800' : 'opacity-40',
          )}
        >
          <Text className="mr-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            {t('pagination.next')}
          </Text>
          <ChevronRight size={16} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
