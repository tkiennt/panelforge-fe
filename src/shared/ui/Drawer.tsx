import React, { forwardRef, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOverlayRoot, useBodyScrollLock, useEscapeKey, useFocusTrap } from './hooks';

export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  placement?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
  closeLabel: string;
  onClose: () => void;
  backdropTestId?: string;
}

const widths = { sm: 'max-w-[360px]', md: 'max-w-[420px]', lg: 'max-w-[560px]' };

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(
  {
    isOpen,
    title,
    children,
    footer,
    placement = 'right',
    size = 'md',
    dismissible = true,
    closeLabel,
    onClose,
    className,
    backdropTestId,
    ...nativeProps
  },
  forwardedRef,
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeOnce = useRef(false);
  const titleId = useId();
  const close = () => {
    if (closeOnce.current) return;
    closeOnce.current = true;
    onClose();
  };
  if (isOpen) closeOnce.current = false;
  useEscapeKey(isOpen && dismissible, close);
  useBodyScrollLock(isOpen);
  useFocusTrap(panelRef, isOpen);
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'ux fixed inset-0 flex bg-[color-mix(in_srgb,var(--studio-ink)_60%,transparent)] backdrop-blur-xs z-[var(--studio-z-drawer)] motion-safe:animate-[shared-backdrop-in_var(--studio-motion-overlay)_var(--studio-ease-standard)]',
        placement === 'right' && 'justify-end',
      )}
      data-testid={backdropTestId}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) close();
      }}
    >
      <div
        {...nativeProps}
        ref={(node) => {
          panelRef.current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex h-full w-full flex-col border-[var(--studio-line)] bg-[var(--studio-surface-3)] shadow-[var(--studio-shadow-3)]',
          placement === 'left' ? 'border-r' : 'border-l',
          placement === 'left'
            ? 'motion-safe:animate-[shared-drawer-left-in_var(--studio-motion-overlay)_var(--studio-ease-standard)]'
            : 'motion-safe:animate-[shared-drawer-right-in_var(--studio-motion-overlay)_var(--studio-ease-standard)]',
          widths[size],
          className,
        )}
      >
        <header className='flex min-h-14 items-center justify-between bg-head-wash border-b border-head-line px-5'>
          <h2 id={titleId} className='font-serif text-base font-bold'>
            {title}
          </h2>
          {dismissible && (
            <button
              type='button'
              aria-label={closeLabel}
              onClick={close}
              className='grid size-9 place-items-center rounded-[var(--studio-radius-sm)] hover:bg-[var(--studio-surface-2)]'
            >
              <X className='size-4' aria-hidden='true' />
            </button>
          )}
        </header>
        <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
        {footer && <footer className='border-t border-[var(--studio-line)] p-4'>{footer}</footer>}
      </div>
    </div>,
    getOverlayRoot(),
  );
});
