import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { pipelineService } from '@/services/pipeline.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';
import { loadPreviousStageArtworks } from '@/shared/utils/stageArtworks';
import { pageStepForKey, toReadingDirection } from './readingDirection';

interface ChapterReadingModeProps {
  chapterId: string;
  seriesId: string;
  readingDirection: unknown;
  pages: PageDto[];
  initialPageId?: string;
  onClose: () => void;
  /** Bấm vào trang khi đang đọc: quay về chế độ duyệt đúng trang đó. */
  onReviewPage: (pageId: string) => void;
}

/** UIQ-11p: Studio roles đọc chương liền mạch như truyện thật theo hướng đọc của series. */
export const ChapterReadingMode: React.FC<ChapterReadingModeProps> = ({
  chapterId,
  seriesId,
  readingDirection,
  pages,
  initialPageId,
  onClose,
  onReviewPage,
}) => {
  const { t } = useTranslation('review');
  const direction = toReadingDirection(readingDirection);
  const ordered = useMemo(() => [...pages].sort((a, b) => a.pageNumber - b.pageNumber), [pages]);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      ordered.findIndex((p) => p.id === initialPageId),
    ),
  );
  // pageId → dataUrl ('' = trang chưa có bản vẽ); chưa có key = đang tải
  const [images, setImages] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());

  const loadPage = useCallback(
    async (page: PageDto) => {
      if (requested.current.has(page.id)) return;
      requested.current.add(page.id);
      let dataUrl = '';
      try {
        const pipeline = await pipelineService.getSeriesPipeline(seriesId).catch(() => null);
        const stages = pipeline?.stages ?? [];
        const [panels, snapshot, artworks] = await Promise.all([
          panelService.getPanelsByPage(page.id).catch(() => []),
          elementService.getPageSnapshot(page.id).catch(() => ({ elements: [] })),
          // Bản mới nhất ở mọi công đoạn (kể cả chưa duyệt): Editor đang đọc bản đang duyệt
          loadPreviousStageArtworks(chapterId, seriesId, page.id, undefined, {
            stages,
            approvedStageIds: stages.map((s) => s.id),
          }).catch(() => []),
        ]);
        if (artworks.length > 0 || (snapshot.elements ?? []).length > 0) {
          const rendered = await buildPageComposite({
            panels,
            artworks,
            elements: snapshot.elements ?? [],
            drawText: true,
            getAccessUrl: async (assetRefId) =>
              resolveArtworkUrl(
                (await artworkService.getArtworkAccessLink(chapterId, assetRefId)).url,
              ),
          });
          dataUrl = rendered.dataUrl;
        }
      } finally {
        setImages((prev) => ({ ...prev, [page.id]: dataUrl }));
      }
    },
    [chapterId, seriesId],
  );

  // Dọc: tải lần lượt cả chương; lật trang: tải trang đang xem và trang kế.
  useEffect(() => {
    if (direction === 'Vertical') {
      void (async () => {
        for (const page of ordered) await loadPage(page);
      })();
    } else {
      ordered.slice(index, index + 2).forEach((p) => void loadPage(p));
    }
  }, [direction, index, ordered, loadPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      const step = pageStepForKey(e.key, direction);
      if (step !== 0) setIndex((i) => Math.min(ordered.length - 1, Math.max(0, i + step)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [direction, ordered.length, onClose]);

  const renderPage = (page: PageDto) => {
    const src = images[page.id];
    return (
      <button
        key={page.id}
        type='button'
        onClick={() => onReviewPage(page.id)}
        title={t('readerView.readingModeOpenReview')}
        data-testid={`reading-page-${page.pageNumber}`}
        className='block w-full max-w-3xl mx-auto bg-white shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500'
      >
        {src === undefined ? (
          <div className='flex aspect-[2/3] items-center justify-center text-stone-400'>
            <Loader2
              className='h-5 w-5 animate-spin'
              aria-label={t('readerView.readingModeLoading')}
            />
          </div>
        ) : src ? (
          <img
            src={src}
            alt={t('readerView.pageIndicator', { current: page.pageNumber, total: ordered.length })}
            className='block w-full'
          />
        ) : (
          <div className='flex aspect-[2/3] items-center justify-center border border-dashed border-stone-300 text-sm text-stone-500'>
            {t('readerView.readingModeEmptyPage', { page: page.pageNumber })}
          </div>
        )}
      </button>
    );
  };

  const current = ordered[index];
  const canBack = index > 0;
  const canForward = index < ordered.length - 1;
  // Nút bên trái là "trang sau" khi đọc phải sang trái
  const leftStep = direction === 'RightToLeft' ? 1 : -1;

  return (
    <div
      className='fixed inset-0 z-50 flex flex-col bg-stone-950/95'
      role='dialog'
      aria-modal='true'
      aria-label={t('readerView.readingModeTitle')}
      data-testid='chapter-reading-mode'
    >
      <div className='flex items-center justify-between gap-3 px-4 py-2 text-stone-100'>
        <span className='text-xs font-semibold'>
          {t('readerView.readingModeTitle')}
          {direction !== 'Vertical' && current
            ? ` · ${t('readerView.pageIndicator', { current: index + 1, total: ordered.length })}`
            : ''}
        </span>
        <button
          type='button'
          onClick={onClose}
          className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/10 cursor-pointer'
        >
          <X className='h-4 w-4' aria-hidden='true' />
          {t('readerView.readingModeClose')}
        </button>
      </div>

      {direction === 'Vertical' ? (
        <div className='flex-1 overflow-y-auto custom-scrollbar' data-testid='reading-vertical'>
          {ordered.map(renderPage)}
        </div>
      ) : (
        <div className='flex flex-1 items-center justify-center gap-3 overflow-hidden px-3 pb-3'>
          <button
            type='button'
            onClick={() => setIndex((i) => i + leftStep)}
            disabled={leftStep === 1 ? !canForward : !canBack}
            aria-label={
              leftStep === 1 ? t('readerView.readingModeNext') : t('readerView.readingModePrev')
            }
            data-testid='reading-left'
            className='rounded-full p-2 text-stone-100 hover:bg-white/10 disabled:opacity-30 cursor-pointer'
          >
            <ChevronLeft className='h-6 w-6' aria-hidden='true' />
          </button>
          <div className='h-full max-h-full flex-1 overflow-y-auto custom-scrollbar'>
            {current && renderPage(current)}
          </div>
          <button
            type='button'
            onClick={() => setIndex((i) => i - leftStep)}
            disabled={leftStep === 1 ? !canBack : !canForward}
            aria-label={
              leftStep === 1 ? t('readerView.readingModePrev') : t('readerView.readingModeNext')
            }
            data-testid='reading-right'
            className='rounded-full p-2 text-stone-100 hover:bg-white/10 disabled:opacity-30 cursor-pointer'
          >
            <ChevronRight className='h-6 w-6' aria-hidden='true' />
          </button>
        </div>
      )}
    </div>
  );
};
