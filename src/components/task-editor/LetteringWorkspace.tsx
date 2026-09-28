import React, { useState } from 'react';
import { MessageCircle, Type, MousePointer2, AlignLeft, Bold, Italic, Trash2 } from 'lucide-react';

interface LetteringWorkspaceProps {
  isReadOnly?: boolean;
}

interface Balloon {
  id: string;
  x: number;
  y: number;
  text: string;
}

export const LetteringWorkspace: React.FC<LetteringWorkspaceProps> = ({ isReadOnly }) => {
  const [balloons, setBalloons] = useState<Balloon[]>([
    { id: 'b1', x: 20, y: 15, text: 'They are moving.' },
    { id: 'b2', x: 60, y: 35, text: 'Get ready.' },
  ]);
  const [selectedBalloon, setSelectedBalloon] = useState<string | null>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    if ((e.target as HTMLElement).closest('.speech-balloon')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setBalloons((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        x,
        y,
        text: 'New Dialogue...',
      },
    ]);
  };

  const updateBalloonText = (id: string, text: string) => {
    setBalloons((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  };

  const deleteBalloon = (id: string) => {
    setBalloons((prev) => prev.filter((b) => b.id !== id));
    setSelectedBalloon(null);
  };

  return (
    <div className='flex-1 flex flex-col md:flex-row bg-[#FAF8F4] overflow-hidden'>
      {/* Left Panel: Toolbar & Canvas */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Toolbar */}
        <div className='h-12 bg-white border-b border-[#E7E7E7] px-4 flex items-center gap-2'>
          <div className='flex items-center gap-1 bg-[#F3F3F3] p-1 rounded'>
            <button className='p-1.5 bg-white shadow-sm rounded text-[#171717]'>
              <MousePointer2 className='w-4 h-4' />
            </button>
            <button
              disabled={isReadOnly}
              className='p-1.5 text-[#737373] hover:text-[#171717] rounded disabled:opacity-50'
            >
              <MessageCircle className='w-4 h-4' />
            </button>
            <button
              disabled={isReadOnly}
              className='p-1.5 text-[#737373] hover:text-[#171717] rounded disabled:opacity-50'
            >
              <Type className='w-4 h-4' />
            </button>
          </div>
          <div className='w-px h-6 bg-[#D4D4D4] mx-2'></div>
          <div className='flex items-center gap-1'>
            <button
              disabled={isReadOnly}
              className='p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F3F3F3] rounded disabled:opacity-50'
            >
              <AlignLeft className='w-4 h-4' />
            </button>
            <button
              disabled={isReadOnly}
              className='p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F3F3F3] rounded disabled:opacity-50'
            >
              <Bold className='w-4 h-4' />
            </button>
            <button
              disabled={isReadOnly}
              className='p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F3F3F3] rounded disabled:opacity-50'
            >
              <Italic className='w-4 h-4' />
            </button>
          </div>
          <div className='ml-auto'>
            {isReadOnly && (
              <span className='px-2 py-1 bg-[#F3F3F3] text-[#737373] text-[10px] font-bold rounded uppercase'>
                Read-Only
              </span>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className='flex-1 p-6 overflow-auto flex items-center justify-center bg-[#E0E0E0] shadow-inner relative'>
          <div
            className={`w-[600px] h-[800px] bg-white shadow-2xl relative ${isReadOnly ? '' : 'cursor-crosshair'}`}
            onClick={handleCanvasClick}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          >
            <div className='absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none'>
              <span className='font-display text-4xl font-black uppercase tracking-[1em] mb-4'>
                Artwork
              </span>
              <span className='font-mono text-xl'>(Placeholder)</span>
            </div>

            {/* Balloons */}
            {balloons.map((b) => (
              <div
                key={b.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBalloon(b.id);
                }}
                className={`speech-balloon absolute min-w-[120px] max-w-[250px] p-4 bg-white border-2 rounded-3xl cursor-move transition-shadow ${
                  selectedBalloon === b.id
                    ? 'border-[#10B981] shadow-[0_0_0_4px_rgba(16,185,129,0.2)] z-10'
                    : 'border-[#171717] hover:border-[#10B981]'
                }`}
                style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <textarea
                  value={b.text}
                  onChange={(e) => updateBalloonText(b.id, e.target.value)}
                  readOnly={isReadOnly}
                  className='w-full bg-transparent text-center font-bold text-sm text-[#171717] resize-none focus:outline-none'
                  rows={2}
                />
                {/* Balloon tail indicator */}
                <div className='absolute -bottom-[10px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-[#171717] rotate-45'></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Properties */}
      <div className='w-full md:w-[280px] shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col'>
        <div className='p-4 border-b border-[#E7E7E7] flex items-center gap-2'>
          <Type className='w-4 h-4 text-[#10B981]' />
          <h4 className='font-bold text-sm uppercase tracking-wider text-[#171717]'>
            Text Properties
          </h4>
        </div>

        {selectedBalloon ? (
          <div className='p-4 space-y-6'>
            <div>
              <h5 className='text-[10px] font-bold text-[#A3A3A3] uppercase mb-3'>Font Settings</h5>
              <div className='space-y-3 text-sm'>
                <div>
                  <label className='block text-xs font-semibold text-[#555] mb-1'>
                    Font Family
                  </label>
                  <select
                    disabled={isReadOnly}
                    className='w-full border border-[#D4D4D4] rounded p-1.5 bg-[#F8F6F0] outline-none disabled:opacity-50'
                  >
                    <option>Anime Ace</option>
                    <option>Wild Words</option>
                    <option>CC Wild Words</option>
                  </select>
                </div>
                <div>
                  <label className='block text-xs font-semibold text-[#555] mb-1'>Font Size</label>
                  <input
                    type='number'
                    disabled={isReadOnly}
                    defaultValue={14}
                    className='w-full border border-[#D4D4D4] rounded p-1.5 bg-[#F8F6F0] outline-none disabled:opacity-50'
                  />
                </div>
              </div>
            </div>

            <div>
              <h5 className='text-[10px] font-bold text-[#A3A3A3] uppercase mb-3'>Balloon Type</h5>
              <div className='grid grid-cols-2 gap-2'>
                <button
                  disabled={isReadOnly}
                  className='py-2 border-2 border-[#10B981] bg-[#ECFCCB] text-[#4D7C0F] text-xs font-bold rounded-full disabled:opacity-50'
                >
                  Speech
                </button>
                <button
                  disabled={isReadOnly}
                  className='py-2 border border-[#D4D4D4] bg-[#F8F6F0] text-[#737373] hover:text-[#171717] text-xs font-bold rounded-lg disabled:opacity-50'
                >
                  Thought
                </button>
                <button
                  disabled={isReadOnly}
                  className='py-2 border border-[#D4D4D4] bg-[#F8F6F0] text-[#737373] hover:text-[#171717] text-xs font-bold rounded-none disabled:opacity-50'
                >
                  Caption
                </button>
                <button
                  disabled={isReadOnly}
                  className='py-2 border border-[#D4D4D4] bg-[#F8F6F0] text-[#737373] hover:text-[#171717] text-xs font-bold rounded-[30px] star-burst disabled:opacity-50'
                >
                  Shout
                </button>
              </div>
            </div>

            {!isReadOnly && (
              <div className='pt-4 border-t border-[#E7E7E7]'>
                <button
                  onClick={() => deleteBalloon(selectedBalloon)}
                  className='w-full py-2 flex items-center justify-center gap-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] rounded text-xs font-bold transition-colors'
                >
                  <Trash2 className='w-4 h-4' /> Delete Element
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className='p-4 text-center text-sm text-[#A3A3A3]'>
            Select a speech balloon on the canvas to edit its properties.
          </div>
        )}
      </div>
    </div>
  );
};
