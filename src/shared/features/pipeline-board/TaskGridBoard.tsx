// src/shared/features/pipeline-board/TaskGridBoard.tsx
import { Link } from 'react-router-dom';
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
  Wand2,
  XCircle,
} from 'lucide-react';
import {
  assignmentService,
  type AssignStageTaskLotsRequest,
  type AutoAssignPlanDto,
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
  resolveReworkReasonDisplay,
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
import { aiAgentsService, type AiSuggestionDto } from '@/services/aiAgents.service';
import { SuggestionCard } from '@/shared/features/ai-agents/SuggestionCard';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { AutoAssignModal } from './AutoAssignModal';

const SCRIPT_CHANGED_REASON = 'Kịch bản của trang đã được sửa sau khi mở lại kịch bản.';

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
  /** Chương đã qua Gate 3 (khoá): ẩn mọi thao tác sửa lưới, Backend cũng trả 409 */
  isChapterLocked?: boolean;
}

const STATUS_STYLE: Record<StageTaskStatus, { labelKey: string; cls: string }> = {
  Unassigned: {
    labelKey: 'taskGridV3.status.Unassigned',
    cls: 'bg-stone-100 text-stone-600 border-stone-300',
  },
  Assigned: {
    labelKey: 'taskGridV3.status.Assigned',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  InProgress: {
    labelKey: 'taskGridV3.status.InProgress',
    cls: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  Submitted: {
    labelKey: 'taskGridV3.status.Submitted',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  UnderReview: {
    labelKey: 'taskGridV3.status.UnderReview',
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  Approved: {
    labelKey: 'taskGridV3.status.Approved',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  ReworkRequired: {
    labelKey: 'taskGridV3.status.ReworkRequired',
    cls: 'bg-rose-50 text-rose-700 border-rose-300',
  },
  Cancelled: {
    labelKey: 'taskGridV3.status.Cancelled',
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
  isChapterLocked = false,
}) => {
  const { t, lang } = useTranslation('pipeline');
  const confirm = useConfirm();
  const [grid, setGrid] = useState<TaskGridDto | null>(null);
  const [reworkCommentsByTask, setReworkCommentsByTask] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorIsConflict, setErrorIsConflict] = useState(false);

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

  // Smart Ripple AI: gợi ý Keep / Rework cho ô isInputOutdated do sửa kịch bản (Producer)
  const [impactSuggestionsByTask, setImpactSuggestionsByTask] = useState<
    Record<string, AiSuggestionDto>
  >({});
  const [impactErrorsByTask, setImpactErrorsByTask] = useState<Record<string, string>>({});

  // Giao tự động (Producer / Editor trên chương chưa khoá)
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignPlan, setAutoAssignPlan] = useState<AutoAssignPlanDto | null>(null);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [autoAssignSubmitting, setAutoAssignSubmitting] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);
  const [autoAssignConflict, setAutoAssignConflict] = useState(false);
  const autoAssignSubmittingRef = useRef(false);
  const autoAssignLoadSeqRef = useRef(0);

  useEffect(() => {
    setImpactSuggestionsByTask({});
    setImpactErrorsByTask({});
    autoAssignLoadSeqRef.current += 1;
    setAutoAssignOpen(false);
    setAutoAssignPlan(null);
    setAutoAssignLoading(false);
    setAutoAssignError(null);
    setAutoAssignConflict(false);
  }, [chapterId]);

  // Phân quyền tách biệt (Lưới V3):
  // - Producer-only: sinh/đồng bộ ô, bỏ gán, mở lại, xử lý Impact Review (+ Smart Ripple AI), đổi người (reassign)
  // - Producer + Editor: xem/giao tự động, giao thủ công ô chưa giao, sửa brief/hạn lô, duyệt bài
  const normalizedUserRole = currentUserRole ? String(currentUserRole).trim().toUpperCase() : '';
  const isProducerOnly =
    !isChapterLocked &&
    (normalizedUserRole ? normalizedUserRole === 'PRODUCER' : Boolean(isProducer));
  const canCoordinateAssign =
    !isChapterLocked &&
    (normalizedUserRole
      ? normalizedUserRole === 'PRODUCER' || normalizedUserRole === 'EDITOR'
      : Boolean(isProducer || isEditor));
  const effectiveIsReviewer = normalizedUserRole
    ? normalizedUserRole === 'PRODUCER' || normalizedUserRole === 'EDITOR'
    : Boolean(isProducer || isEditor);

  useEffect(() => {
    if (!canCoordinateAssign) {
      setSelectedUnassignedIds(new Set());
      setEditingLotId(null);
      setDryRunPreview(null);
      setAutoAssignOpen(false);
      setAutoAssignPlan(null);
      setAutoAssignError(null);
      setAutoAssignConflict(false);
    }
  }, [canCoordinateAssign]);

  useEffect(() => {
    if (!isProducerOnly) {
      setSelectedUnassignIds(new Set());
      setReopeningTaskId(null);
      setReassigningTaskId(null);
      setImpactSuggestionsByTask({});
      setImpactErrorsByTask({});
    }
  }, [isProducerOnly]);

  const loadGrid = useCallback(
    async (preserveError = false) => {
      if (!chapterId) return;
      setLoading(true);
      if (!preserveError) {
        setError(null);
        setErrorIsConflict(false);
      }
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
        setError(err.message || t('taskGridV3.loadGridError'));
      } finally {
        setLoading(false);
      }
    },
    [chapterId, workspaceId, t],
  );

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

  // Chia đều các ô đã chọn trong từng cột thành các dãy trang liên tiếp theo thứ tự trang
  const buildLotRequests = (): StageTaskLotRequest[] => {
    if (selectedAssigneeIds.length === 0 || selectedTasksByStage.size === 0) return [];
    const requests: StageTaskLotRequest[] = [];
    const dueIso = lotDueDate ? new Date(lotDueDate).toISOString() : null;
    const briefVal = lotBrief.trim() || null;
    const pageOrderById = new Map<string, number>();
    for (const p of grid?.pages ?? []) {
      pageOrderById.set(p.id, p.pageNumber);
    }

    for (const [stageId, stageTasks] of selectedTasksByStage.entries()) {
      const orderedTasks = [...stageTasks].sort((a, b) => {
        const orderA = a.pageId ? (pageOrderById.get(a.pageId) ?? Number.MAX_SAFE_INTEGER) : -1;
        const orderB = b.pageId ? (pageOrderById.get(b.pageId) ?? Number.MAX_SAFE_INTEGER) : -1;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });

      const assigneeCount = selectedAssigneeIds.length;
      const baseSize = Math.floor(orderedTasks.length / assigneeCount);
      const remainder = orderedTasks.length % assigneeCount;
      let offset = 0;

      for (let i = 0; i < assigneeCount; i++) {
        const chunkSize = baseSize + (i < remainder ? 1 : 0);
        if (chunkSize <= 0) continue;
        const chunk = orderedTasks.slice(offset, offset + chunkSize);
        offset += chunkSize;
        requests.push({
          pipelineStageId: stageId,
          assigneeUserId: selectedAssigneeIds[i],
          taskIds: chunk.map((task) => task.id),
          brief: briefVal,
          dueDate: dueIso,
        });
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
        t('taskGridV3.generateSuccessTitle'),
        t('taskGridV3.generateSuccessDesc', {
          created: res.created,
          cancelled: res.cancelled,
          total: res.total,
        }),
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || t('taskGridV3.generateErrorFallback'));
      onShowToast?.(
        t('taskGridV3.generateErrorTitle'),
        err.message || t('taskGridV3.generateErrorFallback'),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignLots = async (dryRun: boolean) => {
    const lots = buildLotRequests();
    if (lots.length === 0) {
      setError(t('taskGridV3.assignSelectRequired'));
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
          t('taskGridV3.dryRunSuccessTitle'),
          t('taskGridV3.dryRunSuccessDesc', {
            taskCount: res.taskCount,
            lotCount: lots.length,
          }),
        );
      } else {
        setDryRunPreview(null);
        setSelectedUnassignedIds(new Set());
        setLotBrief('');
        setLotDueDate('');
        onShowToast?.(
          t('taskGridV3.assignLotsSuccessTitle'),
          t('taskGridV3.assignLotsSuccessDesc', {
            taskCount: res.taskCount,
            lotCount: res.lots.length,
          }),
        );
        await loadGrid();
      }
    } catch (err: any) {
      setError(err.message || t('taskGridV3.assignLotsErrorFallback'));
      onShowToast?.(
        t('taskGridV3.assignLotsErrorTitle'),
        err.message || t('taskGridV3.assignLotsErrorFallback'),
      );
      if (err?.status === 409) {
        loadGrid();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const loadAutoAssignPlan = useCallback(async () => {
    if (!chapterId) return;
    const seq = ++autoAssignLoadSeqRef.current;
    setAutoAssignLoading(true);
    setAutoAssignError(null);
    setAutoAssignConflict(false);
    try {
      const plan = await assignmentService.getAutoAssignPlan(chapterId);
      if (autoAssignLoadSeqRef.current !== seq) return;
      setAutoAssignPlan(plan);
    } catch (err: any) {
      if (autoAssignLoadSeqRef.current !== seq) return;
      setAutoAssignError(err?.message || t('taskGridV3.autoAssign.loadErrorFallback'));
      setAutoAssignConflict(err?.status === 409 || err?.code === 'CONFLICT');
    } finally {
      if (autoAssignLoadSeqRef.current === seq) {
        setAutoAssignLoading(false);
      }
    }
  }, [chapterId, t]);

  const handleOpenAutoAssign = () => {
    if (autoAssignLoading) return;
    setAutoAssignPlan(null);
    setAutoAssignError(null);
    setAutoAssignConflict(false);
    setAutoAssignOpen(true);
    void loadAutoAssignPlan();
  };

  const handleCloseAutoAssign = () => {
    if (autoAssignSubmittingRef.current) return;
    autoAssignLoadSeqRef.current += 1;
    setAutoAssignOpen(false);
    setAutoAssignLoading(false);
    setAutoAssignError(null);
    setAutoAssignConflict(false);
  };

  const handleConfirmAutoAssign = async (lots: StageTaskLotRequest[]) => {
    if (autoAssignSubmittingRef.current || lots.length === 0) return;
    autoAssignSubmittingRef.current = true;
    setAutoAssignSubmitting(true);
    setAutoAssignError(null);
    setAutoAssignConflict(false);
    try {
      const res = await assignmentService.assignTaskGridLots(chapterId, {
        lots,
        dryRun: false,
      });
      setSelectedUnassignedIds(new Set());
      setDryRunPreview(null);
      const taskCount = res?.taskCount ?? lots.reduce((sum, l) => sum + l.taskIds.length, 0);
      const lotCount = res?.lots?.length ?? lots.length;
      onShowToast?.(
        t('taskGridV3.autoAssign.successTitle'),
        t('taskGridV3.autoAssign.successDesc', { taskCount, lotCount }),
      );
      setAutoAssignOpen(false);
      setAutoAssignPlan(null);
      await loadGrid();
    } catch (err: any) {
      setAutoAssignError(err?.message || t('taskGridV3.autoAssign.saveErrorFallback'));
      setAutoAssignConflict(err?.status === 409 || err?.code === 'CONFLICT');
    } finally {
      autoAssignSubmittingRef.current = false;
      setAutoAssignSubmitting(false);
    }
  };

  const applyUpdatedTasks = useCallback(
    (updates: Array<Partial<StageTaskDto> & { id: string }>) => {
      if (!updates.length) return;
      const byId = new Map(updates.map((u) => [u.id, u]));
      setGrid((prev) => {
        if (!prev) return prev;
        const stagesById = new Map(prev.stages.map((s) => [s.id, s]));
        const mergedTasks = prev.tasks.map((existing) => {
          const patch = byId.get(existing.id);
          if (!patch) return existing;
          return { ...existing, ...patch, id: existing.id };
        });
        const recomputedTasks = mergedTasks.map((cell) => {
          if (!byId.has(cell.id)) return cell;
          if (cell.status !== 'Assigned' && cell.status !== 'ReworkRequired') {
            return { ...cell, isStartable: false };
          }
          if (cell.isInputOutdated) {
            return { ...cell, isStartable: false };
          }
          const stg = stagesById.get(cell.pipelineStageId);
          const prereqIds = stg?.prerequisiteStageIds || [];
          const prereqsOk = prereqIds.every((prereqId) => {
            const cells = mergedTasks.filter(
              (t) => t.pipelineStageId === prereqId && t.status !== 'Cancelled',
            );
            const needed = cell.pageId
              ? cells.filter((t) => t.pageId === cell.pageId || !t.pageId)
              : cells;
            return (
              needed.length > 0 &&
              needed.every((t) => t.status === 'Approved' && !t.isInputOutdated)
            );
          });
          return { ...cell, isStartable: prereqsOk };
        });
        return { ...prev, tasks: recomputedTasks };
      });
      setReworkCommentsByTask((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const u of updates) {
          const comment = u.lastDecisionComment?.trim();
          if (comment) {
            if (next[u.id] !== comment) {
              next[u.id] = comment;
              changed = true;
            }
          } else if (
            u.lastDecisionComment === null ||
            (u.status && u.status !== 'ReworkRequired')
          ) {
            if (u.id in next) {
              delete next[u.id];
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    },
    [],
  );

  const handleStartTask = async (task: StageTaskDto) => {
    setActionLoading(`start:${task.id}`);
    setError(null);
    try {
      const updated = await assignmentService.startStageTask(chapterId, task.id);
      applyUpdatedTasks([
        {
          ...updated,
          id: task.id,
          status: updated?.status ?? 'InProgress',
        },
      ]);
      onShowToast?.(t('taskGridV3.startSuccessTitle'), t('taskGridV3.startSuccessDesc'));
    } catch (err: any) {
      setError(err.message || t('taskGridV3.startErrorFallback'));
      onShowToast?.(
        t('taskGridV3.startErrorTitle'),
        err.message || t('taskGridV3.startErrorFallback'),
      );
      if (err?.status === 409) void loadGrid(true);
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
      const autoApproved = updated.length > 0 && updated.every((t) => t.status === 'Approved');
      onShowToast?.(
        t('taskGridV3.submitSuccessTitle'),
        autoApproved
          ? t('taskGridV3.submitAutoApprovedDesc', { count: updated.length })
          : t('taskGridV3.submitPendingReviewDesc', { count: updated.length || taskIds.length }),
      );
      if (updated.length > 0 && !updated.some((t) => t.status === 'Approved')) {
        applyUpdatedTasks(
          updated.map((u, idx) => ({
            ...u,
            id: u.id || taskIds[idx],
            status: u.status ?? 'Submitted',
            reopenReason: u.reopenReason ?? null,
          })),
        );
      } else {
        await loadGrid();
      }
    } catch (err: any) {
      setError(err.message || t('taskGridV3.submitErrorFallback'));
      onShowToast?.(
        t('taskGridV3.submitErrorTitle'),
        err.message || t('taskGridV3.submitErrorFallback'),
      );
      if (err?.status === 409) void loadGrid(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveTask = async (task: StageTaskDto) => {
    setActionLoading(`approve:${task.id}`);
    setError(null);
    try {
      await assignmentService.approveStageTask(chapterId, task.id);
      onShowToast?.(t('taskGridV3.approveSuccessTitle'), t('taskGridV3.approveSuccessDesc'));
      await loadGrid();
    } catch (err: any) {
      setError(err.message || t('taskGridV3.approveErrorFallback'));
      onShowToast?.(
        t('taskGridV3.approveErrorTitle'),
        err.message || t('taskGridV3.approveErrorFallback'),
      );
      if (err?.status === 409) void loadGrid(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdrawTask = async (task: StageTaskDto) => {
    setActionLoading(`withdraw:${task.id}`);
    setError(null);
    try {
      const updated = await assignmentService.withdrawStageTask(chapterId, task.id);
      applyUpdatedTasks([
        {
          ...updated,
          id: task.id,
          status: updated?.status ?? 'InProgress',
        },
      ]);
      onShowToast?.(t('taskGridV3.withdrawSuccessTitle'), t('taskGridV3.withdrawSuccessDesc'));
    } catch (err: any) {
      const msg = err?.message || t('taskGridV3.withdrawErrorFallback');
      setError(msg);
      onShowToast?.(t('taskGridV3.withdrawErrorTitle'), msg);
      if (err?.status === 409) void loadGrid(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleaseReview = async (task: StageTaskDto) => {
    setActionLoading(`releaseReview:${task.id}`);
    setError(null);
    try {
      const updated = await assignmentService.releaseStageTaskReview(chapterId, task.id);
      applyUpdatedTasks([
        {
          ...updated,
          id: task.id,
          status: updated?.status ?? 'Submitted',
          reviewerUserId: updated?.reviewerUserId ?? null,
        },
      ]);
      onShowToast?.(
        t('taskGridV3.releaseReviewSuccessTitle'),
        t('taskGridV3.releaseReviewSuccessDesc'),
      );
    } catch (err: any) {
      const msg = err?.message || t('taskGridV3.releaseReviewErrorFallback');
      setError(msg);
      onShowToast?.(t('taskGridV3.releaseReviewErrorTitle'), msg);
      if (err?.status === 409) void loadGrid(true);
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
      setError(t('taskGridV3.reassignSelectRequired'));
      setErrorIsConflict(false);
      return;
    }

    const isStartedWork = task.status === 'InProgress' || task.status === 'ReworkRequired';
    if (isStartedWork) {
      const statusMeta = STATUS_STYLE[task.status];
      const statusLabel = statusMeta ? t(statusMeta.labelKey) : task.status;
      const confirmed = await confirm({
        title: t('taskGridV3.reassignStartedTitle'),
        description: t('taskGridV3.reassignStartedDesc', {
          status: statusLabel,
          currentAssignee: getMemberName(task.assigneeUserId),
          nextAssignee: getMemberName(reassignUserId),
        }),
        confirmLabel: t('taskGridV3.reassignStartedConfirmBtn'),
        cancelLabel: t('taskGridV3.reassignCancelBtn'),
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    setActionLoading(`reassign:${task.id}`);
    setError(null);
    setErrorIsConflict(false);
    try {
      const dueIso = reassignDueDate ? new Date(`${reassignDueDate}T23:59:59`).toISOString() : null;
      const request: AssignStageTaskLotsRequest = {
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
        ...(isStartedWork
          ? {
              confirmStartedWork: true,
              expectedRowVersions: { [task.id]: task.rowVersion },
            }
          : {}),
      };
      await assignmentService.assignTaskGridLots(chapterId, request);
      setReassigningTaskId(null);
      onShowToast?.(
        t('taskGridV3.reassignSuccessTitle'),
        t('taskGridV3.reassignSuccessDesc', { name: getMemberName(reassignUserId) }),
      );
      await loadGrid();
    } catch (err: any) {
      const msg = err?.message || t('taskGridV3.reassignErrorFallback');
      const isConflict = err?.status === 409 || err?.code === 'CONFLICT';
      setError(msg);
      setErrorIsConflict(isConflict);
      onShowToast?.(t('taskGridV3.reassignErrorTitle'), msg);
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
        expectedRowVersion: lot.rowVersion,
      });
      setEditingLotId(null);
      onShowToast?.(t('taskGridV3.updateLotSuccessTitle'), t('taskGridV3.updateLotSuccessDesc'));
      await loadGrid();
    } catch (err: any) {
      const msg = err?.message || t('taskGridV3.updateLotErrorFallback');
      setError(msg);
      onShowToast?.(t('taskGridV3.updateLotErrorTitle'), msg);
      if (err?.status === 409) void loadGrid(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async (task: StageTaskDto) => {
    const trimmed = requestChangesComment.trim();
    if (!trimmed) {
      setError(t('taskGridV3.requestChangesRequired'));
      return;
    }
    setActionLoading(`requestChanges:${task.id}`);
    setError(null);
    try {
      const updated = await assignmentService.requestStageTaskChanges(chapterId, task.id, trimmed);
      setRequestingChangesTaskId(null);
      setRequestChangesComment('');
      applyUpdatedTasks([
        {
          ...updated,
          id: task.id,
          status: updated?.status ?? 'ReworkRequired',
          reviewerUserId: updated?.reviewerUserId ?? null,
          lastDecisionComment: updated?.lastDecisionComment ?? trimmed,
        },
      ]);
      onShowToast?.(
        t('taskGridV3.requestChangesSuccessTitle'),
        t('taskGridV3.requestChangesSuccessDesc'),
      );
    } catch (err: any) {
      setError(err.message || t('taskGridV3.requestChangesErrorFallback'));
      onShowToast?.(
        t('taskGridV3.requestChangesErrorTitle'),
        err.message || t('taskGridV3.requestChangesErrorFallback'),
      );
      if (err?.status === 409) void loadGrid(true);
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
      setError(err.message || t('taskGridV3.loadHistoryError'));
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
        const title = pageNum
          ? t('taskGridV3.replaySlideTitleWithPage', {
              attempt: sub.attemptNumber,
              page: pageNum,
            })
          : t('taskGridV3.replaySlideTitle', { attempt: sub.attemptNumber });
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
        onShowToast?.(t('taskGridV3.replayEmptyTitle'), t('taskGridV3.replayEmptyDesc'));
      }
    } catch (err: any) {
      onShowToast?.(
        t('taskGridV3.replayErrorTitle'),
        err?.message || t('taskGridV3.replayErrorFallback'),
      );
    } finally {
      setReplayingSubmissionId(null);
    }
  };

  const handleReopenTask = async (task: StageTaskDto) => {
    const trimmed = reopenReason.trim();
    if (!trimmed) {
      setError(t('taskGridV3.reopenReasonRequired'));
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
        t('taskGridV3.reopenSuccessTitle'),
        outdatedCount > 0
          ? t('taskGridV3.reopenSuccessOutdatedDesc', { count: outdatedCount })
          : t('taskGridV3.reopenSuccessDesc'),
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || t('taskGridV3.reopenErrorFallback'));
      onShowToast?.(
        t('taskGridV3.reopenErrorTitle'),
        err.message || t('taskGridV3.reopenErrorFallback'),
      );
      if (err?.status === 409) void loadGrid(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveImpact = async (task: StageTaskDto, keep: boolean) => {
    setActionLoading(`resolveImpact:${task.id}:${keep ? 'keep' : 'rework'}`);
    setError(null);
    try {
      const updated = await assignmentService.resolveStageTaskImpact(chapterId, task.id, keep);
      onShowToast?.(
        t('taskGridV3.impactSuccessTitle'),
        keep ? t('taskGridV3.impactKeepDesc') : t('taskGridV3.impactReworkDesc'),
      );
      if (keep && task.status !== 'Approved') {
        applyUpdatedTasks([
          {
            ...updated,
            id: task.id,
            isInputOutdated: updated?.isInputOutdated ?? false,
            outdatedReason: updated?.outdatedReason ?? null,
          },
        ]);
      } else {
        await loadGrid();
      }
    } catch (err: any) {
      setError(err.message || t('taskGridV3.impactErrorFallback'));
      onShowToast?.(
        t('taskGridV3.impactErrorTitle'),
        err.message || t('taskGridV3.impactErrorToastFallback'),
      );
      if (err?.status === 409) void loadGrid(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestImpactSuggestion = async (task: StageTaskDto) => {
    setActionLoading(`aiImpact:${task.id}`);
    setError(null);
    setImpactErrorsByTask((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
    try {
      const suggestion = await aiAgentsService.runImpactSuggestion(chapterId, task.id);
      setImpactSuggestionsByTask((prev) => ({ ...prev, [task.id]: suggestion }));
    } catch (err: any) {
      const msg = err?.message || t('taskGridV3.impactAiErrorFallback');
      setImpactErrorsByTask((prev) => ({ ...prev, [task.id]: msg }));
      setError(msg);
      onShowToast?.(t('taskGridV3.impactAiErrorTitle'), msg);
      if (err?.status === 409) void loadGrid(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecideImpactSuggestion = async (
    task: StageTaskDto,
    suggestion: AiSuggestionDto,
    decision: 'accept' | 'reject' | 'request-changes',
    reason?: string,
  ) => {
    setActionLoading(`aiImpactDecide:${task.id}`);
    setError(null);
    setImpactErrorsByTask((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
    try {
      let effectiveSeriesId = seriesId || '';
      if (!effectiveSeriesId && typeof chapterService.getChapterById === 'function') {
        const chap = await Promise.resolve(chapterService.getChapterById(chapterId)).catch(
          () => null,
        );
        effectiveSeriesId = chap?.seriesId || '';
      }
      const res = await aiAgentsService.review(
        effectiveSeriesId,
        suggestion.id,
        decision,
        reason ? { reason } : {},
      );
      if (decision === 'accept') {
        setImpactSuggestionsByTask((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
        await loadGrid();
      } else {
        setImpactSuggestionsByTask((prev) => ({
          ...prev,
          [task.id]: {
            ...suggestion,
            status: res.status,
            canDecide: false,
            canAccept: false,
          },
        }));
      }
    } catch (err: any) {
      const msg = err?.message || t('taskGridV3.impactAiDecideErrorFallback');
      setImpactErrorsByTask((prev) => ({ ...prev, [task.id]: msg }));
      setError(msg);
      onShowToast?.(t('taskGridV3.impactAiDecideErrorTitle'), msg);
      if (err?.status === 409) void loadGrid(true);
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
        t('taskGridV3.unassignSuccessTitle'),
        t('taskGridV3.unassignSuccessDesc', { count: res.length || taskIds.length }),
      );
      await loadGrid();
    } catch (err: any) {
      setError(err.message || t('taskGridV3.unassignErrorFallback'));
      onShowToast?.(
        t('taskGridV3.unassignErrorTitle'),
        err.message || t('taskGridV3.unassignErrorFallback'),
      );
      if (err?.status === 409) void loadGrid(true);
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
            {t('taskGridV3.cancelledCell')}
          </div>
        );
      }
      return (
        <div className='p-2 text-center text-[11px] text-stone-400 italic'>
          {t('taskGridV3.unassignedCell')}
        </div>
      );
    }

    const statusStyle = STATUS_STYLE[task.status];
    const meta = statusStyle
      ? { label: t(statusStyle.labelKey), cls: statusStyle.cls }
      : {
          label: task.status,
          cls: 'bg-stone-100 text-stone-700 border-stone-300',
        };
    const isStageEnabled = stage.isEnabled !== false && enabledStageIds.has(stage.id);
    const isMine = Boolean(currentUserId && task.assigneeUserId === currentUserId);
    const canSelectForLot = isStageEnabled && canCoordinateAssign && task.status === 'Unassigned';
    const canUnassign =
      isProducerOnly &&
      (task.status === 'Assigned' ||
        task.status === 'InProgress' ||
        task.status === 'ReworkRequired');
    const canReassign =
      isStageEnabled &&
      isProducerOnly &&
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
      isProducerOnly &&
      task.status === 'UnderReview' &&
      Boolean(task.reviewerUserId && task.reviewerUserId !== currentUserId);
    const canReleaseOwnReview =
      isStageEnabled &&
      effectiveIsReviewer &&
      task.status === 'UnderReview' &&
      Boolean(currentUserId && task.reviewerUserId === currentUserId);
    const canReopen =
      isStageEnabled && isProducerOnly && task.status === 'Approved' && !task.isInputOutdated;
    const canResolveImpact = isStageEnabled && isProducerOnly && task.isInputOutdated;
    const prereqReadyForImpact = canResolveImpact ? arePrerequisitesApproved(task, stage) : false;
    const canSuggestImpactAi = Boolean(
      canResolveImpact && task.pageId && task.outdatedReason === SCRIPT_CHANGED_REASON,
    );
    const impactSuggestion = impactSuggestionsByTask[task.id] ?? null;
    const impactAiError = impactErrorsByTask[task.id] ?? null;

    const isSelectedForLot = selectedUnassignedIds.has(task.id);
    const isSelectedForSubmit = selectedSubmitIds.has(task.id);
    const isSelectedForUnassign = selectedUnassignIds.has(task.id);
    const hasOpenInlineForm =
      requestingChangesTaskId === task.id ||
      reopeningTaskId === task.id ||
      reassigningTaskId === task.id ||
      Boolean(impactSuggestion);
    const attemptCount = task.attemptCount ?? 0;
    const reworkDisplay = resolveReworkReasonDisplay(
      task,
      reworkCommentsByTask[task.id] || pickLatestDecisionComment(submissionsByTaskId[task.id]),
    );
    const reworkTooltip = reworkDisplay
      ? reworkDisplay.kind === 'reopen'
        ? `${t('taskGridV3.reopenReasonPrefix')} ${reworkDisplay.text}`
        : `${t('taskGridV3.lastDecisionLabel')}: ${reworkDisplay.text}`
      : undefined;

    return (
      <div
        data-testid={`task-cell-${stage.id}-${pageId ?? 'chapter'}`}
        title={reworkTooltip}
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
                {t('taskGridV3.attemptBadge', { count: attemptCount })}
              </span>
            )}
          </div>

          <div className='flex items-center gap-1'>
            {canSelectForLot && (
              <input
                type='checkbox'
                aria-label={t('taskGridV3.selectCellAria', { stage: stage.name })}
                checked={isSelectedForLot}
                onChange={() => toggleSelectUnassigned(task.id)}
                className='h-3.5 w-3.5 accent-[#F97316] cursor-pointer'
              />
            )}

            {canUnassign && (
              <input
                type='checkbox'
                aria-label={t('taskGridV3.selectUnassignCellAria', { stage: stage.name })}
                checked={isSelectedForUnassign}
                onChange={() => toggleSelectUnassign(task.id)}
                className='h-3.5 w-3.5 accent-rose-600 cursor-pointer'
              />
            )}

            {canSubmit && !task.isInputOutdated && (
              <input
                type='checkbox'
                aria-label={t('taskGridV3.selectSubmitCellAria', { stage: stage.name })}
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
              {t('taskGridV3.underReviewBy', { name: getMemberName(task.reviewerUserId) })}
            </span>
          </div>
        )}

        {reworkDisplay && (
          <div
            data-testid={
              reworkDisplay.kind === 'reopen'
                ? `rework-reopen-reason-${task.id}`
                : `rework-decision-comment-${task.id}`
            }
            title={reworkTooltip}
            className='rounded border border-rose-200 bg-rose-50/80 px-1.5 py-1 text-[10px] leading-snug text-rose-800 line-clamp-2'
          >
            {reworkDisplay.kind === 'reopen' ? (
              <>
                🔄 <span className='font-semibold'>{t('taskGridV3.reopenReasonPrefix')}</span>{' '}
                {reworkDisplay.text}
              </>
            ) : (
              <>
                💬 <span className='font-semibold'>{t('taskGridV3.lastDecisionPrefix')}</span>{' '}
                {reworkDisplay.text}
              </>
            )}
          </div>
        )}

        {task.isInputOutdated && (
          <div className='space-y-1'>
            <div
              className='inline-flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900'
              title={task.outdatedReason || t('taskGridV3.prevStageChanged')}
            >
              <AlertTriangle className='h-3 w-3 shrink-0 text-amber-700' />
              <span>{t('taskGridV3.inputOutdatedTitle')}</span>
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
                  ? t('taskGridV3.startCellTooltip')
                  : t('taskGridV3.waitPrereqsTooltip')
              }
              className='inline-flex items-center gap-1 rounded bg-[#171717] hover:bg-black text-white px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {actionLoading === `start:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Play className='h-2.5 w-2.5 text-[#F97316]' />
              )}
              <span>
                {task.isStartable ? t('taskGridV3.startBtn') : t('taskGridV3.waitPrereqsBtn')}
              </span>
            </button>
          )}

          {canSubmit && (
            <button
              type='button'
              disabled={task.isInputOutdated || actionLoading === `submit:${task.id}`}
              onClick={() => handleSubmitTasks([task.id])}
              title={
                task.isInputOutdated
                  ? t('taskGridV3.submitOutdatedTooltip')
                  : t('taskGridV3.submitCellTooltip')
              }
              className='inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {actionLoading === `submit:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Send className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.submitBtn')}</span>
            </button>
          )}

          {canWithdraw && (
            <button
              type='button'
              data-testid={`withdraw-task-btn-${task.id}`}
              disabled={actionLoading === `withdraw:${task.id}`}
              onClick={() => void handleWithdrawTask(task)}
              title={t('taskGridV3.withdrawTooltip')}
              className='inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `withdraw:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Undo2 className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.withdrawBtn')}</span>
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
                    ? t('taskGridV3.underReviewBy', { name: getMemberName(task.reviewerUserId) })
                    : task.isInputOutdated
                      ? t('taskGridV3.approveOutdatedTooltip')
                      : t('taskGridV3.approveCellTooltip')
                }
                className='inline-flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                {actionLoading === `approve:${task.id}` ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <CheckCircle2 className='h-2.5 w-2.5' />
                )}
                <span>{t('taskGridV3.approveBtn')}</span>
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
                      ? t('taskGridV3.underReviewBy', { name: getMemberName(task.reviewerUserId) })
                      : t('taskGridV3.requestChangesTooltip')
                  }
                  className='inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                >
                  <XCircle className='h-2.5 w-2.5' />
                  <span>{t('taskGridV3.requestChangesBtn')}</span>
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
              title={t('taskGridV3.releaseReviewTooltip')}
              className='inline-flex items-center gap-1 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `releaseReview:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Unlock className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.releaseReviewBtn')}</span>
            </button>
          )}

          {canForceReleaseReview && (
            <button
              type='button'
              data-testid={`force-release-review-btn-${task.id}`}
              disabled={actionLoading === `releaseReview:${task.id}`}
              onClick={() => void handleReleaseReview(task)}
              title={t('taskGridV3.forceReleaseReviewTooltip')}
              className='inline-flex items-center gap-1 rounded border border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-900 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `releaseReview:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Unlock className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.forceReleaseReviewBtn')}</span>
            </button>
          )}

          {canReopen && reopeningTaskId !== task.id && (
            <button
              type='button'
              onClick={() => {
                setReopeningTaskId(task.id);
                setReopenReason('');
              }}
              title={t('taskGridV3.reopenTooltip')}
              className='inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2 py-1 text-[10px] font-semibold cursor-pointer'
            >
              <RotateCcw className='h-2.5 w-2.5' />
              <span>{t('taskGridV3.reopenBtn')}</span>
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
                  ? t('taskGridV3.reassignOutdatedTooltip')
                  : t('taskGridV3.reassignTooltip')
              }
              className='inline-flex items-center gap-1 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 text-[#C2410C] px-2 py-1 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              <UserCheck className='h-2.5 w-2.5' />
              <span>{t('taskGridV3.reassignBtn')}</span>
            </button>
          )}

          {canUnassign && (
            <button
              type='button'
              disabled={actionLoading === `unassign:${task.id}`}
              onClick={() => handleUnassignTasks([task.id])}
              title={t('taskGridV3.unassignTooltip')}
              className='inline-flex items-center gap-1 rounded border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 px-2 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === `unassign:${task.id}` ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <UserMinus className='h-2.5 w-2.5' />
              )}
              <span>{t('taskGridV3.unassignBtn')}</span>
            </button>
          )}

          {(task.status !== 'Unassigned' && task.status !== 'Assigned') || task.startedAt ? (
            <button
              type='button'
              onClick={() => void handleToggleSubmissions(task)}
              title={t('taskGridV3.historyTooltip')}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                historyTaskId === task.id
                  ? 'border-stone-800 bg-stone-800 text-white'
                  : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-600'
              }`}
            >
              <History className='h-2.5 w-2.5' />
              <span>{t('taskGridV3.historyBtn')}</span>
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
              placeholder={t('taskGridV3.requestChangesPlaceholder')}
              aria-label={t('taskGridV3.requestChangesAria')}
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
                {t('taskGridV3.cancelBtn')}
              </button>
              <button
                type='button'
                disabled={actionLoading === `requestChanges:${task.id}`}
                onClick={() => void handleRequestChanges(task)}
                className='shrink-0 whitespace-nowrap rounded bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
              >
                {actionLoading === `requestChanges:${task.id}`
                  ? t('taskGridV3.sendingBtn')
                  : t('taskGridV3.confirmReturnBtn')}
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
            <div className='font-bold text-stone-800'>{t('taskGridV3.historyTitle')}</div>
            {loadingHistoryTaskId === task.id ? (
              <div className='flex items-center gap-1 text-stone-500'>
                <Loader2 className='h-3 w-3 animate-spin' />
                <span>{t('taskGridV3.historyLoading')}</span>
              </div>
            ) : (submissionsByTaskId[task.id] || []).length === 0 ? (
              <div className='text-stone-500 italic'>{t('taskGridV3.historyEmpty')}</div>
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
                        <span className='font-bold text-stone-800'>
                          {t('taskGridV3.attemptShort', { count: sub.attemptNumber })}
                        </span>
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
                            ? t('taskGridV3.subStatus.approved')
                            : sub.status === 'Rejected'
                              ? t('taskGridV3.subStatus.rejected')
                              : sub.status === 'Pending'
                                ? t('taskGridV3.subStatus.pending')
                                : t('taskGridV3.subStatus.superseded')}
                        </span>
                      </div>
                      <div className='text-stone-500'>
                        {t('taskGridV3.submittedByWithImages', {
                          name: getMemberName(sub.submittedByUserId),
                          count: sub.artworkReferenceIds?.length ?? 0,
                        })}
                      </div>
                      <div className='flex flex-wrap items-center justify-between gap-1 text-stone-600'>
                        <span>
                          {scriptVersionNum !== undefined && (
                            <>
                              <span className='font-semibold text-indigo-700'>
                                {t('taskGridV3.scriptVersionLabel', { version: scriptVersionNum })}
                              </span>
                              {' • '}
                            </>
                          )}
                          <span>{t('taskGridV3.panelCountAtSubmit', { count: panelCount })}</span>
                        </span>
                        {canReplay && (
                          <button
                            type='button'
                            data-testid={`replay-submission-${sub.id}`}
                            disabled={replayingSubmissionId === sub.id}
                            onClick={() => void handleReplaySubmission(task, sub)}
                            className='inline-flex items-center gap-0.5 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700 disabled:opacity-50 cursor-pointer'
                            title={t('taskGridV3.replayTooltip')}
                          >
                            {replayingSubmissionId === sub.id ? (
                              <Loader2 className='h-2.5 w-2.5 animate-spin' />
                            ) : (
                              <Eye className='h-2.5 w-2.5' />
                            )}
                            <span>{t('taskGridV3.replayBtn')}</span>
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
              Impact Review {prereqReadyForImpact ? '' : t('taskGridV3.impactWaitingPrereq')}
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
                    ? t('taskGridV3.impactKeepTooltip')
                    : t('taskGridV3.impactPrereqNotReadyTooltip')
                }
                className='inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                <Check className='h-2.5 w-2.5' />
                <span>{t('taskGridV3.impactKeepBtn')}</span>
              </button>
              <button
                type='button'
                disabled={
                  !prereqReadyForImpact || actionLoading === `resolveImpact:${task.id}:rework`
                }
                onClick={() => handleResolveImpact(task, false)}
                title={
                  prereqReadyForImpact
                    ? t('taskGridV3.impactReworkTooltip')
                    : t('taskGridV3.impactPrereqNotReadyTooltip')
                }
                className='inline-flex items-center gap-1 rounded bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                <RotateCcw className='h-2.5 w-2.5' />
                <span>{t('taskGridV3.impactReworkBtn')}</span>
              </button>
              {canSuggestImpactAi && (
                <button
                  type='button'
                  data-testid={`ai-impact-btn-${task.id}`}
                  disabled={
                    actionLoading === `aiImpact:${task.id}` ||
                    actionLoading === `aiImpactDecide:${task.id}`
                  }
                  onClick={() => void handleRequestImpactSuggestion(task)}
                  title={t('taskGridV3.impactAiTooltip')}
                  className='inline-flex items-center gap-1 rounded border border-orange-300 bg-white hover:bg-orange-50 text-[#C2410C] px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                >
                  {actionLoading === `aiImpact:${task.id}` ? (
                    <Loader2 className='h-2.5 w-2.5 animate-spin' />
                  ) : (
                    <Sparkles className='h-2.5 w-2.5' />
                  )}
                  <span>{t('taskGridV3.impactAiBtn')}</span>
                </button>
              )}
            </div>
            {impactAiError && (
              <div
                role='alert'
                className='rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-800'
              >
                {impactAiError}
              </div>
            )}
            {impactSuggestion && (
              <div className='pt-1'>
                <SuggestionCard
                  suggestion={impactSuggestion}
                  seriesId={seriesId}
                  busy={actionLoading === `aiImpactDecide:${task.id}`}
                  onDecide={(decision, reason) =>
                    void handleDecideImpactSuggestion(task, impactSuggestion, decision, reason)
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Form Đổi người cho ô chưa nộp (Producer — reassign: true) */}
        {reassigningTaskId === task.id && (
          <div
            data-testid={`reassign-task-form-${task.id}`}
            className='mt-1 w-full min-w-0 box-border rounded border border-orange-300 bg-orange-50/80 p-2 space-y-1.5'
          >
            <div className='text-[10px] font-bold text-stone-900'>
              {t('taskGridV3.reassignTitle')}
            </div>
            <select
              aria-label={t('taskGridV3.reassignSelectLabel')}
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              className='block w-full min-w-0 rounded border border-orange-300 bg-white px-2 py-1 text-[11px] text-stone-900'
            >
              <option value=''>{t('taskGridV3.selectMemberPlaceholder')}</option>
              {activeMembers
                .filter(
                  (m) =>
                    !stage.allowedRole ||
                    String(m.role || '').toUpperCase() === String(stage.allowedRole).toUpperCase(),
                )
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName || m.email.split('@')[0]} ({m.role})
                    {m.userId === task.assigneeUserId ? t('taskGridV3.currentAssigneeSuffix') : ''}
                  </option>
                ))}
            </select>
            <input
              type='text'
              aria-label={t('taskGridV3.reassignBriefAria')}
              value={reassignBrief}
              onChange={(e) => setReassignBrief(e.target.value)}
              placeholder={t('taskGridV3.reassignBriefPlaceholder')}
              className='block w-full min-w-0 rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-900'
            />
            <input
              type='date'
              aria-label={t('taskGridV3.reassignDueDateAria')}
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
                {t('taskGridV3.cancelBtn')}
              </button>
              <button
                type='button'
                data-testid={`confirm-reassign-task-${task.id}`}
                disabled={!reassignUserId || actionLoading === `reassign:${task.id}`}
                onClick={() => void handleReassignTask(task, stage)}
                className='shrink-0 whitespace-nowrap rounded bg-[#EA580C] hover:bg-[#C2410C] text-white px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
              >
                {actionLoading === `reassign:${task.id}`
                  ? t('taskGridV3.reassigningBtn')
                  : t('taskGridV3.reassignConfirmBtn')}
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
              placeholder={t('taskGridV3.reopenPlaceholder')}
              aria-label={t('taskGridV3.reopenReasonAria')}
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
                {t('taskGridV3.cancelBtn')}
              </button>
              <button
                type='button'
                disabled={actionLoading === `reopen:${task.id}`}
                onClick={() => handleReopenTask(task)}
                className='shrink-0 whitespace-nowrap rounded bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 cursor-pointer'
              >
                {actionLoading === `reopen:${task.id}`
                  ? t('taskGridV3.reopeningBtn')
                  : t('taskGridV3.confirmReopenBtn')}
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
            <span className='font-bold text-sm text-stone-900'>{t('taskGridV3.boardTitle')}</span>
          </div>
          {grid && (
            <span className='rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-mono font-semibold text-stone-700'>
              {t('taskGridV3.approvedSummary', {
                approved: approvedCount,
                total: activeTasks.length,
              })}
            </span>
          )}
          {outdatedCount > 0 && (
            <span
              data-testid='outdated-tasks-badge'
              className='rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-900 inline-flex items-center gap-1'
            >
              <AlertTriangle className='h-3.5 w-3.5 text-amber-600' />
              <span>{t('taskGridV3.outdatedBanner', { count: outdatedCount })}</span>
            </span>
          )}
          {disabledStageTasks.length > 0 && (
            <span
              data-testid='disabled-stage-tasks-note'
              title={t('taskGridV3.disabledStageNoteTooltip')}
              className='rounded-lg bg-stone-100/80 border border-dashed border-stone-300 px-2.5 py-1 text-[11px] text-stone-500 opacity-75'
            >
              {t('taskGridV3.disabledStageNote', { count: disabledStageTasks.length })}
            </span>
          )}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {isProducerOnly && selectedUnassignIds.size > 0 && (
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
              <span>{t('taskGridV3.unassignBatchBtn', { count: selectedUnassignIds.size })}</span>
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
              <span>{t('taskGridV3.submitBatchBtn', { count: selectedSubmitIds.size })}</span>
            </button>
          )}

          {canCoordinateAssign && (
            <button
              type='button'
              data-testid='auto-assign-btn'
              disabled={autoAssignLoading}
              onClick={handleOpenAutoAssign}
              className='inline-flex items-center gap-1.5 rounded-lg border border-[#FDBA74] bg-[#FFF7ED] hover:bg-orange-100 text-[#C2410C] px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50'
            >
              {autoAssignLoading ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Wand2 className='h-3.5 w-3.5' />
              )}
              <span>{t('taskGridV3.autoAssign.btn')}</span>
            </button>
          )}

          {isProducerOnly && (
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
              <span>{t('taskGridV3.generateBtn')}</span>
            </button>
          )}

          <button
            type='button'
            onClick={() => void loadGrid()}
            disabled={loading}
            className='inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-2.5 py-1.5 text-xs font-semibold cursor-pointer'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('taskGridV3.reloadBtn')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role='alert'
          data-testid='task-grid-error'
          className='flex flex-wrap items-start justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800'
        >
          <div className='flex items-start gap-2 min-w-0 flex-1'>
            <AlertCircle className='h-4 w-4 shrink-0 text-rose-600 mt-0.5' />
            {error.includes('\n') ? (
              <ul className='list-disc pl-4 space-y-0.5 whitespace-pre-line break-words'>
                {error
                  .split(/\r?\n/)
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
              </ul>
            ) : (
              <span className='whitespace-pre-line break-words'>{error}</span>
            )}
          </div>
          {errorIsConflict && (
            <button
              type='button'
              data-testid='error-reload-grid-btn'
              disabled={loading}
              onClick={() => void loadGrid()}
              className='inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 disabled:opacity-50 cursor-pointer shrink-0'
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('taskGridV3.reloadGridBtn')}</span>
            </button>
          )}
        </div>
      )}

      {/* Bảng điều khiển Giao Lô / Chia Đều cho Producer / Editor khi có chọn ô Unassigned */}
      {canCoordinateAssign && selectedUnassignedIds.size > 0 && (
        <div className='rounded-xl border border-[#FDBA74] bg-[#FFF7ED] p-4 space-y-3 shadow-xs'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2 text-xs font-bold text-stone-900'>
              <Users className='h-4 w-4 text-[#F97316]' />
              <span>
                {t('taskGridV3.assignLotHeader', { count: selectedUnassignedIds.size })}
                {requiredRoleForSelection
                  ? t('taskGridV3.assignLotRoleSuffix', { role: requiredRoleForSelection })
                  : ''}
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
              {t('taskGridV3.deselectAllCellsBtn')}
            </button>
          </div>

          <div className='space-y-1.5'>
            <div className='text-[11px] font-semibold text-stone-700'>
              {t('taskGridV3.selectMembersHint')}
            </div>
            <div className='flex flex-wrap gap-2'>
              {eligibleAssignees.length === 0 ? (
                <span className='text-xs text-rose-700'>
                  {t('taskGridV3.noEligibleMembers', { role: requiredRoleForSelection || '' })}
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
                        aria-label={t('taskGridV3.assignToMemberAria', {
                          name: m.fullName || m.email.split('@')[0],
                        })}
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
                {t('taskGridV3.lotBriefLabel')}
              </label>
              <input
                type='text'
                value={lotBrief}
                onChange={(e) => setLotBrief(e.target.value)}
                placeholder={t('taskGridV3.lotBriefPlaceholder')}
                className='w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs'
              />
            </div>
            <div>
              <label className='block text-[11px] font-semibold text-stone-700 mb-1'>
                {t('taskGridV3.lotDueDateLabel')}
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
              {t('taskGridV3.dryRunBanner', {
                taskCount: dryRunPreview.taskCount,
                lotCount: dryRunPreview.lotCount,
              })}
            </div>
          )}

          <div className='flex flex-wrap items-center justify-end gap-2 pt-1'>
            <button
              type='button'
              disabled={actionLoading === 'dryRun' || selectedAssigneeIds.length === 0}
              onClick={() => handleAssignLots(true)}
              className='rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === 'dryRun' ? t('taskGridV3.checkingBtn') : t('taskGridV3.dryRunBtn')}
            </button>
            <button
              type='button'
              disabled={actionLoading === 'assignLots' || selectedAssigneeIds.length === 0}
              onClick={() => handleAssignLots(false)}
              className='rounded-lg bg-[#171717] hover:bg-black text-white px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer'
            >
              {actionLoading === 'assignLots'
                ? t('taskGridV3.assigningBtn')
                : selectedAssigneeIds.length > 1
                  ? t('taskGridV3.splitAndAssignBtn', { count: selectedAssigneeIds.length })
                  : t('taskGridV3.assignLotBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Danh sách Lô công việc (Lots) hiện có */}
      {/* Trang do Writer chia trong Kịch bản tạo ra; chưa có trang thì lưới chỉ có hàng Toàn chương */}
      {grid && grid.pages.length === 0 && (
        <div className='rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900'>
          <span className='font-bold'>{t('taskGridV3.noPagesTitle')}</span>{' '}
          {t('taskGridV3.noPagesDesc')}
          {workspaceId && seriesId && (
            <>
              {' '}
              <Link
                to={`/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${encodeURIComponent(chapterId)}`}
                className='font-semibold underline hover:text-sky-700'
              >
                {t('taskGridV3.openScriptLink')}
              </Link>
            </>
          )}
        </div>
      )}

      {/* Lô Closed (mọi ô đã bỏ gán / huỷ) không còn việc gì: ẩn khỏi danh sách */}
      {grid && grid.lots.some((l) => l.status !== 'Closed') && (
        <div className='rounded-xl border border-stone-200 bg-white p-3.5 space-y-2'>
          <div className='text-xs font-bold text-stone-800'>
            {t('taskGridV3.assignedLotsTitle', {
              count: grid.lots.filter((l) => l.status !== 'Closed').length,
            })}
          </div>
          <div className='flex flex-wrap gap-2'>
            {grid.lots
              .filter((l) => l.status !== 'Closed')
              .map((lot) => {
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
                    ? t('taskGridV3.wholeChapter')
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
                        {t('taskGridV3.stageDisabledBadge')}
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
                        {new Date(lot.dueDate).toLocaleDateString(
                          lang === 'en' ? 'en-US' : 'vi-VN',
                        )}
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
                    {canCoordinateAssign && lot.status !== 'Closed' && (
                      <button
                        type='button'
                        data-testid={`edit-lot-btn-${lot.id}`}
                        onClick={() =>
                          editingLotId === lot.id ? setEditingLotId(null) : openEditLotForm(lot)
                        }
                        title={t('taskGridV3.editLotTooltip')}
                        className='inline-flex items-center gap-0.5 rounded border border-stone-300 bg-white hover:bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 cursor-pointer'
                      >
                        <Pencil className='h-2.5 w-2.5' />
                        <span>{t('taskGridV3.editLotBtn')}</span>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {canCoordinateAssign &&
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
                    {t('taskGridV3.editLotTitle')} — {stg?.name || 'Stage'} (
                    {getMemberName(editingLot.assigneeUserId)})
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-[11px] font-semibold text-stone-700 mb-1'>
                        {t('taskGridV3.lotBriefLabel')}
                      </label>
                      <input
                        type='text'
                        aria-label={t('taskGridV3.editLotBriefAria')}
                        value={editLotBrief}
                        onChange={(e) => setEditLotBrief(e.target.value)}
                        placeholder={t('taskGridV3.editLotBriefPlaceholder')}
                        className='w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-900'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='block text-[11px] font-semibold text-stone-700'>
                        {t('taskGridV3.lotDueDateLabel')}
                      </label>
                      <input
                        type='date'
                        aria-label={t('taskGridV3.editLotDueDateAria')}
                        disabled={editLotClearDueDate}
                        value={editLotDueDate}
                        onChange={(e) => setEditLotDueDate(e.target.value)}
                        className='w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-900 disabled:opacity-50'
                      />
                      <label className='inline-flex items-center gap-1.5 text-[11px] text-stone-700 cursor-pointer'>
                        <input
                          type='checkbox'
                          aria-label={t('taskGridV3.clearDueDateLabel')}
                          checked={editLotClearDueDate}
                          onChange={(e) => setEditLotClearDueDate(e.target.checked)}
                          className='h-3.5 w-3.5 accent-[#F97316]'
                        />
                        <span>{t('taskGridV3.clearDueDateLabel')}</span>
                      </label>
                    </div>
                  </div>
                  <div className='flex items-center justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => setEditingLotId(null)}
                      className='rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 cursor-pointer'
                    >
                      {t('taskGridV3.cancelBtn')}
                    </button>
                    <button
                      type='button'
                      data-testid={`save-lot-btn-${editingLot.id}`}
                      disabled={actionLoading === `updateLot:${editingLot.id}`}
                      onClick={() => void handleUpdateLot(editingLot)}
                      className='rounded-lg bg-[#171717] hover:bg-black text-white px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer'
                    >
                      {actionLoading === `updateLot:${editingLot.id}`
                        ? t('taskGridV3.savingBtn')
                        : t('taskGridV3.saveLotBtn')}
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
          <span>{t('taskGridV3.loadingGrid')}</span>
        </div>
      ) : !grid || (activeTasks.length === 0 && grid.pages.length === 0) ? (
        <div className='rounded-xl border border-dashed border-stone-300 bg-[#FCFBF8] p-8 text-center space-y-2'>
          <div className='font-bold text-sm text-stone-800'>{t('taskGridV3.emptyGridTitle')}</div>
          <p className='text-xs text-stone-500'>
            {isProducerOnly
              ? t('taskGridV3.emptyGridProducerHint')
              : t('taskGridV3.emptyGridMemberHint')}
          </p>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs'>
          <table className='w-full border-collapse text-left text-xs'>
            <thead>
              <tr className='border-b border-stone-200 bg-[#FAF8F5]'>
                <th className='sticky left-0 z-10 bg-[#FAF8F5] px-3 py-2.5 font-bold text-stone-700 border-r border-stone-200 min-w-[110px]'>
                  {t('taskGridV3.scopeColumnHeader')}
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
                            {t('taskGridV3.trackBadge', { track: stage.track })}
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
                      {canCoordinateAssign && unassignedCount > 0 && (
                        <button
                          type='button'
                          onClick={() => toggleSelectStageColumn(stage.id)}
                          className='mt-1.5 text-[10px] font-semibold text-[#C2410C] hover:underline cursor-pointer'
                        >
                          {t('taskGridV3.selectColumnBtn', { count: unassignedCount })}
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
                    {t('taskGridV3.wholeChapter')}
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
                    {t('taskGridV3.pageRowLabel', { number: page.pageNumber })}
                  </td>
                  {visibleStages.map((stage) => (
                    <td key={stage.id} className='p-2 border-r border-stone-200 align-top'>
                      {stage.granularity === 'Page' || taskMap.has(`${stage.id}:${page.id}`) ? (
                        renderCell(stage, page.id)
                      ) : (
                        <div className='p-2 text-center text-[10px] text-stone-300'>
                          {t('taskGridV3.chapterScopeCell')}
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

      <AutoAssignModal
        isOpen={autoAssignOpen}
        plan={autoAssignPlan}
        loading={autoAssignLoading}
        submitting={autoAssignSubmitting}
        errorMessage={autoAssignError}
        isConflict={autoAssignConflict}
        activeMembers={activeMembers}
        getMemberName={getMemberName}
        onClose={handleCloseAutoAssign}
        onReloadPlan={() => void loadAutoAssignPlan()}
        onConfirm={(lots) => void handleConfirmAutoAssign(lots)}
      />

      <ImageViewerLightbox
        isOpen={replayOpen}
        onClose={() => setReplayOpen(false)}
        slides={replaySlides}
      />
    </div>
  );
};
