import React, { useState } from 'react';
import {
  Wand2,
  Send,
  Clapperboard,
  MessageSquare,
  AlignLeft,
  Link as LinkIcon,
  User,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
} from 'lucide-react';

// Định nghĩa kiểu dữ liệu cho các Block sau khi AI phân rã
type BlockType = 'scene' | 'action' | 'dialogue';

interface ScriptBlock {
  id: string;
  type: BlockType;
  content: string;
  character?: string;
  linkedEntityId?: string;
}

export default function WriterWorkspace() {
  const [script, setScript] = useState(
    'Cảnh 1: Bầu trời đêm tĩnh lặng.\n\nCon thú này ngoài thân kim quang lấp lánh, hình thể nhanh chóng cuồng trướng, trong nháy mắt liền biến lớn hơn một trượng, răng nanh lộ ra ngoài, trên người hiện ra từng đạo hoa văn đen tuyền quỷ dị, trên đầu cũng mọc ra một đôi sừng bạc dài cỡ vài tấc.\n\nTa sẽ không bao giờ bỏ cuộc!\n\nNgươi nghĩ ngươi có thể trốn thoát sao?',
  );

  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Danh sách nhân vật (Mock data từ Series Bible)
  const canonCharacters = [
    { id: 'V-1', name: 'Main Hero (Kenji)' },
    { id: 'V-2', name: 'Narrator' },
    { id: 'V-3', name: 'Villain (Kuro)' },
    { id: 'V-4', name: 'Mysterious Beast' },
  ];

  const handleAIBreakdown = () => {
    if (!script.trim()) return;

    setIsAnalyzing(true);

    // Giả lập độ trễ của AI (1.5 giây)
    setTimeout(() => {
      setBlocks([
        {
          id: 'b1',
          type: 'scene',
          content: 'SCENE 1: BẦU TRỜI ĐÊM TĨNH LẶNG',
        },
        {
          id: 'b2',
          type: 'action',
          content:
            'Con thú này ngoài thân kim quang lấp lánh, hình thể nhanh chóng cuồng trướng, trong nháy mắt liền biến lớn hơn một trượng, răng nanh lộ ra ngoài, trên người hiện ra từng đạo hoa văn đen tuyền quỷ dị, trên đầu cũng mọc ra một đôi sừng bạc dài cỡ vài tấc.',
        },
        {
          id: 'b3',
          type: 'dialogue',
          content: 'Ta sẽ không bao giờ bỏ cuộc!',
          character: 'Main Hero (Kenji)',
          linkedEntityId: 'V-1',
        },
        {
          id: 'b4',
          type: 'dialogue',
          content: 'Ngươi nghĩ ngươi có thể trốn thoát sao?',
          character: 'Villain (Kuro)',
          linkedEntityId: 'V-3',
        },
      ]);
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleLinkEntity = (blockId: string, entityId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, linkedEntityId: entityId } : b)),
    );
  };

  return (
    <div className='flex flex-col h-full bg-[#F8F6F0] text-[#171717] font-sans'>
      {/* --- HEADER --- */}
      <div className='flex justify-between items-center px-6 py-4 border-b border-[#E7E7E7] bg-white shrink-0 shadow-xs'>
        <div>
          <h2 className='text-xl font-bold font-display tracking-tight text-[#171717]'>
            Writer Workspace
          </h2>
          <p className='text-xs text-[#888888] font-mono mt-0.5'>
            Block-based Script & Entity Linking
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={handleAIBreakdown}
            disabled={isAnalyzing}
            className='px-4 py-2 bg-[#F3E8FF] text-[#6D28D9] border border-[#8B5CF6]/30 font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-[#E9D5FF] transition-all disabled:opacity-70 shadow-sm cursor-pointer'
          >
            {isAnalyzing ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Wand2 className='w-4 h-4' />
            )}
            <span>{isAnalyzing ? 'Đang phân tích...' : 'AI Breakdown'}</span>
          </button>
          <button className='px-4 py-2 bg-[#171717] text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-black transition-all shadow-sm cursor-pointer active:scale-95'>
            <Send className='w-4 h-4' />
            <span>Submit to Editor</span>
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className='flex flex-1 overflow-hidden p-4 md:p-6 gap-6'>
        {/* LEFT PANE: Raw Script Editor */}
        <div className='w-1/2 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <AlignLeft className='w-4 h-4 text-[#888888]' />
              Raw Script Editor (Thô)
            </h3>
            {/* Mock Rich Text Toolbar */}
            <div className='flex items-center gap-1 text-[#888888]'>
              <button className='p-1.5 hover:bg-[#E7E7E7] rounded cursor-pointer'>
                <Bold className='w-3.5 h-3.5' />
              </button>
              <button className='p-1.5 hover:bg-[#E7E7E7] rounded cursor-pointer'>
                <Italic className='w-3.5 h-3.5' />
              </button>
              <button className='p-1.5 hover:bg-[#E7E7E7] rounded cursor-pointer'>
                <Underline className='w-3.5 h-3.5' />
              </button>
              <div className='w-px h-4 bg-[#E7E7E7] mx-1'></div>
              <button className='p-1.5 hover:bg-[#E7E7E7] rounded cursor-pointer'>
                <List className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
          <textarea
            className='flex-1 w-full p-5 resize-none focus:outline-none text-[15px] leading-relaxed text-[#333333] custom-scrollbar placeholder-[#AAAAAA]'
            placeholder='Bắt đầu viết kịch bản của bạn tại đây...'
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </div>

        {/* RIGHT PANE: Structured Panels & Entity Linking */}
        <div className='w-1/2 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <Clapperboard className='w-4 h-4 text-[#F97316]' />
              Structured Panels & Entity Linking
            </h3>
            <span className='text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E7E7E7] text-[#888888]'>
              {blocks.length} Blocks
            </span>
          </div>

          <div className='flex-1 overflow-y-auto p-5 bg-[#F3F1EB] custom-scrollbar'>
            {blocks.length === 0 ? (
              <div className='h-full flex flex-col items-center justify-center text-center opacity-60'>
                <Wand2 className='w-10 h-10 text-[#888888] mb-3' />
                <p className='text-sm text-[#555555] font-medium'>Kịch bản chưa được phân rã</p>
                <p className='text-xs text-[#888888] mt-1 max-w-xs'>
                  Nhấn nút "AI Breakdown" để hệ thống tự động bóc tách kịch bản thô thành các Scene
                  và Panel cấu trúc.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`bg-white rounded-lg border border-[#E7E7E7] shadow-xs overflow-hidden transition-all hover:shadow-md ${
                      block.type === 'scene'
                        ? 'border-l-4 border-l-[#171717]'
                        : block.type === 'dialogue'
                          ? 'border-l-4 border-l-[#F97316]'
                          : 'border-l-4 border-l-[#0EA5E9]'
                    }`}
                  >
                    {/* Block Header */}
                    <div className='flex items-center gap-2 px-3 py-2 border-b border-[#F8F6F0] bg-[#FAFAFA]'>
                      {block.type === 'scene' && (
                        <Clapperboard className='w-3.5 h-3.5 text-[#171717]' />
                      )}
                      {block.type === 'action' && (
                        <AlignLeft className='w-3.5 h-3.5 text-[#0EA5E9]' />
                      )}
                      {block.type === 'dialogue' && (
                        <MessageSquare className='w-3.5 h-3.5 text-[#F97316]' />
                      )}
                      <span className='text-[10px] font-bold font-mono uppercase tracking-wider text-[#555555]'>
                        {block.type} BLOCK
                      </span>
                    </div>

                    {/* Block Content */}
                    <div className='p-3.5'>
                      <p
                        className={`text-sm text-[#171717] leading-relaxed ${block.type === 'scene' ? 'font-bold font-display uppercase' : block.type === 'action' ? 'italic text-[#555555]' : ''}`}
                      >
                        {block.content}
                      </p>
                    </div>

                    {/* Entity Linking (Chỉ hiện cho Dialogue) */}
                    {block.type === 'dialogue' && (
                      <div className='px-3.5 py-2.5 bg-[#FFFBEB] border-t border-[#F59E0B]/20 flex items-center justify-between'>
                        <div className='flex items-center gap-1.5 text-xs font-semibold text-[#D97706]'>
                          <LinkIcon className='w-3.5 h-3.5' />
                          Entity Linking:
                        </div>
                        <div className='relative flex items-center'>
                          <User className='w-3.5 h-3.5 text-[#888888] absolute left-2' />
                          <select
                            className='pl-7 pr-8 py-1.5 bg-white border border-[#FDBA74] rounded-md text-xs font-medium text-[#171717] outline-none focus:ring-2 focus:ring-[#F97316]/20 cursor-pointer shadow-sm appearance-none'
                            value={block.linkedEntityId || ''}
                            onChange={(e) => handleLinkEntity(block.id, e.target.value)}
                          >
                            <option value='' disabled>
                              -- Chọn nhân vật (Series Bible) --
                            </option>
                            {canonCharacters.map((char) => (
                              <option key={char.id} value={char.id}>
                                [{char.id}] {char.name}
                              </option>
                            ))}
                          </select>
                          {/* Mũi tên giả cho select */}
                          <div className='absolute right-2 pointer-events-none text-[#888888] text-[10px]'>
                            ▼
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
