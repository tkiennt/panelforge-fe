import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Image as ImageIcon,
  Loader2,
  ScanSearch,
  AlertCircle,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
} from 'lucide-react';
import { pageService, type PageDto } from '@/services/page.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { buildPageComposite, selectTextElements } from '@/shared/utils/compositePageRenderer';
import { loadPreviousStageArtworks } from '@/shared/utils/stageArtworks';
import {
  getActivePipelineStages,
  computePageProgressSummary,
  computeUnfinishedPagesWarning,
  formatUnfinishedWarningText,
  STAGE_STATUS_CONFIG,
  type PageStageStatus,
} from './chapterReviewStatus';
import type { AssignmentDto, PanelDto, StageProgressDto } from '@/types';

export interface ChapterReviewArtworkOverviewProps {
  chapterId: string;
  seriesId?: string;
  assignmentId: string;
  onToast?: (title: string, desc: string) => void;
}

export interface CachedPageComposite {
  dataUrl: string;
  hasArtwork: boolean;
  hasText: boolean;
  baseStageName?: string;
  baseVersion?: number;
}

// Cache trong phiên để không dựng lại ảnh composite mỗi lần re-render
// eslint-disable-next-line react-refresh/only-export-components
export const compositeSessionCache = new Map<string, CachedPageComposite>();

interface PageCardData {
  page: PageDto;
  panels: PanelDto[];
  panelCount: number;
  approvedStageCount: number;
  totalActiveStages: number;
  summaryText: string;
  stageStatuses: Record<string, PageStageStatus>;
  // Composite artwork
  dataUrl: string | null;
  hasArtwork: boolean;
  hasText: boolean;
  baseStageName?: string;
  baseVersion?: number;
  loadingComposite: boolean;
}

export const ChapterReviewArtworkOverview: React.FC<ChapterReviewArtworkOverviewProps> = ({
  chapterId,
  seriesId,
  assignmentId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagesData, setPagesData] = useState<PageCardData[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [stageProgressList, setStageProgressList] = useState<StageProgressDto[]>([]);
  const [chapterAssignments, setChapterAssignments] = useState<AssignmentDto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverviewData() {
      setLoading(true);
      setError(null);
      try {
        const [pages, pipeline, assignments, progress] = await Promise.all([
          pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
          seriesId
            ? pipelineService.getSeriesPipeline(seriesId).catch(() => null)
            : Promise.resolve(null),
          assignmentService.getAssignments(chapterId).catch(() => [] as AssignmentDto[]),
          assignmentService.getStageProgress(chapterId).catch(() => [] as StageProgressDto[]),
        ]);

        if (cancelled) return;

        const activeStages = getActivePipelineStages(pipeline?.stages ?? []);
        setStages(activeStages);
        setChapterAssignments(assignments);
        setStageProgressList(progress);

        const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

        // Nạp panels cho từng trang song song
        const pagesWithPanels = await Promise.all(
          sortedPages.map(async (page) => {
            const panels = await panelService
              .getPanelsByPage(page.id)
              .catch(() => [] as PanelDto[]);
            const panelIds = panels.map((p) => p.id);

            const summary = computePageProgressSummary(
              page.id,
              panelIds,
              activeStages,
              progress,
              assignments,
            );

            // Kiểm tra cache trong phiên
            const cached = compositeSessionCache.get(page.id);

            return {
              page,
              panels,
              panelCount: summary.panelCount,
              approvedStageCount: summary.approvedStageCount,
              totalActiveStages: summary.totalActiveStages,
              summaryText: summary.summaryText,
              stageStatuses: summary.stageStatuses,
              dataUrl: cached ? cached.dataUrl : null,
              hasArtwork: cached ? cached.hasArtwork : false,
              hasText: cached ? cached.hasText : false,
              baseStageName: cached?.baseStageName,
              baseVersion: cached?.baseVersion,
              loadingComposite: !cached,
            };
          }),
        );

        if (cancelled) return;
        setPagesData(pagesWithPanels);
        setLoading(false);

        // Dựng ảnh composite cho các trang chưa có trong cache
        await Promise.all(
          pagesWithPanels.map(async (item) => {
            const cached = compositeSessionCache.get(item.page.id);
            if (cached) return;

            try {
              // 1. Tìm artwork nền của công đoạn gần nhất có ảnh
              const baseArts = await loadPreviousStageArtworks(
                chapterId,
                seriesId || '',
                item.page.id,
                undefined,
                { stages: activeStages },
              );

              if (cancelled) return;

              if (baseArts.length === 0) {
                // Trang chưa có ảnh nào
                const emptyResult: CachedPageComposite = {
                  dataUrl: '',
                  hasArtwork: false,
                  hasText: false,
                };
                compositeSessionCache.set(item.page.id, emptyResult);
                if (!cancelled) {
                  setPagesData((prev) =>
                    prev.map((p) =>
                      p.page.id === item.page.id
                        ? { ...p, ...emptyResult, loadingComposite: false }
                        : p,
                    ),
                  );
                }
                return;
              }

              // 2. Nạp snapshot lớp chữ Lettering hiện tại
              const snapshot = await elementService
                .getPageSnapshot(item.page.id, false)
                .catch(() => null);

              if (cancelled) return;

              const textElements = selectTextElements(snapshot?.elements ?? []);
              const hasText = textElements.length > 0;

              // 3. Dựng composite trang: ảnh nền ghép theo khung + lớp chữ Letter
              const compositeRes = await buildPageComposite({
                panels: item.panels,
                artworks: baseArts,
                elements: snapshot?.elements ?? [],
                drawText: true,
                getAccessUrl: async (assetReferenceId) => {
                  const link = await artworkService.getArtworkAccessLink(
                    chapterId,
                    assetReferenceId,
                  );
                  return resolveArtworkUrl(link.url);
                },
              });

              if (cancelled) return;

              // Xác định tên stage và version của artwork nền
              const baseStage = activeStages.find((s) => s.id === baseArts[0]?.pipelineStageId);
              const maxVersion = Math.max(...baseArts.map((a) => a.versionNumber || 1));

              const cachedResult: CachedPageComposite = {
                dataUrl: compositeRes.dataUrl,
                hasArtwork: true,
                hasText,
                baseStageName: baseStage?.name,
                baseVersion: maxVersion,
              };

              compositeSessionCache.set(item.page.id, cachedResult);

              if (!cancelled) {
                setPagesData((prev) =>
                  prev.map((p) =>
                    p.page.id === item.page.id
                      ? { ...p, ...cachedResult, loadingComposite: false }
                      : p,
                  ),
                );
              }
            } catch {
              if (!cancelled) {
                setPagesData((prev) =>
                  prev.map((p) =>
                    p.page.id === item.page.id ? { ...p, loadingComposite: false } : p,
                  ),
                );
              }
            }
          }),
        );
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Không thể tải tổng quan trang và artwork của chapter.');
        setLoading(false);
      }
    }

    void loadOverviewData();

    return () => {
      cancelled = true;
    };
  }, [chapterId, seriesId]);

  // Tính cảnh báo các trang chưa hoàn tất các công đoạn trước Review
  const unfinishedWarnings = useMemo(() => {
    if (pagesData.length === 0 || stages.length === 0) return [];

    const reviewStage = stages.find((s) => s.slug?.toLowerCase() === 'review' || s.isTerminal);
    const stagesToComplete = reviewStage
      ? stages.filter((s) => s.stageOrder < reviewStage.stageOrder)
      : stages.filter((s) => !s.isTerminal);

    const warnings: Array<{ pageId: string; pageNumber: number; incompleteStageNames: string[] }> =
      [];

    for (const item of pagesData) {
      const incomplete = stagesToComplete.filter((s) => item.stageStatuses[s.id] !== 'Approved');
      if (incomplete.length > 0) {
        warnings.push({
          pageId: item.page.id,
          pageNumber: item.page.pageNumber,
          incompleteStageNames: incomplete.map((s) => s.name),
        });
      }
    }
    return warnings;
  }, [pagesData, stages]);

  // Lightbox handlers
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const handlePrevPage = useCallback(() => {
    setLightboxIndex((idx) => (idx !== null && idx > 0 ? idx - 1 : idx));
  }, []);

  const handleNextPage = useCallback(() => {
    setLightboxIndex((idx) => (idx !== null && idx < pagesData.length - 1 ? idx + 1 : idx));
  }, [pagesData.length]);

  // Bắt phím ESC và mũi tên điều hướng lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') handlePrevPage();
      if (e.key === 'ArrowRight') handleNextPage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, closeLightbox, handlePrevPage, handleNextPage]);

  const activeLightboxPage = lightboxIndex !== null ? pagesData[lightboxIndex] : null;

  return (
    <div
      data-testid='chapter-review-artwork-overview'
      className='p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3'
    >
      {/* Tiêu đề & nút mở ReviewView */}
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <ScanSearch className='w-4 h-4 text-[#F97316]' />
          <h4 className='text-xs font-bold text-zinc-900'>
            Tổng quan bản vẽ theo trang & công đoạn ({pagesData.length} trang)
          </h4>
        </div>

        <Link
          to={`../review/${assignmentId}?chapterId=${chapterId}`}
          relative='path'
          data-testid='open-review-board'
          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-2xs transition-colors'
        >
          <ScanSearch className='w-3.5 h-3.5' />
          Mở màn duyệt chi tiết
        </Link>
      </div>

      {/* Cảnh báo đỏ nếu có trang chưa hoàn tất các công đoạn trước Review */}
      {unfinishedWarnings.length > 0 && (
        <div
          data-testid='unfinished-pages-warning'
          className='p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs shadow-2xs'
        >
          <AlertOctagon className='w-4 h-4 text-rose-600 shrink-0 mt-0.5' />
          <div className='space-y-1'>
            <div className='font-bold text-rose-900'>
              Chưa thể hoàn tất Review cho cả chương vì còn trang chưa xong:
            </div>
            <div className='space-y-0.5 font-medium'>
              {unfinishedWarnings.map((warning) => (
                <div key={warning.pageId} className='flex items-center gap-1.5'>
                  <span className='w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0' />
                  <span>{formatUnfinishedWarningText(warning)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className='flex items-center justify-center py-6 text-zinc-500 text-xs gap-2'>
          <Loader2 className='w-4 h-4 animate-spin text-[#F97316]' />
          <span>Đang tải các trang, tiến độ và artwork...</span>
        </div>
      )}

      {error && (
        <div className='flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700'>
          <AlertCircle className='w-4 h-4 shrink-0' />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && pagesData.length === 0 && (
        <p className='text-xs text-zinc-500 py-3 text-center italic'>
          Chương này chưa có trang nào được tạo.
        </p>
      )}

      {/* Danh sách thẻ từng trang */}
      {!loading && !error && pagesData.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1'>
          {pagesData.map((item, index) => {
            const {
              page,
              summaryText,
              stageStatuses,
              dataUrl,
              hasArtwork,
              hasText,
              baseStageName,
              baseVersion,
              loadingComposite,
            } = item;

            return (
              <div
                key={page.id}
                data-testid={`page-overview-${page.id}`}
                className='p-3 bg-white border border-zinc-200 rounded-xl flex flex-col justify-between gap-2.5 shadow-2xs hover:border-[#F97316]/50 transition-colors'
              >
                <div>
                  {/* Header: Số trang & Tiến độ công đoạn */}
                  <div className='flex items-center justify-between text-xs font-bold text-zinc-800 pb-1.5 border-b border-zinc-100'>
                    <span>Trang {page.pageNumber}</span>
                    <span
                      data-testid={`summary-text-${page.id}`}
                      className='text-[10px] font-mono font-medium text-zinc-500'
                    >
                      {summaryText}
                    </span>
                  </div>

                  {/* Thumbnail: TRANG THÀNH PHẨM COMPOSITE */}
                  <div className='mt-2 w-full h-36 bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-200/80 relative'>
                    {loadingComposite ? (
                      <div className='flex flex-col items-center gap-1.5 text-zinc-400 text-[10px]'>
                        <Loader2 className='w-5 h-5 animate-spin text-[#F97316]' />
                        <span>Đang dựng trang thành phẩm...</span>
                      </div>
                    ) : hasArtwork && dataUrl ? (
                      <button
                        type='button'
                        data-testid={`thumbnail-btn-${page.id}`}
                        onClick={() => openLightbox(index)}
                        className='relative group w-full h-full flex items-center justify-center cursor-zoom-in bg-zinc-950/5'
                        title='Bấm để xem lớn trang thành phẩm'
                      >
                        <img
                          src={dataUrl}
                          alt={`Trang ${page.pageNumber}`}
                          className='w-full h-full object-contain'
                        />

                        {/* Hover overlay hint */}
                        <div className='absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none'>
                          <span className='px-2 py-1 rounded bg-black/70 text-white text-[10px] font-medium flex items-center gap-1'>
                            <ZoomIn className='w-3 h-3' />
                            Xem lớn
                          </span>
                        </div>

                        {/* Nhãn nhỏ nếu chưa chèn chữ Lettering */}
                        {!hasText && (
                          <span
                            data-testid='badge-no-lettering'
                            className='absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-white font-medium text-[9px] shadow-sm'
                          >
                            Chưa chèn chữ
                          </span>
                        )}

                        {/* Phiên bản artwork nền */}
                        {baseStageName && (
                          <span className='absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-semibold'>
                            {baseStageName} v{baseVersion}
                          </span>
                        )}
                      </button>
                    ) : (
                      <div
                        data-testid={`no-artwork-${page.id}`}
                        className='flex flex-col items-center gap-1 text-zinc-400 text-[11px]'
                      >
                        <ImageIcon className='w-6 h-6 stroke-1 text-zinc-300' />
                        <span>Chưa có bản vẽ</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Dải tiến độ đủ 1 → 7 của từng trang */}
                <div className='space-y-1.5 pt-1'>
                  <div className='text-[10px] text-zinc-500 font-medium flex items-center justify-between'>
                    <span>Tiến độ công đoạn (1 → {stages.length}):</span>
                  </div>

                  <div className='grid grid-cols-4 sm:grid-cols-4 gap-1'>
                    {stages.map((stage) => {
                      const st = stageStatuses[stage.id] || 'NotStarted';
                      const style = STAGE_STATUS_CONFIG[st];

                      return (
                        <div
                          key={stage.id}
                          data-testid={`stage-cell-${page.id}-${stage.id}`}
                          title={`${stage.stageOrder}. ${stage.name}: ${style.label}`}
                          className={`px-1 py-1 rounded border flex flex-col items-center justify-center text-center transition-all ${style.badgeClass}`}
                        >
                          <span className='text-[9px] font-bold truncate max-w-full leading-tight'>
                            {stage.name}
                          </span>
                          <div className='flex items-center gap-1 mt-0.5'>
                            <span
                              className='w-1.5 h-1.5 rounded-full shrink-0'
                              style={{ backgroundColor: style.dotColor }}
                            />
                            <span className='text-[8px] leading-none scale-90 origin-center'>
                              {style.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Lightbox phóng to ảnh trang thành phẩm có nút Trước / Sau */}
      {activeLightboxPage && lightboxIndex !== null && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label={`Trang ${activeLightboxPage.page.pageNumber}`}
          data-testid='composite-lightbox'
          onClick={closeLightbox}
          className='fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex flex-col items-center justify-between p-4 cursor-default'
        >
          {/* Header Lightbox */}
          <div
            className='w-full max-w-4xl flex items-center justify-between text-white text-sm py-2 px-3 bg-zinc-900/80 rounded-xl border border-zinc-700'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center gap-2.5'>
              <span className='font-bold text-white'>
                Trang {activeLightboxPage.page.pageNumber} / {pagesData.length}
              </span>
              <span className='text-xs text-zinc-400 font-mono'>
                ({activeLightboxPage.summaryText})
              </span>
              {!activeLightboxPage.hasText && (
                <span className='px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-medium'>
                  Chưa chèn chữ
                </span>
              )}
              {activeLightboxPage.baseStageName && (
                <span className='px-2 py-0.5 rounded bg-zinc-700 text-zinc-200 font-mono text-[10px]'>
                  Nền: {activeLightboxPage.baseStageName} v{activeLightboxPage.baseVersion}
                </span>
              )}
            </div>

            <button
              type='button'
              data-testid='lightbox-close-btn'
              aria-label='Đóng'
              onClick={closeLightbox}
              className='p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Vùng ảnh chính */}
          <div
            className='relative flex-1 w-full max-w-4xl flex items-center justify-center p-2 my-2'
            onClick={(e) => e.stopPropagation()}
          >
            {activeLightboxPage.dataUrl ? (
              <img
                src={activeLightboxPage.dataUrl}
                alt={`Trang ${activeLightboxPage.page.pageNumber} thành phẩm`}
                className='max-h-[82vh] max-w-full w-auto h-auto object-contain bg-white rounded-lg shadow-2xl border border-zinc-800'
              />
            ) : (
              <div className='p-12 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 text-center flex flex-col items-center gap-2'>
                <ImageIcon className='w-12 h-12 stroke-1 text-zinc-600' />
                <span>Trang này chưa có bản vẽ nào.</span>
              </div>
            )}
          </div>

          {/* Thanh điều hướng: Sang trang trước / sau */}
          <div
            className='w-full max-w-4xl flex items-center justify-between pt-1'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type='button'
              data-testid='lightbox-prev-btn'
              disabled={lightboxIndex === 0}
              onClick={handlePrevPage}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-colors cursor-pointer'
            >
              <ChevronLeft className='w-4 h-4' />
              <span>Trang trước</span>
            </button>

            <span className='text-xs text-zinc-400 font-mono'>
              Dùng phím mũi tên ← → hoặc ESC để đóng
            </span>

            <button
              type='button'
              data-testid='lightbox-next-btn'
              disabled={lightboxIndex === pagesData.length - 1}
              onClick={handleNextPage}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-colors cursor-pointer'
            >
              <span>Trang sau</span>
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
