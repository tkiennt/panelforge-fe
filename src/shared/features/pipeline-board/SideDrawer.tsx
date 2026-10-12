import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Clock,
  User,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  History,
  ArrowUpRight,
  Loader2,
  Calendar,
  Lock,
  Trash2,
} from 'lucide-react';
import { BoardCard } from './pipelineBoard.types';
import { assignmentService, SubmissionDto, ChangeRequestDto } from '@/services/assignment.service';

interface SideDrawerProps {
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

  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    ])
      .then(([subList, crList]) => {
        if (!isMounted) return;
        setSubmissions(subList);
        setChangeRequests(crList);
      })
      .finally(() => {
        if (isMounted) setLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, card]);

  if (!isOpen || !card) return null;

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

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[100] transition-opacity'
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className='fixed top-0 right-0 h-full w-[460px] max-w-[95vw] bg-white shadow-2xl border-l border-zinc-200 z-[110] flex flex-col animate-in slide-in-from-right duration-300'>
        {/* Header */}
        <div className='flex items-start justify-between p-5 border-b border-zinc-200 bg-zinc-50/70'>
          <div className='space-y-1.5 pr-4'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span
                className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-zinc-900 border border-zinc-200'
                style={{ backgroundColor: card.stageColor || '#F3F4F6' }}
              >
                {card.stageName}
              </span>
              <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700'>
                {card.targetLabel}
              </span>
              <span className='text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white border-zinc-300 text-zinc-800'>
                {card.status}
              </span>
            </div>
            <h2 className='text-base font-bold text-zinc-900 leading-snug'>{card.brief}</h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors shrink-0'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar'>
          {/* Quick Info Grid */}
          <div className='bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 space-y-3 text-xs'>
            <div className='flex items-center justify-between py-1 border-b border-zinc-200/60'>
              <span className='text-zinc-500 flex items-center gap-1.5'>
                <User className='w-3.5 h-3.5 text-zinc-400' />
                Người thực hiện:
              </span>
              <span className='font-semibold text-zinc-900 flex items-center gap-1.5'>
                <span className='w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold'>
                  {card.assigneeAvatarInitials}
                </span>
                {card.assigneeName} ({card.assignedRole})
              </span>
            </div>

            <div className='flex items-center justify-between py-1 border-b border-zinc-200/60'>
              <span className='text-zinc-500 flex items-center gap-1.5'>
                <Clock className='w-3.5 h-3.5 text-zinc-400' />
                Hạn chót:
              </span>
              <span className='font-semibold text-zinc-900'>
                {card.dueDate ? new Date(card.dueDate).toLocaleString('vi-VN') : 'Không có hạn'}
              </span>
            </div>

            <div className='flex items-center justify-between py-1 border-b border-zinc-200/60'>
              <span className='text-zinc-500 flex items-center gap-1.5'>
                <Layers className='w-3.5 h-3.5 text-zinc-400' />
                Mức ưu tiên:
              </span>
              <span className='font-semibold text-zinc-900'>{String(card.priority)}</span>
            </div>

            {((card.dependsOnAssignmentIds && card.dependsOnAssignmentIds.length > 0) ||
              card.dependsOnAssignmentId) && (
              <div className='py-1 space-y-1.5 border-t border-zinc-200/60 pt-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-zinc-500 flex items-center gap-1.5'>
                    <Lock className='w-3.5 h-3.5 text-amber-500' />
                    Phụ thuộc tiền đề (DAG):
                  </span>
                  <span className='font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]'>
                    {(card.dependsOnAssignmentIds?.length || (card.dependsOnAssignmentId ? 1 : 0))} nhiệm vụ
                  </span>
                </div>
                <div className='flex flex-wrap gap-1'>
                  {(card.dependsOnAssignmentIds && card.dependsOnAssignmentIds.length > 0
                    ? card.dependsOnAssignmentIds
                    : card.dependsOnAssignmentId
                      ? [card.dependsOnAssignmentId]
                      : []
                  ).map((id) => (
                    <span
                      key={id}
                      className='font-mono text-[10px] text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200/60'
                    >
                      #{id.substring(0, 8)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reference Notes */}
          {card.referenceNotes && (
            <div className='space-y-1.5'>
              <h4 className='text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5'>
                <FileText className='w-3.5 h-3.5 text-zinc-400' />
                Ghi chú & Tài liệu tham chiếu
              </h4>
              <div className='p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap'>
                {card.referenceNotes}
              </div>
            </div>
          )}

          {/* Last Feedback Comment */}
          {card.lastFeedbackComment && (
            <div className='space-y-1.5'>
              <h4 className='text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5'>
                <AlertCircle className='w-3.5 h-3.5 text-rose-500' />
                Nhận xét phản hồi gần nhất
              </h4>
              <div className='p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed'>
                {card.lastFeedbackComment}
              </div>
            </div>
          )}

          {/* Submissions Section */}
          <div className='space-y-2.5'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5'>
                <History className='w-3.5 h-3.5 text-blue-600' />
                Lịch sử nộp bài ({submissions.length})
              </h4>
            </div>

            {loadingData ? (
              <div className='py-6 flex items-center justify-center text-zinc-400 gap-2 text-xs'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang tải lịch sử...</span>
              </div>
            ) : submissions.length === 0 ? (
              <div className='p-4 text-center border border-dashed border-zinc-200 rounded-xl text-xs text-zinc-400'>
                Chưa có bản nộp nào cho nhiệm vụ này.
              </div>
            ) : (
              <div className='space-y-2'>
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className='p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-bold text-zinc-900'>Lần nộp #{sub.attemptNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          sub.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : sub.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                    <div className='text-[11px] text-zinc-500'>
                      Thời gian: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                    </div>
                    {sub.decisionComment && (
                      <div className='text-[11px] text-zinc-700 pt-1 italic'>
                        Ghi chú duyệt: &quot;{sub.decisionComment}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Requests Section */}
          {changeRequests.length > 0 && (
            <div className='space-y-2.5'>
              <h4 className='text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5'>
                <AlertCircle className='w-3.5 h-3.5 text-amber-500' />
                Yêu cầu sửa đổi ({changeRequests.length})
              </h4>
              <div className='space-y-2'>
                {changeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className='p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs space-y-1'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-bold text-amber-900'>{cr.description}</span>
                      <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-800'>
                        {cr.status}
                      </span>
                    </div>
                    {cr.resolutionNote && (
                      <div className='text-[11px] text-zinc-600'>Đã xử lý: {cr.resolutionNote}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className='p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-2 flex-wrap'>
          {card.status !== 'Approved' && (
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={handleDeleteAssignment}
                disabled={isDeleting}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  confirmDelete
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
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
                  className='px-2 py-2 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer'
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
              className='inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer'
            >
              <span>Mở Bàn làm việc & Xét duyệt</span>
              <ArrowUpRight className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={onClose}
              className='px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer'
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
