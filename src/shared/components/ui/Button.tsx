import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger'
    | 'danger-solid'
    | 'outline'
    | 'accent'
    | 'ai'
    | 'ai-soft'
    | 'success'
    | 'success-soft'
    | 'warning'
    | 'warning-soft';
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
          'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] whitespace-nowrap shrink-0',
          // Pill or rounded-xl
          pill ? 'rounded-full' : 'rounded-xl',

          // Variants
          variant === 'primary' &&
            'bg-[#292524] text-white hover:bg-[#0c0a09] active:bg-black shadow-soft-sm border border-transparent',
          variant === 'accent' &&
            'bg-[#ea580c] text-white border-transparent hover:bg-[#c2410c] shadow-soft-sm',
          variant === 'secondary' &&
            'bg-white text-[#0c0a09] border border-[#e7e5e4] hover:bg-[#f5f5f5] hover:border-[#d6d3d1] shadow-soft-sm',
          variant === 'outline' &&
            'bg-transparent text-[#0c0a09] border border-[#e7e5e4] hover:bg-[#f5f5f5] hover:border-[#0c0a09]',
          variant === 'ghost' &&
            'bg-transparent text-[#292524] border-transparent hover:text-[#0c0a09] hover:bg-[#f0efed]',
          variant === 'danger' &&
            'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] hover:bg-[#fee2e2]',
          variant === 'danger-solid' &&
            'bg-[#dc2626] text-white border-transparent hover:bg-[#b91c1c] shadow-soft-sm',
          variant === 'ai' &&
            'bg-[#7c3aed] text-white border-transparent hover:bg-[#6d28d9] shadow-soft-sm',
          variant === 'ai-soft' &&
            'bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe] hover:bg-[#ede9fe]',
          variant === 'success' &&
            'bg-[#059669] text-white border-transparent hover:bg-[#047857] shadow-soft-sm',
          variant === 'success-soft' &&
            'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] hover:bg-[#d1fae5]',
          variant === 'warning' &&
            'bg-[#d97706] text-white border-transparent hover:bg-[#b45309] shadow-soft-sm',
          variant === 'warning-soft' &&
            'bg-[#fffbeb] text-[#b45309] border border-[#fde68a] hover:bg-[#fef3c7]',

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
