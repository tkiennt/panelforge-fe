import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import WriterWorkspace from '@/roles/writer/views/WriterWorkspace';
import EditorWorkspace from '@/components/modals/roles/EditorWorkspace';
import ArtistWorkspace from '../views/ArtistWorkspace';

interface SpreadWorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, desc: string) => void;
  userRole?: 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR';
}

export const SpreadWorkbenchModal: React.FC<SpreadWorkbenchModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  userRole = 'ARTIST', // Mặc định đang để ARTIST để bạn xem lại code cũ
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200'>
      <div className='bg-[#171717] border border-[#333333] rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden text-white shadow-2xl'>
        {/* Top Header Bar */}
        <div className='h-14 px-6 border-b border-[#2A2A2A] bg-[#1E1E1E] flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <span className='px-2.5 py-0.5 rounded bg-[#F97316] text-white font-mono text-[10px] font-bold uppercase tracking-wider'>
              SPREAD 18-19 • {userRole} MODE
            </span>
            <h3 className='font-display font-bold text-sm tracking-tight'>
              Chapter 5: "Neon Monsoon"
            </h3>
            <span className='text-xs font-mono text-[#888888] hidden sm:inline'>
              (B5 Tankōbon • 600 DPI Master)
            </span>
          </div>

          <div className='flex items-center gap-3'>
            {/* Chỉ hiện LoRA Match khi đang ở Artist Mode */}
            {userRole === 'ARTIST' && (
              <span className='text-xs font-mono text-[#10B981] bg-[#10B981]/15 px-2.5 py-0.5 rounded border border-[#10B981]/30 flex items-center gap-1'>
                <ShieldCheck className='w-3.5 h-3.5' />
                <span>LoRA Match: 99.4%</span>
              </span>
            )}
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] flex items-center justify-center text-[#888888] hover:text-white transition-colors cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Dynamic Workspace Area - Thay đổi ruột dựa vào prop userRole */}
        <div className='flex-1 flex overflow-hidden'>
          {userRole === 'WRITER' && <WriterWorkspace />}
          {userRole === 'EDITOR' && <EditorWorkspace onShowToast={onShowToast} />}
          {userRole === 'ARTIST' && <ArtistWorkspace onClose={onClose} onShowToast={onShowToast} />}
        </div>
      </div>
    </div>
  );
};
