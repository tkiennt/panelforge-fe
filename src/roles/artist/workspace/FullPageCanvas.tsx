import React, { useRef, useState, useEffect } from 'react';
import { Upload, Maximize2, RefreshCw, X, FileImage, CheckCircle2 } from 'lucide-react';
import { PageArtworkState } from './workspace.types';

interface FullPageCanvasProps {
  pageNumber: number;
  artworkState: PageArtworkState;
  onFileSelected: (file: File) => void;
  onRemoveArtwork?: () => void;
}

export const FullPageCanvas: React.FC<FullPageCanvasProps> = ({
  pageNumber,
  artworkState,
  onFileSelected,
  onRemoveArtwork,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hỗ trợ dán ảnh từ Clipboard (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            onFileSelected(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFileSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelected(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div
      data-testid='full-page-canvas-container'
      className='w-full h-full flex items-center justify-center p-6 overflow-auto custom-scrollbar bg-[#EBE7DF]'
    >
      <input
        ref={fileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        onChange={handleInputChange}
      />

      {/* Manga Page Viewport (B5 Aspect Ratio 1:1.414 / 1200x1800) */}
      <div
        data-testid='manga-page-b5-viewport'
        className='w-[480px] h-[720px] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-stone-300 relative flex flex-col overflow-hidden select-none'
      >
        {artworkState.previewUrl ? (
          /* Populated State */
          <div className='relative w-full h-full group bg-stone-900 flex items-center justify-center'>
            <img
              src={artworkState.previewUrl}
              alt={`Bản vẽ Trang ${pageNumber}`}
              className='w-full h-full object-contain'
            />

            {/* Version Badge */}
            <div className='absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm'>
              <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400' />
              <span>{artworkState.version || 'v1'}</span>
              <span className='text-stone-400'>· Trang {pageNumber}</span>
            </div>

            {/* Hover Action Overlay */}
            <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 backdrop-blur-[2px]'>
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                data-testid='replace-full-page-btn'
                className='px-3.5 py-2 rounded-lg bg-white text-[#171717] hover:bg-stone-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95'
              >
                <RefreshCw className='w-3.5 h-3.5' />
                <span>Thay thế ảnh</span>
              </button>

              <button
                type='button'
                onClick={() => setIsFullscreenModalOpen(true)}
                data-testid='fullscreen-full-page-btn'
                className='px-3.5 py-2 rounded-lg bg-[#F97316] text-white hover:bg-orange-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95'
              >
                <Maximize2 className='w-3.5 h-3.5' />
                <span>Xem toàn màn hình</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty State: Clean Dashed Dropzone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid='full-page-dropzone'
            className={`w-full h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-200 m-2 rounded-lg border-2 border-dashed ${
              isDragging
                ? 'border-[#F97316] bg-orange-50/50 scale-[0.99]'
                : 'border-stone-300 hover:border-[#F97316] bg-stone-50/50 hover:bg-white'
            }`}
          >
            <div className='w-16 h-16 rounded-2xl bg-orange-100/70 text-[#F97316] flex items-center justify-center mb-4 transition-transform group-hover:scale-105'>
              <Upload className='w-8 h-8 stroke-[1.75]' />
            </div>

            <h3 className='text-sm font-bold text-[#171717]'>
              Kéo thả tranh vẽ toàn trang vào đây
            </h3>
            <p className='text-xs text-stone-500 mt-1 max-w-[280px] leading-relaxed'>
              Hoặc bấm để chọn tệp từ máy tính. Hỗ trợ dán trực tiếp bằng phím{' '}
              <kbd className='px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-mono text-[10px]'>
                Ctrl+V
              </kbd>
            </p>

            <span className='mt-4 px-3 py-1 rounded-full text-[11px] font-mono text-stone-400 bg-stone-100'>
              PNG · JPG · WEBP (Chuẩn khổ B5 / 1200×1800)
            </span>
          </div>
        )}
      </div>

      {/* Lightbox Modal: Xem toàn màn hình */}
      {isFullscreenModalOpen && artworkState.previewUrl && (
        <div
          data-testid='artwork-fullscreen-lightbox'
          className='fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 select-none'
          onClick={() => setIsFullscreenModalOpen(false)}
        >
          <button
            type='button'
            onClick={() => setIsFullscreenModalOpen(false)}
            className='absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer transition-colors'
          >
            <X className='w-6 h-6' />
          </button>
          <img
            src={artworkState.previewUrl}
            alt='Xem trước bản vẽ toàn trang'
            className='max-w-[90vw] max-h-[90vh] object-contain shadow-2xl rounded-lg'
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
