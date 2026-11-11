import React, { useRef } from 'react';
import { Check, LayoutTemplate, Loader2, Upload } from 'lucide-react';

export interface PageSketch {
  imageUrl: string;
  fileName: string;
  isVisible: boolean;
}

interface ArtistCanvasViewportProps {
  pageKey: string;
  zoomScale: number;
  sketch: PageSketch | null;
  hasPanels: boolean;
  isLayoutLocked: boolean;
  isDetectingPanels: boolean;
  isSavingLayout: boolean;
  onCanvasClick: () => void;
  onUploadSketch: (file: File) => void;
  onSplitPanels: () => void;
  onOpenTemplates: () => void;
  onSaveLayout: () => void;
  /** Panel frames and lettering layers, stacked above the sketch underlay. */
  children?: React.ReactNode;
}

const CROP_MARKS = [
  'top-[1.8%] left-[1.8%] border-t border-l',
  'top-[1.8%] right-[1.8%] border-t border-r',
  'bottom-[1.8%] left-[1.8%] border-b border-l',
  'bottom-[1.8%] right-[1.8%] border-b border-r',
];

export const ArtistCanvasViewport: React.FC<ArtistCanvasViewportProps> = ({
  pageKey,
  zoomScale,
  sketch,
  hasPanels,
  isLayoutLocked,
  isDetectingPanels,
  isSavingLayout,
  onCanvasClick,
  onUploadSketch,
  onSplitPanels,
  onOpenTemplates,
  onSaveLayout,
  children,
}) => {
  const sketchInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <main
      className='relative flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-hidden'
      data-testid='artist-canvas-shell'
    >
      <div
        className='w-full h-full flex items-center justify-center m-auto transition-transform duration-200 ease-out origin-center'
        style={{ transform: `scale(${zoomScale})` }}
      >
        {/* B5 manga sheet (1:1.414) with 3mm bleed trim line and live-area safe zone. */}
        <div className='relative max-h-full max-w-full h-full w-auto aspect-[1/1.414] shrink-0 flex items-center justify-center'>
          <div
            key={pageKey}
            data-testid='artist-blank-sheet'
            className='w-full h-full bg-white rounded-[2px] shadow-md border border-stone-300/80 relative overflow-hidden'
          >
            <div
              className='w-full h-full relative overflow-hidden bg-white'
              data-testid='artist-canvas-surface'
              onClick={onCanvasClick}
            >
              <div
                className='absolute inset-[1.8%] border border-dashed border-stone-300/50 pointer-events-none z-10'
                title='Đường xén thành phẩm (Trim Line - 3mm Bleed)'
              />
              <div
                className='absolute inset-[2.8%] border border-dotted border-stone-200/60 pointer-events-none z-10'
                title='Vùng an toàn nội dung thoại & hình vẽ chính (Live Safe Area)'
              />
              {CROP_MARKS.map((pos) => (
                <div
                  key={pos}
                  className={`absolute w-3 h-3 border-stone-400/80 pointer-events-none z-10 ${pos}`}
                />
              ))}

              {sketch && (
                <img
                  src={sketch.imageUrl}
                  alt={sketch.fileName}
                  className='absolute inset-0 w-full h-full object-contain pointer-events-none z-5 select-none transition-opacity duration-300'
                  style={{ opacity: sketch.isVisible ? 0.5 : 0 }}
                />
              )}

              {sketch && !hasPanels && (
                <div
                  data-testid='pencil-sketch-split-btn'
                  className='absolute top-3.5 right-3.5 z-30'
                >
                  <button
                    type='button'
                    onClick={onSplitPanels}
                    disabled={isDetectingPanels}
                    data-testid='btn-split-panels-simple'
                    className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer'
                  >
                    {isDetectingPanels && (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
                    )}
                    <span>{isDetectingPanels ? 'Đang tách khung...' : 'Tách khung'}</span>
                  </button>
                </div>
              )}

              {isDetectingPanels && (
                <div className='absolute inset-0 z-35 pointer-events-none bg-stone-900/10 flex items-center justify-center'>
                  <div
                    role='status'
                    className='px-4 py-2 rounded-xl bg-stone-900/90 text-white text-xs font-semibold shadow-lg flex items-center gap-2'
                  >
                    <Loader2 className='w-4 h-4 text-amber-400 animate-spin' aria-hidden='true' />
                    <span>Đang dò rãnh tranh và tách các ô panel...</span>
                  </div>
                </div>
              )}

              {!hasPanels && !sketch && (
                <div
                  data-testid='artist-blank-state-actions'
                  className='absolute inset-0 z-20 flex items-center justify-center'
                >
                  <div className='flex flex-wrap items-center justify-center gap-2.5 p-4'>
                    <button
                      type='button'
                      onClick={() => sketchInputRef.current?.click()}
                      data-testid='btn-upload-sketch-simple'
                      className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer'
                    >
                      <Upload className='w-3.5 h-3.5' aria-hidden='true' />
                      <span>Tải phác thảo</span>
                    </button>
                    <button
                      type='button'
                      onClick={onOpenTemplates}
                      data-testid='btn-open-templates-simple'
                      className='btn-cta-secondary focus-ring min-h-9 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer'
                    >
                      <LayoutTemplate className='w-3.5 h-3.5 text-stone-600' aria-hidden='true' />
                      <span>Chọn mẫu khung</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={sketchInputRef}
                type='file'
                accept='image/png,image/jpeg,image/webp'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUploadSketch(file);
                    e.target.value = '';
                  }
                }}
              />

              {children}
            </div>
          </div>

          {hasPanels && !isLayoutLocked && (
            <div data-testid='canvas-bottom-layout-bar' className='absolute bottom-3 right-3 z-30'>
              <button
                type='button'
                onClick={onSaveLayout}
                disabled={isSavingLayout}
                data-testid='canvas-btn-save-layout'
                data-btn-lock-alias='canvas-btn-lock-layout'
                aria-label='Lưu bố cục'
                className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-[0.98]'
              >
                {isSavingLayout ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
                ) : (
                  <Check className='w-3.5 h-3.5' aria-hidden='true' />
                )}
                <span>Lưu</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
