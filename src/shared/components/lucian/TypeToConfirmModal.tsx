import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog } from '@/shared/ui';
import '@/styles/modules/lucian/lucian-269.css';

export interface TypeToConfirmModalProps {
  isOpen: boolean;
  targetName: string;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function TypeToConfirmModal({
  isOpen,
  targetName,
  title,
  description,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onCancel,
  isDeleting,
}: TypeToConfirmModalProps) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      isOpen={isOpen}
      variant='type-to-confirm'
      title={title ?? t('common.dangerZone.confirmDeleteTitle', 'Delete permanently')}
      description={
        description ??
        t(
          'common.dangerZone.confirmDeleteDesc',
          'This action cannot be undone. Type the name below to proceed:',
        )
      }
      confirmationText={targetName}
      confirmationInputLabel={t('common.dangerZone.typeInputLabel', 'Type name to confirm')}
      confirmLabel={confirmButtonText ?? t('common.actions.delete', 'Delete')}
      cancelLabel={cancelButtonText ?? t('common.actions.cancel', 'Cancel')}
      closeLabel={t('common.actions.close', 'Close')}
      dismissible={!isDeleting}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
