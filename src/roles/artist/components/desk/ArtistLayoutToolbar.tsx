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
  onUploadSketch: (file: File) => void;
  onOpenTemplates: () => void;
  onSplitPanels: () => void;
  onSaveLayout: () => void;
}

const STEP_KEYS = [
  'layoutToolbar.steps.sketch',
  'layoutToolbar.steps.splitOrTemplate',
  'layoutToolbar.steps.saveLayout',
  'layoutToolbar.steps.uploadArtwork',
] as const;

export const ArtistLayoutToolbar: React.FC<ArtistLayoutToolbarProps> = ({
  currentStep,
  hasSketch,
  hasPanels,
  isLayoutDirty,
  isDetectingPanels,
  isSavingLayout,
  readOnly = false,
  layoutLockedReason,
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
      className='w-full min-h-11 shrink-0 border-b border-[#E7E5E4] bg-white px-3 py-2 flex flex-wrap items-center justify-start 2xl:justify-between gap-2'
      data-testid='artist-layout-toolbar'
    >
      {!layoutLockedReason && (
        <ol className='hidden 2xl:flex items-center gap-1.5 text-xs text-stone-500 whitespace-nowrap shrink-0'>
          {STEP_KEYS.map((key, index) => {
            const step = index + 1;
            const label = t(key);
            return (
              <li
                key={key}
                aria-current={step === currentStep ? 'step' : undefined}
                className={`inline-flex items-center gap-1 ${
                  step < currentStep
                    ? 'text-emerald-700 font-medium'
                    : step === currentStep
                      ? 'font-bold text-stone-900'
                      : 'text-stone-500'
                }`}
              >
                <span>
                  {step} {label}
                </span>
                {step < currentStep && <Check className='h-3 w-3' aria-hidden='true' />}
                {step < STEP_KEYS.length && (
                  <span className='text-stone-300' aria-hidden='true'>
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className='flex flex-wrap items-center justify-start gap-1.5 min-w-0'>
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
            {t('layoutToolbar.uploadSketch')}
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
              : t('layoutToolbar.splitPanels')}
          </button>
        </span>
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
