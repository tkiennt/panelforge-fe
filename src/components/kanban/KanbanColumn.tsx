import React, { useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PipelineStage, PipelineCard, RoleKey } from '../../data/mockPipelineData';
import { KanbanCard } from './KanbanCard';
import { MoreHorizontal } from 'lucide-react';

interface KanbanColumnProps {
  stage: PipelineStage;
  cards: PipelineCard[];
  currentUserRole: RoleKey;
  onCardClick: (card: PipelineCard) => void;
  checkIsLocked: (card: PipelineCard) => boolean;
  canDragCard: (card: PipelineCard) => boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  cards,
  currentUserRole,
  onCardClick,
  checkIsLocked,
  canDragCard,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  // Role-based visual emphasis
  let isDimmed = false;
  let isHighlighted = false;

  switch (currentUserRole) {
    case 'WRITER':
      isDimmed = stage.id !== 'script';
      isHighlighted = stage.id === 'script';
      break;
    case 'ARTIST': {
      const artistStages = ['thumbnail', 'pencil', 'ink', 'color'];
      isDimmed = !artistStages.includes(stage.id);
      isHighlighted = artistStages.includes(stage.id);
      break;
    }
    case 'LETTERER':
      isDimmed = stage.id !== 'letter';
      isHighlighted = stage.id === 'letter';
      break;
    case 'EDITOR':
      isHighlighted = stage.id === 'review';
      break;
    // PRODUCER and ADMINISTRATOR see everything equally
  }

  const columnClasses = [
    'flex flex-col w-[300px] shrink-0 bg-white border-[1.5px] border-[#171717] rounded-sm overflow-hidden shadow-none transition-opacity duration-300',
    isDimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100',
    isHighlighted ? 'border-t-4 border-t-[#F97316]' : '', // Top accent for highlighted columns
    isOver ? 'ring-2 ring-[#F97316]/50 bg-[#FFF7ED]/30' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // estimate height of each card + spacing
    overscan: 5,
  });

  return (
    <div ref={setNodeRef} className={columnClasses}>
      {/* Column Header */}
      <div className='p-3 border-b border-[#E7E7E7] bg-[#FAF8F4] flex items-center justify-between sticky top-0 z-10'>
        <div className='flex items-center gap-2'>
          <h3 className='font-serif font-semibold text-[#171717]'>{stage.label}</h3>
          <span className='bg-[#E7E7E7] text-[#525252] text-xs font-mono px-2 py-0.5 rounded-full'>
            {cards.length}
          </span>
        </div>
        <button className='text-[#A3A3A3] hover:text-[#171717] transition-colors p-1 rounded hover:bg-[#E7E7E7]'>
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
                <KanbanCard
                  card={card}
                  currentUserRole={currentUserRole}
                  onClick={onCardClick}
                  isLocked={checkIsLocked(card)}
                  canDrag={canDragCard(card)}
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
