import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  Kanban,
  BookOpen,
  Users,
  FolderOpen,
  Sparkles,
  ArrowRight,
  X,
  FileCode,
} from 'lucide-react';
import { ViewMode, KanbanCard, BibleEntity } from '@/types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: ViewMode) => void;
  onSelectCard: (card: KanbanCard) => void;
  onSelectEntity: (entity: BibleEntity) => void;
  cards: KanbanCard[];
  entities: BibleEntity[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateView,
  onSelectCard,
  onSelectEntity,
  cards,
  entities,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Handled by parent
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCards = cards
    .filter(
      (c) =>
        c.pageNumber.toLowerCase().includes(query.toLowerCase()) ||
        c.title.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 4);

  const filteredEntities = entities
    .filter(
      (e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.subtitle.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 3);

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Search Input Bar */}
        <div className='p-3.5 border-b border-[#E7E7E7] flex items-center gap-3'>
          <Search className='w-5 h-5 text-[#888888]' />
          <input
            type='text'
            placeholder='Type a command, page number, cut, or character...'
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            className='w-full text-sm text-[#171717] placeholder-[#888888] focus:outline-none'
          />
          <span className='text-xs font-mono text-[#888888] bg-[#F3F1EB] px-1.5 py-0.5 rounded border border-[#E7E7E7]'>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className='p-2.5 max-h-96 overflow-y-auto space-y-3 custom-scrollbar text-xs'>
          {/* Quick Navigation Views */}
          <div>
            <div className='px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
              Switch View
            </div>
            <div className='space-y-0.5 mt-1'>
              <button
                onClick={() => {
                  onNavigateView('dashboard');
                  onClose();
                }}
                className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#FAF8F4] flex items-center justify-between text-[#171717] transition-colors cursor-pointer'
              >
                <span className='flex items-center gap-2 font-medium'>
                  <LayoutGrid className='w-4 h-4 text-[#F97316]' />
                  Dashboard (Chapter 5 Pipeline)
                </span>
                <span className='text-xs font-mono text-[#888888]'>Jump</span>
              </button>

              <button
                onClick={() => {
                  onNavigateView('workflow');
                  onClose();
                }}
                className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#FAF8F4] flex items-center justify-between text-[#171717] transition-colors cursor-pointer'
              >
                <span className='flex items-center gap-2 font-medium'>
                  <Kanban className='w-4 h-4 text-[#0EA5E9]' />
                  Workflow Board (8 Stages)
                </span>
                <span className='text-xs font-mono text-[#888888]'>Jump</span>
              </button>

              <button
                onClick={() => {
                  onNavigateView('bible');
                  onClose();
                }}
                className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#FAF8F4] flex items-center justify-between text-[#171717] transition-colors cursor-pointer'
              >
                <span className='flex items-center gap-2 font-medium'>
                  <BookOpen className='w-4 h-4 text-[#8B5CF6]' />
                  Series Bible Repository
                </span>
                <span className='text-xs font-mono text-[#888888]'>Jump</span>
              </button>
            </div>
          </div>

          {/* Matching Pages */}
          {filteredCards.length > 0 && (
            <div>
              <div className='px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
                Manga Storyboard Pages
              </div>
              <div className='space-y-0.5 mt-1'>
                {filteredCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      onSelectCard(card);
                      onClose();
                    }}
                    className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#FAF8F4] flex items-center justify-between text-[#171717] transition-colors cursor-pointer'
                  >
                    <div className='flex items-center gap-2 truncate'>
                      <span className='px-1.5 py-0.5 bg-[#F3F1EB] rounded text-xs font-mono font-bold'>
                        {card.pageNumber}
                      </span>
                      <span className='truncate'>{card.title}</span>
                    </div>
                    <span className='text-xs font-mono uppercase text-[#888888] shrink-0 ml-2'>
                      {card.stage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Lore Entities */}
          {filteredEntities.length > 0 && (
            <div>
              <div className='px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
                Series Bible Lore &amp; Cast
              </div>
              <div className='space-y-0.5 mt-1'>
                {filteredEntities.map((ent) => (
                  <button
                    key={ent.id}
                    onClick={() => {
                      onSelectEntity(ent);
                      onClose();
                    }}
                    className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#FAF8F4] flex items-center justify-between text-[#171717] transition-colors cursor-pointer'
                  >
                    <div className='flex items-center gap-2 truncate'>
                      <span className='w-2 h-2 rounded-full bg-[#10B981]'></span>
                      <span className='font-semibold'>{ent.name}</span>
                      <span className='text-[#888888] text-xs truncate'>({ent.subtitle})</span>
                    </div>
                    <span className='text-xs font-mono text-[#6D28D9]'>LoRA {ent.loraWeight}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className='p-3 bg-[#FAF8F4] border-t border-[#E7E7E7] text-xs text-[#888888] font-mono flex items-center justify-between'>
          <span>
            Navigate with <strong>↑↓</strong> and <strong>Enter</strong>
          </span>
          <span className='text-[#F97316]'>PanelForge AI v4.2</span>
        </div>
      </div>
    </div>
  );
};
