import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', icon, ...props }, ref) => {
    return (
      <div className='relative w-full'>
        {icon && (
          <div className='absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] pointer-events-none'>
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            'w-full py-2 bg-[#FAF8F5] border-[1.5px] border-[#171717] rounded-md text-xs text-[#171717] placeholder:text-[#888888]',
            'focus:outline-none focus:border-[#F97316] transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon ? 'pl-9 pr-4' : 'px-4',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = 'Input';
