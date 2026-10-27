import React from 'react';
import { BoardCard, BoardColumnDefinition } from './pipelineBoard.types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: BoardColumnDefinition;
  cards: BoardCard[];
  onCardClick: (card: BoardCard) => void;
  onOpenMyWork?: (card: BoardCard) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  cards,
  onCardClick,
  onOpenMyWork,
}) => {
  return (
    <div
      className={`flex flex-col w-[310px] shrink-0 bg-[#F3F0E9]/70 border border-landing-border rounded-xl overflow-hidden shadow-2xs border-t-4 ${column.accentBorderClass}`}
    >
      {/* Column Header */}
      <div className={`p-3.5 border-b border-landing-border ${column.headerBgClass}`}>
        <div className='flex items-center justify-between gap-2 mb-1'>
          <h3 className='font-sans font-bold text-xs uppercase tracking-wider text-landing-ink'>
            {column.label}
          </h3>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs ${column.badgeClass}`}
          >
            {cards.length}
          </span>
        </div>
        <p className='text-[11px] text-landing-ink-muted line-clamp-1' title={column.description}>
          {column.description}
        </p>
      </div>

      {/* Cards Scroll Container */}
      <div className='flex-1 p-3 overflow-y-auto max-h-[calc(100vh-280px)] space-y-3 custom-scrollbar'>
        {cards.length === 0 ? (
          <div className='py-8 px-4 text-center border border-dashed border-landing-border rounded-xl bg-[#FCFBF8]/60 text-landing-ink-muted text-xs'>
            Chưa có nhiệm vụ
          </div>
        ) : (
          cards.map((card) => (
            <TaskCard key={card.id} card={card} onClick={onCardClick} onOpenMyWork={onOpenMyWork} />
          ))
        )}
      </div>
    </div>
  );
};
