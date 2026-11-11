import React, { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { SceneDetailDto, SceneScriptLineSummaryDto } from '@/services/scriptLine.service';
import type { ChangeRequestDto, ConsistencyFindingDto } from '@/types/pipeline';
import { anchorKey, crStatus, isCrClosed, lineText, type ReviewDraft } from './scriptReviewModel';

export interface AnchorMarks {
  drafts: ReviewDraft[];
  crs: ChangeRequestDto[];
  findings: ConsistencyFindingDto[];
}

export interface ComposerTarget {
  sceneId: string;
  scriptLineId: string | null;
  quotedText: string;
  /** Sửa một nháp có sẵn thay vì thêm mới */
  draftId?: string;
  initialText?: string;
}

interface ManuscriptPaneProps {
  scenes: SceneDetailDto[];
  speakerName: (characterId: string | null | undefined) => string | null;
  marks: Map<string, AnchorMarks>;
  canComment: boolean;
  activeAnchor: string | null;
  onSelectAnchor: (key: string) => void;
  composer: ComposerTarget | null;
  onStartComment: (target: ComposerTarget) => void;
  onSaveComment: (text: string) => void;
  onCancelComment: () => void;
}

// Một màu = một nghĩa (DESIGN_RULES 1.5): cam = nháp của Editor, đỏ = yêu cầu đang mở,
// hổ phách = Writer báo đã sửa chờ xác minh, tím = phát hiện nhất quán.
const markerClass = (m: AnchorMarks | undefined) => {
  if (!m) return 'border-transparent';
  if (m.drafts.length > 0) return 'border-orange-500';
  const live = m.crs.filter((c) => !isCrClosed(c));
  if (live.some((c) => crStatus(c.status) === 'Open')) return 'border-rose-500';
  if (live.some((c) => crStatus(c.status) === 'Resolved')) return 'border-amber-500';
  if (m.findings.length > 0) return 'border-violet-500';
  return 'border-transparent';
};

const noteCount = (m: AnchorMarks | undefined) =>
  m ? m.drafts.length + m.crs.filter((c) => !isCrClosed(c)).length : 0;

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
    <div className='mt-2 ml-14 mr-4 rounded-lg border border-orange-300 bg-white p-3 shadow-xs'>
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
        className='w-full resize-y rounded-md border border-stone-200 bg-[#FAF9F5] px-3 py-2 text-sm text-stone-800 leading-relaxed focus:border-orange-500 focus:outline-none'
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
            {target.draftId ? t('scriptReview.composer.update') : t('scriptReview.composer.add')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ManuscriptPane: React.FC<ManuscriptPaneProps> = ({
  scenes,
  speakerName,
  marks,
  canComment,
  activeAnchor,
  onSelectAnchor,
  composer,
  onStartComment,
  onSaveComment,
  onCancelComment,
}) => {
  const { t } = useTranslation('review');

  useEffect(() => {
    if (!activeAnchor) return;
    document
      .querySelector(`[data-anchor="${activeAnchor}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeAnchor]);

  const isComposingAt = (sceneId: string, lineId: string | null) =>
    !!composer && composer.sceneId === sceneId && composer.scriptLineId === lineId;

  const renderLine = (scene: SceneDetailDto, line: SceneScriptLineSummaryDto, index: number) => {
    const key = anchorKey(scene.id, line.id);
    const m = marks.get(key);
    const count = noteCount(m);
    const speaker = speakerName(line.speakerCharacterId);
    const isActive = activeAnchor === key;

    return (
      <li key={line.id} data-anchor={key} className='scroll-mt-24'>
        <div
          className={`group relative flex gap-3 border-l-2 py-2 pr-3 transition-colors duration-150 ${markerClass(m)} ${
            isActive ? 'bg-orange-50/60' : 'hover:bg-stone-50'
          }`}
          onClick={() => onSelectAnchor(key)}
        >
          <span className='w-10 shrink-0 pt-0.5 text-right font-mono text-xs text-stone-500 tabular-nums'>
            {scene.sceneNumber}.{index + 1}
          </span>
          <div className='min-w-0 flex-1'>
            {line.stageDirection && (
              <p className='text-sm italic leading-relaxed text-stone-600'>{line.stageDirection}</p>
            )}
            {line.dialogueText && (
              <div className={`pl-6 ${line.stageDirection ? 'mt-1.5' : ''}`}>
                <p className='text-xs font-semibold uppercase tracking-wide text-stone-500'>
                  {speaker ?? t('scriptReview.manuscript.unknownSpeaker')}
                </p>
                <p className='max-w-prose text-sm leading-relaxed text-stone-900'>
                  {line.dialogueText}
                </p>
              </div>
            )}
          </div>
          <div className='flex shrink-0 items-start gap-1.5 pt-0.5'>
            {count > 0 && (
              <span
                className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs font-medium text-stone-700'
                title={t('scriptReview.manuscript.noteCount', { count })}
              >
                <MessageSquare className='h-3.5 w-3.5' aria-hidden='true' />
                {count}
              </span>
            )}
            {canComment && (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnchor(key);
                  onStartComment({
                    sceneId: scene.id,
                    scriptLineId: line.id,
                    quotedText: lineText(line),
                  });
                }}
                className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs font-semibold text-stone-700 transition-opacity duration-150 hover:border-orange-300 hover:text-orange-700 focus:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                title={t('scriptReview.manuscript.commentLineTitle')}
              >
                <MessageSquarePlus className='h-3.5 w-3.5' aria-hidden='true' />
                {t('scriptReview.manuscript.commentLine')}
              </button>
            )}
          </div>
        </div>
        {composer && isComposingAt(scene.id, line.id) && (
          <Composer
            key={composer.draftId ?? key}
            target={composer}
            onSave={onSaveComment}
            onCancel={onCancelComment}
          />
        )}
      </li>
    );
  };

  if (scenes.length === 0) {
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
      {scenes.map((scene) => {
        const sceneKey = anchorKey(scene.id, null);
        const sceneMarks = marks.get(sceneKey);
        const sceneCount = noteCount(sceneMarks);
        const lines = [...scene.scriptLines].sort((a, b) => a.lineOrder - b.lineOrder);
        const heading = scene.slugline || scene.heading || scene.sceneName;

        return (
          <section
            key={scene.id}
            id={`scene-${scene.id}`}
            className='mb-6 scroll-mt-4 rounded-xl border border-stone-200/80 bg-white shadow-xs'
          >
            <header
              data-anchor={sceneKey}
              onClick={() => onSelectAnchor(sceneKey)}
              className={`flex items-start justify-between gap-3 border-b border-l-2 border-b-stone-100 px-4 py-3 ${markerClass(sceneMarks)} ${
                activeAnchor === sceneKey ? 'bg-orange-50/60' : ''
              }`}
            >
              <div className='min-w-0'>
                <p className='font-mono text-xs font-semibold text-stone-500'>
                  {t('scriptReview.manuscript.sceneLabel', { number: scene.sceneNumber })}
                </p>
                {heading && (
                  <h3 className='mt-0.5 text-sm font-bold uppercase tracking-wide text-stone-900'>
                    {heading}
                  </h3>
                )}
                {scene.summary && (
                  <p className='mt-1 text-xs leading-normal text-stone-600'>{scene.summary}</p>
                )}
              </div>
              <div className='flex shrink-0 items-center gap-1.5'>
                {sceneCount > 0 && (
                  <span className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs font-medium text-stone-700'>
                    <MessageSquare className='h-3.5 w-3.5' aria-hidden='true' />
                    {sceneCount}
                  </span>
                )}
                {canComment && (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAnchor(sceneKey);
                      onStartComment({
                        sceneId: scene.id,
                        scriptLineId: null,
                        quotedText: heading ?? '',
                      });
                    }}
                    className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-700'
                  >
                    <MessageSquarePlus className='h-3.5 w-3.5' aria-hidden='true' />
                    {t('scriptReview.manuscript.commentScene')}
                  </button>
                )}
              </div>
            </header>
            {composer && isComposingAt(scene.id, null) && (
              <div className='pb-3'>
                <Composer
                  key={composer.draftId ?? sceneKey}
                  target={composer}
                  onSave={onSaveComment}
                  onCancel={onCancelComment}
                />
              </div>
            )}
            {lines.length === 0 ? (
              <p className='px-4 py-3 text-xs text-stone-500'>
                {t('scriptReview.manuscript.emptyScene')}
              </p>
            ) : (
              <ol className='py-1'>{lines.map((line, i) => renderLine(scene, line, i))}</ol>
            )}
          </section>
        );
      })}
    </div>
  );
};
