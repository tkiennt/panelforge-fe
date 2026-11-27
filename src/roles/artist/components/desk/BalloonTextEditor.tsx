import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { ElementSnapshotDto } from '@/services/element.service';

/**
 * Ô lời thoại của bóng đang chọn. Lưu khi rời ô (không lưu từng phím — BR-11).
 * Ngôn ngữ gốc: bóng gắn kịch bản không sửa tự do (BR-05). Ngôn ngữ dịch: hiện chữ gốc làm tham chiếu (BR-34).
 */
export const BalloonTextEditor: React.FC<{
  element: ElementSnapshotDto;
  isOriginal: boolean;
  langLabel: string;
  readOnly?: boolean;
  onCommit: (text: string) => void;
}> = ({ element, isOriginal, langLabel, readOnly = false, onCommit }) => {
  const { t } = useTranslation('artist');
  const original = element.content || element.renderedText || '';
  const initial = isOriginal ? original : (element.texts?.[langLabel.toLowerCase()] ?? '');
  const [draft, setDraft] = useState(initial);
  const lockedByScript = isOriginal && Boolean(element.scriptLineId);
  const isReadOnly = readOnly || lockedByScript;

  const commit = () => {
    if (isReadOnly) return;
    if (draft.trim() !== initial.trim()) onCommit(draft.trim());
  };

  return (
    <div data-testid='lettering-text-editor' className='space-y-1.5'>
      <label className='text-xs font-semibold text-stone-800 flex items-center justify-between'>
        <span>{t('lettering.textEditor.displayContent', { lang: langLabel })}</span>
        {lockedByScript && (
          <span className='text-xs font-normal text-stone-500'>
            {t('lettering.textEditor.fromScript')}
          </span>
        )}
      </label>
      {!isOriginal && (
        <p
          data-testid='lettering-original-reference'
          className='text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md px-2 py-1'
        >
          {t('lettering.textEditor.originalPrefix', {
            text: original || t('lettering.textEditor.empty'),
          })}
        </p>
      )}
      <textarea
        data-testid='lettering-text-input'
        value={draft}
        readOnly={isReadOnly}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={4}
        placeholder={
          isOriginal
            ? t('lettering.textEditor.placeholderOriginal')
            : t('lettering.textEditor.placeholderTranslation', { lang: langLabel })
        }
        className='w-full text-sm rounded-xl border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:border-orange-500 read-only:bg-stone-50 read-only:text-stone-500'
      />
    </div>
  );
};
