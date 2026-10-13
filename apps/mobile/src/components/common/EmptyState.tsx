import React from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface IEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<IEmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
  className = '',
}) => {
  return (
    <View className={cn('items-center justify-center py-12 px-6', className)}>
      {icon && (
        <View className="mb-4 p-4 rounded-full bg-slate-100 dark:bg-slate-800">
          {icon}
        </View>
      )}
      <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 text-center mb-1.5">
        {title}
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-5">
        {description}
      </Text>
      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} size="md" />
      )}
    </View>
  );
};
