import React, { useState } from 'react';
import { AlertCircle, Check, ImageOff, Loader2, X } from 'lucide-react';
import {
  DEFAULT_PROFILE_COVER,
  PROFILE_COVER_PRESETS,
  type ProfileCoverPreset,
} from '@/shared/utils/profileCovers';
import { Alert, Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

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
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(savedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
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
      setError(err instanceof Error ? err.message : t('profile.coverPicker.saveError'));
    } finally {
      setSaving(false);
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
              {t('profile.coverPicker.inUseBadge')}
            </span>
          )}
        </span>
        {hint && <span className='px-0.5 text-[11px] text-[#57534E]'>{hint}</span>}
      </label>
    );
  };

  return (
    <Modal
      isOpen
      onClose={cancel}
      closeLabel={t('profile.coverPicker.closeWithoutSaving')}
      size='lg'
      title={t('profile.coverPicker.title')}
      dismissible={!saving}
    >
      <div
        data-testid='profile-cover-dialog'
        className='w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xl p-5 space-y-4'
      >
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h2 id='profile-cover-dialog-title' className='text-base font-bold text-[#1C1917]'>
              {t('profile.coverPicker.title')}
            </h2>
            <p id='profile-cover-dialog-desc' className='text-xs text-[#57534E] mt-0.5'>
              {t('profile.coverPicker.desc')}
            </p>
          </div>
          <button
            type='button'
            onClick={cancel}
            disabled={saving}
            aria-label={t('profile.coverPicker.closeWithoutSaving')}
            className='p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#C2410C]'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <fieldset className='grid grid-cols-1 sm:grid-cols-2 gap-3' disabled={saving}>
          <legend className='sr-only'>{t('profile.coverPicker.legend')}</legend>
          {option(
            DEFAULT_KEY,
            null,
            t('profile.coverPicker.resetDefault'),
            DEFAULT_PROFILE_COVER,
            DEFAULT_PROFILE_COVER.name,
          )}
          {PROFILE_COVER_PRESETS.map((p) => option(p.id, p.id, p.name, p))}
        </fieldset>

        {error && (
          <Alert tone='danger' className='text-xs' data-testid='profile-cover-error'>
            <span>
              {error} {t('profile.coverPicker.unsavedPreviewNote')}
            </span>
          </Alert>
        )}

        <div className='flex justify-end gap-2 pt-1'>
          <button
            type='button'
            onClick={cancel}
            disabled={saving}
            className='min-h-9 px-4 rounded-lg border border-[#D8D2C5] bg-white text-sm font-semibold text-[#44403C] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#C2410C]'
          >
            {t('profile.coverPicker.cancel')}
          </button>
          <button
            type='button'
            onClick={() => void apply()}
            disabled={saving}
            data-testid='profile-cover-apply'
            className='min-h-9 px-4 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-sm font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
          >
            {saving && <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />}
            {saving ? t('profile.coverPicker.saving') : t('profile.coverPicker.apply')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
