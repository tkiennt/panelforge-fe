import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Loader2, ScanSearch, AlertCircle } from 'lucide-react';
import { pageService, type PageDto } from '@/services/page.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import type { AssetReferenceDto } from '@/types';

export interface ChapterReviewArtworkOverviewProps {
  chapterId: string;
  seriesId?: string;
  assignmentId: string;
  onToast?: (title: string, desc: string) => void;
}

interface PageArtworkInfo {
  page: PageDto;
  artworks: AssetReferenceDto[];
  latestArtwork: AssetReferenceDto | null;
  thumbnailUrl: string | null;
  loadingThumb: boolean;
}

export const ChapterReviewArtworkOverview: React.FC<ChapterReviewArtworkOverviewProps> = ({
  chapterId,
  seriesId,
  assignmentId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagesData, setPagesData] = useState<PageArtworkInfo[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadChapterArtworks() {
      setLoading(true);
      setError(null);
      try {
        const [pages, pipeline] = await Promise.all([
          pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
          seriesId
            ? pipelineService.getSeriesPipeline(seriesId).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        // Bỏ qua stage bị disabled
        const activeStages = (pipeline?.stages ?? []).filter((s) => s.isEnabled !== false);
        setStages(activeStages);

        const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

        // Nạp artwork cho từng trang
        const pagesWithArts = await Promise.all(
          sortedPages.map(async (page) => {
            try {
              // Gọi không truyền stageId để lấy mọi phiên bản của mọi stage
              const arts = await artworkService.getArtworks(chapterId, page.id);
              // Sắp xếp tìm bản mới nhất (ưu tiên createdAt mới nhất hoặc versionNumber lớn nhất)
              const sorted = [...arts].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              );
              const latest = sorted[0] || null;
              return {
                page,
                artworks: arts,
                latestArtwork: latest,
                thumbnailUrl: null,
                loadingThumb: !!latest,
              };
            } catch {
              return {
                page,
                artworks: [],
                latestArtwork: null,
                thumbnailUrl: null,
                loadingThumb: false,
              };
            }
          }),
        );

        if (cancelled) return;
        setPagesData(pagesWithArts);
        setLoading(false);

        // Xin link truy cập ngắn hạn cho thumbnail của bản mới nhất mỗi trang
        for (const item of pagesWithArts) {
          if (item.latestArtwork) {
            const artId = item.latestArtwork.id;
            artworkService
              .getArtworkAccessLink(chapterId, artId)
              .then((link) => {
                if (cancelled) return;
                const fullUrl = resolveArtworkUrl(link.url);
                setPagesData((prev) =>
                  prev.map((p) =>
                    p.page.id === item.page.id
                      ? { ...p, thumbnailUrl: fullUrl, loadingThumb: false }
                      : p,
                  ),
                );
              })
              .catch(() => {
                if (cancelled) return;
                setPagesData((prev) =>
                  prev.map((p) => (p.page.id === item.page.id ? { ...p, loadingThumb: false } : p)),
                );
              });
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Không thể tải tổng quan trang và artwork của chapter.');
        setLoading(false);
      }
    }

    void loadChapterArtworks();

    return () => {
      cancelled = true;
    };
  }, [chapterId, seriesId]);

  return (
    <div
      data-testid='chapter-review-artwork-overview'
      className='p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3'
    >
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

      {loading && (
        <div className='flex items-center justify-center py-6 text-zinc-500 text-xs gap-2'>
          <Loader2 className='w-4 h-4 animate-spin text-[#F97316]' />
          <span>Đang tải các trang và artwork...</span>
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

      {!loading && !error && pagesData.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1'>
          {pagesData.map(({ page, artworks, latestArtwork, thumbnailUrl, loadingThumb }) => {
            return (
              <div
                key={page.id}
                data-testid={`page-overview-${page.id}`}
                className='p-2.5 bg-white border border-zinc-200 rounded-lg flex flex-col justify-between gap-2 shadow-2xs hover:border-[#F97316]/50 transition-colors'
              >
                <div>
                  <div className='flex items-center justify-between text-xs font-bold text-zinc-800 pb-1.5 border-b border-zinc-100'>
                    <span>Trang {page.pageNumber}</span>
                    <span className='text-[10px] font-mono font-normal text-zinc-500'>
                      {artworks.length} bản vẽ
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className='mt-2 w-full h-32 bg-zinc-100 rounded-md overflow-hidden flex items-center justify-center border border-zinc-200/80 relative'>
                    {loadingThumb ? (
                      <Loader2 className='w-4 h-4 animate-spin text-zinc-400' />
                    ) : thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={`Trang ${page.pageNumber}`}
                        className='w-full h-full object-contain'
                      />
                    ) : (
                      <div className='flex flex-col items-center gap-1 text-zinc-400 text-[10px]'>
                        <ImageIcon className='w-6 h-6 stroke-1' />
                        <span>Chưa có artwork</span>
                      </div>
                    )}

                    {latestArtwork && (
                      <span className='absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-semibold'>
                        v{latestArtwork.versionNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage version chips */}
                <div className='space-y-1 pt-1'>
                  <div className='text-[10px] text-zinc-500 font-medium'>Phiên bản theo stage:</div>
                  <div className='flex flex-wrap gap-1'>
                    {stages.length > 0 ? (
                      stages.map((stage) => {
                        const stageArts = artworks.filter((a) => a.pipelineStageId === stage.id);
                        if (stageArts.length === 0) return null;
                        const maxVer = Math.max(...stageArts.map((a) => a.versionNumber));
                        return (
                          <span
                            key={stage.id}
                            className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 border border-zinc-200 text-zinc-700'
                            title={`${stage.name}: ${stageArts.length} phiên bản (mới nhất: v${maxVer})`}
                          >
                            <span
                              className='w-1.5 h-1.5 rounded-full'
                              style={{ backgroundColor: stage.colorCode || '#F97316' }}
                            />
                            {stage.name} v{maxVer}
                          </span>
                        );
                      })
                    ) : (
                      <span className='text-[10px] text-zinc-400 italic'>Chưa có stage</span>
                    )}
                    {stages.length > 0 &&
                      stages.every(
                        (stage) => !artworks.some((a) => a.pipelineStageId === stage.id),
                      ) && (
                        <span className='text-[10px] text-zinc-400 italic'>Chưa có bản vẽ nào</span>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
