import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  pill?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      pill = true,
      isLoading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]',
          // Pill or rounded-xl
          pill ? 'rounded-full' : 'rounded-xl',

          // Variants
          variant === 'primary' &&
            'bg-[#292524] text-white hover:bg-[#0c0a09] active:bg-black shadow-soft-sm border border-transparent',
          variant === 'secondary' &&
            'bg-white text-[#0c0a09] border border-[#e7e5e4] hover:bg-[#f5f5f5] hover:border-[#d6d3d1] shadow-soft-sm',
          variant === 'outline' &&
            'bg-transparent text-[#0c0a09] border border-[#e7e5e4] hover:bg-[#f5f5f5] hover:border-[#0c0a09]',
          variant === 'ghost' &&
            'bg-transparent text-[#292524] border-transparent hover:text-[#0c0a09] hover:bg-[#f0efed]',
          variant === 'danger' &&
            'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] hover:bg-[#fee2e2]',
          variant === 'accent' &&
            'bg-[#f97316] text-white border-transparent hover:bg-[#ea580c] shadow-soft-sm',

          // Sizes (Min text size text-xs per DESIGN_RULES)
          size === 'sm' && 'h-8 px-3 text-xs gap-1.5',
          size === 'md' && 'h-10 px-4 text-xs font-semibold gap-2',
          size === 'lg' && 'h-12 px-6 text-sm font-semibold gap-2.5',
          size === 'icon' && 'h-9 w-9 p-0 aspect-square',

          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className='animate-spin h-3.5 w-3.5 text-current'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
