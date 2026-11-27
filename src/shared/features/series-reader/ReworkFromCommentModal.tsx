import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { PageCommentDto } from '@/services/pageComment.service';
import type { StageTaskDto, TaskGridDto } from '@/types';
import { Alert, Badge, Button, Modal } from '@/shared/ui';

export interface ReworkFromCommentModalProps {
  isOpen: boolean;
  comment: PageCommentDto | null;
  taskGrid: TaskGridDto | null;
  memberNamesById: Record<string, string>;
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (stageTaskId: string, reason: string) => Promise<void>;
}

const ELIGIBLE_STATUSES = new Set(['Approved', 'Submitted', 'UnderReview']);

export const ReworkFromCommentModal: React.FC<ReworkFromCommentModalProps> = ({
  isOpen,
  comment,
  taskGrid,
  memberNamesById,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation('review');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const candidateTasks = useMemo(() => {
    if (!comment || !taskGrid) return [];
    const stageById = new Map(taskGrid.stages.map((s) => [s.id, s]));
    return taskGrid.tasks
      .filter((task) => {
        if (task.status === 'Cancelled') return false;
        if (!comment.pageId) return true;
        return task.pageId === comment.pageId || !task.pageId;
      })
      .sort((a, b) => {
        const oa = stageById.get(a.pipelineStageId)?.stageOrder ?? 0;
        const ob = stageById.get(b.pipelineStageId)?.stageOrder ?? 0;
        return oa - ob;
      })
      .map((task) => ({
        task,
        stageName: stageById.get(task.pipelineStageId)?.name ?? task.pipelineStageId,
        isChapterLevel: !task.pageId,
        eligible: ELIGIBLE_STATUSES.has(String(task.status)),
      }));
  }, [comment, taskGrid]);

  useEffect(() => {
    if (isOpen && comment) {
      setReason(comment.message);
      const firstEligible = candidateTasks.find((c) => c.eligible);
      setSelectedTaskId(firstEligible?.task.id ?? '');
    }
  }, [isOpen, comment, candidateTasks]);

  const handleConfirm = async () => {
    if (!selectedTaskId || !reason.trim()) return;
    await onSubmit(selectedTaskId, reason.trim());
  };

  const renderStatusBadge = (task: StageTaskDto) => {
    const st = String(task.status);
    if (st === 'Approved') {
      return (
        <Badge tone='success' icon={<CheckCircle2 aria-hidden='true' />}>
          {t('seriesReader.reworkModal.statusApproved')}
        </Badge>
      );
    }
    if (st === 'Submitted' || st === 'UnderReview') {
      return (
        <Badge tone='warning' icon={<Clock aria-hidden='true' />}>
          {st === 'Submitted'
            ? t('seriesReader.reworkModal.statusSubmitted')
            : t('seriesReader.reworkModal.statusUnderReview')}
        </Badge>
      );
    }
    return <Badge tone='neutral'>{st}</Badge>;
  };

  return (
    <Modal
      isOpen={isOpen}
      title={t('seriesReader.reworkModal.title')}
      description={
        comment
          ? t('seriesReader.reworkModal.subtitle', {
              chapter: comment.chapterNumber,
              page: comment.pageNumber ?? '—',
            })
          : undefined
      }
      size='md'
      closeLabel={t('seriesReader.close')}
      onClose={onClose}
      data-testid='rework-from-comment-modal'
      footer={
        <>
          <Button variant='secondary' size='sm' onClick={onClose} disabled={submitting}>
            {t('seriesReader.cancel')}
          </Button>
          <Button
            variant='primary'
            size='sm'
            leadingIcon={<Wrench aria-hidden='true' />}
            disabled={submitting || !selectedTaskId || !reason.trim()}
            loading={submitting}
            onClick={handleConfirm}
            data-testid='rework-modal-submit-btn'
          >
            {t('seriesReader.reworkModal.submitBtn')}
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        {errorMessage && (
          <Alert tone='danger' icon={<AlertCircle aria-hidden='true' />}>
            {errorMessage}
          </Alert>
        )}

        <div className='space-y-2'>
          <p className='text-xs font-semibold text-stone-700'>
            {t('seriesReader.reworkModal.selectTaskLabel')}
          </p>
          {candidateTasks.length === 0 ? (
            <p className='text-xs text-stone-500 italic'>
              {t('seriesReader.reworkModal.noTasksAvailable')}
            </p>
          ) : (
            <div className='space-y-1.5 max-h-60 overflow-y-auto pr-1'>
              {candidateTasks.map(({ task, stageName, isChapterLevel, eligible }) => {
                const assigneeLabel = task.assigneeUserId
                  ? memberNamesById[task.assigneeUserId] ||
                    t('seriesReader.reworkModal.assignedFallback')
                  : t('seriesReader.reworkModal.unassigned');
                const checked = selectedTaskId === task.id;
                return (
                  <label
                    key={task.id}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-xs transition-colors ${
                      !eligible
                        ? 'bg-stone-50 border-stone-200/70 text-stone-400 cursor-not-allowed opacity-70'
                        : checked
                          ? 'bg-orange-50/70 border-orange-400 text-stone-900 cursor-pointer'
                          : 'bg-white border-stone-200 hover:border-orange-300 text-stone-800 cursor-pointer'
                    }`}
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <input
                        type='radio'
                        name='rework-stage-task'
                        value={task.id}
                        disabled={!eligible}
                        checked={checked}
                        onChange={() => setSelectedTaskId(task.id)}
                        className='accent-orange-600'
                      />
                      <div className='min-w-0'>
                        <div className='font-semibold truncate'>
                          {stageName}
                          {isChapterLevel && (
                            <span className='ml-1.5 font-normal text-stone-500'>
                              ({t('seriesReader.reworkModal.chapterLevel')})
                            </span>
                          )}
                        </div>
                        <div className='text-xs text-stone-500 truncate'>{assigneeLabel}</div>
                      </div>
                    </div>
                    {renderStatusBadge(task)}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className='space-y-1.5'>
          <label
            htmlFor='rework-reason-input'
            className='block text-xs font-semibold text-stone-700'
          >
            {t('seriesReader.reworkModal.reasonLabel')}
          </label>
          <textarea
            id='rework-reason-input'
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (
                (e.ctrlKey || e.metaKey) &&
                e.key === 'Enter' &&
                selectedTaskId &&
                reason.trim()
              ) {
                e.preventDefault();
                void handleConfirm();
              }
            }}
            placeholder={t('seriesReader.reworkModal.reasonPlaceholder')}
            className='w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:outline-none'
          />
          <p className='text-xs text-stone-500'>{t('seriesReader.reworkModal.reasonHint')}</p>
        </div>
      </div>
    </Modal>
  );
};
