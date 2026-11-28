import React from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
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
  layoutLockedReason?: string;
  uploadMode?: 'page' | 'panel';
  canUsePanelMode?: boolean;
  onUploadModeChange?: (mode: 'page' | 'panel') => void;
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
  layoutLockedReason,
  uploadMode = 'page',
  canUsePanelMode = false,
  onUploadModeChange,
  onCanvasClick,
  onUploadSketch,
  onSplitPanels,
  onOpenTemplates,
  onSaveLayout,
  children,
}) => {
  const { t } = useTranslation('artist');
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
        layoutLockedReason={layoutLockedReason}
        uploadMode={uploadMode}
        canUsePanelMode={canUsePanelMode}
        onUploadModeChange={onUploadModeChange}
        onUploadSketch={onUploadSketch}
        onOpenTemplates={onOpenTemplates}
        onSplitPanels={onSplitPanels}
        onSaveLayout={onSaveLayout}
      />
      <div className='flex h-8 shrink-0 items-center justify-between border-b border-stone-800 bg-stone-900 px-3 text-xs text-stone-200'>
        <span className='font-semibold'>{t('canvasViewport.originalPage')}</span>
        <span className='truncate text-stone-400'>
          {sketch ? sketch.fileName : t('canvasViewport.noPageImage')}
        </span>
      </div>
      <div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stone-200/80 p-2 sm:p-3 md:p-4'>
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
                  title={t('canvasViewport.trimLineTitle')}
                />
                <div
                  className='absolute inset-[2.8%] border border-dotted border-stone-200/60 pointer-events-none z-10'
                  title={t('canvasViewport.safeAreaTitle')}
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
                    width={1200}
                    height={1697}
                    className='absolute inset-0 w-full h-full object-contain pointer-events-none z-5 select-none transition-opacity duration-300'
                    style={{ opacity: sketch.isVisible ? 1 : 0 }}
                  />
                )}
                {isDetectingPanels && (
                  <div className='absolute inset-0 z-35 pointer-events-none bg-stone-900/10 flex items-center justify-center'>
                    <div
                      role='status'
                      className='px-4 py-2 rounded-xl bg-stone-900/90 text-white text-xs font-semibold shadow-lg flex items-center gap-2'
                    >
                      <Loader2 className='w-4 h-4 text-amber-400 animate-spin' aria-hidden='true' />
                      <span>{t('canvasViewport.detectingPanels')}</span>
                    </div>
                  </div>
                )}
                {!hasPanels && !sketch && (
                  <div className='absolute inset-[8%] z-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center'>
                    <span className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-700'>
                      <ImageUp className='h-6 w-6' aria-hidden='true' />
                    </span>
                    <p className='text-sm font-bold text-stone-900'>
                      {t('canvasViewport.emptyTitle')}
                    </p>
                    <p className='mt-1 max-w-xs text-xs leading-relaxed text-stone-500'>
                      {t('canvasViewport.emptyPrompt')}
                    </p>
                  </div>
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
