import React from 'react';

export default function EditorWorkspace() {
  return (
    <div className='flex flex-col h-full bg-gray-50 text-gray-800'>
      <div className='flex justify-between items-center p-4 border-b bg-white shadow-sm'>
        <h2 className='text-xl font-bold'>Editor Workspace (QC)</h2>
        <div className='space-x-3'>
          <button className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition'>
            ✖ Reject (Yêu cầu sửa)
          </button>
          <button className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition'>
            ✔ Approve (Duyệt)
          </button>
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* A/B Compare Area */}
        <div className='w-3/4 p-4 flex flex-col bg-gray-200 border-r relative items-center justify-center'>
          <h3 className='absolute top-4 left-4 font-semibold text-gray-700'>
            A/B Compare (Slider Mode)
          </h3>

          {/* Mockup for image comparison */}
          <div className='w-full max-w-2xl h-96 bg-white border-4 border-gray-300 shadow flex items-center justify-center relative cursor-crosshair'>
            <div className='absolute inset-0 bg-blue-100 flex items-center justify-center opacity-50 border-r-2 border-black w-1/2'>
              <span className='text-gray-500 font-bold'>Bản Cũ (V1)</span>
            </div>
            <div className='absolute inset-0 bg-green-100 flex items-center justify-center opacity-50 left-1/2 w-1/2'>
              <span className='text-gray-500 font-bold'>Bản Mới (V2)</span>
            </div>

            {/* Mock Visual Annotation Pin */}
            <div className='absolute top-1/3 left-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2'></div>
          </div>
          <p className='mt-4 text-sm text-gray-500'>
            Click vào bất kỳ điểm nào trên ảnh để ghim bình luận (Visual Annotation).
          </p>
        </div>

        {/* Feedback & Annotations Sidebar */}
        <div className='w-1/4 p-4 bg-white overflow-y-auto'>
          <h3 className='font-semibold mb-4'>Feedback & Bình luận</h3>
          <div className='space-y-4'>
            <div className='p-3 bg-red-50 border border-red-200 rounded text-sm'>
              <div className='flex justify-between items-start mb-1'>
                <strong className='text-red-700'>Pin #1</strong>
                <span className='text-xs text-gray-500'>10 phút trước</span>
              </div>
              <p>
                Màu mắt của nhân vật đang là màu xanh dương, hãy đổi lại thành màu xanh lá theo
                Series Bible.
              </p>
            </div>
            <div className='p-3 bg-gray-50 border border-gray-200 rounded text-sm'>
              <textarea
                className='w-full p-2 border rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500'
                rows={3}
                placeholder='Thêm nhận xét chung...'
              ></textarea>
              <button className='mt-2 w-full py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700'>
                Gửi Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
