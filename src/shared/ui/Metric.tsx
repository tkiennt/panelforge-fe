import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

export const Metric = forwardRef<HTMLDivElement, MetricProps>(function Metric(
  { label, value, hint, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('flex flex-col gap-0.5', className)} {...props}>
      <span className='text-xs font-medium text-stone-500'>{label}</span>
      <span className='font-mono text-lg font-bold text-stone-900'>{value}</span>
      {hint && <span className='text-xs text-stone-400'>{hint}</span>}
    </div>
  );
});
