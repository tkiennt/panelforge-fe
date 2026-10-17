import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  pill?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', icon, pill = false, disabled, ...props }, ref) => {
    return (
      <div className='relative w-full'>
        {icon && (
          <div className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777169] pointer-events-none flex items-center justify-center'>
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full h-10 bg-white border border-[#e7e5e4] text-xs text-[#0c0a09] placeholder:text-[#a8a29e] transition-all duration-150',
            pill ? 'rounded-full' : 'rounded-xl',
            'focus:outline-none focus:border-[#292524] focus:ring-2 focus:ring-[#292524]/10',
            'disabled:opacity-50 disabled:bg-[#f5f5f5] disabled:cursor-not-allowed',
            icon ? 'pl-10 pr-4' : 'px-4',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = 'Input';
