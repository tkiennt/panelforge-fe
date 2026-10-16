import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { KanbanCard, KanbanStageKey } from '@/types';

interface PageDetailModalProps {
  card: KanbanCard | null;
  onClose: () => void;
  onUpdateStage: (cardId: string, newStage: KanbanStageKey) => void;
  onShowToast: (title: string, desc: string) => void;
}

const STAGES: { key: KanbanStageKey; label: string }[] = [
  { key: 'script', label: '1. Script' },
  { key: 'thumbnail', label: '2. Thumbnail' },
  { key: 'pencil', label: '3. Pencil' },
  { key: 'ink', label: '4. Ink' },
  { key: 'color', label: '5. Color' },
  { key: 'letter', label: '6. Letter' },
  { key: 'review', label: '7. Review' },
  { key: 'approved', label: '8. Approved' },
];

export const PageDetailModal: React.FC<PageDetailModalProps> = ({
  card,
  onClose,
  onUpdateStage,
  onShowToast,
}) => {
  const [noteText, setNoteText] = useState('');
  const [comments, setComments] = useState<string[]>(() => [
    card?.editorialNote
      ? `Editor note: ${card.editorialNote}`
      : 'Initial cut storyboard registered.',
  ]);

  if (!card) return null;

  const handleAddComment = () => {
    if (!noteText.trim()) return;
    setComments([...comments, noteText.trim()]);
    setNoteText('');
    onShowToast('Comment Added', 'Your editorial feedback has been attached to the page log.');
  };

  const handleStageChange = (newStage: KanbanStageKey) => {
    onUpdateStage(card.id, newStage);
    onShowToast('Stage Updated', `${card.pageNumber} moved to ${newStage.toUpperCase()}.`);
  };

  return (
    <div className='fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4.5 bg-stone-50/50 border-b border-stone-100 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <span className='px-2.5 py-1 rounded-lg bg-stone-900 text-white font-mono text-xs font-bold shadow-2xs'>
              {card.pageNumber}
            </span>
            <span className='text-xs font-mono text-stone-500 font-medium'>{card.pageType} • Chi Tiết Phân Cảnh</span>
          </div>

          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Modal Content */}
        <div className='p-6 space-y-5'>
          {/* Top Banner Image or Wireframe */}
          {card.imageUrl ? (
            <div className='relative w-full h-56 bg-stone-900 rounded-xl overflow-hidden border border-stone-200'>
              <img src={card.imageUrl} alt={card.title} className='w-full h-full object-cover' />
              <div className='absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-white font-mono text-xs px-2.5 py-1 rounded-md shadow-2xs'>
                600 DPI Tankōbon Pass
              </div>
            </div>
          ) : (
            <div className='w-full h-32 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-center text-center p-4'>
              <div>
                <div className='font-mono text-sm font-bold text-stone-900'>
                  {card.pageNumber}: {card.title}
                </div>
                <div className='text-xs text-stone-500 mt-1 font-mono'>
                  Công đoạn: {card.stage.toUpperCase()} • Phụ trách: {card.assignee}
                </div>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h3 className='text-lg font-bold font-display text-stone-900'>{card.title}</h3>
            {card.subTitle && (
              <span className='inline-block mt-1.5 px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 font-mono text-xs font-semibold border border-orange-200'>
                {card.subTitle}
              </span>
            )}
          </div>

          {/* Overdue Alert if active */}
          {card.isOverdue && (
            <div className='p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between'>
              <div className='flex items-center gap-2 text-xs text-rose-800 font-bold'>
                <AlertTriangle className='w-4 h-4 text-rose-600' />
                <span>Trễ Hạn: {card.dueText}</span>
              </div>
              <span className='text-xs font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md'>
                {card.overdueText}
              </span>
            </div>
          )}

          {/* Stage Progression Selector */}
          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-2'>
              Chuyển Tiến Độ Công Đoạn (Pipeline Stage)
            </label>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                    card.stage === s.key
                      ? 'bg-[#EA580C] text-white shadow-soft-sm'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-stone-50/70 rounded-xl border border-stone-200/80 text-xs font-mono'>
            <div className='flex items-center justify-between'>
              <span className='text-stone-500'>Người Phụ Trách:</span>
              <strong className='text-stone-900'>
                {card.assignee} ({card.assigneeRole})
              </strong>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-stone-500'>Hạn Hoàn Tất:</span>
              <strong className='text-stone-900'>{card.dueText}</strong>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-stone-500'>Chế Độ Hỗ Trợ AI:</span>
              <span className='text-violet-700 font-bold flex items-center gap-1'>
                <Sparkles className='w-3 h-3' />
                {card.aiAssistBadge || 'Standard Vector Check'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-stone-500'>Mã Hash SHA-256:</span>
              <span className='text-emerald-700 font-bold'>9f4a..e12 Đã Khóa</span>
            </div>
          </div>

          {/* Comments & Editorial Feedback */}
          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-2'>
              Ghi Chú Biên Tập &amp; Yêu Cầu Chỉnh Sửa
            </label>
            <div className='space-y-2 mb-3'>
              {comments.map((c, i) => (
                <div
                  key={i}
                  className='p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800'
                >
                  {c}
                </div>
              ))}
            </div>

            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder='Nhập hướng dẫn biên tập hoặc phản hồi chỉnh sửa...'
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className='flex-1 px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500'
              />
              <button
                onClick={handleAddComment}
                className='px-3.5 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm active:scale-95'
              >
                <Send className='w-3.5 h-3.5' />
                <span>Gửi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className='p-4 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between'>
          <button
            onClick={() => {
              onShowToast('Duyệt Trang Thành Công', `${card.pageNumber} đã được ký duyệt bản in Tankōbon.`);
              handleStageChange('approved');
              onClose();
            }}
            className='px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-soft-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95'
          >
            <CheckCircle className='w-3.5 h-3.5' />
            <span>Ký Duyệt &amp; Hoàn Tất Trang</span>
          </button>
          <button
            onClick={onClose}
            className='px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
