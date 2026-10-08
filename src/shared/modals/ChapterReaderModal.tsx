import React, { useState, useEffect, useCallback } from 'react';
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
          if (res.readingDirection === 'Vertical') {
            setViewMode('vertical');
          } else {
            setViewMode('single');
          }
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

  const totalPages = data?.pages.length || 0;
  const isRTL = data?.readingDirection === 'RightToLeft';

  const handleNext = useCallback(() => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  }, [currentPageIndex, totalPages]);

  const handlePrev = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
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

  const currentPage = data?.pages[currentPageIndex];
  const currentPageUrl =
    currentPage?.imageUrl && currentPage.imageUrl.trim()
      ? resolveCatalogImageUrl(currentPage.imageUrl)
      : null;

  return (
    <div className='fixed inset-0 bg-[#0F0F11] text-white z-50 flex flex-col overflow-hidden animate-in fade-in duration-200 select-none'>
      {/* Top Bar */}
      <header className='h-14 bg-[#18181B] border-b border-[#27272A] px-4 flex items-center justify-between z-10 shrink-0'>
        <div className='flex items-center gap-3'>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg hover:bg-[#27272A] flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer'
            title='Thoát trình đọc (Esc)'
          >
            <X className='w-5 h-5' />
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-sm font-bold text-white'>
                {data?.seriesTitle || 'Đang tải tác phẩm...'}
              </h2>
              <span className='px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800 text-[10px] font-mono'>
                {data?.readingDirection === 'RightToLeft'
                  ? 'Manga (RTL)'
                  : data?.readingDirection === 'Vertical'
                    ? 'Webtoon'
                    : 'Comic (LTR)'}
              </span>
            </div>
            <p className='text-[11px] text-neutral-400 font-mono'>
              Chương {data ? data.chapterNumber : chapterNumber}:{' '}
              {data?.title || chapterTitle || 'Không tiêu đề'}
            </p>
          </div>
        </div>

        {/* Center / Navigation in Single mode */}
        {data && totalPages > 0 && viewMode === 'single' && (
          <div className='hidden sm:flex items-center gap-2 font-mono text-xs text-neutral-300'>
            <button
              onClick={isRTL ? handleNext : handlePrev}
              disabled={isRTL ? currentPageIndex >= totalPages - 1 : currentPageIndex <= 0}
              className='p-1.5 rounded-lg border border-[#27272A] hover:bg-[#27272A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer'
              title='Trang trước'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
            <span className='px-2'>
              Trang <strong>{currentPageIndex + 1}</strong> / {totalPages}
            </span>
            <button
              onClick={isRTL ? handlePrev : handleNext}
              disabled={isRTL ? currentPageIndex <= 0 : currentPageIndex >= totalPages - 1}
              className='p-1.5 rounded-lg border border-[#27272A] hover:bg-[#27272A] disabled:opacity-30 disabled:pointer-events-none cursor-pointer'
              title='Trang sau'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        )}

        {/* Right Tools */}
        <div className='flex items-center gap-2'>
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'vertical' : 'single')}
            className={`p-1.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
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
            className='p-1.5 rounded-lg border border-[#27272A] hover:bg-[#27272A] text-neutral-300 transition-colors cursor-pointer'
            title='Toàn màn hình'
          >
            {isFullscreen ? <Minimize2 className='w-4 h-4' /> : <Maximize2 className='w-4 h-4' />}
          </button>
        </div>
      </header>

      {/* Main Reading Canvas */}
      <div className='flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 bg-black relative custom-scrollbar'>
        {loading && (
          <div className='flex flex-col items-center justify-center gap-3 text-neutral-400'>
            <Loader2 className='w-8 h-8 animate-spin text-orange-500' />
            <span className='text-xs font-mono'>Đang nạp dữ liệu chương &amp; ảnh gốc...</span>
          </div>
        )}

        {error && (
          <div className='max-w-md p-6 bg-[#18181B] border border-rose-900/60 rounded-2xl text-center space-y-3 shadow-2xl'>
            <AlertCircle className='w-10 h-10 text-rose-500 mx-auto' />
            <h3 className='font-bold text-base text-rose-400'>Chưa Thể Đọc Chương Này</h3>
            <p className='text-xs text-neutral-400 leading-relaxed'>{error}</p>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer'
            >
              Quay lại Catalog
            </button>
          </div>
        )}

        {!loading && !error && data && totalPages === 0 && (
          <div className='text-center text-neutral-400 space-y-2'>
            <BookOpen className='w-8 h-8 mx-auto opacity-40' />
            <p className='text-xs'>Chương này chưa có trang bản vẽ nào được hoàn thiện.</p>
          </div>
        )}

        {/* Single Page View Mode */}
        {!loading && !error && data && totalPages > 0 && viewMode === 'single' && (
          <div className='h-full flex items-center justify-center relative max-w-full'>
            {currentPageUrl ? (
              <img
                src={currentPageUrl}
                alt={`Trang ${currentPageIndex + 1}`}
                className='max-h-full max-w-full object-contain shadow-2xl rounded-sm'
              />
            ) : (
              <div className='w-[600px] aspect-[2/3] bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center text-neutral-500 gap-2'>
                <BookOpen className='w-12 h-12 opacity-30' />
                <span className='text-xs font-mono'>
                  Trang {currentPageIndex + 1} (Chưa có artwork)
                </span>
              </div>
            )}

            {/* Click navigation overlays */}
            <div
              onClick={isRTL ? handleNext : handlePrev}
              className='absolute left-0 top-0 bottom-0 w-1/3 cursor-w-resize'
              title={isRTL ? 'Trang kế tiếp' : 'Trang trước'}
            />
            <div
              onClick={isRTL ? handlePrev : handleNext}
              className='absolute right-0 top-0 bottom-0 w-1/3 cursor-e-resize'
              title={isRTL ? 'Trang trước' : 'Trang kế tiếp'}
            />
          </div>
        )}

        {/* Vertical Webtoon View Mode */}
        {!loading && !error && data && totalPages > 0 && viewMode === 'vertical' && (
          <div className='max-w-3xl w-full flex flex-col items-center space-y-2 py-4'>
            {data.pages.map((p) => {
              const pUrl =
                p.imageUrl && p.imageUrl.trim() ? resolveCatalogImageUrl(p.imageUrl) : null;
              return (
                <div key={p.id} className='w-full flex justify-center'>
                  {pUrl ? (
                    <img
                      src={pUrl}
                      alt={`Trang ${p.pageNumber}`}
                      loading='lazy'
                      className='w-full max-w-2xl object-contain shadow-lg'
                    />
                  ) : (
                    <div className='w-full max-w-2xl aspect-[2/3] bg-neutral-900 flex items-center justify-center text-neutral-600 text-xs font-mono'>
                      Trang {p.pageNumber}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Bar in Single View Mode */}
      {!loading && !error && totalPages > 0 && viewMode === 'single' && (
        <footer className='h-12 bg-[#18181B] border-t border-[#27272A] px-4 flex items-center justify-between text-xs text-neutral-400 font-mono'>
          <span className='text-[11px] text-neutral-500'>
            {isRTL
              ? 'Mẹo: Dùng phím mũi tên Trái để sang trang kế tiếp (Chuẩn Manga)'
              : 'Mẹo: Dùng phím mũi tên Phải để sang trang'}
          </span>
          <div className='flex items-center gap-1.5'>
            <span>Tiến độ:</span>
            <span className='text-orange-400 font-bold'>
              {Math.round(((currentPageIndex + 1) / totalPages) * 100)}%
            </span>
          </div>
        </footer>
      )}
    </div>
  );
};
