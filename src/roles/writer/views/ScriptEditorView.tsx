import React, { useState } from 'react';
import {
  Type,
  Image as ImageIcon,
  MessageSquare,
  Play,
  LayoutTemplate,
  Sparkles,
  History,
  Check,
} from 'lucide-react';
import { ScriptBlockEditor } from '../components/script/ScriptBlockEditor';
import { ScriptOutline } from '../components/script/ScriptOutline';
import { AIBreakdownDiff } from '../components/script/AIBreakdownDiff';
import { VersionCompareView } from '../components/script/VersionCompareView';
import {
  MOCK_SCRIPT_BLOCKS,
  MOCK_OLD_VERSION_BLOCKS,
  ScriptBlock,
  ScriptBlockType,
} from '@/mocks/mockScriptData';
import { INITIAL_BIBLE_ENTITIES } from '@/mocks/mockData';

interface ScriptEditorViewProps {
  onShowToast: (title: string, desc: string) => void;
}

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({ onShowToast }) => {
  const [blocks, setBlocks] = useState<ScriptBlock[]>(MOCK_SCRIPT_BLOCKS);

  // Modals
  const [showAiDiff, setShowAiDiff] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const handleAddBlock = (type: ScriptBlockType) => {
    const newBlock: ScriptBlock = {
      id: `block-${Date.now()}`,
      type,
      content: '',
    };
    setBlocks((prev) => [...prev, newBlock]);
    // Scroll to bottom would happen here
  };

  return (
    <div className='w-full h-full flex flex-col bg-[#F3F3F3] relative'>
      {/* Sticky Toolbar (Level 2 Surface) */}
      <div className='shrink-0 border-b border-[#E7E7E7] px-6 py-3 flex items-center justify-between bg-white shadow-sm z-20'>
        {/* Block Insertion Tools */}
        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-mono text-[#A3A3A3] uppercase mr-2 tracking-wider'>
            Insert
          </span>
          <button
            onClick={() => handleAddBlock('scene_heading')}
            className='p-1.5 rounded text-[#525252] hover:bg-[#F3F3F3] hover:text-[#171717] transition-colors'
            title='Scene Heading'
          >
            <LayoutTemplate className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleAddBlock('direction')}
            className='p-1.5 rounded text-[#525252] hover:bg-[#F3F3F3] hover:text-[#171717] transition-colors'
            title='Direction / Action'
          >
            <Play className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleAddBlock('dialogue')}
            className='p-1.5 rounded text-[#525252] hover:bg-[#F3F3F3] hover:text-[#171717] transition-colors'
            title='Dialogue'
          >
            <MessageSquare className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleAddBlock('sfx')}
            className='p-1.5 rounded text-[#525252] hover:bg-[#F3F3F3] hover:text-[#171717] transition-colors'
            title='Sound Effect'
          >
            <Sparkles className='w-4 h-4' /> {/* Fallback icon for SFX */}
          </button>
          <button
            onClick={() => handleAddBlock('panel_break')}
            className='p-1.5 rounded text-[#525252] hover:bg-[#F3F3F3] hover:text-[#171717] transition-colors'
            title='Panel Break'
          >
            <ImageIcon className='w-4 h-4' />
          </button>
        </div>

        {/* Action Tools */}
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-1.5 text-[#10B981]'>
            <Check className='w-3.5 h-3.5' />
            <span className='text-[11px] font-mono font-medium'>Saved 14:32</span>
          </div>

          <div className='w-px h-5 bg-[#E7E7E7]'></div>

          <button
            onClick={() => setShowCompare(true)}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#525252] hover:bg-[#F3F3F3] rounded-md transition-colors'
          >
            <History className='w-3.5 h-3.5' />
            Compare versions
          </button>

          <button
            onClick={() => setShowAiDiff(true)}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#F3E8FF] hover:bg-[#E9D5FF] border border-[#D8B4FE] rounded-md shadow-2xs transition-colors'
          >
            <Sparkles className='w-3.5 h-3.5' />
            AI Breakdown
          </button>
        </div>
      </div>

      {/* Main Layout: Canvas + Outline */}
      <div className='flex-1 w-full flex overflow-hidden'>
        <ScriptBlockEditor
          blocks={blocks}
          setBlocks={setBlocks}
          mockEntities={INITIAL_BIBLE_ENTITIES}
          onAddNewCharacter={() =>
            onShowToast('New Character', 'Opening Add Entity modal (Simulated)')
          }
        />

        <ScriptOutline blocks={blocks} />
      </div>

      {/* Overlays */}
      <AIBreakdownDiff
        isOpen={showAiDiff}
        onClose={() => setShowAiDiff(false)}
        originalBlocks={blocks}
        onAcceptAll={() => {}}
      />

      <VersionCompareView
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
        currentVersion={blocks}
        oldVersion={MOCK_OLD_VERSION_BLOCKS}
        onRestore={() => {
          setBlocks(MOCK_OLD_VERSION_BLOCKS);
          setShowCompare(false);
          onShowToast('Version Restored', 'Reverted to previous version.');
        }}
      />
    </div>
  );
};
