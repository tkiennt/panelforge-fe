// src/roles/producer/modals/CreateAssignmentModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  AlertTriangle,
  Loader2,
  UserCheck,
  Layers,
  FileText,
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

interface CreateAssignmentModalProps {
  isOpen: boolean;
  workspaceId: string;
  seriesId: string;
  chapterId: string;
  chapterNumber?: number | string;
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
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [entityType, setEntityType] = useState<WorkflowEntityType>('Chapter');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [pipelineStageId, setPipelineStageId] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [brief, setBrief] = useState('');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<AssignmentPriority>('Medium');
  const [dependsOnAssignmentId, setDependsOnAssignmentId] = useState('');

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
          loadedStages = pipelineData.stages;
        } else {
          // Fallback default stages với đầy đủ allowedRole
          loadedStages = [
            {
              id: 'stage-script',
              name: 'Script / Kịch bản',
              slug: 'script',
              stageOrder: 1,
              allowedRole: 'Writer',
              isApprovalGate: false,
              isInitial: true,
              isTerminal: false,
            },
            {
              id: 'stage-thumbnail',
              name: 'Storyboard / Thumbnail',
              slug: 'thumbnail',
              stageOrder: 2,
              allowedRole: 'Artist',
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-pencil',
              name: 'Pencil / Vẽ phác',
              slug: 'pencil',
              stageOrder: 3,
              allowedRole: 'Artist',
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-ink',
              name: 'Inking / Đi nét',
              slug: 'ink',
              stageOrder: 4,
              allowedRole: 'Artist',
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-color',
              name: 'Coloring / Lên màu',
              slug: 'color',
              stageOrder: 5,
              allowedRole: 'Artist',
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-letter',
              name: 'Lettering / Thoại',
              slug: 'letter',
              stageOrder: 6,
              allowedRole: 'Letterer',
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
          ];
        }

        setStages(loadedStages);
        const initialStageId = loadedStages[0]?.id || '';
        setPipelineStageId(initialStageId);

        const loadedMembers = membersData || [];
        setMembers(loadedMembers);

        // Lọc người nhận theo allowedRole của stage đầu tiên
        const initialStage = loadedStages[0];
        const initialAllowedRole = initialStage?.allowedRole
          ? normalizeWorkspaceRole(initialStage.allowedRole)
          : null;
        const initialMatchingMembers = loadedMembers.filter((m) => {
          if (!initialAllowedRole) return true;
          return normalizeWorkspaceRole(m.seriesRole || m.studioRole) === initialAllowedRole;
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

  // Danh sách thành viên khớp với vai trò yêu cầu của công đoạn
  const filteredMembers = useMemo(() => {
    if (!normRequiredRole) return members;
    return members.filter((m) => {
      const mRole = normalizeWorkspaceRole(m.seriesRole || m.studioRole);
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
      return normalizeWorkspaceRole(m.seriesRole || m.studioRole) === newNormRole;
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!brief.trim()) {
      setError('Vui lòng nhập mô tả yêu cầu công việc (Brief).');
      return;
    }
    if (!pipelineStageId) {
      setError('Vui lòng chọn công đoạn Pipeline.');
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
      dependsOnAssignmentId: dependsOnAssignmentId.trim() || null,
    };

    try {
      const created = await assignmentService.createAssignment(chapterId, payload);
      onShowToast?.(
        'Giao việc thành công (UC-05)',
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

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5] rounded-t-2xl'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
              <UserCheck className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[9px] font-bold'>
                  UC-05 // TASK ASSIGNMENT
                </span>
                <span className='text-[10px] text-[#888888] font-mono'>Producer Workflow</span>
              </div>
              <h2 className='text-base font-bold text-[#171717] mt-0.5'>
                Giao Việc Mới {chapterNumber ? `– Chương ${chapterNumber}` : ''}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className='p-6 overflow-y-auto space-y-4 flex-1 text-xs custom-scrollbar'
        >
          {error && (
            <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2'>
              <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
              <span className='font-medium leading-relaxed'>{error}</span>
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
                      <option value='Chapter'>Toàn bộ Chương (Chapter)</option>
                      <option value='Page'>Theo Trang (Page)</option>
                      <option value='Panel'>Theo Khung hình (Panel)</option>
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
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>
                              Trang {p.pageNumber} ({p.layoutFormat} • {p.widthPx}×{p.heightPx}px)
                            </option>
                          ))}
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
                          className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                        >
                          {panels.map((p) => (
                            <option key={p.id} value={p.id}>
                              Panel #{p.panelNumber ?? p.readingOrder ?? p.id.slice(0, 8)}{' '}
                              {p.status ? `(${p.status})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className='p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]'>
                          Trang được chọn chưa có panel nào. Vui lòng tạo panel trước khi giao việc.
                        </div>
                      )}
                    </div>
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
                          {m.fullName || m.email.split('@')[0]} — {m.seriesRole || m.studioRole}
                        </option>
                      ))
                    ) : (
                      <option value=''>
                        {requiredRole
                          ? `Không có thành viên vai trò ${requiredRole}`
                          : 'Chưa có thành viên trong series'}
                      </option>
                    )}
                  </select>

                  {/* Cảnh báo rõ ràng nếu Workspace chưa có thành viên đúng vai trò của stage */}
                  {filteredMembers.length === 0 && requiredRole && (
                    <div className='mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] flex items-start gap-1.5 leading-snug'>
                      <AlertTriangle className='w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5' />
                      <div>
                        Chưa có thành viên nào trong Workspace có vai trò{' '}
                        <strong>{requiredRole}</strong>. Vui lòng mời thành viên{' '}
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
                  <span className='text-[10px] text-[#888888] font-normal'>
                    Bắt buộc theo BR-19
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

              {/* Dependency on another assignment */}
              {existingAssignments.length > 0 && (
                <div>
                  <label
                    htmlFor='assignment-depends-on-select'
                    className='block font-semibold text-[#171717] mb-1'
                  >
                    Phụ thuộc vào công việc trước (Depends On Assignment)
                  </label>
                  <select
                    id='assignment-depends-on-select'
                    value={dependsOnAssignmentId}
                    onChange={(e) => setDependsOnAssignmentId(e.target.value)}
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                  >
                    <option value=''>Không có phụ thuộc (Có thể bắt đầu ngay)</option>
                    {existingAssignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.entityType}] {a.brief.slice(0, 40)}... ({a.status})
                      </option>
                    ))}
                  </select>
                  <p className='text-[10px] text-[#737373] mt-1'>
                    Theo quy tắc BR-19, việc phụ thuộc chỉ có thể bấm &quot;Bắt đầu&quot; khi việc
                    trước đã Approved.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer Buttons */}
          <div className='flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]'>
            <button
              type='button'
              onClick={onClose}
              className='px-3.5 py-1.5 rounded-lg border border-[#E7E7E7] bg-white text-[#555555] hover:bg-[#FAF8F5]'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={submitting || loadingInitial}
              className='px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer'
            >
              {submitting ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Plus className='w-3.5 h-3.5' />
              )}
              <span>Tạo &amp; Giao Việc</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
