// Admin-only UI primitives. Shared ui/Button uses near-black variants used by
// production roles, so admin gets its own light variants here instead.
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  SearchX,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFocusRing, type AdminToastState } from './adminUiStyles';

const BUTTON_VARIANTS = {
  primary:
    'bg-admin-accent text-admin-ink-strong hover:bg-admin-accent-hover border border-transparent',
  secondary:
    'bg-admin-field text-admin-ink border border-admin-line hover:bg-admin-hover hover:border-[#c9c1b1]',
  ghost:
    'bg-transparent text-admin-muted border border-transparent hover:bg-admin-hover hover:text-admin-ink',
  danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
} as const;

export interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md' | 'icon';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading,
      icon,
      className,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        adminFocusRing,
        BUTTON_VARIANTS[variant],
        size === 'md' && 'min-h-11 px-4 text-sm',
        size === 'sm' && 'min-h-9 px-3 text-xs',
        size === 'icon' && 'h-11 w-11 p-0 shrink-0',
        className,
      )}
      {...props}
    >
      {isLoading ? <Loader2 className='w-4 h-4 animate-spin' aria-hidden /> : icon}
      {children}
    </button>
  ),
);
AdminButton.displayName = 'AdminButton';

export const AdminField: React.FC<{
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, required, hint, error, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={htmlFor} className='block text-sm font-semibold text-admin-ink'>
      {label}
      {required && (
        <span className='text-red-600 ml-0.5' aria-hidden>
          *
        </span>
      )}
    </label>
    {children}
    {error ? (
      <p className='text-xs text-red-700 flex items-center gap-1' role='alert'>
        <AlertCircle className='w-3.5 h-3.5 shrink-0' aria-hidden />
        {error}
      </p>
    ) : (
      hint && <p className='text-xs text-admin-muted'>{hint}</p>
    )}
  </div>
);

export const AdminPageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
    <div className='min-w-0'>
      <h1 className='font-serif text-2xl font-bold text-admin-ink-strong tracking-tight'>
        {title}
      </h1>
      {description && <p className='mt-1 text-sm text-admin-muted max-w-2xl'>{description}</p>}
    </div>
    {actions && <div className='flex flex-wrap items-center gap-2 shrink-0'>{actions}</div>}
  </div>
);

export const AdminCard: React.FC<{
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, description, actions, className, bodyClassName, children }) => (
  <section className={cn('bg-admin-card border border-admin-line rounded-2xl', className)}>
    {(title || actions) && (
      <header className='flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-admin-line'>
        <div className='min-w-0'>
          {title && <h2 className='text-base font-semibold text-admin-ink-strong'>{title}</h2>}
          {description && <p className='mt-0.5 text-sm text-admin-muted'>{description}</p>}
        </div>
        {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
      </header>
    )}
    <div className={cn('p-5', bodyClassName)}>{children}</div>
  </section>
);

export const AdminStat: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ label, value, hint, icon }) => (
  <div className='bg-admin-card border border-admin-line rounded-2xl p-5'>
    <div className='flex items-center justify-between gap-2'>
      <span className='text-sm font-medium text-admin-muted'>{label}</span>
      {icon && (
        <span className='text-admin-accent-text' aria-hidden>
          {icon}
        </span>
      )}
    </div>
    <div className='mt-2 text-2xl font-semibold text-admin-ink-strong tabular-nums'>{value}</div>
    {hint && <div className='mt-1 text-xs text-admin-muted'>{hint}</div>}
  </div>
);

const TONES = {
  neutral: 'bg-admin-subtle text-admin-ink border-admin-line',
  accent: 'bg-admin-accent-soft text-admin-accent-text border-[#fdba74]',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
} as const;
export type AdminTone = keyof typeof TONES;

export const AdminBadge: React.FC<{
  tone?: AdminTone;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap',
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);

/** Table body row for loading / empty / filtered-empty / error states. */
export const AdminTableState: React.FC<{
  colSpan: number;
  kind: 'loading' | 'empty' | 'no-results' | 'error';
  message: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ colSpan, kind, message, hint, action }) => {
  const Icon =
    kind === 'loading'
      ? Loader2
      : kind === 'error'
        ? AlertCircle
        : kind === 'no-results'
          ? SearchX
          : Inbox;
  return (
    <tr>
      <td colSpan={colSpan} className='py-12 px-4 text-center'>
        <Icon
          className={cn(
            'w-6 h-6 mx-auto mb-2',
            kind === 'loading' && 'animate-spin text-admin-accent',
            kind === 'error' ? 'text-red-600' : 'text-admin-muted',
          )}
          aria-hidden
        />
        <div
          className={cn(
            'text-sm font-semibold',
            kind === 'error' ? 'text-red-700' : 'text-admin-ink',
          )}
        >
          {message}
        </div>
        {hint && <div className='text-xs text-admin-muted mt-1'>{hint}</div>}
        {action && <div className='mt-3 flex justify-center'>{action}</div>}
      </td>
    </tr>
  );
};

export const AdminPagination: React.FC<{
  page: number;
  totalPages: number;
  shown: number;
  total: number;
  unit: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, shown, total, unit, disabled, onPageChange }) => (
  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-admin-line text-sm text-admin-muted'>
    <div>
      Hiển thị <span className='font-semibold text-admin-ink tabular-nums'>{shown}</span> /{' '}
      <span className='font-semibold text-admin-ink tabular-nums'>
        {total.toLocaleString('vi-VN')}
      </span>{' '}
      {unit}
    </div>
    <nav className='flex items-center gap-2' aria-label='Phân trang'>
      <AdminButton
        size='icon'
        variant='secondary'
        aria-label='Trang trước'
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        icon={<ChevronLeft className='w-4 h-4' />}
      />
      <span className='px-2 font-medium text-admin-ink tabular-nums'>
        Trang {page} / {Math.max(1, totalPages)}
      </span>
      <AdminButton
        size='icon'
        variant='secondary'
        aria-label='Trang sau'
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        icon={<ChevronRight className='w-4 h-4' />}
      />
    </nav>
  </div>
);

export const AdminModal: React.FC<{
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}> = ({ title, description, onClose, footer, size = 'md', children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans'>
      <div className='absolute inset-0 bg-admin-ink/40' onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative w-full max-h-[calc(100dvh-2rem)] flex flex-col bg-admin-field border border-admin-line rounded-2xl shadow-lg focus:outline-none text-admin-ink',
          size === 'md' ? 'max-w-lg' : 'max-w-3xl',
        )}
      >
        <header className='flex items-start justify-between gap-4 pl-5 pr-3 py-3 border-b border-admin-line'>
          <div className='min-w-0 py-1'>
            <h2 className='text-base font-semibold text-admin-ink-strong'>{title}</h2>
            {description && <div className='mt-0.5 text-sm text-admin-muted'>{description}</div>}
          </div>
          <AdminButton
            size='icon'
            variant='ghost'
            aria-label='Đóng'
            onClick={onClose}
            icon={<X className='w-4 h-4' />}
          />
        </header>
        <div className='flex-1 overflow-y-auto px-5 py-4'>{children}</div>
        {footer && (
          <footer className='flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-admin-line bg-admin-card rounded-b-2xl'>
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
};

export const AdminToast: React.FC<{ toast: AdminToastState; onClose: () => void }> = ({
  toast,
  onClose,
}) => {
  if (!toast) return null;
  const tone =
    toast.type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : toast.type === 'warning'
        ? 'bg-amber-50 border-amber-200 text-amber-900'
        : 'bg-red-50 border-red-200 text-red-800';
  const Icon = toast.type === 'success' ? CheckCircle2 : AlertCircle;
  return createPortal(
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={cn(
        'fixed top-4 right-4 left-4 sm:left-auto z-[110] sm:max-w-sm flex items-start gap-2 pl-4 pr-1 py-1.5 rounded-xl border shadow-md text-sm font-sans',
        tone,
      )}
    >
      <Icon className='w-4 h-4 mt-2 shrink-0' aria-hidden />
      <span className='py-1.5 flex-1'>{toast.message}</span>
      <button
        type='button'
        onClick={onClose}
        aria-label='Đóng thông báo'
        className={cn(
          'h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-admin-ink/5 cursor-pointer',
          adminFocusRing,
        )}
      >
        <X className='w-3.5 h-3.5' />
      </button>
    </div>,
    document.body,
  );
};
