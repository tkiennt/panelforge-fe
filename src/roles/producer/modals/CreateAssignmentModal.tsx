// src/roles/producer/modals/CreateAssignmentModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
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
} from 'lucide-react';
import {
  assignmentService,
  CreateAssignmentRequest,
  WorkflowEntityType,
  AssignmentPriority,
  AssignmentDto,
  extractError,
} from '@/services/assignment.service';
import { seriesService, SeriesMemberDto } from '@/services/series.service';
import { pipelineService, PipelineStageDto } from '@/services/pipeline.service';
import { pageService, PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { PanelDto } from '@/types/pipeline';
import { normalizeWorkspaceRole } from '@/types/auth';
import { DependencySelector } from '../components/DependencySelector';

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
  const [showDependencies, setShowDependencies] = useState(false);

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
      workspaceId && seriesId
        ? seriesService.getSeriesMembers(workspaceId, seriesId).catch(() => [])
        : Promise.resolve([]),
      assignmentService.getAssignments(chapterId).catch(() => []),
      pageService.getPagesByChapter(chapterId).catch(() => []),
    ])
      .then(([pipelineData, membersData, assignmentsData, pagesData]) => {
        if (!isMounted) return;

        let loadedStages: PipelineStageDto[] = [];
        if (pipelineData?.stages && pipelineData.stages.length > 0) {
          loadedStages = pipelineData.stages.filter((s) => s.isEnabled !== false);
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

  // Xử lý khi người dùng đổi công đoạn Pipeline
  const handleStageChange = (newStageId: string) => {
    setPipelineStageId(newStageId);
    setError(null);

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
      const created = await assignmentService.createAssignment(chapterId, payload);
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
      className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4'
    >
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden'>
        {/* Header */}
        <div className='p-4 sm:p-5 border-b border-[#D8D2C5] flex items-center justify-between bg-[#FAF8F5] rounded-t-2xl shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
              <UserCheck className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded-full bg-orange-50 text-[#F97316] border border-orange-200/80 font-bold text-[10px]'>
                  Giao việc mới
                </span>
                {chapterNumber && (
                  <span className='text-[11px] text-zinc-500 font-medium'>
                    Chương {chapterNumber}
                  </span>
                )}
              </div>
              <h2 className='text-base font-bold text-[#171717] mt-0.5'>
                Phân Công Nhiệm Vụ Sản Xuất
              </h2>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng cửa sổ giao việc'
            className='w-8 h-8 rounded-lg hover:bg-white border border-transparent hover:border-[#D8D2C5] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form Body */}
        <form
          id='create-assignment-form'
          onSubmit={handleSubmit}
          className='p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs custom-scrollbar min-h-0'
        >
          {error && !isDependencyError && (
            <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2'>
              <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
              <span className='font-medium leading-relaxed'>{error}</span>
            </div>
          )}

          {scopeOverlapWarning && (
            <div className='p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-start gap-2'>
              <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5 text-amber-600' />
              <div className='leading-relaxed'>
                <span className='font-semibold'>Trùng lặp phạm vi giao việc (409 Conflict):</span>{' '}
                <span>{scopeOverlapWarning}</span>
              </div>
            </div>
          )}

          {loadingInitial ? (
            <div className='py-8 text-center text-[#888888]'>
              <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
              <span>Đang tải thông tin thành viên, công đoạn và danh sách trang...</span>
            </div>
          ) : (
            <>
              {/* Entity Type & Target Entity Selection */}
              <div className='space-y-3 p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7]'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label
                      htmlFor='assignment-entity-type'
                      className='block font-semibold text-[#171717] mb-1'
                    >
                      Phạm vi giao việc (Entity Type) *
                    </label>
                    <select
                      id='assignment-entity-type'
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value as WorkflowEntityType)}
                      className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                    >
                      <option
                        value='Chapter'
                        disabled={isChapterAssignedAtStage || hasAnyPageOrPanelAssignedAtStage}
                      >
                        Toàn bộ Chương (Chapter)
                        {isChapterAssignedAtStage
                          ? ' — (Đã giao việc cả chương)'
                          : hasAnyPageOrPanelAssignedAtStage
                            ? ' — (Đã có việc theo trang/khung)'
                            : ''}
                      </option>
                      <option
                        value='Page'
                        disabled={isChapterAssignedAtStage && !canCarveOutFromChapter}
                      >
                        Theo Trang (Page)
                        {isChapterAssignedAtStage
                          ? canCarveOutFromChapter
                            ? ' — (Tách từ việc cả chương)'
                            : ' — (Chương đã giao việc)'
                          : ''}
                      </option>
                      <option
                        value='Panel'
                        disabled={isChapterAssignedAtStage && !canCarveOutFromChapter}
                      >
                        Theo Khung hình (Panel)
                        {isChapterAssignedAtStage
                          ? canCarveOutFromChapter
                            ? ' — (Tách từ việc cả chương)'
                            : ' — (Chương đã giao việc)'
                          : ''}
                      </option>
                    </select>
                  </div>

                  {/* Dropdown chọn Trang khi EntityType === 'Page' */}
                  {entityType === 'Page' && (
                    <div>
                      <label
                        htmlFor='assignment-page-select'
                        className='block font-semibold text-[#171717] mb-1 flex items-center justify-between'
                      >
                        <span>Chọn Trang (Page) *</span>
                        {pages.length > 0 && (
                          <span className='text-[10px] text-zinc-500 font-mono'>
                            {pages.length} trang
                          </span>
                        )}
                      </label>
                      {loadingPages ? (
                        <div className='py-2 text-zinc-500 flex items-center gap-1.5'>
                          <Loader2 className='w-3.5 h-3.5 animate-spin text-[#F97316]' /> Đang tải
                          trang...
                        </div>
                      ) : pages.length > 0 ? (
                        <select
                          id='assignment-page-select'
                          value={selectedPageId}
                          onChange={(e) => setSelectedPageId(e.target.value)}
                          required
                          className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                        >
                          {pages.map((p) => {
                            const isAssigned = assignedPageIdsAtStage.has(p.id);
                            return (
                              <option key={p.id} value={p.id} disabled={isAssigned}>
                                Trang {p.pageNumber} ({p.layoutFormat} • {p.widthPx}×{p.heightPx}px)
                                {isAssigned ? ' — (Đã giao việc ở stage này)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className='p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]'>
                          Chương này chưa có trang nào. Vui lòng tạo trang ở Bàn làm việc Artist
                          trước khi giao việc.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dropdowns chọn Trang và Panel khi EntityType === 'Panel' */}
                {entityType === 'Panel' && (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EAE6DF]'>
                    <div>
                      <label
                        htmlFor='assignment-panel-page-select'
                        className='block font-semibold text-[#171717] mb-1 flex items-center gap-1'
                      >
                        <FileText className='w-3.5 h-3.5 text-zinc-500' />
                        <span>Bước 1: Chọn Trang *</span>
                      </label>
                      {loadingPages ? (
                        <div className='py-2 text-zinc-500 flex items-center gap-1.5'>
                          <Loader2 className='w-3.5 h-3.5 animate-spin text-[#F97316]' /> Đang tải
                          trang...
                        </div>
                      ) : pages.length > 0 ? (
                        <select
                          id='assignment-panel-page-select'
                          value={selectedPageId}
                          onChange={(e) => setSelectedPageId(e.target.value)}
                          required
                          className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                        >
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>
                              Trang {p.pageNumber} ({p.layoutFormat})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className='p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]'>
                          Chưa có trang nào.
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor='assignment-panel-select'
                        className='block font-semibold text-[#171717] mb-1 flex items-center justify-between'
                      >
                        <span className='flex items-center gap-1'>
                          <Layers className='w-3.5 h-3.5 text-zinc-500' />
                          <span>Bước 2: Chọn Khung hình *</span>
                        </span>
                        {panels.length > 0 && (
                          <span className='text-[10px] text-zinc-500 font-mono'>
                            {panels.length} panel
                          </span>
                        )}
                      </label>
                      {loadingPanels ? (
                        <div className='py-2 text-zinc-500 flex items-center gap-1.5'>
                          <Loader2 className='w-3.5 h-3.5 animate-spin text-[#F97316]' /> Đang tải
                          panel...
                        </div>
                      ) : panels.length > 0 ? (
                        <select
                          id='assignment-panel-select'
                          value={selectedPanelId}
                          onChange={(e) => setSelectedPanelId(e.target.value)}
                          required
                          disabled={assignedPageIdsAtStage.has(selectedPageId)}
                          className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                        >
                          {panels.map((p) => {
                            const isAssigned = assignedPanelIdsAtStage.has(p.id);
                            return (
                              <option key={p.id} value={p.id} disabled={isAssigned}>
                                Panel #{p.panelNumber ?? p.readingOrder ?? p.id.slice(0, 8)}{' '}
                                {isAssigned ? ' — (Đã giao việc ở stage này)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className='p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]'>
                          Trang được chọn chưa có panel nào. Vui lòng tạo panel trước khi giao việc.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isChapterAssignedAtStage && canCarveOutFromChapter && (entityType === 'Page' || entityType === 'Panel') && (
                  <div className='p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-center gap-2'>
                    <Sparkles className='w-4 h-4 text-blue-600 shrink-0' />
                    <span>
                      <strong>Tách trang/khung:</strong> Việc này được tách từ việc cả chương của công đoạn. Sau khi tạo, phạm vi việc cả chương sẽ tự động thu hẹp lại (trừ phần đã tách).
                    </span>
                  </div>
                )}
              </div>

              {/* Pipeline Stage & Assignee with Role Filter */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label
                    htmlFor='assignment-stage-select'
                    className='block font-semibold text-[#171717] mb-1'
                  >
                    Công đoạn Pipeline *
                  </label>
                  {stages.length > 0 ? (
                    <select
                      id='assignment-stage-select'
                      value={pipelineStageId}
                      onChange={(e) => handleStageChange(e.target.value)}
                      required
                      className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                    >
                      {stages.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.stageOrder}. {st.name} {st.allowedRole ? `(${st.allowedRole})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className='p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] flex items-center gap-1.5'>
                      <AlertCircle className='w-3.5 h-3.5 shrink-0 text-rose-600' />
                      <span>
                        Không có công đoạn Pipeline hợp lệ. Vui lòng cấu hình Pipeline cho Series.
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor='assignment-assignee-select'
                    className='block font-semibold text-[#171717] mb-1 flex items-center justify-between'
                  >
                    <span>Người nhận việc (Assignee) *</span>
                    {requiredRole && (
                      <span className='text-[10px] text-amber-700 font-semibold px-1.5 py-0.2 bg-amber-100/70 rounded'>
                        Yêu cầu: {requiredRole}
                      </span>
                    )}
                  </label>
                  <select
                    id='assignment-assignee-select'
                    value={assigneeUserId}
                    onChange={(e) => setAssigneeUserId(e.target.value)}
                    required
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                  >
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m) => (
                        <option key={m.id} value={m.userId}>
                          {m.fullName || m.email.split('@')[0]} — {m.studioRole}
                        </option>
                      ))
                    ) : (
                      <option value=''>
                        {requiredRole
                          ? `Không có thành viên vai trò ${requiredRole}`
                          : 'Chưa có thành viên trong Workspace'}
                      </option>
                    )}
                  </select>

                  {/* Cảnh báo rõ ràng nếu Workspace chưa có thành viên đúng vai trò của stage */}
                  {filteredMembers.length === 0 && requiredRole && (
                    <div className='mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] flex items-start gap-1.5 leading-snug'>
                      <AlertTriangle className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
                      <div>
                        Chưa có thành viên nào trong Workspace có vai trò{' '}
                        <strong>{requiredRole}</strong>. Cần mời thành viên{' '}
                        <strong>{requiredRole}</strong> vào Workspace trước khi giao việc stage này.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Brief (Required) */}
              <div>
                <label
                  htmlFor='assignment-brief-input'
                  className='block font-semibold text-[#171717] mb-1 flex items-center justify-between'
                >
                  <span>Yêu cầu công việc (Brief) *</span>
                  <span className='text-[10px] text-zinc-400 font-normal'>
                    Yêu cầu bắt buộc
                  </span>
                </label>
                <textarea
                  id='assignment-brief-input'
                  rows={3}
                  required
                  placeholder='Mô tả chi tiết công việc cần làm, quy chuẩn phong cách hoặc phân đoạn kịch bản...'
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                />
              </div>

              {/* Reference Notes (Optional) */}
              <div>
                <label
                  htmlFor='assignment-reference-input'
                  className='block font-semibold text-[#171717] mb-1'
                >
                  Ghi chú tham chiếu / Tài liệu đính kèm (Reference Notes)
                </label>
                <input
                  id='assignment-reference-input'
                  type='text'
                  placeholder='Đường dẫn moodboard, ảnh mẫu hoặc ghi chú phân cảnh...'
                  value={referenceNotes}
                  onChange={(e) => setReferenceNotes(e.target.value)}
                  className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                />
              </div>

              {/* Priority & Due Date */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label
                    htmlFor='assignment-priority-select'
                    className='block font-semibold text-[#171717] mb-1'
                  >
                    Mức độ ưu tiên (Priority)
                  </label>
                  <select
                    id='assignment-priority-select'
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AssignmentPriority)}
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                  >
                    <option value='Low'>Thấp (Low)</option>
                    <option value='Medium'>Bình thường (Medium)</option>
                    <option value='High'>Cao (High)</option>
                    <option value='Urgent'>Khẩn cấp (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor='assignment-due-date-input'
                    className='block font-semibold text-[#171717] mb-1'
                  >
                    Hạn hoàn thành (Due Date)
                  </label>
                  <input
                    id='assignment-due-date-input'
                    type='date'
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                  />
                </div>
              </div>

              {/* Dependency on another assignment (Cần hoàn thành trước · Thu gọn dạng Accordion) */}
              <div className='border border-[#E7E7E7] rounded-xl overflow-hidden bg-[#FAF8F5] transition-all'>
                <button
                  type='button'
                  onClick={() => setShowDependencies((prev) => !prev)}
                  className='w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#F2EFE9] transition-colors cursor-pointer'
                >
                  <div className='flex items-center gap-2'>
                    <Network className='w-4 h-4 text-[#F97316]' />
                    <span className='font-semibold text-[#171717] text-xs'>
                      Điều kiện tiên quyết / Phụ thuộc (Dependencies)
                    </span>
                    {selectedDependsOnIds.length > 0 ? (
                      <span className='px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-[#F97316]'>
                        {selectedDependsOnIds.length} đã chọn
                      </span>
                    ) : (
                      <span className='text-[10px] text-zinc-400 font-normal'>
                        (Tùy chọn)
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-1.5 text-zinc-400 text-xs'>
                    <span className='text-[11px]'>{showDependencies || isDependencyError ? 'Thu gọn' : 'Thiết lập'}</span>
                    {showDependencies || isDependencyError ? (
                      <ChevronUp className='w-3.5 h-3.5' />
                    ) : (
                      <ChevronDown className='w-3.5 h-3.5' />
                    )}
                  </div>
                </button>

                {(showDependencies || isDependencyError || selectedDependsOnIds.length > 0) && (
                  <div className='p-3.5 pt-1 border-t border-[#EAE6DF] bg-white'>
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

        {/* Pinned Bottom Footer Buttons */}
        <div className='p-3.5 sm:p-4 border-t border-[#D8D2C5] bg-[#FCFBF8] flex justify-end gap-2.5 shrink-0 rounded-b-2xl'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded-lg border border-[#D8D2C5] bg-white text-[#57534E] hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer transition-colors shadow-2xs'
          >
            Hủy
          </button>
          <button
            type='submit'
            form='create-assignment-form'
            disabled={
              submitting || loadingInitial || stages.length === 0 || Boolean(scopeOverlapWarning)
            }
            className='px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer text-xs transition-colors'
          >
            {submitting ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <Plus className='w-3.5 h-3.5' />
            )}
            <span>Tạo &amp; Giao Việc</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
