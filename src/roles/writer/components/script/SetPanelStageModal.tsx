// src/roles/writer/components/script/SetPanelStageModal.tsx
import React, { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ChapterCastItemDto } from '@/services/chapterCast.service';
import { Modal } from '@/shared/ui';

interface SetPanelStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: { pageNumber: number; panels: { panelNumber: number }[] }[];
  entities: ChapterCastItemDto[];
  onApply: (
    pageNumber: number,
    panelNumber: number,
    castRevisions:
      | {
          bibleEntryId: string;
          revisionId: string;
          entryName: string;
          variantLabel?: string;
          versionNumber: number;
        }[]
      | null,
  ) => void;
  t?: (key: string, defaultVal?: string) => string;
}

export const SetPanelStageModal: React.FC<SetPanelStageModalProps> = ({
  isOpen,
  onClose,
  pages,
  entities,
  onApply,
  t: propT,
}) => {
  const { t: i18nT } = useTranslation();
  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const [selectedPageNo, setSelectedPageNo] = useState<number>(pages[0]?.pageNumber || 1);
  const [selectedPanelNo, setSelectedPanelNo] = useState<number>(1);
  const [selectedEntryId, setSelectedEntryId] = useState<string>(entities[0]?.bibleEntryId || '');
  const [selectedRevId, setSelectedRevId] = useState<string>('');

  const currentEntity = entities.find((e) => e.bibleEntryId === selectedEntryId);
  const availableRevisions = currentEntity?.availableRevisions || [];

  const handleApply = () => {
    if (!currentEntity || !selectedRevId) return;
    const rev = availableRevisions.find((r) => r.revisionId === selectedRevId);
    if (!rev) return;

    onApply(selectedPageNo, selectedPanelNo, [
      {
        bibleEntryId: currentEntity.bibleEntryId,
        revisionId: rev.revisionId,
        entryName: currentEntity.name,
        variantLabel: rev.variantLabel || `v${rev.versionNumber}`,
        versionNumber: rev.versionNumber,
      },
    ]);
    onClose();
  };

  const handleClear = () => {
    onApply(selectedPageNo, selectedPanelNo, null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='sm'
      closeLabel={t('common.close', 'Đóng')}
      title={t('production.cast.panelStageTitle', 'Đặt giai đoạn riêng cho Panel')}
      description={t('writer.cast.panelStageDesc')}
      footer={
        <div className='flex w-full items-center justify-between gap-2'>
          <button
            type='button'
            onClick={handleClear}
            className='px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors'
          >
            <Trash2 className='w-3.5 h-3.5' />
            {t('production.cast.clearPanelStage', 'Gỡ giai đoạn riêng')}
          </button>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-semibold cursor-pointer transition-colors'
            >
              {t('common.cancel', 'Huỷ')}
            </button>
            <button
              type='button'
              disabled={!selectedEntryId || !selectedRevId}
              onClick={handleApply}
              className='px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Check className='w-3.5 h-3.5' />
              {t('common.apply', 'Áp dụng')}
            </button>
          </div>
        </div>
      }
    >
      <div className='space-y-4 text-xs'>
        {/* 1. Chọn Trang & Panel */}
        <div>
          <label className='font-semibold text-stone-700 block mb-1.5'>
            {t('production.cast.selectPanel', 'Chọn Trang & Panel')}
          </label>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <span className='text-[10px] text-stone-400 block mb-0.5'>
                {t('production.cast.pageLabel', 'Trang:')}
              </span>
              <select
                value={selectedPageNo}
                onChange={(e) => {
                  const pNo = Number(e.target.value);
                  setSelectedPageNo(pNo);
                  setSelectedPanelNo(1);
                }}
                className='w-full p-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 font-medium'
              >
                {pages.map((p) => (
                  <option key={p.pageNumber} value={p.pageNumber}>
                    {t(
                      'production.cast.pageOption',
                      { number: p.pageNumber },
                      `Trang ${p.pageNumber}`,
                    )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className='text-[10px] text-stone-400 block mb-0.5'>
                {t('production.cast.panelLabel', 'Panel:')}
              </span>
              <select
                value={selectedPanelNo}
                onChange={(e) => setSelectedPanelNo(Number(e.target.value))}
                className='w-full p-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 font-medium'
              >
                {Array.from(
                  {
                    length: pages.find((p) => p.pageNumber === selectedPageNo)?.panels.length || 1,
                  },
                  (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {t('production.cast.panelOption', { number: i + 1 }, `Panel ${i + 1}`)}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Chọn Thực thể */}
        <div>
          <label className='font-semibold text-stone-700 block mb-1.5'>
            {t('production.cast.selectEntity', 'Thực thể Series Bible')}
          </label>
          <select
            value={selectedEntryId}
            onChange={(e) => {
              setSelectedEntryId(e.target.value);
              setSelectedRevId('');
            }}
            className='w-full p-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 font-medium'
          >
            <option value=''>
              {t('production.cast.selectEntityPlaceholder', '-- Chọn thực thể --')}
            </option>
            {entities.map((e) => (
              <option key={e.bibleEntryId} value={e.bibleEntryId}>
                {e.name} ({e.code || 'BIBLE'})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Chọn Bản / Biến thể */}
        {selectedEntryId && (
          <div>
            <label className='font-semibold text-stone-700 block mb-1.5'>
              {t('production.cast.selectRevision', 'Bản tạo hình / Biến thể')}
            </label>
            {availableRevisions.length === 0 ? (
              <p className='text-stone-400 italic py-1'>
                {t('production.cast.noRevisionsForEntity', 'Mục này chưa có bản tạo hình nào.')}
              </p>
            ) : (
              <select
                value={selectedRevId}
                onChange={(e) => setSelectedRevId(e.target.value)}
                className='w-full p-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 font-medium'
              >
                <option value=''>
                  {t('production.cast.selectRevisionPlaceholder', '-- Chọn bản --')}
                </option>
                {availableRevisions.map((r) => (
                  <option key={r.revisionId} value={r.revisionId}>
                    v{r.versionNumber} ·{' '}
                    {r.variantLabel || t('production.cast.defaultVariant', 'Mặc định')} (
                    {r.isCanonLocked ? 'CanonLocked' : r.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
