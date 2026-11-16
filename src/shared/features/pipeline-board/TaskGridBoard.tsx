// src/shared/features/pipeline-board/TaskGridBoard.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Grid,
  History,
  Loader2,
  Lock,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Undo2,
  Unlock,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from 'lucide-react';
import {
  assignmentService,
  type StageTaskDto,
  type StageTaskLotDto,
  type StageTaskStatus,
  type StageTaskSubmissionDto,
  type TaskGridDto,
  type TaskGridStageDto,
  type StageTaskLotRequest,
} from '@/services/assignment.service';
import {
  parseStageTaskCanvasVersions,
  parseStageTaskPanelLayout,
  pickLatestDecisionComment,
  resolveReworkDecisionComments,
} from '@/types';
import { formatPageRangeLabel } from './productionBoard.utils';
import { useTranslation } from '@/lib/i18n';
import { chapterService } from '@/services/chapter.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';
import { loadPreviousStageArtworks } from '@/shared/utils/stageArtworks';
import {
  ImageViewerLightbox,
  type ImageViewerSlide,
} from '@/shared/components/image-viewer/ImageViewerLightbox';

export interface TaskGridBoardProps {
  chapterId: string;
  seriesId?: string;
  workspaceId?: string;
  currentUserId?: string;
  currentUserRole?: string | null;
  isProducer?: boolean;
  isEditor?: boolean;
  refreshKey?: number;
  onShowToast?: (title: string, desc: string) => void;
}

const STATUS_STYLE: Record<StageTaskStatus, { label: string; cls: string }> = {
  Unassigned: {
    label: 'Chưa giao',
    cls: 'bg-stone-100 text-stone-600 border-stone-300',
  },
  Assigned: {
    label: 'Đã giao',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  InProgress: {
    label: 'Đang làm',
    cls: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  Submitted: {
    label: 'Chờ duyệt',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  UnderReview: {
    label: 'Đang duyệt',
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  Approved: {
    label: 'Đã duyệt',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  ReworkRequired: {
    label: 'Cần sửa',
    cls: 'bg-rose-50 text-rose-700 border-rose-300',
  },
  Cancelled: {
    label: 'Đã huỷ',
    cls: 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through',
  },
};

export const TaskGridBoard: React.FC<TaskGridBoardProps> = ({
  chapterId,
  seriesId,
  workspaceId,
  currentUserId,
  currentUserRole,
  isProducer = false,
  isEditor = false,
  refreshKey = 0,
  onShowToast,
}) => {
  const { t } = useTranslation('pipeline');
  const [grid, setGrid] = useState<TaskGridDto | null>(null);
  const [reworkCommentsByTask, setReworkCommentsByTask] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ô Unassigned được Producer chọn để giao lô
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<Set<string>>(new Set());
  // Ô Assigned/InProgress/ReworkRequired được Producer chọn để bỏ gán hàng loạt
  const [selectedUnassignIds, setSelectedUnassignIds] = useState<Set<string>>(new Set());
  // Ô InProgress được người nhận việc chọn để nộp hàng loạt
  const [selectedSubmitIds, setSelectedSubmitIds] = useState<Set<string>>(new Set());

  // Trạng thái mở lại ô Approved (Producer)
  const [reopeningTaskId, setReopeningTaskId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Trạng thái yêu cầu sửa ô Submitted/UnderReview (Editor/Producer - BR-06)
  const [requestingChangesTaskId, setRequestingChangesTaskId] = useState<string | null>(null);
  const [requestChangesComment, setRequestChangesComment] = useState('');

  // Lịch sử nộp của từng ô (Lát cắt 2b + Snapshot V3)
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null);
  const [submissionsByTaskId, setSubmissionsByTaskId] = useState<
    Record<string, StageTaskSubmissionDto[]>
  >({});
  const [loadingHistoryTaskId, setLoadingHistoryTaskId] = useState<string | null>(null);
  const [scriptVersionMap, setScriptVersionMap] = useState<Record<string, number>>({});
  const scriptVersionsLoadedForRef = useRef<string | null>(null);
  const [replayingSubmissionId, setReplayingSubmissionId] = useState<string | null>(null);
  const [replaySlides, setReplaySlides] = useState<ImageViewerSlide[]>([]);
  const [replayOpen, setReplayOpen] = useState(false);

  useEffect(() => {
    setScriptVersionMap({});
    scriptVersionsLoadedForRef.current = null;
  }, [chapterId]);

  // Cấu hình giao lô (Producer)
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [lotBrief, setLotBrief] = useState('');
  const [lotDueDate, setLotDueDate] = useState('');
  const [dryRunPreview, setDryRunPreview] = useState<{
    taskCount: number;
    lotCount: number;
  } | null>(null);

  // Trạng thái Đổi người cho ô chưa nộp (Producer — POST lots với reassign: true)
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignBrief, setReassignBrief] = useState('');
  const [reassignDueDate, setReassignDueDate] = useState('');

  // Trạng thái Sửa hạn & brief lô (Producer — PATCH lots/{lotId})
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editLotBrief, setEditLotBrief] = useState('');
  const [editLotDueDate, setEditLotDueDate] = useState('');
  const [editLotClearDueDate, setEditLotClearDueDate] = useState(false);

  // LỖI 2: Khi đã xác định currentUserRole từ API, phân quyền nghiêm ngặt theo role đó (tránh lộ nút Producer cho Artist/Letterer)
  const normalizedUserRole = currentUserRole ? String(currentUserRole).trim().toUpperCase() : '';
  const effectiveIsProducer = normalizedUserRole
    ? normalizedUserRole === 'PRODUCER'
    : Boolean(isProducer);
  const effectiveIsReviewer = normalizedUserRole
    ? normalizedUserRole === 'PRODUCER' || normalizedUserRole === 'EDITOR'
    : Boolean(isProducer || isEditor);

  useEffect(() => {
    if (!effectiveIsProducer) {
      setSelectedUnassignedIds(new Set());
      setSelectedUnassignIds(new Set());
      setReopeningTaskId(null);
      setReassigningTaskId(null);
      setEditingLotId(null);
      setDryRunPreview(null);
    }
  }, [effectiveIsProducer]);

  const loadGrid = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    try {
      const [gridRes, membersRes] = await Promise.all([
        assignmentService.getTaskGrid(chapterId),
        workspaceId
          ? workspaceService.getMembers(workspaceId).catch(() => [] as WorkspaceMemberDto[])
          : Promise.resolve([] as WorkspaceMemberDto[]),
      ]);
      setGrid(gridRes);
      setMembers(membersRes || []);
      const comments = await resolveReworkDecisionComments(
        chapterId,
        gridRes?.tasks ?? [],
        typeof assignmentService.getStageTaskSubmissions === 'function'
          ? (cId, tId) => assignmentService.getStageTaskSubmissions(cId, tId)
          : undefined,
      );
      setReworkCommentsByTask(comments);
    } catch (err: any) {
      setError(err.message || 'Không thể tải lưới giao việc V3.');
    } finally {
      setLoading(false);
    }
  }, [chapterId, workspaceId]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid, refreshKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePipelineChanged = (event: Event) => {
      const detailSeriesId = (event as CustomEvent<{ seriesId?: string }>).detail?.seriesId;
      if (!seriesId || !detailSeriesId || detailSeriesId === seriesId) {
        void loadGrid();
      }
    };
    window.addEventListener('pipeline:changed', handlePipelineChanged);
    return () => {
      window.removeEventListener('pipeline:changed', handlePipelineChanged);
    };
  }, [loadGrid, seriesId]);

  const activeMembers = useMemo(
    () => members.filter((m) => !m.status || String(m.status).toLowerCase() === 'active'),
    [members],
  );

  const getMemberName = useCallback(
    (userId?: string | null) => {
      if (!userId) return '—';
      const found = members.find((m) => m.userId === userId);
      if (!found) return userId.slice(0, 8);
      return found.fullName || found.email.split('@')[0];
    },
    [members],
  );

  const visibleStages = useMemo(() => {
    if (!grid) return [];
    return [...grid.stages]
      .filter((s) => s.isEnabled !== false)
      .sort((a, b) => a.stageOrder - b.stageOrder);
  }, [grid]);

  const enabledStageIds = useMemo(() => new Set(visibleStages.map((s) => s.id)), [visibleStages]);

  // Các ô còn tồn tại trên hệ thống nhưng thuộc công đoạn đã bị tắt (isEnabled = false)
  const disabledStageTasks = useMemo(() => {
    if (!grid) return [];
    return grid.tasks.filter(
      (t) => t.status !== 'Cancelled' && !enabledStageIds.has(t.pipelineStageId),
    );
  }, [grid, enabledStageIds]);

  const sortedPages = useMemo(() => {
    if (!grid) return [];
    return [...grid.pages].sort((a, b) => a.pageNumber - b.pageNumber);
  }, [grid]);

  // Map (stageId, pageId ?? '__CHAPTER__') -> StageTaskDto
  const taskMap = useMemo(() => {
    const map = new Map<string, StageTaskDto>();
    if (!grid) return map;
    for (const t of grid.tasks) {
      if (t.status === 'Cancelled') continue;
      const key = `${t.pipelineStageId}:${t.pageId ?? '__CHAPTER__'}`;
      map.set(key, t);
    }
    return map;
  }, [grid]);

  const cancelledTaskMap = useMemo(() => {
    const map = new Map<string, StageTaskDto>();
    if (!grid) return map;
    for (const t of grid.tasks) {
      if (t.status !== 'Cancelled') continue;
      const key = `${t.pipelineStageId}:${t.pageId ?? '__CHAPTER__'}`;
      if (!taskMap.has(key)) map.set(key, t);
    }
    return map;
  }, [grid, taskMap]);

  const hasChapterRow = useMemo(() => {
    if (!grid) return false;
    return (
      visibleStages.some((s) => s.granularity === 'Chapter') ||
      grid.tasks.some(
        (t) => !t.pageId && t.status !== 'Cancelled' && enabledStageIds.has(t.pipelineStageId),
      )
    );
  }, [grid, visibleStages, enabledStageIds]);

  // Các ô Unassigned đang được chọn gom theo công đoạn (chỉ tính các công đoạn đang bật)
  const selectedTasksByStage = useMemo(() => {
    const map = new Map<string, StageTaskDto[]>();
    if (!grid) return map;
    for (const t of grid.tasks) {
      if (
        selectedUnassignedIds.has(t.id) &&
        t.status === 'Unassigned' &&
        enabledStageIds.has(t.pipelineStageId)
      ) {
        const list = map.get(t.pipelineStageId) || [];
        list.push(t);
        map.set(t.pipelineStageId, list);
      }
    }
    return map;
  }, [grid, selectedUnassignedIds, enabledStageIds]);

  // Vai trò yêu cầu của các công đoạn đang được chọn để lọc thành viên nhận việc
  const requiredRoleForSelection = useMemo(() => {
    if (!grid || selectedTasksByStage.size === 0) return null;
    const roles = new Set<string>();
    for (const stageId of selectedTasksByStage.keys()) {
      const stg = grid.stages.find((s) => s.id === stageId);
      if (stg?.allowedRole) roles.add(String(stg.allowedRole).toUpperCase());
    }
    return roles.size === 1 ? [...roles][0] : null;
  }, [grid, selectedTasksByStage]);

  const eligibleAssignees = useMemo(() => {
    if (!requiredRoleForSelection) return activeMembers;
    return activeMembers.filter(
      (m) => String(m.role || '').toUpperCase() === requiredRoleForSelection,
    );
  }, [activeMembers, requiredRoleForSelection]);

  const toggleSelectUnassigned = (taskId: string) => {
    setDryRunPreview(null);
    setSelectedUnassignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSelectStageColumn = (stageId: string) => {
    if (!grid || !enabledStageIds.has(stageId)) return;
    setDryRunPreview(null);
    const columnUnassigned = grid.tasks
      .filter((t) => t.pipelineStageId === stageId && t.status === 'Unassigned')
      .map((t) => t.id);
    if (columnUnassigned.length === 0) return;

    setSelectedUnassignedIds((prev) => {
      const next = new Set(prev);
      const allSelected = columnUnassigned.every((id) => next.has(id));
      if (allSelected) {
        columnUnassigned.forEach((id) => next.delete(id));
      } else {
        columnUnassigned.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectSubmit = (taskId: string) => {
    setSelectedSubmitIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSelectUnassign = (taskId: string) => {
    setSelectedUnassignIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Kiểm tra mọi công đoạn tiền đề trực tiếp của ô đã Approved và không bị lỗi thời (khớp TaskGridRules.PrerequisitesApproved)
  const arePrerequisitesApproved = useCallback(
    (task: StageTaskDto, stage: TaskGridStageDto): boolean => {
      if (!grid) return false;
      const prereqIds = stage.prerequisiteStageIds || [];
      for (const prereqId of prereqIds) {
        const cells = grid.tasks.filter(
          (t) => t.pipelineStageId === prereqId && t.status !== 'Cancelled',
        );
        const needed = task.pageId
          ? cells.filter((t) => t.pageId === task.pageId || !t.pageId)
          : cells;
        if (needed.length === 0) return false;
        if (needed.some((t) => t.status !== 'Approved' || t.isInputOutdated)) {
          return false;
        }
      }
      return true;
    },
    [grid],
  );

  const toggleAssignee = (userId: string) => {
    setDryRunPreview(null);
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  // Chia đều các ô đã chọn trong từng cột cho danh sách người nhận đã chọn
  const buildLotRequests = (): StageTaskLotRequest[] => {
    if (selectedAssigneeIds.length === 0 || selectedTasksByStage.size === 0) return [];
    const requests: StageTaskLotRequest[] = [];
    const dueIso = lotDueDate ? new Date(lotDueDate).toISOString() : null;
    const briefVal = lotBrief.trim() || null;

    for (const [stageId, stageTasks] of selectedTasksByStage.entries()) {
      const buckets = new Map<string, string[]>();
      selectedAssigneeIds.forEach((uid) => buckets.set(uid, []));

      stageTasks.forEach((task, index) => {
        const assigneeId = selectedAssigneeIds[index % selectedAssigneeIds.length];
        buckets.get(assigneeId)!.push(task.id);
      });

      for (const [assigneeUserId, taskIds] of buckets.entries()) {
        if (taskIds.length > 0) {
          requests.push({
            pipelineStageId: stageId,
            assigneeUserId,
            taskIds,
            brief: briefVal,
            dueDate: dueIso,
          });
        }
      }
    }
    return requests;
  };

  const handleGenerate = async () => {
    setActionLoading('generate');
    setError(null);
    try {
      const res = await assignmentService.generateTaskGrid(chapterId);
      onShowToast?.(
        'Đã đồng bộ lưới ô việc',
        `Đã tạo ${res.created} ô, huỷ ${res.cancelled} ô (Tổng: ${res.total} ô).`,
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể sinh ô công việc.');
      onShowToast?.('Lỗi sinh lưới việc', err.message || 'Không thể sinh ô công việc.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMigrateAssignments = async () => {
    setActionLoading('migrateAssignments');
    setError(null);
    try {
      let targetSeriesId = seriesId || '';
      if (!targetSeriesId && chapterId) {
        const chap = await chapterService.getChapterById(chapterId).catch(() => null);
        targetSeriesId = chap?.seriesId || '';
      }
      if (!targetSeriesId) {
        throw new Error('Không xác định được Series để chuyển việc cũ sang Lưới V3.');
      }
      const res = await assignmentService.migrateAssignmentsToGrid(targetSeriesId);
      const skippedSuffix =
        res.skipped && res.skipped.length > 0 ? `, bỏ qua ${res.skipped.length} mục` : '';
      onShowToast?.(
        'Đã chuyển việc cũ sang Lưới V3',
        `Đã chuyển ${res.migrated} việc cũ (${res.cellsAssigned} ô)${skippedSuffix}.`,
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể chuyển việc cũ sang Lưới V3.');
      onShowToast?.(
        'Lỗi chuyển việc V2 → Lưới',
        err.message || 'Không thể chuyển việc cũ sang Lưới V3.',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignLots = async (dryRun: boolean) => {
    const lots = buildLotRequests();
    if (lots.length === 0) {
      setError('Vui lòng chọn ít nhất 1 ô Chưa giao và 1 thành viên nhận việc.');
      return;
    }
    setActionLoading(dryRun ? 'dryRun' : 'assignLots');
    setError(null);
    try {
      const res = await assignmentService.assignTaskGridLots(chapterId, {
        lots,
        dryRun,
      });
      if (dryRun) {
        setDryRunPreview({ taskCount: res.taskCount, lotCount: lots.length });
        onShowToast?.(
          'Kiểm tra hợp lệ (Dry Run)',
          `Sẵn sàng giao ${res.taskCount} ô thành ${lots.length} lô công việc.`,
        );
      } else {
        setDryRunPreview(null);
        setSelectedUnassignedIds(new Set());
        setLotBrief('');
        setLotDueDate('');
        onShowToast?.(
          'Giao lô thành công',
          `Đã giao ${res.taskCount} ô vào ${res.lots.length} lô công việc.`,
        );
        await loadGrid();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể giao lô công việc.');
      onShowToast?.('Lỗi giao lô', err.message || 'Không thể giao lô công việc.');
      if (err?.status === 409) {
        loadGrid();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTask = async (task: StageTaskDto) => {
    setActionLoading(`start:${task.id}`);
    setError(null);
    try {
      await assignmentService.startStageTask(chapterId, task.id);
      onShowToast?.('Đã bắt đầu ô việc', 'Trạng thái đã chuyển sang Đang làm (InProgress).');
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể bắt đầu ô công việc.');
      onShowToast?.('Không thể bắt đầu', err.message || 'Không thể bắt đầu ô công việc.');
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitTasks = async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setActionLoading(taskIds.length === 1 ? `submit:${taskIds[0]}` : 'submitBatch');
    setError(null);
    try {
      const updated = await assignmentService.submitStageTasks(chapterId, taskIds);
      setSelectedSubmitIds((prev) => {
        const next = new Set(prev);
        taskIds.forEach((id) => next.delete(id));
        return next;
      });
      const autoApproved = updated.every((t) => t.status === 'Approved');
      onShowToast?.(
        'Đã nộp ô công việc',
        autoApproved
          ? `Đã nộp ${updated.length} ô (tự động Duyệt do công đoạn không qua cổng duyệt).`
          : `Đã nộp ${updated.length} ô chờ Editor/Producer duyệt.`,
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể nộp ô công việc.');
      onShowToast?.('Lỗi nộp bài', err.message || 'Không thể nộp ô công việc.');
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveTask = async (task: StageTaskDto) => {
    setActionLoading(`approve:${task.id}`);
    setError(null);
    try {
      await assignmentService.approveStageTask(chapterId, task.id);
      onShowToast?.(
        'Đã duyệt ô việc',
        'Ô công việc đã chuyển sang trạng thái Đã duyệt (Approved).',
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể duyệt ô công việc.');
      onShowToast?.('Lỗi duyệt ô việc', err.message || 'Không thể duyệt ô công việc.');
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdrawTask = async (task: StageTaskDto) => {
    setActionLoading(`withdraw:${task.id}`);
    setError(null);
    try {
      await assignmentService.withdrawStageTask(chapterId, task.id);
      onShowToast?.(
        t('taskGridV3.withdrawSuccessTitle', 'Đã rút bài'),
        'Ô công việc đã chuyển về trạng thái Đang làm (InProgress).',
      );
      await loadGrid();
    } catch (err: any) {
      const msg = err?.message || 'Không thể rút bài đã nộp.';
      setError(msg);
      onShowToast?.(t('taskGridV3.withdrawErrorTitle', 'Không thể rút bài'), msg);
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleaseReview = async (task: StageTaskDto) => {
    setActionLoading(`releaseReview:${task.id}`);
    setError(null);
    try {
      await assignmentService.releaseStageTaskReview(chapterId, task.id);
      onShowToast?.(
        t('taskGridV3.releaseReviewSuccessTitle', 'Đã nhả khoá duyệt'),
        'Ô công việc đã trở về trạng thái Chờ duyệt (Submitted).',
      );
      await loadGrid();
    } catch (err: any) {
      const msg = err?.message || 'Không thể nhả khoá duyệt ô công việc.';
      setError(msg);
      onShowToast?.('Lỗi nhả khoá duyệt', msg);
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const openReassignForm = (task: StageTaskDto, stage: TaskGridStageDto) => {
    const allowedUpper = stage.allowedRole ? String(stage.allowedRole).toUpperCase() : null;
    const candidates = activeMembers.filter(
      (m) => !allowedUpper || String(m.role || '').toUpperCase() === allowedUpper,
    );
    const defaultCandidate =
      candidates.find((m) => m.userId !== task.assigneeUserId) ?? candidates[0];
    const currentLot = task.lotId ? grid?.lots.find((l) => l.id === task.lotId) : undefined;
    setReassigningTaskId(task.id);
    setReassignUserId(defaultCandidate?.userId ?? '');
    setReassignBrief(currentLot?.brief ?? '');
    setReassignDueDate(currentLot?.dueDate ? currentLot.dueDate.slice(0, 10) : '');
  };

  const handleReassignTask = async (task: StageTaskDto, stage: TaskGridStageDto) => {
    if (!reassignUserId) {
      setError('Vui lòng chọn thành viên nhận việc mới.');
      return;
    }
    setActionLoading(`reassign:${task.id}`);
    setError(null);
    try {
      const dueIso = reassignDueDate ? new Date(`${reassignDueDate}T23:59:59`).toISOString() : null;
      await assignmentService.assignTaskGridLots(chapterId, {
        lots: [
          {
            pipelineStageId: stage.id,
            assigneeUserId: reassignUserId,
            taskIds: [task.id],
            brief: reassignBrief.trim() || null,
            dueDate: dueIso,
          },
        ],
        dryRun: false,
        reassign: true,
      });
      setReassigningTaskId(null);
      onShowToast?.(
        t('taskGridV3.reassignSuccessTitle', 'Đã đổi người nhận'),
        `Đã chuyển ô sang ${getMemberName(reassignUserId)}.`,
      );
      await loadGrid();
    } catch (err: any) {
      const msg = err?.message || 'Không thể đổi người nhận ô công việc.';
      setError(msg);
      onShowToast?.('Lỗi đổi người nhận', msg);
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const openEditLotForm = (lot: StageTaskLotDto) => {
    setEditingLotId(lot.id);
    setEditLotBrief(lot.brief ?? '');
    setEditLotDueDate(lot.dueDate ? lot.dueDate.slice(0, 10) : '');
    setEditLotClearDueDate(false);
  };

  const handleUpdateLot = async (lot: StageTaskLotDto) => {
    setActionLoading(`updateLot:${lot.id}`);
    setError(null);
    try {
      const origBrief = lot.brief ?? '';
      const origDate = lot.dueDate ? lot.dueDate.slice(0, 10) : '';
      const briefPayload = editLotBrief !== origBrief ? editLotBrief : null;

      let dueDatePayload: string | null = null;
      let clearDueDate = false;
      if (editLotClearDueDate || (!editLotDueDate && Boolean(origDate))) {
        dueDatePayload = null;
        clearDueDate = true;
      } else if (editLotDueDate && editLotDueDate !== origDate) {
        dueDatePayload = new Date(`${editLotDueDate}T23:59:59`).toISOString();
        clearDueDate = false;
      }

      await assignmentService.updateStageTaskLot(chapterId, lot.id, {
        brief: briefPayload,
        dueDate: dueDatePayload,
        clearDueDate,
      });
      setEditingLotId(null);
      onShowToast?.(
        t('taskGridV3.updateLotSuccessTitle', 'Đã cập nhật lô công việc'),
        `Đã lưu thông tin lô công việc.`,
      );
      await loadGrid();
    } catch (err: any) {
      const msg = err?.message || 'Không thể cập nhật lô công việc.';
      setError(msg);
      onShowToast?.('Lỗi cập nhật lô', msg);
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async (task: StageTaskDto) => {
    const trimmed = requestChangesComment.trim();
    if (!trimmed) {
      setError('Vui lòng nhập nhận xét yêu cầu sửa (bắt buộc theo BR-06).');
      return;
    }
    setActionLoading(`requestChanges:${task.id}`);
    setError(null);
    try {
      await assignmentService.requestStageTaskChanges(chapterId, task.id, trimmed);
      setRequestingChangesTaskId(null);
      setRequestChangesComment('');
      onShowToast?.(
        'Đã yêu cầu sửa',
        'Ô công việc đã chuyển sang trạng thái Cần sửa (ReworkRequired).',
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể yêu cầu sửa ô công việc.');
      onShowToast?.('Lỗi yêu cầu sửa', err.message || 'Không thể yêu cầu sửa ô công việc.');
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSubmissions = async (task: StageTaskDto) => {
    if (historyTaskId === task.id) {
      setHistoryTaskId(null);
      return;
    }
    setHistoryTaskId(task.id);
    setLoadingHistoryTaskId(task.id);
    try {
      const list = await assignmentService.getStageTaskSubmissions(chapterId, task.id);
      setSubmissionsByTaskId((prev) => ({ ...prev, [task.id]: list }));
      const latestComment = pickLatestDecisionComment(list);
      if (latestComment) {
        setReworkCommentsByTask((prev) => ({ ...prev, [task.id]: latestComment }));
      }
      if (
        list.some((s) => Boolean(s.scriptVersionId)) &&
        scriptVersionsLoadedForRef.current !== chapterId
      ) {
        scriptVersionsLoadedForRef.current = chapterId;
        const versions = await chapterService.getScriptVersions(chapterId).catch(() => []);
        const map: Record<string, number> = {};
        for (const v of versions) {
          if (v?.id && typeof v.versionNumber === 'number') {
            map[v.id] = v.versionNumber;
          }
        }
        setScriptVersionMap(map);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải lịch sử nộp của ô công việc.');
    } finally {
      setLoadingHistoryTaskId(null);
    }
  };

  const handleReplaySubmission = async (task: StageTaskDto, sub: StageTaskSubmissionDto) => {
    setReplayingSubmissionId(sub.id);
    try {
      const panelLayout = parseStageTaskPanelLayout(sub.panelLayoutJson);
      const canvasVersions = parseStageTaskCanvasVersions(sub.canvasVersionsJson);
      const targetPageIds = task.pageId
        ? [task.pageId]
        : sortedPages.length > 0
          ? sortedPages.map((p) => p.id)
          : Object.keys(canvasVersions);

      let effectiveSeriesId = seriesId || '';
      if (
        !effectiveSeriesId &&
        (!sub.artworkReferenceIds || sub.artworkReferenceIds.length === 0)
      ) {
        const chap = await chapterService.getChapterById(chapterId).catch(() => null);
        effectiveSeriesId = chap?.seriesId || '';
      }

      const accessUrl = async (assetReferenceId: string) => {
        const link = await artworkService.getArtworkAccessLink(chapterId, assetReferenceId);
        return resolveArtworkUrl(link.url);
      };

      const slides: ImageViewerSlide[] = [];
      for (const pid of targetPageIds) {
        const pageNum = sortedPages.find((p) => p.id === pid)?.pageNumber;
        const title = `Lần nộp #${sub.attemptNumber}${pageNum ? ` · Trang ${pageNum}` : ''}`;
        const arts = await artworkService
          .getArtworks(chapterId, pid, task.pipelineStageId)
          .catch(() => []);
        const pageLayout = panelLayout.filter((p) => p.pageId === pid);
        const panelsForPage =
          pageLayout.length > 0
            ? pageLayout
            : await panelService.getPanelsByPage(pid).catch(() => []);
        const version = canvasVersions[pid];

        if (sub.artworkReferenceIds && sub.artworkReferenceIds.length > 0) {
          const wholePage = arts.find((a) => !a.panelId && sub.artworkReferenceIds.includes(a.id));
          const panelArts = arts.filter(
            (a) => Boolean(a.panelId) && sub.artworkReferenceIds.includes(a.id),
          );
          if (wholePage && (version === undefined || version <= 0)) {
            const src = await accessUrl(wholePage.id).catch(() => '');
            if (src) slides.push({ src, title });
          } else if (wholePage || panelArts.length > 0) {
            const snapshot =
              version !== undefined && version > 0
                ? await elementService.getPageSnapshot(pid, false, version).catch(() => null)
                : null;
            const { dataUrl } = await buildPageComposite({
              panels: panelsForPage,
              artworks: wholePage ? [wholePage, ...panelArts] : panelArts,
              elements: snapshot?.elements ?? [],
              drawText: Boolean(snapshot?.elements?.length),
              getAccessUrl: accessUrl,
            });
            if (dataUrl) slides.push({ src: dataUrl, title });
          }
        } else {
          const baseArts = effectiveSeriesId
            ? await loadPreviousStageArtworks(
                chapterId,
                effectiveSeriesId,
                pid,
                task.pipelineStageId,
              ).catch(() => [])
            : [];
          const snapshot = await elementService
            .getPageSnapshot(pid, false, version !== undefined && version > 0 ? version : undefined)
            .catch(() => null);
          if (snapshot || baseArts.length > 0) {
            const { dataUrl } = await buildPageComposite({
              panels: panelsForPage,
              artworks: baseArts,
              elements: snapshot?.elements ?? [],
              drawText: true,
              getAccessUrl: accessUrl,
            });
            if (dataUrl) slides.push({ src: dataUrl, title });
          }
        }
      }

      if (slides.length > 0) {
        setReplaySlides(slides);
        setReplayOpen(true);
      } else {
        onShowToast?.(
          'Chưa có bản xem lại',
          'Lần nộp này chưa có ảnh hoặc dữ liệu canvas để dựng lại.',
        );
      }
    } catch (err: any) {
      onShowToast?.('Lỗi xem lại lần nộp', err?.message || 'Không thể dựng lại bản nộp.');
    } finally {
      setReplayingSubmissionId(null);
    }
  };

  const handleReopenTask = async (task: StageTaskDto) => {
    const trimmed = reopenReason.trim();
    if (!trimmed) {
      setError('Vui lòng nhập lý do mở lại ô công việc.');
      return;
    }
    setActionLoading(`reopen:${task.id}`);
    setError(null);
    try {
      const res = await assignmentService.reopenStageTask(chapterId, task.id, trimmed);
      setReopeningTaskId(null);
      setReopenReason('');
      const outdatedCount = res.outdatedTaskIds?.length ?? 0;
      onShowToast?.(
        'Đã mở lại ô công việc',
        outdatedCount > 0
          ? `Ô chuyển về Cần sửa; ${outdatedCount} ô hạ nguồn đã gắn cờ đầu vào lỗi thời.`
          : 'Ô công việc đã chuyển về trạng thái Cần sửa (ReworkRequired).',
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể mở lại ô công việc.');
      onShowToast?.('Lỗi mở lại ô việc', err.message || 'Không thể mở lại ô công việc.');
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveImpact = async (task: StageTaskDto, keep: boolean) => {
    setActionLoading(`resolveImpact:${task.id}:${keep ? 'keep' : 'rework'}`);
    setError(null);
    try {
      await assignmentService.resolveStageTaskImpact(chapterId, task.id, keep);
      onShowToast?.(
        'Đã xử lý Impact Review',
        keep
          ? 'Đã giữ kết quả hiện tại và gỡ cờ đầu vào lỗi thời.'
          : 'Đã chuyển ô về Cần sửa (ReworkRequired) và gỡ cờ lỗi thời.',
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể xử lý Impact Review cho ô công việc.');
      onShowToast?.('Lỗi Impact Review', err.message || 'Không thể xử lý Impact Review.');
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnassignTasks = async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setActionLoading(taskIds.length === 1 ? `unassign:${taskIds[0]}` : 'unassignBatch');
    setError(null);
    try {
      const res = await assignmentService.unassignStageTasks(chapterId, taskIds);
      setSelectedUnassignIds((prev) => {
        const next = new Set(prev);
        taskIds.forEach((id) => next.delete(id));
        return next;
      });
      onShowToast?.(
        'Đã bỏ gán ô công việc',
        `Đã đưa ${res.length || taskIds.length} ô về trạng thái Chưa giao (Unassigned).`,
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || 'Không thể bỏ gán ô công việc.');
      onShowToast?.('Lỗi bỏ gán', err.message || 'Không thể bỏ gán ô công việc.');
      if (err?.status === 409) loadGrid();
    } finally {
      setActionLoading(null);
    }
  };

  const renderCell = (stage: TaskGridStageDto, pageId: string | null) => {
    const key = `${stage.id}:${pageId ?? '__CHAPTER__'}`;
    const task = taskMap.get(key);
    if (!task) {
      const cancelled = cancelledTaskMap.get(key);
      if (cancelled) {
        return (
          <div
            data-testid={`cancelled-task-cell-${cancelled.id}`}
            className='w-full min-w-0 box-border p-2 rounded-lg border border-dashed border-stone-200 bg-stone-50/80 text-center text-[11px] text-stone-400 opacity-55 line-through'
          >
            {t('taskGridV3.cancelledCell', 'Đã huỷ')}
          </div>
        );
      }
      return (
        <div className='p-2 text-center text-[11px] text-stone-400 italic'>
          {t('taskGridV3.unassignedCell', 'Chưa sinh ô')}
        </div>
      );
    }

    const meta = STATUS_STYLE[task.status] ?? {
      label: task.status,
      cls: 'bg-stone-100 text-stone-700 border-stone-300',
    };
    const isStageEnabled = stage.isEnabled !== false && enabledStageIds.has(stage.id);
    const isMine = Boolean(currentUserId && task.assigneeUserId === currentUserId);
    const canSelectForLot = isStageEnabled && effectiveIsProducer && task.status === 'Unassigned';
    const canUnassign =
      effectiveIsProducer &&
      (task.status === 'Assigned' ||
        task.status === 'InProgress' ||
        task.status === 'ReworkRequired');
    const canReassign =
      isStageEnabled &&
      effectiveIsProducer &&
      (task.status === 'Assigned' ||
        task.status === 'InProgress' ||
        task.status === 'ReworkRequired');
    const canStart =
      isStageEnabled && (task.status === 'Assigned' || task.status === 'ReworkRequired') && isMine;
    const canSubmit = isStageEnabled && task.status === 'InProgress' && isMine;
    const canWithdraw = isStageEnabled && task.status === 'Submitted' && isMine;
    const isLockedByOtherReviewer = Boolean(
      task.status === 'UnderReview' &&
        task.reviewerUserId &&
        (!currentUserId || task.reviewerUserId !== currentUserId),
    );
    const canReview =
      isStageEnabled &&
      effectiveIsReviewer &&
      (task.status === 'Submitted' || task.status === 'UnderReview') &&
      Boolean(!task.assigneeUserId || (currentUserId && task.assigneeUserId !== currentUserId));
    const canForceReleaseReview =
      isStageEnabled &&
      effectiveIsProducer &&
      task.status === 'UnderReview' &&
      Boolean(task.reviewerUserId && task.reviewerUserId !== currentUserId);
    const canReleaseOwnReview =
      isStageEnabled &&
      effectiveIsReviewer &&
      task.status === 'UnderReview' &&
      Boolean(currentUserId && task.reviewerUserId === currentUserId);
    const canReopen =
      isStageEnabled && effectiveIsProducer && task.status === 'Approved' && !task.isInputOutdated;
    const canResolveImpact = isStageEnabled && effectiveIsProducer && task.isInputOutdated;
    const prereqReadyForImpact = canResolveImpact ? arePrerequisitesApproved(task, stage) : false;

    const isSelectedForLot = selectedUnassignedIds.has(task.id);
    const isSelectedForSubmit = selectedSubmitIds.has(task.id);
    const isSelectedForUnassign = selectedUnassignIds.has(task.id);
    const hasOpenInlineForm =
      requestingChangesTaskId === task.id ||
      reopeningTaskId === task.id ||
      reassigningTaskId === task.id;
    const attemptCount = task.attemptCount ?? 0;
    const latestDecisionComment =
      task.status === 'ReworkRequired'
        ? task.lastDecisionComment?.trim() ||
          reworkCommentsByTask[task.id] ||
          pickLatestDecisionComment(submissionsByTaskId[task.id])
        : null;

    return (
      <div
        data-testid={`task-cell-${stage.id}-${pageId ?? 'chapter'}`}
        title={
          latestDecisionComment
            ? `${t('taskGridV3.lastDecisionLabel', 'Nhận xét lần duyệt gần nhất')}: ${latestDecisionComment}`
            : undefined
        }
        className={`w-full min-w-0 box-border p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 transition-all ${
          hasOpenInlineForm ? 'min-w-[230px]' : ''
        } ${
          isSelectedForLot || isSelectedForSubmit || isSelectedForUnassign
            ? 'ring-2 ring-[#F97316] border-[#F97316] bg-[#FFF7ED]'
            : 'bg-white border-stone-200 hover:border-stone-300'
        }`}
      >
        <div className='flex items-center justify-between gap-1.5'>
          <div className='flex items-center gap-1 flex-wrap'>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${meta.cls}`}>
              {meta.label}
            </span>
            {attemptCount > 0 && (
              <span
                data-testid={`task-attempt-count-${task.id}`}
                className='px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-[10px] font-mono font-semibold text-stone-700'
              >
                {t('taskGridV3.attemptBadge', {
                  count: attemptCount,
                  defaultValue: `Lần nộp #${attemptCount}`,
                })}
              </span>
            )}
          </div>

          <div className='flex items-center gap-1'>
            {canSelectForLot && (
              <input
                type='checkbox'
                aria-label={`Chọn ô ${stage.name}`}
                checked={isSelectedForLot}
                onChange={() => toggleSelectUnassigned(task.id)}
                className='h-3.5 w-3.5 accent-[#F97316] cursor-pointer'
              />
            )}

            {canUnassign && (
              <input
                type='checkbox'
                aria-label={`Chọn bỏ gán ô ${stage.name}`}
                checked={isSelectedForUnassign}
                onChange={() => toggleSelectUnassign(task.id)}
                className='h-3.5 w-3.5 accent-rose-600 cursor-pointer'
              />
            )}

            {canSubmit && !task.isInputOutdated && (
              <input
                type='checkbox'
                aria-label={`Chọn nộp ô ${stage.name}`}
                checked={isSelectedForSubmit}
                onChange={() => toggleSelectSubmit(task.id)}
                className='h-3.5 w-3.5 accent-emerald-600 cursor-pointer'
              />
            )}
          </div>
        </div>

        {task.assigneeUserId && (
          <div
            className='text-[11px] text-stone-700 truncate'
            title={getMemberName(task.assigneeUserId)}
          >
            👤 <span className='font-medium'>{getMemberName(task.assigneeUserId)}</span>
          </div>
        )}

        {isLockedByOtherReviewer && task.reviewerUserId && (
          <div
            data-testid={`under-review-by-${task.id}`}
            className='rounded border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[10px] font-semibold text-indigo-900 flex items-center gap-1'
          >
            <Lock className='h-2.5 w-2.5 shrink-0 text-indigo-600' />
            <span className='truncate'>
              {t('taskGridV3.underReviewBy', {
                name: getMemberName(task.reviewerUserId),
                defaultValue: `Đang được duyệt bởi ${getMemberName(task.reviewerUserId)}`,
              })}
            </span>
          </div>
        )}

        {task.status === 'ReworkRequired' && latestDecisionComment && (
          <div
            data-testid={`rework-decision-comment-${task.id}`}
            title={`${t('taskGridV3.lastDecisionLabel', 'Nhận xét lần duyệt gần nhất')}: ${latestDecisionComment}`}
            className='rounded border border-rose-200 bg-rose-50/80 px-1.5 py-1 text-[10px] leading-snug text-rose-800 line-clamp-2'
          >
            💬{' '}
            <span className='font-semibold'>
              {t('taskGridV3.lastDecisionPrefix', 'Nhận xét gần nhất:')}
            </span>{' '}
            {latestDecisionComment}
          </div>
        )}

        {task.isInputOutdated && (
          <div className='space-y-1'>
            <div
              className='inline-flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900'
              title={task.outdatedReason || 'Công đoạn trước có thay đổi'}
            >
              <AlertTriangle className='h-3 w-3 shrink-0 text-amber-700' />
              <span>Đầu vào lỗi thời</span>
            </div>
            {task.outdatedReason && (
              <div className='text-[10px] text-amber-800 leading-tight'>{task.outdatedReason}</div>
            )}
          </div>
        )}

        {/* Các nút thao tác nhanh trên ô */}
        <div className='flex flex-wrap items-center gap-1 pt-1'>
          {canStart && (
            <button
              type='button'
              disabled={!task.isStartable || actionLoading === `start:${task.id}`}
              onClick={() => handleStartTask(task)}
              title={
                task.isStartable
                  ? 'Bắt đầu làm ô này'
                  : 'Chờ các công đoạn tiền đề cùng trang được duyệt (Approved)'
              }
              className='inline-flex items-center gap-1 rounded bg-[#171717] hover:bg-black text-white px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {actionLoading === `start:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Play className='h-2.5 w-2.5 text-[#F97316]' />
              )}
              <span>{task.isStartable ? 'Bắt đầu' : 'Chờ tiền đề'}</span>
            </button>
          )}

          {canSubmit && (
            <button
              type='button'
              disabled={task.isInputOutdated || actionLoading === `submit:${task.id}`}
              onClick={() => handleSubmitTasks([task.id])}
              title={
                task.isInputOutdated
                  ? 'Đầu vào lỗi thời — cần Producer xử lý Impact Review trước khi nộp'
                  : 'Nộp ô công việc này'
              }
              className='inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {actionLoading === `submit:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Send className='h-2.5 w-2.5' />
              )}
              <span>Nộp</span>
            </button>
          )}

          {canWithdraw && (
            <button
              type='button'
              data-testid={`withdraw-task-btn-${task.id}`}
              disabled={actionLoading === `withdraw:${task.id}`}
              onClick={() => void handleWithdrawTask(task)}
              title='Rút bài đã nộp khi Editor chưa mở duyệt'
              className='inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `withdraw:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Undo2 className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.withdrawBtn', 'Rút bài')}</span>
            </button>
          )}

          {canReview && (
            <>
              <button
                type='button'
                disabled={
                  task.isInputOutdated ||
                  isLockedByOtherReviewer ||
                  actionLoading === `approve:${task.id}`
                }
                onClick={() => handleApproveTask(task)}
                title={
                  isLockedByOtherReviewer
                    ? `Đang được duyệt bởi ${getMemberName(task.reviewerUserId)}`
                    : task.isInputOutdated
                      ? 'Đầu vào lỗi thời — cần xử lý Impact Review trước khi duyệt'
                      : 'Duyệt ô công việc này'
                }
                className='inline-flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                {actionLoading === `approve:${task.id}` ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <CheckCircle2 className='h-2.5 w-2.5' />
                )}
                <span>Duyệt</span>
              </button>

              {requestingChangesTaskId !== task.id && (
                <button
                  type='button'
                  disabled={
                    isLockedByOtherReviewer || actionLoading === `requestChanges:${task.id}`
                  }
                  onClick={() => {
                    setRequestingChangesTaskId(task.id);
                    setRequestChangesComment('');
                  }}
                  title={
                    isLockedByOtherReviewer
                      ? `Đang được duyệt bởi ${getMemberName(task.reviewerUserId)}`
                      : 'Yêu cầu sửa kèm nhận xét bắt buộc (BR-06)'
                  }
                  className='inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                >
                  <XCircle className='h-2.5 w-2.5' />
                  <span>Yêu cầu sửa</span>
                </button>
              )}
            </>
          )}

          {canReleaseOwnReview && (
            <button
              type='button'
              data-testid={`release-review-btn-${task.id}`}
              disabled={actionLoading === `releaseReview:${task.id}`}
              onClick={() => void handleReleaseReview(task)}
              title='Nhả khoá duyệt để trả ô về hàng đợi Chờ duyệt'
              className='inline-flex items-center gap-1 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `releaseReview:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Unlock className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.releaseReviewBtn', 'Nhả khoá duyệt')}</span>
            </button>
          )}

          {canForceReleaseReview && (
            <button
              type='button'
              data-testid={`force-release-review-btn-${task.id}`}
              disabled={actionLoading === `releaseReview:${task.id}`}
              onClick={() => void handleReleaseReview(task)}
              title='Producer gỡ khoá duyệt đang giữ bởi Editor khác'
              className='inline-flex items-center gap-1 rounded border border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-900 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `releaseReview:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Unlock className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.forceReleaseReviewBtn', 'Gỡ khoá duyệt')}</span>
            </button>
          )}

          {canReopen && reopeningTaskId !== task.id && (
            <button
              type='button'
              onClick={() => {
                setReopeningTaskId(task.id);
                setReopenReason('');
              }}
              title='Mở lại ô đã duyệt (Producer)'
              className='inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2 py-1 text-[10px] font-semibold cursor-pointer'
            >
              <RotateCcw className='h-2.5 w-2.5' />
              <span>Mở lại</span>
            </button>
          )}

          {canReassign && reassigningTaskId !== task.id && (
            <button
              type='button'
              data-testid={`reassign-task-btn-${task.id}`}
              disabled={task.isInputOutdated || actionLoading === `reassign:${task.id}`}
              onClick={() => openReassignForm(task, stage)}
              title={
                task.isInputOutdated
                  ? 'Đầu vào lỗi thời — cần xử lý Impact Review trước khi đổi người'
                  : 'Đổi người nhận cho ô chưa nộp (reassign: true)'
              }
              className='inline-flex items-center gap-1 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 text-[#C2410C] px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              <UserCheck className='h-2.5 w-2.5' />
              <span>{t('taskGridV3.reassignBtn', 'Đổi người')}</span>
            </button>
          )}

          {canUnassign && (
            <button
              type='button'
              disabled={actionLoading === `unassign:${task.id}`}
              onClick={() => handleUnassignTasks([task.id])}
              title='Bỏ gán người nhận khỏi ô này (đưa về Chưa giao)'
              className='inline-flex items-center gap-1 rounded border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `unassign:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <UserMinus className='h-2.5 w-2.5' />
              )}
              <span>Bỏ gán</span>
            </button>
          )}

          {(task.status !== 'Unassigned' && task.status !== 'Assigned') || task.startedAt ? (
            <button
              type='button'
              onClick={() => void handleToggleSubmissions(task)}
              title='Xem lịch sử các lần nộp của ô này'
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                historyTaskId === task.id
                  ? 'border-stone-800 bg-stone-800 text-white'
                  : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-600'
              }`}
            >
              <History className='h-2.5 w-2.5' />
              <span>Lịch sử nộp</span>
            </button>
          ) : null}
        </div>

        {/* Form nhập nhận xét Yêu cầu sửa (Editor/Producer - BR-06) — chiếm toàn chiều rộng ô, nút tự xuống dòng không bị cắt */}
        {requestingChangesTaskId === task.id && (
          <div
            data-testid={`request-changes-form-${task.id}`}
            className='mt-1 w-full min-w-0 box-border rounded border border-rose-300 bg-rose-50 p-2 space-y-1.5'
          >
            <textarea
              rows={2}
              value={requestChangesComment}
              onChange={(e) => setRequestChangesComment(e.target.value)}
              placeholder='Nhập nhận xét yêu cầu sửa (bắt buộc)...'
              aria-label='Nhận xét yêu cầu sửa'
              className='block w-full min-w-0 box-border resize-y rounded border border-rose-300 bg-white px-2 py-1.5 text-[11px] leading-snug text-stone-900'
            />
            <div className='flex flex-wrap items-center justify-end gap-1.5 pt-0.5'>
              <button
                type='button'
                onClick={() => {
                  setRequestingChangesTaskId(null);
                  setRequestChangesComment('');
                }}
                className='shrink-0 whitespace-nowrap rounded border border-stone-300 bg-white px-2.5 py-1 text-[10px] font-medium text-stone-700 cursor-pointer'
              >
                Huỷ
              </button>
              <button
                type='button'
                disabled={actionLoading === `requestChanges:${task.id}`}
                onClick={() => void handleRequestChanges(task)}
                className='shrink-0 whitespace-nowrap rounded bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
              >
                {actionLoading === `requestChanges:${task.id}` ? 'Đang gửi...' : 'Xác nhận trả về'}
              </button>
            </div>
          </div>
        )}

        {/* Lịch sử các lần nộp của ô (Lát cắt 2b) */}
        {historyTaskId === task.id && (
          <div
            data-testid={`task-submissions-${task.id}`}
            className='mt-1 rounded border border-stone-200 bg-stone-50 p-2 space-y-1.5 text-[10px]'
          >
            <div className='font-bold text-stone-800'>Lịch sử nộp bài</div>
            {loadingHistoryTaskId === task.id ? (
              <div className='flex items-center gap-1 text-stone-500'>
                <Loader2 className='h-3 w-3 animate-spin' />
                <span>Đang tải lịch sử...</span>
              </div>
            ) : (submissionsByTaskId[task.id] || []).length === 0 ? (
              <div className='text-stone-500 italic'>Chưa có bản nộp nào.</div>
            ) : (
              <div className='space-y-1'>
                {(submissionsByTaskId[task.id] || []).map((sub) => {
                  const parsedPanels = parseStageTaskPanelLayout(sub.panelLayoutJson);
                  const parsedCanvasVersions = parseStageTaskCanvasVersions(sub.canvasVersionsJson);
                  const panelCount = task.pageId
                    ? parsedPanels.filter((p) => !p.pageId || p.pageId === task.pageId).length
                    : parsedPanels.length;
                  const scriptVersionNum = sub.scriptVersionId
                    ? scriptVersionMap[sub.scriptVersionId]
                    : undefined;
                  const canReplay =
                    (sub.artworkReferenceIds?.length ?? 0) > 0 ||
                    Object.keys(parsedCanvasVersions).length > 0;

                  return (
                    <div
                      key={sub.id}
                      className='rounded border border-stone-200 bg-white p-1.5 space-y-0.5'
                    >
                      <div className='flex items-center justify-between gap-1'>
                        <span className='font-bold text-stone-800'>Lần #{sub.attemptNumber}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-semibold ${
                            sub.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sub.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700'
                                : sub.status === 'Pending'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {sub.status === 'Approved'
                            ? 'Đã duyệt'
                            : sub.status === 'Rejected'
                              ? 'Từ chối'
                              : sub.status === 'Pending'
                                ? 'Chờ duyệt'
                                : 'Bản cũ'}
                        </span>
                      </div>
                      <div className='text-stone-500'>
                        Người nộp: {getMemberName(sub.submittedByUserId)} •{' '}
                        {sub.artworkReferenceIds?.length ?? 0} ảnh
                      </div>
                      <div className='flex flex-wrap items-center justify-between gap-1 text-stone-600'>
                        <span>
                          {scriptVersionNum !== undefined && (
                            <>
                              <span className='font-semibold text-indigo-700'>
                                Kịch bản: v{scriptVersionNum}
                              </span>
                              {' • '}
                            </>
                          )}
                          <span>Số panel lúc nộp: {panelCount}</span>
                        </span>
                        {canReplay && (
                          <button
                            type='button'
                            data-testid={`replay-submission-${sub.id}`}
                            disabled={replayingSubmissionId === sub.id}
                            onClick={() => void handleReplaySubmission(task, sub)}
                            className='inline-flex items-center gap-0.5 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700 disabled:opacity-50 cursor-pointer'
                            title='Xem lại trang theo bố cục panel và phiên bản canvas lúc nộp'
                          >
                            {replayingSubmissionId === sub.id ? (
                              <Loader2 className='h-2.5 w-2.5 animate-spin' />
                            ) : (
                              <Eye className='h-2.5 w-2.5' />
                            )}
                            <span>Xem lại</span>
                          </button>
                        )}
                      </div>
                      {sub.decisionComment && (
                        <div className='text-rose-800 bg-rose-50/70 rounded px-1.5 py-0.5 mt-0.5'>
                          💬 {sub.decisionComment}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Impact Review (Keep / Rework) cho Producer khi ô mang cờ isInputOutdated */}
        {canResolveImpact && (
          <div className='mt-1 rounded border border-amber-200 bg-amber-50/70 p-1.5 space-y-1'>
            <div className='text-[10px] font-semibold text-amber-900'>
              Impact Review {prereqReadyForImpact ? '' : '(chờ tiền đề duyệt lại)'}
            </div>
            <div className='flex flex-wrap items-center gap-1'>
              <button
                type='button'
                disabled={
                  !prereqReadyForImpact || actionLoading === `resolveImpact:${task.id}:keep`
                }
                onClick={() => handleResolveImpact(task, true)}
                title={
                  prereqReadyForImpact
                    ? 'Giữ kết quả hiện tại và xoá cờ lỗi thời'
                    : 'Công đoạn tiền đề chưa được duyệt lại'
                }
                className='inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                <Check className='h-2.5 w-2.5' />
                <span>Giữ kết quả</span>
              </button>
              <button
                type='button'
                disabled={
                  !prereqReadyForImpact || actionLoading === `resolveImpact:${task.id}:rework`
                }
                onClick={() => handleResolveImpact(task, false)}
                title={
                  prereqReadyForImpact
                    ? 'Yêu cầu làm lại (chuyển về Cần sửa) và xoá cờ lỗi thời'
                    : 'Công đoạn tiền đề chưa được duyệt lại'
                }
                className='inline-flex items-center gap-1 rounded bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                <RotateCcw className='h-2.5 w-2.5' />
                <span>Làm lại</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Đổi người cho ô chưa nộp (Producer — reassign: true) */}
        {reassigningTaskId === task.id && (
          <div
            data-testid={`reassign-task-form-${task.id}`}
            className='mt-1 w-full min-w-0 box-border rounded border border-orange-300 bg-orange-50/80 p-2 space-y-1.5'
          >
            <div className='text-[10px] font-bold text-stone-900'>
              {t('taskGridV3.reassignTitle', 'Đổi người nhận ô việc')}
            </div>
            <select
              aria-label={t('taskGridV3.reassignSelectLabel', 'Người nhận mới')}
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              className='block w-full min-w-0 rounded border border-orange-300 bg-white px-2 py-1 text-[11px] text-stone-900'
            >
              <option value=''>-- Chọn thành viên --</option>
              {activeMembers
                .filter(
                  (m) =>
                    !stage.allowedRole ||
                    String(m.role || '').toUpperCase() === String(stage.allowedRole).toUpperCase(),
                )
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName || m.email.split('@')[0]} ({m.role})
                    {m.userId === task.assigneeUserId ? ' – Hiện tại' : ''}
                  </option>
                ))}
            </select>
            <input
              type='text'
              aria-label='Brief lô mới'
              value={reassignBrief}
              onChange={(e) => setReassignBrief(e.target.value)}
              placeholder='Brief lô mới (tuỳ chọn)...'
              className='block w-full min-w-0 rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-900'
            />
            <input
              type='date'
              aria-label='Hạn lô mới'
              value={reassignDueDate}
              onChange={(e) => setReassignDueDate(e.target.value)}
              className='block w-full min-w-0 rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-900'
            />
            <div className='flex flex-wrap items-center justify-end gap-1.5 pt-0.5'>
              <button
                type='button'
                onClick={() => setReassigningTaskId(null)}
                className='shrink-0 whitespace-nowrap rounded border border-stone-300 bg-white px-2.5 py-1 text-[10px] font-medium text-stone-700 cursor-pointer'
              >
                Huỷ
              </button>
              <button
                type='button'
                data-testid={`confirm-reassign-task-${task.id}`}
                disabled={!reassignUserId || actionLoading === `reassign:${task.id}`}
                onClick={() => void handleReassignTask(task, stage)}
                className='shrink-0 whitespace-nowrap rounded bg-[#EA580C] hover:bg-[#C2410C] text-white px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
              >
                {actionLoading === `reassign:${task.id}`
                  ? 'Đang đổi...'
                  : t('taskGridV3.reassignConfirmBtn', 'Xác nhận đổi người')}
              </button>
            </div>
          </div>
        )}

        {/* Form nhập lý do Mở lại (Producer) */}
        {reopeningTaskId === task.id && (
          <div className='mt-1 w-full min-w-0 box-border rounded border border-amber-300 bg-amber-50 p-2 space-y-1.5'>
            <textarea
              rows={2}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder='Nhập lý do mở lại...'
              aria-label='Lý do mở lại'
              className='block w-full min-w-0 box-border resize-y rounded border border-amber-300 bg-white px-2 py-1.5 text-[11px] leading-snug text-stone-900'
            />
            <div className='flex flex-wrap items-center justify-end gap-1.5 pt-0.5'>
              <button
                type='button'
                onClick={() => {
                  setReopeningTaskId(null);
                  setReopenReason('');
                }}
                className='shrink-0 whitespace-nowrap rounded border border-stone-300 bg-white px-2.5 py-1 text-[10px] font-medium text-stone-700 cursor-pointer'
              >
                Huỷ
              </button>
              <button
                type='button'
                disabled={actionLoading === `reopen:${task.id}`}
                onClick={() => handleReopenTask(task)}
                className='shrink-0 whitespace-nowrap rounded bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
              >
                {actionLoading === `reopen:${task.id}` ? 'Đang mở...' : 'Xác nhận mở lại'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeTasks = useMemo(
    () =>
      grid
        ? grid.tasks.filter(
            (t) => t.status !== 'Cancelled' && enabledStageIds.has(t.pipelineStageId),
          )
        : [],
    [grid, enabledStageIds],
  );
  const approvedCount = useMemo(
    () => activeTasks.filter((t) => t.status === 'Approved').length,
    [activeTasks],
  );
  const outdatedCount = useMemo(
    () => activeTasks.filter((t) => t.isInputOutdated).length,
    [activeTasks],
  );

  return (
    <div className='space-y-4' data-testid='task-grid-board'>
      {/* Thanh công cụ trên cùng */}
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-[#FCFBF8] p-3.5 shadow-2xs'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Grid className='h-4 w-4 text-[#F97316]' />
            <span className='font-bold text-sm text-stone-900'>
              Lưới Giao Việc V3 (Trang × Công đoạn)
            </span>
          </div>
          {grid && (
            <span className='rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-mono font-semibold text-stone-700'>
              Đã duyệt: {approvedCount}/{activeTasks.length} ô
            </span>
          )}
          {outdatedCount > 0 && (
            <span
              data-testid='outdated-tasks-badge'
              className='rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-900 inline-flex items-center gap-1'
            >
              <AlertTriangle className='h-3.5 w-3.5 text-amber-600' />
              <span>{outdatedCount} ô đầu vào lỗi thời cần Impact Review</span>
            </span>
          )}
          {disabledStageTasks.length > 0 && (
            <span
              data-testid='disabled-stage-tasks-note'
              title='Các ô thuộc công đoạn đã tắt (isEnabled = false) được ẩn khỏi lưới và không cho giao việc'
              className='rounded-lg bg-stone-100/80 border border-dashed border-stone-300 px-2.5 py-1 text-[11px] text-stone-500 opacity-75'
            >
              Đang ẩn {disabledStageTasks.length} ô thuộc công đoạn đã tắt
            </span>
          )}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {effectiveIsProducer && selectedUnassignIds.size > 0 && (
            <button
              type='button'
              disabled={actionLoading === 'unassignBatch'}
              onClick={() => handleUnassignTasks([...selectedUnassignIds])}
              className='inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50'
            >
              {actionLoading === 'unassignBatch' ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <UserMinus className='h-3.5 w-3.5' />
              )}
              <span>Bỏ gán {selectedUnassignIds.size} ô đã chọn</span>
            </button>
          )}

          {selectedSubmitIds.size > 0 && (
            <button
              type='button'
              disabled={actionLoading === 'submitBatch'}
              onClick={() => handleSubmitTasks([...selectedSubmitIds])}
              className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50'
            >
              {actionLoading === 'submitBatch' ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Send className='h-3.5 w-3.5' />
              )}
              <span>Nộp {selectedSubmitIds.size} ô đã chọn</span>
            </button>
          )}

          {effectiveIsProducer && (
            <>
              <button
                type='button'
                data-testid='migrate-v2-assignments-btn'
                disabled={actionLoading === 'migrateAssignments'}
                onClick={handleMigrateAssignments}
                title='Chuyển các phân công V2 còn sống của toàn Series thành lô trên Lưới V3'
                className='inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50'
              >
                {actionLoading === 'migrateAssignments' ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : (
                  <RotateCcw className='h-3.5 w-3.5 text-[#F97316]' />
                )}
                <span>Chuyển việc cũ (V2 → Lưới)</span>
              </button>

              <button
                type='button'
                disabled={actionLoading === 'generate'}
                onClick={handleGenerate}
                className='inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50'
              >
                {actionLoading === 'generate' ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : (
                  <Sparkles className='h-3.5 w-3.5' />
                )}
                <span>Sinh / Đồng bộ ô việc</span>
              </button>
            </>
          )}

          <button
            type='button'
            onClick={loadGrid}
            disabled={loading}
            className='inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-2.5 py-1.5 text-xs font-semibold cursor-pointer'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role='alert'
          className='flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800'
        >
          <AlertCircle className='h-4 w-4 shrink-0 text-rose-600' />
          <span>{error}</span>
        </div>
      )}

      {/* Bảng điều khiển Giao Lô / Chia Đều cho Producer khi có chọn ô Unassigned */}
      {effectiveIsProducer && selectedUnassignedIds.size > 0 && (
        <div className='rounded-xl border border-[#FDBA74] bg-[#FFF7ED] p-4 space-y-3 shadow-xs'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2 text-xs font-bold text-stone-900'>
              <Users className='h-4 w-4 text-[#F97316]' />
              <span>
                Giao lô cho {selectedUnassignedIds.size} ô đang chọn
                {requiredRoleForSelection ? ` (Vai trò: ${requiredRoleForSelection})` : ''}
              </span>
            </div>
            <button
              type='button'
              onClick={() => {
                setSelectedUnassignedIds(new Set());
                setDryRunPreview(null);
              }}
              className='text-xs text-stone-500 hover:text-stone-900 underline cursor-pointer'
            >
              Bỏ chọn tất cả ô
            </button>
          </div>

          <div className='space-y-1.5'>
            <div className='text-[11px] font-semibold text-stone-700'>
              Chọn 1 hoặc nhiều thành viên (chọn nhiều người để tự động chia đều số ô):
            </div>
            <div className='flex flex-wrap gap-2'>
              {eligibleAssignees.length === 0 ? (
                <span className='text-xs text-rose-700'>
                  Không có thành viên Active khớp vai trò {requiredRoleForSelection || ''}.
                </span>
              ) : (
                eligibleAssignees.map((m) => {
                  const checked = selectedAssigneeIds.includes(m.userId);
                  return (
                    <label
                      key={m.userId}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'border-[#F97316] bg-white font-bold text-stone-900'
                          : 'border-stone-200 bg-white/70 text-stone-700 hover:bg-white'
                      }`}
                    >
                      <input
                        type='checkbox'
                        aria-label={`Giao cho ${m.fullName || m.email.split('@')[0]}`}
                        checked={checked}
                        onChange={() => toggleAssignee(m.userId)}
                        className='h-3.5 w-3.5 accent-[#F97316]'
                      />
                      <span>{m.fullName || m.email.split('@')[0]}</span>
                      <span className='text-[10px] text-stone-400 font-mono'>({m.role})</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className='block text-[11px] font-semibold text-stone-700 mb-1'>
                Yêu cầu lô việc (Brief)
              </label>
              <input
                type='text'
                value={lotBrief}
                onChange={(e) => setLotBrief(e.target.value)}
                placeholder='Ghi chú hướng dẫn cho lô công việc này...'
                className='w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs'
              />
            </div>
            <div>
              <label className='block text-[11px] font-semibold text-stone-700 mb-1'>
                Hạn hoàn thành (Due Date)
              </label>
              <input
                type='date'
                value={lotDueDate}
                onChange={(e) => setLotDueDate(e.target.value)}
                className='w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs'
              />
            </div>
          </div>

          {dryRunPreview && (
            <div className='rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 font-medium'>
              ✓ Kiểm tra hợp lệ: sẵn sàng giao {dryRunPreview.taskCount} ô vào{' '}
              {dryRunPreview.lotCount} lô.
            </div>
          )}

          <div className='flex flex-wrap items-center justify-end gap-2 pt-1'>
            <button
              type='button'
              disabled={actionLoading === 'dryRun' || selectedAssigneeIds.length === 0}
              onClick={() => handleAssignLots(true)}
              className='rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === 'dryRun' ? 'Đang kiểm tra...' : 'Kiểm tra thử (Dry Run)'}
            </button>
            <button
              type='button'
              disabled={actionLoading === 'assignLots' || selectedAssigneeIds.length === 0}
              onClick={() => handleAssignLots(false)}
              className='rounded-lg bg-[#171717] hover:bg-black text-white px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === 'assignLots'
                ? 'Đang giao...'
                : selectedAssigneeIds.length > 1
                  ? `Chia đều & Giao (${selectedAssigneeIds.length} người)`
                  : 'Giao lô công việc'}
            </button>
          </div>
        </div>
      )}

      {/* Danh sách Lô công việc (Lots) hiện có */}
      {grid && grid.lots.length > 0 && (
        <div className='rounded-xl border border-stone-200 bg-white p-3.5 space-y-2'>
          <div className='text-xs font-bold text-stone-800'>
            Lô công việc đã giao ({grid.lots.length} lô)
          </div>
          <div className='flex flex-wrap gap-2'>
            {grid.lots.map((lot) => {
              const stg = grid.stages.find((s) => s.id === lot.pipelineStageId);
              const isLotStageDisabled =
                stg?.isEnabled === false || !enabledStageIds.has(lot.pipelineStageId);
              const lotCells = grid.tasks.filter(
                (t) => t.lotId === lot.id && t.status !== 'Cancelled',
              );
              const lotPageNums = lotCells
                .map((t) => sortedPages.find((p) => p.id === t.pageId)?.pageNumber)
                .filter((n): n is number => n !== undefined)
                .sort((a, b) => a - b);
              const lotScopeText =
                lotCells.length > 0 && lotCells.every((t) => !t.pageId)
                  ? 'Toàn chương'
                  : lotPageNums.length > 0
                    ? formatPageRangeLabel(lotPageNums)
                    : null;
              return (
                <div
                  key={lot.id}
                  data-testid={`grid-lot-pill-${lot.id}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] flex items-center gap-2 ${
                    isLotStageDisabled
                      ? 'border-dashed border-stone-300 bg-stone-100/60 text-stone-400 opacity-50'
                      : lot.isOverdue
                        ? 'border-rose-300 bg-rose-50 text-rose-900'
                        : lot.status === 'Completed'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className='font-bold'>{stg?.name || 'Stage'}</span>
                  {isLotStageDisabled && (
                    <span className='rounded bg-stone-200 px-1 py-0.2 text-[9px] font-mono text-stone-600'>
                      Đã tắt
                    </span>
                  )}
                  <span>•</span>
                  <span>{getMemberName(lot.assigneeUserId)}</span>
                  {lotScopeText && <span className='font-medium'>{`• ${lotScopeText}`}</span>}
                  <span className='font-mono font-semibold'>
                    ({lot.approvedCount}/{lot.taskCount})
                  </span>
                  {lot.dueDate && (
                    <span className='inline-flex items-center gap-0.5 text-[10px] text-stone-500'>
                      <Clock className='h-3 w-3' />
                      {new Date(lot.dueDate).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                  {lot.brief && (
                    <span
                      className='max-w-[160px] truncate text-[10px] italic text-stone-500'
                      title={lot.brief}
                    >
                      “{lot.brief}”
                    </span>
                  )}
                  {effectiveIsProducer && lot.status !== 'Closed' && (
                    <button
                      type='button'
                      data-testid={`edit-lot-btn-${lot.id}`}
                      onClick={() =>
                        editingLotId === lot.id ? setEditingLotId(null) : openEditLotForm(lot)
                      }
                      title='Sửa hạn hoàn thành và ghi chú (Brief) của lô'
                      className='inline-flex items-center gap-0.5 rounded border border-stone-300 bg-white hover:bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 cursor-pointer'
                    >
                      <Pencil className='h-2.5 w-2.5' />
                      <span>{t('taskGridV3.editLotBtn', 'Sửa lô')}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {effectiveIsProducer &&
            editingLotId &&
            (() => {
              const editingLot = grid.lots.find((l) => l.id === editingLotId);
              if (!editingLot) return null;
              const stg = grid.stages.find((s) => s.id === editingLot.pipelineStageId);
              return (
                <div
                  data-testid={`edit-lot-form-${editingLot.id}`}
                  className='mt-2 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] p-3 space-y-2.5 text-xs'
                >
                  <div className='font-bold text-stone-900'>
                    {t('taskGridV3.editLotTitle', 'Sửa hạn & ghi chú lô')} — {stg?.name || 'Stage'}{' '}
                    ({getMemberName(editingLot.assigneeUserId)})
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-[11px] font-semibold text-stone-700 mb-1'>
                        Yêu cầu lô việc (Brief)
                      </label>
                      <input
                        type='text'
                        aria-label='Brief của lô'
                        value={editLotBrief}
                        onChange={(e) => setEditLotBrief(e.target.value)}
                        placeholder='Nhập yêu cầu / hướng dẫn cho lô...'
                        className='w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-900'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='block text-[11px] font-semibold text-stone-700'>
                        Hạn hoàn thành (Due Date)
                      </label>
                      <input
                        type='date'
                        aria-label='Hạn hoàn thành lô'
                        disabled={editLotClearDueDate}
                        value={editLotDueDate}
                        onChange={(e) => setEditLotDueDate(e.target.value)}
                        className='w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-900 disabled:opacity-50'
                      />
                      <label className='inline-flex items-center gap-1.5 text-[11px] text-stone-700 cursor-pointer'>
                        <input
                          type='checkbox'
                          aria-label={t('taskGridV3.clearDueDateLabel', 'Xoá hạn hoàn thành')}
                          checked={editLotClearDueDate}
                          onChange={(e) => setEditLotClearDueDate(e.target.checked)}
                          className='h-3.5 w-3.5 accent-[#F97316]'
                        />
                        <span>{t('taskGridV3.clearDueDateLabel', 'Xoá hạn hoàn thành')}</span>
                      </label>
                    </div>
                  </div>
                  <div className='flex items-center justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => setEditingLotId(null)}
                      className='rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 cursor-pointer'
                    >
                      Huỷ
                    </button>
                    <button
                      type='button'
                      data-testid={`save-lot-btn-${editingLot.id}`}
                      disabled={actionLoading === `updateLot:${editingLot.id}`}
                      onClick={() => void handleUpdateLot(editingLot)}
                      className='rounded-lg bg-[#171717] hover:bg-black text-white px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer'
                    >
                      {actionLoading === `updateLot:${editingLot.id}`
                        ? 'Đang lưu...'
                        : t('taskGridV3.saveLotBtn', 'Lưu thay đổi lô')}
                    </button>
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {/* Bảng Lưới Trang × Công đoạn */}
      {loading && !grid ? (
        <div className='py-12 text-center text-stone-500 text-xs'>
          <Loader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-[#F97316]' />
          <span>Đang tải lưới công việc...</span>
        </div>
      ) : !grid || (activeTasks.length === 0 && grid.pages.length === 0) ? (
        <div className='rounded-xl border border-dashed border-stone-300 bg-[#FCFBF8] p-8 text-center space-y-2'>
          <div className='font-bold text-sm text-stone-800'>
            Chương này chưa có ô công việc nào trên lưới V3
          </div>
          <p className='text-xs text-stone-500'>
            {effectiveIsProducer
              ? 'Bấm "Sinh / Đồng bộ ô việc" ở góc trên để khởi tạo lưới Trang × Công đoạn cho chương.'
              : 'Producer chưa khởi tạo lưới ô công việc cho chương này.'}
          </p>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs'>
          <table className='w-full border-collapse text-left text-xs'>
            <thead>
              <tr className='border-b border-stone-200 bg-[#FAF8F5]'>
                <th className='sticky left-0 z-10 bg-[#FAF8F5] px-3 py-2.5 font-bold text-stone-700 border-r border-stone-200 min-w-[110px]'>
                  Phạm vi / Trang
                </th>
                {visibleStages.map((stage) => {
                  const unassignedCount = grid.tasks.filter(
                    (t) => t.pipelineStageId === stage.id && t.status === 'Unassigned',
                  ).length;
                  return (
                    <th
                      key={stage.id}
                      className='px-3 py-2.5 border-r border-stone-200 min-w-[190px] align-top'
                    >
                      <div className='flex items-center justify-between gap-1'>
                        <span className='font-bold text-stone-900'>
                          {stage.stageOrder}. {stage.name}
                        </span>
                        {stage.track && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                              stage.track === 'A'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                            }`}
                          >
                            Nhánh {stage.track}
                          </span>
                        )}
                      </div>
                      <div className='mt-1 flex flex-wrap items-center gap-1 text-[10px] text-stone-500 font-normal'>
                        {stage.allowedRole && (
                          <span className='rounded bg-stone-200/70 px-1.5 py-0.2 font-mono text-stone-700'>
                            {stage.allowedRole}
                          </span>
                        )}
                        {stage.isApprovalGate && (
                          <span className='inline-flex items-center gap-0.5 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-amber-800 font-semibold'>
                            <Shield className='h-2.5 w-2.5' /> Gate
                          </span>
                        )}
                      </div>
                      {effectiveIsProducer && unassignedCount > 0 && (
                        <button
                          type='button'
                          onClick={() => toggleSelectStageColumn(stage.id)}
                          className='mt-1.5 text-[10px] font-semibold text-[#C2410C] hover:underline cursor-pointer'
                        >
                          Chọn cột ({unassignedCount} ô trống)
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className='divide-y divide-stone-200'>
              {hasChapterRow && (
                <tr className='bg-stone-50/60'>
                  <td className='sticky left-0 z-10 bg-stone-100 px-3 py-2.5 font-bold text-stone-800 border-r border-stone-200'>
                    Toàn chương
                  </td>
                  {visibleStages.map((stage) => (
                    <td key={stage.id} className='p-2 border-r border-stone-200 align-top'>
                      {stage.granularity === 'Chapter' || taskMap.has(`${stage.id}:__CHAPTER__`) ? (
                        renderCell(stage, null)
                      ) : (
                        <div className='p-2 text-center text-[10px] text-stone-300'>—</div>
                      )}
                    </td>
                  ))}
                </tr>
              )}

              {sortedPages.map((page) => (
                <tr key={page.id} className='hover:bg-stone-50/40'>
                  <td className='sticky left-0 z-10 bg-white px-3 py-2.5 font-semibold text-stone-800 border-r border-stone-200'>
                    Trang {page.pageNumber}
                  </td>
                  {visibleStages.map((stage) => (
                    <td key={stage.id} className='p-2 border-r border-stone-200 align-top'>
                      {stage.granularity === 'Page' || taskMap.has(`${stage.id}:${page.id}`) ? (
                        renderCell(stage, page.id)
                      ) : (
                        <div className='p-2 text-center text-[10px] text-stone-300'>
                          Theo chương
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImageViewerLightbox
        isOpen={replayOpen}
        onClose={() => setReplayOpen(false)}
        slides={replaySlides}
      />
    </div>
  );
};
