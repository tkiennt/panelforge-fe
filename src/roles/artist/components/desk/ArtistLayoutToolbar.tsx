import React, { useRef } from 'react';
import { Check, LayoutTemplate, Loader2, Scissors, Upload } from 'lucide-react';

interface ArtistLayoutToolbarProps {
  currentStep: 1 | 2 | 3 | 4;
  hasSketch: boolean;
  hasPanels: boolean;
  isLayoutDirty: boolean;
  isDetectingPanels: boolean;
  isSavingLayout: boolean;
  onUploadSketch: (file: File) => void;
  onOpenTemplates: () => void;
  onSplitPanels: () => void;
  onSaveLayout: () => void;
}

const STEPS = ['Phác thảo', 'Tách khung / Chọn mẫu', 'Lưu bố cục', 'Nạp tranh'];

export const ArtistLayoutToolbar: React.FC<ArtistLayoutToolbarProps> = ({
  currentStep,
  hasSketch,
  hasPanels,
  isLayoutDirty,
  isDetectingPanels,
  isSavingLayout,
  onUploadSketch,
  onOpenTemplates,
  onSplitPanels,
  onSaveLayout,
}) => {
  const sketchInputRef = useRef<HTMLInputElement | null>(null);
  const splitReason = !hasSketch ? 'Cần tải phác thảo trước' : undefined;
  const saveReason = !hasPanels
    ? 'Cần chọn mẫu khung hoặc tách khung trước'
    : !isLayoutDirty
      ? 'Chưa có thay đổi để lưu'
      : undefined;
  const buttonClass = (step: number) =>
    `${currentStep === step ? 'btn-cta-primary' : 'btn-cta-secondary'} focus-ring min-h-9 px-3 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50`;

  return (
    <section
      aria-label='Quy trình bố cục trang'
      className='w-full shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-surface-3)] px-3 py-2'
      data-testid='artist-layout-toolbar'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <ol className='flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[var(--studio-ink-muted)]'>
          {STEPS.map((label, index) => {
            const step = index + 1;
            return (
              <li
                key={label}
                aria-current={step === currentStep ? 'step' : undefined}
                className={`inline-flex items-center gap-1 ${step === currentStep ? 'font-bold text-[var(--studio-ink)]' : ''}`}
              >
                {step < currentStep && <Check className='h-3.5 w-3.5' aria-hidden='true' />}
                <span>
                  {step} {label}
                </span>
                {step < STEPS.length && <span aria-hidden='true'>→</span>}
              </li>
            );
          })}
        </ol>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <button
            type='button'
            onClick={() => sketchInputRef.current?.click()}
            data-testid='btn-upload-sketch-simple'
            className={buttonClass(1)}
          >
            <Upload className='h-3.5 w-3.5' aria-hidden='true' />
            Tải phác thảo
          </button>
          <button
            type='button'
            onClick={onOpenTemplates}
            data-testid='btn-open-templates-simple'
            className={buttonClass(2)}
          >
            <LayoutTemplate className='h-3.5 w-3.5' aria-hidden='true' />
            Chọn mẫu khung
          </button>
          <span title={splitReason}>
            <button
              type='button'
              onClick={onSplitPanels}
              disabled={Boolean(splitReason) || isDetectingPanels}
              aria-describedby={splitReason ? 'artist-split-disabled-reason' : undefined}
              data-testid='btn-split-panels-simple'
              className={buttonClass(2)}
            >
              {isDetectingPanels ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
              ) : (
                <Scissors className='h-3.5 w-3.5' aria-hidden='true' />
              )}
              {isDetectingPanels ? 'Đang tách khung...' : 'Tách khung'}
            </button>
          </span>
          <span title={saveReason}>
            <button
              type='button'
              onClick={onSaveLayout}
              disabled={Boolean(saveReason) || isSavingLayout}
              aria-describedby={saveReason ? 'artist-save-disabled-reason' : undefined}
              data-testid='canvas-btn-save-layout'
              className={buttonClass(3)}
            >
              {isSavingLayout ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
              ) : (
                <Check className='h-3.5 w-3.5' aria-hidden='true' />
              )}
              Lưu bố cục
            </button>
          </span>
        </div>
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
