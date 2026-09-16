import React, { useState } from 'react';

export default function ArtistWorkspace() {
  const [versions, setVersions] = useState(['V1 - Sketch', 'V2 - Lineart']);

  return (
    <div className='flex flex-col h-full bg-gray-50 text-gray-800'>
      <div className='flex justify-between items-center p-4 border-b bg-white shadow-sm'>
        <h2 className='text-xl font-bold'>Artist Workspace</h2>
        <button className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'>
          Hoàn thành Task
        </button>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* Script & Series Bible Reference */}
        <div className='w-1/3 p-4 border-r bg-white overflow-y-auto'>
          <h3 className='font-semibold mb-2'>Kịch bản & Yêu cầu</h3>
          <div className='p-3 bg-yellow-50 border border-yellow-200 rounded mb-4 text-sm'>
            <strong>Panel 1:</strong> Bầu trời đêm, nhân vật chính đứng trên vách đá.
            <br />
            <br />
            <em>*Tham khảo Series Bible: Áo choàng màu đỏ đô, mắt xanh lá.</em>
          </div>
        </div>

        {/* Asset Uploader & Version Control */}
        <div className='w-2/3 p-4 flex flex-col bg-gray-50'>
          <h3 className='font-semibold mb-2'>Asset Uploader & Layout</h3>

          <div className='flex-1 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white mb-4 hover:bg-gray-50 transition cursor-pointer'>
            <div className='text-center text-gray-500'>
              <p>Kéo thả file ảnh hoặc Click để tải lên</p>
              <p className='text-xs mt-1'>(Hỗ trợ JPG, PNG, PSD)</p>
            </div>
          </div>

          <div className='bg-white p-4 border rounded shadow-sm h-48 overflow-y-auto'>
            <h4 className='font-semibold text-sm mb-2'>Version Control</h4>
            <ul className='space-y-2'>
              {versions.map((ver, idx) => (
                <li
                  key={idx}
                  className='flex justify-between items-center p-2 bg-gray-100 rounded text-sm'
                >
                  <span>{ver}</span>
                  <span className='text-xs px-2 py-1 bg-green-200 text-green-800 rounded'>
                    Đã lưu
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
