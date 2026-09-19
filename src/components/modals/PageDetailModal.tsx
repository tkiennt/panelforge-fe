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
import { KanbanCard, KanbanStageKey } from '../../types';

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
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-xs font-bold'>
              {card.pageNumber}
            </span>
            <span className='text-xs font-mono text-[#888888]'>{card.pageType} • Cut Detail</span>
          </div>

          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Modal Content */}
        <div className='p-6 space-y-5'>
          {/* Top Banner Image or Wireframe */}
          {card.imageUrl ? (
            <div className='relative w-full h-56 bg-[#171717] rounded-xl overflow-hidden border border-[#E7E7E7]'>
              <img src={card.imageUrl} alt={card.title} className='w-full h-full object-cover' />
              <div className='absolute top-2 right-2 bg-black/80 text-white font-mono text-[10px] px-2 py-0.5 rounded'>
                600 DPI Tankōbon Pass
              </div>
            </div>
          ) : (
            <div className='w-full h-32 bg-[#F8F6F0] rounded-xl border border-[#E7E7E7] flex items-center justify-center text-center p-4'>
              <div>
                <div className='font-mono text-sm font-bold text-[#171717]'>
                  {card.pageNumber}: {card.title}
                </div>
                <div className='text-xs text-[#888888] mt-1 font-mono'>
                  Stage: {card.stage.toUpperCase()} • Assignee: {card.assignee}
                </div>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h3 className='text-lg font-bold font-display text-[#171717]'>{card.title}</h3>
            {card.subTitle && (
              <span className='inline-block mt-1 px-2 py-0.5 rounded bg-[#FFF7ED] text-[#C2410C] font-mono text-[10px] font-bold'>
                {card.subTitle}
              </span>
            )}
          </div>

          {/* Overdue Alert if active */}
          {card.isOverdue && (
            <div className='p-3 bg-[#FEF2F2] border border-[#EF4444]/40 rounded-xl flex items-center justify-between'>
              <div className='flex items-center gap-2 text-xs text-[#DC2626] font-bold'>
                <AlertTriangle className='w-4 h-4' />
                <span>Overdue: {card.dueText}</span>
              </div>
              <span className='text-[10px] font-mono font-bold bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded'>
                {card.overdueText}
              </span>
            </div>
          )}

          {/* Stage Progression Selector */}
          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-2'>
              Pipeline Stage Progression
            </label>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    card.stage === s.key
                      ? 'bg-[#171717] text-white shadow-xs'
                      : 'bg-[#F8F6F0] text-[#555555] hover:bg-[#EAE8E0] hover:text-[#171717]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7] text-xs font-mono'>
            <div className='flex items-center justify-between'>
              <span className='text-[#888888]'>Assignee:</span>
              <strong className='text-[#171717]'>
                {card.assignee} ({card.assigneeRole})
              </strong>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-[#888888]'>Due Date:</span>
              <strong className='text-[#171717]'>{card.dueText}</strong>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-[#888888]'>AI Assist Mode:</span>
              <span className='text-[#6D28D9] font-bold flex items-center gap-1'>
                <Sparkles className='w-3 h-3' />
                {card.aiAssistBadge || 'Standard Vector Check'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-[#888888]'>Cryptographic Hash:</span>
              <span className='text-[#059669] font-bold'>9f4a..e12 Verified</span>
            </div>
          </div>

          {/* Comments & Editorial Feedback */}
          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-2'>
              Editorial Notes &amp; Revisions
            </label>
            <div className='space-y-2 mb-3'>
              {comments.map((c, i) => (
                <div
                  key={i}
                  className='p-2.5 bg-[#F8F6F0] rounded-lg border border-[#E7E7E7] text-xs text-[#171717]'
                >
                  {c}
                </div>
              ))}
            </div>

            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder='Write revision instruction or note...'
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className='flex-1 px-3 py-1.5 bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] placeholder-[#888888] focus:outline-none focus:border-[#F97316]'
              />
              <button
                onClick={handleAddComment}
                className='px-3 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer'
              >
                <Send className='w-3 h-3' />
                <span>Post</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
          <button
            onClick={() => {
              onShowToast('Page Approved', `${card.pageNumber} marked as final print approved.`);
              handleStageChange('approved');
              onClose();
            }}
            className='px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5'
          >
            <CheckCircle className='w-3.5 h-3.5' />
            <span>Approve &amp; Sign-off</span>
          </button>
          <button
            onClick={onClose}
            className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
