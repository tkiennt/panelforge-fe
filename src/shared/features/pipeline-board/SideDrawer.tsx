import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  History,
  MessageSquare,
  Sparkles,
  Clock,
  Play,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { PipelineCard, PIPELINE_MEMBERS } from '@/mocks/mockPipelineData';
import { assignmentService, AssignmentStatus } from '@/services/assignment.service';

import { usePermissions } from '@/lib/permissions';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card: PipelineCard | null;
  userRoles: string[];
  chapterId?: string;
  onShowToast?: (title: string, desc: string) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  card,
  userRoles,
  chapterId,
  onShowToast,
}) => {
  const { hasPermission } = usePermissions(userRoles || []);
  const [currentStatus, setCurrentStatus] = useState<AssignmentStatus>('Assigned');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !card) return null;

  const handleStartAssignment = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (chapterId) {
        await assignmentService.startAssignment(chapterId, card.id);
      }
      setCurrentStatus('InProgress');
      onShowToast?.('Đã bắt đầu làm', `Công việc ${card.identifier} chuyển sang InProgress.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi bắt đầu làm việc.';
      setActionError(msg);
      onShowToast?.('Không thể bắt đầu', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (currentStatus !== 'InProgress') {
      const msg =
        'Phải bắt đầu việc (trạng thái InProgress) trước khi nộp để tránh lỗi 409 Conflict!';
      setActionError(msg);
      onShowToast?.('Quy định nộp bài', msg);
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      if (chapterId) {
        await assignmentService.submitAssignment(chapterId, card.id);
      }
      setCurrentStatus('Submitted');
      onShowToast?.('Đã nộp bài thành công', `Công việc ${card.identifier} đã được nộp chờ duyệt.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi nộp bài.';
      setActionError(msg);
      onShowToast?.('Không thể nộp bài', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const assignee = PIPELINE_MEMBERS[card.assigneeId];

  // AI button permission
  const canRequestAI = hasPermission('request_ai');

  return (
    <>
      {/* Overlay */}
      <div
        className='fixed inset-0 bg-[#171717]/20 backdrop-blur-[2px] z-[100]'
        onClick={onClose}
      />

      {/* Drawer */}
      <div className='fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-[#FAF8F4] shadow-2xl border-l border-[#E7E7E7] z-[110] flex flex-col animate-in slide-in-from-right duration-300'>
        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-[#E7E7E7] bg-white'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <span className='text-xs font-mono text-[#737373] bg-[#F3F3F3] px-1.5 py-0.5 rounded-md'>
                {card.identifier}
              </span>
              {card.isAIAssisted && (
                <span className='text-[10px] uppercase font-bold tracking-wider text-[#8B5CF6] bg-[#F5F3FF] px-1.5 py-0.5 rounded border border-[#DDD6FE]'>
                  AI Assisted
                </span>
              )}
            </div>
            <h2 className='text-lg font-heading font-semibold text-[#171717]'>{card.title}</h2>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F3F3] text-[#737373] transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className='flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6'>
          {/* Thumbnail / Image Preview */}
          <div className='w-full aspect-video bg-[#E7E7E7] rounded-lg border border-[#D4D4D4] flex items-center justify-center overflow-hidden'>
            {card.thumbnailUrl ? (
              <img
                src={card.thumbnailUrl}
                alt={card.title}
                className='w-full h-full object-cover'
              />
            ) : (
              <div className='flex flex-col items-center text-[#A3A3A3]'>
                <ImageIcon className='w-8 h-8 mb-2 stroke-[1.5]' />
                <span className='text-sm font-medium'>No preview available</span>
              </div>
            )}
          </div>

          {/* Brief & Assignee */}
          <div className='bg-white p-4 rounded-xl border border-[#E7E7E7] shadow-2xs space-y-4'>
            <div>
              <h3 className='text-xs font-bold text-[#737373] uppercase tracking-wider mb-2'>
                Assignee
              </h3>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center text-white text-xs font-semibold shadow-md'>
                  {assignee?.avatarInitials}
                </div>
                <div>
                  <div className='text-sm font-semibold text-[#171717]'>{assignee?.name}</div>
                  <div className='text-[11px] text-[#737373]'>{assignee?.role}</div>
                </div>
              </div>
            </div>

            <div className='pt-3 border-t border-[#F3F3F3]'>
              <h3 className='text-xs font-bold text-[#737373] uppercase tracking-wider mb-2'>
                Stage
              </h3>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium capitalize text-[#171717]'>{card.stage}</span>
                <span className='flex items-center gap-1.5 text-xs text-[#525252] font-mono'>
                  <Clock className='w-3.5 h-3.5' />
                  {new Date(card.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className='pt-3 border-t border-[#F3F3F3]'>
              <h3 className='text-xs font-bold text-[#737373] uppercase tracking-wider mb-2'>
                Brief / Description
              </h3>
              <p className='text-sm text-[#525252] leading-relaxed'>
                This is a placeholder description for {card.identifier}. In the real system, this
                would contain the script excerpt or director's notes.
              </p>
            </div>
          </div>

          {/* Elements List (if panel) */}
          {card.type === 'panel' && (
            <div>
              <h3 className='text-sm font-bold text-[#171717] mb-3'>Panel Elements</h3>
              <div className='bg-white border border-[#E7E7E7] rounded-lg overflow-hidden'>
                <div className='p-3 border-b border-[#F3F3F3] flex items-center justify-between text-sm hover:bg-[#FAF8F4]'>
                  <span className='text-[#525252]'>Character Ink</span>
                  <span className='text-xs font-mono text-[#10B981]'>Done</span>
                </div>
                <div className='p-3 border-b border-[#F3F3F3] flex items-center justify-between text-sm hover:bg-[#FAF8F4]'>
                  <span className='text-[#525252]'>Background</span>
                  <span className='text-xs font-mono text-[#F59E0B]'>WIP</span>
                </div>
                <div className='p-3 flex items-center justify-between text-sm hover:bg-[#FAF8F4]'>
                  <span className='text-[#525252]'>SFX Lettering</span>
                  <span className='text-xs font-mono text-[#737373]'>Pending</span>
                </div>
              </div>
            </div>
          )}

          {/* Assignment Actions (UC-05) */}
          <div className='p-3.5 bg-white border border-[#E7E7E7] rounded-xl shadow-2xs space-y-2.5'>
            <div className='flex items-center justify-between'>
              <h3 className='text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-1.5'>
                <Clock className='w-3.5 h-3.5 text-[#F97316]' />
                <span>Tiến độ nhiệm vụ (Assignment)</span>
              </h3>
              <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF8F5] border border-[#E7E7E7] text-[#F97316]'>
                {currentStatus}
              </span>
            </div>

            {actionError && (
              <div className='p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] flex items-center gap-1.5'>
                <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
                <span>{actionError}</span>
              </div>
            )}

            <div className='grid grid-cols-2 gap-2 pt-1'>
              <button
                onClick={handleStartAssignment}
                disabled={actionLoading || currentStatus !== 'Assigned'}
                title={
                  currentStatus === 'Assigned'
                    ? 'Bắt đầu làm công việc này'
                    : `Công việc đã ở trạng thái ${currentStatus}`
                }
                className='py-2 px-3 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer'
              >
                {actionLoading ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Play className='w-3.5 h-3.5 text-[#F97316]' />
                )}
                <span>Bắt đầu làm</span>
              </button>

              <button
                onClick={handleSubmitAssignment}
                disabled={actionLoading || currentStatus !== 'InProgress'}
                title={
                  currentStatus === 'InProgress'
                    ? 'Nộp bài để chuyển sang xét duyệt Review'
                    : 'Phải bấm "Bắt đầu làm" trước khi nộp (Quy định hệ thống)'
                }
                className='py-2 px-3 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer'
              >
                {actionLoading ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Send className='w-3.5 h-3.5' />
                )}
                <span>Nộp bài</span>
              </button>
            </div>
            {currentStatus === 'Assigned' && (
              <p className='text-[10px] text-[#888888] font-mono text-center'>
                * Bắt buộc chuyển sang &quot;InProgress&quot; trước khi có thể nộp bài (tránh lỗi
                409 Conflict).
              </p>
            )}
          </div>

          {/* Actions */}
          <div className='space-y-3'>
            <button className='w-full py-2.5 bg-white border border-[#D4D4D4] rounded-lg text-sm font-semibold text-[#171717] shadow-2xs hover:bg-[#F3F3F3] transition-colors flex items-center justify-center gap-2'>
              <History className='w-4 h-4' />
              Version History
            </button>

            <button
              disabled={!canRequestAI}
              title={!canRequestAI ? 'Bạn cần quyền tương tác với AI' : 'Yêu cầu AI hỗ trợ'}
              onClick={() => {
                // TODO: Gọi AI Assistance Layer API
                console.log('AI Assistance Requested');
                alert('Requesting AI Assistance... (Placeholder)');
              }}
              className='w-full py-2.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg text-sm font-semibold text-[#8B5CF6] shadow-2xs hover:bg-[#EDE9FE] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Sparkles className='w-4 h-4' />
              Yêu cầu AI hỗ trợ
            </button>
          </div>

          {/* Comments */}
          <div>
            <h3 className='text-sm font-bold text-[#171717] mb-3 flex items-center gap-2'>
              <MessageSquare className='w-4 h-4' />
              Comments
            </h3>
            <div className='bg-white p-4 rounded-xl border border-[#E7E7E7] text-sm text-[#737373] text-center'>
              No comments yet. (Review & Annotation handled in separate view).
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
