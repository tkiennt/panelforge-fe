import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { BibleEntryRevisionDto } from '@/services/bible.service';
import { Modal } from '@/shared/ui';

interface ReworkModalProps {
  isOpen: boolean;
  targetRev: BibleEntryRevisionDto | null;
  entityName: string;
  isSubmitting: boolean;
  titleOverride?: string;
  reasonLabelOverride?: string;
  reasonPlaceholderOverride?: string;
  reasonHelpOverride?: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const ReworkModal: React.FC<ReworkModalProps> = React.memo(
  ({
    isOpen,
    targetRev,
    entityName,
    isSubmitting,
    titleOverride,
    reasonLabelOverride,
    reasonPlaceholderOverride,
    reasonHelpOverride,
    onClose,
    onSubmit,
  }) => {
    const { t } = useTranslation();
    const [localReason, setLocalReason] = useState('');

    useEffect(() => {
      if (isOpen) {
        setLocalReason('');
      }
    }, [isOpen]);

    if (!isOpen || !targetRev) return null;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size='sm'
        closeLabel={t('common.actions.close')}
        data-child-modal='true'
        title={titleOverride || t('bible.reworkModal.title')}
        description={t('bible.reworkModal.targetInfo', {
          version: targetRev.versionNumber,
          name: entityName,
        })}
        footer={
          <>
            <button
              type='button'
              onClick={onClose}
              className='px-3.5 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer'
            >
              {t('bible.reworkModal.cancel')}
            </button>
            <button
              type='button'
              disabled={!localReason.trim() || isSubmitting}
              onClick={() => void onSubmit(localReason)}
              className='px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer'
            >
              <MessageSquare className='w-3.5 h-3.5' />
              <span>
                {isSubmitting ? t('bible.reworkModal.submitting') : t('bible.reworkModal.submit')}
              </span>
            </button>
          </>
        }
      >
        <div>
          <label className='block text-xs font-semibold text-stone-800 mb-1.5'>
            {reasonLabelOverride || t('bible.reworkModal.reasonLabel')}
          </label>
          <textarea
            rows={4}
            required
            autoFocus
            placeholder={reasonPlaceholderOverride || t('bible.reworkModal.reasonPlaceholder')}
            value={localReason}
            onChange={(e) => setLocalReason(e.target.value)}
            className='w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-rose-500 resize-none'
          />
          <p className='text-xs text-stone-500 mt-1'>
            {reasonHelpOverride || t('bible.reworkModal.reasonHelp')}
          </p>
        </div>
      </Modal>
    );
  },
);
ReworkModal.displayName = 'ReworkModal';
