import React from 'react';
import { MangaProject } from '../types';
import { ArrowLeft, Users, FileText } from 'lucide-react';

export const ProjectDetailView: React.FC<{ project: MangaProject; onBack: () => void }> = ({
  project,
  onBack,
}) => {
  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8'>
      <button
        onClick={onBack}
        className='flex items-center gap-2 text-xs font-semibold text-[#555555] hover:text-[#171717] mb-6'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại danh sách
      </button>

      <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs mb-6'>
        <h1 className='text-3xl font-serif font-bold text-[#171717]'>{project.title}</h1>
        <div className='mt-4 flex gap-4 text-sm'>
          <div className='flex-1 space-y-2'>
            <p>
              <span className='font-semibold text-[#737373]'>Thể loại:</span>{' '}
              {project.genres?.join(', ')}
            </p>
            <p>
              <span className='font-semibold text-[#737373]'>Nhân vật chính:</span> Đang cập nhật...
            </p>
            <p>
              <span className='font-semibold text-[#737373]'>Cốt truyện:</span> {project.tagline}
            </p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Danh sách chương */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
          <h2 className='text-lg font-bold flex items-center gap-2 border-b border-[#E7E7E7] pb-3 mb-3'>
            <FileText className='w-5 h-5 text-[#F97316]' /> Danh sách chương
          </h2>
          <div className='space-y-2'>
            <div className='p-3 border border-[#E7E7E7] rounded-lg text-sm flex justify-between hover:border-[#F97316] cursor-pointer'>
              <span className='font-semibold'>Chương 1: Khởi đầu</span>
              <span className='text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded'>
                Hoàn thành
              </span>
            </div>
            <div className='p-3 border border-[#E7E7E7] rounded-lg text-sm flex justify-between hover:border-[#F97316] cursor-pointer'>
              <span className='font-semibold'>Chương 2: Thức tỉnh</span>
              <span className='text-xs bg-[#FFF7ED] text-[#F97316] px-2 py-1 rounded'>
                Đang thực hiện
              </span>
            </div>
          </div>
        </div>

        {/* Thành viên */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
          <h2 className='text-lg font-bold flex items-center gap-2 border-b border-[#E7E7E7] pb-3 mb-3'>
            <Users className='w-5 h-5 text-[#F97316]' /> Đội ngũ thực hiện
          </h2>
          <ul className='space-y-3 text-sm'>
            <li className='flex justify-between items-center'>
              <span>Nguyễn Văn A</span>
              <span className='text-xs text-[#737373] border px-2 py-0.5 rounded'>Biên kịch</span>
            </li>
            <li className='flex justify-between items-center'>
              <span>Trần Thị B</span>
              <span className='text-xs text-[#737373] border px-2 py-0.5 rounded'>
                Họa sĩ chính
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
