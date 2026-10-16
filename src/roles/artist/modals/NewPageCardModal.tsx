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
    <div className='fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-stone-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4.5 bg-stone-50/50 border-b border-stone-100 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-100'>
              <Layers className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-display font-bold text-sm text-stone-900'>
                Tạo Thẻ Tiến Độ Trang (Page Card)
              </h3>
              <p className='text-xs text-stone-500'>Thêm thẻ trang vào quy trình phân cảnh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4 text-xs'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-stone-700 mb-1.5'>
                Số Trang (Page #)
              </label>
              <input
                type='text'
                required
                placeholder='Ví dụ: 25'
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                className='w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:border-orange-500 font-mono'
              />
            </div>

            <div>
              <label className='block font-semibold text-stone-700 mb-1.5'>
                Loại Trang (Page Type)
              </label>
              <select
                value={pageType}
                onChange={(e) => setPageType(e.target.value as any)}
                className='w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:border-orange-500 font-semibold cursor-pointer'
              >
                <option value='Action'>Action Sequence (Hành động)</option>
                <option value='Dialogue'>Dialogue Heavy (Hội thoại)</option>
                <option value='Spread'>Spread / Splash (Trang đôi / Tràn)</option>
              </select>
            </div>
          </div>

          <div>
            <label className='block font-semibold text-stone-700 mb-1.5'>
              Tiêu Đề Cảnh (Scene Title)
            </label>
            <input
              type='text'
              required
              placeholder='Ví dụ: Zor đột nhập qua cửa sổ trần tầng áp mái'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:border-orange-500'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block font-semibold text-stone-700 mb-1.5'>
                Công Đoạn Ban Đầu
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as KanbanStageKey)}
                className='w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:border-orange-500 font-semibold cursor-pointer'
              >
                <option value='script'>1. Kịch bản (Script)</option>
                <option value='thumbnail'>2. Thumbnail (Phác thảo)</option>
                <option value='pencil'>3. Nét chì (Pencil)</option>
                <option value='ink'>4. Đi mực (Ink)</option>
                <option value='color'>5. Đổ màu (Color)</option>
                <option value='letter'>6. Thoại &amp; SFX (Letter)</option>
                <option value='review'>7. Duyệt (Review)</option>
                <option value='approved'>8. Hoàn tất (Approved)</option>
              </select>
            </div>

            <div>
              <label className='block font-semibold text-stone-700 mb-1.5'>
                Người Phụ Trách
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className='w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:border-orange-500 font-semibold cursor-pointer'
              >
                <option value='Kenji S.'>Kenji S. (Artist)</option>
                <option value='Arata M.'>Arata M. (Writer)</option>
                <option value='Mei L.'>Mei L. (Artist)</option>
                <option value='Yuto T.'>Yuto T. (Artist)</option>
                <option value='Tatsuki F.'>Tatsuki F. (Producer)</option>
              </select>
            </div>
          </div>

          <div className='pt-2 flex items-center justify-between border-t border-stone-100'>
            <button
              type='button'
              onClick={onClose}
              className='px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer'
            >
              Hủy
            </button>
            <button
              type='submit'
              className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-xl shadow-soft-sm transition-all cursor-pointer active:scale-95'
            >
              Tạo Thẻ Trang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
