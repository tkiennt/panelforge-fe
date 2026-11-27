import React from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  BookOpen,
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
  onOpenReader?: () => void;
}

/**
 * ArtistBottomPageStrip - Quản lý trang kiểu Canva (Bottom Filmstrip & Utility Bar)
 * - Background TRONG SUỐT (bg-transparent), không viền cắt ngang, hòa nhập hoàn toàn vào nền workspace.
 * - CĂN GIỮA MÀN HÌNH TUYỆT ĐỐI (tất cả thẻ trang và thanh tiện ích đều căn giữa theo trục ngang).
 * - Hiệu ứng mở mượt mà (smooth spring transition).
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
  onOpenReader,
}) => {
  const { t } = useTranslation('artist');
  const selectedIndex = pages.findIndex((p) => p.id === selectedPageId);
  const activePageNumber = selectedIndex >= 0 ? pages[selectedIndex].pageNumber : 1;
  const totalPages = pages.length;

  return (
    <footer
      className='w-full h-16 shrink-0 bg-white border-t border-[#E7E5E4] px-2 flex items-center justify-between gap-1.5 select-none z-20'
      data-testid='canva-bottom-page-manager'
    >
      {/* 1. HÀNG THUMBNAIL CÁC TRANG (COMPACT STITCH STRIP) */}
      <div
        className='flex-1 min-w-0 flex items-center justify-start gap-1.5 overflow-x-auto py-1'
        data-testid='canva-page-filmstrip'
      >
        {isFilmstripOpen && (
          <>
            {pages.map((page, index) => {
              const isSelected = page.id === selectedPageId;
              return (
                <div
                  key={page.id || index}
                  className='relative flex flex-col items-center gap-0.5 shrink-0 group'
                  data-testid={`canva-page-card-${page.pageNumber}`}
                >
                  <div
                    role='button'
                    tabIndex={0}
                    onClick={() => onSelectPage(page)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) return;
                        e.preventDefault();
                        onSelectPage(page);
                      }
                    }}
                    className={`relative w-7 h-8 rounded-sm cursor-pointer transition-colors flex items-center justify-center text-xs ${
                      isSelected
                        ? 'bg-orange-50 border-2 border-[#EA580C] font-bold text-[#EA580C]'
                        : 'bg-[#FAF9F5] border border-[#E7E5E4] text-stone-400 group-hover:border-stone-400 group-hover:text-stone-700'
                    }`}
                    aria-label={t('bottomPageStrip.pageAria', { pageNumber: page.pageNumber })}
                  >
                    <span>{page.pageNumber}</span>

                    {/* Nút tác vụ nhanh khi hover (Xóa / Nhân bản) */}
                    {canEdit && (
                      <div className='absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-0.5 bg-[#1C1917]/85 rounded p-0.5 z-10'>
                        {onDuplicatePage && (
                          <button
                            type='button'
                            title={t('bottomPageStrip.duplicatePageTitle')}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicatePage(page);
                            }}
                            className='p-0.5 text-white hover:text-orange-300 rounded cursor-pointer'
                          >
                            <Copy className='w-2.5 h-2.5' />
                          </button>
                        )}
                        {onDeletePage && pages.length > 1 && (
                          <button
                            type='button'
                            title={t('bottomPageStrip.deletePageTitle')}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePage(page.id);
                            }}
                            className='p-0.5 text-white hover:text-rose-400 rounded cursor-pointer'
                          >
                            <Trash2 className='w-2.5 h-2.5' />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-xs leading-tight whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'font-semibold text-[#EA580C]'
                        : 'text-stone-600 group-hover:text-stone-900'
                    }`}
                  >
                    {t('bottomPageStrip.pageAria', { pageNumber: page.pageNumber })}
                  </span>
                </div>
              );
            })}

            {/* Nút Thêm trang mới (+) */}
            {canEdit && (
              <button
                type='button'
                onClick={onAddPage}
                title={t('bottomPageStrip.addPageTitle')}
                data-testid='canva-add-page-btn'
                className='flex flex-col items-center gap-0.5 shrink-0 group cursor-pointer'
              >
                <div className='w-7 h-8 rounded-sm border border-dashed border-stone-300 group-hover:border-[#EA580C] group-hover:bg-orange-50/50 text-stone-400 group-hover:text-[#EA580C] flex items-center justify-center transition-colors'>
                  <Plus className='w-3.5 h-3.5' />
                </div>
                <span className='text-xs leading-tight text-stone-500 group-hover:text-[#EA580C] whitespace-nowrap'>
                  {t('bottomPageStrip.addPageShort')}
                </span>
              </button>
            )}
          </>
        )}

        {!isFilmstripOpen && (
          <button
            type='button'
            onClick={onToggleFilmstrip}
            data-testid='canva-toggle-pages-btn'
            className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FAF9F5] border border-[#E7E5E4] text-xs font-medium text-stone-700 hover:text-[#EA580C] cursor-pointer'
            title={t('bottomPageStrip.expandFilmstrip')}
          >
            <LayoutGrid className='w-3.5 h-3.5' />
            <span>
              {t('bottomPageStrip.pagesLabel')} ({activePageNumber} / {totalPages || 1})
            </span>
            <ChevronUp className='w-3 h-3 opacity-70' />
          </button>
        )}
      </div>

      {/* 2. ZOOM & FULLSCREEN CONTROLS (STITCH PILL) */}
      <div className='flex items-center gap-2 shrink-0'>
        {onOpenReader && (
          <button
            type='button'
            onClick={onOpenReader}
            data-testid='artist-bottom-strip-read-btn'
            className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FAF9F5] border border-[#E7E5E4] text-xs font-medium text-stone-700 hover:text-[#EA580C] hover:border-orange-300 transition-colors cursor-pointer shadow-2xs'
            title={t('bottomPageStrip.readChapterTooltip', 'Đọc thử toàn bộ chương')}
          >
            <BookOpen className='w-3.5 h-3.5 text-orange-600' />
            <span>{t('bottomPageStrip.readChapterLabel', 'Đọc demo')}</span>
          </button>
        )}

        <div
          className='flex items-center gap-0.5 shrink-0 bg-[#FAF9F5] border border-[#E7E5E4] px-1.5 py-1 rounded text-xs text-stone-700'
          data-testid='canva-bottom-bar'
        >
        <span className='sr-only' data-testid='canva-page-counter'>
          {activePageNumber} / {totalPages || 1}
        </span>

        <button
          type='button'
          onClick={() => onZoomChange(Math.max(0.3, Math.round((zoomScale - 0.1) * 100) / 100))}
          className='w-5 h-5 flex items-center justify-center rounded text-stone-700 hover:bg-white transition-colors font-bold text-xs cursor-pointer'
          title={t('bottomPageStrip.zoomOutTitle')}
          aria-label={t('bottomPageStrip.zoomOutTitle')}
        >
          −
        </button>

        <span className='font-mono text-xs font-semibold text-stone-800 px-1 min-w-[36px] text-center'>
          {Math.round(zoomScale * 100)}%
        </span>

        <button
          type='button'
          onClick={() => onZoomChange(Math.min(2.0, Math.round((zoomScale + 0.1) * 100) / 100))}
          className='w-5 h-5 flex items-center justify-center rounded text-stone-700 hover:bg-white transition-colors font-bold text-xs cursor-pointer'
          title={t('bottomPageStrip.zoomInTitle')}
          aria-label={t('bottomPageStrip.zoomInTitle')}
        >
          +
        </button>

        {onToggleFullscreen && (
          <>
            <span className='w-px h-3.5 bg-stone-300 mx-0.5' aria-hidden='true' />
            <button
              type='button'
              onClick={onToggleFullscreen}
              className='w-5 h-5 flex items-center justify-center rounded text-stone-700 hover:bg-white transition-colors cursor-pointer'
              title={
                isFullscreen ? t('bottomPageStrip.exitFullscreen') : t('bottomPageStrip.fullscreen')
              }
              aria-label={
                isFullscreen ? t('bottomPageStrip.exitFullscreen') : t('bottomPageStrip.fullscreen')
              }
            >
              {isFullscreen ? <Minimize2 className='w-3 h-3' /> : <Maximize2 className='w-3 h-3' />}
            </button>
          </>
        )}
        </div>
      </div>
    </footer>
  );
};

export default ArtistBottomPageStrip;
