import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
} from 'lucide-react';

export const ReaderPortalView = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 24;

  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrev = () => setCurrentPage((p) => Math.max(p - 1, 1));

  return (
    <div className='w-full h-screen bg-[#171717] text-white flex flex-col overflow-hidden relative'>
      <div className='shrink-0 h-16 border-b border-[#333333] px-6 flex items-center justify-between z-10 bg-[#171717]/80 backdrop-blur-md'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate('/workspaces')}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#333333] transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div>
            <h2 className='text-sm font-bold'>Cyberpunk 2077: Neo Tokyo</h2>
            <p className='text-[10px] text-[#A3A3A3] uppercase tracking-wider font-bold'>
              Arc 02 - Chapter 5 (Reading Mode)
            </p>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2 text-sm text-[#A3A3A3] font-mono'>
            <span>{currentPage}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className='p-2 border border-[#333333] rounded hover:bg-[#333333] disabled:opacity-50'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className='p-2 border border-[#333333] rounded hover:bg-[#333333] disabled:opacity-50'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      <div className='flex-1 flex overflow-hidden'>
        {/* Lớp Reader */}
        <div className='flex-1 flex items-center justify-center p-8 bg-black relative'>
          <div className='h-full aspect-[2/3] bg-white relative flex items-center justify-center shadow-2xl'>
            {/* Giả lập ảnh */}
            <div className='text-[#A3A3A3] flex flex-col items-center gap-2'>
              <BookOpen className='w-12 h-12 opacity-20' />
              <span className='font-mono text-sm'>Page {currentPage}</span>
            </div>

            {/* Watermark in page */}
            <div className='absolute inset-0 pointer-events-none flex flex-col justify-between p-4 opacity-30'>
              <span className='text-[10px] text-black font-bold font-mono'>ID: READ-89A2-XYZ</span>
              <span className='text-[10px] text-black font-bold font-mono self-end'>
                CONFIDENTIAL
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Feedback */}
        <div className='w-[320px] bg-[#171717] border-l border-[#333333] flex flex-col z-10'>
          <div className='p-4 border-b border-[#333333] flex items-center gap-2'>
            <MessageSquare className='w-4 h-4 text-[#F97316]' />
            <span className='text-sm font-bold uppercase tracking-wider'>Reader Feedback</span>
          </div>

          <div className='p-4 flex-1 overflow-y-auto'>
            <div className='bg-[#FEF2F2]/10 border border-[#EF4444]/20 rounded-lg p-3 flex gap-3 mb-6'>
              <ShieldAlert className='w-5 h-5 text-[#EF4444] shrink-0' />
              <p className='text-xs text-[#D4D4D4] leading-relaxed'>
                Liên kết này sẽ tự hủy sau 48 giờ. Mọi hành vi chụp màn hình hoặc chia sẻ sẽ bị ghi
                nhận qua mã định danh nội bộ.
              </p>
            </div>

            <form className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-[#A3A3A3] mb-1.5 uppercase'>
                  Đánh giá tổng quan
                </label>
                <select className='w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]'>
                  <option>Rất tốt (Approved)</option>
                  <option>Cần chỉnh sửa (Needs Work)</option>
                  <option>Không đạt (Rejected)</option>
                </select>
              </div>

              <div>
                <label className='block text-xs font-bold text-[#A3A3A3] mb-1.5 uppercase'>
                  Bình luận cho trang {currentPage}
                </label>
                <textarea
                  rows={4}
                  placeholder='Góp ý về lời thoại, nhịp độ, nét vẽ...'
                  className='w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316] custom-scrollbar'
                />
              </div>

              <button
                type='button'
                className='w-full py-2.5 bg-[#F97316] text-white font-bold rounded hover:bg-[#EA580C] transition-colors'
              >
                Gửi phản hồi
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
