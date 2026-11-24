// src/roles/producer/modals/CreateAssignmentModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Plus,
  AlertCircle,
  AlertTriangle,
  Loader2,
  UserCheck,
  Layers,
  FileText,
  Sparkles,
  Network,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ThumbsUp,
  Paperclip,
  Info,
} from 'lucide-react';
import {
  assignmentService,
  CreateAssignmentRequest,
  WorkflowEntityType,
  AssignmentPriority,
  AssignmentDto,
  extractError,
  AssigneeSuggestionDto,
  BulkAssignmentResultDto,
  CreateAssignmentPlanRequest,
  AssignmentPlanResultDto,
  AssignmentPlanTemplateDto,
} from '@/services/assignment.service';
import { SeriesMemberDto } from '@/services/series.service';
import { workspaceService } from '@/services/workspace.service';
import { pipelineService, PipelineStageDto } from '@/services/pipeline.service';
import { pageService, PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { PanelDto } from '@/types/pipeline';
import { normalizeWorkspaceRole } from '@/types/auth';
import { DependencySelector } from '../components/DependencySelector';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  workspaceId: string;
  seriesId: string;
  chapterId: string;
  chapterNumber?: number | string;
  initialPipelineStageId?: string;
  initialEntityType?: WorkflowEntityType;
  onClose: () => void;
  onSuccess?: (created: AssignmentDto) => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  workspaceId,
  seriesId,
  chapterId,
  chapterNumber,
  initialPipelineStageId,
  initialEntityType,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const { t } = useTranslation('production');
  const [entityType, setEntityType] = useState<WorkflowEntityType>(initialEntityType || 'Chapter');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [pipelineStageId, setPipelineStageId] = useState(initialPipelineStageId || '');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [brief, setBrief] = useState('');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<AssignmentPriority>('Medium');
  const [dependsOnAssignmentId, setDependsOnAssignmentId] = useState('');
  const [selectedDependsOnIds, setSelectedDependsOnIds] = useState<string[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [transferReason, setTransferReason] = useState('');
  const [showDependencies, setShowDependencies] = useState(false);

  // Gợi ý ứng viên tối ưu từ Backend (GET /assignee-suggestions)
  const [suggestions, setSuggestions] = useState<AssigneeSuggestionDto[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Chế độ giao việc: Giao theo công đoạn (đơn/hàng loạt) hoặc Kế hoạch toàn chương
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'plan'>('single');

  // State cho Kế hoạch toàn chương (POST /assignments/plan)
  const [planBrief, setPlanBrief] = useState('');
  const [planDueDate, setPlanDueDate] = useState('');
  const [planPriority, setPlanPriority] = useState<AssignmentPriority>('Medium');
  const [planReferenceNotes, setPlanReferenceNotes] = useState('');
  const [planStageAssignments, setPlanStageAssignments] = useState<
    Record<string, { enabled: boolean; assigneeUserId: string; brief: string; dueDate: string }>
  >({});
  const [planDryRunLoading, setPlanDryRunLoading] = useState(false);
  const [planDryRunResult, setPlanDryRunResult] = useState<AssignmentPlanResultDto | null>(null);

  // Nạp mẫu từ chương trước (GET /assignments/plan-template)
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateSourceChapter, setTemplateSourceChapter] = useState<number | null>(null);

  // Chế độ giao việc hàng loạt (Bulk Assignment)
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkPageIds, setBulkPageIds] = useState<string[]>([]);
  const [pageRangeFrom, setPageRangeFrom] = useState<number | null>(null);
  const [pageRangeTo, setPageRangeTo] = useState<number | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<BulkAssignmentResultDto | null>(null);

  // Ngày hôm nay theo giờ địa phương YYYY-MM-DD để chặn chọn ngày quá khứ
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Tính số ngày còn lại theo hạn hoàn thành
  const dueDateRelativeLabel = useMemo(() => {
    if (!dueDate) return null;
    const target = new Date(dueDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0)
      return { key: 'overdue' as const, text: t('producer.createAssignmentModal.dueOverdue') };
    if (diffDays === 0)
      return { key: 'today' as const, text: t('producer.createAssignmentModal.dueToday') };
    if (diffDays === 1)
      return { key: 'tomorrow' as const, text: t('producer.createAssignmentModal.dueTomorrow') };
    return {
      key: 'future' as const,
      text: t('producer.createAssignmentModal.dueInDays', { days: diffDays }),
    };
  }, [dueDate, todayStr, t]);

  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [members, setMembers] = useState<SeriesMemberDto[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<AssignmentDto[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [panels, setPanels] = useState<PanelDto[]>([]);

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDependencyError = Boolean(
    error && /phụ thuộc|dependency|chu trình|dag|vòng lặp/i.test(error),
  );

  // Nạp dữ liệu ban đầu: Pipeline, Members, Existing Assignments, Pages của Chapter
  useEffect(() => {
    if (!isOpen || !chapterId) return;

    let isMounted = true;
    setLoadingInitial(true);
    setLoadingPages(true);
    setError(null);

    Promise.all([
      seriesId
        ? pipelineService.getSeriesPipeline(seriesId).catch(() => null)
        : Promise.resolve(null),
      // Người nhận = thành viên Workspace (role Workspace là nguồn duy nhất); BE tự thêm vào đội Series khi giao việc
      workspaceId
        ? workspaceService
            .getMembers(workspaceId)
            .then((list) =>
              list.map((m): SeriesMemberDto => ({
                id: m.userId,
                seriesId: seriesId || '',
                userId: m.userId,
                fullName: m.fullName,
                email: m.email,
                avatarUrl: m.avatarUrl,
                studioRole: String(m.role),
                seriesRole: String(m.role),
                joinedAt: m.joinedAt,
                status: m.status,
              })),
            )
            .catch(() => [] as SeriesMemberDto[])
        : Promise.resolve([] as SeriesMemberDto[]),
      assignmentService.getAssignments(chapterId).catch(() => []),
      pageService.getPagesByChapter(chapterId).catch(() => []),
    ])
      .then(([pipelineData, membersData, assignmentsData, pagesData]) => {
        if (!isMounted) return;

        let loadedStages: PipelineStageDto[] = [];
        if (pipelineData?.stages && pipelineData.stages.length > 0) {
          loadedStages = pipelineData.stages.filter((s) => s.isEnabled !== false && !s.isTerminal);
        } else {
          loadedStages = [];
        }

        setStages(loadedStages);
        const targetStageId =
          initialPipelineStageId && loadedStages.some((s) => s.id === initialPipelineStageId)
            ? initialPipelineStageId
            : loadedStages[0]?.id || '';
        setPipelineStageId(targetStageId);

        if (initialEntityType) {
          setEntityType(initialEntityType);
        }

        if (loadedStages.length === 0) {
          setError(t('producer.createAssignmentModal.noPipelineStagesError'));
        }

        // Chỉ lấy thành viên Active (chưa Active như Pending/Rejected bị BE từ chối khi giao việc)
        const loadedMembers = (membersData || []).filter(
          (m) => !m.status || m.status.toLowerCase() === 'active',
        );
        setMembers(loadedMembers);

        // Khởi tạo phân công kế hoạch theo stage cho toàn chương
        const initialPlanMap: Record<
          string,
          { enabled: boolean; assigneeUserId: string; brief: string; dueDate: string }
        > = {};
        loadedStages.forEach((s) => {
          const sRole = s.allowedRole ? normalizeWorkspaceRole(s.allowedRole) : null;
          const matching = loadedMembers.filter((m) => {
            if (!sRole) return true;
            return normalizeWorkspaceRole(m.studioRole) === sRole;
          });
          initialPlanMap[s.id] = {
            enabled: true,
            assigneeUserId: matching[0]?.userId || '',
            brief: '',
            dueDate: '',
          };
        });
        setPlanStageAssignments(initialPlanMap);

        // Lọc người nhận theo allowedRole của stage đã chọn dựa trên vai trò trong Workspace (studioRole)
        const targetStage = loadedStages.find((s) => s.id === targetStageId) || loadedStages[0];
        const targetAllowedRole = targetStage?.allowedRole
          ? normalizeWorkspaceRole(targetStage.allowedRole)
          : null;
        const initialMatchingMembers = loadedMembers.filter((m) => {
          if (!targetAllowedRole) return true;
          return normalizeWorkspaceRole(m.studioRole) === targetAllowedRole;
        });

        if (initialMatchingMembers.length > 0) {
          setAssigneeUserId(initialMatchingMembers[0].userId);
        } else {
          setAssigneeUserId('');
        }

        if (assignmentsData) {
          setExistingAssignments(assignmentsData);
        }

        const loadedPages = pagesData || [];
        setPages(loadedPages);
        if (loadedPages.length > 0) {
          const pageNumbers = loadedPages.map((page) => page.pageNumber);
          setSelectedPageId(loadedPages[0].id);
          setSelectedTargetIds([loadedPages[0].id]);
          setBulkPageIds(loadedPages.map((p) => p.id));
          setPageRangeFrom(Math.min(...pageNumbers));
          setPageRangeTo(Math.max(...pageNumbers));
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || t('producer.createAssignmentModal.initLoadError'));
      })
      .finally(() => {
        if (isMounted) {
          setLoadingInitial(false);
          setLoadingPages(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId, seriesId, chapterId]);

  // Nạp danh sách Panel khi chuyển sang phạm vi Panel và đã chọn Trang
  useEffect(() => {
    if (!isOpen || entityType !== 'Panel' || !selectedPageId) {
      setPanels([]);
      setSelectedPanelId('');
      return;
    }

    let isMounted = true;
    setLoadingPanels(true);

    panelService
      .getPanelsByPage(selectedPageId)
      .then((data) => {
        if (!isMounted) return;
        setPanels(data || []);
        if (data && data.length > 0) {
          setSelectedPanelId(data[0].id);
        } else {
          setSelectedPanelId('');
        }
      })
      .catch((err) => {
        console.warn('Lỗi nạp danh sách panel của trang:', err);
        if (isMounted) {
          setPanels([]);
          setSelectedPanelId('');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingPanels(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, entityType, selectedPageId]);

  useEffect(() => {
    if (selectedPageId) {
      setSelectedTargetIds((prev) => (prev.length === 0 ? [selectedPageId] : prev));
    }
  }, [selectedPageId]);

  // Nạp gợi ý người nhận việc tối ưu khi đổi pipelineStageId hoặc chapterId (GET /assignee-suggestions)
  useEffect(() => {
    if (
      !isOpen ||
      !chapterId ||
      !pipelineStageId ||
      typeof assignmentService.getAssigneeSuggestions !== 'function'
    ) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setLoadingSuggestions(true);
    assignmentService
      .getAssigneeSuggestions(chapterId, pipelineStageId)
      .then((data) => {
        if (!isMounted) return;
        setSuggestions(data || []);
        if (data && data.length > 0) {
          setAssigneeUserId((prev) => {
            if (!prev || !data.some((s) => s.userId === prev)) {
              return data[0].userId;
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        console.warn('Lỗi nạp gợi ý người nhận:', err);
        if (isMounted) setSuggestions([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSuggestions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, chapterId, pipelineStageId]);

  // Stage hiện tại được chọn và vai trò yêu cầu
  const currentStage = useMemo(
    () => stages.find((s) => s.id === pipelineStageId),
    [stages, pipelineStageId],
  );

  const requiredRole = currentStage?.allowedRole || null;
  const normRequiredRole = useMemo(
    () => (requiredRole ? normalizeWorkspaceRole(requiredRole) : null),
    [requiredRole],
  );

  // Danh sách thành viên khớp với vai trò yêu cầu của công đoạn (theo WorkspaceRole)
  const filteredMembers = useMemo(() => {
    if (!normRequiredRole) return members;
    return members.filter((m) => {
      const mRole = normalizeWorkspaceRole(m.studioRole);
      return mRole === normRequiredRole;
    });
  }, [members, normRequiredRole]);

  // Thông tin gợi ý ứng viên đang được chọn (để hiện reasons chip)
  const selectedSuggestion = useMemo(() => {
    return suggestions.find((s) => s.userId === assigneeUserId);
  }, [suggestions, assigneeUserId]);

  // Xử lý khi người dùng đổi công đoạn Pipeline
  const handleStageChange = (newStageId: string) => {
    setPipelineStageId(newStageId);
    setError(null);
    setDryRunResult(null);

    const newStage = stages.find((s) => s.id === newStageId);
    const newNormRole = newStage?.allowedRole ? normalizeWorkspaceRole(newStage.allowedRole) : null;

    const matching = members.filter((m) => {
      if (!newNormRole) return true;
      return normalizeWorkspaceRole(m.studioRole) === newNormRole;
    });

    if (matching.length > 0) {
      // Nếu người đang chọn vẫn hợp lệ thì giữ nguyên, ngược lại chọn người đầu tiên
      if (!matching.some((m) => m.userId === assigneeUserId)) {
        setAssigneeUserId(matching[0].userId);
      }
    } else {
      setAssigneeUserId('');
    }
  };

  // Lọc các phân công nhiệm vụ thuộc công đoạn đang chọn (phục vụ kiểm tra chồng phạm vi theo BR-07 / BE 2026-10-21)
  const existingAtStage = useMemo(() => {
    if (!pipelineStageId) return [];
    return existingAssignments.filter((a) => a.pipelineStageId === pipelineStageId);
  }, [existingAssignments, pipelineStageId]);

  const chapterAssignmentAtStage = useMemo(
    () => existingAtStage.find((a) => a.entityType === 'Chapter'),
    [existingAtStage],
  );

  const isChapterAssignedAtStage = Boolean(chapterAssignmentAtStage);

  // Stage có cho phép tách trang/khung từ việc cả chương không?
  // Theo BE 2026-10-21: Chỉ stage của Artist/Letterer và việc cả chương đang Assigned/InProgress/ReworkRequired
  const canCarveOutFromChapter = useMemo(() => {
    if (!chapterAssignmentAtStage) return false;
    const isArtistOrLettererStage =
      normRequiredRole === 'ARTIST' || normRequiredRole === 'LETTERER';
    if (!isArtistOrLettererStage) return false;
    const s = String(chapterAssignmentAtStage.status);
    return s === 'Assigned' || s === 'InProgress' || s === 'ReworkRequired';
  }, [chapterAssignmentAtStage, normRequiredRole]);

  const assignedPageIdsAtStage = useMemo(() => {
    return new Set(
      existingAtStage.filter((a) => a.entityType === 'Page').map((a) => a.targetEntityId),
    );
  }, [existingAtStage]);

  const assignedPanelIdsAtStage = useMemo(() => {
    return new Set(
      existingAtStage.filter((a) => a.entityType === 'Panel').map((a) => a.targetEntityId),
    );
  }, [existingAtStage]);

  const pageRangeConflict = useMemo(() => {
    if (!isBulkMode || entityType !== 'Page') return null;
    if (pageRangeFrom === null || pageRangeTo === null || pageRangeFrom > pageRangeTo) {
      return t('producer.createAssignmentModal.pageRangeInvalid');
    }

    const selectedPages = pages.filter(
      (page) => page.pageNumber >= pageRangeFrom && page.pageNumber <= pageRangeTo,
    );
    if (selectedPages.length === 0) return t('producer.createAssignmentModal.pageRangeEmpty');

    const overlappingNumbers = selectedPages
      .filter((page) => assignedPageIdsAtStage.has(page.id))
      .map((page) => page.pageNumber);
    if (overlappingNumbers.length > 0) {
      return t('producer.createAssignmentModal.pageRangeOverlap', {
        pages: overlappingNumbers.join(', '),
      });
    }
    return null;
  }, [assignedPageIdsAtStage, entityType, isBulkMode, pageRangeFrom, pageRangeTo, pages, t]);

  const hasAnyPageOrPanelAssignedAtStage = useMemo(
    () => assignedPageIdsAtStage.size > 0 || assignedPanelIdsAtStage.size > 0,
    [assignedPageIdsAtStage, assignedPanelIdsAtStage],
  );

  // Tự động chuyển sang Page nếu stage đã giao cả chương nhưng cho phép tách trang/khung
  useEffect(() => {
    if (isChapterAssignedAtStage && canCarveOutFromChapter && entityType === 'Chapter') {
      setEntityType('Page');
    }
  }, [isChapterAssignedAtStage, canCarveOutFromChapter, entityType]);

  // Kiểm tra xung đột phạm vi giao việc theo quy tắc ScopeOverlap của Backend (tránh lỗi 409 CONFLICT)
  const scopeOverlapWarning = useMemo((): string | null => {
    if (!pipelineStageId) return null;

    if (pageRangeConflict) return pageRangeConflict;

    const stageLabel = currentStage?.name || t('producer.createAssignmentModal.thisStageFallback');

    if (isChapterAssignedAtStage) {
      if (entityType === 'Chapter') {
        return t('producer.createAssignmentModal.overlapChapterAssigned', { stage: stageLabel });
      }
      if (!canCarveOutFromChapter) {
        const isArtistOrLettererStage =
          normRequiredRole === 'ARTIST' || normRequiredRole === 'LETTERER';
        if (!isArtistOrLettererStage) {
          return t('producer.createAssignmentModal.overlapNoCarveOut', {
            stage: stageLabel,
            role: requiredRole || t('producer.createAssignmentModal.thisRoleFallback'),
          });
        }
        return t('producer.createAssignmentModal.overlapChapterStatus', {
          stage: stageLabel,
          status: chapterAssignmentAtStage?.status,
        });
      }
    }

    if (entityType === 'Chapter' && hasAnyPageOrPanelAssignedAtStage) {
      return t('producer.createAssignmentModal.overlapHasPageOrPanel', { stage: stageLabel });
    }

    if (entityType === 'Page') {
      if (selectedPageId && assignedPageIdsAtStage.has(selectedPageId)) {
        return t('producer.createAssignmentModal.overlapPageAssigned');
      }
      if (selectedPageId && panels.some((p) => assignedPanelIdsAtStage.has(p.id))) {
        return t('producer.createAssignmentModal.overlapPageHasPanel');
      }
    }

    if (entityType === 'Panel') {
      if (selectedPageId && assignedPageIdsAtStage.has(selectedPageId)) {
        return t('producer.createAssignmentModal.overlapPanelPageAssigned');
      }
      if (selectedPanelId && assignedPanelIdsAtStage.has(selectedPanelId)) {
        return t('producer.createAssignmentModal.overlapPanelAssigned');
      }
    }

    return null;
  }, [
    pipelineStageId,
    currentStage?.name,
    isChapterAssignedAtStage,
    chapterAssignmentAtStage,
    canCarveOutFromChapter,
    normRequiredRole,
    requiredRole,
    entityType,
    hasAnyPageOrPanelAssignedAtStage,
    selectedPageId,
    assignedPageIdsAtStage,
    panels,
    assignedPanelIdsAtStage,
    selectedPanelId,
    pageRangeConflict,
    t,
  ]);

  // Tự động chuyển sang trang chưa được giao việc nếu trang đang chọn bị trùng ở stage này
  useEffect(() => {
    if (entityType === 'Page' && pages.length > 0) {
      if (assignedPageIdsAtStage.has(selectedPageId)) {
        const availablePage = pages.find((p) => !assignedPageIdsAtStage.has(p.id));
        if (availablePage) {
          setSelectedPageId(availablePage.id);
        }
      }
    }
  }, [entityType, pages, assignedPageIdsAtStage, selectedPageId]);

  // Tự động chuyển sang khung chưa được giao việc nếu khung đang chọn bị trùng ở stage này
  useEffect(() => {
    if (entityType === 'Panel' && panels.length > 0) {
      if (assignedPanelIdsAtStage.has(selectedPanelId)) {
        const availablePanel = panels.find((p) => !assignedPanelIdsAtStage.has(p.id));
        if (availablePanel) {
          setSelectedPanelId(availablePanel.id);
        }
      }
    }
  }, [entityType, panels, assignedPanelIdsAtStage, selectedPanelId]);

  if (!isOpen) return null;

  // Kiểm tra xung đột trước khi giao việc hàng loạt (POST /assignments/bulk kèm dryRun = true)
  const handleDryRun = async () => {
    if (pageRangeConflict) {
      setError(pageRangeConflict);
      return;
    }
    if (!pipelineStageId || !assigneeUserId || !brief.trim()) {
      setError(t('producer.createAssignmentModal.dryRunMissingFields'));
      return;
    }
    if (dueDate && dueDate < todayStr) {
      setError(t('producer.createAssignmentModal.pastDueDateError'));
      return;
    }
    setDryRunLoading(true);
    setError(null);
    try {
      const result = await assignmentService.createBulkAssignments(chapterId, {
        pipelineStageId,
        assigneeUserId,
        brief: brief.trim(),
        pageIds: bulkPageIds.length > 0 ? bulkPageIds : null,
        referenceNotes: referenceNotes.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        dryRun: true,
      });
      setDryRunResult(result);
      const conflictCount = result.items.filter((i) => i.conflictReason).length;
      if (conflictCount > 0) {
        onShowToast?.(
          t('producer.createAssignmentModal.conflictDetectedTitle'),
          t('producer.createAssignmentModal.conflictDetectedDesc', { count: conflictCount }),
        );
      } else {
        onShowToast?.(
          t('producer.createAssignmentModal.readyToAssignTitle'),
          t('producer.createAssignmentModal.readyToAssignDesc'),
        );
      }
    } catch (err: any) {
      const msg = extractError(err, t('producer.createAssignmentModal.bulkDryRunError'));
      setError(msg);
    } finally {
      setDryRunLoading(false);
    }
  };

  // Nạp mẫu từ chương trước (GET /assignments/plan-template)
  const handleLoadTemplate = async () => {
    setLoadingTemplate(true);
    setError(null);
    try {
      const template = await assignmentService.getAssignmentPlanTemplate(chapterId);
      if (!template.sourceChapterId || !template.stages || template.stages.length === 0) {
        onShowToast?.(
          t('producer.createAssignmentModal.noticeTitle'),
          t('producer.createAssignmentModal.noTemplateSource'),
        );
        return;
      }
      setTemplateSourceChapter(
        typeof template.sourceChapterNumber === 'number'
          ? template.sourceChapterNumber
          : Number(template.sourceChapterNumber) || null,
      );

      if (assignmentMode === 'single') {
        const match = template.stages.find((s) => s.pipelineStageId === pipelineStageId);
        if (match) {
          if (members.some((m) => m.userId === match.assigneeUserId)) {
            setAssigneeUserId(match.assigneeUserId);
          }
          if (match.brief) {
            setBrief(match.brief);
          }
          onShowToast?.(
            t('producer.createAssignmentModal.templateLoadedTitle'),
            t('producer.createAssignmentModal.templateLoadedSingleDesc', {
              chapter: template.sourceChapterNumber,
              assignee: match.assigneeName,
            }),
          );
        } else {
          onShowToast?.(
            t('producer.createAssignmentModal.noticeTitle'),
            t('producer.createAssignmentModal.templateStageMissingDesc', {
              chapter: template.sourceChapterNumber,
            }),
          );
        }
      } else {
        // Plan mode: cập nhật người nhận và brief của các stage từ template
        setPlanStageAssignments((prev) => {
          const next = { ...prev };
          template.stages.forEach((ts) => {
            if (next[ts.pipelineStageId]) {
              next[ts.pipelineStageId] = {
                ...next[ts.pipelineStageId],
                enabled: true,
                assigneeUserId: ts.assigneeUserId || next[ts.pipelineStageId].assigneeUserId,
                brief: ts.brief || next[ts.pipelineStageId].brief,
              };
            }
          });
          return next;
        });
        onShowToast?.(
          t('producer.createAssignmentModal.templatePlanLoadedTitle'),
          t('producer.createAssignmentModal.templatePlanLoadedDesc', {
            chapter: template.sourceChapterNumber,
            count: template.stages.length,
          }),
        );
      }
    } catch (err: any) {
      const msg = extractError(err, t('producer.createAssignmentModal.templateLoadError'));
      setError(msg);
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Kiểm tra trước kế hoạch toàn chương (POST /assignments/plan kèm dryRun = true)
  const handlePlanDryRun = async () => {
    const activePlanStages = stages
      .filter((s) => planStageAssignments[s.id]?.enabled)
      .map((s) => ({
        pipelineStageId: s.id,
        assigneeUserId: planStageAssignments[s.id]?.assigneeUserId,
        brief: planStageAssignments[s.id]?.brief?.trim() || undefined,
        dueDate: planStageAssignments[s.id]?.dueDate
          ? new Date(planStageAssignments[s.id].dueDate).toISOString()
          : undefined,
      }));

    if (activePlanStages.length === 0) {
      setError(t('producer.createAssignmentModal.planSelectStageError'));
      return;
    }

    const missingAssignee = activePlanStages.find((s) => !s.assigneeUserId);
    if (missingAssignee) {
      const stg = stages.find((s) => s.id === missingAssignee.pipelineStageId);
      setError(
        t('producer.createAssignmentModal.planMissingAssigneeError', {
          stage: stg?.name || 'Pipeline',
        }),
      );
      return;
    }

    if (!planBrief.trim() && activePlanStages.some((s) => !s.brief)) {
      setError(t('producer.createAssignmentModal.planMissingBriefError'));
      return;
    }

    if (planDueDate && planDueDate < todayStr) {
      setError(t('producer.createAssignmentModal.planPastDueDateError'));
      return;
    }

    setPlanDryRunLoading(true);
    setError(null);
    try {
      const payload: CreateAssignmentPlanRequest = {
        stages: activePlanStages,
        brief:
          planBrief.trim() ||
          activePlanStages[0]?.brief ||
          t('producer.createAssignmentModal.planDefaultBrief'),
        referenceNotes: planReferenceNotes.trim() || undefined,
        dueDate: planDueDate ? new Date(planDueDate).toISOString() : undefined,
        priority: planPriority,
        dryRun: true,
      };
      const result = await assignmentService.createAssignmentPlan(chapterId, payload);
      setPlanDryRunResult(result);
      onShowToast?.(
        t('producer.createAssignmentModal.planCheckTitle'),
        t('producer.createAssignmentModal.planCheckDesc', {
          createdCount: result.createdCount,
          stageCount: result.stages.filter((s) => !s.skippedReason).length,
        }),
      );
    } catch (err: any) {
      const msg = extractError(err, t('producer.createAssignmentModal.planCheckError'));
      setError(msg);
    } finally {
      setPlanDryRunLoading(false);
    }
  };

  // Submit kế hoạch toàn chương (POST /assignments/plan)
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activePlanStages = stages
      .filter((s) => planStageAssignments[s.id]?.enabled)
      .map((s) => ({
        pipelineStageId: s.id,
        assigneeUserId: planStageAssignments[s.id]?.assigneeUserId,
        brief: planStageAssignments[s.id]?.brief?.trim() || undefined,
        dueDate: planStageAssignments[s.id]?.dueDate
          ? new Date(planStageAssignments[s.id].dueDate).toISOString()
          : undefined,
      }));

    if (activePlanStages.length === 0) {
      setError(t('producer.createAssignmentModal.planSelectStageError'));
      return;
    }

    const missingAssignee = activePlanStages.find((s) => !s.assigneeUserId);
    if (missingAssignee) {
      const stg = stages.find((s) => s.id === missingAssignee.pipelineStageId);
      setError(
        t('producer.createAssignmentModal.planMissingAssigneeError', {
          stage: stg?.name || 'Pipeline',
        }),
      );
      return;
    }

    if (!planBrief.trim() && activePlanStages.some((s) => !s.brief)) {
      setError(t('producer.createAssignmentModal.planMissingBriefError'));
      return;
    }

    if (planDueDate && planDueDate < todayStr) {
      setError(t('producer.createAssignmentModal.planPastDueDateError'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateAssignmentPlanRequest = {
        stages: activePlanStages,
        brief:
          planBrief.trim() ||
          activePlanStages[0]?.brief ||
          t('producer.createAssignmentModal.planDefaultBrief'),
        referenceNotes: planReferenceNotes.trim() || undefined,
        dueDate: planDueDate ? new Date(planDueDate).toISOString() : undefined,
        priority: planPriority,
        dryRun: false,
      };
      const result = await assignmentService.createAssignmentPlan(chapterId, payload);
      onShowToast?.(
        t('producer.createAssignmentModal.planSubmitSuccessTitle'),
        t('producer.createAssignmentModal.planSubmitSuccessDesc', {
          count: result.createdCount,
        }),
      );
      onSuccess?.({} as any);
      onClose();
    } catch (err: any) {
      const msg = extractError(err, t('producer.createAssignmentModal.planSubmitError'));
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (scopeOverlapWarning) {
      setError(scopeOverlapWarning);
      return;
    }

    if (!brief.trim()) {
      setError(t('producer.createAssignmentModal.briefRequiredError'));
      return;
    }
    if (stages.length === 0 || !pipelineStageId) {
      setError(t('producer.createAssignmentModal.noValidStageError'));
      return;
    }
    if (dueDate && dueDate < todayStr) {
      setError(t('producer.createAssignmentModal.pastDueDateError'));
      return;
    }
    if (!assigneeUserId) {
      if (normRequiredRole && filteredMembers.length === 0) {
        setError(
          t('producer.createAssignmentModal.noMemberWithRoleError', {
            stage: currentStage?.name,
            role: requiredRole,
          }),
        );
      } else {
        setError(t('producer.createAssignmentModal.assigneeRequiredError'));
      }
      return;
    }

    // Nếu đang ở chế độ giao việc hàng loạt theo Trang
    if (isBulkMode && entityType === 'Page') {
      if (bulkPageIds.length === 0) {
        setError(t('producer.createAssignmentModal.bulkSelectPageError'));
        return;
      }
      setSubmitting(true);
      try {
        const result = await assignmentService.createBulkAssignments(chapterId, {
          pipelineStageId,
          assigneeUserId,
          brief: brief.trim(),
          pageIds: bulkPageIds,
          referenceNotes: referenceNotes.trim() || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          priority,
          dryRun: false,
        });
        onShowToast?.(
          t('producer.createAssignmentModal.bulkSuccessTitle'),
          t('producer.createAssignmentModal.bulkSuccessDesc', {
            count: result.createdCount,
            stage: currentStage?.name || 'Pipeline',
          }),
        );
        onSuccess?.({} as any);
        onClose();
      } catch (err: any) {
        const msg = extractError(err, t('producer.createAssignmentModal.bulkError'));
        setError(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Kiểm tra tính hợp lệ của phạm vi giao việc
    let targetEntityId: string | null = null;
    if (entityType === 'Page') {
      if (!selectedPageId) {
        setError(t('producer.createAssignmentModal.selectPageError'));
        return;
      }
      targetEntityId = selectedPageId;
    } else if (entityType === 'Panel') {
      if (!selectedPageId) {
        setError(t('producer.createAssignmentModal.selectPanelPageError'));
        return;
      }
      if (!selectedPanelId) {
        setError(t('producer.createAssignmentModal.selectPanelError'));
        return;
      }
      targetEntityId = selectedPanelId;
    }

    setSubmitting(true);

    const payload: CreateAssignmentRequest = {
      entityType,
      targetEntityId,
      pipelineStageId,
      assigneeUserId,
      brief: brief.trim(),
      referenceNotes: referenceNotes.trim() || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      dependsOnAssignmentId: selectedDependsOnIds[0] || dependsOnAssignmentId.trim() || null,
      dependsOnAssignmentIds: selectedDependsOnIds.length > 0 ? selectedDependsOnIds : undefined,
    };

    try {
      // Phần nằm trong việc cả chương cùng công đoạn: BE chặn tạo việc chồng phạm vi, phải chuyển giao (lý do riêng hoặc fallback brief)
      const targetIds =
        selectedTargetIds.length > 0 ? selectedTargetIds : targetEntityId ? [targetEntityId] : [];

      const created =
        chapterAssignmentAtStage && canCarveOutFromChapter && targetIds.length > 0
          ? (
              await assignmentService.transferAssignmentScope(
                chapterId,
                chapterAssignmentAtStage.id,
                {
                  targetType: entityType as 'Page' | 'Panel',
                  targetIds,
                  newAssigneeUserId: assigneeUserId,
                  reason: transferReason.trim() || brief.trim(),
                  brief: brief.trim(),
                  dueDate: payload.dueDate,
                },
              )
            )[0]
          : await assignmentService.createAssignment(chapterId, payload);
      onShowToast?.(
        t('producer.createAssignmentModal.createSuccessTitle'),
        t('producer.createAssignmentModal.createSuccessDesc', {
          stage: currentStage?.name || 'Pipeline',
        }),
      );
      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      const msg = extractError(err, t('producer.createAssignmentModal.createError'));
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      title={
        chapterNumber
          ? t('producer.createAssignmentModal.modalTitleWithChapter', { chapter: chapterNumber })
          : t('producer.createAssignmentModal.modalTitle')
      }
      closeLabel={t('producer.createAssignmentModal.closeLabel')}
    >
      <div className='bg-[#FCFBF8] border border-stone-200/90 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden'>
        {/* Mode Switcher Tabs */}
        <div className='px-4 sm:px-5 py-2.5 bg-[#FAF8F5] border-b border-stone-200 flex items-center justify-between gap-3 shrink-0'>
          <div className='flex items-center gap-1 p-1 bg-stone-200/60 rounded-xl border border-stone-200/80'>
            <button
              type='button'
              onClick={() => {
                setAssignmentMode('single');
                setError(null);
              }}
              data-testid='tab-mode-single'
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-studio ${
                assignmentMode === 'single'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('producer.createAssignmentModal.tabSingle')}
            </button>
            <button
              type='button'
              onClick={() => {
                setAssignmentMode('plan');
                setError(null);
              }}
              data-testid='tab-mode-plan'
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-studio ${
                assignmentMode === 'plan'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>{t('producer.createAssignmentModal.tabPlan')}</span>
              <span className='px-1.5 py-0.2 bg-orange-100 text-orange-800 rounded text-[10px] font-bold uppercase'>
                {t('producer.createAssignmentModal.newBadge')}
              </span>
            </button>
          </div>

          {assignmentMode === 'plan' && (
            <button
              type='button'
              onClick={handleLoadTemplate}
              disabled={loadingTemplate}
              data-testid='load-plan-template-btn'
              className='text-xs px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-semibold flex items-center gap-1.5 transition-studio cursor-pointer disabled:opacity-50'
            >
              {loadingTemplate ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <History className='w-3.5 h-3.5' />
              )}
              <span>
                {templateSourceChapter !== null
                  ? t('producer.createAssignmentModal.reloadTemplate', {
                      chapter: templateSourceChapter,
                    })
                  : t('producer.createAssignmentModal.loadTemplate')}
              </span>
            </button>
          )}
        </div>

        {assignmentMode === 'plan' ? (
          /* Plan Mode Form Body */
          <form
            id='create-assignment-plan-form'
            onSubmit={handlePlanSubmit}
            className='p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm custom-scrollbar min-h-0'
          >
            {error && (
              <div className='p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed'>
                <AlertCircle className='w-4 h-4 shrink-0 mt-0.5 text-rose-600' />
                <span className='font-medium'>{error}</span>
              </div>
            )}

            {/* Plan Info Banner */}
            <div className='p-3.5 bg-orange-50/60 border border-orange-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-orange-900'>
              <Sparkles className='w-4 h-4 text-orange-600 shrink-0 mt-0.5' />
              <div className='leading-relaxed'>
                <span className='font-semibold'>
                  {t('producer.createAssignmentModal.planBannerTitle')}
                </span>{' '}
                {t('producer.createAssignmentModal.planBannerBody1')}
                <strong className='text-orange-950 font-medium'>
                  {t('producer.createAssignmentModal.planBannerYourTurn')}
                </strong>
                .
              </div>
            </div>

            {/* General Plan Settings */}
            <div className='p-4 bg-[#FAF8F5] rounded-2xl border border-stone-200/80 space-y-3.5'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                {t('producer.createAssignmentModal.planSettingsHeading')}
              </h3>

              {/* General Brief */}
              <div>
                <label
                  htmlFor='plan-general-brief'
                  className='block text-sm font-semibold text-stone-800 mb-1.5'
                >
                  {t('producer.createAssignmentModal.planBriefLabel')}
                </label>
                <textarea
                  id='plan-general-brief'
                  aria-label={t('producer.createAssignmentModal.planBriefAria')}
                  rows={2}
                  value={planBrief}
                  onChange={(e) => setPlanBrief(e.target.value)}
                  placeholder={t('producer.createAssignmentModal.planBriefPlaceholder')}
                  className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio resize-none shadow-xs'
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                {/* General Due Date */}
                <div>
                  <label
                    htmlFor='plan-due-date'
                    className='block text-sm font-semibold text-stone-800 mb-1.5'
                  >
                    {t('producer.createAssignmentModal.planDueDateLabel')}
                  </label>
                  <input
                    id='plan-due-date'
                    aria-label={t('producer.createAssignmentModal.planDueDateLabel')}
                    type='date'
                    min={todayStr}
                    value={planDueDate}
                    onChange={(e) => setPlanDueDate(e.target.value)}
                    className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-700 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                  />
                </div>

                {/* General Priority */}
                <div>
                  <label
                    htmlFor='plan-priority'
                    className='block text-sm font-semibold text-stone-800 mb-1.5'
                  >
                    {t('producer.createAssignmentModal.planPriorityLabel')}
                  </label>
                  <select
                    id='plan-priority'
                    aria-label={t('producer.createAssignmentModal.planPriorityLabel')}
                    value={planPriority}
                    onChange={(e) => setPlanPriority(e.target.value as AssignmentPriority)}
                    className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-700 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                  >
                    <option value='Low'>{t('producer.createAssignmentModal.priorityLow')}</option>
                    <option value='Medium'>
                      {t('producer.createAssignmentModal.priorityMedium')}
                    </option>
                    <option value='High'>{t('producer.createAssignmentModal.priorityHigh')}</option>
                    <option value='Urgent'>
                      {t('producer.createAssignmentModal.priorityUrgent')}
                    </option>
                  </select>
                </div>
              </div>

              {/* General Reference Notes */}
              <div>
                <label
                  htmlFor='plan-reference-notes'
                  className='block text-sm font-semibold text-stone-800 mb-1.5'
                >
                  {t('producer.createAssignmentModal.planRefNotesLabel')}
                </label>
                <input
                  id='plan-reference-notes'
                  aria-label={t('producer.createAssignmentModal.planRefNotesLabel')}
                  type='text'
                  value={planReferenceNotes}
                  onChange={(e) => setPlanReferenceNotes(e.target.value)}
                  placeholder={t('producer.createAssignmentModal.planRefNotesPlaceholder')}
                  className='w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 text-xs focus:outline-none focus:border-orange-500 transition-studio shadow-xs'
                />
              </div>
            </div>

            {/* Stages List */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                  {t('producer.createAssignmentModal.planStagesHeading', { count: stages.length })}
                </h3>
                <span className='text-xs text-stone-500'>
                  {t('producer.createAssignmentModal.planStagesSelected', {
                    selected: Object.values(planStageAssignments).filter((s) => s.enabled).length,
                    total: stages.length,
                  })}
                </span>
              </div>

              <div className='space-y-2.5'>
                {stages.map((stage) => {
                  const config = planStageAssignments[stage.id] || {
                    enabled: true,
                    assigneeUserId: '',
                    brief: '',
                    dueDate: '',
                  };
                  const normRole = stage.allowedRole
                    ? normalizeWorkspaceRole(stage.allowedRole)
                    : null;
                  const eligibleMembers = members.filter((m) => {
                    if (!normRole) return true;
                    return normalizeWorkspaceRole(m.studioRole) === normRole;
                  });
                  const dryRunStage = planDryRunResult?.stages.find(
                    (s) => s.pipelineStageId === stage.id,
                  );

                  return (
                    <div
                      key={stage.id}
                      data-testid={`plan-stage-card-${stage.id}`}
                      className={`p-3.5 rounded-2xl border transition-studio ${
                        config.enabled
                          ? 'bg-[#FAF8F5] border-stone-200/90 shadow-xs'
                          : 'bg-stone-50/60 border-stone-200/50 opacity-60'
                      }`}
                    >
                      <div className='flex items-center justify-between gap-2 mb-2.5'>
                        <label className='flex items-center gap-2.5 cursor-pointer select-none'>
                          <input
                            type='checkbox'
                            checked={config.enabled}
                            onChange={(e) => {
                              setPlanStageAssignments((prev) => ({
                                ...prev,
                                [stage.id]: {
                                  ...config,
                                  enabled: e.target.checked,
                                },
                              }));
                            }}
                            className='rounded border-stone-300 text-orange-600 focus:ring-orange-500'
                          />
                          <span className='font-semibold text-stone-900 text-sm'>
                            {stage.stageOrder}. {stage.name}
                          </span>
                          {stage.allowedRole && (
                            <span className='px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-700 text-xs font-medium'>
                              {stage.allowedRole}
                            </span>
                          )}
                        </label>

                        {dryRunStage && (
                          <div>
                            {dryRunStage.skippedReason ? (
                              <span className='px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium'>
                                {dryRunStage.skippedReason}
                              </span>
                            ) : (
                              <span className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium'>
                                {t('producer.createAssignmentModal.planStageTasksReady', {
                                  count: dryRunStage.items.length,
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {config.enabled && (
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1'>
                          <div>
                            <label
                              htmlFor={`plan-stage-assignee-${stage.id}`}
                              className='block text-xs font-semibold text-stone-700 mb-1'
                            >
                              {t('producer.createAssignmentModal.planStageAssigneeLabel')}
                            </label>
                            <select
                              id={`plan-stage-assignee-${stage.id}`}
                              aria-label={t(
                                'producer.createAssignmentModal.planStageAssigneeAria',
                                {
                                  stage: stage.name,
                                },
                              )}
                              value={config.assigneeUserId}
                              onChange={(e) => {
                                setPlanStageAssignments((prev) => ({
                                  ...prev,
                                  [stage.id]: {
                                    ...config,
                                    assigneeUserId: e.target.value,
                                  },
                                }));
                              }}
                              className='w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-700 font-medium focus:outline-none focus:border-orange-500 transition-studio'
                            >
                              <option value=''>
                                {t('producer.createAssignmentModal.planStageSelectAssignee')}
                              </option>
                              {eligibleMembers.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.fullName || m.email} ({m.studioRole})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`plan-stage-brief-${stage.id}`}
                              className='block text-xs font-semibold text-stone-700 mb-1'
                            >
                              {t('producer.createAssignmentModal.planStageBriefLabel')}
                            </label>
                            <input
                              id={`plan-stage-brief-${stage.id}`}
                              aria-label={t('producer.createAssignmentModal.planStageBriefAria', {
                                stage: stage.name,
                              })}
                              type='text'
                              value={config.brief}
                              placeholder={
                                planBrief.trim() ||
                                t(
                                  'producer.createAssignmentModal.planStageBriefFallbackPlaceholder',
                                )
                              }
                              onChange={(e) => {
                                setPlanStageAssignments((prev) => ({
                                  ...prev,
                                  [stage.id]: {
                                    ...config,
                                    brief: e.target.value,
                                  },
                                }));
                              }}
                              className='w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-orange-500 transition-studio'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Dry Run Result Notice */}
            {planDryRunResult && (
              <div className='p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs space-y-1.5'>
                <div className='flex items-center gap-2 font-semibold text-emerald-950'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                  <span>
                    {t('producer.createAssignmentModal.planDryRunTitle', {
                      count: planDryRunResult.createdCount,
                    })}
                  </span>
                </div>
                <p className='text-emerald-800 leading-relaxed'>
                  {t('producer.createAssignmentModal.planDryRunDescPrefix')}
                  <strong>{t('producer.createAssignmentModal.planDryRunDescStrong')}</strong>
                  {t('producer.createAssignmentModal.planDryRunDescSuffix')}
                </p>
              </div>
            )}
          </form>
        ) : (
          <form
            id='create-assignment-form'
            onSubmit={handleSubmit}
            className='p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm custom-scrollbar min-h-0'
          >
            {error && !isDependencyError && (
              <div className='p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed'>
                <AlertCircle className='w-4 h-4 shrink-0 mt-0.5 text-rose-600' />
                <span className='font-medium'>{error}</span>
              </div>
            )}

            {scopeOverlapWarning && (
              <div className='p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed'>
                <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5 text-amber-600' />
                <div>
                  <span className='font-semibold'>
                    {t('producer.createAssignmentModal.scopeOverlapPrefix')}
                  </span>{' '}
                  <span>{scopeOverlapWarning}</span>
                </div>
              </div>
            )}

            {loadingInitial ? (
              <div className='py-12 text-center text-stone-500 text-xs'>
                <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-orange-600' />
                <span>{t('producer.createAssignmentModal.loadingInitial')}</span>
              </div>
            ) : (
              <>
                {/* Entity Type & Target Entity Selection */}
                <div className='space-y-3.5 p-4 bg-[#FAF8F5] rounded-2xl border border-stone-200/80'>
                  <div
                    className={
                      entityType === 'Chapter'
                        ? 'space-y-1.5'
                        : 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                    }
                  >
                    <div>
                      <label
                        htmlFor='assignment-entity-type'
                        className='block text-sm font-semibold text-stone-800 mb-1.5'
                      >
                        {t('producer.createAssignmentModal.entityTypeLabel')}
                      </label>
                      <select
                        id='assignment-entity-type'
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value as WorkflowEntityType)}
                        className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                      >
                        <option
                          value='Chapter'
                          disabled={isChapterAssignedAtStage || hasAnyPageOrPanelAssignedAtStage}
                        >
                          {t('producer.createAssignmentModal.entityChapter')}
                          {isChapterAssignedAtStage
                            ? t('producer.createAssignmentModal.entityChapterAssigned')
                            : hasAnyPageOrPanelAssignedAtStage
                              ? t('producer.createAssignmentModal.entityChapterHasPages')
                              : ''}
                        </option>
                        <option
                          value='Page'
                          disabled={isChapterAssignedAtStage && !canCarveOutFromChapter}
                        >
                          {t('producer.createAssignmentModal.entityPage')}
                          {isChapterAssignedAtStage
                            ? canCarveOutFromChapter
                              ? t('producer.createAssignmentModal.entityCarveOutSuffix')
                              : t('producer.createAssignmentModal.entityAlreadyAssignedSuffix')
                            : ''}
                        </option>
                        <option
                          value='Panel'
                          disabled={isChapterAssignedAtStage && !canCarveOutFromChapter}
                        >
                          {t('producer.createAssignmentModal.entityPanel')}
                          {isChapterAssignedAtStage
                            ? canCarveOutFromChapter
                              ? t('producer.createAssignmentModal.entityCarveOutSuffix')
                              : t('producer.createAssignmentModal.entityAlreadyAssignedSuffix')
                            : ''}
                        </option>
                      </select>
                      {entityType === 'Chapter' && (
                        <p className='mt-1.5 text-xs text-stone-600 flex items-center gap-1.5'>
                          <Info className='w-4 h-4 text-orange-600 shrink-0' />
                          <span>
                            {t('producer.createAssignmentModal.chapterScopeNotice1')}
                            <strong className='text-stone-800'>
                              {t('producer.createAssignmentModal.chapterScopeNoticeChapter', {
                                chapter: chapterNumber || '',
                              })}
                            </strong>
                            {t('producer.createAssignmentModal.chapterScopeNotice2')}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Chọn Trang khi EntityType === 'Page' (Đơn lẻ hoặc Hàng loạt) */}
                    {entityType === 'Page' && (
                      <div className='sm:col-span-1'>
                        <div className='flex items-center justify-between mb-1.5'>
                          <label
                            htmlFor='assignment-page-select'
                            className='text-sm font-semibold text-stone-800 block'
                          >
                            {isBulkMode
                              ? t('producer.createAssignmentModal.selectBulkPagesLabel')
                              : t('producer.createAssignmentModal.selectPageLabel')}
                          </label>
                          {!isChapterAssignedAtStage && pages.length > 0 && (
                            <label className='flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-orange-600 hover:text-orange-700 select-none transition-studio'>
                              <input
                                type='checkbox'
                                checked={isBulkMode}
                                onChange={(e) => {
                                  setIsBulkMode(e.target.checked);
                                  if (e.target.checked && bulkPageIds.length === 0) {
                                    setBulkPageIds(pages.map((p) => p.id));
                                  }
                                  setDryRunResult(null);
                                }}
                                className='rounded border-stone-300 text-orange-600 focus:ring-orange-500'
                              />
                              <span>{t('producer.createAssignmentModal.bulkModeLabel')}</span>
                            </label>
                          )}
                        </div>

                        {loadingPages ? (
                          <div className='py-2.5 text-stone-500 text-xs flex items-center gap-1.5'>
                            <Loader2 className='w-4 h-4 animate-spin text-orange-600' />{' '}
                            {t('producer.createAssignmentModal.loadingPages')}
                          </div>
                        ) : pages.length > 0 ? (
                          isBulkMode ? (
                            <div
                              className='space-y-2.5 bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs'
                              data-testid='bulk-page-section'
                            >
                              <div className='grid grid-cols-2 gap-2'>
                                <div>
                                  <label
                                    htmlFor='assignment-page-range-from'
                                    className='mb-1 block text-xs font-semibold text-stone-700'
                                  >
                                    {t('producer.createAssignmentModal.fromPageLabel')}
                                  </label>
                                  <select
                                    id='assignment-page-range-from'
                                    aria-label={t('producer.createAssignmentModal.fromPageLabel')}
                                    value={pageRangeFrom ?? ''}
                                    onChange={(event) => {
                                      const from = Number(event.target.value);
                                      setPageRangeFrom(from);
                                      setBulkPageIds(
                                        pages
                                          .filter(
                                            (page) =>
                                              page.pageNumber >= from &&
                                              page.pageNumber <= (pageRangeTo ?? from),
                                          )
                                          .map((page) => page.id),
                                      );
                                      setDryRunResult(null);
                                    }}
                                    className='w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-medium text-stone-800'
                                  >
                                    {pages.map((page) => (
                                      <option key={page.id} value={page.pageNumber}>
                                        {t('producer.createAssignmentModal.pageOption', {
                                          number: page.pageNumber,
                                        })}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor='assignment-page-range-to'
                                    className='mb-1 block text-xs font-semibold text-stone-700'
                                  >
                                    {t('producer.createAssignmentModal.toPageLabel')}
                                  </label>
                                  <select
                                    id='assignment-page-range-to'
                                    aria-label={t('producer.createAssignmentModal.toPageLabel')}
                                    value={pageRangeTo ?? ''}
                                    onChange={(event) => {
                                      const to = Number(event.target.value);
                                      setPageRangeTo(to);
                                      setBulkPageIds(
                                        pages
                                          .filter(
                                            (page) =>
                                              page.pageNumber >= (pageRangeFrom ?? to) &&
                                              page.pageNumber <= to,
                                          )
                                          .map((page) => page.id),
                                      );
                                      setDryRunResult(null);
                                    }}
                                    className='w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-medium text-stone-800'
                                  >
                                    {pages.map((page) => (
                                      <option key={page.id} value={page.pageNumber}>
                                        {t('producer.createAssignmentModal.pageOption', {
                                          number: page.pageNumber,
                                        })}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {pageRangeConflict && (
                                <div
                                  role='alert'
                                  className='flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700'
                                >
                                  <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                                  <span>{pageRangeConflict}</span>
                                </div>
                              )}

                              <div className='flex items-center justify-between text-xs'>
                                <span className='font-semibold text-stone-700 font-mono'>
                                  {t('producer.createAssignmentModal.bulkSelectedCount', {
                                    selected: bulkPageIds.length,
                                    total: pages.length,
                                  })}
                                </span>
                                <div className='flex items-center gap-2'>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setBulkPageIds(pages.map((p) => p.id));
                                      setDryRunResult(null);
                                    }}
                                    className='text-orange-600 hover:underline font-semibold cursor-pointer transition-studio'
                                  >
                                    {t('producer.createAssignmentModal.selectAllBtn')}
                                  </button>
                                  <span className='text-stone-300'>|</span>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setBulkPageIds([]);
                                      setDryRunResult(null);
                                    }}
                                    className='text-stone-500 hover:text-stone-700 hover:underline font-medium cursor-pointer transition-studio'
                                  >
                                    {t('producer.createAssignmentModal.unselectAllBtn')}
                                  </button>
                                </div>
                              </div>

                              <div className='max-h-36 overflow-y-auto space-y-1 p-1 border border-stone-200 rounded-lg'>
                                {pages.map((p) => {
                                  const isChecked = bulkPageIds.includes(p.id);
                                  const dryRunItem = dryRunResult?.items.find(
                                    (i) => i.targetEntityId === p.id,
                                  );
                                  return (
                                    <div
                                      key={p.id}
                                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-studio ${
                                        dryRunItem?.conflictReason
                                          ? 'bg-rose-50 text-rose-900 border border-rose-200'
                                          : isChecked
                                            ? 'bg-orange-50/60 text-stone-900'
                                            : 'text-stone-600 hover:bg-stone-50'
                                      }`}
                                    >
                                      <label className='flex items-center gap-2 cursor-pointer flex-1'>
                                        <input
                                          type='checkbox'
                                          aria-label={t(
                                            'producer.createAssignmentModal.selectPageAria',
                                            {
                                              number: p.pageNumber,
                                            },
                                          )}
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setBulkPageIds((prev) => [...prev, p.id]);
                                            } else {
                                              setBulkPageIds((prev) =>
                                                prev.filter((id) => id !== p.id),
                                              );
                                            }
                                            setDryRunResult(null);
                                          }}
                                          className='rounded border-stone-300 text-orange-600 focus:ring-orange-500'
                                        />
                                        <span className='font-mono font-medium text-stone-800'>
                                          {t('producer.createAssignmentModal.pageOption', {
                                            number: p.pageNumber,
                                          })}
                                        </span>
                                        <span className='text-stone-500 text-xs'>
                                          ({p.layoutFormat})
                                        </span>
                                      </label>

                                      {dryRunItem && (
                                        <div className='text-xs flex items-center gap-1 font-medium'>
                                          {dryRunItem.conflictReason ? (
                                            <span className='text-rose-600 flex items-center gap-1 font-semibold'>
                                              <AlertCircle className='w-3.5 h-3.5' />
                                              {dryRunItem.conflictReason}
                                            </span>
                                          ) : (
                                            <span className='text-emerald-700 flex items-center gap-1 font-semibold'>
                                              <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                                              {t('producer.createAssignmentModal.validStatus')}
                                              {dryRunItem.dependsOnAssignmentIds &&
                                                dryRunItem.dependsOnAssignmentIds.length > 0 && (
                                                  <span className='text-stone-500 text-xs font-mono font-normal'>
                                                    {t(
                                                      'producer.createAssignmentModal.waitingTasksCount',
                                                      {
                                                        count:
                                                          dryRunItem.dependsOnAssignmentIds.length,
                                                      },
                                                    )}
                                                  </span>
                                                )}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className='flex items-center justify-between pt-1'>
                                <button
                                  type='button'
                                  onClick={handleDryRun}
                                  disabled={
                                    dryRunLoading ||
                                    bulkPageIds.length === 0 ||
                                    Boolean(pageRangeConflict)
                                  }
                                  className='btn-cta-secondary px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-studio'
                                >
                                  {dryRunLoading ? (
                                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                                  ) : (
                                    <Sparkles className='w-3.5 h-3.5 text-orange-600' />
                                  )}
                                  <span>{t('producer.createAssignmentModal.dryRunBtn')}</span>
                                </button>

                                {dryRunResult?.items.some((i) => i.conflictReason) && (
                                  <button
                                    type='button'
                                    onClick={() => {
                                      const conflictingIds = new Set(
                                        dryRunResult.items
                                          .filter((i) => i.conflictReason)
                                          .map((i) => i.targetEntityId),
                                      );
                                      setBulkPageIds((prev) =>
                                        prev.filter((id) => !conflictingIds.has(id)),
                                      );
                                    }}
                                    className='text-xs text-rose-600 hover:underline font-semibold cursor-pointer transition-studio'
                                  >
                                    {t('producer.createAssignmentModal.unselectConflictingBtn')}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <select
                              id='assignment-page-select'
                              value={selectedPageId}
                              onChange={(e) => setSelectedPageId(e.target.value)}
                              required
                              className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                            >
                              {pages.map((p) => {
                                const isAssigned = assignedPageIdsAtStage.has(p.id);
                                return (
                                  <option key={p.id} value={p.id} disabled={isAssigned}>
                                    {t('producer.createAssignmentModal.pageOption', {
                                      number: p.pageNumber,
                                    })}{' '}
                                    ({p.layoutFormat} • {p.widthPx}×{p.heightPx}
                                    px)
                                    {isAssigned
                                      ? t('producer.createAssignmentModal.pageAssignedSuffix')
                                      : ''}
                                  </option>
                                );
                              })}
                            </select>
                          )
                        ) : (
                          <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs'>
                            {t('producer.createAssignmentModal.noPagesInChapterWarning')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dropdowns chọn Trang và Panel khi EntityType === 'Panel' */}
                  {entityType === 'Panel' && (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-stone-200/80'>
                      <div>
                        <label
                          htmlFor='assignment-panel-page-select'
                          className='block text-sm font-semibold text-stone-800 mb-1.5 flex items-center gap-1.5'
                        >
                          <FileText className='w-4 h-4 text-stone-500' />
                          <span>{t('producer.createAssignmentModal.step1SelectPage')}</span>
                        </label>
                        {loadingPages ? (
                          <div className='py-2.5 text-stone-500 text-xs flex items-center gap-1.5'>
                            <Loader2 className='w-4 h-4 animate-spin text-orange-600' />{' '}
                            {t('producer.createAssignmentModal.loadingPages')}
                          </div>
                        ) : pages.length > 0 ? (
                          <select
                            id='assignment-panel-page-select'
                            value={selectedPageId}
                            onChange={(e) => setSelectedPageId(e.target.value)}
                            required
                            className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                          >
                            {pages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {t('producer.createAssignmentModal.pageOption', {
                                  number: p.pageNumber,
                                })}{' '}
                                ({p.layoutFormat})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs'>
                            {t('producer.createAssignmentModal.noPagesShort')}
                          </div>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor='assignment-panel-select'
                          className='block text-sm font-semibold text-stone-800 mb-1.5 flex items-center justify-between'
                        >
                          <span className='flex items-center gap-1.5'>
                            <Layers className='w-4 h-4 text-stone-500' />
                            <span>{t('producer.createAssignmentModal.step2SelectPanel')}</span>
                          </span>
                          {panels.length > 0 && (
                            <span className='text-xs text-stone-500 font-mono'>
                              {panels.length} panel
                            </span>
                          )}
                        </label>
                        {loadingPanels ? (
                          <div className='py-2.5 text-stone-500 text-xs flex items-center gap-1.5'>
                            <Loader2 className='w-4 h-4 animate-spin text-orange-600' />{' '}
                            {t('producer.createAssignmentModal.loadingPanels')}
                          </div>
                        ) : panels.length > 0 ? (
                          <select
                            id='assignment-panel-select'
                            value={selectedPanelId}
                            onChange={(e) => setSelectedPanelId(e.target.value)}
                            required
                            disabled={assignedPageIdsAtStage.has(selectedPageId)}
                            className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                          >
                            {panels.map((p) => {
                              const isAssigned = assignedPanelIdsAtStage.has(p.id);
                              return (
                                <option key={p.id} value={p.id} disabled={isAssigned}>
                                  Panel #{p.panelNumber ?? p.readingOrder ?? p.id.slice(0, 8)}{' '}
                                  {isAssigned
                                    ? t('producer.createAssignmentModal.pageAssignedSuffix')
                                    : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs'>
                            {t('producer.createAssignmentModal.noPanelsWarning')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isChapterAssignedAtStage &&
                    canCarveOutFromChapter &&
                    (entityType === 'Page' || entityType === 'Panel') && (
                      <div className='p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-3'>
                        <div className='flex items-center gap-2'>
                          <Sparkles className='w-4 h-4 text-blue-600 shrink-0' />
                          <span className='leading-relaxed'>
                            <strong>{t('producer.createAssignmentModal.carveOutTitle')}</strong>{' '}
                            {t('producer.createAssignmentModal.carveOutDesc')}
                          </span>
                        </div>

                        {/* Chọn nhiều trang cùng lúc khi chuyển giao Page */}
                        {entityType === 'Page' && pages.length > 0 && (
                          <div className='space-y-1.5' data-testid='transfer-multi-pages'>
                            <span className='text-xs font-semibold text-blue-950 flex items-center justify-between'>
                              <span>{t('producer.createAssignmentModal.carveOutSelectPages')}</span>
                              <span className='text-xs text-blue-700 font-mono font-medium'>
                                {t('producer.createAssignmentModal.carveOutSelectedCount', {
                                  count: selectedTargetIds.length,
                                })}
                              </span>
                            </span>
                            <div className='max-h-32 overflow-y-auto border border-blue-200 rounded-lg p-2 bg-white space-y-1'>
                              {pages.map((p) => {
                                const isChecked = selectedTargetIds.includes(p.id);
                                return (
                                  <label
                                    key={p.id}
                                    className='flex items-center gap-2 px-2 py-1 text-xs hover:bg-blue-50/50 rounded-lg cursor-pointer transition-studio'
                                  >
                                    <input
                                      type='checkbox'
                                      aria-label={t(
                                        'producer.createAssignmentModal.selectPageAria',
                                        {
                                          number: p.pageNumber,
                                        },
                                      )}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedTargetIds((prev) => [...prev, p.id]);
                                          setSelectedPageId(p.id);
                                        } else {
                                          setSelectedTargetIds((prev) =>
                                            prev.filter((id) => id !== p.id),
                                          );
                                        }
                                      }}
                                      className='rounded border-blue-300 text-orange-600 focus:ring-orange-500'
                                    />
                                    <span className='font-mono font-medium text-stone-800'>
                                      {t('producer.createAssignmentModal.pageOption', {
                                        number: p.pageNumber,
                                      })}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Ô nhập lý do chuyển giao riêng */}
                        <div>
                          <label
                            htmlFor='assignment-transfer-reason'
                            className='block font-semibold text-blue-950 mb-1 text-xs'
                          >
                            {t('producer.createAssignmentModal.transferReasonLabel')}
                          </label>
                          <input
                            id='assignment-transfer-reason'
                            aria-label={t('producer.createAssignmentModal.transferReasonAria')}
                            type='text'
                            value={transferReason}
                            onChange={(e) => setTransferReason(e.target.value)}
                            placeholder={t(
                              'producer.createAssignmentModal.transferReasonPlaceholder',
                            )}
                            className='w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500 transition-studio'
                          />
                        </div>
                      </div>
                    )}
                </div>

                {/* Pipeline Stage & Assignee with Role Filter */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                  <div>
                    <label
                      htmlFor='assignment-stage-select'
                      className='block text-sm font-semibold text-stone-800 mb-1.5'
                    >
                      {t('producer.createAssignmentModal.stageSelectLabel')}
                    </label>
                    {stages.length > 0 ? (
                      <select
                        id='assignment-stage-select'
                        value={pipelineStageId}
                        onChange={(e) => handleStageChange(e.target.value)}
                        required
                        className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                      >
                        {stages.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.stageOrder}. {st.name} {st.allowedRole ? `(${st.allowedRole})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className='p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5'>
                        <AlertCircle className='w-4 h-4 shrink-0 text-rose-600' />
                        <span>{t('producer.createAssignmentModal.noValidStagesWarning')}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-1.5'>
                      <div className='flex items-center justify-between w-full'>
                        <label
                          htmlFor='assignment-assignee-select'
                          className='block text-sm font-semibold text-stone-800'
                        >
                          {t('producer.createAssignmentModal.assigneeLabel')}
                        </label>
                        <button
                          type='button'
                          onClick={handleLoadTemplate}
                          disabled={loadingTemplate}
                          data-testid='apply-stage-template-btn'
                          title={t('producer.createAssignmentModal.applyTemplateTitle')}
                          className='text-xs text-orange-700 hover:text-orange-800 font-medium inline-flex items-center gap-1 hover:underline transition-studio cursor-pointer disabled:opacity-50'
                        >
                          {loadingTemplate ? (
                            <Loader2 className='w-3 h-3 animate-spin' />
                          ) : (
                            <History className='w-3 h-3' />
                          )}
                          <span>{t('producer.createAssignmentModal.applyTemplateBtn')}</span>
                        </button>
                      </div>
                      {requiredRole && (
                        <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'>
                          {t('producer.createAssignmentModal.requiredRoleBadge', {
                            role: requiredRole,
                          })}
                        </span>
                      )}
                    </div>
                    <select
                      id='assignment-assignee-select'
                      value={assigneeUserId}
                      onChange={(e) => setAssigneeUserId(e.target.value)}
                      required
                      className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                    >
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((m) => {
                          const isTop = suggestions[0]?.userId === m.userId;
                          return (
                            <option key={m.id} value={m.userId}>
                              {m.fullName || m.email.split('@')[0]} — {m.studioRole}
                              {isTop
                                ? t('producer.createAssignmentModal.bestSuggestionSuffix')
                                : ''}
                            </option>
                          );
                        })
                      ) : (
                        <option value=''>
                          {requiredRole
                            ? t('producer.createAssignmentModal.noMemberRoleOption', {
                                role: requiredRole,
                              })
                            : t('producer.createAssignmentModal.noMembersWorkspaceOption')}
                        </option>
                      )}
                    </select>

                    {/* Hiển thị lý do đề xuất của ứng viên đang chọn */}
                    {selectedSuggestion && selectedSuggestion.reasons?.length > 0 && (
                      <div
                        className='flex flex-wrap items-center gap-1.5 mt-2'
                        data-testid='assignee-reasons'
                      >
                        <span className='text-xs text-emerald-800 font-semibold flex items-center gap-1 mr-0.5'>
                          <ThumbsUp className='w-3.5 h-3.5 text-emerald-600' />{' '}
                          {t('producer.createAssignmentModal.suggestionReasonsLabel')}
                        </span>
                        {selectedSuggestion.reasons.map((r, idx) => (
                          <span
                            key={idx}
                            className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Nút chọn nhanh ứng viên tốt nhất nếu chưa chọn */}
                    {suggestions.length > 0 && suggestions[0].userId !== assigneeUserId && (
                      <div className='mt-2 flex items-center'>
                        <button
                          type='button'
                          onClick={() => setAssigneeUserId(suggestions[0].userId)}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 border border-emerald-300 transition-studio cursor-pointer active:scale-[0.98]'
                        >
                          <UserCheck className='w-3.5 h-3.5 text-emerald-600' />
                          <span>
                            {t('producer.createAssignmentModal.pickBestCandidateBtn', {
                              name: suggestions[0].fullName,
                            })}
                          </span>
                        </button>
                      </div>
                    )}

                    <p className='mt-2 text-xs text-stone-500 leading-snug flex items-center gap-1.5'>
                      <Info className='w-4 h-4 text-stone-400 shrink-0' />
                      <span>{t('producer.createAssignmentModal.autoAddMemberHint')}</span>
                    </p>

                    {/* Cảnh báo rõ ràng nếu Workspace chưa có thành viên đúng vai trò của stage */}
                    {filteredMembers.length === 0 && requiredRole && (
                      <div className='mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2 leading-relaxed'>
                        <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                        <div>
                          {t('producer.createAssignmentModal.missingRoleWarning1')}
                          <strong>{requiredRole}</strong>
                          {t('producer.createAssignmentModal.missingRoleWarning2')}
                          <strong>{requiredRole}</strong>
                          {t('producer.createAssignmentModal.missingRoleWarning3')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Brief (Required) */}
                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <label
                      htmlFor='assignment-brief-input'
                      className='text-sm font-semibold text-stone-800 block'
                    >
                      {t('producer.createAssignmentModal.briefLabel')}
                    </label>
                    <div className='flex items-center gap-2'>
                      {brief.length > 0 && (
                        <span className='text-xs text-stone-500 font-mono'>
                          {t('producer.createAssignmentModal.charCount', { count: brief.length })}
                        </span>
                      )}
                      <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200'>
                        {t('producer.createAssignmentModal.requiredBadge')}
                      </span>
                    </div>
                  </div>
                  <textarea
                    id='assignment-brief-input'
                    rows={3}
                    required
                    placeholder={t('producer.createAssignmentModal.briefPlaceholder')}
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                  />
                </div>

                {/* Reference Notes (Optional) */}
                <div>
                  <label
                    htmlFor='assignment-reference-input'
                    className='block text-sm font-semibold text-stone-800 mb-1.5'
                  >
                    {t('producer.createAssignmentModal.refNotesLabel')}
                  </label>
                  <div className='relative'>
                    <input
                      id='assignment-reference-input'
                      type='text'
                      placeholder={t('producer.createAssignmentModal.refNotesPlaceholder')}
                      value={referenceNotes}
                      onChange={(e) => setReferenceNotes(e.target.value)}
                      className='w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                    />
                    <Paperclip className='w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none' />
                  </div>
                </div>

                {/* Priority & Due Date */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                  <div>
                    <label
                      htmlFor='assignment-priority-select'
                      className='block text-sm font-semibold text-stone-800 mb-1.5'
                    >
                      {t('producer.createAssignmentModal.priorityLabel')}
                    </label>
                    <select
                      id='assignment-priority-select'
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as AssignmentPriority)}
                      className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                    >
                      <option value='Low'>
                        🟢 {t('producer.createAssignmentModal.priorityLow')}
                      </option>
                      <option value='Medium'>
                        🟡 {t('producer.createAssignmentModal.priorityMedium')}
                      </option>
                      <option value='High'>
                        🟠 {t('producer.createAssignmentModal.priorityHigh')}
                      </option>
                      <option value='Urgent'>
                        🔴 {t('producer.createAssignmentModal.priorityUrgent')}
                      </option>
                    </select>
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-1.5'>
                      <label
                        htmlFor='assignment-due-date-input'
                        className='text-sm font-semibold text-stone-800 block'
                      >
                        {t('producer.createAssignmentModal.dueDateLabel')}
                      </label>
                      {dueDateRelativeLabel && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${
                            dueDateRelativeLabel.key === 'overdue'
                              ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]'
                              : dueDateRelativeLabel.key === 'today'
                                ? 'bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]'
                                : 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]'
                          }`}
                        >
                          ({dueDateRelativeLabel.text})
                        </span>
                      )}
                    </div>
                    <input
                      id='assignment-due-date-input'
                      type='date'
                      min={todayStr}
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        if (error && (error.includes('quá khứ') || error.includes('past'))) {
                          setError(null);
                        }
                      }}
                      className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                    />

                    {/* Quick Preset Buttons */}
                    <div className='flex items-center gap-1.5 mt-2'>
                      <span className='text-xs text-stone-500 font-medium'>
                        {t('producer.createAssignmentModal.quickPresetLabel')}
                      </span>
                      {[
                        { label: t('producer.createAssignmentModal.preset3Days'), days: 3 },
                        { label: t('producer.createAssignmentModal.preset1Week'), days: 7 },
                        { label: t('producer.createAssignmentModal.preset2Weeks'), days: 14 },
                      ].map((preset) => (
                        <button
                          key={preset.days}
                          type='button'
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + preset.days);
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const dt = String(d.getDate()).padStart(2, '0');
                            setDueDate(`${y}-${m}-${dt}`);
                            if (error && (error.includes('quá khứ') || error.includes('past'))) {
                              setError(null);
                            }
                          }}
                          className='px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 hover:bg-orange-50 text-stone-700 hover:text-orange-700 border border-stone-200 hover:border-orange-200 transition-studio cursor-pointer active:scale-95'
                        >
                          {preset.label}
                        </button>
                      ))}
                      {dueDate && (
                        <button
                          type='button'
                          onClick={() => setDueDate('')}
                          className='text-xs text-stone-400 hover:text-stone-700 ml-auto hover:underline cursor-pointer transition-studio'
                        >
                          {t('producer.createAssignmentModal.clearDueDate')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dependency on another assignment (Cần hoàn thành trước · Thu gọn dạng Accordion) */}
                <div className='border border-stone-200 rounded-2xl overflow-hidden bg-[#FAF8F5] transition-studio'>
                  <button
                    type='button'
                    onClick={() => setShowDependencies((prev) => !prev)}
                    className='w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-100/60 transition-studio cursor-pointer'
                  >
                    <div className='flex items-center gap-2'>
                      <Network className='w-4 h-4 text-orange-600' />
                      <span className='font-semibold text-stone-800 text-sm'>
                        {t('producer.createAssignmentModal.dependenciesHeading')}
                      </span>
                      {selectedDependsOnIds.length > 0 ? (
                        <span className='px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-orange-100 text-orange-700 border border-orange-200'>
                          {t('producer.createAssignmentModal.dependenciesSelected', {
                            count: selectedDependsOnIds.length,
                          })}
                        </span>
                      ) : (
                        <span className='text-xs text-stone-500 font-normal'>
                          {t('producer.createAssignmentModal.optionalLabel')}
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-1.5 text-stone-500 text-xs'>
                      <span>
                        {showDependencies || isDependencyError
                          ? t('producer.createAssignmentModal.collapseBtn')
                          : t('producer.createAssignmentModal.configureBtn')}
                      </span>
                      {showDependencies || isDependencyError ? (
                        <ChevronUp className='w-4 h-4' />
                      ) : (
                        <ChevronDown className='w-4 h-4' />
                      )}
                    </div>
                  </button>

                  {(showDependencies || isDependencyError || selectedDependsOnIds.length > 0) && (
                    <div className='p-4 pt-1 border-t border-stone-200 bg-white'>
                      <DependencySelector
                        workspaceId={workspaceId}
                        seriesId={seriesId}
                        chapterId={chapterId}
                        chapterNumber={chapterNumber}
                        currentBrief={brief}
                        currentEntityType={entityType}
                        currentPageId={selectedPageId}
                        currentPanelId={selectedPanelId}
                        currentStageId={pipelineStageId}
                        stages={stages}
                        pages={pages}
                        members={members}
                        existingAssignments={existingAssignments}
                        selectedIds={selectedDependsOnIds}
                        onChange={(newIds) => {
                          setSelectedDependsOnIds(newIds);
                          setDependsOnAssignmentId(newIds[0] || '');
                        }}
                        backendError={isDependencyError ? error : null}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </form>
        )}

        {/* Pinned Bottom Footer Buttons */}
        <div className='p-4 sm:p-5 border-t border-stone-200 bg-[#FAF8F5] flex items-center justify-between gap-3 shrink-0 rounded-b-2xl'>
          <div className='text-xs text-stone-500 hidden sm:block'>
            {assignmentMode === 'plan' ? (
              <span>
                {t('producer.createAssignmentModal.footerPlanPrefix')}
                <strong className='text-stone-700 font-mono'>
                  {Object.values(planStageAssignments).filter((s) => s.enabled).length}
                </strong>
                {t('producer.createAssignmentModal.footerPlanSuffix')}
              </span>
            ) : isBulkMode && entityType === 'Page' ? (
              <span>
                {t('producer.createAssignmentModal.footerBulkPrefix')}
                <strong className='text-stone-700 font-mono'>{bulkPageIds.length}</strong>
                {t('producer.createAssignmentModal.footerBulkSuffix')}
              </span>
            ) : (
              <span>
                {t('producer.createAssignmentModal.footerScopeLabel')}{' '}
                <strong className='text-stone-700'>
                  {entityType === 'Chapter'
                    ? t('producer.createAssignmentModal.footerScopeChapter')
                    : entityType === 'Page'
                      ? t('producer.createAssignmentModal.footerScopePage')
                      : t('producer.createAssignmentModal.footerScopePanel')}
                </strong>
              </span>
            )}
          </div>
          <div className='flex items-center gap-3 ml-auto'>
            <button
              type='button'
              onClick={onClose}
              className='btn-cta-secondary px-5 py-2 rounded-full text-xs font-semibold transition-studio cursor-pointer active:scale-[0.98]'
            >
              {t('producer.createAssignmentModal.cancelBtn')}
            </button>
            {assignmentMode === 'plan' ? (
              <>
                <button
                  type='button'
                  onClick={handlePlanDryRun}
                  disabled={submitting || planDryRunLoading || stages.length === 0}
                  data-testid='dry-run-plan-btn'
                  className='btn-cta-secondary px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-studio cursor-pointer active:scale-[0.98]'
                >
                  {planDryRunLoading ? (
                    <Loader2 className='w-4 h-4 animate-spin text-orange-600' />
                  ) : (
                    <Sparkles className='w-4 h-4 text-orange-600' />
                  )}
                  <span>{t('producer.createAssignmentModal.planDryRunBtn')}</span>
                </button>
                <button
                  type='submit'
                  form='create-assignment-plan-form'
                  disabled={submitting || stages.length === 0}
                  data-testid='submit-plan-btn'
                  className='btn-cta-primary px-6 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-[var(--shadow-glow-orange)] disabled:opacity-50 transition-studio cursor-pointer active:scale-[0.98]'
                >
                  {submitting ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Plus className='w-4 h-4' />
                  )}
                  <span>{t('producer.createAssignmentModal.submitPlanBtn')}</span>
                </button>
              </>
            ) : (
              <button
                type='submit'
                form='create-assignment-form'
                disabled={
                  submitting ||
                  loadingInitial ||
                  stages.length === 0 ||
                  Boolean(scopeOverlapWarning) ||
                  (isBulkMode && entityType === 'Page' && bulkPageIds.length === 0)
                }
                className='btn-cta-primary px-6 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-[var(--shadow-glow-orange)] disabled:opacity-50 transition-studio cursor-pointer active:scale-[0.98]'
              >
                {submitting ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Plus className='w-4 h-4' />
                )}
                <span>
                  {isBulkMode && entityType === 'Page'
                    ? t('producer.createAssignmentModal.submitBulkBtn', {
                        count: bulkPageIds.length,
                      })
                    : t('producer.createAssignmentModal.submitSingleBtn')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
