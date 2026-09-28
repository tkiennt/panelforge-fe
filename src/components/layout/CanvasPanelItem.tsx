import React from 'react';
import { PanelItem } from '../../data/mockLayoutData';
import { Image as ImageIcon } from 'lucide-react';

interface CanvasPanelItemProps {
  panel: PanelItem;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  thumbnail: { bg: 'bg-[#F3F3F3]', text: 'text-[#525252]', border: 'border-[#B8B8B8]' },
  pencil: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', border: 'border-[#BFDBFE]' },
  ink: { bg: 'bg-[#171717]', text: 'text-white', border: 'border-black' },
  color: { bg: 'bg-[#FDF2F8]', text: 'text-[#DB2777]', border: 'border-[#FBCFE8]' },
  letter: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', border: 'border-[#FDE68A]' },
  review: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', border: 'border-[#FECACA]' },
  done: { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', border: 'border-[#A7F3D0]' },
};

export const CanvasPanelItem: React.FC<CanvasPanelItemProps> = ({
  panel,
  isSelected,
  onSelect,
  onResizeStart,
}) => {
  const stageColor = STAGE_COLORS[panel.stage] || STAGE_COLORS['thumbnail'];
  const hasArtwork = panel.versions.length > 0;

  return (
    <div
      onMouseDown={onSelect}
      className={`absolute border-2 transition-all cursor-move group ${
        isSelected
          ? 'border-[#F97316] z-10 shadow-md ring-2 ring-[#F97316]/20'
          : 'border-[#171717] hover:border-[#525252] z-0'
      } bg-white`}
      style={{
        left: `${panel.x}%`,
        top: `${panel.y}%`,
        width: `${panel.width}%`,
        height: `${panel.height}%`,
      }}
    >
      {/* Artwork Preview (Simulated) */}
      {hasArtwork ? (
        <div className='absolute inset-0 bg-[#E7E7E7] overflow-hidden flex items-center justify-center pointer-events-none'>
          {/* We just use a placeholder styling for artwork since we don't have real images */}
          <div className='text-[10px] text-[#A3A3A3] font-mono'>
            Artwork {panel.currentArtworkVersionId}
          </div>
        </div>
      ) : (
        <div className='absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm z-10'>
          <ImageIcon className='w-5 h-5 text-[#A3A3A3] mb-1' />
          <span className='text-[10px] font-semibold text-[#525252]'>+ Upload</span>
        </div>
      )}

      {/* ID Badge */}
      <div className='absolute top-1 left-1 bg-white px-1.5 py-0.5 border border-[#E7E7E7] text-[10px] font-mono font-bold text-[#171717] shadow-sm z-20'>
        {panel.id}
      </div>

      {/* Stage Badge */}
      <div
        className={`absolute top-1 right-1 px-1.5 py-0.5 border text-[9px] font-mono font-bold uppercase shadow-sm z-20 ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}
      >
        {panel.stage}
      </div>

      {/* Selection Handles (Visual only for MVP) */}
      {isSelected && (
        <>
          <div className='absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#F97316]'></div>
          <div className='absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#F97316]'></div>
          <div className='absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#F97316]'></div>
          <div
            className='absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#F97316] cursor-se-resize'
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e);
            }}
          ></div>
        </>
      )}
    </div>
  );
};
