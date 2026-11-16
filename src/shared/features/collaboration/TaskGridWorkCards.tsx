import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  History,
  Loader2,
  Lock,
  Palette,
  PenTool,
  Play,
  RotateCcw,
  Send,
  Type,
  Unlock,
  Undo2,
  User,
} from 'lucide-react';
import {
  assignmentService,
  type MyTaskCellDto,
  type MyTaskLotDto,
  type StageTaskSubmissionDto,
  type TaskGridReviewItemDto,
} from '@/services/assignment.service';
import { parseStageTaskPanelLayout, resolveReworkDecisionComments } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { describeStartError, errorMessage } from './collaborationRules';

export interface MyTaskLotViewItem extends MyTaskLotDto {
  assigneeUserId?: string | null;
}

const CELL_STATUS_META: Record<string, { label: string; cls: string }> = {
  Unassigned: { label: 'Chưa giao', cls: 'bg-stone-100 text-stone-600 border-stone-300' },
  Assigned: { label: 'Đã giao', cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  InProgress: { label: 'Đang làm', cls: 'bg-amber-50 text-amber-900 border-amber-300' },
  Submitted: { label: 'Chờ duyệt', cls: 'bg-violet-50 text-violet-900 border-violet-300' },
  UnderReview: { label: 'Đang duyệt', cls: 'bg-indigo-50 text-indigo-900 border-indigo-300' },
  Approved: { label: 'Đã duyệt', cls: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  ReworkRequired: { label: 'Cần sửa lại', cls: 'bg-rose-50 text-rose-900 border-rose-300' },
};

const cellScopeLabel = (pageNumber?: number | null) =>
  pageNumber != null ? `Trang ${pageNumber}` : 'Toàn chương';

interface TaskLotWorkCardProps {
  workspaceId?: string;
  lot: MyTaskLotViewItem;
  isOwner: boolean;
  assigneeName?: string;
  highlightedId?: string | null;
  showSeriesHeader?: boolean;
  onChanged: () => void;
  onToast?: (title: string, desc: string) => void;
}

export const TaskLotWorkCard: React.FC<TaskLotWorkCardProps> = ({
  workspaceId,
  lot,
  isOwner,
  assigneeName,
  highlightedId,
  showSeriesHeader = false,
  onChanged,
  onToast,
}) => {
  const { t } = useTranslation('pipeline');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reworkComments, setReworkComments] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    resolveReworkDecisionComments(
      lot.chapterId,
      lot.tasks,
      typeof assignmentService.getStageTaskSubmissions === 'function'
        ? (cId, tId) => assignmentService.getStageTaskSubmissions(cId, tId)
        : undefined,
    ).then((map) => {
      if (alive) setReworkComments(map);
    });
    return () => {
      alive = false;
    };
  }, [lot.chapterId, lot.tasks]);

  const roleUpper = String(lot.assignedRole || '').toUpperCase();
  const inProgressCells = lot.tasks.filter((c) => c.status === 'InProgress' && !c.isInputOutdated);
  const approvedCount = lot.tasks.filter((c) => c.status === 'Approved').length;
  const isLotHighlighted =
    Boolean(highlightedId) &&
    (lot.id === highlightedId || lot.tasks.some((c) => c.id === highlightedId));

  const handleStartCell = async (cell: MyTaskCellDto) => {
    setBusyKey(`start:${cell.id}`);
    setError(null);
    try {
      await assignmentService.startStageTask(lot.chapterId, cell.id);
      onToast?.(
        cell.status === 'ReworkRequired' ? 'Đã bắt đầu sửa' : 'Đã bắt đầu làm',
        `${lot.stageName} · ${cellScopeLabel(cell.pageNumber)}`,
      );
      onChanged();
    } catch (err) {
      const { title, message } = describeStartError(err);
      setError(message);
      onToast?.(title, message);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSubmitCells = async (taskIds: string[], scopeDesc: string) => {
    if (taskIds.length === 0) return;
    setBusyKey(taskIds.length === 1 ? `submit:${taskIds[0]}` : 'submitAll');
    setError(null);
    try {
      await assignmentService.submitStageTasks(lot.chapterId, taskIds);
      onToast?.('Đã nộp bài lên Lưới V3', `${lot.stageName} · ${scopeDesc}`);
      onChanged();
    } catch (err: any) {
      const msg = errorMessage(err, 'Không thể nộp ô công việc.');
      setError(msg);
      onToast?.('Không thể nộp bài', msg);
      if (err?.status === 409 || err?.response?.status === 409) {
        onChanged();
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleWithdrawCell = async (cell: MyTaskCellDto) => {
    setBusyKey(`withdraw:${cell.id}`);
    setError(null);
    try {
      await assignmentService.withdrawStageTask(lot.chapterId, cell.id);
      onToast?.(
        t('taskGridV3.withdrawSuccessTitle', 'Đã rút bài'),
        `${lot.stageName} · ${cellScopeLabel(cell.pageNumber)}`,
      );
      onChanged();
    } catch (err: any) {
      const msg = errorMessage(err, 'Không thể rút bài đã nộp.');
      setError(msg);
      onToast?.(t('taskGridV3.withdrawErrorTitle', 'Không thể rút bài'), msg);
      if (err?.status === 409 || err?.response?.status === 409) {
        onChanged();
      }
    } finally {
      setBusyKey(null);
    }
  };

  const baseSeriesPath =
    workspaceId && lot.seriesId ? `/workspaces/${workspaceId}/series/${lot.seriesId}` : null;

  return (
    <article
      id={`assignment-${lot.id}`}
      data-testid={`task-lot-card-${lot.id}`}
      className={`rounded-2xl border bg-white p-4 space-y-3 shadow-xs transition-all ${
        isLotHighlighted
          ? 'border-[#F97316] ring-2 ring-[#F97316]/30 bg-[#FFFDF9]'
          : 'border-[#D8D2C5]'
      }`}
    >
      <div className='flex flex-wrap items-start justify-between gap-2.5'>
        <div className='space-y-1 min-w-0'>
          {showSeriesHeader && (
            <div className='inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#C2410C] bg-[#FFF2E6] px-2.5 py-0.5 rounded-md border border-[#F97316]/30'>
              <span>{lot.seriesTitle}</span>
              <span>·</span>
              <span>
                Chương {lot.chapterNumber}
                {lot.chapterTitle ? `: ${lot.chapterTitle}` : ''}
              </span>
            </div>
          )}
          <div className='flex flex-wrap items-center gap-2'>
            <span className='px-2.5 py-0.5 rounded-lg bg-[#1C1917] text-white text-xs font-bold'>
              {lot.stageOrder}. {lot.stageName}
            </span>
            <span className='px-2 py-0.5 rounded-md bg-[#F3F0E9] border border-[#D8D2C5] text-xs font-mono font-semibold text-[#1C1917]'>
              Đã duyệt {approvedCount}/{lot.tasks.length} ô
            </span>
            {lot.isOverdue && (
              <span className='px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold'>
                Quá hạn
              </span>
            )}
          </div>
          {lot.brief && <p className='text-sm font-semibold text-[#1C1917]'>{lot.brief}</p>}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {isOwner && inProgressCells.length > 0 && lot.tasks.length > 1 && (
            <button
              type='button'
              data-testid='submit-whole-lot-btn'
              disabled={busyKey !== null}
              onClick={() =>
                void handleSubmitCells(
                  inProgressCells.map((c) => c.id),
                  `${inProgressCells.length} ô đang làm`,
                )
              }
              className='inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50'
            >
              {busyKey === 'submitAll' || busyKey?.startsWith('submit:') ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Send className='w-3.5 h-3.5' />
              )}
              <span>
                {t('taskGridV3.submitWholeLotCount', {
                  count: inProgressCells.length,
                  defaultValue: `Nộp cả lô (${inProgressCells.length} ô)`,
                })}
              </span>
            </button>
          )}

          {isOwner && baseSeriesPath && roleUpper === 'WRITER' && (
            <Link
              to={`${baseSeriesPath}/script?chapterId=${encodeURIComponent(lot.chapterId)}`}
              className='h-8 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold inline-flex items-center gap-1.5'
            >
              <PenTool className='w-3.5 h-3.5 text-blue-600' />
              <span>Mở Script Editor</span>
            </Link>
          )}
          {isOwner && baseSeriesPath && roleUpper === 'ARTIST' && (
            <Link
              to={`${baseSeriesPath}/artist?chapterId=${encodeURIComponent(lot.chapterId)}&stageId=${encodeURIComponent(lot.pipelineStageId)}`}
              className='h-8 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold inline-flex items-center gap-1.5'
            >
              <Palette className='w-3.5 h-3.5 text-amber-600' />
              <span>Mở Bàn Vẽ</span>
            </Link>
          )}
          {isOwner && baseSeriesPath && roleUpper === 'LETTERER' && (
            <Link
              to={`${baseSeriesPath}/letterer?chapterId=${encodeURIComponent(lot.chapterId)}`}
              className='h-8 px-3 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-900 text-xs font-semibold inline-flex items-center gap-1.5'
            >
              <Type className='w-3.5 h-3.5 text-pink-600' />
              <span>Mở Lettering Canvas</span>
            </Link>
          )}
          {baseSeriesPath && (
            <Link
              to={`${baseSeriesPath}/workspace?chapterId=${encodeURIComponent(lot.chapterId)}&board=grid-v3`}
              className='h-8 px-3 rounded-xl border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] text-xs font-semibold inline-flex items-center gap-1'
            >
              <span>Mở Lưới V3</span>
              <ArrowUpRight className='w-3.5 h-3.5' />
            </Link>
          )}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-4 text-xs text-[#57534E] font-mono'>
        {assigneeName && (
          <span className='inline-flex items-center gap-1'>
            <User className='w-3.5 h-3.5 text-[#F97316]' />
            <strong>Người nhận:</strong> {assigneeName} ({lot.assignedRole})
          </span>
        )}
        {lot.dueDate && (
          <span className='inline-flex items-center gap-1'>
            <Calendar className='w-3.5 h-3.5 text-stone-400' />
            <strong>Hạn:</strong> {new Date(lot.dueDate).toLocaleDateString('vi-VN')}
          </span>
        )}
      </div>

      {error && (
        <div
          role='alert'
          className='p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2'
        >
          <AlertTriangle className='w-4 h-4 shrink-0 text-rose-600' />
          <span>{error}</span>
        </div>
      )}

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1'>
        {lot.tasks.map((cell) => {
          const meta = CELL_STATUS_META[cell.status] ?? {
            label: cell.status,
            cls: 'bg-stone-100 text-stone-700 border-stone-300',
          };
          const canStart =
            isOwner && (cell.status === 'Assigned' || cell.status === 'ReworkRequired');
          const canSubmit = isOwner && cell.status === 'InProgress';
          const canWithdraw = isOwner && cell.status === 'Submitted';
          const attemptCount = cell.attemptCount ?? 0;
          const isHighlighted = highlightedId === cell.id;
          const cellReworkComment =
            cell.status === 'ReworkRequired'
              ? cell.lastDecisionComment?.trim() || reworkComments[cell.id] || null
              : null;

          return (
            <div
              key={cell.id}
              id={`assignment-${cell.id}`}
              data-testid={`lot-cell-${cell.id}`}
              title={
                cellReworkComment
                  ? `${t('taskGridV3.lastDecisionLabel', 'Nhận xét lần duyệt gần nhất')}: ${cellReworkComment}`
                  : undefined
              }
              className={`rounded-xl border p-2.5 text-xs flex flex-col justify-between gap-2 ${
                isHighlighted
                  ? 'border-[#F97316] bg-[#FFF7ED] ring-2 ring-[#F97316]/30'
                  : 'border-stone-200 bg-[#FCFBF8]'
              }`}
            >
              <div className='space-y-1'>
                <div className='flex items-center justify-between gap-2 flex-wrap'>
                  <span className='font-bold text-[#1C1917]'>
                    {cellScopeLabel(cell.pageNumber)}
                  </span>
                  <div className='flex items-center gap-1'>
                    {attemptCount > 0 && (
                      <span
                        data-testid={`lot-cell-attempt-${cell.id}`}
                        className='px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-[10px] font-mono font-semibold text-stone-700'
                      >
                        {t('taskGridV3.attemptBadge', {
                          count: attemptCount,
                          defaultValue: `Lần nộp #${attemptCount}`,
                        })}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>

                {cellReworkComment && (
                  <div
                    data-testid={`lot-cell-rework-comment-${cell.id}`}
                    className='rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] text-rose-900'
                  >
                    💬{' '}
                    <span className='font-semibold'>
                      {t('taskGridV3.lastDecisionPrefix', 'Nhận xét gần nhất:')}
                    </span>{' '}
                    {cellReworkComment}
                  </div>
                )}

                {cell.isInputOutdated && (
                  <div className='rounded-lg bg-amber-50 border border-amber-300 px-2 py-1 text-[11px] text-amber-900'>
                    <span className='font-semibold'>Đầu vào lỗi thời:</span>{' '}
                    {cell.outdatedReason || 'Chờ Producer xử lý Impact Review'}
                  </div>
                )}

                {canStart && !cell.isStartable && (
                  <p className='text-[11px] text-stone-500 flex items-center gap-1'>
                    <Lock className='w-3 h-3 text-amber-600 shrink-0' />
                    <span>Chờ công đoạn tiền đề được duyệt</span>
                  </p>
                )}
              </div>

              {(canStart || canSubmit || canWithdraw) && (
                <div className='flex items-center gap-1.5 pt-1 flex-wrap'>
                  {canStart && (
                    <button
                      type='button'
                      data-testid={`start-lot-cell-${cell.id}`}
                      disabled={!cell.isStartable || busyKey !== null}
                      onClick={() => void handleStartCell(cell)}
                      className='inline-flex items-center gap-1 rounded-lg bg-[#1C1917] hover:bg-stone-800 text-white px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                    >
                      {busyKey === `start:${cell.id}` ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        <Play className='w-3 h-3 text-[#F97316]' />
                      )}
                      <span>{cell.status === 'ReworkRequired' ? 'Bắt đầu sửa' : 'Bắt đầu'}</span>
                    </button>
                  )}
                  {canSubmit && (
                    <button
                      type='button'
                      data-testid={`submit-lot-cell-${cell.id}`}
                      disabled={cell.isInputOutdated || busyKey !== null}
                      onClick={() =>
                        void handleSubmitCells([cell.id], cellScopeLabel(cell.pageNumber))
                      }
                      className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                    >
                      {busyKey === `submit:${cell.id}` ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        <Send className='w-3 h-3' />
                      )}
                      <span>Nộp</span>
                    </button>
                  )}
                  {canWithdraw && (
                    <button
                      type='button'
                      data-testid={`withdraw-lot-cell-${cell.id}`}
                      disabled={busyKey !== null}
                      onClick={() => void handleWithdrawCell(cell)}
                      className='inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                    >
                      {busyKey === `withdraw:${cell.id}` ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        <Undo2 className='w-3 h-3' />
                      )}
                      <span>{t('taskGridV3.withdrawBtn', 'Rút bài')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
};

interface TaskGridReviewCardProps {
  workspaceId?: string;
  item: TaskGridReviewItemDto;
  assigneeName: string;
  reviewerName?: string | null;
  currentUserId?: string | null;
  isProducer?: boolean;
  highlighted?: boolean;
  onChanged: () => void;
  onToast?: (title: string, desc: string) => void;
}

export const TaskGridReviewCard: React.FC<TaskGridReviewCardProps> = ({
  workspaceId,
  item,
  assigneeName,
  reviewerName,
  currentUserId,
  isProducer = false,
  highlighted = false,
  onChanged,
  onToast,
}) => {
  const { t } = useTranslation('pipeline');
  const [busy, setBusy] = useState<'approve' | 'reject' | 'release' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submissions, setSubmissions] = useState<StageTaskSubmissionDto[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelfSubmission = Boolean(currentUserId && item.assigneeUserId === currentUserId);
  const isLockedByOtherReviewer = Boolean(
    item.status === 'UnderReview' &&
      item.reviewerUserId &&
      (!currentUserId || item.reviewerUserId !== currentUserId),
  );
  const resolvedReviewerName =
    reviewerName || (item.reviewerUserId ? item.reviewerUserId.slice(0, 8) : 'Editor');
  const scope = cellScopeLabel(item.pageNumber);
  const meta = CELL_STATUS_META[item.status] ?? CELL_STATUS_META.Submitted;

  const handleApprove = async () => {
    setBusy('approve');
    setError(null);
    try {
      await assignmentService.approveStageTask(item.chapterId, item.taskId);
      onToast?.('Đã duyệt ô công việc', `${item.stageName} · ${scope}`);
      onChanged();
    } catch (err: any) {
      const msg = errorMessage(err, 'Không thể duyệt ô công việc.');
      setError(msg);
      onToast?.('Không thể duyệt', msg);
      if (err?.status === 409 || err?.response?.status === 409) onChanged();
    } finally {
      setBusy(null);
    }
  };

  const handleRequestChanges = async () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    setBusy('reject');
    setError(null);
    try {
      await assignmentService.requestStageTaskChanges(item.chapterId, item.taskId, trimmed);
      setRejectOpen(false);
      setComment('');
      onToast?.('Đã yêu cầu sửa lại', `${item.stageName} · ${scope}`);
      onChanged();
    } catch (err: any) {
      const msg = errorMessage(err, 'Không thể gửi yêu cầu sửa.');
      setError(msg);
      onToast?.('Không thể yêu cầu sửa', msg);
      if (err?.status === 409 || err?.response?.status === 409) onChanged();
    } finally {
      setBusy(null);
    }
  };

  const handleReleaseReview = async () => {
    setBusy('release');
    setError(null);
    try {
      await assignmentService.releaseStageTaskReview(item.chapterId, item.taskId);
      onToast?.(
        t('taskGridV3.releaseReviewSuccessTitle', 'Đã nhả khoá duyệt'),
        `${item.stageName} · ${scope}`,
      );
      onChanged();
    } catch (err: any) {
      const msg = errorMessage(err, 'Không thể nhả khoá duyệt ô công việc.');
      setError(msg);
      onToast?.('Không thể nhả khoá duyệt', msg);
      if (err?.status === 409 || err?.response?.status === 409) onChanged();
    } finally {
      setBusy(null);
    }
  };

  const toggleHistory = async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && submissions === null) {
      setLoadingHistory(true);
      try {
        const list = await assignmentService.getStageTaskSubmissions(item.chapterId, item.taskId);
        setSubmissions(list);
      } catch (err) {
        setError(errorMessage(err, 'Không thể tải lịch sử nộp.'));
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  return (
    <article
      id={`assignment-${item.taskId}`}
      data-testid={`grid-review-card-${item.taskId}`}
      className={`rounded-2xl border bg-white p-4 space-y-3 shadow-xs ${
        highlighted ? 'border-[#F97316] ring-2 ring-[#F97316]/30 bg-[#FFFDF9]' : 'border-[#D8D2C5]'
      }`}
    >
      <div className='flex flex-wrap items-start justify-between gap-2.5'>
        <div className='space-y-1'>
          <div className='inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#C2410C] bg-[#FFF2E6] px-2.5 py-0.5 rounded-md border border-[#F97316]/30'>
            <span>{item.seriesTitle}</span>
            <span>·</span>
            <span>
              Chương {item.chapterNumber}
              {item.chapterTitle ? `: ${item.chapterTitle}` : ''}
            </span>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='px-2.5 py-0.5 rounded-lg bg-[#1C1917] text-white text-xs font-bold'>
              {item.stageName}
            </span>
            <span className='px-2 py-0.5 rounded-md bg-stone-100 border border-stone-300 text-xs font-semibold text-stone-800'>
              {scope}
            </span>
            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${meta.cls}`}>
              {meta.label}
            </span>
            {item.attemptNumber != null && (
              <span className='text-xs font-mono text-[#57534E]'>
                Lần nộp #{item.attemptNumber}
              </span>
            )}
          </div>
        </div>

        {workspaceId && item.seriesId && (
          <Link
            to={`/workspaces/${workspaceId}/series/${item.seriesId}/workspace?chapterId=${encodeURIComponent(item.chapterId)}&board=grid-v3`}
            className='h-8 px-3 rounded-xl border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] text-xs font-semibold inline-flex items-center gap-1'
          >
            <span>Xem &amp; đối chiếu trên Lưới V3</span>
            <ArrowUpRight className='w-3.5 h-3.5' />
          </Link>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-4 text-xs text-[#57534E] font-mono'>
        <span className='inline-flex items-center gap-1'>
          <User className='w-3.5 h-3.5 text-[#F97316]' />
          <strong>Người nộp:</strong> {assigneeName}
        </span>
        {item.submittedAt && (
          <span className='inline-flex items-center gap-1'>
            <Calendar className='w-3.5 h-3.5 text-stone-400' />
            <strong>Nộp lúc:</strong> {new Date(item.submittedAt).toLocaleString('vi-VN')}
          </span>
        )}
      </div>

      {error && (
        <div
          role='alert'
          className='p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2'
        >
          <AlertTriangle className='w-4 h-4 shrink-0 text-rose-600' />
          <span>{error}</span>
        </div>
      )}

      {isLockedByOtherReviewer && (
        <div
          data-testid={`locked-by-reviewer-${item.taskId}`}
          className='p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between gap-2 flex-wrap'
        >
          <span className='inline-flex items-center gap-1.5 font-semibold'>
            <Lock className='w-3.5 h-3.5 text-indigo-600 shrink-0' />
            <span>
              {t('taskGridV3.underReviewBy', {
                name: resolvedReviewerName,
                defaultValue: `Đang được duyệt bởi ${resolvedReviewerName}`,
              })}
            </span>
          </span>
          {isProducer && (
            <button
              type='button'
              data-testid={`force-release-review-${item.taskId}`}
              disabled={busy !== null}
              onClick={() => void handleReleaseReview()}
              className='inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white hover:bg-indigo-100 text-indigo-900 px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:opacity-50'
            >
              {busy === 'release' ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Unlock className='w-3 h-3' />
              )}
              <span>{t('taskGridV3.forceReleaseReviewBtn', 'Gỡ khoá duyệt')}</span>
            </button>
          )}
        </div>
      )}

      <div className='flex flex-wrap items-center gap-2 pt-1'>
        {isSelfSubmission ? (
          <span
            data-testid={`self-review-locked-${item.taskId}`}
            className='inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900'
          >
            <Lock className='w-3.5 h-3.5 text-amber-600' />
            <span>Không thể tự duyệt bài của mình (BR-06)</span>
          </span>
        ) : (
          <>
            <button
              type='button'
              data-testid={`approve-grid-task-${item.taskId}`}
              disabled={busy !== null || isLockedByOtherReviewer}
              onClick={() => void handleApprove()}
              className='inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {busy === 'approve' ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Check className='w-3.5 h-3.5' />
              )}
              <span>Duyệt</span>
            </button>
            <button
              type='button'
              data-testid={`reject-grid-task-toggle-${item.taskId}`}
              disabled={busy !== null || isLockedByOtherReviewer}
              onClick={() => setRejectOpen((v) => !v)}
              className='inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3.5 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <RotateCcw className='w-3.5 h-3.5' />
              <span>Yêu cầu sửa</span>
            </button>
            {item.status === 'UnderReview' &&
              Boolean(currentUserId && item.reviewerUserId === currentUserId) && (
                <button
                  type='button'
                  data-testid={`release-own-review-${item.taskId}`}
                  disabled={busy !== null}
                  onClick={() => void handleReleaseReview()}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50'
                >
                  {busy === 'release' ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Unlock className='w-3.5 h-3.5' />
                  )}
                  <span>{t('taskGridV3.releaseReviewBtn', 'Nhả khoá duyệt')}</span>
                </button>
              )}
            {isProducer &&
              item.status === 'UnderReview' &&
              item.reviewerUserId &&
              !isLockedByOtherReviewer &&
              item.reviewerUserId !== currentUserId && (
                <button
                  type='button'
                  data-testid={`force-release-review-${item.taskId}`}
                  disabled={busy !== null}
                  onClick={() => void handleReleaseReview()}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-100 text-indigo-900 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50'
                >
                  <Unlock className='w-3.5 h-3.5' />
                  <span>{t('taskGridV3.forceReleaseReviewBtn', 'Gỡ khoá duyệt')}</span>
                </button>
              )}
          </>
        )}

        <button
          type='button'
          onClick={() => void toggleHistory()}
          className='inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-3 py-1.5 text-xs font-semibold cursor-pointer'
        >
          <History className='w-3.5 h-3.5' />
          <span>Lịch sử nộp</span>
        </button>
      </div>

      {rejectOpen && !isSelfSubmission && (
        <div className='rounded-xl border border-rose-200 bg-rose-50/70 p-3 space-y-2'>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder='Nhập nhận xét yêu cầu sửa bắt buộc (BR-06)...'
            aria-label='Nhận xét yêu cầu sửa'
            className='w-full rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs text-stone-900'
          />
          <div className='flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={() => {
                setRejectOpen(false);
                setComment('');
              }}
              className='px-2.5 py-1 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 cursor-pointer'
            >
              Huỷ
            </button>
            <button
              type='button'
              data-testid={`confirm-reject-grid-task-${item.taskId}`}
              disabled={busy !== null || !comment.trim()}
              onClick={() => void handleRequestChanges()}
              className='inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs font-semibold cursor-pointer disabled:opacity-50'
            >
              {busy === 'reject' && <Loader2 className='w-3 h-3 animate-spin' />}
              <span>Gửi yêu cầu sửa</span>
            </button>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className='rounded-xl border border-stone-200 bg-[#FCFBF8] p-3 space-y-1.5 text-xs'>
          {loadingHistory ? (
            <div className='flex items-center gap-1.5 text-stone-500'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              <span>Đang tải lịch sử nộp...</span>
            </div>
          ) : !submissions || submissions.length === 0 ? (
            <p className='text-stone-500'>Chưa có bản ghi lịch sử nộp.</p>
          ) : (
            submissions.map((sub) => {
              const panelCount = parseStageTaskPanelLayout(sub.panelLayoutJson).length;
              return (
                <div
                  key={sub.id}
                  className='rounded-lg border border-stone-200 bg-white p-2 space-y-0.5'
                >
                  <div className='flex items-center justify-between gap-2 font-semibold'>
                    <span>
                      Lần #{sub.attemptNumber} · {sub.status}
                    </span>
                    <span className='text-[11px] font-mono text-stone-500'>
                      {sub.artworkReferenceIds?.length ?? 0} ảnh
                      {panelCount > 0 ? ` · ${panelCount} panel` : ''}
                    </span>
                  </div>
                  {sub.decisionComment && (
                    <p className='text-stone-700 italic'>&ldquo;{sub.decisionComment}&rdquo;</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </article>
  );
};
