import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Sparkles, Lock, CheckCircle, XCircle } from 'lucide-react';
import { PipelineCard, PIPELINE_MEMBERS } from '../../data/mockPipelineData';

interface KanbanCardProps {
  card: PipelineCard;
  currentUserRole: string;
  onClick: (card: PipelineCard) => void;
  isLocked: boolean;
  canDrag: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  currentUserRole,
  onClick,
  isLocked,
  canDrag,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: {
      type: 'Card',
      card,
    },
    disabled: !canDrag || isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const assignee = PIPELINE_MEMBERS[card.assigneeId];

  // Calculate deadline status
  const deadlineDate = new Date(card.deadline);
  const now = new Date();
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

  let deadlineColor = 'text-[#10B981] bg-[#D1FAE5] border-[#A7F3D0]'; // Green
  if (diffDays < 0) {
    deadlineColor = 'text-[#EF4444] bg-[#FEE2E2] border-[#FECACA]'; // Red (Overdue)
  } else if (diffDays <= 2) {
    deadlineColor = 'text-[#F59E0B] bg-[#FEF3C7] border-[#FDE68A]'; // Yellow (Soon)
  }

  // Quick actions for Editor
  const showEditorActions = currentUserRole === 'EDITOR' && card.stage === 'review';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white rounded-sm border-[1.5px] border-[#171717] p-3 shadow-none hover:shadow-none hover:border-black transition-all cursor-grab active:cursor-grabbing group ${isLocked ? 'opacity-70 bg-[#F9F9F9]' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Prevent click if we are clicking a button
        if ((e.target as HTMLElement).closest('button')) return;
        onClick(card);
      }}
    >
      {/* Dependency Lock */}
      {isLocked && (
        <div
          className='absolute -top-2 -right-2 w-6 h-6 bg-white border border-[#E7E7E7] rounded-full shadow-sm flex items-center justify-center text-[#737373]'
          title='Blocked by dependencies'
        >
          <Lock className='w-3.5 h-3.5' />
        </div>
      )}

      {/* Header: ID and AI Badge */}
      <div className='flex items-center justify-between mb-2'>
        <span className='text-[10px] font-mono font-medium text-[#737373] bg-[#F3F3F3] px-1.5 py-0.5 rounded'>
          {card.identifier}
        </span>
        {card.isAIAssisted && (
          <div
            className='flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#8B5CF6] bg-[#F5F3FF] border border-[#DDD6FE] px-1.5 py-0.5 rounded'
            title='AI-Assisted'
          >
            <Sparkles className='w-2.5 h-2.5' /> AI
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className='text-sm font-semibold text-[#171717] leading-snug mb-3'>{card.title}</h4>

      {/* Progress for Page */}
      {card.type === 'page' && (
        <div className='mb-3'>
          <div className='flex items-center justify-between text-[10px] text-[#737373] mb-1 font-mono'>
            <span>Progress</span>
            <span>{card.progress}%</span>
          </div>
          <div className='w-full h-1.5 bg-[#F3F3F3] rounded-full overflow-hidden'>
            <div
              className='h-full bg-[#171717] rounded-full transition-all duration-300'
              style={{ width: `${card.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Assignee and Deadline */}
      <div className='flex items-center justify-between pt-2 border-t border-[#F3F3F3]'>
        <div className='flex items-center gap-1.5'>
          <div
            className='w-5 h-5 rounded-full bg-[#171717] text-white flex items-center justify-center text-[9px] font-bold'
            title={assignee?.name}
          >
            {assignee?.avatarInitials}
          </div>
        </div>

        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${deadlineColor}`}
        >
          <Clock className='w-3 h-3' />
          {diffDays < 0 ? 'Overdue' : diffDays === 0 ? 'Today' : `${diffDays}d`}
        </div>
      </div>

      {/* Editor Quick Actions overlay */}
      {showEditorActions && (
        <div className='absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10'>
          <button
            className='w-8 h-8 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center hover:bg-[#10B981] hover:text-white transition-colors'
            title='Approve'
            onClick={() => alert('Approved card: ' + card.id)}
          >
            <CheckCircle className='w-4 h-4' />
          </button>
          <button
            className='w-8 h-8 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center hover:bg-[#EF4444] hover:text-white transition-colors'
            title='Reject (Needs Revision)'
            onClick={() => alert('Rejected card: ' + card.id)}
          >
            <XCircle className='w-4 h-4' />
          </button>
        </div>
      )}
    </div>
  );
};
