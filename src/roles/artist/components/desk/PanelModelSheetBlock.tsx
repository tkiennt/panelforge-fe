import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Sparkles, Loader2, AlertCircle, BookOpen, User, ExternalLink, X } from 'lucide-react';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { Modal } from '@/shared/ui';

export interface PanelModelSheetBlockProps {
  panelId?: string | null;
  panelNumber?: number | null;
  hasOwnStage?: boolean;
  panelStage?: string | null;
  className?: string;
  onSelectEntry?: (entry: BibleEntryDto) => void;
}

export const PanelModelSheetBlock: React.FC<PanelModelSheetBlockProps> = ({
  panelId,
  panelNumber,
  hasOwnStage = false,
  panelStage,
  className = '',
  onSelectEntry,
}) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<BibleEntryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<BibleEntryDto | null>(null);

  const fetchPanelBible = useCallback(async () => {
    if (!panelId) {
      setEntries([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await bibleService.getPanelBible(panelId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg =
        err?.message ||
        t('bible.panelModelSheet.error', 'Không thể tải Model Sheet cho khung này.');
      setError(msg);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [panelId, t]);

  useEffect(() => {
    let isCancelled = false;

    if (!panelId) {
      setEntries([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    bibleService
      .getPanelBible(panelId)
      .then((data) => {
        if (!isCancelled) {
          setEntries(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          const msg =
            err?.message ||
            t('bible.panelModelSheet.error', 'Không thể tải Model Sheet cho khung này.');
          setError(msg);
          setEntries([]);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [panelId, t]);

  // Không chọn khung nào
  if (!panelId) {
    return (
      <div
        data-testid='panel-model-sheet-no-panel'
        className={`p-3 rounded-xl border border-stone-200/80 bg-stone-50/50 text-center text-xs text-stone-400 font-sans ${className}`}
      >
        <BookOpen className='w-4 h-4 mx-auto mb-1 text-stone-300 stroke-[1.5]' />
        <p>{t('bible.drawer.noPanelSelection', 'Chưa chọn khung tranh')}</p>
      </div>
    );
  }

  // Trạng thái đang tải
  if (isLoading) {
    return (
      <div
        data-testid='panel-model-sheet-loading'
        className={`p-4 rounded-xl border border-stone-200/80 bg-stone-50/60 flex items-center justify-center gap-2 text-xs text-stone-500 font-sans ${className}`}
      >
        <Loader2 className='w-4 h-4 animate-spin text-[#F97316]' />
        <span>{t('bible.panelModelSheet.loading', 'Đang tải Model Sheet...')}</span>
      </div>
    );
  }

  // Trạng thái lỗi
  if (error) {
    return (
      <div
        data-testid='panel-model-sheet-error'
        className={`p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 flex flex-col gap-2 text-xs font-sans ${className}`}
      >
        <div className='flex items-center gap-2 text-rose-700'>
          <AlertCircle className='w-4 h-4 shrink-0 text-rose-600' />
          <span className='font-medium'>
            {t('bible.panelModelSheet.error', 'Không thể tải Model Sheet cho khung này.')}
          </span>
        </div>
        <button
          type='button'
          data-testid='panel-model-sheet-retry-btn'
          onClick={fetchPanelBible}
          className='self-start px-2.5 py-1 rounded-md bg-white border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs'
        >
          {t('bible.panelModelSheet.retry', 'Thử lại')}
        </button>
      </div>
    );
  }

  // Trạng thái rỗng
  if (entries.length === 0) {
    return (
      <div
        data-testid='panel-model-sheet-empty'
        className={`p-4 rounded-xl border border-dashed border-stone-200 bg-white text-center text-xs text-stone-400 font-sans ${className}`}
      >
        <BookOpen className='w-5 h-5 mx-auto mb-1.5 text-stone-300 stroke-[1.5]' />
        <p>{t('bible.panelModelSheet.empty', 'Khung này chưa có Model Sheet tham chiếu.')}</p>
      </div>
    );
  }

  // Danh sách Model Sheet tham chiếu
  return (
    <div data-testid='panel-model-sheet-block' className={`space-y-2.5 font-sans ${className}`}>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 text-stone-700'>
          <div className='w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center text-violet-700 shrink-0'>
            <Sparkles className='w-3.5 h-3.5' />
          </div>
          <span className='text-xs font-bold uppercase tracking-wider text-stone-700'>
            {t('bible.panelModelSheet.title', 'Model Sheet tham chiếu')}
            {panelNumber !== undefined && panelNumber !== null && (
              <span className='ml-1 text-[#F97316] font-mono'>#{panelNumber}</span>
            )}
          </span>
        </div>
        <span className='text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200/80'>
          {entries.length}
        </span>
      </div>

      <div className='space-y-2'>
        {entries.map((entry) => {
          const rev = entry.effectiveRevision;
          const imageUrl =
            entry.referenceImageUrl || rev?.conceptImageUrl || rev?.referenceImageUrl;
          const rawVariantLabel = rev?.stageName;
          const variantName =
            rawVariantLabel || t('bible.panelModelSheet.defaultVariant', 'Mặc định');
          const versionNum = rev?.versionNumber ?? 1;

          // Kiểm tra xem Panel có giai đoạn riêng hay không
          const isPanelSpecificStage = Boolean(
            hasOwnStage ||
            panelStage ||
            (rawVariantLabel &&
              rawVariantLabel.toLowerCase() !== 'default' &&
              rawVariantLabel.toLowerCase() !== 'mặc định'),
          );

          const stageLabel = isPanelSpecificStage
            ? t(
                'bible.panelModelSheet.stageLabel',
                {
                  variant: variantName,
                  version: versionNum,
                },
                `Flashback - ${variantName} v${versionNum}`,
              )
            : t(
                'bible.panelModelSheet.normalLabel',
                {
                  variant: variantName,
                  version: versionNum,
                },
                `${variantName} v${versionNum}`,
              );

          return (
            <div
              key={entry.id}
              data-testid={`panel-model-sheet-item-${entry.id}`}
              onClick={() => {
                onSelectEntry?.(entry);
                setPreviewEntry(entry);
              }}
              className='p-2.5 rounded-xl border border-stone-200/80 bg-white hover:border-[#F97316]/50 hover:shadow-2xs transition-all cursor-pointer flex items-start gap-2.5 group'
            >
              {/* Ảnh Model Sheet / Avatar */}
              <div className='w-12 h-12 rounded-lg overflow-hidden bg-stone-50 border border-stone-200 shrink-0 flex items-center justify-center relative'>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={entry.name}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                    data-testid='model-sheet-image'
                  />
                ) : (
                  <User
                    className='w-5 h-5 text-stone-300 stroke-[1.5]'
                    data-testid='model-sheet-no-image-icon'
                  />
                )}
                <span className='absolute bottom-0 right-0 px-1 py-0.2 rounded-tl bg-black/75 text-[9px] font-mono font-bold text-white leading-none'>
                  v{versionNum}
                </span>
              </div>

              {/* Thông tin thực thể & Biến thể tạo hình */}
              <div className='flex-1 min-w-0 space-y-1'>
                <div className='flex items-center justify-between gap-1.5'>
                  <h4
                    data-testid='model-sheet-entry-name'
                    className='text-xs font-bold text-stone-900 truncate'
                    title={`${entry.name} — ${variantName} (v${versionNum})`}
                  >
                    <span>{entry.name}</span>
                    <span className='font-normal text-stone-500 font-sans'>
                      {' '}
                      — {variantName} (v{versionNum})
                    </span>
                  </h4>
                  <ExternalLink className='w-3 h-3 text-stone-300 group-hover:text-[#F97316] transition-colors shrink-0' />
                </div>

                {/* Nhãn biến thể: "Flashback - <variant> v1" hoặc "<variant> v1" */}
                <div className='flex items-center gap-1.5 flex-wrap'>
                  <span
                    data-testid='model-sheet-stage-label'
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium border ${
                      isPanelSpecificStage
                        ? 'bg-violet-50 text-violet-700 border-violet-200/80 font-bold'
                        : 'bg-stone-50 text-stone-600 border-stone-200/80'
                    }`}
                  >
                    {stageLabel}
                  </span>
                </div>

                {/* Age & Artist Notes nếu có */}
                {entry.age && (
                  <p className='text-xs text-amber-700 font-medium truncate font-sans'>
                    {t('bible.spec.fields.age.label', 'Tuổi')}: {entry.age}
                  </p>
                )}
                {entry.artistNotes && (
                  <p className='text-xs text-stone-500 line-clamp-2 font-sans'>
                    {entry.artistNotes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Preview Modal khi click xem chi tiết */}
      <Modal
        isOpen={Boolean(previewEntry)}
        onClose={() => setPreviewEntry(null)}
        size='sm'
        closeLabel={t('artist.common.close')}
        data-testid='panel-model-sheet-preview-modal'
        title={
          <div>
            <h3 className='font-bold text-sm text-stone-900'>{previewEntry?.name}</h3>
          </div>
        }
      >
        {previewEntry && (
          <div className='p-2 space-y-3 font-sans'>
            <button
              type='button'
              data-testid='panel-model-sheet-modal-close-btn'
              onClick={() => setPreviewEntry(null)}
              className='hidden'
            >
              <X className='w-4 h-4' />
            </button>

            {/* Ảnh lớn */}
            <div className='w-full h-52 rounded-xl bg-stone-50 border border-stone-200 overflow-hidden flex items-center justify-center'>
              {previewEntry.referenceImageUrl || previewEntry.effectiveRevision?.conceptImageUrl ? (
                <img
                  src={
                    previewEntry.referenceImageUrl ||
                    previewEntry.effectiveRevision?.conceptImageUrl ||
                    ''
                  }
                  alt={previewEntry.name}
                  className='w-full h-full object-contain'
                />
              ) : (
                <div className='text-center text-stone-400 space-y-1'>
                  <User className='w-10 h-10 mx-auto text-stone-300' />
                  <p className='text-xs'>{t('bible.panelModelSheet.noImage', 'Chưa có ảnh')}</p>
                </div>
              )}
            </div>

            {/* Chi tiết biến thể & phiên bản */}
            <div className='space-y-1.5 text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200'>
              <div className='flex items-center justify-between'>
                <span className='text-stone-500 font-medium'>
                  {t('bible.panelModelSheet.variant', 'Biến thể')}:
                </span>
                <span className='font-semibold text-stone-800'>
                  {previewEntry.effectiveRevision?.stageName ||
                    t('bible.panelModelSheet.defaultVariant', 'Mặc định')}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-stone-500 font-medium'>
                  {t('bible.panelModelSheet.revision', 'Bản')}:
                </span>
                <span className='font-mono font-bold text-stone-800'>
                  v{previewEntry.effectiveRevision?.versionNumber ?? 1}
                </span>
              </div>
              {previewEntry.age && (
                <div className='flex items-center justify-between pt-1 border-t border-stone-200'>
                  <span className='text-stone-500 font-medium'>
                    {t('bible.spec.fields.age.label', 'Tuổi')}:
                  </span>
                  <span className='font-semibold text-stone-800'>{previewEntry.age}</span>
                </div>
              )}
            </div>

            {previewEntry.artistNotes && (
              <div className='text-xs text-stone-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60 space-y-1'>
                <span className='font-bold text-amber-900 block'>
                  {t('bible.spec.fields.artistNotes.label', 'Ghi chú cho Artist')}:
                </span>
                <p className='whitespace-pre-line leading-relaxed'>{previewEntry.artistNotes}</p>
              </div>
            )}

            {previewEntry.description && (
              <p className='text-xs text-stone-600 leading-relaxed max-h-24 overflow-y-auto'>
                {previewEntry.description}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
