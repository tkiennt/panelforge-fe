import React from 'react';
import { X, History, ArrowLeftRight } from 'lucide-react';
import { ScriptBlock } from '../../data/mockScriptData';

interface VersionCompareViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: ScriptBlock[];
  oldVersion: ScriptBlock[];
  onRestore: () => void;
}

export const VersionCompareView: React.FC<VersionCompareViewProps> = ({
  isOpen,
  onClose,
  currentVersion,
  oldVersion,
  onRestore,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className='absolute inset-0 bg-[#171717]/40 backdrop-blur-sm z-[100]'
        onClick={onClose}
      />
      <div className='absolute inset-4 md:inset-10 bg-[#F8F6F0] rounded-2xl shadow-2xl z-[110] flex flex-col overflow-hidden border border-[#E7E7E7] animate-in slide-in-from-bottom-10 duration-300'>
        {/* Header */}
        <div className='p-4 border-b border-[#E7E7E7] bg-white flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-[#F3F3F3] border border-[#E7E7E7] flex items-center justify-center text-[#525252]'>
              <History className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-heading font-bold text-[#171717]'>Version Compare</h2>
              <p className='text-xs text-[#737373]'>Review changes between versions.</p>
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
          {/* Left: Old Version */}
          <div className='flex-1 border-r border-[#E7E7E7] flex flex-col bg-white'>
            <div className='p-3 border-b border-[#E7E7E7] bg-[#FAF8F4] flex justify-between items-center'>
              <span className='text-xs font-mono text-[#525252] uppercase font-bold tracking-wider'>
                v1.2 (Yesterday)
              </span>
              <button
                onClick={onRestore}
                className='px-3 py-1 text-xs font-semibold bg-white border border-[#E7E7E7] rounded-md shadow-2xs hover:bg-[#F3F3F3] transition-colors text-[#171717]'
              >
                Restore this version
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed'>
              {/* Simulated Diff Left */}
              <div className='px-2 py-1 bg-[#FEE2E2] text-[#991B1B] -mx-2 mb-2 line-through opacity-80'>
                SCENE: EXT. NEO TOKYO CITY - NIGHT
              </div>
              <div className='px-2 py-1 bg-[#FEE2E2] text-[#991B1B] -mx-2 mb-2 line-through opacity-80'>
                DIR: Neon lights reflect off the pavement. The city is alive.
              </div>
              <div className='px-2 py-1 mb-2 text-[#525252]'>
                DIR: A lone figure on a sleek hyper-bike weaves through traffic.
              </div>
            </div>
          </div>

          <div className='w-10 bg-[#F3F3F3] flex flex-col items-center justify-center shrink-0 border-r border-[#E7E7E7]'>
            <ArrowLeftRight className='w-4 h-4 text-[#A3A3A3]' />
          </div>

          {/* Right: Current Version */}
          <div className='flex-1 flex flex-col bg-white'>
            <div className='p-3 border-b border-[#E7E7E7] bg-[#F5F3FF] flex justify-between items-center'>
              <span className='text-xs font-mono text-[#6D28D9] uppercase font-bold tracking-wider'>
                Current Draft
              </span>
              <span className='text-[10px] text-[#A3A3A3] italic'>Auto-saved 2m ago</span>
            </div>
            <div className='flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed'>
              {/* Simulated Diff Right */}
              <div className='px-2 py-1 bg-[#D1FAE5] text-[#065F46] -mx-2 mb-2 font-medium border-l-2 border-[#10B981]'>
                SCENE: EXT. NEO TOKYO CITYSCAPE - NIGHT
              </div>
              <div className='px-2 py-1 bg-[#D1FAE5] text-[#065F46] -mx-2 mb-2 font-medium border-l-2 border-[#10B981]'>
                DIR: Neon lights reflect off the rain-slicked pavement. The city is alive, bustling
                with hover-cabs and pedestrians wielding holographic umbrellas.
              </div>
              <div className='px-2 py-1 bg-[#D1FAE5] text-[#065F46] -mx-2 mb-2 font-medium border-l-2 border-[#10B981]'>
                SFX: WHOOOSH
              </div>
              <div className='px-2 py-1 mb-2 text-[#525252]'>
                DIR: A lone figure on a sleek hyper-bike weaves through traffic.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
