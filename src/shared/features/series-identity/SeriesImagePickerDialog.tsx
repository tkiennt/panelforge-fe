import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Loader2, Upload, X } from 'lucide-react';
import { seriesService, type SeriesImageKind } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import {
  SERIES_AVATAR_PRESETS,
  SERIES_BANNER_POSITION,
  SERIES_BANNER_PRESETS,
  SERIES_IMAGE_RULES,
} from '@/shared/utils/seriesImagePresets';

interface Props {
  seriesId: string;
  kind: SeriesImageKind;
  /** URL ảnh đang dùng (API, cần Bearer) hoặc null. */
  currentUrl: string | null;
  onClose: () => void;
  /** Gọi sau khi Backend lưu xong (URL mới, null = đã gỡ). */
  onApplied: (url: string | null) => void;
}

type Choice =
  { type: 'preset'; id: string } | { type: 'upload'; file: File } | { type: 'remove' } | null;

/**
 * Chọn avatar (1:1) hoặc banner (~3:1) cho Series: mẫu có sẵn hoặc tải ảnh riêng.
 * Chỉ khi bấm "Áp dụng" mới gọi API (Backend lưu lên kho asset R2); "Hủy" không đổi gì.
 */
export const SeriesImagePickerDialog: React.FC<Props> = ({
  seriesId,
  kind,
  currentUrl,
  onClose,
  onApplied,
}) => {
  const isAvatar = kind === 'avatar';
  const presets = isAvatar ? SERIES_AVATAR_PRESETS : SERIES_BANNER_PRESETS;
  const [choice, setChoice] = useState<Choice>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<Element | null>(null);
  const title = isAvatar ? 'Đổi avatar Series' : 'Đổi banner Series';
  const ratioClass = isAvatar ? 'aspect-square' : 'aspect-[3/1]';

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => (returnFocusRef.current as HTMLElement | null)?.focus?.();
  }, []);

  useEffect(
    () => () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    },
    [filePreview],
  );

  const pickFile = (file: File | undefined) => {
    setFileError(null);
    setSaveError(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFileError('Chỉ nhận ảnh PNG, JPEG hoặc WebP.');
      return;
    }
    if (file.size > SERIES_IMAGE_RULES.maxBytes) {
      setFileError(`Ảnh ${(file.size / 1024 / 1024).toFixed(1)} MB vượt giới hạn 5 MB.`);
      return;
    }
    setFilePreview(URL.createObjectURL(file));
    setChoice({ type: 'upload', file });
  };

  const close = () => {
    if (!saving) onClose();
  };

  const apply = async () => {
    if (!choice || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      let url: string | null = null;
      if (choice.type === 'preset')
        url = await seriesService.setSeriesImagePreset(seriesId, kind, choice.id);
      else if (choice.type === 'upload')
        url = await seriesService.setSeriesImage(seriesId, kind, choice.file);
      else await seriesService.clearSeriesImage(seriesId, kind);
      onApplied(url);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không thể lưu ảnh.');
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const f = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) {
      e.preventDefault();
      f[f.length - 1].focus();
    } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
      e.preventDefault();
      f[0].focus();
    }
  };

  const selectedPreset =
    choice?.type === 'preset' ? presets.find((p) => p.id === choice.id) : undefined;
  const ring =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]';

  // Xem trước theo đúng tỷ lệ hiển thị (avatar 1:1, banner 3:1, object-cover không kéo méo)
  const preview =
    choice?.type === 'remove' ? (
      <div className='w-full h-full flex items-center justify-center text-xs text-[#57534E] bg-[#F3F0E9]'>
        Sẽ dùng ảnh mặc định
      </div>
    ) : selectedPreset ? (
      <img
        src={selectedPreset.preview}
        alt=''
        className='w-full h-full object-cover'
        style={{ objectPosition: selectedPreset.position }}
      />
    ) : choice?.type === 'upload' && filePreview ? (
      <img
        src={filePreview}
        alt=''
        className='w-full h-full object-cover'
        style={{ objectPosition: isAvatar ? '50% 50%' : SERIES_BANNER_POSITION }}
      />
    ) : currentUrl ? (
      <AuthenticatedImage src={currentUrl} alt='' className='w-full h-full object-cover' />
    ) : (
      <div className='w-full h-full flex items-center justify-center text-xs text-[#57534E] bg-[#F3F0E9]'>
        Chưa có ảnh
      </div>
    );

  return createPortal(
    <div
      className='fixed inset-0 z-[70] bg-[#1C1917]/50 flex items-center justify-center p-4'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='series-image-dialog-title'
        data-testid={`series-${kind}-dialog`}
        onKeyDown={onKeyDown}
        className='w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xl p-5 space-y-4'
      >
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h2 id='series-image-dialog-title' className='text-base font-bold text-[#1C1917]'>
              {title}
            </h2>
            <p className='text-xs text-[#57534E] mt-0.5'>
              {isAvatar ? 'Ảnh vuông 1:1' : 'Ảnh ngang khoảng 3:1, chủ thể nên ở bên trái'} ·{' '}
              {SERIES_IMAGE_RULES.label}. Bấm “Áp dụng” mới lưu.
            </p>
          </div>
          <button
            type='button'
            onClick={close}
            disabled={saving}
            aria-label='Đóng, không lưu'
            className={`p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] cursor-pointer ${ring}`}
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div
          className={`${isAvatar ? 'w-36' : 'w-full'} ${ratioClass} rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#ECE7DC]`}
          data-testid='series-image-preview'
        >
          {preview}
        </div>

        <div>
          <div className='text-xs font-semibold text-[#44403C] mb-2'>Ảnh mẫu</div>
          <div
            className={`grid gap-2 ${isAvatar ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-1 sm:grid-cols-3'}`}
          >
            {presets.map((p) => {
              const on = choice?.type === 'preset' && choice.id === p.id;
              return (
                <button
                  key={p.id}
                  type='button'
                  aria-pressed={on}
                  aria-label={`Chọn mẫu ${p.name}`}
                  data-testid={`series-preset-${p.id}`}
                  disabled={saving}
                  onClick={() => {
                    setSaveError(null);
                    setChoice({ type: 'preset', id: p.id });
                  }}
                  className={`relative rounded-lg border-2 overflow-hidden ${ratioClass} cursor-pointer ${on ? 'border-[#F97316]' : 'border-[#D8D2C5] hover:border-[#F97316]/60'} ${ring}`}
                >
                  <img
                    src={p.thumb}
                    alt=''
                    className='w-full h-full object-cover'
                    style={{ objectPosition: p.position }}
                  />
                  {on && (
                    <span className='absolute top-1 right-1 w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center'>
                      <Check className='w-3 h-3' aria-hidden='true' />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <input
            ref={fileRef}
            type='file'
            accept={SERIES_IMAGE_RULES.accept}
            className='hidden'
            data-testid='series-image-file'
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type='button'
            onClick={() => fileRef.current?.click()}
            disabled={saving}
            className={`min-h-9 px-3 rounded-lg border border-[#D8D2C5] bg-white text-sm font-semibold text-[#44403C] hover:bg-[#F3F0E9] inline-flex items-center gap-1.5 cursor-pointer ${ring}`}
          >
            <Upload className='w-4 h-4' aria-hidden='true' />
            {choice?.type === 'upload' ? `Đã chọn: ${choice.file.name}` : 'Tải ảnh riêng…'}
          </button>
          {currentUrl && (
            <button
              type='button'
              onClick={() => setChoice({ type: 'remove' })}
              aria-pressed={choice?.type === 'remove'}
              disabled={saving}
              className={`min-h-9 px-3 rounded-lg text-sm font-semibold cursor-pointer ${choice?.type === 'remove' ? 'bg-[#FFF2E6] text-[#C2410C]' : 'text-[#57534E] hover:bg-[#F3F0E9]'} ${ring}`}
            >
              Về mặc định
            </button>
          )}
        </div>

        {(fileError || saveError) && (
          <p
            role='alert'
            data-testid='series-image-error'
            className='flex items-start gap-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800'
          >
            <AlertCircle className='w-4 h-4 shrink-0' aria-hidden='true' />
            <span>
              {fileError || saveError}
              {saveError && ' Ảnh đang dùng không bị thay đổi. Bấm “Áp dụng” để thử lại.'}
            </span>
          </p>
        )}

        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={close}
            disabled={saving}
            className={`min-h-9 px-4 rounded-lg border border-[#D8D2C5] bg-white text-sm font-semibold text-[#44403C] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50 ${ring}`}
          >
            Hủy
          </button>
          <button
            type='button'
            onClick={() => void apply()}
            disabled={!choice || saving}
            data-testid='series-image-apply'
            className={`min-h-9 px-4 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-sm font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed ${ring}`}
          >
            {saving && <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />}
            {saving ? 'Đang lưu…' : 'Áp dụng'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
