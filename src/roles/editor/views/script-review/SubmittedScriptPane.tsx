// src/roles/editor/views/script-review/SubmittedScriptPane.tsx
/**
 * Bản kịch bản Writer đã gửi duyệt (push), theo Trang → Panel → dòng. Editor đọc đúng ảnh chụp này,
 * nên Writer sửa tiếp ở bàn viết không làm đổi chữ Editor đang góp ý. Góp ý neo theo Id dòng.
 */
import React, { useEffect } from 'react';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ScriptVersionRow, ScriptCommentDto } from '@/services/chapter.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { isAiFinding } from '@/shared/features/script-review/reviewModel';
import { rowLineId } from '@/shared/features/script-versions/versionDiff';
import {
  ScriptCommentComposer,
  renderQuotedHighlight,
} from '@/shared/features/script-review/ScriptCommentCard';

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
  comments?: ScriptCommentDto[];
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

export const SubmittedScriptPane: React.FC<SubmittedScriptPaneProps> = ({
  rows,
  renderText,
  marks,
  comments,
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
    const el = document.querySelector(`[data-line-id="${activeLineId}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeLineId]);

  // Group rows into Pages and Panels for Stitch view-script card layout
  type ScriptBlock =
    | { kind: 'page'; row: ScriptVersionRow }
    | { kind: 'panel'; row: ScriptVersionRow; lines: ScriptVersionRow[] };

  const blocks = React.useMemo(() => {
    const list: ScriptBlock[] = [];
    let currentPanel: { kind: 'panel'; row: ScriptVersionRow; lines: ScriptVersionRow[] } | null =
      null;

    for (const r of rows) {
      if (r.type === 'page') {
        currentPanel = null;
        list.push({ kind: 'page', row: r });
      } else if (r.type === 'panel') {
        currentPanel = { kind: 'panel', row: r, lines: [] };
        list.push(currentPanel);
      } else {
        if (currentPanel) {
          currentPanel.lines.push(r);
        } else {
          // Orphan line before any panel: create an implicit panel
          currentPanel = {
            kind: 'panel',
            row: {
              key: `panel:auto:${r.page}:${r.panel}`,
              type: 'panel',
              page: r.page,
              panel: r.panel,
              text: t('scriptReview.manuscript.panelCode', { page: r.page, panel: r.panel }),
            },
            lines: [r],
          };
          list.push(currentPanel);
        }
      }
    }
    return list;
  }, [rows, t]);

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
    <div className='mx-auto w-full max-w-4xl px-4 py-6 sm:px-6'>
      <div className='rounded-xl border border-stone-200 bg-white p-6 shadow-xs space-y-6'>
        <div className='flex items-center justify-between pb-3 border-b border-stone-200'>
          <div>
            <h3 className='text-sm font-bold text-stone-900'>
              {t('scriptReview.manuscript.viewerTitle')}
            </h3>
            <p className='text-xs text-stone-500 mt-0.5'>
              {t('scriptReview.manuscript.viewerSubtitle')}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700'>
              {t('scriptReview.manuscript.itemCount', { count: rows.length })}
            </span>
          </div>
        </div>

        <div className='space-y-6'>
          {blocks.map((block) => {
            if (block.kind === 'page') {
              return (
                <div key={block.row.key} className='flex items-center justify-between pt-2'>
                  <span className='text-xs font-bold text-stone-900 uppercase tracking-wider bg-stone-100 px-2.5 py-1 rounded border border-stone-200'>
                    {renderText(block.row)}
                  </span>
                  <span className='text-xs text-stone-400 font-mono'>
                    {t('scriptReview.manuscript.pageNumber', { page: block.row.page })}
                  </span>
                </div>
              );
            }

            const panelRow = block.row;
            return (
              <div key={panelRow.key} className='space-y-2.5 pl-2 border-l-2 border-stone-200'>
                <div className='p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2.5 shadow-2xs'>
                  <div className='flex justify-between items-center text-xs pb-1 border-b border-stone-200/70'>
                    <span className='font-semibold text-stone-900'>{renderText(panelRow)}</span>
                    <span className='text-stone-400 font-mono text-[11px]'>
                      {t('scriptReview.manuscript.panelCode', {
                        page: panelRow.page,
                        panel: panelRow.panel,
                      })}
                    </span>
                  </div>

                  {block.lines.map((row, lineIdx) => {
                    const lineId = rowLineId(row);
                    if (!lineId) return null;
                    const m = marks.get(lineId);
                    const text = renderText(row);
                    const isActive = activeLineId === lineId;
                    const isDialogue = row.type === 'Dialogue' || row.type === 'Thought';
                    const isSfx = row.type === 'Sfx';
                    const lineComments = comments?.filter(
                      (c) => c.scriptLineId === lineId && !c.resolvedAt,
                    );

                    return (
                      <div
                        key={row.key || lineId}
                        data-line-id={lineId}
                        className='scroll-mt-24 space-y-2'
                      >
                        <div
                          className={`group flex items-start gap-2.5 rounded-md p-2 transition-colors duration-150 border-l-2 ${markerClass(m)} ${
                            isActive
                              ? 'bg-orange-50/70 ring-1 ring-orange-200'
                              : 'hover:bg-white bg-white/70'
                          }`}
                          onClick={() => onSelectLine(lineId)}
                        >
                          <span className='w-6 shrink-0 pt-0.5 text-right font-mono text-[11px] tabular-nums text-stone-400'>
                            {lineIdx + 1}
                          </span>

                          <div className='min-w-0 flex-1 text-xs leading-relaxed'>
                            {isDialogue ? (
                              <p className='text-stone-900'>
                                {row.label && (
                                  <span className='font-semibold text-orange-700 mr-1.5'>
                                    {row.label}:
                                  </span>
                                )}
                                {renderQuotedHighlight(
                                  text,
                                  (composer && composer.scriptLineId === lineId
                                    ? composer.quotedText
                                    : null) ||
                                    lineComments?.[0]?.quotedText ||
                                    null,
                                )}
                              </p>
                            ) : isSfx ? (
                              <div className='font-mono text-stone-700'>
                                <strong className='text-orange-700'>SFX: </strong>
                                {renderQuotedHighlight(
                                  text,
                                  (composer && composer.scriptLineId === lineId
                                    ? composer.quotedText
                                    : null) ||
                                    lineComments?.[0]?.quotedText ||
                                    null,
                                )}
                              </div>
                            ) : (
                              <p className='italic text-stone-600'>
                                {renderQuotedHighlight(
                                  text,
                                  (composer && composer.scriptLineId === lineId
                                    ? composer.quotedText
                                    : null) ||
                                    lineComments?.[0]?.quotedText ||
                                    null,
                                )}
                              </p>
                            )}
                          </div>

                          <div className='flex shrink-0 items-center gap-1.5 pt-0.5'>
                            {(m?.comments ?? 0) > 0 && (
                              <span
                                className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-700 shadow-2xs'
                                title={t('scriptReview.manuscript.noteCount', {
                                  count: m!.comments,
                                })}
                              >
                                <MessageSquare
                                  className='h-3 w-3 text-orange-600'
                                  aria-hidden='true'
                                />
                                {m!.comments}
                              </span>
                            )}
                            {canComment && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectLine(lineId);
                                  const sel = window.getSelection()?.toString().trim();
                                  const quote = sel && text.includes(sel) ? sel : text;
                                  onStartComment({ scriptLineId: lineId, quotedText: quote });
                                }}
                                title={t('scriptReview.manuscript.commentLineTitle')}
                                className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-700 transition-opacity duration-150 hover:border-orange-300 hover:text-orange-700 shadow-2xs focus:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 cursor-pointer'
                              >
                                <MessageSquarePlus
                                  className='h-3 w-3 text-orange-600'
                                  aria-hidden='true'
                                />
                                <span>{t('scriptReview.manuscript.commentLine')}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline existing comments if any */}
                        {lineComments && lineComments.length > 0 && (
                          <div className='space-y-1.5 pl-8 pr-2'>
                            {lineComments.map((c) => (
                              <div
                                key={c.id}
                                className='bg-amber-50/80 border-l-2 border-amber-500 p-2.5 rounded-r-lg text-xs text-amber-900 flex items-start gap-2 shadow-2xs'
                              >
                                <MessageSquare className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
                                <div className='min-w-0 flex-1'>
                                  <div className='font-semibold text-amber-800 text-[11px]'>
                                    {c.authorName || t('scriptReview.manuscript.defaultAuthor')}
                                  </div>
                                  <p className='mt-0.5 text-stone-800 leading-normal'>{c.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline composer when active */}
                        {composer && composer.scriptLineId === lineId && (
                          <div className='my-2 pl-8 pr-2'>
                            <ScriptCommentComposer
                              key={lineId}
                              initialText={composer.initialText}
                              quotedText={composer.quotedText}
                              onSave={onSaveComment}
                              onCancel={onCancelComment}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
