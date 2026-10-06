import React from 'react';
import { X, Image as ImageIcon, History, MessageSquare, Sparkles, Clock } from 'lucide-react';
import { PipelineCard, PIPELINE_MEMBERS } from '@/data/mockPipelineData';

import { usePermissions } from '@/lib/permissions';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card: PipelineCard | null;
  userRoles: string[];
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, onClose, card, userRoles }) => {
  const { hasPermission } = usePermissions(userRoles || []);

  if (!isOpen || !card) return null;

  const assignee = PIPELINE_MEMBERS[card.assigneeId];

  // AI button permission
  const canRequestAI = hasPermission('request_ai');

  return (
    <>
      {/* Overlay */}
      <div
        className='fixed inset-0 bg-[#171717]/20 backdrop-blur-[2px] z-[100]'
        onClick={onClose}
      />

      {/* Drawer */}
      <div className='fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-[#FAF8F4] shadow-2xl border-l border-[#E7E7E7] z-[110] flex flex-col animate-in slide-in-from-right duration-300'>
        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-[#E7E7E7] bg-white'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <span className='text-xs font-mono text-[#737373] bg-[#F3F3F3] px-1.5 py-0.5 rounded-md'>
                {card.identifier}
              </span>
              {card.isAIAssisted && (
                <span className='text-[10px] uppercase font-bold tracking-wider text-[#8B5CF6] bg-[#F5F3FF] px-1.5 py-0.5 rounded border border-[#DDD6FE]'>
                  AI Assisted
                </span>
              )}
            </div>
            <h2 className='text-lg font-heading font-semibold text-[#171717]'>{card.title}</h2>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F3F3] text-[#737373] transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className='flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6'>
          {/* Thumbnail / Image Preview */}
          <div className='w-full aspect-video bg-[#E7E7E7] rounded-lg border border-[#D4D4D4] flex items-center justify-center overflow-hidden'>
            {card.thumbnailUrl ? (
              <img
                src={card.thumbnailUrl}
                alt={card.title}
                className='w-full h-full object-cover'
              />
            ) : (
              <div className='flex flex-col items-center text-[#A3A3A3]'>
                <ImageIcon className='w-8 h-8 mb-2 stroke-[1.5]' />
                <span className='text-sm font-medium'>No preview available</span>
              </div>
            )}
          </div>

          {/* Brief & Assignee */}
          <div className='bg-white p-4 rounded-xl border border-[#E7E7E7] shadow-2xs space-y-4'>
            <div>
              <h3 className='text-xs font-bold text-[#737373] uppercase tracking-wider mb-2'>
                Assignee
              </h3>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center text-white text-xs font-semibold shadow-md'>
                  {assignee?.avatarInitials}
                </div>
                <div>
                  <div className='text-sm font-semibold text-[#171717]'>{assignee?.name}</div>
                  <div className='text-[11px] text-[#737373]'>{assignee?.role}</div>
                </div>
              </div>
            </div>

            <div className='pt-3 border-t border-[#F3F3F3]'>
              <h3 className='text-xs font-bold text-[#737373] uppercase tracking-wider mb-2'>
                Stage
              </h3>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium capitalize text-[#171717]'>{card.stage}</span>
                <span className='flex items-center gap-1.5 text-xs text-[#525252] font-mono'>
                  <Clock className='w-3.5 h-3.5' />
                  {new Date(card.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className='pt-3 border-t border-[#F3F3F3]'>
              <h3 className='text-xs font-bold text-[#737373] uppercase tracking-wider mb-2'>
                Brief / Description
              </h3>
              <p className='text-sm text-[#525252] leading-relaxed'>
                This is a placeholder description for {card.identifier}. In the real system, this
                would contain the script excerpt or director's notes.
              </p>
            </div>
          </div>

          {/* Elements List (if panel) */}
          {card.type === 'panel' && (
            <div>
              <h3 className='text-sm font-bold text-[#171717] mb-3'>Panel Elements</h3>
              <div className='bg-white border border-[#E7E7E7] rounded-lg overflow-hidden'>
                <div className='p-3 border-b border-[#F3F3F3] flex items-center justify-between text-sm hover:bg-[#FAF8F4]'>
                  <span className='text-[#525252]'>Character Ink</span>
                  <span className='text-xs font-mono text-[#10B981]'>Done</span>
                </div>
                <div className='p-3 border-b border-[#F3F3F3] flex items-center justify-between text-sm hover:bg-[#FAF8F4]'>
                  <span className='text-[#525252]'>Background</span>
                  <span className='text-xs font-mono text-[#F59E0B]'>WIP</span>
                </div>
                <div className='p-3 flex items-center justify-between text-sm hover:bg-[#FAF8F4]'>
                  <span className='text-[#525252]'>SFX Lettering</span>
                  <span className='text-xs font-mono text-[#737373]'>Pending</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className='space-y-3'>
            <button className='w-full py-2.5 bg-white border border-[#D4D4D4] rounded-lg text-sm font-semibold text-[#171717] shadow-2xs hover:bg-[#F3F3F3] transition-colors flex items-center justify-center gap-2'>
              <History className='w-4 h-4' />
              Version History
            </button>

            <button
              disabled={!canRequestAI}
              title={!canRequestAI ? 'Bạn cần quyền tương tác với AI' : 'Yêu cầu AI hỗ trợ'}
              onClick={() => {
                // TODO: Gọi AI Assistance Layer API
                console.log('AI Assistance Requested');
                alert('Requesting AI Assistance... (Placeholder)');
              }}
              className='w-full py-2.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg text-sm font-semibold text-[#8B5CF6] shadow-2xs hover:bg-[#EDE9FE] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Sparkles className='w-4 h-4' />
              Yêu cầu AI hỗ trợ
            </button>
          </div>

          {/* Comments */}
          <div>
            <h3 className='text-sm font-bold text-[#171717] mb-3 flex items-center gap-2'>
              <MessageSquare className='w-4 h-4' />
              Comments
            </h3>
            <div className='bg-white p-4 rounded-xl border border-[#E7E7E7] text-sm text-[#737373] text-center'>
              No comments yet. (Review & Annotation handled in separate view).
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
