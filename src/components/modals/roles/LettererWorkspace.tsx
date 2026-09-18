import React, { useState } from 'react';
import {
  MessageCircle,
  Type,
  AlertTriangle,
  Check,
  Send,
  MousePointer2,
  Move,
  Square,
  Zap,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  Link2,
  Link2Off,
} from 'lucide-react';

// Mock data cho Script Binding
const SCRIPT_LINES = [
  {
    id: 'l1',
    type: 'dialogue',
    character: 'Main Hero',
    text: 'Ta sẽ không bao giờ bỏ cuộc!',
    status: 'bound',
    overflow: false,
  },
  {
    id: 'l2',
    type: 'dialogue',
    character: 'Villain',
    text: 'Ngươi nghĩ ngươi có thể trốn thoát sao? Vô ích thôi, bóng tối sẽ nuốt chửng tất cả những kẻ ngáng đường ta!',
    status: 'bound',
    overflow: true,
  }, // Dòng này cố tình làm dài để test overflow
  { id: 'l3', type: 'sfx', character: 'SFX', text: 'RẦM!!!', status: 'unbound', overflow: false },
  {
    id: 'l4',
    type: 'narration',
    character: 'Narrator',
    text: 'Cùng lúc đó, tại phế tích ngầm...',
    status: 'unbound',
    overflow: false,
  },
];

export default function LettererWorkspace() {
  const [activeTool, setActiveTool] = useState('pointer');

  return (
    <div className='flex flex-col h-full bg-[#F8F6F0] text-[#171717] font-sans'>
      {/* --- HEADER --- */}
      <div className='flex justify-between items-center px-6 py-4 border-b border-[#E7E7E7] bg-white shrink-0 shadow-xs'>
        <div>
          <h2 className='text-xl font-bold font-display tracking-tight text-[#171717]'>
            Letterer Workspace
          </h2>
          <p className='text-xs text-[#888888] font-mono mt-0.5'>Balloon Placement & Typography</p>
        </div>
        <div className='flex items-center gap-3'>
          <button className='px-4 py-2 bg-white border border-[#E7E7E7] text-[#171717] font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-[#F3F1EB] transition-all shadow-sm cursor-pointer'>
            <Settings2 className='w-4 h-4' />
            <span>Preset Styles</span>
          </button>
          <button className='px-4 py-2 bg-[#171717] text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-black transition-all shadow-sm cursor-pointer active:scale-95'>
            <Send className='w-4 h-4' />
            <span>Submit to Editor</span>
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT (2 COLUMNS) --- */}
      <div className='flex flex-1 overflow-hidden p-4 md:p-6 gap-5'>
        {/* COL 1: TEXT-TO-BALLOON BINDING PANEL */}
        <div className='w-1/3 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7] flex justify-between items-center'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <Type className='w-4 h-4 text-[#8B5CF6]' />
              Script Binding Panel
            </h3>
            <span className='text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E7E7E7] text-[#888888]'>
              Page 15
            </span>
          </div>

          <div className='flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F3F1EB]'>
            {SCRIPT_LINES.map((line) => (
              <div
                key={line.id}
                className={`p-3 rounded-lg border shadow-xs transition-all ${
                  line.overflow
                    ? 'bg-[#FEF2F2] border-[#DC2626] ring-1 ring-[#DC2626]/20'
                    : line.status === 'bound'
                      ? 'bg-white border-[#10B981] border-l-4'
                      : 'bg-white border-[#E7E7E7] hover:border-[#171717]'
                }`}
              >
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-[10px] font-mono font-bold text-[#888888] uppercase flex items-center gap-1'>
                    {line.type === 'dialogue' && <MessageCircle className='w-3 h-3' />}
                    {line.type === 'sfx' && <Zap className='w-3 h-3' />}
                    {line.type === 'narration' && <Square className='w-3 h-3' />}
                    {line.character}
                  </span>

                  {/* Binding Status Badge */}
                  {line.status === 'bound' ? (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider ${line.overflow ? 'bg-[#DC2626] text-white' : 'bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30'}`}
                    >
                      {line.overflow ? (
                        <AlertTriangle className='w-3 h-3' />
                      ) : (
                        <Link2 className='w-3 h-3' />
                      )}
                      {line.overflow ? 'Tràn chữ!' : 'Linked'}
                    </span>
                  ) : (
                    <span className='text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F8F6F0] text-[#888888] border border-[#E7E7E7] flex items-center gap-1 uppercase tracking-wider'>
                      <Link2Off className='w-3 h-3' /> Unbound
                    </span>
                  )}
                </div>

                <p
                  className={`text-sm leading-relaxed ${line.overflow ? 'text-[#DC2626] font-medium' : 'text-[#171717]'}`}
                >
                  {line.text}
                </p>

                {/* Cảnh báo chi tiết nếu bị tràn chữ */}
                {line.overflow && (
                  <div className='mt-2 pt-2 border-t border-[#FCA5A5] text-[10px] text-[#DC2626] font-semibold flex items-start gap-1.5'>
                    <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
                    <span>
                      Lỗi: Kích thước text vượt quá ranh giới bong bóng (Balloon). Vui lòng giảm
                      font-size hoặc đổi dáng bong bóng.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COL 2: LETTERING WORKSPACE (CANVAS) */}
        <div className='w-2/3 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          {/* Canvas Toolbar */}
          <div className='px-4 py-2.5 bg-white border-b border-[#E7E7E7] flex flex-wrap items-center justify-between gap-3 shadow-xs z-10'>
            {/* Tools */}
            <div className='flex items-center bg-[#F8F6F0] p-1 rounded-md border border-[#E7E7E7]'>
              <button
                onClick={() => setActiveTool('pointer')}
                className={`p-1.5 rounded cursor-pointer ${activeTool === 'pointer' ? 'bg-white shadow-sm text-[#171717]' : 'text-[#888888] hover:text-[#171717]'}`}
                title='Select/Move'
              >
                <MousePointer2 className='w-4 h-4' />
              </button>
              <button
                onClick={() => setActiveTool('balloon')}
                className={`p-1.5 rounded cursor-pointer ${activeTool === 'balloon' ? 'bg-white shadow-sm text-[#171717]' : 'text-[#888888] hover:text-[#171717]'}`}
                title='Speech Balloon'
              >
                <MessageCircle className='w-4 h-4' />
              </button>
              <button
                onClick={() => setActiveTool('narration')}
                className={`p-1.5 rounded cursor-pointer ${activeTool === 'narration' ? 'bg-white shadow-sm text-[#171717]' : 'text-[#888888] hover:text-[#171717]'}`}
                title='Narration Box'
              >
                <Square className='w-4 h-4' />
              </button>
              <button
                onClick={() => setActiveTool('sfx')}
                className={`p-1.5 rounded cursor-pointer ${activeTool === 'sfx' ? 'bg-white shadow-sm text-[#171717]' : 'text-[#888888] hover:text-[#171717]'}`}
                title='SFX Tool'
              >
                <Zap className='w-4 h-4' />
              </button>
            </div>

            <div className='w-px h-6 bg-[#E7E7E7]'></div>

            {/* Typography Formatting */}
            <div className='flex items-center gap-2'>
              <select className='text-xs font-medium border border-[#E7E7E7] rounded p-1.5 outline-none focus:border-[#F97316] bg-white cursor-pointer'>
                <option>Manga Wild</option>
                <option>Comic Sans Pro</option>
                <option>Anime Ace</option>
              </select>
              <div className='flex items-center bg-[#F8F6F0] p-0.5 rounded border border-[#E7E7E7]'>
                <button className='p-1 hover:bg-white rounded text-[#171717] cursor-pointer'>
                  <AlignLeft className='w-3.5 h-3.5' />
                </button>
                <button className='p-1 bg-white shadow-sm rounded text-[#171717] cursor-pointer'>
                  <AlignCenter className='w-3.5 h-3.5' />
                </button>
                <button className='p-1 hover:bg-white rounded text-[#171717] cursor-pointer'>
                  <AlignRight className='w-3.5 h-3.5' />
                </button>
              </div>
              <div className='flex items-center gap-1 text-xs font-mono bg-[#F8F6F0] px-2 py-1 rounded border border-[#E7E7E7]'>
                <span className='text-[#888888]'>Size:</span>
                <input
                  type='number'
                  defaultValue={14}
                  className='w-10 bg-transparent outline-none text-center font-bold text-[#171717]'
                />
                <span className='text-[#888888]'>pt</span>
              </div>
            </div>
          </div>

          {/* Interactive Canvas Area */}
          <div className='flex-1 bg-[#E5E5E5] relative overflow-hidden flex items-center justify-center inset-shadow-sm cursor-crosshair'>
            {/* Manga Page Mock (B5 Size representation) */}
            <div className='w-[450px] h-[650px] bg-white shadow-lg relative border border-[#CCCCCC] bg-[url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNlN2U3ZTciIGZpbGwtb3BhY2l0eT0iMC40Ii8+PC9zdmc+")]'>
              {/* Giả lập đường viền vùng an toàn in ấn (Safe Area) */}
              <div className='absolute inset-4 border border-blue-300/50 pointer-events-none'></div>

              {/* Balloon 1: Normal */}
              <div className='absolute top-20 left-12 group cursor-move'>
                {/* Tail */}
                <div className='absolute -bottom-4 left-1/2 w-4 h-6 bg-white border-r-2 border-b-2 border-[#171717] transform -translate-x-1/2 rotate-45 z-0'></div>
                {/* Bubble */}
                <div className='relative z-10 bg-white border-2 border-[#171717] rounded-[50%] px-6 py-4 max-w-[200px] text-center shadow-sm group-hover:border-[#0EA5E9] group-hover:ring-2 group-hover:ring-[#0EA5E9]/20 transition-all'>
                  <p className='text-sm font-bold leading-tight text-[#171717]'>
                    Ta sẽ không bao giờ bỏ cuộc!
                  </p>
                </div>
                {/* Selection Box (Visible on hover) */}
                <div className='absolute -inset-2 border border-[#0EA5E9] border-dashed opacity-0 group-hover:opacity-100 pointer-events-none'>
                  <div className='absolute -top-1 -left-1 w-2 h-2 bg-[#0EA5E9]'></div>
                  <div className='absolute -bottom-1 -right-1 w-2 h-2 bg-[#0EA5E9]'></div>
                </div>
              </div>

              {/* Balloon 2: Warning Overflow */}
              <div className='absolute top-64 right-10 group cursor-move'>
                <div className='absolute -bottom-5 right-1/3 w-5 h-8 bg-white border-l-2 border-b-2 border-[#DC2626] transform rotate-[30deg] z-0'></div>
                <div className='relative z-10 bg-white border-2 border-[#DC2626] rounded-[40%] px-5 py-3 w-[180px] h-[100px] flex items-center justify-center text-center shadow-[0_0_15px_rgba(220,38,38,0.3)]'>
                  <p className='text-[13px] font-bold leading-tight text-[#DC2626]'>
                    Ngươi nghĩ ngươi có thể trốn thoát sao? Vô ích thôi, bóng...
                    <span className='bg-[#DC2626] text-white text-[9px] px-1 py-0.5 rounded ml-1 animate-pulse absolute -bottom-2 -right-2'>
                      + Tràn
                    </span>
                  </p>
                </div>
              </div>

              {/* Unbound Placeholder Marker */}
              <div className='absolute bottom-32 left-24 w-32 h-16 border-2 border-dashed border-[#888888] bg-[#F8F6F0]/50 rounded-lg flex items-center justify-center'>
                <p className='text-[10px] font-mono text-[#888888] font-bold uppercase'>
                  Kéo SFX vào đây
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
