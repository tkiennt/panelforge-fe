import React from 'react';
import { Clock, Lock, ArrowUpRight, AlertCircle } from 'lucide-react';
import { BoardCard } from './pipelineBoard.types';

interface TaskCardProps {
  card: BoardCard;
  onClick: (card: BoardCard) => void;
  onOpenMyWork?: (card: BoardCard) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ card, onClick, onOpenMyWork }) => {
  // Tính toán hạn chót
  const deadlineDate = card.dueDate ? new Date(card.dueDate) : null;
  const now = new Date();
  const diffDays = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    : null;

  const isOverdue = diffDays !== null && diffDays < 0 && card.status !== 'Approved';
  const isDueSoon =
    diffDays !== null && diffDays >= 0 && diffDays <= 2 && card.status !== 'Approved';

  let deadlineBadgeClass = 'text-stone-600 bg-stone-100 border-stone-200';
  if (isOverdue) {
    deadlineBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
  } else if (isDueSoon) {
    deadlineBadgeClass = 'bg-amber-50 text-amber-900 border-amber-300 font-semibold';
  }

  // Priority color
  const priorityStr = String(card.priority);
  const isHighPriority =
    priorityStr === 'High' ||
    priorityStr === 'Urgent' ||
    priorityStr === '2' ||
    priorityStr === '3';

  return (
    <div
      onClick={() => onClick(card)}
      className={`group relative rounded-xl border p-4 shadow-2xs transition-all cursor-pointer flex flex-col gap-2.5 ${
        card.isStageEnabled === false
          ? 'bg-stone-50/80 border-dashed border-stone-300 opacity-65'
          : 'bg-[#FCFBF8] border-landing-border hover:shadow-md hover:border-stone-400'
      }`}
    >
      {/* Top Header: Stage badge & Target Label */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <span
            className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight text-landing-ink border border-landing-border'
            style={{
              backgroundColor: card.stageColor || '#F3F0E9',
            }}
          >
            {card.stageName}
          </span>
          {card.isStageEnabled === false && (
            <span className='text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 border border-stone-300 uppercase'>
              Đã tắt
            </span>
          )}
          <span className='text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F3F0E9] text-landing-ink border border-landing-border'>
            {card.targetLabel}
          </span>
        </div>

        {/* Priority & Dependency indicators */}
        <div className='flex items-center gap-1 shrink-0'>
          {card.dependsOnAssignmentId && (
            <span
              title='Công việc này có phụ thuộc vào nhiệm vụ khác'
              className='p-1 text-stone-500 bg-stone-100 rounded-md border border-stone-200'
            >
              <Lock className='w-3 h-3' />
            </span>
          )}
          {isHighPriority && (
            <span className='px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-50 text-rose-800 border border-rose-200'>
              {priorityStr === 'Urgent' || priorityStr === '3' ? 'Khẩn cấp' : 'Ưu tiên'}
            </span>
          )}
        </div>
      </div>

      {/* Brief / Task Title */}
      <h4 className='text-xs font-semibold text-landing-ink line-clamp-2 leading-relaxed group-hover:text-[#C2410C] transition-colors'>
        {card.brief}
      </h4>

      {/* Feedback comment preview if rework required */}
      {card.lastFeedbackComment && card.status === 'ReworkRequired' && (
        <div className='text-[11px] p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 line-clamp-2 italic flex items-start gap-1.5'>
          <AlertCircle className='w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5' />
          <span>{card.lastFeedbackComment}</span>
        </div>
      )}

      {/* Footer: Assignee & Deadline */}
      <div className='pt-2 mt-auto border-t border-landing-border flex items-center justify-between gap-2 text-xs'>
        {/* Assignee */}
        <div className='flex items-center gap-2 min-w-0'>
          <div
            className='w-6 h-6 rounded-full bg-[#F3F0E9] text-landing-ink border border-landing-border flex items-center justify-center text-[10px] font-bold shrink-0'
            title={`${card.assigneeName} (${card.assignedRole})`}
          >
            {card.assigneeAvatarInitials}
          </div>
          <span className='text-[11px] font-medium text-landing-ink truncate max-w-[100px]'>
            {card.assigneeName}
          </span>
        </div>

        {/* Deadline */}
        {card.dueDate && (
          <div
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${deadlineBadgeClass}`}
            title={`Hạn nộp: ${new Date(card.dueDate).toLocaleString('vi-VN')}`}
          >
            <Clock className='w-3 h-3' />
            <span>
              {diffDays !== null
                ? diffDays < 0
                  ? `Quá hạn ${Math.abs(diffDays)}d`
                  : diffDays === 0
                    ? 'Hôm nay'
                    : `${diffDays} ngày`
                : ''}
            </span>
          </div>
        )}
      </div>

      {/* Hover action bar */}
      {onOpenMyWork && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onOpenMyWork(card);
          }}
          className='hidden group-hover:flex items-center justify-center gap-1 w-full mt-1 py-1.5 text-[11px] font-semibold text-[#C2410C] bg-[#FFF2E6] hover:bg-[#FFE5CC] border border-[#C2410C]/30 rounded-lg transition-colors cursor-pointer'
        >
          <span>Xem trong Bàn làm việc & Xét duyệt</span>
          <ArrowUpRight className='w-3 h-3 text-[#C2410C]' />
        </button>
      )}
    </div>
  );
};
