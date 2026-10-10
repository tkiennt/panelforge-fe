import React from 'react';
import { Clock, Lock, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';
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

  let deadlineBadgeClass = 'text-zinc-600 bg-zinc-100 border-zinc-200';
  if (isOverdue) {
    deadlineBadgeClass = 'text-rose-700 bg-rose-50 border-rose-200 font-semibold';
  } else if (isDueSoon) {
    deadlineBadgeClass = 'text-amber-800 bg-amber-50 border-amber-200 font-semibold';
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
      className='group relative bg-white rounded-xl border border-zinc-200 p-4 shadow-xs hover:shadow-md hover:border-zinc-400 transition-all cursor-pointer flex flex-col gap-2.5'
    >
      {/* Top Header: Stage badge & Target Label */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <span
            className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight text-zinc-900 border border-zinc-200'
            style={{
              backgroundColor: card.stageColor || '#F3F4F6',
            }}
          >
            {card.stageName}
          </span>
          <span className='text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200'>
            {card.targetLabel}
          </span>
        </div>

        {/* Priority & Dependency indicators */}
        <div className='flex items-center gap-1 shrink-0'>
          {card.dependsOnAssignmentId && (
            <span
              title='Công việc này có phụ thuộc vào nhiệm vụ khác'
              className='p-1 text-zinc-500 bg-zinc-100 rounded-md border border-zinc-200'
            >
              <Lock className='w-3 h-3' />
            </span>
          )}
          {isHighPriority && (
            <span className='px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-100 text-rose-700 border border-rose-200'>
              {priorityStr === 'Urgent' || priorityStr === '3' ? 'Khẩn' : 'Cao'}
            </span>
          )}
        </div>
      </div>

      {/* Brief / Task Title */}
      <h4 className='text-xs font-semibold text-zinc-900 line-clamp-2 leading-relaxed group-hover:text-blue-600 transition-colors'>
        {card.brief}
      </h4>

      {/* Feedback comment preview if rework required */}
      {card.lastFeedbackComment && card.status === 'ReworkRequired' && (
        <div className='text-[11px] p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 line-clamp-2 italic flex items-start gap-1.5'>
          <AlertCircle className='w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5' />
          <span>{card.lastFeedbackComment}</span>
        </div>
      )}

      {/* Footer: Assignee & Deadline */}
      <div className='pt-2 mt-auto border-t border-zinc-100 flex items-center justify-between gap-2 text-xs'>
        {/* Assignee */}
        <div className='flex items-center gap-2 min-w-0'>
          <div
            className='w-6 h-6 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center text-[10px] font-bold shrink-0'
            title={`${card.assigneeName} (${card.assignedRole})`}
          >
            {card.assigneeAvatarInitials}
          </div>
          <span className='text-[11px] font-medium text-zinc-700 truncate max-w-[100px]'>
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
          className='hidden group-hover:flex items-center justify-center gap-1 w-full mt-1 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors'
        >
          <span>Xem trong Bàn làm việc & Xét duyệt</span>
          <ArrowUpRight className='w-3 h-3' />
        </button>
      )}
    </div>
  );
};
