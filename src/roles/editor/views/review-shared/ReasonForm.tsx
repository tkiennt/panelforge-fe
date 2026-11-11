import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

/** Ô nhập lý do bắt buộc, thay cho window.prompt (mở lại / bỏ yêu cầu sửa, bỏ qua phát hiện, mở lại kịch bản). */
export const ReasonForm: React.FC<{
  label: string;
  confirmLabel: string;
  busy?: boolean;
  tone?: 'danger' | 'neutral';
  onConfirm: (text: string) => void;
  onCancel: () => void;
}> = ({ label, confirmLabel, busy = false, tone = 'danger', onConfirm, onCancel }) => {
  const { t } = useTranslation('review');
  const [text, setText] = useState('');
  return (
    <div className='mt-2 space-y-2'>
      <label className='block text-xs font-semibold text-stone-700'>
        {label}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          autoFocus
          className='mt-1 w-full resize-y rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm font-normal text-stone-800 focus:border-orange-500 focus:outline-none'
        />
      </label>
      <div className='flex justify-end gap-2'>
        <button
          type='button'
          onClick={onCancel}
          className='rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100'
        >
          {t('scriptReview.common.cancel')}
        </button>
        <button
          type='button'
          disabled={!text.trim() || busy}
          onClick={() => onConfirm(text.trim())}
          className={`rounded-full px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
            tone === 'danger'
              ? 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50'
              : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};
