import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog } from '@/shared/ui';
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

export function LucianConfirmModal({
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'danger',
  onConfirm,
  onCancel,
}: LucianConfirmModalProps) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={title}
      description={description}
      variant={variant === 'danger' ? 'danger' : 'default'}
      confirmLabel={confirmText ?? t('common.actions.confirm', 'Continue')}
      cancelLabel={cancelText ?? t('common.actions.cancel', 'Cancel')}
      closeLabel={t('common.actions.close', 'Close')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
