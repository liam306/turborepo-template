import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewProps } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { cn } from '@/lib/utils';

export interface ICardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass' | 'highlight';
}

export const Card: React.FC<ICardProps> = ({
  children,
  onPress,
  className = '',
  variant = 'default',
  style,
  ...props
}) => {
  const hasGlass = isLiquidGlassAvailable();

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm';
      case 'highlight':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60';
      case 'glass':
        return hasGlass
          ? 'border border-white/20 dark:border-white/10'
          : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60';
      case 'default':
      default:
        return 'bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm';
    }
  };

  const containerClasses = cn(
    'rounded-2xl p-4 overflow-hidden',
    getVariantStyles(),
    className,
  );

  if (variant === 'glass' && hasGlass) {
    const content = (
      <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill}>
        <View className="p-4">{children}</View>
      </GlassView>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onPress}
          className={cn('rounded-2xl overflow-hidden', className)}
          style={style}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return (
      <View
        className={cn('rounded-2xl overflow-hidden', className)}
        style={style}
        {...props}
      >
        {content}
      </View>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        className={containerClasses}
        style={style}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={containerClasses} style={style} {...props}>
      {children}
    </View>
  );
};
