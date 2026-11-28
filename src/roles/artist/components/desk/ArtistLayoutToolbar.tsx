import React, { useRef } from 'react';
import { Check, LayoutTemplate, Loader2, Scissors, Upload } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ArtistLayoutToolbarProps {
  currentStep: 1 | 2 | 3 | 4;
  hasSketch: boolean;
  hasPanels: boolean;
  isLayoutDirty: boolean;
  isDetectingPanels: boolean;
  isSavingLayout: boolean;
  readOnly?: boolean;
  layoutLockedReason?: string;
  uploadMode?: 'page' | 'panel';
  canUsePanelMode?: boolean;
  onUploadModeChange?: (mode: 'page' | 'panel') => void;
  onUploadSketch: (file: File) => void;
  onOpenTemplates: () => void;
  onSplitPanels: () => void;
  onSaveLayout: () => void;
}

export const ArtistLayoutToolbar: React.FC<ArtistLayoutToolbarProps> = ({
  currentStep,
  hasSketch,
  hasPanels,
  isLayoutDirty,
  isDetectingPanels,
  isSavingLayout,
  readOnly = false,
  layoutLockedReason,
  uploadMode = 'page',
  canUsePanelMode = false,
  onUploadModeChange,
  onUploadSketch,
  onOpenTemplates,
  onSplitPanels,
  onSaveLayout,
}) => {
  const { t } = useTranslation('artist');
  const sketchInputRef = useRef<HTMLInputElement | null>(null);
  const isLayoutDisabled = readOnly || Boolean(layoutLockedReason);
  const splitReason = layoutLockedReason
    ? layoutLockedReason
    : readOnly
      ? t('common.noOpenSlotForPage')
      : !hasSketch
        ? t('layoutToolbar.needSketchFirst')
        : undefined;
  const saveReason = layoutLockedReason
    ? layoutLockedReason
    : readOnly
      ? t('common.noOpenSlotForPage')
      : !hasPanels
        ? t('layoutToolbar.needPanelsFirst')
        : !isLayoutDirty
          ? t('layoutToolbar.noChangesToSave')
          : undefined;
  const buttonClass = (step: number, isPrimaryWhenActive = false) => {
    const isActive = !layoutLockedReason && currentStep === step;
    if (isPrimaryWhenActive && isActive) {
      return 'focus-ring h-7 px-2.5 rounded bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 shrink-0';
    }
    if (isActive) {
      return 'focus-ring h-7 px-2.5 rounded border border-[#EA580C] bg-orange-50 text-[#EA580C] text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 shrink-0';
    }
    return 'focus-ring h-7 px-2.5 rounded border border-[#E7E5E4] bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 shrink-0';
  };

  return (
    <section
      aria-label={t('layoutToolbar.ariaLabel')}
      className='w-full min-h-12 shrink-0 border-b border-[#E7E5E4] bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2'
      data-testid='artist-layout-toolbar'
    >
      <div
        role='group'
        aria-label={t('layoutToolbar.uploadModeLabel')}
        className='inline-flex shrink-0 rounded-lg border border-stone-200 bg-stone-100 p-0.5'
      >
        <button
          type='button'
          aria-pressed={uploadMode === 'page'}
          onClick={() => onUploadModeChange?.('page')}
          data-testid='upload-mode-page'
          className={`focus-ring rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            uploadMode === 'page'
              ? 'bg-white text-stone-950 shadow-2xs'
              : 'text-stone-600 hover:text-stone-950'
          }`}
        >
          {t('bottomDock.uploadModePage')}
        </button>
        <button
          type='button'
          aria-pressed={uploadMode === 'panel'}
          disabled={!canUsePanelMode}
          title={!canUsePanelMode ? t('layoutToolbar.panelModeUnavailable') : undefined}
          onClick={() => onUploadModeChange?.('panel')}
          data-testid='upload-mode-panel'
          className={`focus-ring rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            uploadMode === 'panel'
              ? 'bg-white text-stone-950 shadow-2xs'
              : 'text-stone-600 hover:text-stone-950'
          }`}
        >
          {t('bottomDock.uploadModePanel')}
        </button>
      </div>

      <div className='flex flex-wrap items-center justify-start gap-1.5 min-w-0'>
        {uploadMode === 'panel' ? (
          <span className='text-xs text-stone-500'>{t('layoutToolbar.panelModeHint')}</span>
        ) : (
          <>
            <span title={layoutLockedReason} className='shrink-0'>
              <button
                type='button'
                disabled={isLayoutDisabled}
                title={layoutLockedReason}
                onClick={() => !isLayoutDisabled && sketchInputRef.current?.click()}
                data-testid='btn-upload-sketch-simple'
                className={buttonClass(1)}
              >
                <Upload className='h-3.5 w-3.5 hidden 2xl:inline' aria-hidden='true' />
                {t('layoutToolbar.uploadPageImage')}
              </button>
            </span>
            <span title={layoutLockedReason} className='shrink-0'>
              <button
                type='button'
                disabled={isLayoutDisabled}
                title={layoutLockedReason}
                onClick={() => !isLayoutDisabled && onOpenTemplates()}
                data-testid='btn-open-templates-simple'
                className={buttonClass(2)}
              >
                <LayoutTemplate className='h-3.5 w-3.5 hidden 2xl:inline' aria-hidden='true' />
                {t('layoutToolbar.chooseTemplate')}
              </button>
            </span>
            <span title={splitReason} className='shrink-0'>
              <button
                type='button'
                onClick={onSplitPanels}
                disabled={Boolean(splitReason) || isDetectingPanels}
                title={splitReason}
                aria-describedby={splitReason ? 'artist-split-disabled-reason' : undefined}
                data-testid='btn-split-panels-simple'
                className={buttonClass(2)}
              >
                {isDetectingPanels ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
                ) : (
                  <Scissors className='h-3.5 w-3.5 hidden 2xl:inline' aria-hidden='true' />
                )}
                {isDetectingPanels
                  ? t('layoutToolbar.splittingPanels')
                  : t('layoutToolbar.extractPanels')}
              </button>
            </span>
          </>
        )}
        {(uploadMode === 'page' || isLayoutDirty) && (
          <span title={saveReason} className='shrink-0'>
            <button
              type='button'
              onClick={onSaveLayout}
              disabled={Boolean(saveReason) || isSavingLayout}
              title={saveReason}
              aria-describedby={saveReason ? 'artist-save-disabled-reason' : undefined}
              data-testid='canvas-btn-save-layout'
              className={buttonClass(3, true)}
            >
              {isSavingLayout ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
              ) : (
                <Check className='h-3.5 w-3.5 hidden 2xl:inline' aria-hidden='true' />
              )}
              {t('layoutToolbar.saveLayout')}
            </button>
          </span>
        )}
      </div>
      <span id='artist-split-disabled-reason' className='sr-only'>
        {splitReason}
      </span>
      <span id='artist-save-disabled-reason' className='sr-only'>
        {saveReason}
      </span>
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
