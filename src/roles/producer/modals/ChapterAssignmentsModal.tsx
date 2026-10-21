// src/roles/producer/modals/ChapterAssignmentsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Play,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  User,
  Filter,
  RefreshCw,
  AlertTriangle,
  Scissors,
} from 'lucide-react';
import {
  assignmentService,
  AssignmentDto,
  StageProgressDto,
  AssignmentStatus,
} from '@/services/assignment.service';
import { seriesService, SeriesMemberDto } from '@/services/series.service';
import { pipelineService, PipelineStageDto } from '@/services/pipeline.service';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import {
  describeStartError,
  pendingDependencyCount,
} from '@/shared/features/collaboration/collaborationRules';

interface ChapterAssignmentsModalProps {
  isOpen: boolean;
  workspaceId: string;
  seriesId: string;
  chapterId: string;
  chapterNumber?: number | string;
  chapterTitle?: string;
  onClose: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const ChapterAssignmentsModal: React.FC<ChapterAssignmentsModalProps> = ({
  isOpen,
  workspaceId,
  seriesId,
  chapterId,
  chapterNumber,
  chapterTitle,
  onClose,
  onShowToast,
}) => {
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [stageProgressList, setStageProgressList] = useState<StageProgressDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [members, setMembers] = useState<SeriesMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Sub-modal: Create Assignment & Carve-out Stage
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [carveOutStageId, setCarveOutStageId] = useState<string | undefined>(undefined);

  const handleCarveOut = (a: AssignmentDto) => {
    setCarveOutStageId(a.pipelineStageId);
    setShowCreateModal(true);
  };

  const fetchData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);

    try {
      const [assignmentsRes, progressRes, pipelineData, membersData] = await Promise.all([
        assignmentService.getAssignments(chapterId),
        assignmentService.getStageProgress(chapterId),
        seriesId
          ? pipelineService.getSeriesPipeline(seriesId).catch(() => null)
          : Promise.resolve(null),
        workspaceId && seriesId
          ? seriesService.getSeriesMembers(workspaceId, seriesId).catch(() => [])
          : Promise.resolve([]),
      ]);

      setAssignments(assignmentsRes || []);
      setStageProgressList(progressRes || []);
      if (pipelineData?.stages) setStages(pipelineData.stages);
      if (membersData) setMembers(membersData);
    } catch (err: any) {
      setError(err.message || 'Lỗi nạp dữ liệu phân công và tiến độ.');
    } finally {
      setLoading(false);
    }
  }, [chapterId, seriesId, workspaceId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  const getStageName = (stageId: string) => {
    const found = stages.find((s) => s.id === stageId);
    return found ? `${found.stageOrder}. ${found.name}` : stageId;
  };

  const getAssigneeName = (userId: string) => {
    const found = members.find((m) => m.userId === userId);
    return found ? found.fullName || found.email.split('@')[0] : userId;
  };

  const handleStart = async (assignment: AssignmentDto) => {
    setActionLoadingId(assignment.id);
    setError(null);
    try {
      const updated = await assignmentService.startAssignment(chapterId, assignment.id);
      onShowToast?.(
        'Đã bắt đầu công việc',
        `Trạng thái chuyển sang InProgress cho công đoạn ${getStageName(assignment.pipelineStageId)}.`,
      );
      setAssignments((prev) => prev.map((a) => (a.id === assignment.id ? updated : a)));
      // Refresh progress
      const p = await assignmentService.getStageProgress(chapterId);
      setStageProgressList(p || []);
    } catch (err: any) {
      const { title, message } = describeStartError(err);
      setError(message);
      onShowToast?.(title, message);
      // 409: trạng thái trên máy đã cũ (vd. đã bắt đầu rồi) → nạp lại danh sách để hiện đúng trạng thái
      if (err?.status === 409) {
        assignmentService
          .getAssignments(chapterId)
          .then((list) => setAssignments(list || []))
          .catch(() => undefined);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmit = async (assignment: AssignmentDto) => {
    // Backend Breaking Constraint check: status must be InProgress
    if (assignment.status !== 'InProgress') {
      const msg = 'Phải bắt đầu việc (trạng thái InProgress) trước khi nộp!';
      setError(msg);
      onShowToast?.('Quy định nộp bài', msg);
      return;
    }

    setActionLoadingId(assignment.id);
    setError(null);
    try {
      const updated = await assignmentService.submitAssignment(chapterId, assignment.id);
      onShowToast?.(
        'Nộp bài thành công',
        `Đã nộp công việc cho ${getStageName(assignment.pipelineStageId)}. Chờ duyệt review.`,
      );
      setAssignments((prev) => prev.map((a) => (a.id === assignment.id ? updated : a)));
      // Refresh progress
      const p = await assignmentService.getStageProgress(chapterId);
      setStageProgressList(p || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể nộp bài.';
      setError(msg);
      onShowToast?.('Lỗi nộp bài', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesStage = stageFilter === 'ALL' || a.pipelineStageId === stageFilter;
    return matchesStatus && matchesStage;
  });

  const renderStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case 'Assigned':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200'>
            Đã giao (Assigned)
          </span>
        );
      case 'InProgress':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' />
            Đang làm (InProgress)
          </span>
        );
      case 'Submitted':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200'>
            Đã nộp (Submitted)
          </span>
        );
      case 'UnderReview':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200'>
            Đang duyệt (UnderReview)
          </span>
        );
      case 'Approved':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1'>
            <CheckCircle2 className='w-3 h-3 text-emerald-600' />
            Đã duyệt (Approved)
          </span>
        );
      case 'ReworkRequired':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-50 text-red-700 border border-red-200'>
            Cần sửa lại (Rework)
          </span>
        );
      default:
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700'>
            {String(status)}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string | number) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className='px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[9px] font-bold'>
            URGENT
          </span>
        );
      case 'High':
        return (
          <span className='px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 text-[9px] font-bold'>
            HIGH
          </span>
        );
      case 'Low':
        return (
          <span className='px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 text-[9px] font-bold'>
            LOW
          </span>
        );
      default:
        return (
          <span className='px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-bold'>
            NORMAL
          </span>
        );
    }
  };

  return (
    <>
      <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4'>
        <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
          {/* Header */}
          <div className='p-5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5] rounded-t-2xl'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
                <Layers className='w-5 h-5' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[9px] font-bold'>
                    UC-05 // TASK &amp; PROGRESS MATRIX
                  </span>
                  <span className='text-[10px] text-[#888888] font-mono'>
                    StageProgress Tracking
                  </span>
                </div>
                <h2 className='text-base font-bold text-[#171717] mt-0.5'>
                  Phân Công &amp; Tiến Độ Sản Xuất: Chương {chapterNumber || ''}{' '}
                  {chapterTitle ? `(${chapterTitle})` : ''}
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

          {/* Body */}
          <div className='p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs'>
            {error && (
              <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 shrink-0' />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Stats & Progress Bar */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7]'>
                <div className='text-[10px] font-mono text-[#888888] uppercase'>
                  Tổng số nhiệm vụ
                </div>
                <div className='text-lg font-bold text-[#171717] font-mono mt-0.5'>
                  {assignments.length}
                </div>
              </div>
              <div className='p-3 bg-amber-50/60 rounded-xl border border-amber-200'>
                <div className='text-[10px] font-mono text-amber-700 uppercase'>
                  Đang thực hiện (InProgress)
                </div>
                <div className='text-lg font-bold text-amber-900 font-mono mt-0.5'>
                  {assignments.filter((a) => a.status === 'InProgress').length}
                </div>
              </div>
              <div className='p-3 bg-purple-50/60 rounded-xl border border-purple-200'>
                <div className='text-[10px] font-mono text-purple-700 uppercase'>
                  Đã nộp chờ duyệt
                </div>
                <div className='text-lg font-bold text-purple-900 font-mono mt-0.5'>
                  {
                    assignments.filter(
                      (a) => a.status === 'Submitted' || a.status === 'UnderReview',
                    ).length
                  }
                </div>
              </div>
              <div className='p-3 bg-emerald-50/60 rounded-xl border border-emerald-200'>
                <div className='text-[10px] font-mono text-emerald-700 uppercase'>
                  Tiến độ panel (Approved)
                </div>
                <div className='text-lg font-bold text-emerald-900 font-mono mt-0.5'>
                  {stageProgressList.filter((p) => p.status === 'Approved').length} /{' '}
                  {stageProgressList.length || 0}
                </div>
              </div>
            </div>

            {/* Stage Progress Matrix Preview if panels exist */}
            {stageProgressList.length > 0 && (
              <div className='p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-[#171717] flex items-center gap-1.5'>
                    <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                    <span>Ma Trận Tiến Độ Khung Hình (StageProgress Matrix)</span>
                  </span>
                  <span className='text-[10px] font-mono text-zinc-500'>
                    {stageProgressList.length} điểm kiểm soát
                  </span>
                </div>
                <div className='flex flex-wrap gap-2 pt-1'>
                  {stageProgressList.map((prog) => (
                    <div
                      key={prog.id}
                      className={`px-2 py-1 rounded border text-[10px] font-mono flex items-center gap-1.5 ${
                        prog.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : prog.status === 'Submitted'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : prog.status === 'InProgress'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-white text-zinc-600 border-zinc-300'
                      }`}
                    >
                      <span className='font-bold'>
                        {prog.panelId ? `Panel #${prog.panelId.slice(0, 4)}` : 'Chapter'}
                      </span>
                      <span>•</span>
                      <span>{getStageName(prog.pipelineStageId)}</span>
                      <span>({String(prog.status)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar & Filters */}
            <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='flex items-center gap-1 text-zinc-500'>
                  <Filter className='w-3.5 h-3.5' />
                  <span>Bộ lọc:</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className='px-2.5 py-1 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold'
                >
                  <option value='ALL'>Tất cả trạng thái</option>
                  <option value='Assigned'>Đã giao (Assigned)</option>
                  <option value='InProgress'>Đang làm (InProgress)</option>
                  <option value='Submitted'>Đã nộp (Submitted)</option>
                  <option value='UnderReview'>Đang duyệt (UnderReview)</option>
                  <option value='Approved'>Đã duyệt (Approved)</option>
                </select>

                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className='px-2.5 py-1 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold'
                >
                  <option value='ALL'>Tất cả công đoạn</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stageOrder}. {s.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchData}
                  className='p-1.5 text-zinc-500 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors'
                  title='Tải lại'
                >
                  <RefreshCw className='w-3.5 h-3.5' />
                </button>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer'
              >
                <Plus className='w-3.5 h-3.5' />
                <span>+ Giao Việc Mới</span>
              </button>
            </div>

            {/* Assignments List */}
            <div className='space-y-3'>
              {loading ? (
                <div className='py-12 text-center text-[#888888]'>
                  <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
                  <span>Đang nạp danh sách công việc...</span>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className='py-12 text-center text-[#888888] border border-dashed border-[#E7E7E7] rounded-xl space-y-2'>
                  <Layers className='w-8 h-8 mx-auto text-[#CCCCCC]' />
                  <div className='font-bold text-[#171717]'>Chưa có công việc nào</div>
                  <div className='text-[11px] text-[#737373]'>
                    Bấm &quot;+ Giao Việc Mới&quot; để phân công kịch bản, nét vẽ, thoại cho các
                    thành viên.
                  </div>
                </div>
              ) : (
                filteredAssignments.map((assignment) => {
                  const isLoadingThis = actionLoadingId === assignment.id;
                  const canStart = assignment.status === 'Assigned';
                  const canSubmit = assignment.status === 'InProgress';

                  return (
                    <div
                      key={assignment.id}
                      className='p-4 bg-white border border-[#E7E7E7] rounded-xl hover:border-zinc-400 transition-all space-y-3 shadow-2xs'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div className='flex items-center gap-2'>
                          <span className='px-2 py-0.5 rounded bg-zinc-800 text-white font-mono text-[9px] font-bold'>
                            {assignment.entityType}{' '}
                            {assignment.targetEntityId ? `#${assignment.targetEntityId}` : ''}
                          </span>
                          <span className='font-bold text-sm text-[#171717]'>
                            {getStageName(assignment.pipelineStageId)}
                          </span>
                          {renderPriorityBadge(assignment.priority)}
                        </div>
                        <div className='flex items-center gap-2'>
                          {renderStatusBadge(assignment.status)}
                        </div>
                      </div>

                      <div className='text-xs text-[#333333] font-medium leading-relaxed bg-[#FAF8F5] p-3 rounded-lg border border-[#F0ECE1]'>
                        {assignment.brief}
                      </div>

                      {assignment.referenceNotes && (
                        <div className='text-[11px] text-[#666666] flex items-center gap-1.5'>
                          <span className='font-bold text-zinc-500 font-mono'>Tham chiếu:</span>
                          <span>{assignment.referenceNotes}</span>
                        </div>
                      )}

                      <div className='flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F3F3F3] text-[11px] text-[#737373]'>
                        <div className='flex items-center gap-4'>
                          <span className='flex items-center gap-1'>
                            <User className='w-3 h-3 text-[#F97316]' />
                            <strong>Người làm:</strong> {getAssigneeName(assignment.assigneeUserId)}
                          </span>
                          {assignment.dueDate && (
                            <span className='flex items-center gap-1 font-mono'>
                              <Calendar className='w-3 h-3 text-zinc-500' />
                              <strong>Hạn:</strong>{' '}
                              {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Start, Submit & Carve-out */}
                        <div className='flex items-center gap-2'>
                          {/* Carve-out: Tách trang/khung cho người khác từ việc cả chương của Artist/Letterer */}
                          {(() => {
                            const isChapter = assignment.entityType === 'Chapter';
                            const stage = stages.find((s) => s.id === assignment.pipelineStageId);
                            const isArtistOrLetterer =
                              stage?.allowedRole === 'Artist' || stage?.allowedRole === 'Letterer';
                            const canCarveOut =
                              isChapter &&
                              isArtistOrLetterer &&
                              (assignment.status === 'Assigned' ||
                                assignment.status === 'InProgress' ||
                                assignment.status === 'ReworkRequired');

                            if (!canCarveOut) return null;

                            return (
                              <button
                                onClick={() => handleCarveOut(assignment)}
                                className='px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1.5 cursor-pointer text-[11px] shadow-2xs transition-colors'
                                title='Tách trang hoặc khung cho thành viên khác ở công đoạn này'
                              >
                                <Scissors className='w-3 h-3 text-amber-600' />
                                <span>Tách trang/khung cho người khác</span>
                              </button>
                            );
                          })()}

                          {canStart &&
                            (() => {
                              const pendingDeps = pendingDependencyCount(assignment, assignments);
                              const lockedReason =
                                pendingDeps > 0
                                  ? `Chờ ${pendingDeps} việc phụ thuộc được duyệt (Approved).`
                                  : null;
                              return (
                                <button
                                  onClick={() => handleStart(assignment)}
                                  disabled={isLoadingThis || !!lockedReason}
                                  className='px-3 py-1.5 rounded-lg bg-[#171717] hover:bg-black text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs'
                                  title={lockedReason ?? 'Bắt đầu làm công việc này'}
                                >
                                  {isLoadingThis ? (
                                    <Loader2 className='w-3 h-3 animate-spin' />
                                  ) : (
                                    <Play className='w-3 h-3 text-[#F97316]' />
                                  )}
                                  <span>{lockedReason ? 'Chờ việc phụ thuộc' : 'Bắt đầu làm'}</span>
                                </button>
                              );
                            })()}

                          {canSubmit && (
                            <button
                              onClick={() => handleSubmit(assignment)}
                              disabled={isLoadingThis}
                              className='px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs'
                              title='Nộp bài cho công đoạn này để Review'
                            >
                              {isLoadingThis ? (
                                <Loader2 className='w-3 h-3 animate-spin' />
                              ) : (
                                <Send className='w-3 h-3' />
                              )}
                              <span>Nộp bài</span>
                            </button>
                          )}

                          {/* Disabled Submit Button with Tooltip when still Assigned */}
                          {assignment.status === 'Assigned' && (
                            <button
                              disabled
                              title='Phải bấm "Bắt đầu làm" (InProgress) trước khi nộp theo ràng buộc hệ thống!'
                              className='px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-400 font-semibold flex items-center gap-1 cursor-not-allowed text-[11px]'
                            >
                              <Send className='w-3 h-3' />
                              <span>Nộp bài (Chưa bắt đầu)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested Create Assignment Modal */}
      {showCreateModal && (
        <CreateAssignmentModal
          isOpen={showCreateModal}
          workspaceId={workspaceId}
          seriesId={seriesId}
          chapterId={chapterId}
          chapterNumber={chapterNumber}
          initialPipelineStageId={carveOutStageId}
          initialEntityType={carveOutStageId ? 'Page' : undefined}
          onClose={() => {
            setShowCreateModal(false);
            setCarveOutStageId(undefined);
          }}
          onSuccess={() => {
            fetchData();
            setCarveOutStageId(undefined);
          }}
          onShowToast={onShowToast}
        />
      )}
    </>
  );
};
