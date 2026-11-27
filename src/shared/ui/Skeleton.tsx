import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: React.CSSProperties['width'];
  height?: React.CSSProperties['height'];
}
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { width, height, style, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden='true'
      className={cn('animate-pulse rounded-md bg-stone-200/70', className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
});
