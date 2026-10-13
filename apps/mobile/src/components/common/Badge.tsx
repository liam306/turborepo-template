import React from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'custom';

export interface IBadgeProps {
  label: string;
  variant?: BadgeVariant;
  bgColor?: string;
  textColor?: string;
  className?: string;
}

export const Badge: React.FC<IBadgeProps> = ({
  label,
  variant = 'neutral',
  bgColor,
  textColor,
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-950/60',
          text: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-100 dark:bg-amber-950/60',
          text: 'text-amber-700 dark:text-amber-400',
        };
      case 'danger':
        return {
          bg: 'bg-rose-100 dark:bg-rose-950/60',
          text: 'text-rose-700 dark:text-rose-400',
        };
      case 'info':
        return {
          bg: 'bg-sky-100 dark:bg-sky-950/60',
          text: 'text-sky-700 dark:text-sky-400',
        };
      case 'neutral':
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-600 dark:text-slate-300',
        };
    }
  };

  const styles = getVariantStyles();

  if (variant === 'custom' && bgColor && textColor) {
    return (
      <View
        className={cn(
          'px-2.5 py-0.5 rounded-full items-center justify-center self-start',
          className,
        )}
        style={{ backgroundColor: bgColor }}
      >
        <Text className="text-xs font-medium" style={{ color: textColor }}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={cn(
        'px-2.5 py-0.5 rounded-full items-center justify-center self-start',
        styles.bg,
        className,
      )}
    >
      <Text className={cn('text-xs font-medium', styles.text)}>{label}</Text>
    </View>
  );
};
