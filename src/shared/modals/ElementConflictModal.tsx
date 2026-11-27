import React from 'react';
import { RefreshCw, ArrowRight, ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';

export interface ElementConflictModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  entityType?: string;
  elementId?: string;
  errorMessage?: string;
  onReload: () => void;
  onForceOverwrite?: () => void;
  onClose: () => void;
}

export const ElementConflictModal: React.FC<ElementConflictModalProps> = ({
  isOpen,
  title,
  subtitle,
  entityType,
  elementId,
  errorMessage,
  onReload,
  onForceOverwrite,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const currentEntity = entityType || t('common.modals.elementConflict.defaultEntity');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='md'
      title={title || t('common.modals.elementConflict.title')}
      description={subtitle || 'Optimistic Concurrency Control — ELEMENT_VERSION_CONFLICT'}
    >
      <div className='bg-white rounded-2xl border border-red-200 shadow-2xl max-w-lg w-full p-6 space-y-4'>
        {/* Content */}
        <div className='space-y-3 text-xs'>
          <div className='p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 space-y-1.5'>
            <div className='font-bold flex items-center gap-1.5'>
              <ShieldAlert className='w-4 h-4 text-amber-600' />
              <span>
                {t('common.modals.elementConflict.updatedByOther', { entity: currentEntity })}
              </span>
            </div>
            <p className='text-xs text-amber-800 leading-relaxed'>
              {t('common.modals.elementConflict.description')}
            </p>
            {elementId && (
              <div className='text-xs font-mono text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded'>
                {entityType ? `${entityType} ID:` : 'Element ID:'} {elementId}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className='p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-600 font-mono text-xs'>
              {t('common.modals.elementConflict.serverMessage', { message: errorMessage })}
            </div>
          )}

          <p className='text-[#555555] font-medium'>
            {t('common.modals.elementConflict.chooseResolution')}
          </p>

          <div className='space-y-2 pt-1'>
            {/* Option 1: Reload */}
            <button
              onClick={() => {
                onReload();
                onClose();
              }}
              className='w-full p-3 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left flex items-center justify-between group transition-all cursor-pointer'
            >
              <div>
                <div className='font-bold text-blue-900 flex items-center gap-1.5'>
                  <RefreshCw className='w-3.5 h-3.5 text-blue-600 group-hover:rotate-180 transition-transform duration-300' />
                  <span>{t('common.modals.elementConflict.reloadTitle')}</span>
                </div>
                <div className='text-xs text-blue-700 mt-0.5'>
                  {t('common.modals.elementConflict.reloadDesc')}
                </div>
              </div>
              <ArrowRight className='w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform' />
            </button>

            {/* Option 2: Force Overwrite (if supported) */}
            {onForceOverwrite && (
              <button
                onClick={() => {
                  onForceOverwrite();
                  onClose();
                }}
                className='w-full p-3 bg-red-50/50 hover:bg-red-100/60 border border-red-200 rounded-xl text-left flex items-center justify-between group transition-all cursor-pointer'
              >
                <div>
                  <div className='font-bold text-red-900'>
                    {t('common.modals.elementConflict.overwriteTitle')}
                  </div>
                  <div className='text-xs text-red-700 mt-0.5'>
                    {t('common.modals.elementConflict.overwriteDesc')}
                  </div>
                </div>
                <ArrowRight className='w-4 h-4 text-red-600 group-hover:translate-x-1 transition-transform' />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex justify-end pt-2 border-t border-[#E7E7E7]'>
          <button
            onClick={onClose}
            className='px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer'
          >
            {t('common.actions.close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const ConflictResolutionModal = ElementConflictModal;
export default ElementConflictModal;
