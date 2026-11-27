import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import type { AssetReferenceDto, PanelDto } from '@/types';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { elementService, type ElementSnapshotDto } from '@/services/element.service';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';
import { panelArtworkCoverage } from './collaborationRules';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface SubmitPreviewModalProps {
  chapterId: string;
  pageId: string;
  stageId: string;
  stageName: string;
  panels: PanelDto[];
  artworks: AssetReferenceDto[];
  /** Mốc lần nộp Rejected gần nhất (BR-01) để checklist khớp luật BE. */
  rejectedAt: string | null;
  canSubmit: boolean;
  submitBlockedReason: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Xem trước trang ghép hoàn chỉnh trước khi nộp (Artist). "Xác nhận & Nộp bài" gọi đúng hành động nộp sẵn có;
 * vẫn tôn trọng `canSubmit` do `getWorkActions` quyết định.
 */
export const SubmitPreviewModal: React.FC<SubmitPreviewModalProps> = ({
  chapterId,
  pageId,
  stageId,
  stageName,
  panels,
  artworks,
  rejectedAt,
  canSubmit,
  submitBlockedReason,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation('collaboration');
  const [loading, setLoading] = useState(true);
  const [dataUrl, setDataUrl] = useState('');
  const [mode, setMode] = useState<'page' | 'panels' | 'empty'>('empty');
  const [failedImages, setFailedImages] = useState(0);

  const coverage = useMemo(
    () =>
      panelArtworkCoverage(
        artworks,
        pageId,
        stageId,
        rejectedAt,
        panels.map((p) => p.id),
      ),
    [artworks, pageId, stageId, rejectedAt, panels],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let elements: ElementSnapshotDto[] = [];
      try {
        elements = (await elementService.getPageSnapshot(pageId)).elements ?? [];
      } catch {
        elements = [];
      }
      const result = await buildPageComposite({
        panels,
        artworks,
        elements,
        getAccessUrl: async (assetReferenceId) => {
          const link = await artworkService.getArtworkAccessLink(chapterId, assetReferenceId);
          return resolveArtworkUrl(link.url);
        },
      });
      if (cancelled) return;
      setDataUrl(result.dataUrl);
      setMode(result.mode);
      setFailedImages(result.failedImages);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId, pageId, panels, artworks]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      closeLabel={t('submitPreview.close')}
      size='lg'
      title={t('submitPreview.title')}
      description={stageName}
      data-testid='submit-preview-modal'
      footer={
        <>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer'
          >
            <ArrowLeft className='size-3.5' /> {t('submitPreview.backToEdit')}
          </button>
          <button
            type='button'
            data-testid='submit-preview-confirm'
            disabled={busy || !canSubmit}
            onClick={onConfirm}
            className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
          >
            {busy ? <Loader2 className='size-3.5 animate-spin' /> : <Send className='size-3.5' />}
            {t('submitPreview.confirmSubmit')}
          </button>
        </>
      }
    >
      <div className='space-y-3'>
        <div className='flex min-h-72 justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 p-4'>
          {loading ? (
            <div className='flex items-center gap-2 text-xs text-stone-500 py-20'>
              <Loader2 className='w-4 h-4 animate-spin' /> {t('submitPreview.building')}
            </div>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt={t('submitPreview.compositeAlt')}
              data-testid='submit-preview-image'
              className='bg-white shadow-md block w-auto h-auto max-w-full object-contain'
              style={{ maxHeight: 'calc(92vh - 230px)' }}
            />
          ) : (
            <p className='text-xs text-stone-500 py-20' data-testid='submit-preview-empty'>
              {t('submitPreview.empty')}
            </p>
          )}
        </div>

        <div className='space-y-2 rounded-xl border border-stone-200/90 bg-[#FAF8F5] p-3'>
          <div
            data-testid='submit-preview-checklist'
            className={`text-xs flex items-center gap-1.5 font-semibold ${
              coverage.complete ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {coverage.complete ? (
              <CheckCircle2 className='w-3.5 h-3.5' />
            ) : (
              <AlertTriangle className='w-3.5 h-3.5' />
            )}
            {coverage.hasFullPage
              ? t('submitPreview.hasFullPage')
              : t('submitPreview.panelCoverage', {
                  covered: coverage.covered,
                  total: coverage.total,
                })}
          </div>
          {mode === 'page' && (
            <p className='text-xs text-stone-500'>
              {t('collaboration.submitPreview.fullPageModeHint')}
            </p>
          )}
          {failedImages > 0 && (
            <p className='text-xs text-amber-700' data-testid='submit-preview-failed'>
              {t('submitPreview.failedImages', { count: failedImages })}
            </p>
          )}
          {!canSubmit && submitBlockedReason && (
            <p className='text-xs text-amber-700'>{submitBlockedReason}</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
