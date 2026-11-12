// src/roles/writer/components/script/thumbnail-studio/components/ThumbnailDrawer.tsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useComicStudioStore } from '../store/useComicStudioStore';
import { ThumbnailCard } from './ThumbnailCard';
import { PanelNode } from '../types';
import { X, Plus, Film, BookOpen } from 'lucide-react';

interface ThumbnailDrawerProps {
  onFocusPanelInEditor?: (panel: PanelNode) => void;
}

export const ThumbnailDrawer: React.FC<ThumbnailDrawerProps> = ({ onFocusPanelInEditor }) => {
  const {
    ast,
    isDrawerOpen,
    activePanelId,
    sketches,
    closeDrawer,
    setActivePanel,
    insertTransitionPage,
    saveSketch,
    clearSketch,
  } = useComicStudioStore();

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  const totalPanels = ast.pages.reduce((acc, p) => acc + p.panels.length, 0);

  const handleSelectPanel = (panel: PanelNode, pageNumber: number) => {
    setActivePanel(panel.id, pageNumber, panel.panelNumber);
    onFocusPanelInEditor?.(panel);
  };

  const handleInsertBridgePage = (afterPageNumber: number, prevRank: string, nextRank?: string) => {
    insertTransitionPage(afterPageNumber, prevRank, nextRank);
  };

  if (typeof document === 'undefined') return null;

  const content = (
    <>
      {/* Backdrop mờ nhẹ */}
      {isDrawerOpen && (
        <div
          data-testid='thumbnail-drawer-backdrop'
          onClick={closeDrawer}
          className='fixed inset-0 z-[998] bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in'
        />
      )}

      {/* Slide-over Drawer Panel */}
      <aside
        data-testid='thumbnail-drawer'
        className={`fixed top-0 right-0 bottom-0 z-[999] w-full sm:w-[450px] md:w-[480px] bg-[#FCFBF8] border-l border-[#D8D2C5] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className='shrink-0 px-5 py-4 border-b border-[#D8D2C5] bg-[#F7F5EE] flex items-center justify-between gap-3 shadow-2xs'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-xl bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#C2410C] shadow-2xs'>
              <Film className='w-4 h-4' />
            </div>
            <div>
              <h2 className='text-sm font-bold font-serif text-[#1C1917] flex items-center gap-2'>
                THUMBNAILS & STORYBOARD
              </h2>
              <div className='flex items-center gap-2 text-[11px] text-[#57534E] font-mono'>
                <span>{ast.pages.length} trang</span>
                <span>•</span>
                <span>{totalPanels} ô truyện</span>
              </div>
            </div>
          </div>

          <button
            type='button'
            data-testid='close-thumbnail-drawer-btn'
            onClick={closeDrawer}
            className='p-1.5 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#EBE7DF] transition-colors cursor-pointer'
            title='Đóng bảng thumbnail (Esc)'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-4 md:p-5 space-y-6 custom-scrollbar bg-[#F3F0E9]/50'>
          {ast.pages.length === 0 ? (
            <div className='text-center py-20 px-4 bg-[#FCFBF8] rounded-2xl border border-dashed border-[#D8D2C5] text-[#57534E] space-y-2'>
              <BookOpen className='w-8 h-8 text-[#57534E]/50 mx-auto' />
              <h4 className='text-xs font-bold text-[#1C1917]'>
                Chưa có trang truyện nào được bóc tách
              </h4>
              <p className='text-[11px] max-w-xs mx-auto'>
                Bắt đầu gõ{' '}
                <code className='bg-[#F3F0E9] px-1 py-0.5 rounded font-mono text-[#C2410C]'>
                  # Page 1
                </code>{' '}
                và{' '}
                <code className='bg-[#F3F0E9] px-1 py-0.5 rounded font-mono text-[#C2410C]'>
                  - Panel 1: Cận cảnh
                </code>{' '}
                ở khung soạn thảo để kích hoạt Thumbnail tự động.
              </p>
            </div>
          ) : (
            ast.pages.map((page, pageIndex) => {
              const nextPage = ast.pages[pageIndex + 1];

              return (
                <div key={page.id} className='space-y-3'>
                  {/* Page Section Container */}
                  <div className='bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-xs p-3.5 space-y-3'>
                    {/* Page Header */}
                    <div className='flex items-center justify-between gap-2 pb-2 border-b border-[#EBE7DF]'>
                      <div className='flex items-center gap-2'>
                        <span className='px-2 py-0.5 rounded-md bg-[#C2410C] text-white font-mono text-xs font-bold shadow-2xs'>
                          TRANG {page.pageNumber}
                        </span>
                        <span className='text-xs font-semibold text-[#1C1917]'>
                          {page.panels.length} ô truyện
                        </span>
                      </div>

                      <span
                        className='text-[9px] font-mono text-[#57534E] bg-[#F3F0E9] px-2 py-0.5 rounded-full'
                        title={`LexoRank: ${page.orderRank}`}
                      >
                        Rank: {page.orderRank.slice(0, 8)}...
                      </span>
                    </div>

                    {/* Panels Strip Grid */}
                    {page.panels.length === 0 ? (
                      <div className='py-6 text-center text-[11px] text-[#57534E] italic bg-[#F7F5EE]/60 rounded-xl border border-dashed border-[#D8D2C5]'>
                        Chưa có ô truyện trong trang này. Gõ{' '}
                        <code className='font-mono text-[#C2410C]'>- Panel 1</code> để thêm.
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        {page.panels.map((panel) => (
                          <ThumbnailCard
                            key={panel.id}
                            panel={panel}
                            pageNumber={page.pageNumber}
                            sketchDataUrl={sketches[panel.id]}
                            isActive={activePanelId === panel.id}
                            onSelectPanel={(p) => handleSelectPanel(p, page.pageNumber)}
                            onSaveSketch={saveSketch}
                            onClearSketch={clearSketch}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Transition Page Button Between Pages */}
                  <div className='relative py-1 flex items-center justify-center group/trans'>
                    <div className='absolute inset-0 flex items-center'>
                      <div className='w-full border-t border-dashed border-[#D8D2C5] group-hover/trans:border-[#C2410C]/40 transition-colors' />
                    </div>
                    <button
                      type='button'
                      data-testid={`insert-transition-page-${page.pageNumber}`}
                      onClick={() =>
                        handleInsertBridgePage(page.pageNumber, page.orderRank, nextPage?.orderRank)
                      }
                      className='relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[#57534E] bg-[#FCFBF8] border border-[#D8D2C5] group-hover/trans:border-[#C2410C] group-hover/trans:text-[#C2410C] group-hover/trans:bg-[#FFF2E6] shadow-2xs transition-all cursor-pointer'
                    >
                      <Plus className='w-3.5 h-3.5 text-[#C2410C]' />
                      <span>+ Chèn trang đệm ({page.pageNumber + 0.5})</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className='shrink-0 px-5 py-3 border-t border-[#D8D2C5] bg-[#F7F5EE]/90 text-[11px] text-[#57534E] font-mono flex items-center justify-between'>
          <span>
            Phím tắt:{' '}
            <kbd className='px-1.5 py-0.5 bg-white border rounded shadow-2xs font-bold text-[#1C1917]'>
              Tab
            </kbd>{' '}
            hoặc{' '}
            <kbd className='px-1.5 py-0.5 bg-white border rounded shadow-2xs font-bold text-[#1C1917]'>
              Ctrl+B
            </kbd>
          </span>
          <span className='text-[10px] text-[#C2410C] font-semibold'>
            Tự động đồng bộ hai chiều
          </span>
        </div>
      </aside>
    </>
  );

  return createPortal(content, document.body);
};
