import React, { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  'primary' | 'secondary' | 'ai' | 'success' | 'warning' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#EA580C] text-white shadow-soft-sm hover:bg-[#C2410C] active:scale-[0.98] focus-visible:outline-[#EA580C]',
  secondary:
    'border border-[#E7E5E4] bg-white text-[#292524] shadow-soft-sm hover:bg-[#F5F5F4] focus-visible:outline-stone-500',
  ai: 'bg-violet-600 text-white shadow-soft-sm hover:bg-violet-700 focus-visible:outline-violet-600',
  success:
    'bg-emerald-600 text-white shadow-soft-sm hover:bg-emerald-700 focus-visible:outline-emerald-600',
  warning:
    'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 focus-visible:outline-amber-600',
  danger:
    'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 focus-visible:outline-rose-600',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-100 focus-visible:outline-stone-500',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 py-1 text-xs',
  md: 'min-h-9 px-4 py-1.5 text-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

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
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden='true' className='animate-spin' /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

export interface IconButtonProps extends Omit<
  ButtonProps,
  'children' | 'leadingIcon' | 'trailingIcon' | 'variant'
> {
  'aria-label': string;
  icon: React.ReactNode;
  variant?: Extract<ButtonVariant, 'ghost' | 'secondary'>;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 'md', variant = 'ghost', className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size={size}
      variant={variant}
      className={cn(size === 'sm' ? 'size-8 min-h-8 p-0' : 'size-9 min-h-9 p-0', className)}
      {...props}
    >
      {icon}
    </Button>
  );
});
