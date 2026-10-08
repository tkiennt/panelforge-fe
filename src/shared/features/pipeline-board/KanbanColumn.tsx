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
      className={`flex flex-col w-[310px] shrink-0 bg-zinc-50/70 border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs border-t-4 ${column.accentBorderClass}`}
    >
      {/* Column Header */}
      <div className={`p-3.5 border-b border-zinc-200 ${column.headerBgClass}`}>
        <div className='flex items-center justify-between gap-2 mb-1'>
          <h3 className='font-sans font-bold text-xs uppercase tracking-wider text-zinc-900'>
            {column.label}
          </h3>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs ${column.badgeClass}`}
          >
            {cards.length}
          </span>
        </div>
        <p className='text-[11px] text-zinc-500 line-clamp-1' title={column.description}>
          {column.description}
        </p>
      </div>

      {/* Cards Scroll Container */}
      <div className='flex-1 p-3 overflow-y-auto max-h-[calc(100vh-280px)] space-y-3 custom-scrollbar'>
        {cards.length === 0 ? (
          <div className='py-8 px-4 text-center border border-dashed border-zinc-200 rounded-xl bg-white/50 text-zinc-400 text-xs'>
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
