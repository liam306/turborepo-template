'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'checked'
> {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, id, ...props }, ref) => {
    const isIndeterminate = checked === 'indeterminate';
    const isChecked = checked === true;

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={id}
          ref={(el) => {
            if (typeof ref === 'function') ref(el);
            else if (ref)
              (ref as React.MutableRefObject<HTMLInputElement | null>).current =
                el;
            if (el) el.indeterminate = isIndeterminate;
          }}
          checked={isChecked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <div
          onClick={() => !disabled && onCheckedChange?.(!isChecked)}
          className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer',
            isChecked || isIndeterminate
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
          {isIndeterminate && <Minus className="h-3 w-3 stroke-[3]" />}
        </div>
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
