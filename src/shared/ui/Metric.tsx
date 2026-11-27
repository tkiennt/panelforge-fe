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
    <div ref={ref} className={cn('space-y-1', className)} {...props}>
      <div className='text-xs font-medium text-stone-600'>{label}</div>
      <div className='font-mono text-lg font-bold text-stone-900'>{value}</div>
      {hint && <div className='text-xs text-stone-500'>{hint}</div>}
    </div>
  );
});
