import React from 'react';
import { ScriptBlock } from '../../data/mockScriptData';
import { Layers } from 'lucide-react';

interface ScriptOutlineProps {
  blocks: ScriptBlock[];
}

export const ScriptOutline: React.FC<ScriptOutlineProps> = ({ blocks }) => {
  // Generate outline items
  const outlineItems = blocks.filter((b) => b.type === 'scene_heading' || b.type === 'panel_break');

  const pageCount = 1;
  let panelCount = 1;

  const formattedItems = outlineItems.map((item) => {
    if (item.type === 'scene_heading') {
      return { id: item.id, label: item.content, type: 'scene', display: item.content };
    } else {
      const display = `Page ${pageCount} · Panel ${panelCount}`;
      panelCount++;
      return { id: item.id, label: 'Panel Break', type: 'panel', display };
    }
  });

  return (
    <div className='w-[320px] shrink-0 border-l border-[#E7E7E7] bg-white hidden xl:flex flex-col h-full'>
      <div className='p-4 border-b border-[#E7E7E7] bg-[#FAF8F4] flex items-center gap-2'>
        <Layers className='w-4 h-4 text-[#737373]' />
        <h3 className='text-sm font-semibold text-[#171717] font-heading'>Script Outline</h3>
      </div>

      <div className='flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1'>
        {formattedItems.map((item, idx) => (
          <div
            key={item.id}
            className={`px-3 py-2 text-xs rounded-md cursor-pointer transition-colors ${
              item.type === 'scene'
                ? 'font-bold text-[#171717] hover:bg-[#F3F3F3] mt-2'
                : 'text-[#525252] hover:bg-[#F3F3F3] ml-4 border-l-2 border-[#E7E7E7]'
            }`}
          >
            {item.display}
          </div>
        ))}
        {formattedItems.length === 0 && (
          <div className='p-4 text-xs text-center text-[#A3A3A3]'>No scenes or panels yet.</div>
        )}
      </div>
    </div>
  );
};
