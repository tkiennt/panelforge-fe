import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  BookOpen,
  Loader2,
  AlertCircle,
  Columns,
  Rows,
  MoveVertical,
  MoveHorizontal,
} from 'lucide-react';
import {
  catalogService,
  PublicChapterReadDto,
  resolveCatalogImageUrl,
} from '@/services/catalog.service';

interface ChapterReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber?: number;
  chapterTitle?: string | null;
}

const pageUrl = (url?: string | null) => (url && url.trim() ? resolveCatalogImageUrl(url) : null);

export const ChapterReaderModal: React.FC<ChapterReaderModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterNumber,
  chapterTitle,
}) => {
  const [data, setData] = useState<PublicChapterReadDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'vertical'>('single');
  // Lật trang: 'height' = cả trang vừa màn hình; 'width' = rộng theo khung đọc, cuộn dọc để xem hết trang cao
  const [fitMode, setFitMode] = useState<'height' | 'width'>('height');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen || !chapterId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setCurrentPageIndex(0);

    catalogService
      .getPublicChapter(chapterId)
      .then((res) => {
        if (mounted) {
          setData(res);
          setViewMode(res.readingDirection === 'Vertical' ? 'vertical' : 'single');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(
            err.message || 'Chương chưa sẵn sàng hoặc chưa tới thời điểm phát hành chính thức.',
          );
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, chapterId]);

  // Khoá cuộn trang nền khi đang đọc
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const totalPages = data?.pages.length || 0;
  const isRTL = data?.readingDirection === 'RightToLeft';

  const handleNext = useCallback(() => {
    if (currentPageIndex < totalPages - 1) setCurrentPageIndex((prev) => prev + 1);
  }, [currentPageIndex, totalPages]);

  const handlePrev = useCallback(() => {
    if (currentPageIndex > 0) setCurrentPageIndex((prev) => prev - 1);
  }, [currentPageIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (isRTL) handlePrev();
        else handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (isRTL) handleNext();
        else handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, isRTL]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  const currentPageUrl = pageUrl(data?.pages[currentPageIndex]?.imageUrl);
  const ready = !loading && !error && data && totalPages > 0;
  const toolBtn =
    'h-8 px-2.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer text-xs flex items-center gap-1.5';

  // Portal ra body: không bị header/sidebar của app đè hay bị cắt bởi layout cha
  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Trình đọc chương'
      className='fixed inset-0 z-[100] bg-[#0F0F11] text-white flex flex-col animate-in fade-in duration-200 select-none'
    >
      {/* Top Bar */}
      <header className='h-14 bg-[#18181B] border-b border-[#27272A] px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0'>
        <div className='flex items-center gap-3 min-w-0'>
          <button
            onClick={onClose}
            className='w-8 h-8 shrink-0 rounded-lg hover:bg-[#27272A] flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer'
            title='Thoát trình đọc (Esc)'
            aria-label='Đóng trình đọc'
          >
            <X className='w-5 h-5' />
          </button>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h2 className='text-sm font-bold text-white truncate'>
                {data?.seriesTitle || 'Đang tải tác phẩm...'}
              </h2>
              <span className='shrink-0 px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800 text-[10px] font-mono'>
                {data?.readingDirection === 'RightToLeft'
                  ? 'Manga (RTL)'
                  : data?.readingDirection === 'Vertical'
                    ? 'Webtoon'
                    : 'Comic (LTR)'}
              </span>
            </div>
            <p className='text-[11px] text-neutral-400 font-mono truncate'>
              Chương {data ? data.chapterNumber : chapterNumber}
              {(data?.title || chapterTitle) && ` · ${data?.title || chapterTitle}`}
            </p>
          </div>
        </div>

        {ready && viewMode === 'single' && (
          <div className='hidden sm:flex items-center gap-2 font-mono text-xs text-neutral-300'>
            <button
              onClick={isRTL ? handleNext : handlePrev}
              disabled={isRTL ? currentPageIndex >= totalPages - 1 : currentPageIndex <= 0}
              className='p-1.5 rounded-lg border border-[#27272A] hover:bg-[#27272A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer'
              aria-label='Trang bên trái'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
            <span className='px-2 tabular-nums'>
              Trang <strong>{currentPageIndex + 1}</strong> / {totalPages}
            </span>
            <button
              onClick={isRTL ? handlePrev : handleNext}
              disabled={isRTL ? currentPageIndex <= 0 : currentPageIndex >= totalPages - 1}
              className='p-1.5 rounded-lg border border-[#27272A] hover:bg-[#27272A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer'
              aria-label='Trang bên phải'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        )}

        <div className='flex items-center gap-2 shrink-0'>
          {ready && viewMode === 'single' && (
            <button
              onClick={() => setFitMode(fitMode === 'height' ? 'width' : 'height')}
              className={`${toolBtn} hover:bg-[#27272A] text-neutral-300`}
              title={fitMode === 'height' ? 'Phóng theo chiều ngang' : 'Thu cả trang vừa màn hình'}
            >
              {fitMode === 'height' ? (
                <MoveVertical className='w-4 h-4' />
              ) : (
                <MoveHorizontal className='w-4 h-4' />
              )}
              <span className='hidden md:inline'>
                {fitMode === 'height' ? 'Vừa màn hình' : 'Vừa chiều ngang'}
              </span>
            </button>
          )}
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'vertical' : 'single')}
            className={`${toolBtn} ${
              viewMode === 'vertical'
                ? 'bg-orange-600 text-white'
                : 'hover:bg-[#27272A] text-neutral-300'
            }`}
            title={viewMode === 'single' ? 'Chuyển sang cuộn dọc' : 'Chuyển sang lật trang'}
          >
            {viewMode === 'single' ? <Rows className='w-4 h-4' /> : <Columns className='w-4 h-4' />}
            <span className='hidden md:inline'>
              {viewMode === 'single' ? 'Cuộn dọc' : 'Lật trang'}
            </span>
          </button>
          <button
            onClick={toggleFullscreen}
            className={`${toolBtn} hover:bg-[#27272A] text-neutral-300`}
            title='Toàn màn hình'
            aria-label='Toàn màn hình'
          >
            {isFullscreen ? <Minimize2 className='w-4 h-4' /> : <Maximize2 className='w-4 h-4' />}
          </button>
        </div>
      </header>

      {/* Vùng đọc: không căn giữa bằng flex trên khung cuộn (sẽ cắt mép trên khi trang cao hơn màn hình);
          dùng m-auto ở con để vừa căn giữa khi nhỏ, vừa cuộn được từ đầu khi lớn */}
      <div className='flex-1 min-h-0 overflow-auto bg-black custom-scrollbar flex'>
        {loading && (
          <div className='m-auto flex flex-col items-center gap-3 text-neutral-400'>
            <Loader2 className='w-8 h-8 animate-spin text-orange-500' />
            <span className='text-xs font-mono'>Đang nạp dữ liệu chương &amp; ảnh gốc...</span>
          </div>
        )}

        {error && (
          <div className='m-auto max-w-md p-6 bg-[#18181B] border border-rose-900/60 rounded-2xl text-center space-y-3 shadow-2xl'>
            <AlertCircle className='w-10 h-10 text-rose-500 mx-auto' />
            <h3 className='font-bold text-base text-rose-400'>Chưa Thể Đọc Chương Này</h3>
            <p className='text-xs text-neutral-400 leading-relaxed'>{error}</p>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer'
            >
              Quay lại
            </button>
          </div>
        )}

        {!loading && !error && data && totalPages === 0 && (
          <div className='m-auto text-center text-neutral-400 space-y-2'>
            <BookOpen className='w-8 h-8 mx-auto opacity-40' />
            <p className='text-xs'>Chương này chưa có trang bản vẽ nào được hoàn thiện.</p>
          </div>
        )}

        {/* Lật trang */}
        {ready && viewMode === 'single' && (
          <div className='m-auto relative p-3 sm:p-6'>
            {currentPageUrl ? (
              <img
                key={currentPageUrl}
                src={currentPageUrl}
                alt={`Trang ${currentPageIndex + 1}`}
                className={`block shadow-2xl rounded-sm bg-white ${
                  fitMode === 'height'
                    ? 'max-h-[calc(100dvh-14rem)] w-auto max-w-[calc(100vw-1.5rem)] object-contain'
                    : 'w-[min(56rem,calc(100vw-1.5rem))] h-auto'
                }`}
              />
            ) : (
              <div className='w-[min(36rem,80vw)] aspect-[2/3] bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center text-neutral-500 gap-2'>
                <BookOpen className='w-12 h-12 opacity-30' />
                <span className='text-xs font-mono'>
                  Trang {currentPageIndex + 1} (Chưa có artwork)
                </span>
              </div>
            )}

            {/* Bấm nửa trái / phải của trang để lật */}
            <button
              onClick={isRTL ? handleNext : handlePrev}
              className='absolute left-0 top-0 bottom-0 w-1/3 cursor-w-resize'
              aria-label='Lật sang trái'
            />
            <button
              onClick={isRTL ? handlePrev : handleNext}
              className='absolute right-0 top-0 bottom-0 w-1/3 cursor-e-resize'
              aria-label='Lật sang phải'
            />
          </div>
        )}

        {/* Cuộn dọc (webtoon) */}
        {ready && viewMode === 'vertical' && (
          <div className='mx-auto w-full max-w-3xl flex flex-col gap-2 py-4 px-2'>
            {data.pages.map((p) => {
              const url = pageUrl(p.imageUrl);
              return url ? (
                <img
                  key={p.id}
                  src={url}
                  alt={`Trang ${p.pageNumber}`}
                  loading='lazy'
                  className='block w-full h-auto shadow-lg bg-white'
                />
              ) : (
                <div
                  key={p.id}
                  className='w-full aspect-[2/3] bg-neutral-900 flex items-center justify-center text-neutral-600 text-xs font-mono'
                >
                  Trang {p.pageNumber}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dải trang thu nhỏ: nhảy nhanh tới trang bất kỳ */}
      {ready && viewMode === 'single' && (
        <footer className='h-24 bg-[#18181B] border-t border-[#27272A] px-3 flex items-center gap-3 shrink-0'>
          <div className='flex-1 min-w-0 overflow-x-auto custom-scrollbar'>
            <div className={`flex gap-2 w-max mx-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
              {data.pages.map((p, i) => {
                const url = pageUrl(p.imageUrl);
                const active = i === currentPageIndex;
                return (
                  <button
                    key={p.id}
                    onClick={() => setCurrentPageIndex(i)}
                    aria-label={`Tới trang ${p.pageNumber}`}
                    aria-current={active ? 'page' : undefined}
                    className={`relative h-16 w-11 rounded overflow-hidden border-2 transition-all cursor-pointer ${
                      active
                        ? 'border-orange-500'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt=''
                        loading='lazy'
                        className='w-full h-full object-cover bg-white'
                      />
                    ) : (
                      <span className='w-full h-full bg-neutral-800 block' />
                    )}
                    <span className='absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-mono text-center'>
                      {p.pageNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className='hidden md:block shrink-0 text-[11px] text-neutral-500 font-mono w-40 text-right'>
            {isRTL ? '← Trang kế (chuẩn Manga)' : 'Trang kế →'}
          </span>
        </footer>
      )}
    </div>,
    document.body,
  );
};
