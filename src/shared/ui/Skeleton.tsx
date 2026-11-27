import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { width, height, style, className, ...props },
  ref,
) {
  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  return (
    <div
      ref={ref}
      aria-hidden='true'
      style={dynamicStyle}
      className={cn('animate-pulse rounded-md bg-stone-200/70', className)}
      {...props}
    />
  );
});
