import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const CountChip = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  function CountChip({ className, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex min-w-6 items-center justify-center rounded-full bg-kraft px-2 py-0.5 text-xs font-semibold text-kraft-ink',
          className,
        )}
        {...props}
      />
    );
  },
);
