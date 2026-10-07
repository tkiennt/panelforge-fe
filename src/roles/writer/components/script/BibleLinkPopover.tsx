import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { BibleEntity } from '@/types';

interface BibleLinkPopoverProps {
  text: string;
  entityId: string;
  mockEntities: BibleEntity[];
}

export const BibleLinkPopover: React.FC<BibleLinkPopoverProps> = ({
  text,
  entityId,
  mockEntities,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const entity = mockEntities.find((e) => e.id === entityId);

  return (
    <span
      className='relative inline-block'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className='border-b-[1.5px] border-[#D8B4FE] text-[#171717] cursor-pointer hover:bg-[#F3E8FF] transition-colors rounded-sm px-0.5'>
        {text}
      </span>

      {isHovered && entity && (
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-xl shadow-lg border border-[#E7E7E7] z-[100] animate-in slide-in-from-bottom-2 fade-in duration-200'>
          <div className='p-3 border-b border-[#E7E7E7] bg-[#FAF8F4] rounded-t-xl flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <BookOpen className='w-4 h-4 text-[#8B5CF6]' />
              <span className='text-[11px] font-mono font-medium text-[#737373] uppercase'>
                Bible Entry
              </span>
            </div>
            <span className='text-[10px] font-mono text-[#A3A3A3]'>{entity.category}</span>
          </div>
          <div className='p-3'>
            <h4 className='text-sm font-semibold text-[#171717] font-heading mb-1'>
              {entity.name}
            </h4>
            <p className='text-xs text-[#525252] line-clamp-3'>{entity.description}</p>
          </div>
        </div>
      )}
    </span>
  );
};
