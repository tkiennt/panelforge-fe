import React from 'react';
import { ScriptBlock, ScriptBlockType } from '../../data/mockScriptData';
import { BibleEntity } from '../../types';
import { ScriptBlockItem } from './ScriptBlockItem';

interface ScriptBlockEditorProps {
  blocks: ScriptBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ScriptBlock[]>>;
  mockEntities: BibleEntity[];
  onAddNewCharacter: () => void;
}

export const ScriptBlockEditor: React.FC<ScriptBlockEditorProps> = ({
  blocks,
  setBlocks,
  mockEntities,
  onAddNewCharacter,
}) => {
  const handleUpdateContent = (id: string, newContent: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              content: newContent,
              // If AI suggested, mark as edited
              aiState: b.aiState === 'suggested' ? 'suggested_edited' : b.aiState,
            }
          : b,
      ),
    );
  };

  const handleUpdateSpeaker = (id: string, newSpeakerId: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, speakerId: newSpeakerId } : b)));
  };

  const handleFocusNext = (currentId: string) => {
    const idx = blocks.findIndex((b) => b.id === currentId);
    if (idx !== -1) {
      const newBlock: ScriptBlock = {
        id: `block-${Date.now()}`,
        type: 'dialogue', // Default to dialogue
        content: '',
      };
      const newBlocks = [...blocks];
      newBlocks.splice(idx + 1, 0, newBlock);
      setBlocks(newBlocks);
      // In a real editor, we'd also focus the new block DOM node here.
    }
  };

  const handleRemove = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className='flex-1 w-full flex justify-center py-10 px-8 overflow-y-auto custom-scrollbar bg-[#F3F3F3]'>
      <div className='w-full max-w-[720px] bg-white rounded-xl shadow-2xs border border-[#E7E7E7] min-h-[800px] p-8 md:p-12 mb-20'>
        {/* Title area (Optional for context) */}
        <div className='mb-12 border-b border-[#E7E7E7] pb-6'>
          <h1 className='text-3xl font-heading font-bold text-[#171717] mb-2 text-center'>
            Chapter 5: The Awakening
          </h1>
          <p className='text-sm font-mono text-[#A3A3A3] text-center uppercase tracking-widest'>
            Master Script
          </p>
        </div>

        {/* Blocks rendering */}
        <div className='flex flex-col gap-1'>
          {blocks.map((block) => (
            <ScriptBlockItem
              key={block.id}
              block={block}
              mockEntities={mockEntities}
              onUpdateContent={handleUpdateContent}
              onUpdateSpeaker={handleUpdateSpeaker}
              onAddNewCharacter={onAddNewCharacter}
              onFocusNext={handleFocusNext}
              onRemove={handleRemove}
            />
          ))}

          {blocks.length === 0 && (
            <div className='text-center py-10 text-sm text-[#737373]'>
              Bắt đầu gõ để tạo nội dung kịch bản...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
