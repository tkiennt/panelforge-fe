import React from 'react';
import { Type, CheckCircle } from 'lucide-react';

export default function LettererWorkspace() {
  return (
    <div className='flex flex-col h-full bg-[#FAF8F5] text-[#171717] font-sans p-6 overflow-auto'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='p-3 rounded-lg bg-[#10B981]/20 text-[#10B981]'>
          <Type size={24} />
        </div>
        <div>
          <h2 className='text-2xl font-black font-display'>Letterer Workspace</h2>
          <p className='text-[#555555] text-sm'>Speech Balloon Binding & Text-to-Box Fit</p>
        </div>
      </div>

      <div className='flex-1 border-2 border-dashed border-[#171717] rounded-xl flex flex-col items-center justify-center p-10 text-center bg-white'>
        <div className='w-16 h-16 bg-[#F3F1EB] rounded-full flex items-center justify-center mb-4 border border-[#171717]'>
          <Type size={28} className='text-[#171717]' />
        </div>
        <h3 className='text-lg font-bold mb-2'>Interactive Panel Canvas</h3>
        <p className='text-[#555555] max-w-md text-sm mb-6'>
          This is a placeholder for the Letterer's interactive canvas. Features will include
          dragging speech balloons, setting AI-assisted text fit, and managing vector font files.
        </p>
        <button className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2'>
          <CheckCircle size={16} />
          Complete Typesetting
        </button>
      </div>
    </div>
  );
}
