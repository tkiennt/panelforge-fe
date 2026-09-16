import React, { useState } from 'react';

export default function WriterWorkspace() {
  const [script, setScript] = useState('');
  const [panels, setPanels] = useState<{ id: number; content: string; character: string }[]>([]);

  const handleAIBreakdown = () => {
    // Giả lập AI phân rã kịch bản
    setPanels([
      { id: 1, content: 'Cảnh 1: Bầu trời đêm...', character: 'Narrator' },
      { id: 2, content: 'Ta sẽ không bao giờ bỏ cuộc!', character: 'Main Hero' },
    ]);
  };

  return (
    <div className='flex flex-col h-full bg-gray-50 text-gray-800'>
      <div className='flex justify-between items-center p-4 border-b bg-white shadow-sm'>
        <h2 className='text-xl font-bold'>Writer Workspace</h2>
        <div className='space-x-3'>
          <button
            onClick={handleAIBreakdown}
            className='px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition'
          >
            ✨ AI Breakdown
          </button>
          <button className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition'>
            Submit to Editor
          </button>
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* Script Editor */}
        <div className='w-1/2 p-4 flex flex-col border-r bg-white'>
          <h3 className='font-semibold mb-2'>Script Editor (Thô)</h3>
          <textarea
            className='flex-1 w-full p-3 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500'
            placeholder='Viết kịch bản theo định dạng (Scene, Action, Dialogue)...'
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </div>

        {/* AI Breakdown & Tagging */}
        <div className='w-1/2 p-4 overflow-y-auto bg-gray-50'>
          <h3 className='font-semibold mb-2'>Panels & Dialogue Tagging</h3>
          {panels.length === 0 ? (
            <p className='text-gray-500 italic'>Nhấn "AI Breakdown" để tự động chia Panel.</p>
          ) : (
            <div className='space-y-4'>
              {panels.map((panel) => (
                <div key={panel.id} className='p-4 bg-white border rounded shadow-sm'>
                  <p className='mb-3 text-sm'>{panel.content}</p>
                  <div className='flex items-center space-x-2'>
                    <label className='text-sm text-gray-600'>Nhân vật:</label>
                    <select className='border text-sm p-1 rounded'>
                      <option value='Narrator'>Narrator</option>
                      <option value='Main Hero'>Main Hero</option>
                      <option value='Villain'>Villain</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
