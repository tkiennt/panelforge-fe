import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  'primary' | 'secondary' | 'ai' | 'success' | 'warning' | 'danger' | 'ghost';

export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-soft-sm rounded-full active:scale-[0.98] border border-transparent',
  secondary:
    'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 rounded-full shadow-soft-sm',
  ai: 'bg-violet-600 hover:bg-violet-700 text-white shadow-soft-sm rounded-full border border-transparent',
  success:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft-sm rounded-full border border-transparent',
  warning:
    'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-full shadow-soft-sm',
  danger:
    'border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-full bg-white shadow-soft-sm',
  ghost: 'bg-transparent hover:bg-stone-100 text-stone-700 border border-transparent rounded-full',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[32px] px-3 py-1 text-xs font-medium gap-1.5 [&_svg]:size-3.5',
  md: 'min-h-[36px] px-4 py-1.5 text-xs font-semibold gap-2 [&_svg]:size-4',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    leadingIcon,
    trailingIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={cn(
        'inline-flex items-center justify-center font-sans transition-all duration-150 cursor-pointer select-none outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--studio-focus-ring,#ea580c)] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className='animate-spin' aria-hidden='true' /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  'aria-label': string;
  variant?: 'ghost' | 'secondary';
  size?: ButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  loading?: boolean;
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'size-8 min-h-[32px] min-w-[32px] p-1.5 [&_svg]:size-3.5',
  md: 'size-9 min-h-[36px] min-w-[36px] p-2 [&_svg]:size-4',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    'aria-label': ariaLabel,
    variant = 'ghost',
    size = 'md',
    icon,
    children,
    loading = false,
    disabled,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={cn(
        'inline-flex items-center justify-center font-sans rounded-full transition-all duration-150 cursor-pointer select-none outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--studio-focus-ring,#ea580c)] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
        variantClasses[variant],
        iconSizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className='animate-spin' aria-hidden='true' /> : (icon ?? children)}
    </button>
  );
});
