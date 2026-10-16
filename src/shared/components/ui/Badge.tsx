import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'neutral'
    | 'success'
    | 'mint'
    | 'warning'
    | 'peach'
    | 'danger'
    | 'error'
    | 'ai'
    | 'lavender'
    | 'outline';
  pill?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', pill = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold tracking-wider transition-colors select-none',
          pill ? 'rounded-full' : 'rounded-md',

          // Neutral / Default
          (variant === 'default' || variant === 'neutral') &&
            'bg-[#f0efed] text-[#292524] border border-[#e7e5e4]',

          // Success / Mint
          (variant === 'success' || variant === 'mint') &&
            'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]',

          // Warning / Peach
          (variant === 'warning' || variant === 'peach') &&
            'bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]',

          // Danger / Error
          (variant === 'danger' || variant === 'error') &&
            'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]',

          // AI / Lavender
          (variant === 'ai' || variant === 'lavender') &&
            'bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe]',

          // Outline
          variant === 'outline' && 'bg-transparent text-[#292524] border border-[#e7e5e4]',

          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';
