import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border-[1.5px] transition-colors',
          variant === 'default' && 'bg-[#171717] text-white border-[#171717]',
          variant === 'success' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
          variant === 'warning' && 'bg-[#FFF7ED] text-[#F97316] border-[#FDBA74]',
          variant === 'danger' && 'bg-red-50 text-red-700 border-red-300',
          variant === 'outline' && 'bg-transparent text-[#171717] border-[#171717]',
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';
