import React, { useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PipelineStage, PipelineCard } from '../../data/mockPipelineData';
import { TaskCard } from './TaskCard';
import { MoreHorizontal } from 'lucide-react';
import { usePermissions } from '../../lib/permissions';
import { WorkspaceRole } from '../../types';
import { SeriesMemberDto } from '../../services/series.service';

interface KanbanColumnProps {
  stage: PipelineStage;
  cards: PipelineCard[];
  currentUserRole?: WorkspaceRole | null;
  userRoles?: string[];
  onCardClick?: (card: PipelineCard) => void;
  checkIsLocked: (card: PipelineCard) => boolean;
  canDragCard: (card: PipelineCard) => boolean;
  seriesMembers?: SeriesMemberDto[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  cards,
  currentUserRole,
  userRoles = [],
  onCardClick,
  checkIsLocked,
  canDragCard,
  seriesMembers = [],
}) => {
  const effectiveRoles =
    userRoles.length > 0 ? userRoles : currentUserRole ? [currentUserRole] : [];
  const { hasPermission } = usePermissions(effectiveRoles);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  // Role-based visual emphasis
  let isDimmed = false;
  let isHighlighted = false;

  // We map permissions to stages for highlighting
  // e.g. edit_script -> script stage
  // edit_art -> thumbnail, pencil, ink, color
  // review_card -> review

  if (hasPermission('edit_script') && stage.id === 'script') {
    isHighlighted = true;
  } else if (
    hasPermission('edit_art') &&
    ['thumbnail', 'pencil', 'ink', 'color'].includes(stage.id)
  ) {
    isHighlighted = true;
  } else if (hasPermission('upload_layer') && stage.id === 'letter') {
    isHighlighted = true;
  } else if (hasPermission('review_card') && stage.id === 'review') {
    isHighlighted = true;
  } else if (hasPermission('create_card')) {
    // Admin/Producer see all equally
  } else {
    isDimmed = true;
  }

  const columnClasses = [
    'flex flex-col w-[300px] shrink-0 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 overflow-hidden transition-all duration-300',
    isDimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100',
    isHighlighted ? 'border-t-2 border-t-orange-500' : '', // Top accent for highlighted columns
    isOver ? 'ring-2 ring-orange-500/50 bg-orange-50/50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const parentRef = useRef<HTMLDivElement>(null);

  // TanStack Virtual chưa tương thích React Compiler; component này không cần memo hoá tự động.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // estimate height of each card + spacing
    overscan: 5,
  });

  return (
    <div ref={setNodeRef} className={columnClasses}>
      {/* Column Header */}
      <div className='p-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 z-10'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold text-zinc-800'>{stage.label}</h3>
          <span className='bg-zinc-200 text-zinc-700 text-xs font-medium px-2 py-0.5 rounded-full'>
            {cards.length}
          </span>
        </div>
        <button className='text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded hover:bg-zinc-200'>
          <MoreHorizontal className='w-4 h-4' />
        </button>
      </div>

      {/* Cards List */}
      <div
        ref={parentRef}
        className='flex-1 p-3 overflow-y-auto custom-scrollbar min-h-[150px] bg-[#F9F9F9]/50'
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const card = cards[virtualRow.index];
            return (
              <div
                key={card.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '12px', // gap spacing
                }}
              >
                <TaskCard
                  card={card}
                  userRoles={effectiveRoles}
                  onClick={onCardClick}
                  isLocked={checkIsLocked(card)}
                  canDrag={canDragCard(card)}
                  seriesMembers={seriesMembers}
                />
              </div>
            );
          })}
        </div>
        {cards.length === 0 && (
          <div className='h-20 border-2 border-dashed border-[#E7E7E7] rounded-xl flex items-center justify-center text-sm text-[#A3A3A3] mt-2'>
            Drop cards here
          </div>
        )}
      </div>
    </div>
  );
};
