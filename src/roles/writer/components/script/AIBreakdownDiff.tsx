import React from 'react';
import { X, Sparkles, CheckCircle2, Edit2, XCircle } from 'lucide-react';
import { ScriptBlock } from '@/mocks/mockScriptData';

interface AIBreakdownDiffProps {
  isOpen: boolean;
  onClose: () => void;
  originalBlocks: ScriptBlock[];
  onAcceptAll: () => void;
}

export const AIBreakdownDiff: React.FC<AIBreakdownDiffProps> = ({
  isOpen,
  onClose,
  originalBlocks,
  onAcceptAll,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className='absolute inset-0 bg-[#171717]/40 backdrop-blur-sm z-[100]'
        onClick={onClose}
      />
      <div className='absolute inset-4 md:inset-10 bg-[#F8F6F0] rounded-2xl shadow-2xl z-[110] flex flex-col overflow-hidden border border-[#E7E7E7] animate-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='p-4 border-b border-[#E7E7E7] bg-white flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-[#F3E8FF] border border-[#D8B4FE] flex items-center justify-center text-[#6D28D9]'>
              <Sparkles className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-heading font-bold text-[#171717]'>AI Script Breakdown</h2>
              <p className='text-xs text-[#737373]'>
                Review AI suggestions for Scene & Panel segmentation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F3F3] text-[#737373] transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content Split View */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Left: Original */}
          <div className='flex-1 border-r border-[#E7E7E7] flex flex-col bg-white'>
            <div className='p-3 border-b border-[#E7E7E7] bg-[#FAF8F4] text-xs font-mono text-[#525252] uppercase font-bold tracking-wider'>
              Original Script
            </div>
            <div className='flex-1 overflow-y-auto p-6 space-y-4'>
              {originalBlocks.map((b) => (
                <div key={b.id} className='text-sm text-[#171717] opacity-60'>
                  {b.content || <span className='italic text-[#A3A3A3]'>[Empty Block]</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI Proposed */}
          <div className='flex-1 flex flex-col bg-white'>
            <div className='p-3 border-b border-[#E7E7E7] bg-[#F5F3FF] text-xs font-mono text-[#6D28D9] uppercase font-bold tracking-wider flex items-center gap-2'>
              <Sparkles className='w-3.5 h-3.5' /> AI Proposed Structure
            </div>
            <div className='flex-1 overflow-y-auto p-6 space-y-6'>
              {/* Simulated Scene Group 1 */}
              <div className='border border-[#D8B4FE] rounded-xl overflow-hidden shadow-2xs relative group'>
                <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    className='p-1.5 bg-white text-[#10B981] hover:bg-[#D1FAE5] rounded shadow-sm border border-[#E7E7E7]'
                    title='Accept'
                  >
                    <CheckCircle2 className='w-4 h-4' />
                  </button>
                  <button
                    className='p-1.5 bg-white text-[#F97316] hover:bg-[#FFF7ED] rounded shadow-sm border border-[#E7E7E7]'
                    title='Edit'
                  >
                    <Edit2 className='w-4 h-4' />
                  </button>
                  <button
                    className='p-1.5 bg-white text-[#EF4444] hover:bg-[#FEE2E2] rounded shadow-sm border border-[#E7E7E7]'
                    title='Reject'
                  >
                    <XCircle className='w-4 h-4' />
                  </button>
                </div>

                <div className='bg-[#F3E8FF] px-4 py-2 text-xs font-mono font-bold text-[#6D28D9] border-b border-[#D8B4FE]'>
                  SCENE: EXT. NEO TOKYO CITYSCAPE - NIGHT
                </div>
                <div className='p-4 bg-white space-y-2'>
                  <p className='text-sm text-[#525252]'>
                    Neon lights reflect off the rain-slicked pavement. The city is alive, bustling
                    with hover-cabs and pedestrians wielding holographic umbrellas.
                  </p>
                  <p className='text-sm font-bold text-[#F97316]'>WHOOOSH</p>

                  <div className='w-full h-px border-t border-dashed border-[#B8B8B8] my-4 relative'>
                    <span className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2.5 py-0.5 rounded text-xs font-mono font-semibold text-zinc-500'>
                      AI PANEL BREAK
                    </span>
                  </div>

                  <p className='text-sm text-[#525252]'>
                    A high-speed pursuit breaks the ambient noise. A lone figure on a sleek
                    hyper-bike weaves through traffic.
                  </p>
                </div>
              </div>

              {/* Simulated Scene Group 2 */}
              <div className='border border-[#D8B4FE] rounded-xl overflow-hidden shadow-2xs relative group'>
                <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    className='p-1.5 bg-white text-[#10B981] hover:bg-[#D1FAE5] rounded shadow-sm border border-[#E7E7E7]'
                    title='Accept'
                  >
                    <CheckCircle2 className='w-4 h-4' />
                  </button>
                  <button
                    className='p-1.5 bg-white text-[#F97316] hover:bg-[#FFF7ED] rounded shadow-sm border border-[#E7E7E7]'
                    title='Edit'
                  >
                    <Edit2 className='w-4 h-4' />
                  </button>
                  <button
                    className='p-1.5 bg-white text-[#EF4444] hover:bg-[#FEE2E2] rounded shadow-sm border border-[#E7E7E7]'
                    title='Reject'
                  >
                    <XCircle className='w-4 h-4' />
                  </button>
                </div>
                <div className='bg-[#F3E8FF] px-4 py-2 text-xs font-mono font-bold text-[#6D28D9] border-b border-[#D8B4FE]'>
                  SCENE: INT. COMMAND CENTER - CONTINUOUS
                </div>
                <div className='p-4 bg-white space-y-2'>
                  <p className='text-sm text-[#525252]'>
                    Multiple screens glow with data streams. The Operator types frantically.
                  </p>
                  <p className='text-sm font-bold'>
                    CHAR-2: You're pushing the core too hard! The stabilizers won't hold at that
                    velocity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-[#E7E7E7] bg-white flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-semibold text-[#525252] hover:bg-[#F3F3F3] rounded-lg transition-colors'
          >
            Cancel
          </button>
          {/* Note: The prompt specifically said "không có nút Accept All ẩn", so we will NOT implement a working Accept All. We provide a disabled visual button or omit it entirely based on the instruction. I will omit it. */}
          <button
            className='px-4 py-2 text-sm font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg shadow-sm transition-colors opacity-50 cursor-not-allowed'
            disabled
            title='You must accept/reject individual scenes'
          >
            Apply Changes
          </button>
        </div>
      </div>
    </>
  );
};
