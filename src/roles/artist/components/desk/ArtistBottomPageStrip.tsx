import React from 'react';
import {
  LayoutGrid,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { PageDto } from '@/services/page.service';

export interface ArtistBottomPageStripProps {
  pages: PageDto[];
  selectedPageId: string | null;
  onSelectPage: (page: PageDto) => void;
  onAddPage: () => void;
  onDeletePage?: (pageId: string) => void;
  onDuplicatePage?: (page: PageDto) => void;
  isFilmstripOpen: boolean;
  onToggleFilmstrip: () => void;
  zoomScale: number;
  onZoomChange: (newZoom: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  canEdit?: boolean;
}

/**
 * ArtistBottomPageStrip - Quản lý trang kiểu Canva (Bottom Filmstrip & Utility Bar)
 * - Đã loại bỏ ghi chú, hẹn giờ, và các chữ kĩ thuật không cần thiết.
 * - Hàng trên: Filmstrip chứa thumbnails các trang trắng sạch sẽ, số trang bên dưới, nút thêm trang.
 * - Hàng dưới: Thanh tiện ích gọn gàng gồm Zoom slider, Nút Trang (thu/mở), Bộ đếm trang (e.g. 6 / 12), Toàn màn hình.
 */
export const ArtistBottomPageStrip: React.FC<ArtistBottomPageStripProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  isFilmstripOpen,
  onToggleFilmstrip,
  zoomScale,
  onZoomChange,
  isFullscreen,
  onToggleFullscreen,
  canEdit = true,
}) => {
  const selectedIndex = pages.findIndex((p) => p.id === selectedPageId);
  const activePageNumber = selectedIndex >= 0 ? pages[selectedIndex].pageNumber : 1;
  const totalPages = pages.length;

  return (
    <footer
      className='w-full shrink-0 flex flex-col bg-[#FCFBF8] border-t border-[#D8D2C5] shadow-xs select-none z-30 transition-all duration-200'
      data-testid='canva-bottom-page-manager'
    >
      {/* 1. HÀNG THUMBNAIL CÁC TRANG (FILMSTRIP) */}
      {isFilmstripOpen && (
        <div
          className='w-full border-b border-[#E7E2D6] bg-[#F7F5F0]/80 backdrop-blur-sm px-4 py-3 overflow-x-auto flex items-center gap-3 custom-scrollbar transition-all'
          data-testid='canva-page-filmstrip'
        >
          {pages.map((page, index) => {
            const isSelected = page.id === selectedPageId;
            return (
              <div
                key={page.id || index}
                className='flex flex-col items-center gap-1.5 shrink-0 group'
                data-testid={`canva-page-card-${page.pageNumber}`}
              >
                {/* Khung thumbnail trang trắng sạch sẽ */}
                <div
                  role='button'
                  tabIndex={0}
                  onClick={() => onSelectPage(page)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectPage(page);
                  }}
                  className={`relative w-[104px] h-[74px] rounded-sm bg-white border cursor-pointer transition-all flex flex-col items-center justify-center shadow-xs overflow-hidden ${
                    isSelected
                      ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/40 shadow-sm'
                      : 'border-[#D8D2C5] hover:border-[#A8A29E] hover:shadow-xs'
                  }`}
                  aria-label={`Trang ${page.pageNumber}`}
                >
                  {/* Trang giấy trắng thu nhỏ (Không chữ kỹ thuật) */}
                  <div className='w-full h-full p-2 flex items-center justify-center pointer-events-none'>
                    <div className='w-full h-full border border-dashed border-stone-200 rounded-[2px] bg-stone-50/30' />
                  </div>

                  {/* Nút tác vụ nhanh khi hover (Xóa / Nhân bản) */}
                  {canEdit && (
                    <div className='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#1C1917]/80 rounded p-0.5 backdrop-blur-xs'>
                      {onDuplicatePage && (
                        <button
                          type='button'
                          title='Nhân bản trang'
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicatePage(page);
                          }}
                          className='p-0.5 text-white hover:text-orange-300 rounded cursor-pointer'
                        >
                          <Copy className='w-3 h-3' />
                        </button>
                      )}
                      {onDeletePage && pages.length > 1 && (
                        <button
                          type='button'
                          title='Xóa trang'
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(page.id);
                          }}
                          className='p-0.5 text-white hover:text-rose-400 rounded cursor-pointer'
                        >
                          <Trash2 className='w-3 h-3' />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Số thứ tự trang dưới thumbnail (Chuẩn Canva) */}
                <span
                  className={`text-xs font-medium ${
                    isSelected ? 'text-[#7C3AED] font-bold' : 'text-[#57534E]'
                  }`}
                >
                  {page.pageNumber}
                </span>
              </div>
            );
          })}

          {/* Nút Thêm trang mới (+) ở cuối filmstrip */}
          {canEdit && (
            <div className='flex flex-col items-center gap-1.5 shrink-0'>
              <button
                type='button'
                onClick={onAddPage}
                title='Thêm trang mới'
                data-testid='canva-add-page-btn'
                className='w-[104px] h-[74px] rounded-sm border-2 border-dashed border-[#D8D2C5] hover:border-[#7C3AED] hover:bg-[#F5F3FF] text-[#57534E] hover:text-[#7C3AED] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all'
              >
                <Plus className='w-5 h-5' />
                <span className='text-[11px] font-semibold'>Thêm trang</span>
              </button>
              <span className='text-xs text-transparent select-none'>+</span>
            </div>
          )}
        </div>
      )}

      {/* 2. THANH TIỆN ÍCH DƯỚI CÙNG (BOTTOM UTILITY BAR) */}
      <div
        className='h-10 px-4 flex items-center justify-between text-xs text-[#57534E]'
        data-testid='canva-bottom-bar'
      >
        {/* Góc trái: Trống gọn gàng (Đã bỏ Ghi chú & Hẹn giờ) */}
        <div className='flex items-center gap-2' />

        {/* Góc phải: Slider Zoom, Toggle Pages, Page Counter, Fullscreen */}
        <div className='flex items-center gap-3 sm:gap-5'>
          {/* Zoom Slider */}
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => onZoomChange(Math.max(0.3, zoomScale - 0.1))}
              className='p-1 rounded hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] cursor-pointer'
              title='Thu nhỏ'
            >
              <ZoomOut className='w-3.5 h-3.5' />
            </button>

            <input
              type='range'
              min='0.3'
              max='2.0'
              step='0.05'
              value={zoomScale}
              onChange={(e) => onZoomChange(parseFloat(e.target.value))}
              className='w-16 sm:w-24 h-1.5 bg-[#E7E2D6] rounded-lg appearance-none cursor-pointer accent-[#7C3AED]'
              title='Phóng to / thu nhỏ canvas'
            />

            <button
              type='button'
              onClick={() => onZoomChange(Math.min(2.0, zoomScale + 0.1))}
              className='p-1 rounded hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] cursor-pointer'
              title='Phóng to'
            >
              <ZoomIn className='w-3.5 h-3.5' />
            </button>

            <span className='w-10 text-right font-mono text-[11px] font-semibold text-[#1C1917]'>
              {Math.round(zoomScale * 100)}%
            </span>
          </div>

          <div className='w-[1px] h-4 bg-[#D8D2C5]' />

          {/* Nút Toggle mở/đóng hàng trang (Pages Button) */}
          <button
            type='button'
            onClick={onToggleFilmstrip}
            data-testid='canva-toggle-pages-btn'
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
              isFilmstripOpen
                ? 'bg-[#F5F3FF] text-[#7C3AED] font-semibold'
                : 'hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917]'
            }`}
            title={isFilmstripOpen ? 'Thu gọn hàng trang' : 'Mở hàng trang'}
          >
            <LayoutGrid className='w-3.5 h-3.5' />
            <span>Trang</span>
            {isFilmstripOpen ? (
              <ChevronDown className='w-3 h-3 opacity-70' />
            ) : (
              <ChevronUp className='w-3 h-3 opacity-70' />
            )}
          </button>

          {/* Bộ đếm trang (e.g. 6 / 12) */}
          <div
            className='font-mono font-medium text-[#1C1917] px-1 py-0.5 select-none'
            data-testid='canva-page-counter'
          >
            {activePageNumber} / {totalPages || 1}
          </div>

          {/* Toàn màn hình */}
          {onToggleFullscreen && (
            <button
              type='button'
              onClick={onToggleFullscreen}
              className='p-1 rounded hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer'
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
              {isFullscreen ? (
                <Minimize2 className='w-3.5 h-3.5' />
              ) : (
                <Maximize2 className='w-3.5 h-3.5' />
              )}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};

export default ArtistBottomPageStrip;
