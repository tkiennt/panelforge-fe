import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { SurfaceTone } from './Surface';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: SurfaceTone;
  label?: string;
}

const toneFillClasses: Record<SurfaceTone, string> = {
  brand: 'bg-accent',
  ai: 'bg-violet-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-600',
  neutral: 'bg-stone-600',
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(function ProgressBar(
  { value, max = 100, tone = 'brand', label, className, ...props },
  ref,
) {
  const total = Number(max);
  const used = Number(value);
  const safePercent =
    total > 0 && !Number.isNaN(used) && !Number.isNaN(total)
      ? Math.min(100, Math.max(0, (used / total) * 100))
      : 0;

  return (
    <div
      ref={ref}
      role='progressbar'
      aria-label={label}
      aria-valuenow={Math.round(safePercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-stone-100', className)}
      {...props}
    >
      <div
        className={cn('h-full transition-all duration-300 ease-out', toneFillClasses[tone])}
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
});
