import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface IButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<IButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-emerald-600 active:bg-emerald-700';
      case 'secondary':
        return 'bg-slate-800 active:bg-slate-700';
      case 'outline':
        return 'border border-slate-300 dark:border-slate-700 bg-transparent active:bg-slate-100 dark:active:bg-slate-800';
      case 'danger':
        return 'bg-rose-600 active:bg-rose-700';
      case 'ghost':
        return 'bg-transparent active:bg-slate-100 dark:active:bg-slate-800';
      default:
        return 'bg-emerald-600';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 rounded-lg';
      case 'lg':
        return 'px-6 py-3.5 rounded-2xl';
      case 'md':
      default:
        return 'px-4 py-2.5 rounded-xl';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs font-medium';
      case 'lg':
        return 'text-base font-semibold';
      case 'md':
      default:
        return 'text-sm font-semibold';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return 'text-slate-800 dark:text-slate-200';
      case 'primary':
      case 'secondary':
      case 'danger':
      default:
        return 'text-white';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      className={cn(
        'flex-row items-center justify-center',
        getVariantStyles(),
        getSizeStyles(),
        disabled && 'opacity-50',
      )}
      style={style}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={cn(getTextColor(), getTextSizeStyles())}>
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};
