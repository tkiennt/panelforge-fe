// src/roles/producer/modals/CreateAssignmentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
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
} from '@/services/assignment.service';
import { seriesService, SeriesMemberDto } from '@/services/series.service';
import { pipelineService, PipelineStageDto } from '@/services/pipeline.service';

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
  const [targetEntityId, setTargetEntityId] = useState('');
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
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !chapterId) return;

    let isMounted = true;
    setLoadingInitial(true);
    setError(null);

    Promise.all([
      seriesId
        ? pipelineService.getSeriesPipeline(seriesId).catch(() => null)
        : Promise.resolve(null),
      workspaceId && seriesId
        ? seriesService.getSeriesMembers(workspaceId, seriesId).catch(() => [])
        : Promise.resolve([]),
      assignmentService.getAssignments(chapterId).catch(() => []),
    ])
      .then(([pipelineData, membersData, assignmentsData]) => {
        if (!isMounted) return;

        if (pipelineData?.stages && pipelineData.stages.length > 0) {
          setStages(pipelineData.stages);
          setPipelineStageId(pipelineData.stages[0].id);
        } else {
          // Fallback default stages if pipeline is empty
          setStages([
            {
              id: 'stage-script',
              name: 'Script / Kịch bản',
              slug: 'script',
              stageOrder: 1,
              isApprovalGate: false,
              isInitial: true,
              isTerminal: false,
            },
            {
              id: 'stage-thumbnail',
              name: 'Storyboard / Thumbnail',
              slug: 'thumbnail',
              stageOrder: 2,
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-pencil',
              name: 'Pencil / Vẽ phác',
              slug: 'pencil',
              stageOrder: 3,
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-ink',
              name: 'Inking / Đi nét',
              slug: 'ink',
              stageOrder: 4,
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-color',
              name: 'Coloring / Lên màu',
              slug: 'color',
              stageOrder: 5,
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
            {
              id: 'stage-letter',
              name: 'Lettering / Thoại',
              slug: 'letter',
              stageOrder: 6,
              isApprovalGate: false,
              isInitial: false,
              isTerminal: false,
            },
          ]);
          setPipelineStageId('stage-script');
        }

        if (membersData && membersData.length > 0) {
          setMembers(membersData);
          setAssigneeUserId(membersData[0].userId);
        }

        if (assignmentsData) {
          setExistingAssignments(assignmentsData);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Lỗi tải dữ liệu khởi tạo giao việc.');
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId, seriesId, chapterId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) {
      setError('Vui lòng nhập mô tả yêu cầu công việc (Brief).');
      return;
    }
    if (!pipelineStageId) {
      setError('Vui lòng chọn công đoạn Pipeline.');
      return;
    }
    if (!assigneeUserId) {
      setError('Vui lòng chọn nhân sự thực hiện.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: CreateAssignmentRequest = {
      entityType,
      targetEntityId: targetEntityId.trim() || null,
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
        `Đã tạo công việc cho công đoạn ${stages.find((s) => s.id === pipelineStageId)?.name || 'Pipeline'}.`,
      );
      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể tạo công việc.';
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
            <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2'>
              <AlertCircle className='w-4 h-4 shrink-0' />
              <span>{error}</span>
            </div>
          )}

          {loadingInitial ? (
            <div className='py-8 text-center text-[#888888]'>
              <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
              <span>Đang tải thông tin thành viên và công đoạn...</span>
            </div>
          ) : (
            <>
              {/* Entity Type & Target Entity */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Phạm vi giao việc (Entity Type) *
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as WorkflowEntityType)}
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                  >
                    <option value='Chapter'>Toàn bộ Chương (Chapter)</option>
                    <option value='Page'>Theo Trang (Page)</option>
                    <option value='Panel'>Theo Khung hình (Panel)</option>
                  </select>
                </div>

                {entityType !== 'Chapter' && (
                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>
                      {entityType === 'Page'
                        ? 'Mã / Số Trang (Page Id)'
                        : 'Mã Khung Hình (Panel Id)'}
                    </label>
                    <input
                      type='text'
                      placeholder={entityType === 'Page' ? 'Ví dụ: page-01' : 'Ví dụ: panel-01'}
                      value={targetEntityId}
                      onChange={(e) => setTargetEntityId(e.target.value)}
                      className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-mono focus:outline-none focus:border-[#F97316]'
                    />
                  </div>
                )}
              </div>

              {/* Pipeline Stage & Assignee */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Công đoạn Pipeline *
                  </label>
                  <select
                    value={pipelineStageId}
                    onChange={(e) => setPipelineStageId(e.target.value)}
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
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Người nhận việc (Assignee) *
                  </label>
                  <select
                    value={assigneeUserId}
                    onChange={(e) => setAssigneeUserId(e.target.value)}
                    required
                    className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F97316]'
                  >
                    {members.length > 0 ? (
                      members.map((m) => (
                        <option key={m.id} value={m.userId}>
                          {m.fullName || m.email.split('@')[0]} — {m.seriesRole || 'Thành viên'}
                        </option>
                      ))
                    ) : (
                      <option value=''>Chưa có thành viên trong series</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Brief (Required) */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1 flex items-center justify-between'>
                  <span>Yêu cầu công việc (Brief) *</span>
                  <span className='text-[10px] text-[#888888] font-normal'>
                    Bắt buộc theo BR-19
                  </span>
                </label>
                <textarea
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
                <label className='block font-semibold text-[#171717] mb-1'>
                  Ghi chú tham chiếu / Tài liệu đính kèm (Reference Notes)
                </label>
                <input
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
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Mức độ ưu tiên (Priority)
                  </label>
                  <select
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
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Hạn hoàn thành (Due Date)
                  </label>
                  <input
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
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Phụ thuộc vào công việc trước (Depends On Assignment)
                  </label>
                  <select
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
