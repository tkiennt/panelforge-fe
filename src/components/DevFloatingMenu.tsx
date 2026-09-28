import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, X, Code, FileText, Image, MessageSquare, Eye } from 'lucide-react';

export const DevFloatingMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className='fixed bottom-20 right-4 z-[110] bg-[#171717] hover:bg-black text-[#10B981] rounded-full p-3 shadow-2xl flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 border-2 border-[#10B981]'
      >
        <Terminal className='w-5 h-5' />
      </button>
    );
  }

  return (
    <div className='fixed bottom-20 right-4 z-[110] bg-[#171717] text-white border border-[#333] rounded-xl shadow-2xl p-4 w-[300px] animate-in slide-in-from-bottom-2 fade-in duration-200 font-sans'>
      <div className='flex items-center justify-between border-b border-[#333] pb-3 mb-3'>
        <div className='flex items-center gap-2'>
          <Terminal className='w-4 h-4 text-[#10B981]' />
          <span className='text-xs font-bold uppercase tracking-wider text-[#10B981]'>
            Dev Menu (Bypass)
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className='text-[#A3A3A3] hover:text-white p-1 rounded transition-colors'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      <div className='space-y-2'>
        <p className='text-[10px] text-[#A3A3A3] uppercase font-bold mb-1'>
          Deep Links (Mock States)
        </p>

        <button
          onClick={() => navigate('/workspace/task/mock-script')}
          className='w-full flex items-center gap-2 p-2 hover:bg-[#333] rounded transition-colors text-left text-xs font-semibold'
        >
          <FileText className='w-4 h-4 text-[#8B5CF6]' /> Task Editor: Script
        </button>

        <button
          onClick={() => navigate('/workspace/task/mock-artwork')}
          className='w-full flex items-center gap-2 p-2 hover:bg-[#333] rounded transition-colors text-left text-xs font-semibold'
        >
          <Image className='w-4 h-4 text-[#3B82F6]' /> Task Editor: Artwork
        </button>

        <button
          onClick={() => navigate('/workspace/task/mock-letter')}
          className='w-full flex items-center gap-2 p-2 hover:bg-[#333] rounded transition-colors text-left text-xs font-semibold'
        >
          <MessageSquare className='w-4 h-4 text-[#10B981]' /> Task Editor: Lettering
        </button>

        <button
          onClick={() => navigate('/review/mock-conflict')}
          className='w-full flex items-center gap-2 p-2 hover:bg-[#333] rounded transition-colors text-left text-xs font-semibold'
        >
          <Eye className='w-4 h-4 text-[#EF4444]' /> Review Board (Mock)
        </button>
      </div>

      <div className='mt-4 p-2 bg-[#10B981]/10 border border-[#10B981]/30 rounded text-[10px] text-[#10B981]'>
        RBAC protection is currently <strong>bypassed</strong>. You have full edit access to all
        tools.
      </div>
    </div>
  );
};
