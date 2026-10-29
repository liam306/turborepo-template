import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useDebounceCallback } from '@/hooks/useDebounceCallback';
import { cn } from '@/lib/utils';

export interface DebouncedSearchInputProps extends Omit<
  TextInputProps,
  'onChangeText'
> {
  onSearch: (value: string) => void;
  delay?: number;
  containerClassName?: string;
}

export function DebouncedSearchInput({
  onSearch,
  delay = 400,
  placeholder,
  value: controlledValue,
  defaultValue,
  containerClassName,
  className,
  ...props
}: DebouncedSearchInputProps) {
  const { t } = useTranslation();
  const [internalValue, setInternalValue] = useState<string>(
    String(controlledValue ?? defaultValue ?? ''),
  );
  const [prevControlledValue, setPrevControlledValue] =
    useState(controlledValue);

  if (
    controlledValue !== undefined &&
    controlledValue !== prevControlledValue
  ) {
    setPrevControlledValue(controlledValue);
    setInternalValue(String(controlledValue));
  }

  const debouncedSearch = useDebounceCallback(onSearch, delay);

  const handleChangeText = (text: string) => {
    setInternalValue(text);
    debouncedSearch(text);
  };

  const handleClear = () => {
    setInternalValue('');
    debouncedSearch.cancel();
    onSearch('');
  };

  return (
    <View
      className={cn(
        'flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900',
        containerClassName,
      )}
    >
      <Search size={18} color="#94a3b8" />
      <TextInput
        value={internalValue}
        onChangeText={handleChangeText}
        placeholder={placeholder || t('common.search')}
        placeholderTextColor="#94a3b8"
        className={cn(
          'flex-1 ml-2 text-sm text-slate-900 dark:text-white py-0',
          className,
        )}
        {...props}
      />
      {internalValue ? (
        <TouchableOpacity
          onPress={handleClear}
          accessibilityLabel={t('common.close')}
          className="p-1"
        >
          <X size={16} color="#94a3b8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
