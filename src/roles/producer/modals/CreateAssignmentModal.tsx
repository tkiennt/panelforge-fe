// src/roles/producer/modals/CreateAssignmentModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  const { t } = useTranslation('pipeline');
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
    if (diffDays < 0) return 'Đã quá hạn';
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Ngày mai';
    return `Còn ${diffDays} ngày`;
  }, [dueDate, todayStr]);

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
          loadedStages = pipelineData.stages.filter(
            (s) => s.isEnabled !== false && !s.isTerminal,
          );
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
          setError(
            'Series chưa có công đoạn Pipeline nào khả dụng hoặc không thể tải cấu hình Pipeline. Vui lòng cấu hình Pipeline trước khi giao việc.',
          );
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
          setSelectedPageId(loadedPages[0].id);
          setSelectedTargetIds([loadedPages[0].id]);
          setBulkPageIds(loadedPages.map((p) => p.id));
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Lỗi tải dữ liệu khởi tạo giao việc.');
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

    if (isChapterAssignedAtStage) {
      if (entityType === 'Chapter') {
        return `Công đoạn "${currentStage?.name || 'này'}" đã được giao cho cả chương. Không thể tạo thêm phân công cả chương ở công đoạn này.`;
      }
      if (!canCarveOutFromChapter) {
        const isArtistOrLettererStage =
          normRequiredRole === 'ARTIST' || normRequiredRole === 'LETTERER';
        if (!isArtistOrLettererStage) {
          return `Công đoạn "${currentStage?.name || 'này'}" đã giao cả chương cho ${requiredRole || 'vai trò này'}, không hỗ trợ tách trang hoặc khung.`;
        }
        return `Việc cả chương ở công đoạn "${currentStage?.name || 'này'}" đang ở trạng thái "${chapterAssignmentAtStage?.status}". Chỉ có thể tách trang/khung khi việc cả chương còn đang làm.`;
      }
    }

    if (entityType === 'Chapter' && hasAnyPageOrPanelAssignedAtStage) {
      return `Công đoạn "${currentStage?.name || 'này'}" đã có việc giao theo trang hoặc khung trong chương; không thể giao thêm việc cho cả chương.`;
    }

    if (entityType === 'Page') {
      if (selectedPageId && assignedPageIdsAtStage.has(selectedPageId)) {
        return 'Trang này đã được giao việc ở công đoạn đang chọn.';
      }
      if (selectedPageId && panels.some((p) => assignedPanelIdsAtStage.has(p.id))) {
        return 'Trang này đã có khung được giao việc ở công đoạn đang chọn; không thể giao thêm việc cho cả trang.';
      }
    }

    if (entityType === 'Panel') {
      if (selectedPageId && assignedPageIdsAtStage.has(selectedPageId)) {
        return 'Trang chứa khung này đã được giao việc ở công đoạn đang chọn; không thể giao thêm việc theo khung.';
      }
      if (selectedPanelId && assignedPanelIdsAtStage.has(selectedPanelId)) {
        return 'Khung hình này đã được giao việc ở công đoạn đang chọn.';
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

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Kiểm tra xung đột trước khi giao việc hàng loạt (POST /assignments/bulk kèm dryRun = true)
  const handleDryRun = async () => {
    if (!pipelineStageId || !assigneeUserId || !brief.trim()) {
      setError(
        'Vui lòng chọn công đoạn, người nhận và nhập yêu cầu công việc (Brief) trước khi kiểm tra xung đột.',
      );
      return;
    }
    if (dueDate && dueDate < todayStr) {
      setError('Hạn hoàn thành không thể ở trong quá khứ.');
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
          'Phát hiện xung đột',
          `Có ${conflictCount} trang bị xung đột không thể giao việc.`,
        );
      } else {
        onShowToast?.('Sẵn sàng giao việc', 'Tất cả các trang đều hợp lệ và không có xung đột.');
      }
    } catch (err: any) {
      const msg = extractError(err, 'Lỗi khi kiểm tra xung đột giao việc hàng loạt.');
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
        onShowToast?.('Thông báo', 'Chưa có chương trước nào được phân công để làm mẫu.');
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
            'Đã nạp mẫu',
            `Đã áp dụng mẫu từ Chương ${template.sourceChapterNumber}: ${match.assigneeName}.`,
          );
        } else {
          onShowToast?.(
            'Thông báo',
            `Chương ${template.sourceChapterNumber} chưa có phân công cho công đoạn này.`,
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
          'Đã nạp mẫu kế hoạch',
          `Đã nạp phân công từ Chương ${template.sourceChapterNumber} cho ${template.stages.length} công đoạn.`,
        );
      }
    } catch (err: any) {
      const msg = extractError(err, 'Không thể tải mẫu phân công từ chương trước.');
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
      setError('Vui lòng chọn ít nhất một công đoạn trong kế hoạch.');
      return;
    }

    const missingAssignee = activePlanStages.find((s) => !s.assigneeUserId);
    if (missingAssignee) {
      const stg = stages.find((s) => s.id === missingAssignee.pipelineStageId);
      setError(`Công đoạn "${stg?.name || 'Pipeline'}" chưa được chọn người nhận.`);
      return;
    }

    if (!planBrief.trim() && activePlanStages.some((s) => !s.brief)) {
      setError('Vui lòng nhập Yêu cầu chung (Brief) hoặc điền brief riêng cho từng công đoạn.');
      return;
    }

    if (planDueDate && planDueDate < todayStr) {
      setError('Hạn hoàn thành chung không thể ở trong quá khứ.');
      return;
    }

    setPlanDryRunLoading(true);
    setError(null);
    try {
      const payload: CreateAssignmentPlanRequest = {
        stages: activePlanStages,
        brief: planBrief.trim() || activePlanStages[0]?.brief || 'Kế hoạch toàn chương',
        referenceNotes: planReferenceNotes.trim() || undefined,
        dueDate: planDueDate ? new Date(planDueDate).toISOString() : undefined,
        priority: planPriority,
        dryRun: true,
      };
      const result = await assignmentService.createAssignmentPlan(chapterId, payload);
      setPlanDryRunResult(result);
      onShowToast?.(
        'Kiểm tra kế hoạch',
        `Dự kiến tạo ${result.createdCount} công việc (${result.stages.filter((s) => !s.skippedReason).length} công đoạn hợp lệ).`,
      );
    } catch (err: any) {
      const msg = extractError(err, 'Lỗi khi kiểm tra kế hoạch toàn chương.');
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
      setError('Vui lòng chọn ít nhất một công đoạn trong kế hoạch.');
      return;
    }

    const missingAssignee = activePlanStages.find((s) => !s.assigneeUserId);
    if (missingAssignee) {
      const stg = stages.find((s) => s.id === missingAssignee.pipelineStageId);
      setError(`Công đoạn "${stg?.name || 'Pipeline'}" chưa được chọn người nhận.`);
      return;
    }

    if (!planBrief.trim() && activePlanStages.some((s) => !s.brief)) {
      setError('Vui lòng nhập Yêu cầu chung (Brief) hoặc điền brief riêng cho từng công đoạn.');
      return;
    }

    if (planDueDate && planDueDate < todayStr) {
      setError('Hạn hoàn thành chung không thể ở trong quá khứ.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateAssignmentPlanRequest = {
        stages: activePlanStages,
        brief: planBrief.trim() || activePlanStages[0]?.brief || 'Kế hoạch toàn chương',
        referenceNotes: planReferenceNotes.trim() || undefined,
        dueDate: planDueDate ? new Date(planDueDate).toISOString() : undefined,
        priority: planPriority,
        dryRun: false,
      };
      const result = await assignmentService.createAssignmentPlan(chapterId, payload);
      onShowToast?.(
        'Giao kế hoạch thành công',
        `Đã tạo ${result.createdCount} công việc cho toàn chương.`,
      );
      onSuccess?.({} as any);
      onClose();
    } catch (err: any) {
      const msg = extractError(err, 'Không thể giao kế hoạch toàn chương.');
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
      setError('Vui lòng nhập mô tả yêu cầu công việc (Brief).');
      return;
    }
    if (stages.length === 0 || !pipelineStageId) {
      setError('Series chưa có công đoạn Pipeline nào hợp lệ để giao việc.');
      return;
    }
    if (dueDate && dueDate < todayStr) {
      setError('Hạn hoàn thành không thể ở trong quá khứ.');
      return;
    }
    if (!assigneeUserId) {
      if (normRequiredRole && filteredMembers.length === 0) {
        setError(
          `Công đoạn "${currentStage?.name}" yêu cầu vai trò ${requiredRole}, nhưng Workspace chưa có thành viên nào mang vai trò này.`,
        );
      } else {
        setError('Vui lòng chọn nhân sự thực hiện.');
      }
      return;
    }

    // Nếu đang ở chế độ giao việc hàng loạt theo Trang
    if (isBulkMode && entityType === 'Page') {
      if (bulkPageIds.length === 0) {
        setError('Vui lòng chọn ít nhất một trang để giao việc hàng loạt.');
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
          'Giao việc hàng loạt thành công',
          `Đã tạo ${result.createdCount} công việc cho công đoạn ${currentStage?.name || 'Pipeline'}.`,
        );
        onSuccess?.({} as any);
        onClose();
      } catch (err: any) {
        const msg = extractError(err, 'Không thể giao việc hàng loạt.');
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
        setError('Vui lòng chọn Trang (Page) cần giao việc.');
        return;
      }
      targetEntityId = selectedPageId;
    } else if (entityType === 'Panel') {
      if (!selectedPageId) {
        setError('Vui lòng chọn Trang chứa khung tranh cần giao việc.');
        return;
      }
      if (!selectedPanelId) {
        setError('Vui lòng chọn Khung hình (Panel) cần giao việc.');
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
        'Giao việc thành công',
        `Đã tạo công việc cho công đoạn ${currentStage?.name || 'Pipeline'}.`,
      );
      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      const msg = extractError(err, 'Không thể tạo phân công nhiệm vụ.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      role='dialog'
      aria-modal='true'
      className='fixed inset-0 bg-stone-900/50 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4'
    >
      <div className='bg-[#FCFBF8] border border-stone-200/90 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden'>
        {/* Header */}
        <div className='p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-[#FAF8F5] rounded-t-2xl shrink-0'>
          <div className='flex items-center gap-3.5'>
            <div className='w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-xs shrink-0'>
              <UserCheck className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-xs uppercase tracking-wider'>
                  {t('createAssignmentModal.headerBadge')}
                </span>
                {chapterNumber && (
                  <span className='px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-medium text-xs'>
                    Chương {chapterNumber}
                  </span>
                )}
              </div>
              <h2 className='text-lg font-serif font-bold text-stone-900 mt-0.5'>
                {t('createAssignmentModal.title', { chapter: chapterNumber ? `– Chương ${chapterNumber}` : '' })}
              </h2>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={t('createAssignmentModal.closeAria')}
            className='w-8 h-8 rounded-xl hover:bg-stone-200/60 border border-transparent hover:border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-studio cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
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
              {t('createAssignmentModal.tabSingle')}
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
              <span>{t('createAssignmentModal.tabPlan')}</span>
              <span className='px-1.5 py-0.2 bg-orange-100 text-orange-800 rounded text-[10px] font-bold uppercase'>
                {t('createAssignmentModal.tabPlanBadge')}
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
                  ? t('createAssignmentModal.reloadTemplateBtn', { number: templateSourceChapter })
                  : t('createAssignmentModal.loadTemplateBtn')}
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
                {t('createAssignmentModal.planNotice')}
              </div>
            </div>

            {/* General Plan Settings */}
            <div className='p-4 bg-[#FAF8F5] rounded-2xl border border-stone-200/80 space-y-3.5'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                {t('createAssignmentModal.planSettingsTitle')}
              </h3>

              {/* General Brief */}
              <div>
                <label
                  htmlFor='plan-general-brief'
                  className='block text-sm font-semibold text-stone-800 mb-1.5'
                >
                  {t('createAssignmentModal.planBriefLabel')}
                </label>
                <textarea
                  id='plan-general-brief'
                  aria-label='Yêu cầu chung toàn chương'
                  rows={2}
                  value={planBrief}
                  onChange={(e) => setPlanBrief(e.target.value)}
                  placeholder={t('createAssignmentModal.planBriefPlaceholder')}
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
                    {t('createAssignmentModal.planDueDateLabel')}
                  </label>
                  <input
                    id='plan-due-date'
                    aria-label='Hạn hoàn thành chung'
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
                    {t('createAssignmentModal.planPriorityLabel')}
                  </label>
                  <select
                    id='plan-priority'
                    aria-label='Mức độ ưu tiên chung'
                    value={planPriority}
                    onChange={(e) => setPlanPriority(e.target.value as AssignmentPriority)}
                    className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-700 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                  >
                    <option value='Low'>{t('createAssignmentModal.priorityLow')}</option>
                    <option value='Medium'>{t('createAssignmentModal.priorityMedium')}</option>
                    <option value='High'>{t('createAssignmentModal.priorityHigh')}</option>
                    <option value='Urgent'>{t('createAssignmentModal.priorityUrgent')}</option>
                  </select>
                </div>
              </div>

              {/* General Reference Notes */}
              <div>
                <label
                  htmlFor='plan-reference-notes'
                  className='block text-sm font-semibold text-stone-800 mb-1.5'
                >
                  {t('createAssignmentModal.planReferenceNotesLabel')}
                </label>
                <input
                  id='plan-reference-notes'
                  aria-label='Ghi chú tham chiếu chung'
                  type='text'
                  value={planReferenceNotes}
                  onChange={(e) => setPlanReferenceNotes(e.target.value)}
                  placeholder={t('createAssignmentModal.planReferenceNotesPlaceholder')}
                  className='w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 text-xs focus:outline-none focus:border-orange-500 transition-studio shadow-xs'
                />
              </div>
            </div>

            {/* Stages List */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                  {t('createAssignmentModal.planStagesTitle', { count: stages.length })}
                </h3>
                <span className='text-xs text-stone-500'>
                  {t('createAssignmentModal.planStagesSelected', {
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
                  const normRole = stage.allowedRole ? normalizeWorkspaceRole(stage.allowedRole) : null;
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
                                ✓ {dryRunStage.items.length} việc sẵn sàng
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
                              {t('createAssignmentModal.planStageAssignee')}
                            </label>
                            <select
                              id={`plan-stage-assignee-${stage.id}`}
                              aria-label={`Người nhận công đoạn ${stage.name}`}
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
                              <option value=''>{t('createAssignmentModal.planStageSelectAssignee')}</option>
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
                              {t('createAssignmentModal.planStageBrief')}
                            </label>
                            <input
                              id={`plan-stage-brief-${stage.id}`}
                              aria-label={`Brief riêng công đoạn ${stage.name}`}
                              type='text'
                              value={config.brief}
                              placeholder={planBrief.trim() || t('createAssignmentModal.planStageBriefPlaceholder')}
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
                  <span>{t('createAssignmentModal.planDryRunComplete', { count: planDryRunResult.createdCount })}</span>
                </div>
                <p className='text-emerald-800 leading-relaxed'>
                  {t('createAssignmentModal.planDryRunDesc')}
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
                <span className='font-semibold'>{t('createAssignmentModal.conflictPrefix')}</span>{' '}
                <span>{scopeOverlapWarning}</span>
              </div>
            </div>
          )}

          {loadingInitial ? (
            <div className='py-12 text-center text-stone-500 text-xs'>
              <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-orange-600' />
              <span>{t('createAssignmentModal.loading')}</span>
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
                      {t('createAssignmentModal.entityTypeLabel')}
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
                        {t('createAssignmentModal.entityTypeChapter')}
                        {isChapterAssignedAtStage
                          ? t('createAssignmentModal.chapterAssignedSuffix')
                          : hasAnyPageOrPanelAssignedAtStage
                            ? t('createAssignmentModal.pagePanelAssignedSuffix')
                            : ''}
                      </option>
                      <option
                        value='Page'
                        disabled={isChapterAssignedAtStage && !canCarveOutFromChapter}
                      >
                        {t('createAssignmentModal.entityTypePage')}
                        {isChapterAssignedAtStage
                          ? canCarveOutFromChapter
                            ? t('createAssignmentModal.carveOutSuffix')
                            : t('createAssignmentModal.chapterAssignedShortSuffix')
                          : ''}
                      </option>
                      <option
                        value='Panel'
                        disabled={isChapterAssignedAtStage && !canCarveOutFromChapter}
                      >
                        {t('createAssignmentModal.entityTypePanel')}
                        {isChapterAssignedAtStage
                          ? canCarveOutFromChapter
                            ? t('createAssignmentModal.carveOutSuffix')
                            : t('createAssignmentModal.chapterAssignedShortSuffix')
                          : ''}
                      </option>
                    </select>
                    {entityType === 'Chapter' && (
                      <p className='mt-1.5 text-xs text-stone-600 flex items-center gap-1.5'>
                        <Info className='w-4 h-4 text-orange-600 shrink-0' />
                        <span>
                          {t('createAssignmentModal.chapterScopeNotice', { chapter: chapterNumber || '' })}
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
                          {isBulkMode ? t('createAssignmentModal.selectBulkPagesLabel') : t('createAssignmentModal.selectPageLabel')}
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
                            <span>{t('createAssignmentModal.bulkModeCheckbox')}</span>
                          </label>
                        )}
                      </div>

                      {loadingPages ? (
                        <div className='py-2.5 text-stone-500 text-xs flex items-center gap-1.5'>
                          <Loader2 className='w-4 h-4 animate-spin text-orange-600' /> {t('createAssignmentModal.bulkLoading')}
                        </div>
                      ) : pages.length > 0 ? (
                        isBulkMode ? (
                          <div
                            className='space-y-2.5 bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs'
                            data-testid='bulk-page-section'
                          >
                            <div className='flex items-center justify-between text-xs'>
                              <span className='font-semibold text-stone-700 font-mono'>
                                {t('createAssignmentModal.bulkSelectedCount', {
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
                                  {t('createAssignmentModal.selectAll')}
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
                                  {t('createAssignmentModal.deselectAll')}
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
                                        aria-label={`Chọn trang ${p.pageNumber}`}
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
                                        Trang {p.pageNumber}
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
                                            {t('createAssignmentModal.validBadge')}
                                            {dryRunItem.dependsOnAssignmentIds &&
                                              dryRunItem.dependsOnAssignmentIds.length > 0 && (
                                                <span className='text-stone-500 text-xs font-mono font-normal'>
                                                  {t('createAssignmentModal.waitingDeps', { count: dryRunItem.dependsOnAssignmentIds.length })}
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
                                disabled={dryRunLoading || bulkPageIds.length === 0}
                                className='btn-cta-secondary px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-studio'
                              >
                                {dryRunLoading ? (
                                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                                ) : (
                                  <Sparkles className='w-3.5 h-3.5 text-orange-600' />
                                )}
                                <span>{t('createAssignmentModal.dryRunBtn')}</span>
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
                                  {t('createAssignmentModal.deselectConflicting')}
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
                                  Trang {p.pageNumber} ({p.layoutFormat} • {p.widthPx}×{p.heightPx}
                                  px)
                                  {isAssigned ? t('createAssignmentModal.pageOptionAssigned') : ''}
                                </option>
                              );
                            })}
                          </select>
                        )
                      ) : (
                        <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs'>
                          {t('createAssignmentModal.noPagesWarning')}
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
                        <span>{t('createAssignmentModal.step1SelectPage')}</span>
                      </label>
                      {loadingPages ? (
                        <div className='py-2.5 text-stone-500 text-xs flex items-center gap-1.5'>
                          <Loader2 className='w-4 h-4 animate-spin text-orange-600' /> {t('createAssignmentModal.bulkLoading')}
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
                              Trang {p.pageNumber} ({p.layoutFormat})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs'>
                          {t('createAssignmentModal.noPagesWarning')}
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
                          <span>{t('createAssignmentModal.step2SelectPanel')}</span>
                        </span>
                        {panels.length > 0 && (
                          <span className='text-xs text-stone-500 font-mono'>
                            {t('createAssignmentModal.panelsCount', { count: panels.length })}
                          </span>
                        )}
                      </label>
                      {loadingPanels ? (
                        <div className='py-2.5 text-stone-500 text-xs flex items-center gap-1.5'>
                          <Loader2 className='w-4 h-4 animate-spin text-orange-600' /> {t('createAssignmentModal.loadingPanels')}
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
                                {isAssigned ? t('createAssignmentModal.pageOptionAssigned') : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className='p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs'>
                          {t('createAssignmentModal.noPanelsWarning')}
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
                          {t('createAssignmentModal.transferNotice')}
                        </span>
                      </div>

                      {/* Chọn nhiều trang cùng lúc khi chuyển giao Page */}
                      {entityType === 'Page' && pages.length > 0 && (
                        <div className='space-y-1.5' data-testid='transfer-multi-pages'>
                          <span className='text-xs font-semibold text-blue-950 flex items-center justify-between'>
                            <span>{t('createAssignmentModal.transferSelectPages')}</span>
                            <span className='text-xs text-blue-700 font-mono font-medium'>
                              {t('createAssignmentModal.transferSelectedCount', { count: selectedTargetIds.length })}
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
                                    aria-label={`Chọn trang ${p.pageNumber}`}
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
                                    Trang {p.pageNumber}
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
                          {t('createAssignmentModal.transferReasonLabel')}
                        </label>
                        <input
                          id='assignment-transfer-reason'
                          aria-label='Lý do chuyển giao'
                          type='text'
                          value={transferReason}
                          onChange={(e) => setTransferReason(e.target.value)}
                          placeholder={t('createAssignmentModal.transferReasonPlaceholder')}
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
                    {t('createAssignmentModal.stageLabel')}
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
                      <span>
                        {t('createAssignmentModal.noStagesWarning')}
                      </span>
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
                        {t('createAssignmentModal.assigneeLabel')}
                      </label>
                      <button
                        type='button'
                        onClick={handleLoadTemplate}
                        disabled={loadingTemplate}
                        data-testid='apply-stage-template-btn'
                        title='Lấy người nhận và brief của công đoạn này từ chương trước'
                        className='text-xs text-orange-700 hover:text-orange-800 font-medium inline-flex items-center gap-1 hover:underline transition-studio cursor-pointer disabled:opacity-50'
                      >
                        {loadingTemplate ? (
                          <Loader2 className='w-3 h-3 animate-spin' />
                        ) : (
                          <History className='w-3 h-3' />
                        )}
                        <span>{t('createAssignmentModal.previousChapterTemplate')}</span>
                      </button>
                    </div>
                    {requiredRole && (
                      <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'>
                        {t('createAssignmentModal.requiredRoleBadge', { role: requiredRole })}
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
                            {isTop ? t('createAssignmentModal.bestSuggestion') : ''}
                          </option>
                        );
                      })
                    ) : (
                      <option value=''>
                        {requiredRole
                          ? t('createAssignmentModal.noRoleMembers', { role: requiredRole })
                          : t('createAssignmentModal.noWorkspaceMembers')}
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
                        <ThumbsUp className='w-3.5 h-3.5 text-emerald-600' /> {t('createAssignmentModal.reasonsTitle')}
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
                        <span>{t('createAssignmentModal.pickBestBtn', { name: suggestions[0].fullName })}</span>
                      </button>
                    </div>
                  )}

                  <p className='mt-2 text-xs text-stone-500 leading-snug flex items-center gap-1.5'>
                    <Info className='w-4 h-4 text-stone-400 shrink-0' />
                    <span>
                      {t('createAssignmentModal.autoAddNotice')}
                    </span>
                  </p>

                  {/* Cảnh báo rõ ràng nếu Workspace chưa có thành viên đúng vai trò của stage */}
                  {filteredMembers.length === 0 && requiredRole && (
                    <div className='mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2 leading-relaxed'>
                      <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                      <div>
                        {t('createAssignmentModal.noRoleMembersWarning', { role: requiredRole })}
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
                    {t('createAssignmentModal.briefLabel')}
                  </label>
                  <div className='flex items-center gap-2'>
                    {brief.length > 0 && (
                      <span className='text-xs text-stone-500 font-mono'>{t('createAssignmentModal.charactersCount', { count: brief.length })}</span>
                    )}
                    <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200'>
                      {t('createAssignmentModal.requiredBadge')}
                    </span>
                  </div>
                </div>
                <textarea
                  id='assignment-brief-input'
                  rows={3}
                  required
                  placeholder={t('createAssignmentModal.briefPlaceholder')}
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
                  {t('createAssignmentModal.referenceNotesLabel')}
                </label>
                <div className='relative'>
                  <input
                    id='assignment-reference-input'
                    type='text'
                    placeholder={t('createAssignmentModal.referenceNotesPlaceholder')}
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
                    {t('createAssignmentModal.priorityLabel')}
                  </label>
                  <select
                    id='assignment-priority-select'
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AssignmentPriority)}
                    className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                  >
                    <option value='Low'>{t('createAssignmentModal.priorityLow')}</option>
                    <option value='Medium'>{t('createAssignmentModal.priorityMedium')}</option>
                    <option value='High'>{t('createAssignmentModal.priorityHigh')}</option>
                    <option value='Urgent'>{t('createAssignmentModal.priorityUrgent')}</option>
                  </select>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <label
                      htmlFor='assignment-due-date-input'
                      className='text-sm font-semibold text-stone-800 block'
                    >
                      {t('createAssignmentModal.dueDateLabel')}
                    </label>
                    {dueDateRelativeLabel && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${
                          dueDateRelativeLabel === 'Đã quá hạn'
                            ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]'
                            : dueDateRelativeLabel === 'Hôm nay'
                              ? 'bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]'
                              : 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]'
                        }`}
                      >
                        ({dueDateRelativeLabel})
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
                      if (error && error.includes('quá khứ')) setError(null);
                    }}
                    className='w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-studio shadow-xs'
                  />

                  {/* Quick Preset Buttons */}
                  <div className='flex items-center gap-1.5 mt-2'>
                    <span className='text-xs text-stone-500 font-medium'>{t('createAssignmentModal.quickPresets')}</span>
                    {[
                      { label: t('createAssignmentModal.preset3Days'), days: 3 },
                      { label: t('createAssignmentModal.preset1Week'), days: 7 },
                      { label: t('createAssignmentModal.preset2Weeks'), days: 14 },
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
                          if (error && error.includes('quá khứ')) setError(null);
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
                        {t('createAssignmentModal.clearDueDate')}
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
                      {t('createAssignmentModal.dependenciesTitle')}
                    </span>
                    {selectedDependsOnIds.length > 0 ? (
                      <span className='px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-orange-100 text-orange-700 border border-orange-200'>
                        {t('createAssignmentModal.dependenciesSelected', { count: selectedDependsOnIds.length })}
                      </span>
                    ) : (
                      <span className='text-xs text-stone-500 font-normal'>{t('createAssignmentModal.optional')}</span>
                    )}
                  </div>
                  <div className='flex items-center gap-1.5 text-stone-500 text-xs'>
                    <span>{showDependencies || isDependencyError ? t('createAssignmentModal.collapse') : t('createAssignmentModal.configure')}</span>
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
                {t('createAssignmentModal.footerPlanMode', {
                  count: Object.values(planStageAssignments).filter((s) => s.enabled).length,
                })}
              </span>
            ) : isBulkMode && entityType === 'Page' ? (
              <span>
                {t('createAssignmentModal.footerBulkMode', { count: bulkPageIds.length })}
              </span>
            ) : (
              <span>
                {t('createAssignmentModal.footerSingleScope', {
                  scope:
                    entityType === 'Chapter'
                      ? t('createAssignmentModal.scopeChapter')
                      : entityType === 'Page'
                        ? t('createAssignmentModal.scopePage')
                        : t('createAssignmentModal.scopePanel'),
                })}
              </span>
            )}
          </div>
          <div className='flex items-center gap-3 ml-auto'>
            <button
              type='button'
              onClick={onClose}
              className='btn-cta-secondary px-5 py-2 rounded-full text-xs font-semibold transition-studio cursor-pointer active:scale-[0.98]'
            >
              {t('createAssignmentModal.cancel')}
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
                  <span>{t('createAssignmentModal.dryRunPlanBtn')}</span>
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
                  <span>{t('createAssignmentModal.submitPlanBtn')}</span>
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
                    ? t('createAssignmentModal.submitBulkBtn', { count: bulkPageIds.length })
                    : t('createAssignmentModal.submitBtn')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
