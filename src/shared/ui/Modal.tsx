import React, { forwardRef, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOverlayRoot, useEscapeKey, useFocusTrap } from './hooks';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends Omit<React.DialogHTMLAttributes<HTMLDialogElement>, 'title'> {
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

export const Modal = forwardRef<HTMLDialogElement, ModalProps>(function Modal(
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Fallback keyboard handling cho JSDOM & môi trường thiếu native dialog events
  useEscapeKey(isOpen && dismissible, onClose);
  useFocusTrap(dialogRef, isOpen, initialFocusRef);

  // Đồng bộ trạng thái isOpen với native dialog showModal / close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      }
    } else {
      if (dialog.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
        }
      }
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
        previouslyFocusedRef.current = null;
      }
    }
  }, [isOpen, initialFocusRef]);

  // Khôi phục focus khi unmount
  useEffect(() => {
    return () => {
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, []);

  // Xử lý sự kiện cancel gốc của browser (<dialog>)
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    if (!dismissible) {
      event.preventDefault();
    } else {
      onClose();
    }
  };

  // Light dismiss khi bấm vào vùng backdrop (native dialog backdrop click targets the dialog itself)
  const handleMouseDown = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (!dismissible) return;
    if (event.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen && typeof document !== 'undefined') return null;

  return createPortal(
    <dialog
      {...nativeProps}
      ref={(node) => {
        (dialogRef as React.MutableRefObject<HTMLDialogElement | null>).current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as React.MutableRefObject<HTMLDialogElement | null>).current = node;
      }}
      closedby={dismissible ? 'any' : 'none'}
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      data-testid={
        backdropTestId ?? (nativeProps as Record<string, string | undefined>)['data-testid']
      }
      className={cn(
        'pf-modal-dialog ux fixed inset-0 m-auto flex flex-col p-0',
        'border border-[var(--studio-line)] bg-[var(--studio-surface-3)] text-[var(--studio-ink)]',
        'rounded-[var(--studio-radius-lg)] shadow-[var(--studio-shadow-3)]',
        'max-h-[calc(100dvh-32px)] w-full overflow-hidden',
        'backdrop:bg-[color-mix(in_srgb,var(--studio-ink)_60%,transparent)] backdrop:backdrop-blur-xs',
        'backdrop:overscroll-contain overscroll-contain',
        layer === 'confirm' ? 'z-[calc(var(--studio-z-modal)+1)]' : 'z-[var(--studio-z-modal)]',
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
            onClick={onClose}
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
    </dialog>,
    getOverlayRoot(),
  );
});
