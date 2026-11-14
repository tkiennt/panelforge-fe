import React, { forwardRef, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOverlayRoot, useBodyScrollLock, useEscapeKey, useFocusTrap } from './hooks';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  dismissible?: boolean;
  closeLabel: string;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  layer?: 'modal' | 'confirm';
  backdropTestId?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
  full: 'max-w-[calc(100vw-32px)]',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    isOpen,
    title,
    description,
    children,
    footer,
    size = 'md',
    dismissible = true,
    closeLabel,
    onClose,
    initialFocusRef,
    layer = 'modal',
    className,
    backdropTestId,
    ...nativeProps
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeOnce = useRef(false);
  const close = () => {
    if (closeOnce.current) return;
    closeOnce.current = true;
    onClose();
  };
  if (isOpen) closeOnce.current = false;

  useEscapeKey(isOpen && dismissible, close);
  useBodyScrollLock(isOpen);
  useFocusTrap(localRef, isOpen, initialFocusRef);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'ux fixed inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--studio-ink)_60%,transparent)] p-4 backdrop-blur-xs motion-safe:animate-[shared-backdrop-in_var(--studio-motion-overlay)_var(--studio-ease-standard)]',
        layer === 'confirm' ? 'z-[calc(var(--studio-z-modal)+1)]' : 'z-[var(--studio-z-modal)]',
      )}
      data-testid={backdropTestId}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) close();
      }}
    >
      <div
        {...nativeProps}
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-line)] bg-[var(--studio-surface-3)] text-[var(--studio-ink)] shadow-[var(--studio-shadow-3)] motion-safe:animate-[shared-dialog-in_var(--studio-motion-overlay)_var(--studio-ease-standard)]',
          sizeClasses[size],
          className,
        )}
      >
        <header className='relative border-b border-[var(--studio-line)] px-6 py-5 pr-14'>
          <h2 id={titleId} className='font-serif text-lg font-bold'>
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className='mt-1 text-sm text-[var(--studio-ink-muted)]'>
              {description}
            </p>
          )}
          {dismissible && (
            <button
              type='button'
              aria-label={closeLabel}
              onClick={close}
              className='absolute right-4 top-4 grid size-9 place-items-center rounded-[var(--studio-radius-sm)] text-[var(--studio-ink-muted)] hover:bg-[var(--studio-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-focus-ring)]'
            >
              <X className='size-4' aria-hidden='true' />
            </button>
          )}
        </header>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>{children}</div>
        {footer && (
          <footer className='flex justify-end gap-2 border-t border-[var(--studio-line)] px-6 py-4'>
            {footer}
          </footer>
        )}
      </div>
    </div>,
    getOverlayRoot(),
  );
});
