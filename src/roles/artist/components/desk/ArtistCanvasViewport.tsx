import React from 'react';
import { Loader2 } from 'lucide-react';
import { ArtistLayoutToolbar } from './ArtistLayoutToolbar';

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
  isLayoutSaved: boolean;
  isDetectingPanels: boolean;
  isSavingLayout: boolean;
  readOnly?: boolean;
  onCanvasClick: () => void;
  onUploadSketch: (file: File) => void;
  onSplitPanels: () => void;
  onOpenTemplates: () => void;
  onSaveLayout: () => void;
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
  isLayoutSaved,
  isDetectingPanels,
  isSavingLayout,
  readOnly = false,
  onCanvasClick,
  onUploadSketch,
  onSplitPanels,
  onOpenTemplates,
  onSaveLayout,
  children,
}) => {
  const currentStep: 1 | 2 | 3 | 4 =
    !sketch && !hasPanels ? 1 : !hasPanels ? 2 : !isLayoutSaved ? 3 : 4;

  return (
    <main
      className='relative flex-1 min-h-0 min-w-0 w-full h-full flex flex-col overflow-hidden'
      data-testid='artist-canvas-shell'
    >
      <ArtistLayoutToolbar
        currentStep={currentStep}
        hasSketch={Boolean(sketch)}
        hasPanels={hasPanels}
        isLayoutDirty={hasPanels && !isLayoutSaved}
        isDetectingPanels={isDetectingPanels}
        isSavingLayout={isSavingLayout}
        readOnly={readOnly}
        onUploadSketch={onUploadSketch}
        onOpenTemplates={onOpenTemplates}
        onSplitPanels={onSplitPanels}
        onSaveLayout={onSaveLayout}
      />
      <div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-3 md:p-4'>
        <div
          className='w-full h-full flex items-center justify-center m-auto transition-transform duration-200 ease-out origin-center'
          style={{ transform: `scale(${zoomScale})` }}
        >
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
                {CROP_MARKS.map((position) => (
                  <div
                    key={position}
                    className={`absolute w-3 h-3 border-stone-400/80 pointer-events-none z-10 ${position}`}
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
                  <p className='absolute inset-0 z-20 flex items-center justify-center p-4 text-center text-xs text-stone-500'>
                    Tải phác thảo hoặc chọn mẫu khung để bắt đầu.
                  </p>
                )}
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
