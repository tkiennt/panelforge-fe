/* Lucian UX/UI Prompt #269 & #072 · MIT License (c) 2026 Seokwoo Lee · https://lucianlabs.dev/uxui-prompt */
/* Adapted for PanelForge Editorial AI Studio Quick Confirmation Modal */

import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import '@/styles/modules/lucian/lucian-269.css';

export interface LucianConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const LucianConfirmModal: React.FC<LucianConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const iconBg = isDanger ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#E0F2FE';
  const iconBorder = isDanger ? '#FECACA' : isWarning ? '#FDE68A' : '#BAE6FD';
  const iconColor = isDanger ? '#DC2626' : isWarning ? '#D97706' : '#0284C7';
  const confirmBtnBg = isDanger ? '#DC2626' : isWarning ? '#D97706' : '#2563EB';

  return createPortal(
    <div
      className='pf-delete-overlay'
      role='alertdialog'
      aria-modal='true'
      aria-labelledby={titleId}
      data-testid='lucian-confirm-modal'
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className='pf-delete-card' style={{ maxWidth: '420px' }}>
        <div className='flex items-start justify-between gap-3 mb-2'>
          <div className='pf-delete-header mb-0'>
            <div
              className='pf-delete-icon-box'
              style={{
                background: iconBg,
                borderColor: iconBorder,
                color: iconColor,
              }}
              aria-hidden='true'
            >
              {isDanger ? (
                <AlertTriangle className='w-5 h-5' />
              ) : isWarning ? (
                <AlertCircle className='w-5 h-5' />
              ) : (
                <Info className='w-5 h-5' />
              )}
            </div>
            <h3 id={titleId} className='pf-delete-title text-base sm:text-lg'>
              {title}
            </h3>
          </div>

          <button
            type='button'
            onClick={onCancel}
            aria-label='Đóng'
            className='text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1 rounded-lg'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {description && (
          <p className='pf-delete-desc text-stone-600 dark:text-stone-300 text-sm mt-2 mb-4 leading-relaxed'>
            {description}
          </p>
        )}

        <div className='pf-delete-actions mt-5 flex items-center justify-end gap-2.5'>
          <button
            ref={cancelBtnRef}
            type='button'
            className='pf-delete-btn-cancel'
            onClick={onCancel}
            data-testid='confirm-cancel-btn'
          >
            {cancelText}
          </button>
          <button
            type='button'
            className='pf-delete-btn-confirm'
            style={{ background: confirmBtnBg }}
            onClick={onConfirm}
            data-testid='confirm-accept-btn'
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
