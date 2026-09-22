import React, { useState } from 'react';
import {
  LayoutGrid,
  PlaySquare,
  MessageSquare,
  Wand2,
  Check,
  User as UserIcon,
  Layers,
  Bot,
} from 'lucide-react';

const MOCK_SCRIPT = [
  {
    id: 'b1',
    type: 'DIR',
    content:
      'Neon lights reflect off the rain-slicked pavement. The city is alive, bustling with hover-cabs and pedestrians.',
  },
  { id: 'b2', type: 'SFX', content: 'WHOOOSH' },
  {
    id: 'b3',
    type: 'DIALOGUE',
    character: 'CHAR-1',
    content: "I told you I'd be there in five. Keep the engine running.",
  },
  { id: 'b4', type: 'PANEL_BREAK', content: 'PANEL BREAK' },
  { id: 'b5', type: 'SCENE', content: 'INT. COMMAND CENTER - CONTINUOUS' },
  { id: 'b6', type: 'DIALOGUE', character: 'CHAR-2', content: "You're pushing the core too hard!" },
];

export default function WriterWorkspace() {
  const [blocks] = useState(MOCK_SCRIPT);

  // Trạng thái bật/tắt ô AI Breakdown
  const [showAIBreakdown, setShowAIBreakdown] = useState(false);

  // Dữ liệu kịch bản thô của Biên kịch
  const [rawScript, setRawScript] = useState(
    'Neon lights reflect off the rain-slicked pavement. The city is alive, bustling with hover-cabs and pedestrians.\n\n' +
      '[SFX: WHOOOSH]\n\n' +
      "CHAR-1: I told you I'd be there in five. Keep the engine running.\n\n" +
      '--- PANEL BREAK ---\n\n' +
      'INT. COMMAND CENTER - CONTINUOUS\n\n' +
      "CHAR-2: You're pushing the core too hard!",
  );

  const renderBlock = (block: any) => {
    switch (block.type) {
      case 'PANEL_BREAK':
        return (
          <div key={block.id} className='flex justify-center my-6 relative'>
            <div className='w-full border-t border-dashed border-gray-300'></div>
            <span className='absolute bg-white px-2 text-[9px] font-bold text-gray-400 uppercase'>
              {block.content}
            </span>
          </div>
        );
      case 'SCENE':
        return (
          <div key={block.id} className='flex gap-3 my-4'>
            <div className='w-16 shrink-0 text-right text-[9px] font-bold text-gray-400 uppercase pt-1'>
              Scene
            </div>
            <div className='flex-1 bg-gray-100 px-3 py-1.5 font-bold text-gray-800 rounded text-[13px]'>
              {block.content}
            </div>
          </div>
        );
      case 'DIALOGUE':
        return (
          <div key={block.id} className='flex gap-3 my-3 relative'>
            <div className='absolute -left-4 top-0 bottom-0 w-0.5 bg-purple-400 rounded-full opacity-50'></div>
            <div className='w-16 shrink-0 flex flex-col items-end gap-1 pt-0.5'>
              <span className='flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase'>
                <UserIcon className='w-2.5 h-2.5' />
                {block.character}
              </span>
            </div>
            <div className='flex-1 text-gray-800 text-[13px] leading-relaxed'>{block.content}</div>
          </div>
        );
      default:
        return (
          <div key={block.id} className='flex gap-3 my-3'>
            <div className='w-16 shrink-0 text-right text-[9px] font-bold text-gray-400 uppercase pt-1'>
              {block.type}
            </div>
            <div
              className={`flex-1 text-[13px] leading-relaxed ${block.type === 'SFX' ? 'italic font-bold text-orange-700' : 'text-gray-600'}`}
            >
              {block.content}
            </div>
          </div>
        );
    }
  };

  return (
    <div className='flex h-full w-full bg-[#FAF8F4] text-[#171717] font-sans overflow-hidden'>
      {/* ĐÃ XÓA LEFT SIDEBAR BỊ TRÙNG Ở ĐÂY */}

      {/* 1. MAIN WORKSPACE (SPLIT VIEW) */}
      <main className='flex-1 flex flex-col bg-[#F3F1EB] relative min-w-0'>
        {/* Toolbar */}
        <div className='h-12 bg-white border-b border-[#E7E7E7] flex items-center justify-between px-4 shadow-sm z-10 shrink-0'>
          <div className='flex items-center gap-3'>
            <span className='text-[10px] font-bold text-gray-400 uppercase'>Insert</span>
            <div className='flex gap-1 border-l border-gray-200 pl-3'>
              <button className='p-1 text-gray-500 hover:bg-gray-100 rounded'>
                <LayoutGrid className='w-3.5 h-3.5' />
              </button>
              <button className='p-1 text-gray-500 hover:bg-gray-100 rounded'>
                <PlaySquare className='w-3.5 h-3.5' />
              </button>
              <button className='p-1 text-gray-500 hover:bg-gray-100 rounded'>
                <MessageSquare className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1 text-[11px] text-emerald-600 font-medium'>
              <Check className='w-3.5 h-3.5' /> Saved
            </div>

            {/* Nút bật/tắt AI Breakdown */}
            <button
              onClick={() => setShowAIBreakdown(!showAIBreakdown)}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg ml-1 transition-colors shadow-sm ${
                showAIBreakdown
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
              }`}
            >
              <Wand2 className='w-3.5 h-3.5' />{' '}
              {showAIBreakdown ? 'Đóng AI Breakdown' : 'AI Breakdown'}
            </button>
          </div>
        </div>

        {/* Content Area (Split Logic) */}
        <div className='flex-1 flex flex-row overflow-hidden min-w-0'>
          {/* Ô 1: Trình soạn thảo kịch bản thô của Biên kịch */}
          <div
            className={`flex flex-col h-full transition-all duration-300 ${
              showAIBreakdown
                ? 'w-1/2 border-r border-[#E7E7E7] bg-white'
                : 'w-full max-w-3xl mx-auto my-6 bg-white shadow-xl rounded-md border border-gray-200'
            }`}
          >
            <div
              className={`px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 ${showAIBreakdown ? '' : 'rounded-t-md'}`}
            >
              <span className='text-xs font-bold text-gray-700'>Script Editor (Bản thô)</span>
            </div>
            <textarea
              className='flex-1 w-full p-6 lg:p-8 resize-none focus:outline-none text-[13px] text-gray-800 leading-relaxed custom-scrollbar'
              placeholder='Viết kịch bản của bạn vào đây...'
              value={rawScript}
              onChange={(e) => setRawScript(e.target.value)}
            />
          </div>

          {/* Ô 2: Hiển thị kết quả AI Breakdown (Chỉ hiện khi bấm nút) */}
          {showAIBreakdown && (
            <div className='w-1/2 h-full flex flex-col bg-[#F8F6F0]'>
              <div className='px-6 py-3 border-b border-[#E7E7E7] bg-white flex items-center justify-between shadow-sm'>
                <span className='text-xs font-bold text-purple-700 flex items-center gap-1.5'>
                  <Bot className='w-4 h-4' /> AI Structured Output
                </span>
                <button className='text-[10px] font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-200 transition-colors'>
                  Áp dụng cấu trúc
                </button>
              </div>
              <div className='flex-1 overflow-y-auto p-6 custom-scrollbar'>
                <div className='w-full bg-white shadow-sm rounded-md border border-gray-200 px-6 py-8'>
                  {blocks.map(renderBlock)}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 2. RIGHT SIDEBAR - SCRIPT OUTLINE */}
      <aside className='w-56 flex flex-col border-l border-[#E7E7E7] bg-white shrink-0 z-20'>
        <div className='p-3 border-b border-[#E7E7E7] flex items-center gap-2'>
          <Layers className='w-3.5 h-3.5 text-gray-500' />
          <h2 className='text-xs font-bold font-display text-gray-800'>Script Outline</h2>
        </div>
        <div className='flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar'>
          <div>
            <h3 className='text-[10px] font-bold text-gray-900 mb-2'>EXT. NEO TOKYO - NIGHT</h3>
            <div className='pl-2 space-y-1 border-l-2 border-gray-100'>
              <div className='px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 rounded cursor-pointer'>
                Page 1 • Panel 1
              </div>
            </div>
          </div>
          <div>
            <h3 className='text-[10px] font-bold text-gray-900 mb-2'>INT. COMMAND CENTER</h3>
            <div className='pl-2 space-y-1 border-l-2 border-gray-100'>
              <div className='px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 rounded cursor-pointer'>
                Page 1 • Panel 2
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
