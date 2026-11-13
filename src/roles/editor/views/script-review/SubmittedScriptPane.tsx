// src/roles/editor/views/script-review/SubmittedScriptPane.tsx
/**
 * Bản kịch bản Writer đã gửi duyệt (push), theo Trang → Panel → dòng. Editor đọc đúng ảnh chụp này,
 * nên Writer sửa tiếp ở bàn viết không làm đổi chữ Editor đang góp ý. Góp ý neo theo Id dòng.
 */
import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ScriptVersionRow } from '@/services/chapter.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { isAiFinding } from '@/shared/features/script-review/reviewModel';
import { rowLineId } from '@/shared/features/script-versions/versionDiff';

export interface LineMarks {
  comments: number;
  findings: ConsistencyFindingDto[];
}

export interface ComposerTarget {
  scriptLineId: string;
  quotedText: string;
  initialText?: string;
}

interface SubmittedScriptPaneProps {
  rows: ScriptVersionRow[];
  renderText: (row: ScriptVersionRow) => string;
  marks: Map<string, LineMarks>;
  canComment: boolean;
  activeLineId: string | null;
  onSelectLine: (lineId: string) => void;
  composer: ComposerTarget | null;
  onStartComment: (target: ComposerTarget) => void;
  onSaveComment: (text: string) => void;
  onCancelComment: () => void;
}

// Một màu = một nghĩa: cam = có góp ý, tím = phát hiện AI, hổ phách = phát hiện nhất quán khác
const markerClass = (m: LineMarks | undefined) => {
  if (!m) return 'border-transparent';
  if (m.comments > 0) return 'border-orange-500';
  if (m.findings.some((f) => isAiFinding(f.ruleCode))) return 'border-violet-500';
  if (m.findings.length > 0) return 'border-amber-500';
  return 'border-transparent';
};

const Composer: React.FC<{
  target: ComposerTarget;
  onSave: (text: string) => void;
  onCancel: () => void;
}> = ({ target, onSave, onCancel }) => {
  const { t } = useTranslation('review');
  const [text, setText] = useState(target.initialText ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const save = () => {
    if (text.trim()) onSave(text.trim());
  };

  return (
    <div className='mb-2 ml-14 mr-4 mt-1 rounded-lg border border-orange-300 bg-white p-3 shadow-xs'>
      <label htmlFor='script-review-composer' className='sr-only'>
        {t('scriptReview.composer.label')}
      </label>
      <textarea
        id='script-review-composer'
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
        }}
        rows={3}
        placeholder={t('scriptReview.composer.placeholder')}
        className='w-full resize-y rounded-md border border-stone-200 bg-[#FAF9F5] px-3 py-2 text-sm leading-relaxed text-stone-800 focus:border-orange-500 focus:outline-none'
      />
      <div className='mt-2 flex items-center justify-between gap-2'>
        <span className='text-xs text-stone-500'>{t('scriptReview.composer.hint')}</span>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={onCancel}
            className='rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100'
          >
            {t('scriptReview.common.cancel')}
          </button>
          <button
            type='button'
            onClick={save}
            disabled={!text.trim()}
            className='rounded-full bg-[#EA580C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {t('scriptReview.composer.add')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SubmittedScriptPane: React.FC<SubmittedScriptPaneProps> = ({
  rows,
  renderText,
  marks,
  canComment,
  activeLineId,
  onSelectLine,
  composer,
  onStartComment,
  onSaveComment,
  onCancelComment,
}) => {
  const { t } = useTranslation('review');

  useEffect(() => {
    if (!activeLineId) return;
    document
      .querySelector(`[data-line-id="${activeLineId}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLineId]);

  if (rows.length === 0) {
    return (
      <div className='m-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-8 text-center'>
        <p className='font-serif text-base font-bold text-stone-900'>
          {t('scriptReview.manuscript.emptyTitle')}
        </p>
        <p className='mt-1 text-xs text-stone-500'>{t('scriptReview.manuscript.emptyBody')}</p>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-3xl px-4 py-6 sm:px-6'>
      <div className='rounded-xl border border-stone-200/80 bg-white py-2 shadow-xs'>
        {rows.map((row, idx) => {
          if (row.type === 'page') {
            return (
              <h3
                key={row.key}
                className={`px-4 pb-1 font-mono text-xs font-bold tracking-wide text-stone-500 ${idx > 0 ? 'mt-4 border-t border-stone-100 pt-3' : 'pt-1'}`}
              >
                {renderText(row)}
              </h3>
            );
          }
          if (row.type === 'panel') {
            return (
              <p
                key={row.key}
                className='px-4 pt-2 text-sm font-bold leading-relaxed text-stone-900'
              >
                {renderText(row)}
              </p>
            );
          }

          const lineId = rowLineId(row);
          if (!lineId) return null;
          const m = marks.get(lineId);
          const text = renderText(row);
          const isActive = activeLineId === lineId;
          const isDialogue = row.type === 'Dialogue' || row.type === 'Thought';

          return (
            <div key={row.key} data-line-id={lineId} className='scroll-mt-24'>
              <div
                className={`group flex gap-3 border-l-2 py-1.5 pr-3 transition-colors duration-150 ${markerClass(m)} ${
                  isActive ? 'bg-orange-50/60' : 'hover:bg-stone-50'
                }`}
                onClick={() => onSelectLine(lineId)}
              >
                <span className='w-10 shrink-0 pt-0.5 text-right font-mono text-[11px] tabular-nums text-stone-400'>
                  {idx + 1}
                </span>
                <p
                  className={`min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed ${
                    isDialogue ? 'pl-6 text-stone-900' : 'italic text-stone-700'
                  }`}
                >
                  {text}
                </p>
                <div className='flex shrink-0 items-start gap-1.5 pt-0.5'>
                  {(m?.comments ?? 0) > 0 && (
                    <span
                      className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs font-medium text-stone-700'
                      title={t('scriptReview.manuscript.noteCount', { count: m!.comments })}
                    >
                      <MessageSquare className='h-3.5 w-3.5' aria-hidden='true' />
                      {m!.comments}
                    </span>
                  )}
                  {canComment && (
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLine(lineId);
                        onStartComment({ scriptLineId: lineId, quotedText: text });
                      }}
                      title={t('scriptReview.manuscript.commentLineTitle')}
                      className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs font-semibold text-stone-700 transition-opacity duration-150 hover:border-orange-300 hover:text-orange-700 focus:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                    >
                      <MessageSquarePlus className='h-3.5 w-3.5' aria-hidden='true' />
                      {t('scriptReview.manuscript.commentLine')}
                    </button>
                  )}
                </div>
              </div>
              {composer && composer.scriptLineId === lineId && (
                <Composer
                  key={lineId}
                  target={composer}
                  onSave={onSaveComment}
                  onCancel={onCancelComment}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
