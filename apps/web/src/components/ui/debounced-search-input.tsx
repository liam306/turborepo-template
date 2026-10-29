'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounceCallback } from '@/hooks/useDebounceCallback';
import { cn } from '@/lib/utils';

export interface DebouncedSearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
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
  const t = useTranslations('common');
  const [internalValue, setInternalValue] = React.useState<string>(
    String(controlledValue ?? defaultValue ?? ''),
  );
  const [prevControlledValue, setPrevControlledValue] =
    React.useState(controlledValue);

  if (
    controlledValue !== undefined &&
    controlledValue !== prevControlledValue
  ) {
    setPrevControlledValue(controlledValue);
    setInternalValue(String(controlledValue));
  }

  const debouncedSearch = useDebounceCallback(onSearch, delay);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInternalValue(nextVal);
    debouncedSearch(nextVal);
  };

  const handleClear = () => {
    setInternalValue('');
    debouncedSearch.cancel();
    onSearch('');
  };

  return (
    <div
      className={cn(
        'relative flex items-center w-full max-w-sm',
        containerClassName,
      )}
    >
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder || t('search')}
        className={cn('pl-9 pr-9 h-9 text-sm', className)}
        {...props}
      />
      {internalValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          aria-label={t('close')}
          className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
