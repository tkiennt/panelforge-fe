import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  MapPin,
  MessageSquare,
  RotateCcw,
  Send,
  Unlock,
  Wrench,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ChapterDto } from '@/services/chapter.service';
import type { PageCommentDto, PageCommentStatus } from '@/services/pageComment.service';
import { Badge, Button, CountChip, EmptyState, Tabs } from '@/shared/ui';

export type CommentScopeFilter = 'page' | 'chapter' | 'series';

export interface DraftPinTarget {
  chapterId: string;
  chapterNumber: number;
  pageId: string | null;
  pageNumber: number | null;
  assetReferenceId: string | null;
  pinX: number | null;
  pinY: number | null;
}

export interface CommentPanelContentProps {
  comments: PageCommentDto[];
  chaptersById: Record<string, ChapterDto>;
  activeChapterId: string | null;
  activePageId: string | null;
  selectedCommentId: string | null;
  statusFilter: PageCommentStatus;
  scopeFilter: CommentScopeFilter;
  isProducer: boolean;
  /** Đóng / mở lại / chuyển rework góp ý: chỉ Producer/Editor (Writer chỉ xem và tạo). */
  canModerate?: boolean;
  draftTarget: DraftPinTarget | null;
  draftMessage: string;
  submittingComment: boolean;
  actionCommentId: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onStatusFilterChange: (status: PageCommentStatus) => void;
  onScopeFilterChange: (scope: CommentScopeFilter) => void;
  onSelectComment: (comment: PageCommentDto) => void;
  onDraftMessageChange: (value: string) => void;
  onClearPin: () => void;
  onSubmitComment: () => Promise<void>;
  onResolveComment: (comment: PageCommentDto, note?: string) => Promise<void>;
  onReopenComment: (comment: PageCommentDto) => Promise<void>;
  onRequestRework: (comment: PageCommentDto) => void;
  onRequestReopenChapter: (chapter: ChapterDto) => void;
}

export const CommentPanelContent: React.FC<CommentPanelContentProps> = ({
  comments,
  chaptersById,
  activeChapterId,
  activePageId,
  selectedCommentId,
  statusFilter,
  scopeFilter,
  isProducer,
  canModerate = true,
  draftTarget,
  draftMessage,
  submittingComment,
  actionCommentId,
  textareaRef,
  onStatusFilterChange,
  onScopeFilterChange,
  onSelectComment,
  onDraftMessageChange,
  onClearPin,
  onSubmitComment,
  onResolveComment,
  onReopenComment,
  onRequestRework,
  onRequestReopenChapter,
}) => {
  const { t, lang } = useTranslation('review');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    [lang],
  );

  const scopedComments = useMemo(() => {
    return comments.filter((c) => {
      if (scopeFilter === 'page' && activePageId) return c.pageId === activePageId;
      if (scopeFilter === 'chapter' && activeChapterId) return c.chapterId === activeChapterId;
      return true;
    });
  }, [comments, scopeFilter, activePageId, activeChapterId]);

  const counts = useMemo(
    () => ({
      Open: scopedComments.filter((c) => c.status === 'Open').length,
      Resolved: scopedComments.filter((c) => c.status === 'Resolved').length,
      ConvertedToRework: scopedComments.filter((c) => c.status === 'ConvertedToRework').length,
    }),
    [scopedComments],
  );

  const visibleComments = useMemo(
    () => scopedComments.filter((c) => c.status === statusFilter),
    [scopedComments, statusFilter],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (draftMessage.trim() && !submittingComment) {
        void onSubmitComment();
      }
    }
  };

  return (
    <div className='flex flex-col h-full min-h-0'>
      {/* Filters */}
      <div className='p-3 border-b border-stone-200 space-y-2.5 bg-white shrink-0'>
        <Tabs
          aria-label={t('seriesReader.comments.drawerTitle')}
          value={statusFilter}
          onChange={(val) => onStatusFilterChange(val as PageCommentStatus)}
          items={[
            { id: 'Open', label: t('seriesReader.status.Open'), count: counts.Open },
            { id: 'Resolved', label: t('seriesReader.status.Resolved'), count: counts.Resolved },
            {
              id: 'ConvertedToRework',
              label: t('seriesReader.status.ConvertedToRework'),
              count: counts.ConvertedToRework,
            },
          ]}
        />

        <div
          className='flex items-center gap-1.5'
          role='group'
          aria-label={t('seriesReader.scope.label')}
        >
          {(['page', 'chapter', 'series'] as const).map((scope) => (
            <button
              key={scope}
              type='button'
              onClick={() => onScopeFilterChange(scope)}
              className={`flex-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                scopeFilter === scope
                  ? 'bg-orange-50 text-orange-800 border border-orange-200'
                  : 'bg-stone-100 text-stone-600 border border-transparent hover:bg-stone-200/70'
              }`}
            >
              {t(`seriesReader.scope.${scope}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Comment List */}
      <div className='flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#FAF9F5]'>
        {visibleComments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className='w-5 h-5' aria-hidden='true' />}
            title={t('seriesReader.comments.emptyTitle')}
            description={t('seriesReader.comments.emptyDesc')}
          />
        ) : (
          visibleComments.map((comment) => {
            const chapter = chaptersById[comment.chapterId];
            const isInProduction = chapter?.status === 'InProduction';
            const isSelected = selectedCommentId === comment.id;
            const isBusy = actionCommentId === comment.id;
            const statusTone =
              comment.status === 'Open'
                ? 'warning'
                : comment.status === 'Resolved'
                  ? 'neutral'
                  : 'danger';

            return (
              <article
                key={comment.id}
                data-testid={`page-comment-card-${comment.id}`}
                onClick={() => onSelectComment(comment)}
                className={`rounded-xl border p-3 bg-white transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-200 shadow-xs'
                    : 'border-stone-200/80 hover:border-orange-300'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='text-xs font-semibold text-stone-900 truncate'>
                      {comment.authorName || t('seriesReader.comments.unknownAuthor')}
                    </div>
                    <div className='text-xs text-stone-500 font-mono'>
                      {dateFormatter.format(new Date(comment.createdAt))}
                    </div>
                  </div>
                  <Badge tone={statusTone}>{t(`seriesReader.status.${comment.status}`)}</Badge>
                </div>

                <div className='flex flex-wrap items-center gap-1.5 text-xs text-stone-600'>
                  <span className='font-medium'>
                    {t('seriesReader.comments.chapterShort', { number: comment.chapterNumber })}
                  </span>
                  {comment.pageNumber != null && (
                    <>
                      <span>·</span>
                      <span>
                        {t('seriesReader.comments.pageShort', { number: comment.pageNumber })}
                      </span>
                    </>
                  )}
                  {comment.panelNumber != null && (
                    <>
                      <span>·</span>
                      <span>
                        {t('seriesReader.comments.panelShort', { number: comment.panelNumber })}
                      </span>
                    </>
                  )}
                  {comment.pinX != null && comment.pinY != null && (
                    <MapPin className='w-3.5 h-3.5 text-orange-600 shrink-0' aria-hidden='true' />
                  )}
                </div>

                <p className='text-xs text-stone-800 whitespace-pre-wrap break-words leading-relaxed'>
                  {comment.message}
                </p>

                {comment.stageName && comment.status === 'ConvertedToRework' && (
                  <div className='text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1'>
                    {t('seriesReader.comments.convertedStage', { stage: comment.stageName })}
                  </div>
                )}

                {comment.resolutionNote && comment.status === 'Resolved' && (
                  <div className='text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1'>
                    {t('seriesReader.comments.resolutionNotePrefix')} {comment.resolutionNote}
                  </div>
                )}

                {/* Actions */}
                {canModerate && (
                  <div
                    className='pt-1.5 border-t border-stone-100 space-y-2'
                    onClick={(e) => e.stopPropagation()}
                  >
                    {comment.status === 'Open' && resolvingId === comment.id ? (
                      <div className='space-y-1.5'>
                        <input
                          type='text'
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder={t('seriesReader.comments.resolveNotePlaceholder')}
                          className='w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-900 focus:border-orange-500 focus:outline-none'
                        />
                        <div className='flex items-center justify-end gap-1.5'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setResolvingId(null);
                              setResolutionNote('');
                            }}
                          >
                            {t('seriesReader.cancel')}
                          </Button>
                          <Button
                            variant='primary'
                            size='sm'
                            loading={isBusy}
                            onClick={async () => {
                              await onResolveComment(comment, resolutionNote.trim() || undefined);
                              setResolvingId(null);
                              setResolutionNote('');
                            }}
                          >
                            {t('seriesReader.comments.confirmResolve')}
                          </Button>
                        </div>
                      </div>
                    ) : comment.status === 'Open' ? (
                      <div className='space-y-1.5'>
                        <div className='flex flex-wrap items-center gap-1.5'>
                          <Button
                            variant='secondary'
                            size='sm'
                            leadingIcon={<CheckCircle2 aria-hidden='true' />}
                            disabled={isBusy}
                            onClick={() => {
                              setResolvingId(comment.id);
                              setResolutionNote('');
                            }}
                          >
                            {t('seriesReader.comments.resolveBtn')}
                          </Button>

                          {isProducer && (
                            <Button
                              variant='secondary'
                              size='sm'
                              leadingIcon={<Wrench aria-hidden='true' />}
                              disabled={isBusy || !isInProduction}
                              title={
                                !isInProduction
                                  ? t('seriesReader.comments.reopenChapterFirst')
                                  : undefined
                              }
                              data-testid={`convert-rework-btn-${comment.id}`}
                              onClick={() => onRequestRework(comment)}
                            >
                              {t('seriesReader.comments.convertToReworkBtn')}
                            </Button>
                          )}
                        </div>

                        {isProducer && !isInProduction && chapter && (
                          <div className='flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-900'>
                            <span>{t('seriesReader.comments.reopenChapterFirst')}</span>
                            <Button
                              variant='ghost'
                              size='sm'
                              leadingIcon={<Unlock aria-hidden='true' />}
                              onClick={() => onRequestReopenChapter(chapter)}
                              data-testid={`reopen-chapter-btn-${chapter.id}`}
                            >
                              {t('seriesReader.comments.reopenChapterBtn')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : comment.status === 'Resolved' ? (
                      <Button
                        variant='secondary'
                        size='sm'
                        leadingIcon={<RotateCcw aria-hidden='true' />}
                        disabled={isBusy}
                        loading={isBusy}
                        onClick={() => void onReopenComment(comment)}
                      >
                        {t('seriesReader.comments.reopenBtn')}
                      </Button>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Add Comment Form */}
      <div className='p-3 border-t border-stone-200 bg-white space-y-2 shrink-0'>
        <div className='flex items-center justify-between gap-2 text-xs text-stone-600'>
          <div className='flex items-center gap-1.5 min-w-0 truncate'>
            <MapPin className='w-3.5 h-3.5 text-orange-600 shrink-0' aria-hidden='true' />
            {draftTarget ? (
              <span className='truncate'>
                {t('seriesReader.comments.chapterShort', { number: draftTarget.chapterNumber })}
                {draftTarget.pageNumber != null
                  ? ` · ${t('seriesReader.comments.pageShort', { number: draftTarget.pageNumber })}`
                  : ''}
                {draftTarget.pinX != null && draftTarget.pinY != null
                  ? ` (${Math.round(draftTarget.pinX * 100)}%, ${Math.round(draftTarget.pinY * 100)}%)`
                  : ''}
              </span>
            ) : (
              <span className='text-stone-500'>{t('seriesReader.comments.noTargetSelected')}</span>
            )}
          </div>
          {draftTarget?.pinX != null && (
            <button
              type='button'
              onClick={onClearPin}
              className='text-xs text-stone-500 hover:text-stone-800 inline-flex items-center gap-0.5 cursor-pointer shrink-0'
            >
              <X className='w-3.5 h-3.5' aria-hidden='true' />
              <span>{t('seriesReader.comments.clearPin')}</span>
            </button>
          )}
        </div>

        <textarea
          ref={textareaRef}
          rows={3}
          value={draftMessage}
          onChange={(e) => onDraftMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('seriesReader.comments.inputPlaceholder')}
          data-testid='series-reader-comment-input'
          className='w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:outline-none resize-none'
        />

        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs text-stone-500'>{t('seriesReader.comments.shortcutHint')}</span>
          <div className='flex items-center gap-2'>
            <CountChip>{draftMessage.trim().length}</CountChip>
            <Button
              variant='primary'
              size='sm'
              leadingIcon={<Send aria-hidden='true' />}
              disabled={!draftTarget || !draftMessage.trim() || submittingComment}
              loading={submittingComment}
              onClick={() => void onSubmitComment()}
              data-testid='series-reader-comment-submit'
            >
              {t('seriesReader.comments.submitBtn')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
