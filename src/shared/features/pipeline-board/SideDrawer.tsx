import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
} from 'lucide-react';
import { BoardCard } from './pipelineBoard.types';
import {
  assignmentService,
  SubmissionDto,
  ChangeRequestDto,
  AssignmentDto,
} from '@/services/assignment.service';
import { StatusBadge, StageLabel } from './ProductionTaskCard';
import { useTaskThumbnail } from './useTaskThumbnail';
// eslint-disable-next-line no-restricted-imports
import { DependencyGraphModal } from '@/roles/producer/components/DependencyGraphModal';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card: BoardCard | null;
  onShowToast?: (title: string, desc: string) => void;
  onDeleted?: (cardId: string) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  card,
  onShowToast,
  onDeleted,
}) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();
  const modalRef = useRef<HTMLDivElement>(null);

  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [chapterAssignments, setChapterAssignments] = useState<AssignmentDto[]>([]);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Artwork thumbnail
  const thumbnail = useTaskThumbnail(card);

  // Khóa cuộn nền khi Modal mở (giữ layout nền ổn định)
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setConfirmDelete(false);
    setIsDeleting(false);
    if (!isOpen || !card) return;

    let isMounted = true;
    setLoadingData(true);

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

    return () => {
      isMounted = false;
    };
  }, [isOpen, card]);

  // Trap focus bên trong modal khi mở
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !card || typeof document === 'undefined') return null;

  const handleOpenMyWork = () => {
    if (workspaceId && seriesId) {
      navigate(
        `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${card.chapterId}&assignmentId=${card.id}`,
      );
      onClose();
    } else {
      onShowToast?.('Không tìm thấy thông tin Series', 'Vui lòng kiểm tra lại đường dẫn');
    }
  };

  const handleDeleteAssignment = async () => {
    if (!card) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      await assignmentService.deleteAssignment(card.chapterId, card.id);
      onShowToast?.('Đã huỷ nhiệm vụ', `Nhiệm vụ "${card.brief}" đã được gỡ khỏi chương.`);
      onDeleted?.(card.id);
      onClose();
    } catch (err: any) {
      onShowToast?.('Lỗi khi huỷ nhiệm vụ', err.message || 'Không thể huỷ nhiệm vụ này');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const modalContent = (
    <div
      className='fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4'
      role='presentation'
    >
      {/* 1. Lớp phủ Overlay Backdrop */}
      <div
        className='fixed inset-0 bg-[#1C1917]/55 backdrop-blur-[3px] transition-opacity duration-200'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* 2. Hộp Modal chi tiết căn giữa viewport, an toàn trước overflow của mọi container cha */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-label={`Chi tiết công việc: ${card.brief}`}
        className='relative z-10 w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[88vh] bg-[#FCFBF8] border border-landing-border rounded-2xl shadow-2xl flex flex-col font-sans text-landing-ink overflow-hidden outline-none animate-in fade-in zoom-in-95 duration-150'
      >
        {/* Header cố định: Phân định đối tượng, công đoạn, trạng thái và nút X */}
        <div className='flex items-start justify-between p-4 sm:p-5 border-b border-landing-border bg-[#F3F0E9]/80 shrink-0'>
          <div className='space-y-2 pr-3 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <StageLabel card={card} />
              <span className='text-xs font-mono font-semibold px-2 py-0.5 rounded bg-stone-200 text-stone-800 border border-stone-300 shadow-2xs'>
                {card.targetLabel}
              </span>
              <StatusBadge status={card.status} />
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
          {/* Nhóm 1: Bản vẽ bản thảo / Artwork liên quan */}
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
                  {thumbnail.label ||
                    (card.entityType === 'Chapter'
                      ? 'Kế hoạch chương (không có trang vẽ)'
                      : 'Chưa có bản vẽ cho công việc này')}
                </span>
              </div>
            )}
          </section>

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
                  return { id, assignment: found };
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
                                  const url = `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${card.chapterId}&assignmentId=${id}`;
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

        {/* Footer cố định: Huỷ việc, Mở bàn làm việc & Đóng */}
        <div className='p-4 border-t border-landing-border bg-[#F3F0E9]/90 flex items-center justify-between gap-2.5 flex-wrap shrink-0'>
          {card.status !== 'Approved' && (
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={handleDeleteAssignment}
                disabled={isDeleting}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  confirmDelete
                    ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                }`}
                title={confirmDelete ? 'Bấm để xác nhận xoá nhiệm vụ' : 'Huỷ / Xoá phân công này'}
              >
                {isDeleting ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Trash2 className='w-3.5 h-3.5' />
                )}
                <span>{confirmDelete ? 'Xác nhận xoá?' : 'Huỷ việc'}</span>
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
            return {
              id,
              brief: a?.brief || `Nhiệm vụ #${id.slice(0, 8)}`,
              status: a?.status || 'Assigned',
              stageName: a?.stageName || 'Pipeline',
              contextText: a ? 'Chương này' : undefined,
            };
          })}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
