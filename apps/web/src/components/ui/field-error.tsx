import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string | null;
}

export function FieldError({ error, className, ...props }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      role="alert"
      className={cn(
        'text-xs font-medium text-destructive mt-1.5 transition-all',
        className,
      )}
      {...props}
    >
      {error}
    </p>
  );
}
