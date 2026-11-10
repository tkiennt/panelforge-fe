import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { pageService, PageDto } from '@/services/page.service';
import { chapterService } from '@/services/chapter.service';
import { ArtistBottomPageStrip } from '../components/desk/ArtistBottomPageStrip';

export interface ArtistDeskViewProps {
  workspaceRole?: string | null;
}

// Dữ liệu trang khởi tạo mặc định nếu chương chưa có trang
const DEFAULT_INITIAL_PAGES: PageDto[] = [
  {
    id: 'page-default-1',
    chapterId: 'chap-1',
    pageNumber: 1,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-2',
    chapterId: 'chap-1',
    pageNumber: 2,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-3',
    chapterId: 'chap-1',
    pageNumber: 3,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-4',
    chapterId: 'chap-1',
    pageNumber: 4,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-5',
    chapterId: 'chap-1',
    pageNumber: 5,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-6',
    chapterId: 'chap-1',
    pageNumber: 6,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
];

/**
 * ArtistDeskView - Canva-Style Manga Workspace
 * - Giữ nguyên side tab của hệ thống hiện tại (AppShellSidebar).
 * - Canvas vẽ trang giấy trắng tinh ở trung tâm (loại bỏ hoàn toàn các chữ kỹ thuật).
 * - Quản lý trang nằm ở cạnh đáy theo kiểu Canva (đã xóa Ghi chú và Hẹn giờ).
 */
export const ArtistDeskView: React.FC<ArtistDeskViewProps> = () => {
  const { seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');

  const [currentChapterId, setCurrentChapterId] = useState<string | null>(chapterIdFromUrl);
  const [pages, setPages] = useState<PageDto[]>(DEFAULT_INITIAL_PAGES);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(DEFAULT_INITIAL_PAGES[0].id);

  // Điều khiển thanh trang & canvas
  const [isFilmstripOpen, setIsFilmstripOpen] = useState(true);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tải danh sách trang từ API backend nếu có chapterId
  const loadPages = useCallback(async (chapId: string) => {
    try {
      const fetched = await pageService.getPagesByChapter(chapId);
      if (Array.isArray(fetched) && fetched.length > 0) {
        setPages(fetched);
        setSelectedPageId((prev) => (fetched.some((p) => p.id === prev) ? prev : fetched[0].id));
      }
    } catch {
      // Giữ trang mặc định nếu chưa kết nối hoặc có lỗi
    }
  }, []);

  // Tự động tìm chapter đầu tiên nếu URL chưa có chapterId
  useEffect(() => {
    let alive = true;
    if (seriesId && !currentChapterId && chapterService.getChaptersBySeries) {
      chapterService
        .getChaptersBySeries(seriesId)
        .then((chaps) => {
          if (!alive || !chaps || chaps.length === 0) return;
          const firstId = chaps[0].id;
          setCurrentChapterId(firstId);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('chapterId', firstId);
            return next;
          });
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [seriesId, currentChapterId, setSearchParams]);

  useEffect(() => {
    if (currentChapterId) {
      loadPages(currentChapterId);
    }
  }, [currentChapterId, loadPages]);

  // Thao tác trang: Chọn trang
  const handleSelectPage = (page: PageDto) => {
    setSelectedPageId(page.id);
  };

  // Thao tác trang: Thêm trang mới
  const handleAddPage = async () => {
    const nextNumber = pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) + 1 : 1;
    const tempId = `page-new-${Date.now()}`;
    const newPage: PageDto = {
      id: tempId,
      chapterId: currentChapterId || 'default-chapter',
      pageNumber: nextNumber,
      layoutFormat: 'B5',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    };

    setPages((prev) => [...prev, newPage]);
    setSelectedPageId(newPage.id);

    if (currentChapterId) {
      try {
        const created = await pageService.createPage(currentChapterId, {
          pageNumber: nextNumber,
          layoutFormat: newPage.layoutFormat,
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
        });
        if (created?.id) {
          setPages((prev) => prev.map((p) => (p.id === tempId ? created : p)));
          setSelectedPageId(created.id);
        }
      } catch {
        // Giữ lại newPage ở state local
      }
    }
  };

  // Thao tác trang: Xóa trang
  const handleDeletePage = async (pageId: string) => {
    if (pages.length <= 1) return;
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (selectedPageId === pageId) {
      setSelectedPageId(remaining[0]?.id || null);
    }

    if (pageService.deletePage) {
      try {
        await pageService.deletePage(pageId);
      } catch {
        // Đã xóa trên local
      }
    }
  };

  // Thao tác trang: Nhân bản trang
  const handleDuplicatePage = (page: PageDto) => {
    const nextNumber = Math.max(...pages.map((p) => p.pageNumber)) + 1;
    const duplicated: PageDto = {
      ...page,
      id: `page-dup-${Date.now()}`,
      pageNumber: nextNumber,
    };
    setPages((prev) => [...prev, duplicated]);
    setSelectedPageId(duplicated.id);
  };

  // Bật/tắt toàn màn hình
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className='flex-1 basis-0 min-h-0 w-full h-full flex flex-col bg-[#F3F0E9] text-[#1C1917] overflow-hidden select-none relative'
      data-testid='artist-desk'
    >
      {/* KHU VỰC BÀN VẼ CHÍNH (CANVAS WORKSPACE) - Co giãn tự do theo kích thước còn lại */}
      <main
        className='relative flex-1 min-h-0 min-w-0 w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden'
        data-testid='artist-canvas-shell'
      >
        {/* Wrapper phóng to/thu nhỏ canvas theo slider */}
        <div
          className='w-full h-full flex items-center justify-center transition-transform duration-100 ease-out origin-center'
          style={{ transform: `scale(${zoomScale})` }}
        >
          {/* Trang giấy trắng tinh chuẩn Manga (Tỷ lệ B5 Master 1:1.414, không chữ kỹ thuật) */}
          <div
            data-testid='artist-blank-sheet'
            className='max-h-full max-w-full h-full w-auto aspect-[1/1.414] bg-white rounded-xs shadow-[0_14px_45px_rgba(28,25,23,0.08)] border border-[#D8D2C5] relative flex flex-col items-center justify-center p-6 sm:p-8 transition-all shrink-0'
          >
            {/* Vùng vẽ trang giấy trắng tinh khiết */}
            <div
              className='w-full h-full border border-dashed border-[#D8D2C5]/70 rounded-xs flex flex-col items-center justify-center relative'
              data-testid='artist-canvas-surface'
            >
              {/* Dấu định vị 4 góc vẽ (Crop marks tinh tế) */}
              <div className='absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#A8A29E]/70 pointer-events-none' />
              <div className='absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#A8A29E]/70 pointer-events-none' />
              <div className='absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#A8A29E]/70 pointer-events-none' />
              <div className='absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#A8A29E]/70 pointer-events-none' />
            </div>
          </div>
        </div>
      </main>

      {/* THANH QUẢN LÝ TRANG Ở ĐÁY MÀN HÌNH - PHONG CÁCH CANVA */}
      <ArtistBottomPageStrip
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        onDuplicatePage={handleDuplicatePage}
        isFilmstripOpen={isFilmstripOpen}
        onToggleFilmstrip={() => setIsFilmstripOpen((v) => !v)}
        zoomScale={zoomScale}
        onZoomChange={setZoomScale}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        canEdit={true}
      />
    </div>
  );
};

export default ArtistDeskView;
