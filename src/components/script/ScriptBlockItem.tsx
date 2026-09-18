import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { ScriptBlock, AIState, BibleLink } from '../../data/mockScriptData';
import { BibleEntity } from '../../types';
import { SpeakerAutocomplete } from './SpeakerAutocomplete';
import { BibleLinkPopover } from './BibleLinkPopover';

interface ScriptBlockItemProps {
  block: ScriptBlock;
  mockEntities: BibleEntity[];
  onUpdateContent: (id: string, content: string) => void;
  onUpdateSpeaker: (id: string, speakerId: string) => void;
  onAddNewCharacter: () => void;
  onFocusNext: (currentId: string) => void;
  onRemove: (id: string) => void;
  isAiOffline?: boolean;
}

export const ScriptBlockItem: React.FC<ScriptBlockItemProps> = ({
  block,
  mockEntities,
  onUpdateContent,
  onUpdateSpeaker,
  onAddNewCharacter,
  onFocusNext,
  onRemove,
  isAiOffline = false,
}) => {
  const isDialogue = block.type === 'dialogue';
  const isPanelBreak = block.type === 'panel_break';
  const isSceneHeading = block.type === 'scene_heading';

  // --- RENDER TEXT WITH BIBLE LINKS ---
  const renderContent = () => {
    if (!block.linkedBibleEntries || block.linkedBibleEntries.length === 0) {
      return block.content;
    }
    // Very simplified rendering of linked text for demonstration
    // Real implementation would split text by indices
    let lastIdx = 0;
    const elements: React.ReactNode[] = [];

    // Sort links by startIndex
    const links = [...block.linkedBibleEntries].sort((a, b) => a.startIndex - b.startIndex);

    links.forEach((link, idx) => {
      if (link.startIndex > lastIdx) {
        elements.push(
          <span key={`text-${idx}`}>{block.content.slice(lastIdx, link.startIndex)}</span>,
        );
      }
      elements.push(
        <BibleLinkPopover
          key={`link-${idx}`}
          text={block.content.slice(link.startIndex, link.endIndex)}
          entityId={link.entityId}
          mockEntities={mockEntities}
        />,
      );
      lastIdx = link.endIndex;
    });

    if (lastIdx < block.content.length) {
      elements.push(<span key={`text-end`}>{block.content.slice(lastIdx)}</span>);
    }

    return <>{elements}</>;
  };

  // --- AI BADGE ---
  const renderAIBadge = () => {
    if (!block.aiState || block.aiState === 'none') return null;

    let text = 'AI Suggested';
    if (block.aiState === 'suggested_edited') text = 'AI Suggested · Edited';
    if (block.aiState === 'accepted') text = 'AI Suggested · Accepted';

    return (
      <div className='absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap'>
        <div
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${isAiOffline ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-[#F3E8FF] text-[#6D28D9] border-[#D8B4FE]'}`}
        >
          {isAiOffline ? (
            <AlertTriangle className='w-3 h-3 mr-1' />
          ) : (
            <Sparkles className='w-3 h-3 mr-1' />
          )}
          {text}
        </div>
      </div>
    );
  };

  // --- PANEL BREAK SPECIAL RENDER ---
  if (isPanelBreak) {
    return (
      <div className='w-full flex items-center justify-center py-6 group relative'>
        <div className='w-full h-px bg-[#B8B8B8] border-t border-dashed relative'>
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[11px] font-mono font-bold text-[#A3A3A3] tracking-widest uppercase'>
            Panel Break
          </div>
        </div>
        {renderAIBadge()}
      </div>
    );
  }

  // --- STANDARD BLOCKS ---
  let prefix = '';
  let contentStyle = 'text-sm text-[#171717]';

  if (isSceneHeading) {
    prefix = 'SCENE';
    contentStyle =
      'text-sm font-bold uppercase text-[#171717] bg-[#F3F3F3] px-2 py-1 rounded w-full';
  } else if (block.type === 'direction') {
    prefix = 'DIR.';
    contentStyle = 'text-sm text-[#525252] leading-relaxed';
  } else if (block.type === 'sfx') {
    prefix = 'SFX';
    contentStyle = 'text-sm font-bold italic text-[#F97316]';
  }

  return (
    <div
      className={`relative flex items-start gap-4 py-2 group ${block.aiState && block.aiState !== 'none' ? 'border-l-2 border-[#8B5CF6] pl-3 -ml-[14px]' : ''}`}
    >
      {/* Left Prefix / Speaker */}
      <div className='w-[140px] shrink-0 text-right pt-1 flex justify-end'>
        {isDialogue ? (
          <SpeakerAutocomplete
            value={block.speakerId || ''}
            onChange={(id) => onUpdateSpeaker(block.id, id)}
            mockEntities={mockEntities}
            onAddNew={onAddNewCharacter}
          />
        ) : (
          <span className='text-[11px] font-mono text-[#A3A3A3] font-semibold'>{prefix}</span>
        )}
      </div>

      {/* Content Area */}
      <div className='flex-1 min-w-0 relative'>
        {/* We use a contentEditable div or a simple div here. Since we have links, a simple div is easier for display, but for a real editor we need a rich text area. For this prototype, we'll render the text with links if not focused, and a textarea if clicked. */}
        <div
          className={`w-full outline-none min-h-[24px] ${contentStyle}`}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const newText = e.currentTarget.innerText;
            if (newText !== block.content) {
              onUpdateContent(block.id, newText);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onFocusNext(block.id);
            }
            if (e.key === 'Backspace' && e.currentTarget.innerText === '') {
              e.preventDefault();
              onRemove(block.id);
            }
          }}
        >
          {block.linkedBibleEntries?.length ? renderContent() : block.content}
        </div>
      </div>

      {renderAIBadge()}
    </div>
  );
};
