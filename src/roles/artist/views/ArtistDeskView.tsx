import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArtistCanvaSidebar,
  ScriptLineItem,
  BibleEntityItem,
} from '../components/desk/ArtistCanvaSidebar';
import { ArtistPageItem } from '../components/desk/ArtistPageSidebar';
import { EyeOff } from 'lucide-react';

export interface ArtistDeskViewProps {
  workspaceRole?: string | null;
  initialPages?: ArtistPageItem[];
  initialScriptLines?: ScriptLineItem[];
  initialBibleEntities?: BibleEntityItem[];
}

const DEFAULT_MANGA_PAGES: ArtistPageItem[] = [
  {
    id: 'page-1',
    pageNumber: 1,
    title: 'Cổng Thành Phía Nam',
    stage: 'pencil',
    panelsCount: 4,
    format: 'B5 Master (600 DPI)',
    isVisible: true,
  },
  {
    id: 'page-2',
    pageNumber: 2,
    title: 'Cơn Bão Cát Nổi Lên',
    stage: 'ink',
    panelsCount: 5,
    format: 'B5 Master (600 DPI)',
    isVisible: true,
  },
  {
    id: 'page-3',
    pageNumber: 3,
    title: 'Cuộc Gặp Gỡ Định Mệnh',
    stage: 'lettering',
    panelsCount: 3,
    format: 'B5 Master (600 DPI)',
    isVisible: true,
  },
  {
    id: 'page-4',
    pageNumber: 4,
    title: 'Đại Cảnh Thung Lũng Hoang Tàn',
    stage: 'completed',
    panelsCount: 1,
    format: 'B5 Master (Spread)',
    isVisible: true,
  },
];

/**
 * ArtistDeskView - Bàn vẽ Artist với Sidebar đa năng phong cách Canva Editor
 * - Thanh bên Canva Navigation: Chuyển đổi 3 chế độ xem [Trang / Pages] - [Kịch bản / Script] - [Series Bible].
 * - Ngăn trượt Canva Drawer: Tích hợp đầy đủ xem kịch bản, tra cứu lore/nhân vật canon,
 *   và quản lý thêm/nhân bản/xoá/sắp xếp thứ tự trang.
 * - Khung vẽ trung tâm Manga B5: Tự động co giãn theo ngăn trượt Canva.
 */
export const ArtistDeskView: React.FC<ArtistDeskViewProps> = ({
  workspaceRole,
  initialPages = DEFAULT_MANGA_PAGES,
  initialScriptLines,
  initialBibleEntities,
}) => {
  const [pages, setPages] = useState<ArtistPageItem[]>(initialPages);
  const [selectedPageId, setSelectedPageId] = useState<string>(
    initialPages[0]?.id || 'page-1'
  );

  // Tìm trang hiện tại đang được chọn
  const selectedPage = useMemo(() => {
    return pages.find((p) => p.id === selectedPageId) || pages[0] || null;
  }, [pages, selectedPageId]);

  // Điều hướng bàn phím phím mũi tên Trái/Phải để đổi trang
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPages((currentPages) => {
          const currentIndex = currentPages.findIndex(
            (p) => p.id === selectedPageId
          );
          if (currentIndex > 0) {
            setSelectedPageId(currentPages[currentIndex - 1].id);
          }
          return currentPages;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPages((currentPages) => {
          const currentIndex = currentPages.findIndex(
            (p) => p.id === selectedPageId
          );
          if (currentIndex >= 0 && currentIndex < currentPages.length - 1) {
            setSelectedPageId(currentPages[currentIndex + 1].id);
          }
          return currentPages;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPageId]);

  // Handler: Chọn trang
  const handleSelectPage = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
  }, []);

  // Handler: Thêm trang mới
  const handleAddPage = useCallback(() => {
    setPages((prevPages) => {
      const newPageNumber = prevPages.length + 1;
      const newPage: ArtistPageItem = {
        id: `page-${Date.now()}`,
        pageNumber: newPageNumber,
        title: `Phân cảnh mới ${newPageNumber}`,
        stage: 'pencil',
        panelsCount: 1,
        format: 'B5 Master (600 DPI)',
        isVisible: true,
      };
      const updated = [...prevPages, newPage];
      setSelectedPageId(newPage.id);
      return updated;
    });
  }, []);

  // Handler: Nhân đôi trang
  const handleDuplicatePage = useCallback((pageId: string) => {
    setPages((prevPages) => {
      const index = prevPages.findIndex((p) => p.id === pageId);
      if (index === -1) return prevPages;
      const targetPage = prevPages[index];
      const duplicatedPage: ArtistPageItem = {
        ...targetPage,
        id: `page-${Date.now()}`,
        title: `${targetPage.title} (Bản sao)`,
        pageNumber: index + 2,
      };

      const updated = [
        ...prevPages.slice(0, index + 1),
        duplicatedPage,
        ...prevPages.slice(index + 1),
      ].map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

      setSelectedPageId(duplicatedPage.id);
      return updated;
    });
  }, []);

  // Handler: Xoá trang
  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) return;
      setPages((prevPages) => {
        const remaining = prevPages
          .filter((p) => p.id !== pageId)
          .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

        if (selectedPageId === pageId && remaining.length > 0) {
          setSelectedPageId(remaining[0].id);
        }
        return remaining;
      });
    },
    [pages.length, selectedPageId]
  );

  // Handler: Sắp xếp đổi thứ tự trang
  const handleMovePage = useCallback(
    (pageId: string, direction: 'up' | 'down') => {
      setPages((prevPages) => {
        const index = prevPages.findIndex((p) => p.id === pageId);
        if (index === -1) return prevPages;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prevPages.length) return prevPages;

        const updated = [...prevPages];
        const [movedItem] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, movedItem);

        return updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
      });
    },
    []
  );

  // Handler: Bật/tắt con mắt hiển thị trang
  const handleToggleVisibility = useCallback((pageId: string) => {
    setPages((prevPages) =>
      prevPages.map((p) =>
        p.id === pageId ? { ...p, isVisible: !p.isVisible } : p
      )
    );
  }, []);

  return (
    <div
      className='flex-1 basis-0 min-h-0 w-full h-full flex flex-row bg-[#F3F0E9] text-[#1C1917] overflow-hidden select-none relative'
      data-testid='artist-desk'
    >
      {/* 1. Sidebar Canva đa năng: Xem Pages, Script, Series Bible */}
      <ArtistCanvaSidebar
        pages={pages}
        selectedPageId={selectedPage?.id || ''}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onMovePage={handleMovePage}
        onToggleVisibility={handleToggleVisibility}
        scriptLines={initialScriptLines}
        bibleEntities={initialBibleEntities}
      />

      {/* 2. Khung bàn vẽ trung tâm - Main Canvas Shell */}
      <main
        className='flex-1 basis-0 min-h-0 min-w-0 h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden relative'
        data-testid='artist-canvas-shell'
      >
        {/* Thanh trạng thái nhanh của trang đang vẽ (Canva-style Canvas Pill) */}
        {selectedPage && (
          <header
            data-testid='canvas-page-header'
            className='absolute top-3 left-4 sm:left-6 z-10 flex items-center gap-2 bg-[#121316]/90 backdrop-blur-md text-[#A6AAB4] px-3.5 py-1.5 rounded-full border border-[#26282E] shadow-md text-[11px]'
          >
            <span className='font-mono font-bold text-white'>
              TRANG {String(selectedPage.pageNumber).padStart(2, '0')}
            </span>
            <span className='text-[#555]'>•</span>
            <span className='truncate max-w-[160px] sm:max-w-[240px] text-neutral-200 font-medium'>
              {selectedPage.title}
            </span>
            <span className='text-[#555]'>•</span>
            <span className='text-[10px] text-neutral-400'>
              {selectedPage.format || 'B5 Master (600 DPI)'}
            </span>
            <span className='text-[#555]'>•</span>
            <span className='text-[10px] text-purple-400 font-semibold'>
              {selectedPage.panelsCount} khung
            </span>
          </header>
        )}

        {/* Trang giấy trắng tinh bản vẽ chuẩn Manga (Tỷ lệ B5 Master 1:1.414, tự động co giãn fit chuẩn xác theo viewport) */}
        <div
          data-testid='artist-blank-sheet'
          className={`max-h-full max-w-full h-full w-auto aspect-[1/1.414] bg-white rounded-xs shadow-[0_12px_40px_rgba(28,25,23,0.08)] border border-[#D8D2C5] relative flex flex-col items-center justify-center p-6 sm:p-8 transition-all shrink-0 ${
            selectedPage && !selectedPage.isVisible
              ? 'opacity-40 filter grayscale'
              : 'opacity-100 hover:shadow-[0_16px_48px_rgba(28,25,23,0.12)]'
          }`}
        >
          {/* Vùng vẽ trang giấy trắng (Empty Canvas Surface) */}
          <div
            className='w-full h-full border border-dashed border-[#D8D2C5]/80 rounded-xs flex flex-col items-center justify-center relative'
            data-testid='artist-canvas-surface'
          >
            {/* Dấu định vị góc vẽ (Registration Crop Marks) */}
            <div className='absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#A8A29E]/80 pointer-events-none' />
            <div className='absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#A8A29E]/80 pointer-events-none' />
            <div className='absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#A8A29E]/80 pointer-events-none' />
            <div className='absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#A8A29E]/80 pointer-events-none' />

            {/* Khi trang bị ẩn bằng nút con mắt */}
            {selectedPage && !selectedPage.isVisible ? (
              <div
                data-testid='page-hidden-notice'
                className='flex flex-col items-center gap-1.5 text-neutral-400 select-none'
              >
                <EyeOff className='w-8 h-8 opacity-60' />
                <span className='text-[12px] font-medium'>
                  Trang {selectedPage.pageNumber} đang tạm ẩn
                </span>
                <span className='text-[10px] opacity-75'>
                  Bấm biểu tượng con mắt ở ngăn Trang Canva để mở lại
                </span>
              </div>
            ) : (
              <div className='flex flex-col items-center gap-1 text-[#A8A29E]/80 select-none pointer-events-none'>
                <span className='text-[13px] font-mono font-semibold tracking-wider text-[#78716C]'>
                  MANGA B5 MASTER CANVAS
                </span>
                <span className='text-[11px] text-[#A8A29E]'>
                  Trang {selectedPage?.pageNumber || 1} • {selectedPage?.panelsCount || 1} Khung
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArtistDeskView;
