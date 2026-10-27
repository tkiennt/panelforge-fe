import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, ImageOff, Loader2, X } from 'lucide-react';
import {
  DEFAULT_PROFILE_COVER,
  PROFILE_COVER_PRESETS,
  type ProfileCoverPreset,
} from '@/shared/utils/profileCovers';

interface Props {
  /** Lựa chọn đã lưu (null = bìa mặc định). */
  savedId: string | null;
  /** Báo cho banner xem trước lựa chọn (chưa lưu). */
  onPreview: (id: string | null) => void;
  /** Lưu lựa chọn; ném lỗi nếu API thất bại (dialog giữ nguyên để thử lại). */
  onApply: (id: string | null) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_KEY = '__default__';

/** Chọn bìa hồ sơ từ bộ mẫu: chọn = xem trước trên banner; "Áp dụng" mới lưu, "Hủy" trả bìa cũ. */
export const ProfileCoverPickerDialog: React.FC<Props> = ({
  savedId,
  onPreview,
  onApply,
  onClose,
}) => {
  const [selected, setSelected] = useState<string | null>(savedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    dialogRef.current?.querySelector<HTMLInputElement>('input[type=radio]:checked')?.focus();
    return () => {
      (returnFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  const choose = (id: string | null) => {
    setSelected(id);
    setError(null);
    onPreview(id);
  };

  const cancel = () => {
    if (saving) return;
    onPreview(savedId);
    onClose();
  };

  const apply = async () => {
    if (saving) return;
    if (selected === savedId) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onApply(selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu ảnh bìa hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  // Escape = Hủy; Tab xoay vòng trong dialog
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cancel();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = [
      ...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      ),
    ].filter((el) => !(el instanceof HTMLInputElement && el.type === 'radio' && !el.checked));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const option = (
    key: string,
    id: string | null,
    title: string,
    cover: ProfileCoverPreset,
    hint?: string,
  ) => {
    const isSelected = selected === id;
    const isSaved = savedId === id;
    return (
      <label
        key={key}
        className={`group relative flex flex-col gap-1.5 rounded-xl border-2 p-1.5 cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#C2410C] ${
          isSelected
            ? 'border-[#F97316] bg-[#FFF2E6]'
            : 'border-[#D8D2C5] bg-white hover:border-[#F97316]/60'
        }`}
        data-testid={`profile-cover-option-${id ?? 'default'}`}
      >
        <input
          type='radio'
          name='profile-cover'
          value={key}
          checked={isSelected}
          onChange={() => choose(id)}
          disabled={saving}
          className='sr-only'
        />
        <span className='relative block w-full aspect-[3/1] overflow-hidden rounded-lg bg-[#ECE7DC]'>
          {brokenThumbs[cover.id] ? (
            <span className='absolute inset-0 flex items-center justify-center text-[#57534E]'>
              <ImageOff className='w-5 h-5' aria-hidden='true' />
            </span>
          ) : (
            <img
              src={cover.thumb}
              alt=''
              className='w-full h-full object-cover'
              style={{ objectPosition: cover.position }}
              onError={() => setBrokenThumbs((b) => ({ ...b, [cover.id]: true }))}
            />
          )}
          {isSelected && (
            <span className='absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow'>
              <Check className='w-3.5 h-3.5' aria-hidden='true' />
            </span>
          )}
        </span>
        <span className='flex items-center justify-between gap-2 px-0.5 text-xs'>
          <span className='font-semibold text-[#1C1917] truncate'>{title}</span>
          {isSaved && (
            <span className='shrink-0 text-[10px] font-bold text-[#C2410C] bg-white border border-[#F97316]/40 px-1.5 rounded'>
              Đang dùng
            </span>
          )}
        </span>
        {hint && <span className='px-0.5 text-[11px] text-[#57534E]'>{hint}</span>}
      </label>
    );
  };

  return createPortal(
    <div
      className='fixed inset-0 z-[70] bg-[#1C1917]/50 flex items-center justify-center p-4'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='profile-cover-dialog-title'
        aria-describedby='profile-cover-dialog-desc'
        data-testid='profile-cover-dialog'
        onKeyDown={onKeyDown}
        className='w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xl p-5 space-y-4'
      >
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h2 id='profile-cover-dialog-title' className='text-base font-bold text-[#1C1917]'>
              Đổi ảnh bìa hồ sơ
            </h2>
            <p id='profile-cover-dialog-desc' className='text-xs text-[#57534E] mt-0.5'>
              Chọn một mẫu để xem trước trên banner. Bấm “Áp dụng” để lưu vào tài khoản.
            </p>
          </div>
          <button
            type='button'
            onClick={cancel}
            disabled={saving}
            aria-label='Đóng, không lưu'
            className='p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#C2410C]'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <fieldset className='grid grid-cols-1 sm:grid-cols-2 gap-3' disabled={saving}>
          <legend className='sr-only'>Mẫu ảnh bìa</legend>
          {option(
            DEFAULT_KEY,
            null,
            'Về mặc định',
            DEFAULT_PROFILE_COVER,
            DEFAULT_PROFILE_COVER.name,
          )}
          {PROFILE_COVER_PRESETS.map((p) => option(p.id, p.id, p.name, p))}
        </fieldset>

        {error && (
          <p
            role='alert'
            className='flex items-start gap-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800'
            data-testid='profile-cover-error'
          >
            <AlertCircle className='w-4 h-4 shrink-0' aria-hidden='true' />
            <span>{error} Bìa trên banner vẫn đang xem trước, chưa được lưu.</span>
          </p>
        )}

        <div className='flex justify-end gap-2 pt-1'>
          <button
            type='button'
            onClick={cancel}
            disabled={saving}
            className='min-h-9 px-4 rounded-lg border border-[#D8D2C5] bg-white text-sm font-semibold text-[#44403C] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#C2410C]'
          >
            Hủy
          </button>
          <button
            type='button'
            onClick={() => void apply()}
            disabled={saving}
            data-testid='profile-cover-apply'
            className='min-h-9 px-4 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-sm font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
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
