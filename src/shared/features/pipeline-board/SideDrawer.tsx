import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Clock,
  User,
  Layers,
  FileText,
  AlertCircle,
  History,
  ArrowUpRight,
  Loader2,
  Lock,
  Trash2,
  ImageIcon,
  CheckCircle2,
  Network,
  ExternalLink,
  Play,
  Send,
  RotateCcw,
  UserMinus,
  XCircle,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { BoardCard, BoardLotCellItem } from './pipelineBoard.types';
import {
  assignmentService,
  SubmissionDto,
  ChangeRequestDto,
  AssignmentDto,
} from '@/services/assignment.service';
import { StatusBadge, StageLabel } from './ProductionTaskCard';
import { useTaskThumbnail } from './useTaskThumbnail';
import { DependencyGraphModal } from './DependencyGraphModal';
import { Modal } from '@/shared/ui';
import { pickLatestDecisionComment, resolveReworkReasonDisplay } from '@/types';
import { useTranslation } from '@/lib/i18n';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card: BoardCard | null;
  chapterCards?: BoardCard[];
  currentUserId?: string | null;
  currentUserRole?: string | null;
  onShowToast?: (title: string, desc: string) => void;
  onDeleted?: (cardId: string) => void;
  onImpactResolved?: (card: BoardCard) => void;
  onGridUpdated?: () => Promise<void> | void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  card,
  chapterCards = [],
  currentUserId,
  currentUserRole,
  onShowToast,
  onDeleted,
  onImpactResolved,
  onGridUpdated,
}) => {
  const { t } = useTranslation('pipeline');
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();

  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [latestCommentByCellId, setLatestCommentByCellId] = useState<Record<string, string>>({});
  const [lotSubmitError, setLotSubmitError] = useState<string | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [chapterAssignments, setChapterAssignments] = useState<AssignmentDto[]>([]);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [impactDecision, setImpactDecision] = useState<'Keep' | 'Rework' | null>(null);
  const [impactReason, setImpactReason] = useState('');
  const [isResolvingImpact, setIsResolvingImpact] = useState(false);

  // State thao tác từng ô trong Lô (Lưới V3)
  const [cellActionLoading, setCellActionLoading] = useState<string | null>(null);
  const [requestChangesCellId, setRequestChangesCellId] = useState<string | null>(null);
  const [requestChangesText, setRequestChangesText] = useState('');
  const [reopenCellId, setReopenCellId] = useState<string | null>(null);
  const [reopenReasonText, setReopenReasonText] = useState('');

  // Artwork thumbnail
  const thumbnail = useTaskThumbnail(card);

  useEffect(() => {
    setLotSubmitError(null);
    setLatestCommentByCellId({});
  }, [isOpen, card?.id]);

  useEffect(() => {
    setConfirmDelete(false);
    setCancelReason('');
    setIsDeleting(false);
    setImpactDecision(null);
    setImpactReason('');
    setIsResolvingImpact(false);
    setCellActionLoading(null);
    setRequestChangesCellId(null);
    setRequestChangesText('');
    setReopenCellId(null);
    setReopenReasonText('');
    if (!isOpen || !card) return;

    let isMounted = true;
    setLoadingData(true);

    if (card.isGridTask) {
      const targetCellIds =
        card.lotTasks && card.lotTasks.length > 0
          ? card.lotTasks
              .filter((c) => c.status !== 'Assigned' && c.status !== 'Unassigned')
              .map((c) => c.id)
          : [card.id];
      Promise.all(
        typeof assignmentService.getStageTaskSubmissions === 'function'
          ? targetCellIds.map((cellId) =>
              assignmentService.getStageTaskSubmissions(card.chapterId, cellId).catch(() => []),
            )
          : [],
      )
        .then((lists) => {
          if (!isMounted) return;
          const perCellComments: Record<string, string> = {};
          targetCellIds.forEach((cellId, idx) => {
            const comment = pickLatestDecisionComment(lists[idx]);
            if (comment) perCellComments[cellId] = comment;
          });
          setLatestCommentByCellId(perCellComments);
          const merged = lists
            .flat()
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          setSubmissions(
            merged.map((s) => ({
              id: s.id,
              assignmentId: card.id,
              chapterId: card.chapterId,
              submittedByUserId: s.submittedByUserId,
              attemptNumber: s.attemptNumber,
              status: s.status as SubmissionDto['status'],
              submittedAt: s.submittedAt,
              decidedByUserId: s.decidedByUserId ?? undefined,
              decidedAt: s.decidedAt ?? undefined,
              decisionComment: s.decisionComment ?? undefined,
            })),
          );
          setChangeRequests([]);
          setChapterAssignments([]);
        })
        .finally(() => {
          if (isMounted) setLoadingData(false);
        });
    } else {
      Promise.all([
        assignmentService.getSubmissions(card.chapterId, card.id).catch(() => []),
        assignmentService
          .getChangeRequests(card.chapterId, { assignmentId: card.id })
          .catch(() => []),
        card.chapterId && typeof assignmentService.getAssignments === 'function'
          ? assignmentService.getAssignments(card.chapterId).catch(() => [])
          : Promise.resolve([]),
      ])
        .then(([subList, crList, assignList]) => {
          if (!isMounted) return;
          setSubmissions(subList);
          setChangeRequests(crList);
          setChapterAssignments(assignList);
        })
        .finally(() => {
          if (isMounted) setLoadingData(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, card]);

  if (!isOpen || !card || typeof document === 'undefined') return null;

  const handleOpenMyWork = () => {
    if (workspaceId && seriesId) {
      const targetTaskId = card.lotTasks?.[0]?.id ?? card.id;
      const targetQuery = card.isGridTask
        ? `chapterId=${card.chapterId}&taskId=${targetTaskId}`
        : `chapterId=${card.chapterId}&assignmentId=${card.id}`;
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/my-work?${targetQuery}`);
      onClose();
    } else {
      onShowToast?.('Không tìm thấy thông tin Series', 'Vui lòng kiểm tra lại đường dẫn');
    }
  };

  const isAssignee = !!currentUserId && !!card && card.assigneeUserId === currentUserId;
  const normalizedRole = currentUserRole ? currentUserRole.toString().trim().toUpperCase() : '';
  const isProducerRole = normalizedRole === 'PRODUCER';
  const isReviewerRole = isProducerRole || normalizedRole === 'EDITOR';
  const hasGridCellList = Boolean(card.isGridTask && card.lotTasks && card.lotTasks.length > 0);
  const unassignableGridCellIds = hasGridCellList
    ? (card.lotTasks ?? [])
        .filter(
          (c) =>
            c.status === 'Assigned' || c.status === 'InProgress' || c.status === 'ReworkRequired',
        )
        .map((c) => c.id)
    : card.isGridTask && ['Assigned', 'InProgress', 'ReworkRequired'].includes(String(card.status))
      ? [card.id]
      : [];
  const canResolveImpact = card.isGridTask
    ? !isAssignee && isProducerRole
    : !isAssignee && (!normalizedRole || isProducerRole || normalizedRole === 'EDITOR');
  const submittableLotCells =
    card.isGridLot && card.isStageEnabled !== false && isAssignee
      ? (card.lotTasks ?? []).filter((c) => c.status === 'InProgress' && !c.isInputOutdated)
      : [];

  const handleSubmitWholeLot = async () => {
    if (submittableLotCells.length === 0) return;
    setCellActionLoading('submitWholeLot');
    setLotSubmitError(null);
    try {
      const taskIds = submittableLotCells.map((c) => c.id);
      await assignmentService.submitStageTasks(card.chapterId, taskIds);
      onShowToast?.(
        t('taskGridV3.submitWholeLotSuccessTitle', 'Đã nộp cả lô'),
        `${card.stageName} – ${taskIds.length} ô`,
      );
      await onGridUpdated?.();
    } catch (err: any) {
      const msg = err?.message || 'Không thể nộp cả lô công việc.';
      setLotSubmitError(msg);
      onShowToast?.(t('taskGridV3.submitWholeLotErrorTitle', 'Không thể nộp lô'), msg);
      if (err?.status === 409) {
        await onGridUpdated?.();
      }
    } finally {
      setCellActionLoading(null);
    }
  };

  const runCellAction = async (
    loadingKey: string,
    fn: () => Promise<void>,
    successTitle: string,
    successDesc: string,
  ) => {
    setCellActionLoading(loadingKey);
    if (loadingKey.startsWith('submit:')) setLotSubmitError(null);
    try {
      await fn();
      onShowToast?.(successTitle, successDesc);
      await onGridUpdated?.();
    } catch (err: any) {
      const msg = err?.message || 'Không thể thực hiện thao tác trên ô.';
      if (loadingKey.startsWith('submit:')) setLotSubmitError(msg);
      onShowToast?.('Thao tác thất bại', msg);
      if (err?.status === 409) {
        await onGridUpdated?.();
      }
    } finally {
      setCellActionLoading(null);
    }
  };

  const renderGridCellRow = (cell: BoardLotCellItem) => {
    const cellAssigneeId = cell.assigneeUserId || card.assigneeUserId;
    const isCellMine = Boolean(currentUserId && cellAssigneeId === currentUserId);
    const isStageEnabled = card.isStageEnabled !== false;
    const reworkDisplay = resolveReworkReasonDisplay(cell, latestCommentByCellId[cell.id]);
    const reworkTooltip = reworkDisplay
      ? reworkDisplay.kind === 'reopen'
        ? `${t('taskGridV3.reopenReasonPrefix', 'Producer mở lại:')} ${reworkDisplay.text}`
        : `${t('taskGridV3.lastDecisionLabel', 'Nhận xét lần duyệt gần nhất')}: ${reworkDisplay.text}`
      : undefined;

    const canStartCell =
      isStageEnabled &&
      isCellMine &&
      (cell.status === 'Assigned' || cell.status === 'ReworkRequired');
    const canSubmitCell = isStageEnabled && isCellMine && cell.status === 'InProgress';
    const canWithdrawCell = isStageEnabled && isCellMine && cell.status === 'Submitted';
    const canReviewCell =
      isStageEnabled &&
      isReviewerRole &&
      (cell.status === 'Submitted' || cell.status === 'UnderReview') &&
      Boolean(!cellAssigneeId || (currentUserId && cellAssigneeId !== currentUserId));
    const canUnassignCell =
      isProducerRole &&
      (cell.status === 'Assigned' ||
        cell.status === 'InProgress' ||
        cell.status === 'ReworkRequired');
    const canReopenCell =
      isStageEnabled && isProducerRole && cell.status === 'Approved' && !cell.isInputOutdated;
    const canResolveCellImpact = isStageEnabled && isProducerRole && cell.isInputOutdated;

    return (
      <div
        key={cell.id}
        data-testid={`lot-cell-row-${cell.id}`}
        title={reworkTooltip}
        className='rounded-xl border border-landing-border bg-[#FCFBF8] p-3 space-y-2'
      >
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <span className='font-mono text-xs font-bold text-landing-ink'>{cell.targetLabel}</span>
            <StatusBadge
              status={
                cell.status === 'Assigned' && !cell.isStartable ? 'Blocked' : (cell.status as any)
              }
            />
          </div>

          <div className='flex flex-wrap items-center gap-1.5'>
            {canStartCell && (
              <button
                type='button'
                disabled={!cell.isStartable || cellActionLoading === `start:${cell.id}`}
                onClick={() =>
                  void runCellAction(
                    `start:${cell.id}`,
                    async () => {
                      await assignmentService.startStageTask(card.chapterId, cell.id);
                    },
                    'Đã bắt đầu ô việc',
                    `${card.stageName} – ${cell.targetLabel}`,
                  )
                }
                className='inline-flex items-center gap-1 rounded-lg bg-[#171717] hover:bg-black text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                {cellActionLoading === `start:${cell.id}` ? (
                  <Loader2 className='w-3 h-3 animate-spin' />
                ) : (
                  <Play className='w-3 h-3 text-[#F97316]' />
                )}
                <span>{cell.isStartable ? 'Bắt đầu' : 'Chờ tiền đề'}</span>
              </button>
            )}

            {canSubmitCell && (
              <button
                type='button'
                disabled={cell.isInputOutdated || cellActionLoading === `submit:${cell.id}`}
                onClick={() =>
                  void runCellAction(
                    `submit:${cell.id}`,
                    async () => {
                      await assignmentService.submitStageTasks(card.chapterId, [cell.id]);
                    },
                    'Đã nộp ô việc',
                    `${card.stageName} – ${cell.targetLabel}`,
                  )
                }
                className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                {cellActionLoading === `submit:${cell.id}` ? (
                  <Loader2 className='w-3 h-3 animate-spin' />
                ) : (
                  <Send className='w-3 h-3' />
                )}
                <span>Nộp</span>
              </button>
            )}

            {canWithdrawCell && (
              <button
                type='button'
                data-testid={`side-drawer-withdraw-${cell.id}`}
                disabled={cellActionLoading === `withdraw:${cell.id}`}
                onClick={() =>
                  void runCellAction(
                    `withdraw:${cell.id}`,
                    async () => {
                      await assignmentService.withdrawStageTask(card.chapterId, cell.id);
                    },
                    t('taskGridV3.withdrawSuccessTitle', 'Đã rút bài'),
                    `${card.stageName} – ${cell.targetLabel}`,
                  )
                }
                className='inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 text-xs font-semibold disabled:opacity-50 cursor-pointer'
              >
                {cellActionLoading === `withdraw:${cell.id}` ? (
                  <Loader2 className='w-3 h-3 animate-spin' />
                ) : (
                  <RotateCcw className='w-3 h-3' />
                )}
                <span>{t('taskGridV3.withdrawBtn', 'Rút bài')}</span>
              </button>
            )}

            {canReviewCell && (
              <>
                <button
                  type='button'
                  disabled={cell.isInputOutdated || cellActionLoading === `approve:${cell.id}`}
                  onClick={() =>
                    void runCellAction(
                      `approve:${cell.id}`,
                      async () => {
                        await assignmentService.approveStageTask(card.chapterId, cell.id);
                      },
                      'Đã duyệt ô việc',
                      `${card.stageName} – ${cell.targetLabel}`,
                    )
                  }
                  className='inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                >
                  {cellActionLoading === `approve:${cell.id}` ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <CheckCircle2 className='w-3 h-3' />
                  )}
                  <span>Duyệt</span>
                </button>

                {requestChangesCellId !== cell.id && (
                  <button
                    type='button'
                    onClick={() => {
                      setRequestChangesCellId(cell.id);
                      setRequestChangesText('');
                    }}
                    className='inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-2.5 py-1 text-xs font-semibold cursor-pointer'
                  >
                    <XCircle className='w-3 h-3' />
                    <span>Yêu cầu sửa</span>
                  </button>
                )}
              </>
            )}

            {canReopenCell && reopenCellId !== cell.id && (
              <button
                type='button'
                onClick={() => {
                  setReopenCellId(cell.id);
                  setReopenReasonText('');
                }}
                className='inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 text-xs font-semibold cursor-pointer'
              >
                <RotateCcw className='w-3 h-3' />
                <span>Mở lại</span>
              </button>
            )}

            {canUnassignCell && (
              <button
                type='button'
                disabled={cellActionLoading === `unassign:${cell.id}`}
                onClick={() =>
                  void runCellAction(
                    `unassign:${cell.id}`,
                    async () => {
                      await assignmentService.unassignStageTasks(card.chapterId, [cell.id]);
                    },
                    'Đã bỏ gán ô',
                    `${card.stageName} – ${cell.targetLabel}`,
                  )
                }
                className='inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 px-2.5 py-1 text-xs font-semibold disabled:opacity-50 cursor-pointer'
              >
                {cellActionLoading === `unassign:${cell.id}` ? (
                  <Loader2 className='w-3 h-3 animate-spin' />
                ) : (
                  <UserMinus className='w-3 h-3' />
                )}
                <span>Bỏ gán</span>
              </button>
            )}
          </div>
        </div>

        {reworkDisplay && (
          <div
            data-testid={
              reworkDisplay.kind === 'reopen'
                ? `cell-reopen-reason-${cell.id}`
                : `cell-last-decision-comment-${cell.id}`
            }
            className='rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-xs text-rose-900'
          >
            {reworkDisplay.kind === 'reopen' ? (
              <>
                🔄{' '}
                <span className='font-semibold'>
                  {t('taskGridV3.reopenReasonPrefix', 'Producer mở lại:')}
                </span>{' '}
                {reworkDisplay.text}
              </>
            ) : (
              <>
                💬{' '}
                <span className='font-semibold'>
                  {t('taskGridV3.lastDecisionLabel', 'Nhận xét lần duyệt gần nhất')}:
                </span>{' '}
                {reworkDisplay.text}
              </>
            )}
          </div>
        )}

        {cell.isInputOutdated && (
          <div className='rounded-lg border border-amber-300 bg-amber-50/80 p-2 text-xs text-amber-950 space-y-1.5'>
            <div className='flex items-center gap-1.5 font-semibold text-amber-900'>
              <AlertTriangle className='w-3.5 h-3.5 shrink-0 text-amber-700' />
              <span>
                Đầu vào lỗi thời
                {cell.outdatedReason ? `: ${cell.outdatedReason}` : ''}
              </span>
            </div>
            {canResolveCellImpact && (
              <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
                <button
                  type='button'
                  disabled={
                    !cell.prerequisitesApproved || cellActionLoading === `impact:${cell.id}:keep`
                  }
                  onClick={() =>
                    void runCellAction(
                      `impact:${cell.id}:keep`,
                      async () => {
                        await assignmentService.resolveStageTaskImpact(
                          card.chapterId,
                          cell.id,
                          true,
                        );
                      },
                      'Đã giữ kết quả',
                      `${card.stageName} – ${cell.targetLabel}`,
                    )
                  }
                  className='inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                >
                  <Check className='w-3 h-3' />
                  <span>Giữ kết quả</span>
                </button>
                <button
                  type='button'
                  disabled={
                    !cell.prerequisitesApproved || cellActionLoading === `impact:${cell.id}:rework`
                  }
                  onClick={() =>
                    void runCellAction(
                      `impact:${cell.id}:rework`,
                      async () => {
                        await assignmentService.resolveStageTaskImpact(
                          card.chapterId,
                          cell.id,
                          false,
                        );
                      },
                      'Đã yêu cầu làm lại',
                      `${card.stageName} – ${cell.targetLabel}`,
                    )
                  }
                  className='inline-flex items-center gap-1 rounded bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                >
                  <RotateCcw className='w-3 h-3' />
                  <span>Làm lại</span>
                </button>
                {!cell.prerequisitesApproved && (
                  <span className='text-[11px] text-amber-800 italic'>
                    (Chờ tiền đề được duyệt lại)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {requestChangesCellId === cell.id && (
          <div className='rounded-lg border border-rose-300 bg-rose-50 p-2.5 space-y-2'>
            <textarea
              rows={2}
              value={requestChangesText}
              onChange={(e) => setRequestChangesText(e.target.value)}
              placeholder='Nhập nhận xét yêu cầu sửa (bắt buộc)...'
              aria-label='Nhận xét yêu cầu sửa'
              className='block w-full min-w-0 box-border resize-y rounded border border-rose-300 bg-white px-2.5 py-1.5 text-xs text-stone-900'
            />
            <div className='flex flex-wrap items-center justify-end gap-1.5'>
              <button
                type='button'
                onClick={() => {
                  setRequestChangesCellId(null);
                  setRequestChangesText('');
                }}
                className='rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 cursor-pointer'
              >
                Huỷ
              </button>
              <button
                type='button'
                disabled={
                  !requestChangesText.trim() || cellActionLoading === `requestChanges:${cell.id}`
                }
                onClick={() =>
                  void runCellAction(
                    `requestChanges:${cell.id}`,
                    async () => {
                      await assignmentService.requestStageTaskChanges(
                        card.chapterId,
                        cell.id,
                        requestChangesText.trim(),
                      );
                      setRequestChangesCellId(null);
                      setRequestChangesText('');
                    },
                    'Đã gửi yêu cầu sửa',
                    `${card.stageName} – ${cell.targetLabel}`,
                  )
                }
                className='rounded bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-50 cursor-pointer'
              >
                {cellActionLoading === `requestChanges:${cell.id}`
                  ? 'Đang gửi...'
                  : 'Xác nhận trả về'}
              </button>
            </div>
          </div>
        )}

        {reopenCellId === cell.id && (
          <div className='rounded-lg border border-amber-300 bg-amber-50 p-2.5 space-y-2'>
            <textarea
              rows={2}
              value={reopenReasonText}
              onChange={(e) => setReopenReasonText(e.target.value)}
              placeholder='Nhập lý do mở lại (bắt buộc)...'
              aria-label='Lý do mở lại'
              className='block w-full min-w-0 box-border resize-y rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-stone-900'
            />
            <div className='flex flex-wrap items-center justify-end gap-1.5'>
              <button
                type='button'
                onClick={() => {
                  setReopenCellId(null);
                  setReopenReasonText('');
                }}
                className='rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 cursor-pointer'
              >
                Huỷ
              </button>
              <button
                type='button'
                disabled={!reopenReasonText.trim() || cellActionLoading === `reopen:${cell.id}`}
                onClick={() =>
                  void runCellAction(
                    `reopen:${cell.id}`,
                    async () => {
                      await assignmentService.reopenStageTask(
                        card.chapterId,
                        cell.id,
                        reopenReasonText.trim(),
                      );
                      setReopenCellId(null);
                      setReopenReasonText('');
                    },
                    'Đã mở lại ô việc',
                    `${card.stageName} – ${cell.targetLabel}`,
                  )
                }
                className='rounded bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-50 cursor-pointer'
              >
                {cellActionLoading === `reopen:${cell.id}` ? 'Đang mở...' : 'Xác nhận mở lại'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleResolveImpact = async () => {
    if (!card || !impactDecision) return;
    if (!card.isGridTask && !impactReason.trim()) return;
    setIsResolvingImpact(true);
    try {
      if (card.isGridTask) {
        await assignmentService.resolveStageTaskImpact(
          card.chapterId,
          card.id,
          impactDecision === 'Keep',
        );
      } else {
        await assignmentService.resolveImpactReview(card.chapterId, card.id, {
          decision: impactDecision,
          reason: impactReason.trim(),
        });
      }
      onShowToast?.(
        impactDecision === 'Keep' ? 'Đã giữ kết quả' : 'Đã yêu cầu làm lại',
        `Đã giải quyết yêu cầu kiểm tra ảnh hưởng cho nhiệm vụ "${card.brief}".`,
      );
      const updatedCard: BoardCard = {
        ...card,
        impactReviewReason: null,
        status: impactDecision === 'Rework' ? ('ReworkRequired' as const) : card.status,
      };
      setImpactDecision(null);
      setImpactReason('');
      onImpactResolved?.(updatedCard);
    } catch (err: any) {
      onShowToast?.(
        'Không thể xử lý ảnh hưởng',
        err.message || 'Thao tác giải quyết ảnh hưởng thất bại.',
      );
    } finally {
      setIsResolvingImpact(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!card) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!card.isGridTask && !cancelReason.trim()) return;

    setIsDeleting(true);
    try {
      if (card.isGridTask) {
        const idsToUnassign =
          unassignableGridCellIds.length > 0 ? unassignableGridCellIds : [card.id];
        await assignmentService.unassignStageTasks(card.chapterId, idsToUnassign);
        onShowToast?.(
          card.isGridLot ? 'Đã bỏ gán lô' : 'Đã bỏ gán ô',
          `Đã đưa ${idsToUnassign.length} ô của "${card.brief}" về trạng thái chưa gán.`,
        );
        await onGridUpdated?.();
      } else {
        await assignmentService.deleteAssignment(card.chapterId, card.id, cancelReason.trim());
        onShowToast?.('Đã huỷ nhiệm vụ', `Nhiệm vụ "${card.brief}" đã được gỡ khỏi chương.`);
        onDeleted?.(card.id);
      }
      onClose();
    } catch (err: any) {
      onShowToast?.(
        card.isGridTask ? 'Lỗi khi bỏ gán ô' : 'Lỗi khi huỷ nhiệm vụ',
        err.message || 'Không thể thực hiện thao tác này',
      );
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const modalContent = (
    <Modal
      isOpen={Boolean(card)}
      onClose={onClose}
      closeLabel='Đóng hộp thoại'
      size='lg'
      title={`Chi tiết công việc: ${card.brief}`}
    >
      {/* 2. Hộp Modal chi tiết căn giữa viewport, an toàn trước overflow của mọi container cha */}
      <div className='relative z-10 w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[88vh] bg-[#FCFBF8] border border-landing-border rounded-2xl shadow-2xl flex flex-col font-sans text-landing-ink overflow-hidden outline-none animate-in fade-in zoom-in-95 duration-150'>
        {/* Header cố định: Phân định đối tượng, công đoạn, trạng thái và nút X */}
        <div className='flex items-start justify-between p-4 sm:p-5 border-b border-landing-border bg-[#F3F0E9]/80 shrink-0'>
          <div className='space-y-2 pr-3 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <StageLabel card={card} />
              <span className='text-xs font-mono font-semibold px-2 py-0.5 rounded bg-stone-200 text-stone-800 border border-stone-300 shadow-2xs'>
                {card.targetLabel}
              </span>
              <StatusBadge status={card.status} />
              {card.impactReviewReason && (
                <span
                  data-testid='side-drawer-impact-badge'
                  className='inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 shadow-2xs'
                >
                  <AlertCircle className='h-3.5 w-3.5 shrink-0 text-amber-600' />
                  Cần kiểm tra ảnh hưởng
                </span>
              )}
            </div>
            <h2 className='text-base sm:text-lg font-bold text-landing-ink leading-snug break-words'>
              {card.brief}
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng chi tiết'
            title='Đóng chi tiết (Esc)'
            className='w-9 h-9 flex items-center justify-center rounded-lg border border-landing-border bg-[#FCFBF8] hover:bg-stone-200 text-landing-ink-muted hover:text-landing-ink transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
          >
            <X className='w-4 h-4' aria-hidden='true' />
          </button>
        </div>

        {/* Thân Modal cuộn được, phân chia các nhóm thông tin rõ ràng */}
        <div className='flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar'>
          {/* Danh sách ô công việc trong Lô / Ô cấp Chương (Lưới V3) kèm nút theo đúng quyền */}
          {hasGridCellList && (
            <section
              aria-label='Danh sách ô công việc'
              data-testid='side-drawer-lot-cells'
              className='space-y-2.5'
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-xs font-bold uppercase tracking-wider text-landing-ink flex items-center gap-1.5'>
                  <Layers className='w-3.5 h-3.5 text-[#C2410C]' aria-hidden='true' />
                  <span>
                    {card.isGridLot
                      ? `Danh sách ô trong lô (${card.lotApprovedCount ?? 0}/${card.lotTasks?.length ?? 0} đã duyệt)`
                      : 'Ô công việc cấp Chương'}
                  </span>
                </h3>
                {submittableLotCells.length > 0 && (
                  <button
                    type='button'
                    data-testid='submit-whole-lot-btn'
                    disabled={cellActionLoading !== null}
                    onClick={() => void handleSubmitWholeLot()}
                    className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50'
                  >
                    {cellActionLoading === 'submitWholeLot' ? (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <Send className='w-3.5 h-3.5' />
                    )}
                    <span>
                      {t('taskGridV3.submitWholeLotCount', {
                        count: submittableLotCells.length,
                        defaultValue: `Nộp cả lô (${submittableLotCells.length} ô)`,
                      })}
                    </span>
                  </button>
                )}
              </div>
              {lotSubmitError && (
                <div
                  role='alert'
                  data-testid='side-drawer-lot-submit-error'
                  className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 flex items-start gap-2'
                >
                  <AlertTriangle className='w-4 h-4 shrink-0 text-rose-600 mt-0.5' />
                  {lotSubmitError.includes('\n') ? (
                    <ul className='list-disc pl-4 space-y-0.5 whitespace-pre-line break-words'>
                      {lotSubmitError
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                    </ul>
                  ) : (
                    <span className='whitespace-pre-line break-words'>{lotSubmitError}</span>
                  )}
                </div>
              )}
              <div className='space-y-2'>{(card.lotTasks ?? []).map(renderGridCellRow)}</div>
            </section>
          )}

          {/* Nhóm 0: Cảnh báo cần kiểm tra ảnh hưởng (dành cho Assignment V2) */}
          {!hasGridCellList && card.impactReviewReason && (
            <section
              aria-label='Cần kiểm tra ảnh hưởng'
              className='space-y-1.5'
              data-testid='side-drawer-impact-review'
            >
              <h3 className='text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5'>
                <AlertCircle className='w-3.5 h-3.5 text-amber-600' aria-hidden='true' />
                <span>Cần kiểm tra ảnh hưởng</span>
              </h3>
              <div className='p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs sm:text-sm text-amber-950 leading-relaxed font-medium space-y-2 break-words'>
                <p>
                  <strong>Lý do:</strong> {card.impactReviewReason}
                </p>
                <p className='text-xs text-amber-800 font-normal italic'>
                  Đầu vào của công việc đã bị mở lại hoặc thay đổi. Vui lòng chờ Editor hoặc
                  Producer quyết định giữ kết quả hay yêu cầu làm lại trước khi nộp.
                </p>

                {/* Editor / Producer action buttons (hidden for assignee) */}
                {canResolveImpact && (
                  <div
                    className='pt-2 border-t border-amber-200/80 space-y-2'
                    data-testid='side-drawer-impact-actions'
                  >
                    <div className='flex items-center gap-2 flex-wrap'>
                      <button
                        type='button'
                        onClick={() => {
                          setImpactDecision('Keep');
                          setImpactReason('');
                        }}
                        className='px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs'
                      >
                        Giữ kết quả
                      </button>
                      <button
                        type='button'
                        onClick={() => {
                          const s = String(card.status);
                          if (s === 'Submitted' || s === 'UnderReview') {
                            onShowToast?.(
                              'Yêu cầu làm lại qua cổng duyệt',
                              'Công việc đang chờ duyệt. Vui lòng chuyển sang màn Xét duyệt để trả về kèm yêu cầu sửa.',
                            );
                            handleOpenMyWork();
                          } else {
                            setImpactDecision('Rework');
                            setImpactReason('');
                          }
                        }}
                        className='px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs'
                      >
                        Yêu cầu làm lại
                      </button>
                    </div>

                    {impactDecision && (
                      <div className='p-3 bg-white rounded-xl border border-amber-300 space-y-2'>
                        <p className='text-xs font-bold text-stone-800'>
                          {impactDecision === 'Keep'
                            ? 'Xác nhận giữ kết quả:'
                            : 'Xác nhận yêu cầu làm lại:'}
                        </p>
                        {!card.isGridTask && (
                          <input
                            type='text'
                            aria-label='Lý do xử lý ảnh hưởng'
                            placeholder='Nhập lý do bắt buộc...'
                            value={impactReason}
                            onChange={(e) => setImpactReason(e.target.value)}
                            className='w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg'
                          />
                        )}
                        <div className='flex items-center gap-2 justify-end'>
                          <button
                            type='button'
                            onClick={() => setImpactDecision(null)}
                            className='px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer'
                          >
                            Huỷ
                          </button>
                          <button
                            type='button'
                            disabled={
                              isResolvingImpact || (!card.isGridTask && !impactReason.trim())
                            }
                            onClick={handleResolveImpact}
                            className='inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer'
                          >
                            {isResolvingImpact && <Loader2 className='w-3 h-3 animate-spin' />}
                            <span>Xác nhận</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
          {/* Nhóm 1: Bản vẽ bản thảo / Artwork liên quan (ẩn cho cấp Chương vì không có trang vẽ bản thảo) */}
          {card.entityType !== 'Chapter' && (
            <section aria-label='Bản vẽ bản thảo' className='space-y-2'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-landing-ink-muted flex items-center gap-1.5'>
                <ImageIcon className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                <span>Bản vẽ bản thảo</span>
              </h3>

              {thumbnail.status === 'success' && thumbnail.url ? (
                <div className='relative rounded-xl border border-landing-border bg-[#F3F0E9] p-3 flex flex-col items-center justify-center overflow-hidden shadow-2xs'>
                  <div className='w-full max-h-72 flex items-center justify-center'>
                    <img
                      src={thumbnail.url}
                      alt={card.brief}
                      className='max-h-64 max-w-full object-contain rounded drop-shadow-xs'
                    />
                  </div>
                  <div className='mt-2 w-full flex items-center justify-between text-xs text-landing-ink-muted pt-2 border-t border-landing-border'>
                    <span className='font-mono font-medium'>{thumbnail.label}</span>
                    {thumbnail.isPreviousStage && (
                      <span className='text-[11px] text-amber-800 font-medium'>
                        (Bản vẽ stage trước)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className='rounded-xl border border-dashed border-landing-border bg-[#F3F0E9]/50 p-6 flex flex-col items-center justify-center text-center gap-2'>
                  <ImageIcon className='w-6 h-6 text-stone-400' aria-hidden='true' />
                  <span className='text-xs text-landing-ink-muted font-medium'>
                    {thumbnail.label || 'Chưa có bản vẽ cho công việc này'}
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Nhóm 2: Nhận xét phản hồi cần sửa (nổi bật nếu ReworkRequired) */}
          {card.lastFeedbackComment && (
            <section aria-label='Phản hồi sửa đổi' className='space-y-1.5'>
              <h3 className='text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5'>
                <AlertCircle className='w-3.5 h-3.5 text-rose-600' aria-hidden='true' />
                <span>Nhận xét phản hồi gần nhất</span>
              </h3>
              <div className='p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-900 leading-relaxed font-medium break-words'>
                {card.lastFeedbackComment}
              </div>
            </section>
          )}

          {/* Nhóm 3: Ghi chú & Tài liệu tham chiếu */}
          {card.referenceNotes && (
            <section aria-label='Ghi chú tham chiếu' className='space-y-1.5'>
              <h4 className='text-xs font-bold text-landing-ink-muted uppercase tracking-wider flex items-center gap-1.5'>
                <FileText className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                <span>Ghi chú & Tài liệu tham chiếu</span>
              </h4>
              <div className='p-3.5 bg-[#F3F0E9] border border-landing-border rounded-xl text-xs sm:text-sm text-landing-ink leading-relaxed whitespace-pre-wrap font-sans break-words'>
                {card.referenceNotes}
              </div>
            </section>
          )}

          {/* Nhóm 4: Người phụ trách, hạn và mức độ ưu tiên */}
          <section
            aria-label='Thông tin phân công'
            className='bg-[#FCFBF8] rounded-xl p-4 border border-landing-border space-y-2.5 text-xs shadow-2xs'
          >
            <div className='flex items-center justify-between py-1 border-b border-landing-border flex-wrap gap-2'>
              <span className='text-landing-ink-muted flex items-center gap-1.5'>
                <User className='w-3.5 h-3.5 text-stone-400' aria-hidden='true' />
                Người thực hiện:
              </span>
              <span className='font-semibold text-landing-ink flex items-center gap-1.5'>
                <span className='w-5 h-5 rounded-full bg-[#F3F0E9] border border-landing-border text-landing-ink flex items-center justify-center text-[10px] font-bold'>
                  {card.assigneeAvatarInitials}
                </span>
                {card.assigneeName} ({card.assignedRole})
              </span>
            </div>

            <div className='flex items-center justify-between py-1 border-b border-landing-border flex-wrap gap-2'>
              <span className='text-landing-ink-muted flex items-center gap-1.5'>
                <Clock className='w-3.5 h-3.5 text-stone-400' aria-hidden='true' />
                Hạn chót:
              </span>
              <span className='font-semibold text-landing-ink'>
                {card.dueDate ? new Date(card.dueDate).toLocaleString('vi-VN') : 'Không có hạn'}
              </span>
            </div>

            <div className='flex items-center justify-between py-1 border-b border-landing-border flex-wrap gap-2'>
              <span className='text-landing-ink-muted flex items-center gap-1.5'>
                <Layers className='w-3.5 h-3.5 text-stone-400' aria-hidden='true' />
                Mức ưu tiên:
              </span>
              <span className='font-semibold text-landing-ink'>{String(card.priority)}</span>
            </div>

            {((card.dependsOnAssignmentIds && card.dependsOnAssignmentIds.length > 0) ||
              card.dependsOnAssignmentId) &&
              (() => {
                const depIds = (
                  card.dependsOnAssignmentIds && card.dependsOnAssignmentIds.length > 0
                    ? card.dependsOnAssignmentIds
                    : card.dependsOnAssignmentId
                      ? [card.dependsOnAssignmentId]
                      : []
                ).filter(Boolean);

                const resolvedDeps = depIds.map((id) => {
                  const found = chapterAssignments.find((a) => a.id === id);
                  if (found) return { id, assignment: found };
                  const cardMatch = chapterCards?.find((c) => c.id === id);
                  return {
                    id,
                    assignment: cardMatch
                      ? {
                          id: cardMatch.id,
                          brief: cardMatch.brief,
                          status: cardMatch.status,
                          stageName: cardMatch.stageName,
                        }
                      : undefined,
                  };
                });

                const approvedCount = resolvedDeps.filter(
                  (d) => d.assignment && String(d.assignment.status).toLowerCase() === 'approved',
                ).length;
                const unapprovedList = resolvedDeps.filter(
                  (d) => !d.assignment || String(d.assignment.status).toLowerCase() !== 'approved',
                );
                const allApproved = resolvedDeps.length > 0 && unapprovedList.length === 0;

                return (
                  <div className='py-2 space-y-2.5 pt-3 border-t border-landing-border'>
                    <div className='flex items-center justify-between flex-wrap gap-2'>
                      <div className='flex items-center gap-1.5'>
                        <Lock className='w-3.5 h-3.5 text-amber-600' aria-hidden='true' />
                        <span className='font-bold text-xs text-landing-ink'>
                          Cần hoàn thành trước · {approvedCount}/{depIds.length} đã duyệt
                        </span>
                      </div>

                      <button
                        type='button'
                        onClick={() => setIsGraphModalOpen(true)}
                        className='text-[11px] font-semibold text-[#F97316] hover:text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer'
                      >
                        <Network className='w-3 h-3' />
                        <span>Xem sơ đồ</span>
                      </button>
                    </div>

                    {/* Banner trạng thái điều kiện */}
                    <div
                      className={`p-2.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2 ${
                        allApproved
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      {allApproved ? (
                        <>
                          <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5' />
                          <div>
                            Tất cả công việc tiền đề đã được duyệt. Đã đáp ứng điều kiện phụ thuộc.
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
                          <div>
                            <strong>Đang chờ:</strong>{' '}
                            {unapprovedList
                              .map((u) => u.assignment?.brief || `#${u.id.slice(0, 8)}`)
                              .join(', ')}{' '}
                            được duyệt trước khi bắt đầu.
                          </div>
                        </>
                      )}
                    </div>

                    {/* Danh sách thẻ công việc chi tiết */}
                    <div className='space-y-1.5'>
                      {resolvedDeps.map(({ id, assignment }) => {
                        if (!assignment) {
                          return (
                            <div
                              key={id}
                              className='p-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center justify-between gap-2'
                            >
                              <div className='flex items-center gap-1.5'>
                                <AlertCircle className='w-3.5 h-3.5 text-amber-500 shrink-0' />
                                <span className='font-mono text-[11px]'>#{id.slice(0, 8)}</span>
                                <span className='text-[10px] text-stone-400'>
                                  (Không tìm thấy thông tin hoặc đã bị xoá)
                                </span>
                              </div>
                              <span className='text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded'>
                                Chưa xác nhận
                              </span>
                            </div>
                          );
                        }

                        const isAppr = String(assignment.status).toLowerCase() === 'approved';
                        return (
                          <div
                            key={id}
                            className={`p-2.5 rounded-xl border text-xs transition-colors flex items-start justify-between gap-2 ${
                              isAppr
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                : 'bg-[#FCFBF8] border-[#E7E5E4] text-stone-900'
                            }`}
                          >
                            <div className='min-w-0 space-y-0.5'>
                              <div className='font-semibold truncate max-w-[260px]'>
                                {assignment.brief || '[Không có mô tả]'}
                              </div>
                              <div className='text-[11px] text-stone-500 flex items-center gap-1.5'>
                                <span>{assignment.stageName || 'Pipeline'}</span>
                                <span>•</span>
                                <span className='font-mono text-[10px]'>#{id.slice(0, 8)}</span>
                              </div>
                            </div>

                            <div className='flex items-center gap-2 shrink-0'>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  isAppr
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {isAppr ? 'Đã duyệt' : assignment.status}
                              </span>
                              <button
                                type='button'
                                onClick={() => {
                                  const url = card.isGridTask
                                    ? `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${card.chapterId}&board=grid-v3`
                                    : `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${card.chapterId}&assignmentId=${id}`;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                className='p-1 rounded text-stone-400 hover:text-[#F97316] transition-colors cursor-pointer'
                                title='Mở xem chi tiết'
                              >
                                <ExternalLink className='w-3.5 h-3.5' />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
          </section>

          {/* Nhóm 5: Lịch sử nộp bài */}
          <section aria-label='Lịch sử nộp bài' className='space-y-2.5'>
            <h4 className='text-xs font-bold text-landing-ink uppercase tracking-wider flex items-center gap-1.5'>
              <History className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
              <span>Lịch sử nộp bài ({submissions.length})</span>
            </h4>

            {loadingData ? (
              <div className='py-6 flex items-center justify-center text-landing-ink-muted gap-2 text-xs'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang tải lịch sử...</span>
              </div>
            ) : submissions.length === 0 ? (
              <div className='p-4 text-center border border-dashed border-landing-border rounded-xl text-xs text-landing-ink-muted bg-[#F3F0E9]/30'>
                Chưa có bản nộp nào cho nhiệm vụ này.
              </div>
            ) : (
              <div className='space-y-2'>
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className='p-3 bg-[#F3F0E9]/60 border border-landing-border rounded-xl text-xs space-y-1'
                  >
                    <div className='flex items-center justify-between flex-wrap gap-2'>
                      <span className='font-bold text-landing-ink'>
                        Lần nộp #{sub.attemptNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          sub.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : sub.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                              : 'bg-stone-100 text-stone-800 border-stone-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                    <div className='text-[11px] text-landing-ink-muted'>
                      Thời gian: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                    </div>
                    {sub.decisionComment && (
                      <div className='text-[11px] text-landing-ink pt-1 italic break-words'>
                        Ghi chú duyệt: &quot;{sub.decisionComment}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Nhóm 6: Yêu cầu sửa đổi */}
          {changeRequests.length > 0 && (
            <section aria-label='Yêu cầu sửa đổi' className='space-y-2.5'>
              <h4 className='text-xs font-bold text-landing-ink uppercase tracking-wider flex items-center gap-1.5'>
                <AlertCircle className='w-3.5 h-3.5 text-amber-600' aria-hidden='true' />
                <span>Yêu cầu sửa đổi ({changeRequests.length})</span>
              </h4>
              <div className='space-y-2'>
                {changeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className='p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs space-y-1'
                  >
                    <div className='flex items-center justify-between flex-wrap gap-2'>
                      <span className='font-bold text-amber-900 break-words'>{cr.description}</span>
                      <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-800'>
                        {cr.status}
                      </span>
                    </div>
                    {cr.resolutionNote && (
                      <div className='text-[11px] text-stone-600 break-words'>
                        Đã xử lý: {cr.resolutionNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer cố định: Huỷ việc / Bỏ gán ô, Mở bàn làm việc & Đóng */}
        <div className='p-4 border-t border-landing-border bg-[#F3F0E9]/90 flex items-center justify-between gap-2.5 flex-wrap shrink-0'>
          {(card.isGridTask
            ? isProducerRole && unassignableGridCellIds.length > 0
            : card.status !== 'Approved') && (
            <div className='flex items-center gap-1.5'>
              {confirmDelete && !card.isGridTask && (
                <input
                  type='text'
                  aria-label='Lý do huỷ việc'
                  placeholder='Lý do huỷ (bắt buộc)'
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className='px-2 py-1.5 text-xs border border-rose-300 rounded-lg bg-white w-44'
                />
              )}
              <button
                type='button'
                onClick={handleDeleteAssignment}
                disabled={isDeleting || (confirmDelete && !card.isGridTask && !cancelReason.trim())}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  confirmDelete
                    ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                }`}
                title={
                  card.isGridTask
                    ? confirmDelete
                      ? 'Bấm để xác nhận bỏ gán ô'
                      : 'Bỏ gán ô này về trạng thái chưa giao'
                    : confirmDelete
                      ? 'Bấm để xác nhận xoá nhiệm vụ'
                      : 'Huỷ / Xoá phân công này'
                }
              >
                {isDeleting ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Trash2 className='w-3.5 h-3.5' />
                )}
                <span>
                  {card.isGridTask
                    ? confirmDelete
                      ? card.isGridLot
                        ? 'Xác nhận bỏ gán lô?'
                        : 'Xác nhận bỏ gán?'
                      : card.isGridLot
                        ? 'Bỏ gán lô'
                        : 'Bỏ gán ô'
                    : confirmDelete
                      ? 'Xác nhận xoá?'
                      : 'Huỷ việc'}
                </span>
              </button>
              {confirmDelete && (
                <button
                  type='button'
                  onClick={() => setConfirmDelete(false)}
                  className='px-2 py-2 text-xs text-landing-ink-muted hover:text-landing-ink cursor-pointer'
                >
                  Huỷ
                </button>
              )}
            </div>
          )}

          <div className='flex items-center gap-2 ml-auto'>
            <button
              type='button'
              onClick={handleOpenMyWork}
              className='inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#1C1917] hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer'
            >
              <span>Mở Bàn làm việc &amp; Xét duyệt</span>
              <ArrowUpRight className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={onClose}
              className='px-3.5 py-2 bg-[#FCFBF8] hover:bg-white text-landing-ink border border-landing-border rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs'
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {isGraphModalOpen && card && (
        <DependencyGraphModal
          isOpen={isGraphModalOpen}
          onClose={() => setIsGraphModalOpen(false)}
          targetTask={{
            title: card.brief,
            stageName: card.stageName,
            contextText: card.targetLabel,
            assigneeName: card.assigneeName,
            isCreating: false,
          }}
          dependencies={(card.dependsOnAssignmentIds && card.dependsOnAssignmentIds.length > 0
            ? card.dependsOnAssignmentIds
            : card.dependsOnAssignmentId
              ? [card.dependsOnAssignmentId]
              : []
          ).map((id) => {
            const a = chapterAssignments.find((item) => item.id === id);
            const c = !a ? chapterCards?.find((item) => item.id === id) : undefined;
            return {
              id,
              brief: a?.brief || c?.brief || `Nhiệm vụ #${id.slice(0, 8)}`,
              status: a?.status || c?.status || 'Assigned',
              stageName: a?.stageName || c?.stageName || 'Pipeline',
              contextText: a || c ? 'Chương này' : undefined,
            };
          })}
        />
      )}
    </Modal>
  );

  return modalContent;
};
