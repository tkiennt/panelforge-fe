import React from 'react';
import { Eye, Lock } from 'lucide-react';

export default function ReaderWorkspace() {
  return (
    <div className='flex flex-col h-full bg-[#171717] text-[#FAF8F5] font-sans p-6 overflow-auto'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='p-3 rounded-lg bg-white/10 text-white'>
          <Eye size={24} />
        </div>
        <div>
          <h2 className='text-2xl font-black font-display'>Reader / Client Portal</h2>
          <p className='text-[#A3A3A3] text-sm'>Secure Watermarked Preview</p>
        </div>
      </div>

      <div className='flex-1 border border-white/20 rounded-xl flex flex-col items-center justify-center p-10 text-center bg-black/50'>
        <div className='w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/20'>
          <Lock size={28} className='text-white' />
        </div>
        <h3 className='text-lg font-bold mb-2'>Protected Viewing Session</h3>
        <p className='text-[#A3A3A3] max-w-md text-sm mb-6'>
          This environment simulates a secure, watermarked preview link sent to clients or test readers. Copy protection and screenshot deterrence are active.
        </p>
        <div className='flex items-center gap-4'>
          <button className='px-4 py-2 bg-white text-[#171717] hover:bg-[#F3F1EB] text-sm font-bold rounded-lg transition-all active:scale-95'>
            Start Reading
          </button>
        </div>
      </div>
    </div>
  );
}
