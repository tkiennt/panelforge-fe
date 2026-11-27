import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { SurfaceTone } from './Surface';
const fillClasses: Record<SurfaceTone, string> = {
  brand: 'bg-orange-600',
  ai: 'bg-violet-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  danger: 'bg-rose-600',
  info: 'bg-blue-600',
  neutral: 'bg-stone-500',
};
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max: number;
  tone?: SurfaceTone;
  label: string;
}
export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(function ProgressBar(
  { value, max, tone = 'brand', label, className, ...props },
  ref,
) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const safeValue = safeMax > 0 ? Math.min(Math.max(value, 0), safeMax) : 0;
  const percentage = safeMax > 0 ? (safeValue / safeMax) * 100 : 0;
  return (
    <div
      ref={ref}
      role='progressbar'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      className={cn('h-2 overflow-hidden rounded-full bg-stone-100', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-[width]', fillClasses[tone])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
