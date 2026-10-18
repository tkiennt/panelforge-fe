import React, { useState } from 'react';
import { FileText, Sparkles, Wand2, Type } from 'lucide-react';

interface ScriptEditorProps {
  isReadOnly?: boolean;
  onAIBreakdown?: () => void;
  initialContent?: string;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  isReadOnly,
  onAIBreakdown,
  initialContent = '',
}) => {
  const [content, setContent] = useState(initialContent);

  return (
    <div className='flex-1 flex flex-col md:flex-row bg-[#FAF8F4] overflow-hidden'>
      {/* Left Panel: Editor */}
      <div className='flex-1 flex flex-col p-6 overflow-hidden'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-display font-bold text-xl text-[#171717] flex items-center gap-2'>
            <FileText className='w-5 h-5 text-[#8B5CF6]' />
            Script Manuscript
          </h3>
          {isReadOnly && (
            <span className='px-2.5 py-0.5 bg-[#F3F3F3] text-zinc-600 text-xs font-bold rounded-full uppercase'>
              Read-Only
            </span>
          )}
        </div>

        <div className='flex-1 relative bg-white border border-[#E7E7E7] rounded-xl shadow-sm overflow-hidden flex flex-col'>
          <div className='flex bg-[#F8F6F0] border-b border-[#E7E7E7] px-3 py-2 gap-2'>
            <button
              disabled={isReadOnly}
              className='p-1.5 text-[#555] hover:text-black hover:bg-[#E7E7E7] rounded transition-colors disabled:opacity-50'
            >
              <Type className='w-4 h-4' />
            </button>
            <div className='w-px bg-[#D4D4D4] my-1 mx-1'></div>
            <select
              disabled={isReadOnly}
              className='bg-transparent text-sm font-semibold text-[#171717] outline-none disabled:opacity-50'
            >
              <option>Scene Heading</option>
              <option>Action</option>
              <option>Character</option>
              <option>Dialogue</option>
            </select>
          </div>
          <textarea
            readOnly={isReadOnly}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className='flex-1 w-full p-6 text-sm font-serif leading-relaxed text-[#171717] resize-none focus:outline-none custom-scrollbar'
            placeholder='Type your script here...'
          />
        </div>
      </div>

      {/* Right Panel: AI Tools */}
      <div className='w-full md:w-[320px] shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col'>
        <div className='p-4 border-b border-[#E7E7E7] flex items-center gap-2'>
          <Wand2 className='w-4 h-4 text-violet-600' />
          <h4 className='font-bold text-sm uppercase tracking-wider text-[#171717]'>
            Script Tools
          </h4>
        </div>
        <div className='p-4 space-y-4'>
          <div className='p-4 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl'>
            <div className='flex items-center gap-2 mb-2'>
              <Sparkles className='w-4 h-4 text-violet-600' />
              <span className='font-bold text-sm text-[#171717]'>AI Panel Breakdown</span>
            </div>
            <p className='text-xs text-[#555555] mb-4'>
              Automatically divide the current scene into suggested manga panels, estimating pacing
              and camera angles.
            </p>
            <button
              onClick={onAIBreakdown}
              disabled={isReadOnly}
              className='w-full py-2 bg-violet-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-soft-sm'
            >
              Generate Panels
            </button>
          </div>

          <div className='space-y-2'>
            <h5 className='text-xs font-bold text-zinc-500 uppercase tracking-wider'>
              Detected Characters
            </h5>
            <div className='p-3 bg-[#F8F6F0] rounded-lg text-xs text-stone-500 border border-[#E7E7E7] text-center'>
              Chưa phát hiện nhân vật nào trong phân cảnh hiện tại.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
