import React, { useState } from 'react';
import { Sparkles, MessageSquare, LayoutTemplate, Plus, Loader2 } from 'lucide-react';

export const WriterWorkspace = () => {
  const [script, setScript] = useState(
    'ACTION: Cơn mưa neon trút xuống đường phố Shibuya.\n\nKENJI: (Thở dốc) Bọn chúng đến đông quá...\n\nACTION: Một bóng đen khổng lồ lao ra từ hẻm nhỏ, cắt ngang ánh đèn pha chói lóa.',
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [panelsGenerated, setPanelsGenerated] = useState(false);

  const handleAiBreakdown = () => {
    setIsAnalyzing(true);
    // Giả lập thời gian AI xử lý
    setTimeout(() => {
      setIsAnalyzing(false);
      setPanelsGenerated(true);
    }, 1500);
  };

  return (
    <>
      {/* Left Column: Script Editor */}
      <div className='w-1/2 flex flex-col border-r border-[#2A2A2A] bg-[#121212]'>
        <div className='p-3 bg-[#1E1E1E] border-b border-[#2A2A2A] flex justify-between items-center shrink-0'>
          <h4 className='text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
            Master Script Editor
          </h4>
          <button
            onClick={handleAiBreakdown}
            disabled={isAnalyzing}
            className='px-3 py-1.5 bg-[#F3E8FF] hover:bg-[#8B5CF6]/20 text-[#6D28D9] border border-[#8B5CF6]/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50'
          >
            {isAnalyzing ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <Sparkles className='w-3.5 h-3.5' />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'AI Breakdown Layout'}</span>
          </button>
        </div>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          className='flex-1 bg-transparent text-[#E7E7E7] p-6 text-sm font-mono leading-relaxed focus:outline-none resize-none custom-scrollbar'
          placeholder='Start typing your manga script here using ACTION: and CHARACTER: formats...'
        />
      </div>

      {/* Right Column: AI Structured Panels */}
      <div className='w-1/2 bg-[#1A1A1A] p-6 overflow-y-auto custom-scrollbar flex flex-col'>
        <div className='flex items-center gap-2 mb-6'>
          <LayoutTemplate className='w-4 h-4 text-[#888888]' />
          <h4 className='text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
            Structured Panels (Page 18)
          </h4>
        </div>

        {!panelsGenerated ? (
          <div className='flex-1 flex flex-col items-center justify-center text-[#555555] space-y-3'>
            <LayoutTemplate className='w-12 h-12 opacity-20' />
            <p className='text-xs font-mono'>Click "AI Breakdown Layout" to generate panels.</p>
          </div>
        ) : (
          <div className='space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300'>
            {/* Panel 1 */}
            <div className='bg-[#242424] border border-[#333333] hover:border-[#F97316] rounded-xl p-4 transition-colors group'>
              <div className='flex justify-between items-center mb-3'>
                <span className='text-[10px] bg-[#171717] text-[#A3A3A3] px-2 py-1 rounded font-mono font-bold border border-[#333333]'>
                  PANEL 1 (Establishing Shot)
                </span>
                <button className='text-[#888888] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity'>
                  <Plus className='w-4 h-4' />
                </button>
              </div>
              <p className='text-xs text-[#CCCCCC] italic mb-4 leading-relaxed'>
                Cơn mưa neon trút xuống đường phố Shibuya. Góc máy rộng từ trên cao.
              </p>
              <div className='flex gap-2 border-t border-[#333333] pt-3'>
                <button className='text-[10px] font-mono bg-[#1A1A1A] border border-[#333333] hover:border-[#F97316] hover:text-[#F97316] text-[#A3A3A3] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer'>
                  <MessageSquare className='w-3 h-3' /> Add Dialogue
                </button>
              </div>
            </div>

            {/* Panel 2 */}
            <div className='bg-[#242424] border border-[#333333] hover:border-[#F97316] rounded-xl p-4 transition-colors group'>
              <div className='flex justify-between items-center mb-3'>
                <span className='text-[10px] bg-[#171717] text-[#A3A3A3] px-2 py-1 rounded font-mono font-bold border border-[#333333]'>
                  PANEL 2 (Close up)
                </span>
              </div>
              <p className='text-xs text-[#CCCCCC] italic mb-4 leading-relaxed'>
                Khuôn mặt Kenji ướt sũng, biểu cảm căng thẳng.
              </p>
              <div className='flex flex-col gap-2 border-t border-[#333333] pt-3'>
                {/* Dialogue Block */}
                <div className='bg-[#171717] border border-[#444444] rounded p-2 flex gap-2'>
                  <div className='w-1 bg-[#EA580C] rounded-full shrink-0'></div>
                  <div>
                    <span className='text-[10px] font-bold text-[#EA580C] block'>KENJI</span>
                    <span className='text-xs text-white'>Thở dốc... Bọn chúng đến đông quá...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
