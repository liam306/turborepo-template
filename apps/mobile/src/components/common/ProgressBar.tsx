import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface IProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<IProgressBarProps> = ({
  progress,
  color = '#10B981',
  height = 8,
  showLabel = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View className={cn('w-full', className)}>
      {showLabel && (
        <View className="flex-row justify-between mb-1.5 items-center">
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {t('common.progress')}
          </Text>
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {clampedProgress.toFixed(1)}%
          </Text>
        </View>
      )}
      <View
        className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden"
        style={{ height }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
};
