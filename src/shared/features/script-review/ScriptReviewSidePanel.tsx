import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { X } from 'lucide-react';
import type {
  ChapterDto,
  ScriptCommentDto,
  ScriptVersionDetailDto,
  ScriptVersionRow,
} from '@/services/chapter.service';
import { ScriptCommentItemCard } from './ScriptCommentCard';
import { ScriptVersionDiff } from '@/shared/features/script-versions/ScriptVersionDiff';
import { EMPTY_BASE, rowLineId } from '@/shared/features/script-versions/versionDiff';

export interface ScriptReviewSidePanelProps {
  chapter: ChapterDto | null;
  comments: ScriptCommentDto[];
  pushedVersion?: ScriptVersionDetailDto | null;
  liveRows?: ScriptVersionRow[];
  activeLineId?: string | null;
  canResolve?: boolean;
  onResolveComment?: (commentId: string) => Promise<void> | void;
  onSelectComment?: (comment: ScriptCommentDto) => void;
  onClose?: () => void;
  className?: string;
  initialTab?: 'comments' | 'changes';
}

export const ScriptReviewSidePanel: React.FC<ScriptReviewSidePanelProps> = ({
  chapter,
  comments,
  pushedVersion,
  liveRows = [],
  activeLineId,
  canResolve = false,
  onResolveComment,
  onSelectComment,
  onClose,
  className = '',
  initialTab = 'comments',
}) => {
  const { t } = useTranslation('features');
  const [tab, setTab] = useState<'comments' | 'changes'>(initialTab);

  const openCommentsCount = useMemo(() => comments.filter((c) => !c.resolvedAt).length, [comments]);

  // Tra cứu hàng theo scriptLineId
  const lineIndex = useMemo(() => {
    const map = new Map<string, ScriptVersionRow>();
    const rows = pushedVersion?.rows ?? liveRows;
    rows.forEach((r) => {
      const id = rowLineId(r);
      if (id) map.set(id, r);
    });
    return map;
  }, [pushedVersion?.rows, liveRows]);

  const getLocationLabel = (c: ScriptCommentDto): string => {
    if (!c.scriptLineId) return t('scriptReview.generalComment');
    const row = lineIndex.get(c.scriptLineId);
    if (!row) return t('scriptReview.generalComment');
    return row.panel > 0
      ? t('scriptReview.pagePanel', { page: row.page, panel: row.panel })
      : t('scriptReview.pageOnly', { page: row.page });
  };

  const getStaleness = (c: ScriptCommentDto): 'removed' | 'changed' | null => {
    if (!c.scriptLineId) return null;
    const row = lineIndex.get(c.scriptLineId);
    if (!row && pushedVersion) return 'removed';
    if (row && c.quotedText && row.text && !row.text.includes(c.quotedText)) return 'changed';
    return null;
  };

  return (
    <aside
      data-testid='script-review-side-panel'
      className={`flex flex-col h-full bg-white border-l border-stone-200 shrink-0 w-full lg:w-[28rem] min-h-0 select-none ${className}`}
    >
      {/* Tab bar */}
      <div className='flex items-center justify-between border-b border-stone-200 px-2 shrink-0 bg-white'>
        <div role='tablist' className='flex gap-1'>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'comments'}
            onClick={() => setTab('comments')}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
              tab === 'comments'
                ? 'border-orange-500 text-orange-800'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            {t('scriptReview.tabs.comments', { count: openCommentsCount })}
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'changes'}
            onClick={() => setTab('changes')}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
              tab === 'changes'
                ? 'border-orange-500 text-orange-800'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            {t('scriptReview.tabs.changes')}
          </button>
        </div>

        {onClose && (
          <button
            type='button'
            onClick={onClose}
            title={t('scriptReview.closePanelTitle')}
            className='p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors mr-1'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
        {tab === 'comments' ? (
          comments.length === 0 ? (
            <div className='p-8 text-center text-xs text-stone-500'>
              {t('scriptReview.noComments')}
            </div>
          ) : (
            <div className='p-3 space-y-3.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar'>
              {comments.map((c) => {
                const location = getLocationLabel(c);
                const stale = getStaleness(c);
                const isSelected = activeLineId === c.scriptLineId;
                return (
                  <div key={c.id} className='space-y-1.5'>
                    <div className='flex items-center justify-between px-1 text-xs text-stone-500'>
                      <span className='font-semibold text-stone-700'>{location}</span>
                      {stale && (
                        <span className='rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800'>
                          {stale === 'removed'
                            ? t('scriptReview.lineRemoved')
                            : t('scriptReview.contentChanged')}
                        </span>
                      )}
                    </div>
                    <ScriptCommentItemCard
                      comment={c}
                      canResolve={canResolve}
                      onResolve={onResolveComment}
                      isSelected={isSelected}
                      onSelect={() => onSelectComment?.(c)}
                    />
                  </div>
                );
              })}
            </div>
          )
        ) : chapter?.id && pushedVersion ? (
          <>
            <p className='border-b border-stone-200 px-3 py-2 text-xs text-stone-500'>
              {chapter.previousSubmittedVersionId
                ? t('scriptReview.compareWithPrevious')
                : t('scriptReview.firstSubmittedVersion')}
            </p>
            <ScriptVersionDiff
              key={`${chapter.previousSubmittedVersionId ?? EMPTY_BASE}>${pushedVersion.version.id}`}
              chapterId={chapter.id}
              defaultFromId={chapter.previousSubmittedVersionId ?? EMPTY_BASE}
              defaultToId={pushedVersion.version.id}
            />
          </>
        ) : (
          <div className='p-8 text-center text-xs text-stone-500'>
            {t('features.scriptReview.noSubmittedVersion')}
          </div>
        )}
      </div>
    </aside>
  );
};
