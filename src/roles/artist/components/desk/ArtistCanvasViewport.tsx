import React, { useRef, useState } from 'react';
import { ImageUp, LayoutTemplate, Loader2 } from 'lucide-react';
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
  hasPendingArtwork?: boolean;
  isDetectingPanels: boolean;
  isSavingLayout: boolean;
  readOnly?: boolean;
  isInkOrColorStage?: boolean;
  hideArtTools?: boolean;
  uploadMode?: 'page' | 'panel';
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
  hasPendingArtwork = false,
  isDetectingPanels,
  isSavingLayout,
  readOnly = false,
  isInkOrColorStage = false,
  hideArtTools = false,
  uploadMode = 'page',
  onUploadModeChange,
  onCanvasClick,
  onUploadSketch,
  onSplitPanels,
  onOpenTemplates,
  onSaveLayout,
  children,
}) => {
  const { t } = useTranslation('artist');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const acceptDrop = !hideArtTools && uploadMode === 'page' && !readOnly;

  return (
    <main
      className='relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
      data-testid='artist-canvas-shell'
    >
      {!hideArtTools && (
        <ArtistLayoutToolbar
          hasSketch={Boolean(sketch)}
          hasPanels={hasPanels}
          isLayoutSaved={isLayoutSaved}
          hasPendingArtwork={hasPendingArtwork}
          isDetectingPanels={isDetectingPanels}
          isSavingLayout={isSavingLayout}
          readOnly={readOnly}
          isInkOrColorStage={isInkOrColorStage}
          uploadMode={uploadMode}
          onUploadModeChange={onUploadModeChange}
          onUploadSketch={onUploadSketch}
          onOpenTemplates={onOpenTemplates}
          onSplitPanels={onSplitPanels}
          onSaveLayout={onSaveLayout}
        />
      )}
      {!hideArtTools && uploadMode === 'page' && sketch && (
        <div className='flex h-8 shrink-0 items-center justify-between border-b border-stone-800 bg-stone-900 px-3 text-xs text-stone-200'>
          <span className='font-semibold'>{t('canvasViewport.originalPage')}</span>
          <span className='truncate text-stone-400'>{sketch.fileName}</span>
        </div>
      )}
      <div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stone-200/80 p-2 sm:p-3 md:p-4'>
        <div
          className='m-auto flex h-full w-full origin-center items-center justify-center transition-transform duration-200 ease-out'
          style={{ transform: `scale(${zoomScale})` }}
        >
          <div className='relative flex h-full w-auto max-h-full max-w-full aspect-[1/1.414] shrink-0 items-center justify-center'>
            <div
              key={pageKey}
              data-testid='artist-blank-sheet'
              className='relative h-full w-full overflow-hidden rounded-[2px] border border-stone-300/80 bg-white shadow-md'
            >
              <div
                className={`relative h-full w-full overflow-hidden bg-white ${isDragging ? 'ring-2 ring-inset ring-orange-500' : ''}`}
                data-testid='artist-canvas-surface'
                onClick={onCanvasClick}
                onDragEnter={(event) => {
                  if (!acceptDrop || !event.dataTransfer.types.includes('Files')) return;
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  if (acceptDrop) event.preventDefault();
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) setIsDragging(false);
                }}
                onDrop={(event) => {
                  setIsDragging(false);
                  if (!acceptDrop) return;
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) onUploadSketch(file);
                }}
              >
                <div
                  className='pointer-events-none absolute inset-[1.8%] z-10 border border-dashed border-stone-300/50'
                  title={t('canvasViewport.trimLineTitle')}
                />
                <div
                  className='pointer-events-none absolute inset-[2.8%] z-10 border border-dotted border-stone-200/60'
                  title={t('canvasViewport.safeAreaTitle')}
                />
                {CROP_MARKS.map((position) => (
                  <div
                    key={position}
                    className={`pointer-events-none absolute z-10 h-3 w-3 border-stone-400/80 ${position}`}
                  />
                ))}
                {uploadMode === 'page' && sketch && (
                  <img
                    src={sketch.imageUrl}
                    alt={sketch.fileName}
                    width={1200}
                    height={1697}
                    className='pointer-events-none absolute inset-0 z-5 h-full w-full select-none object-contain transition-opacity duration-300'
                    style={{ opacity: sketch.isVisible ? 1 : 0 }}
                  />
                )}
                {uploadMode === 'page' && sketch && isInkOrColorStage && !hasPanels && (
                  <span className='absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-md bg-stone-900/85 px-3 py-1.5 text-xs font-semibold text-white'>
                    {t('canvasViewport.noPanelsTitle')}
                  </span>
                )}
                {isDetectingPanels && (
                  <div className='pointer-events-none absolute inset-0 z-35 flex items-center justify-center bg-stone-900/10'>
                    <div
                      role='status'
                      className='flex items-center gap-2 rounded-xl bg-stone-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg'
                    >
                      <Loader2 className='h-4 w-4 animate-spin text-amber-400' aria-hidden='true' />
                      <span>{t('canvasViewport.detectingPanels')}</span>
                    </div>
                  </div>
                )}
                {!hideArtTools && uploadMode === 'page' && !sketch && !readOnly && (
                  <button
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation();
                      inputRef.current?.click();
                    }}
                    className='focus-ring absolute inset-[8%] z-20 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center transition-colors hover:border-orange-500 hover:bg-orange-50/30'
                  >
                    <span className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-700'>
                      <ImageUp className='h-6 w-6' aria-hidden='true' />
                    </span>
                    <span className='text-sm font-bold text-stone-900'>
                      {t('canvasViewport.dropPageTitle')}
                    </span>
                    <span className='mt-1 text-xs text-stone-500'>
                      {t('canvasViewport.dropHint')}
                    </span>
                  </button>
                )}
                {uploadMode === 'panel' && !hasPanels && (
                  <div className='absolute inset-[8%] z-20 flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-6 text-center'>
                    <span className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-600'>
                      <LayoutTemplate className='h-6 w-6' aria-hidden='true' />
                    </span>
                    <p className='text-sm font-bold text-stone-900'>
                      {t('canvasViewport.noPanelsTitle')}
                    </p>
                    {!hideArtTools && !readOnly && !isInkOrColorStage && (
                      <button
                        type='button'
                        onClick={onOpenTemplates}
                        className='focus-ring mt-3 inline-flex h-8 items-center rounded-md border border-orange-300 bg-white px-3 text-xs font-semibold text-orange-700 hover:bg-orange-50'
                      >
                        {t('layoutToolbar.chooseTemplate')}
                      </button>
                    )}
                  </div>
                )}
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUploadSketch(file);
          event.target.value = '';
        }}
      />
    </main>
  );
};
