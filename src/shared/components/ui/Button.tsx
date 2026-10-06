import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          // Base style: Flat design, solid ink borders (Manga Aesthetic)
          'border-[1.5px] rounded-md shadow-none',

          // Variants
          variant === 'primary' &&
            'bg-[#F97316] text-white border-[#F97316] hover:bg-[#EA580C] hover:border-[#EA580C]',
          variant === 'secondary' &&
            'bg-[#FFFFFF] text-[#171717] border-[#171717] hover:bg-[#FAF8F5]',
          variant === 'ghost' &&
            'bg-transparent text-[#555555] border-transparent hover:text-[#171717] hover:bg-[#EAE6DF] hover:border-[#EAE6DF]',
          variant === 'danger' && 'bg-[#FEF2F2] text-[#DC2626] border-[#DC2626] hover:bg-[#FEE2E2]',

          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-[11px]',
          size === 'md' && 'px-4 py-2 text-xs',
          size === 'lg' && 'px-5 py-2.5 text-sm',
          size === 'icon' && 'p-1.5',

          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className='animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current'
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
