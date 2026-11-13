import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  LayoutTemplate,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Square,
} from 'lucide-react';
import { PanelBlockData } from './workspace.types';

interface ArtistPageCanvasProps {
  pageNumber: number;
  templateId: string;
  panels: PanelBlockData[];
  selectedPanelNumber: number | null;
  onSelectPanel: (panelNumber: number) => void;
  onUploadPanelArtwork: (panelNumber: number, file: File) => void;
  onRemovePanelArtwork: (panelNumber: number) => void;
  onOpenTemplateSidebar: () => void;
  onResetToSinglePanel: () => void;
}

export const ArtistPageCanvas: React.FC<ArtistPageCanvasProps> = ({
  pageNumber,
  templateId,
  panels,
  selectedPanelNumber,
  onSelectPanel,
  onUploadPanelArtwork,
  onRemovePanelArtwork,
  onOpenTemplateSidebar,
  onResetToSinglePanel,
}) => {
  const isSinglePanel = templateId === 'single-full' || panels.length <= 1;
  const singlePanel = panels[0];
  const hasSingleArtwork = Boolean(singlePanel?.artwork?.imageUrl);

  const [dragOverPanelNumber, setDragOverPanelNumber] = useState<number | null>(null);
  const [isFullCanvasDragOver, setIsFullCanvasDragOver] = useState(false);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const singlePageFileInputRef = useRef<HTMLInputElement>(null);

  // Lắng nghe phím tắt Ctrl+V dán ảnh trực tiếp từ Clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            if (isSinglePanel) {
              onUploadPanelArtwork(1, file);
            } else if (selectedPanelNumber) {
              onUploadPanelArtwork(selectedPanelNumber, file);
            }
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isSinglePanel, selectedPanelNumber, onUploadPanelArtwork]);

  // Handler kéo thả file vào khung cụ thể
  const handlePanelDrop = (e: React.DragEvent, panelNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPanelNumber(null);
    setIsFullCanvasDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      onUploadPanelArtwork(panelNumber, files[0]);
    }
  };

  return (
    <div
      data-testid='artist-page-canvas-container'
      className='flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#FAF8F5] overflow-y-auto relative'
    >
      {/* Hidden File Input cho chế độ 1-panel */}
      <input
        ref={singlePageFileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        data-testid='single-page-file-input'
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onUploadPanelArtwork(1, file);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden File Inputs cho từng Panel độc lập */}
      {panels.map((p) => (
        <input
          key={p.panelNumber}
          ref={(el) => {
            fileInputRefs.current[p.panelNumber] = el;
          }}
          type='file'
          accept='image/png,image/jpeg,image/webp'
          className='hidden'
          data-testid={`panel-file-input-${p.panelNumber}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUploadPanelArtwork(p.panelNumber, file);
              e.target.value = '';
            }
          }}
        />
      ))}

      {/* Manga Page Viewport (Tỷ lệ B5 1200x1800, Clean White Canvas) */}
      <div
        data-testid='manga-b5-viewport'
        style={{
          transform: zoomPercent === 100 ? undefined : `scale(${zoomPercent / 100})`,
          transformOrigin: 'center center',
        }}
        className='w-full max-w-[560px] aspect-[1200/1800] bg-white border-2 border-[#171717] rounded-sm shadow-xl relative overflow-hidden flex flex-col select-none transition-transform'
        onDragOver={(e) => {
          e.preventDefault();
          if (isSinglePanel) setIsFullCanvasDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (isSinglePanel) setIsFullCanvasDragOver(false);
        }}
        onDrop={(e) => {
          if (isSinglePanel) {
            e.preventDefault();
            setIsFullCanvasDragOver(false);
            const files = e.dataTransfer.files;
            if (files && files.length > 0 && files[0].type.startsWith('image/')) {
              onUploadPanelArtwork(1, files[0]);
            }
          }
        }}
      >
        {/* Safe Margin viền mờ tối giản */}
        <div className='absolute inset-3 border border-stone-200/40 pointer-events-none z-10' />

        {/* TRƯỜNG HỢP 1: SINGLE-PANEL WORKSPACE (1 Khung mặc định Toàn Trang) */}
        {isSinglePanel && (
          <div className='w-full h-full p-4 relative flex items-center justify-center bg-white'>
            {!hasSingleArtwork ? (
              /* EMPTY STATE: Centered Clean Dropzone */
              <div
                data-testid='single-panel-empty-state'
                className={`w-full h-full rounded border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-colors ${
                  isFullCanvasDragOver
                    ? 'border-orange-500 bg-orange-50/60'
                    : 'border-[#D8D2C5] bg-white'
                }`}
              >
                <div className='w-14 h-14 rounded-2xl bg-orange-100/80 border border-orange-200 flex items-center justify-center text-[#F97316] shadow-2xs mb-4'>
                  <ImageIcon className='w-7 h-7' />
                </div>

                <h3 className='font-bold text-base text-[#1C1917] mb-1'>
                  Trang {pageNumber} chưa có tranh
                </h3>
                <p className='text-xs text-[#57534E] max-w-sm mb-6 leading-relaxed'>
                  Kéo thả bản vẽ toàn trang vào đây hoặc tải ảnh lên. Hỗ trợ nạp tranh toàn trang
                  hoặc chọn mẫu khung để chia nhiều ô.
                </p>

                {/* 2 Centered CTA Buttons */}
                <div className='flex flex-wrap items-center justify-center gap-3 w-full max-w-xs'>
                  <button
                    type='button'
                    data-testid='canvas-empty-upload-artwork-btn'
                    onClick={() => singlePageFileInputRef.current?.click()}
                    className='w-full sm:w-auto flex-1 px-4 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-[0.98]'
                  >
                    <Upload className='w-4 h-4' />
                    <span>Tải ảnh lên</span>
                  </button>

                  <button
                    type='button'
                    data-testid='canvas-empty-select-template-btn'
                    onClick={onOpenTemplateSidebar}
                    className='w-full sm:w-auto flex-1 px-4 py-2.5 rounded-lg bg-white border border-[#D8D2C5] text-[#1C1917] hover:bg-stone-100 hover:border-stone-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all active:scale-[0.98]'
                  >
                    <LayoutTemplate className='w-4 h-4 text-[#F97316]' />
                    <span>Chọn Template</span>
                  </button>
                </div>

                <span className='text-[10px] text-stone-400 mt-4 flex items-center gap-1'>
                  Hỗ trợ kéo thả ảnh hoặc dán nhanh bằng phím tắt{' '}
                  <kbd className='px-1 py-0.5 bg-stone-100 border border-stone-300 rounded font-mono text-[9px] text-stone-600'>
                    Ctrl+V
                  </kbd>
                </span>
              </div>
            ) : (
              /* POPULATED FULL-PAGE ARTWORK */
              <div
                data-testid='single-panel-populated-artwork'
                className='w-full h-full relative group overflow-hidden rounded bg-black/5 flex items-center justify-center'
              >
                <img
                  src={singlePanel.artwork?.imageUrl}
                  alt={`Bản vẽ Trang ${pageNumber}`}
                  className='w-full h-full object-contain'
                />

                {/* Badge trạng thái ở góc */}
                <div className='absolute top-3 left-3 bg-[#171717]/85 backdrop-blur-xs text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 shadow-xs z-20'>
                  <CheckCircle2 className='w-3 h-3 text-emerald-400' />
                  <span>Tranh cả trang · {singlePanel.artwork?.version || 'v1'}</span>
                </div>

                {/* Hover Action Overlay */}
                <div className='absolute inset-0 bg-[#171717]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-30 backdrop-blur-[1px]'>
                  <button
                    type='button'
                    data-testid='single-panel-replace-artwork-btn'
                    onClick={() => singlePageFileInputRef.current?.click()}
                    className='px-3.5 py-2 rounded-lg bg-white text-[#1C1917] hover:bg-stone-100 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95'
                    title='Tải đè bản vẽ mới cho trang'
                  >
                    <Upload className='w-3.5 h-3.5 text-[#F97316]' />
                    <span>Đổi tranh</span>
                  </button>
                  <button
                    type='button'
                    data-testid='single-panel-remove-artwork-btn'
                    onClick={() => onRemovePanelArtwork(1)}
                    className='px-3.5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95'
                    title='Xoá tranh khỏi trang này (để tải lại hoặc chia khung)'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    <span>Xoá tranh</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRƯỜNG HỢP 2: MULTI-PANEL WORKSPACE (Chia nhiều khung truyện) */}
        {!isSinglePanel && (
          <div className='w-full h-full relative bg-white'>
            {panels.map((p) => {
              const isSelected = selectedPanelNumber === p.panelNumber;
              const isDragOver = dragOverPanelNumber === p.panelNumber;
              const hasArt = Boolean(p.artwork?.imageUrl);

              return (
                <div
                  key={p.panelNumber}
                  data-testid={`panel-box-${p.panelNumber}`}
                  onClick={() => onSelectPanel(p.panelNumber)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverPanelNumber(p.panelNumber);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverPanelNumber(null);
                  }}
                  onDrop={(e) => handlePanelDrop(e, p.panelNumber)}
                  className={`absolute border-2 transition-all cursor-pointer overflow-hidden group ${
                    isSelected
                      ? 'border-[#F97316] ring-2 ring-[#F97316]/30 z-20 shadow-md'
                      : 'border-[#171717] hover:border-orange-400 z-10'
                  } ${
                    isDragOver
                      ? 'border-[#F97316] bg-orange-100/40 ring-4 ring-[#F97316]/40'
                      : 'bg-white'
                  }`}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.width}%`,
                    height: `${p.height}%`,
                  }}
                >
                  {/* Badge số thứ tự Panel */}
                  <div
                    className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold z-20 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#F97316] text-white shadow-2xs'
                        : 'bg-[#171717]/70 text-white'
                    }`}
                  >
                    <span>#{p.panelNumber}</span>
                  </div>

                  {hasArt ? (
                    /* Khung đã có tranh */
                    <div className='w-full h-full relative flex items-center justify-center bg-stone-100'>
                      <img
                        src={p.artwork?.imageUrl}
                        alt={`Khung ${p.panelNumber}`}
                        className='w-full h-full object-cover'
                      />

                      {/* Hover action overlay cho từng panel */}
                      <div className='absolute inset-0 bg-[#171717]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-30'>
                        <button
                          type='button'
                          data-testid={`panel-${p.panelNumber}-replace-btn`}
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRefs.current[p.panelNumber]?.click();
                          }}
                          className='p-1.5 rounded-lg bg-white text-[#1C1917] hover:bg-stone-100 font-bold text-xs flex items-center gap-1 shadow cursor-pointer'
                          title='Nạp lại tranh'
                        >
                          <Upload className='w-3 h-3 text-[#F97316]' />
                          <span className='text-[10px]'>Nạp lại</span>
                        </button>
                        <button
                          type='button'
                          data-testid={`panel-${p.panelNumber}-remove-btn`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePanelArtwork(p.panelNumber);
                          }}
                          className='p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow cursor-pointer'
                          title='Xoá tranh khỏi khung'
                        >
                          <Trash2 className='w-3 h-3' />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Khung rỗng chưa nạp tranh */
                    <div
                      data-testid={`panel-${p.panelNumber}-empty`}
                      className='w-full h-full border border-dashed border-stone-300 flex flex-col items-center justify-center p-2 text-center bg-[#FAF8F5]/80 hover:bg-orange-50/30 transition-colors'
                    >
                      <button
                        type='button'
                        data-testid={`panel-${p.panelNumber}-upload-btn`}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs.current[p.panelNumber]?.click();
                        }}
                        className='px-2.5 py-1.5 rounded bg-white border border-[#D8D2C5] text-[#1C1917] hover:border-orange-400 hover:text-[#F97316] text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors'
                      >
                        <Upload className='w-3 h-3 text-[#F97316]' />
                        <span>Nạp ảnh</span>
                      </button>
                      <span className='text-[9px] text-stone-400 mt-1 hidden sm:inline'>
                        Kéo thả file vào đây
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Pill ở cạnh đáy Canvas khi đang ở chế độ nhiều khung */}
      {!isSinglePanel && (
        <div
          data-testid='canvas-floating-controls'
          className='mt-3 bg-white/95 backdrop-blur-xs border border-[#D8D2C5] rounded-full px-3 py-1.5 shadow-md flex items-center gap-2 text-xs z-30'
        >
          <button
            type='button'
            data-testid='canvas-floating-change-template-btn'
            onClick={onOpenTemplateSidebar}
            className='px-2.5 py-1 rounded-full text-stone-700 hover:text-[#F97316] hover:bg-orange-50 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors'
          >
            <LayoutTemplate className='w-3.5 h-3.5 text-[#F97316]' />
            <span>Đổi mẫu khung</span>
          </button>
          <span className='w-px h-3.5 bg-stone-300' />
          <button
            type='button'
            data-testid='canvas-floating-reset-template-btn'
            onClick={onResetToSinglePanel}
            className='px-2.5 py-1 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 font-medium flex items-center gap-1.5 cursor-pointer transition-colors'
          >
            <Square className='w-3 h-3' />
            <span>Trở về 1 khung</span>
          </button>
        </div>
      )}

      {/* Floating Zoom Controls Bar */}
      <div
        data-testid='canvas-zoom-controls'
        className='absolute bottom-3 right-4 bg-white/90 backdrop-blur-xs border border-stone-200 rounded-full px-2.5 py-1 shadow-md flex items-center gap-1.5 text-xs z-30 select-none'
      >
        <button
          type='button'
          onClick={() => setZoomPercent((z) => Math.max(50, z - 15))}
          className='w-5 h-5 flex items-center justify-center rounded hover:bg-stone-100 text-stone-600 font-bold cursor-pointer transition-colors'
          title='Thu nhỏ'
        >
          -
        </button>
        <span className='font-mono font-semibold text-[11px] text-stone-700 min-w-[36px] text-center'>
          {zoomPercent}%
        </span>
        <button
          type='button'
          onClick={() => setZoomPercent((z) => Math.min(175, z + 15))}
          className='w-5 h-5 flex items-center justify-center rounded hover:bg-stone-100 text-stone-600 font-bold cursor-pointer transition-colors'
          title='Phóng to'
        >
          +
        </button>
        <button
          type='button'
          onClick={() => setZoomPercent(100)}
          className='text-[10px] text-stone-400 hover:text-stone-700 font-medium ml-1 pl-1.5 border-l border-stone-200 cursor-pointer transition-colors'
          title='Khôi phục 100%'
        >
          100%
        </button>
      </div>
    </div>
  );
};
