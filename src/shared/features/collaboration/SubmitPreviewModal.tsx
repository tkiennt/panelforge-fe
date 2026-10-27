import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Send, X } from 'lucide-react';
import type { AssetReferenceDto, PanelDto } from '@/types';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { elementService, type ElementSnapshotDto } from '@/services/element.service';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';
import { panelArtworkCoverage } from './collaborationRules';

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Xem trước trang truyện'
      data-testid='submit-preview-modal'
      className='fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4'
    >
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden'>
        <div className='flex items-center justify-between px-5 py-3 border-b border-[#E7E7E7]'>
          <div>
            <h2 className='font-bold text-sm text-[#171717]'>Xem trước trang truyện</h2>
            <p className='text-[11px] text-[#737373]'>{stageName}</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto overflow-x-hidden bg-zinc-100 p-4 flex justify-center'>
          {loading ? (
            <div className='flex items-center gap-2 text-xs text-zinc-500 py-20'>
              <Loader2 className='w-4 h-4 animate-spin' /> Đang ghép trang…
            </div>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt='Trang ghép hoàn chỉnh'
              data-testid='submit-preview-image'
              className='bg-white shadow-md block w-auto h-auto max-w-full object-contain'
              style={{ maxHeight: 'calc(92vh - 230px)' }}
            />
          ) : (
            <p className='text-xs text-zinc-500 py-20' data-testid='submit-preview-empty'>
              Chưa có ảnh nào để xem trước ở stage này.
            </p>
          )}
        </div>

        <div className='px-5 py-3 border-t border-[#E7E7E7] space-y-2'>
          <div
            data-testid='submit-preview-checklist'
            className={`text-[11px] flex items-center gap-1.5 font-semibold ${
              coverage.complete ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {coverage.complete ? (
              <CheckCircle2 className='w-3.5 h-3.5' />
            ) : (
              <AlertTriangle className='w-3.5 h-3.5' />
            )}
            {coverage.hasFullPage
              ? 'Đã có ảnh cả trang ở stage này.'
              : `Panel đã có ảnh: ${coverage.covered}/${coverage.total}`}
          </div>
          {mode === 'page' && (
            <p className='text-[10px] text-zinc-500'>
              Hiển thị ảnh cả trang (không ghép từng Panel).
            </p>
          )}
          {failedImages > 0 && (
            <p className='text-[10px] text-amber-700' data-testid='submit-preview-failed'>
              {failedImages} ảnh không tải được và đã được bỏ qua trong bản xem trước.
            </p>
          )}
          {!canSubmit && submitBlockedReason && (
            <p className='text-[11px] text-amber-700'>{submitBlockedReason}</p>
          )}
          <div className='flex justify-end gap-2 pt-1'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-1.5 rounded-lg border border-[#E7E7E7] text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer'
            >
              <ArrowLeft className='w-3 h-3' /> Quay lại sửa
            </button>
            <button
              type='button'
              data-testid='submit-preview-confirm'
              disabled={busy || !canSubmit}
              onClick={onConfirm}
              className='px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {busy ? <Loader2 className='w-3 h-3 animate-spin' /> : <Send className='w-3 h-3' />}
              Xác nhận &amp; Nộp bài
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
