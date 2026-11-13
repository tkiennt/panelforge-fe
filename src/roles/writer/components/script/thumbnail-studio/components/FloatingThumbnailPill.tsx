// src/roles/writer/components/script/thumbnail-studio/components/FloatingThumbnailPill.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import { useComicStudioStore } from '../store/useComicStudioStore';
import { Film, ChevronRight } from 'lucide-react';

interface FloatingThumbnailPillProps {
  className?: string;
}

export const FloatingThumbnailPill: React.FC<FloatingThumbnailPillProps> = ({ className = '' }) => {
  const { isDrawerOpen, activePageNumber, activePanelNumber, activePanelId, openDrawer } =
    useComicStudioStore();

  if (isDrawerOpen) return null;
  if (typeof document === 'undefined') return null;

  const content = (
    <button
      type='button'
      data-testid='floating-thumbnail-pill'
      onClick={() => openDrawer(activePanelId || undefined)}
      className={`fixed bottom-6 right-6 z-[990] flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1C1917] text-[#FCFBF8] hover:bg-[#C2410C] shadow-lg hover:shadow-xl border border-white/20 transition-all duration-200 cursor-pointer group animate-in fade-in slide-in-from-bottom-2 ${className}`}
      title='Bấm để mở ngăn kéo Storyboard / Thumbnails (Tab hoặc Ctrl+B)'
    >
      <div className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform'>
        <Film className='w-3 h-3' />
      </div>

      <div className='flex items-center gap-1.5 text-xs font-mono font-bold tracking-tight'>
        <span>Trang {activePageNumber || 1}</span>
        <span className='opacity-50'>|</span>
        <span className='text-amber-300'>
          Ô {activePageNumber || 1}.{activePanelNumber || 1}
        </span>
      </div>

      <ChevronRight className='w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all' />
    </button>
  );

  return createPortal(content, document.body);
};
