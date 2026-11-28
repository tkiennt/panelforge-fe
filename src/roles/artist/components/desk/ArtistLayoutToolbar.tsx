import React, { useRef } from 'react';
import { Check, LayoutTemplate, Loader2, Scissors, Upload } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ArtistLayoutToolbarProps {
  hasSketch: boolean;
  hasPanels: boolean;
  isLayoutSaved: boolean;
  hasPendingArtwork?: boolean;
  isDetectingPanels: boolean;
  isSavingLayout: boolean;
  readOnly?: boolean;
  isInkOrColorStage?: boolean;
  uploadMode?: 'page' | 'panel';
  onUploadModeChange?: (mode: 'page' | 'panel') => void;
  onUploadSketch: (file: File) => void;
  onOpenTemplates: () => void;
  onSplitPanels: () => void;
  onSaveLayout: () => void;
}

const PRIMARY =
  'focus-ring inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-[#EA580C] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#C2410C] disabled:cursor-wait disabled:opacity-70';
const SECONDARY =
  'focus-ring inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50';

export const ArtistLayoutToolbar: React.FC<ArtistLayoutToolbarProps> = ({
  hasSketch,
  hasPanels,
  isLayoutSaved,
  hasPendingArtwork = false,
  isDetectingPanels,
  isSavingLayout,
  readOnly = false,
  isInkOrColorStage = false,
  uploadMode = 'page',
  onUploadModeChange,
  onUploadSketch,
  onOpenTemplates,
  onSplitPanels,
  onSaveLayout,
}) => {
  const { t } = useTranslation('artist');
  const sketchInputRef = useRef<HTMLInputElement | null>(null);
  const canSavePageResult = hasPanels && (!isLayoutSaved || hasPendingArtwork);

  const uploadButton = (primary: boolean, replace = false) => (
    <button
      type='button'
      onClick={() => sketchInputRef.current?.click()}
      data-testid='btn-upload-sketch-simple'
      className={primary ? PRIMARY : SECONDARY}
    >
      <Upload className='h-3.5 w-3.5' aria-hidden='true' />
      {t(replace ? 'layoutToolbar.replacePageImage' : 'layoutToolbar.uploadPageImage')}
    </button>
  );

  return (
    <section
      aria-label={t('layoutToolbar.ariaLabel')}
      className='flex min-h-12 w-full shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 py-2'
      data-testid='artist-layout-toolbar'
    >
      {readOnly ? (
        <span className='rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600'>
          {t('layoutToolbar.readOnly')}
        </span>
      ) : (
        <div
          role='group'
          aria-label={t('layoutToolbar.uploadModeLabel')}
          className='inline-flex shrink-0 rounded-lg border border-stone-200 bg-stone-100 p-0.5'
        >
          {(['page', 'panel'] as const).map((mode) => (
            <button
              key={mode}
              type='button'
              aria-pressed={uploadMode === mode}
              onClick={() => onUploadModeChange?.(mode)}
              data-testid={`upload-mode-${mode}`}
              className={`focus-ring rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                uploadMode === mode
                  ? 'bg-white text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              {t(`layoutToolbar.uploadMode${mode === 'page' ? 'Page' : 'Panel'}`)}
            </button>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className='flex min-w-0 flex-wrap items-center justify-end gap-1.5'>
          {uploadMode === 'page' && !hasSketch && uploadButton(true)}
          {uploadMode === 'page' && hasSketch && (
            <>
              {uploadButton(false, true)}
              {canSavePageResult && !isInkOrColorStage && (
                <button type='button' onClick={onSplitPanels} className={SECONDARY}>
                  <Scissors className='h-3.5 w-3.5' aria-hidden='true' />
                  {t('layoutToolbar.reExtractPanels')}
                </button>
              )}
              {!canSavePageResult && (!isInkOrColorStage || hasPanels) && (
                <button
                  type='button'
                  onClick={onSplitPanels}
                  disabled={isDetectingPanels}
                  data-testid='btn-split-panels-simple'
                  className={PRIMARY}
                >
                  {isDetectingPanels ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
                  ) : (
                    <Scissors className='h-3.5 w-3.5' aria-hidden='true' />
                  )}
                  {t(
                    isDetectingPanels
                      ? 'layoutToolbar.splittingPanels'
                      : 'layoutToolbar.extractPanels',
                  )}
                </button>
              )}
              {canSavePageResult && (
                <button
                  type='button'
                  onClick={onSaveLayout}
                  disabled={isSavingLayout}
                  data-testid='canvas-btn-save-layout'
                  className={PRIMARY}
                >
                  {isSavingLayout ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
                  ) : (
                    <Check className='h-3.5 w-3.5' aria-hidden='true' />
                  )}
                  {t(isInkOrColorStage ? 'layoutToolbar.saveImages' : 'layoutToolbar.saveLayout')}
                </button>
              )}
            </>
          )}

          {uploadMode === 'panel' && !isInkOrColorStage && !hasPanels && (
            <button
              type='button'
              onClick={onOpenTemplates}
              data-testid='btn-open-templates-simple'
              className={PRIMARY}
            >
              <LayoutTemplate className='h-3.5 w-3.5' aria-hidden='true' />
              {t('layoutToolbar.chooseTemplate')}
            </button>
          )}
          {uploadMode === 'panel' && !isInkOrColorStage && hasPanels && (
            <>
              <button
                type='button'
                onClick={onOpenTemplates}
                data-testid='btn-open-templates-simple'
                className={SECONDARY}
              >
                <LayoutTemplate className='h-3.5 w-3.5' aria-hidden='true' />
                {t('layoutToolbar.chooseTemplate')}
              </button>
              {!isLayoutSaved && (
                <button
                  type='button'
                  onClick={onSaveLayout}
                  disabled={isSavingLayout}
                  data-testid='canvas-btn-save-layout'
                  className={PRIMARY}
                >
                  {isSavingLayout ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
                  ) : (
                    <Check className='h-3.5 w-3.5' aria-hidden='true' />
                  )}
                  {t('layoutToolbar.saveLayout')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <input
        ref={sketchInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUploadSketch(file);
          event.target.value = '';
        }}
      />
    </section>
  );
};
