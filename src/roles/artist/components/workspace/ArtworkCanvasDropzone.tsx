import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  RefreshCw,
  Eye,
  Sparkles,
  Clipboard,
  Layers,
} from 'lucide-react';
import { CanvasPanelItem, ViewMode } from './workspace.types';

interface ArtworkCanvasDropzoneProps {
  panels: CanvasPanelItem[];
  selectedPanelId: string | null;
  onSelectPanel: (panelId: string) => void;
  onDropArtwork: (panelId: string, file: File) => void;
  onPasteArtwork?: (panelId: string, file: File) => void;
  onDeleteArtwork?: (panelId: string) => void;
  onZoomArtwork?: (panelId: string) => void;
  viewMode?: ViewMode;
  pageNumber?: number;
}

export const ArtworkCanvasDropzone: React.FC<ArtworkCanvasDropzoneProps> = ({
  panels,
  selectedPanelId,
  onSelectPanel,
  onDropArtwork,
  onPasteArtwork,
  onDeleteArtwork,
  onZoomArtwork,
  viewMode = 'panel',
  pageNumber = 1,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [draggingOverPanelId, setDraggingOverPanelId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadPanelId, setActiveUploadPanelId] = useState<string | null>(null);

  // Global Clipboard Paste Listener (Ctrl+V) into selected panel
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!selectedPanelId) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            if (onPasteArtwork) {
              onPasteArtwork(selectedPanelId, file);
            } else {
              onDropArtwork(selectedPanelId, file);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedPanelId, onPasteArtwork, onDropArtwork]);

  const handleDragOver = (e: React.DragEvent, panelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingOverPanelId !== panelId) {
      setDraggingOverPanelId(panelId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, panelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingOverPanelId === panelId) {
      setDraggingOverPanelId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, panelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverPanelId(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onDropArtwork(panelId, file);
      }
    }
  };

  const triggerFileInput = (panelId: string) => {
    setActiveUploadPanelId(panelId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && activeUploadPanelId) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onDropArtwork(activeUploadPanelId, file);
      }
    }
    setActiveUploadPanelId(null);
  };

  return (
    <main
      data-testid='artwork-canvas-dropzone-viewport'
      className='flex-1 bg-[#EBE7DF] relative flex items-center justify-center overflow-auto p-8 select-none'
      onClick={() => onSelectPanel('')}
    >
      {/* Hidden File Input for button uploads */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        onChange={handleFileChange}
      />

      {/* Manga Page Sheet Container (Tỉ lệ chuẩn Trang truyện Manga B5/A4: 1 : 1.414) */}
      <div
        data-testid='manga-paper-sheet'
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'center center',
          width: '580px',
          height: '820px',
        }}
        className='bg-white shadow-xl border border-stone-300 rounded-sm relative transition-transform duration-200 ease-out shrink-0 p-8 flex flex-col justify-between'
      >
        {/* Subtle Manga Margins & Bleed Guides */}
        <div className='absolute inset-4 border border-dashed border-stone-200 pointer-events-none' />

        {/* Dynamic Panels Layout Container */}
        <div className='relative w-full h-full'>
          {panels.map((panel) => {
            const isSelected = selectedPanelId === panel.id;
            const isDragOver = draggingOverPanelId === panel.id;

            return (
              <div
                key={panel.id}
                data-testid={`manga-panel-${panel.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPanel(panel.id);
                }}
                onDragOver={(e) => handleDragOver(e, panel.id)}
                onDragLeave={(e) => handleDragLeave(e, panel.id)}
                onDrop={(e) => handleDrop(e, panel.id)}
                style={{
                  position: 'absolute',
                  left: `${panel.x}%`,
                  top: `${panel.y}%`,
                  width: `${panel.width}%`,
                  height: `${panel.height}%`,
                }}
                className={`border-2 border-stone-900 transition-all duration-150 cursor-pointer overflow-hidden flex flex-col group relative ${
                  isSelected
                    ? 'ring-4 ring-orange-500/80 shadow-md z-20'
                    : 'hover:border-orange-500/70 z-10'
                } ${isDragOver ? 'ring-4 ring-orange-500 bg-orange-500/10' : 'bg-stone-50/50'}`}
              >
                {/* Top-Left Header Badges: Panel Number & Reading Order */}
                <div className='absolute top-2 left-2 flex items-center gap-1 z-30 pointer-events-none'>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs ${
                      isSelected
                        ? 'bg-orange-500 text-white'
                        : 'bg-stone-900 text-white'
                    }`}
                  >
                    #{panel.panelNumber}
                  </span>
                  <span className='text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/90 text-stone-800 border border-stone-200 shadow-2xs'>
                    Đọc #{panel.readingOrder}
                  </span>
                  {panel.cameraAngle && (
                    <span className='text-[9px] font-mono px-1 py-0.5 rounded bg-stone-100/90 text-stone-600 border border-stone-200 uppercase'>
                      {panel.cameraAngle}
                    </span>
                  )}
                </div>

                {/* Panel Content: Uploaded Image or Empty Drop Target */}
                {panel.imageUrl ? (
                  /* Uploaded State */
                  <div className='w-full h-full relative group/img bg-stone-900/5'>
                    <img
                      src={panel.imageUrl}
                      alt={`Artwork Khung #${panel.panelNumber}`}
                      className='w-full h-full object-contain'
                    />

                    {/* Version Badge */}
                    <div className='absolute bottom-2 left-2 z-20'>
                      <span className='text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-900/80 text-white backdrop-blur-xs'>
                        {panel.imageVersion || 'v1.0'}
                      </span>
                    </div>

                    {/* Floating Hover Action Bar */}
                    <div className='absolute inset-0 bg-stone-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs z-30'>
                      <button
                        type='button'
                        title='Đổi ảnh mới'
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerFileInput(panel.id);
                        }}
                        className='p-1.5 rounded-md bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-600 transition-colors shadow-sm cursor-pointer'
                      >
                        <RefreshCw className='w-3.5 h-3.5' />
                      </button>

                      <button
                        type='button'
                        title='Phóng to xem chi tiết'
                        onClick={(e) => {
                          e.stopPropagation();
                          onZoomArtwork?.(panel.id);
                        }}
                        className='p-1.5 rounded-md bg-white hover:bg-stone-100 text-stone-800 transition-colors shadow-sm cursor-pointer'
                      >
                        <Eye className='w-3.5 h-3.5' />
                      </button>

                      <button
                        type='button'
                        title='Xóa ảnh này'
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteArtwork?.(panel.id);
                        }}
                        className='p-1.5 rounded-md bg-white hover:bg-red-50 text-stone-800 hover:text-red-600 transition-colors shadow-sm cursor-pointer'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty Dropzone Target State */
                  <div className='w-full h-full flex flex-col items-center justify-center p-3 text-center transition-colors border border-dashed border-stone-300 m-1 rounded-sm bg-white/60 hover:bg-orange-50/40'>
                    {isDragOver ? (
                      <div className='flex flex-col items-center gap-1 text-orange-600 animate-pulse'>
                        <Upload className='w-6 h-6 stroke-[2]' />
                        <span className='text-xs font-bold font-sans'>
                          Thả ảnh vào Khung #{panel.panelNumber}
                        </span>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center gap-2'>
                        <div className='w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors'>
                          <ImageIcon className='w-4 h-4' />
                        </div>

                        <div className='space-y-0.5'>
                          <p className='text-[11px] font-semibold text-stone-700'>
                            Kéo thả ảnh vào đây
                          </p>
                          <p className='text-[9px] text-stone-400'>
                            Hỗ trợ PNG, JPG, WebP
                          </p>
                        </div>

                        <div className='flex items-center gap-1 pt-1'>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerFileInput(panel.id);
                            }}
                            className='px-2 py-1 text-[10px] font-bold rounded bg-stone-900 hover:bg-orange-600 text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                          >
                            <Upload className='w-3 h-3' />
                            <span>+ Tải artwork</span>
                          </button>

                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPanel(panel.id);
                            }}
                            title='Dán ảnh từ Clipboard (Ctrl+V)'
                            className='px-2 py-1 text-[10px] font-medium rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                          >
                            <Clipboard className='w-3 h-3' />
                            <span>Dán (Ctrl+V)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Page Footer Note */}
        <div className='text-center pt-2 border-t border-stone-100'>
          <span className='text-[9px] font-mono text-stone-400 uppercase tracking-widest'>
            PanelForge Manga Production · Trang {pageNumber}
          </span>
        </div>
      </div>

      {/* Floating Bottom-Right Canvas Controls (Pan & Zoom Overlay) */}
      <div
        data-testid='canvas-zoom-control-bar'
        onClick={(e) => e.stopPropagation()}
        className='absolute bottom-5 right-5 bg-white/95 backdrop-blur-xs border border-stone-300 rounded-xl p-1.5 shadow-lg flex items-center gap-1 text-stone-700 z-40'
      >
        <button
          type='button'
          onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
          title='Thu nhỏ canvas'
          className='p-1.5 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer'
        >
          <ZoomOut className='w-4 h-4' />
        </button>

        <span className='text-xs font-mono font-bold w-12 text-center text-stone-900 select-none'>
          {zoomLevel}%
        </span>

        <button
          type='button'
          onClick={() => setZoomLevel((z) => Math.min(180, z + 10))}
          title='Phóng to canvas'
          className='p-1.5 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer'
        >
          <ZoomIn className='w-4 h-4' />
        </button>

        <div className='w-px h-4 bg-stone-300 mx-0.5' />

        <button
          type='button'
          onClick={() => setZoomLevel(100)}
          title='Khôi phục tỷ lệ 100%'
          className='p-1.5 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer text-xs font-mono font-semibold'
        >
          <Maximize2 className='w-3.5 h-3.5' />
        </button>
      </div>
    </main>
  );
};
