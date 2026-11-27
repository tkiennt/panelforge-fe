import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CountChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: React.ReactNode;
}

export const CountChip = forwardRef<HTMLSpanElement, CountChipProps>(function CountChip(
  { count, className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-kraft px-2 py-0.5 text-xs font-semibold text-kraft-ink select-none',
        className,
      )}
      {...props}
    >
      {count}
    </span>
  );
});
