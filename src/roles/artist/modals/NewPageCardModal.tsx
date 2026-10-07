import React, { useState } from 'react';
import { X, Plus, Layers } from 'lucide-react';
import { KanbanCard, KanbanStageKey } from '@/types';

interface NewPageCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (card: KanbanCard) => void;
  onShowToast: (title: string, desc: string) => void;
}

export const NewPageCardModal: React.FC<NewPageCardModalProps> = ({
  isOpen,
  onClose,
  onAddCard,
  onShowToast,
}) => {
  const [pageNumber, setPageNumber] = useState('');
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<KanbanStageKey>('thumbnail');
  const [assignee, setAssignee] = useState('Kenji S.');
  const [pageType, setPageType] = useState<'Action' | 'Dialogue' | 'Spread'>('Action');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageNumber.trim() || !title.trim()) return;

    const newCard: KanbanCard = {
      id: `card-${Date.now()}`,
      pageNumber: pageNumber.toUpperCase().startsWith('PAGE')
        ? pageNumber.toUpperCase()
        : `PAGE ${pageNumber}`,
      stage: stage,
      title: title.trim(),
      assignee: assignee,
      assigneeRole: 'Artist',
      assigneeInitials:
        assignee
          .split(' ')
          .map((n) => n[0])
          .join('') || 'KS',
      avatarBg: '#F97316',
      dueText: 'Nov 28',
      pageType: pageType,
      tags: [pageType, 'CHAPTER 5', '600 DPI'],
      aiAssistBadge: 'LoRA Infill',
    };

    onAddCard(newCard);
    onShowToast(
      'Page Card Created',
      `${newCard.pageNumber} added to ${stage.toUpperCase()} pipeline.`,
    );
    onClose();
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Layers className='w-4 h-4 text-[#F97316]' />
            <h3 className='font-display font-bold text-base text-[#171717]'>
              Create New Page Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                Page # (e.g. 25)
              </label>
              <input
                type='text'
                required
                placeholder='25'
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
              />
            </div>

            <div>
              <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                Page Type
              </label>
              <select
                value={pageType}
                onChange={(e) => setPageType(e.target.value as any)}
                className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
              >
                <option value='Action'>Action Sequence</option>
                <option value='Dialogue'>Dialogue Heavy</option>
                <option value='Spread'>Spread / Splash</option>
              </select>
            </div>
          </div>

          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
              Cut / Scene Title
            </label>
            <input
              type='text'
              required
              placeholder='e.g. Zor breaks through rooftop skylight'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                Initial Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as KanbanStageKey)}
                className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
              >
                <option value='script'>1. Script</option>
                <option value='thumbnail'>2. Thumbnail</option>
                <option value='pencil'>3. Pencil</option>
                <option value='ink'>4. Ink</option>
                <option value='color'>5. Color</option>
                <option value='letter'>6. Letter</option>
                <option value='review'>7. Review</option>
                <option value='approved'>8. Approved</option>
              </select>
            </div>

            <div>
              <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                Assignee
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
              >
                <option value='Kenji S.'>Kenji S. (Artist)</option>
                <option value='Arata M.'>Arata M. (Writer)</option>
                <option value='Mei L.'>Mei L. (Artist)</option>
                <option value='Yuto T.'>Yuto T. (Artist)</option>
                <option value='Tatsuki F.'>Tatsuki F. (Producer)</option>
              </select>
            </div>
          </div>

          <div className='pt-2 flex items-center justify-between'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer'
            >
              Create Page Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
