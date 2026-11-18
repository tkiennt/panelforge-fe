import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export type ConfirmDialogVariant = 'default' | 'danger' | 'type-to-confirm';

export interface ConfirmDialogProps {
  isOpen: boolean;
  variant?: ConfirmDialogVariant;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  confirmationText?: string;
  confirmationInputLabel?: string;
  dismissible?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  variant = 'default',
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  confirmationText,
  confirmationInputLabel,
  dismissible = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const settledRef = useRef(false);
  const requiresText = variant === 'type-to-confirm';
  const matched = !requiresText || (!!confirmationText && typedValue === confirmationText);
  useEffect(() => {
    if (!isOpen) settledRef.current = false;
    else setTypedValue('');
  }, [isOpen]);
  const settle = (result: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    (result ? onConfirm : onCancel)();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      description={description}
      size='sm'
      layer='confirm'
      dismissible={dismissible}
      closeLabel={closeLabel}
      onClose={() => settle(false)}
      initialFocusRef={cancelRef}
      data-testid={requiresText ? 'type-to-confirm-modal' : 'lucian-confirm-modal'}
      footer={
        <>
          <button
            ref={cancelRef}
            type='button'
            onClick={() => settle(false)}
            className='pf-delete-btn-cancel'
            data-testid={requiresText ? 'confirm-delete-cancel-btn' : 'confirm-cancel-btn'}
          >
            {cancelLabel}
          </button>
          <button
            type='button'
            disabled={!matched}
            onClick={() => settle(true)}
            className='pf-delete-btn-confirm'
            data-testid={requiresText ? 'confirm-delete-submit-btn' : 'confirm-accept-btn'}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {variant === 'danger' && (
        <div className='mb-4 flex items-center gap-2 text-[var(--studio-status-danger)]'>
          <AlertTriangle className='size-5' aria-hidden='true' />
        </div>
      )}
      {requiresText && confirmationText && (
        <div className='space-y-3'>
          <code className='pf-delete-target-preview' data-testid='target-name-preview'>
            {confirmationText}
          </code>
          <label className='block text-sm font-semibold'>
            <span>{confirmationInputLabel}</span>
            <input
              className='pf-delete-input mt-2'
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              autoComplete='off'
              data-testid='confirm-delete-input'
            />
          </label>
        </div>
      )}
    </Modal>
  );
}
