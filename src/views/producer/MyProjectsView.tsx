import React, { useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { MangaProject } from '../../types'; // Đã sửa đường dẫn types
import { CreateProjectModal } from './CreateProjectModal'; // Đã sửa đường dẫn import modal

interface MyProjectsViewProps {
  projects: MangaProject[];
  onNavigateToDetail: (project: MangaProject) => void;
}

export const MyProjectsView: React.FC<MyProjectsViewProps> = ({ projects, onNavigateToDetail }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Dự án của tôi
          </h1>
          <p className='text-xs text-[#737373]'>
            Quản lý tiến độ và danh sách các bộ truyện đang thực hiện.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs transition-all cursor-pointer'
        >
          <Plus className='w-4 h-4' />
          <span>Thêm bộ truyện mới</span>
        </button>
      </div>

      {/* Project Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
        {projects.map((proj) => (
          <div
            key={proj.id}
            onClick={() => onNavigateToDetail(proj)}
            className='bg-white p-5 rounded-2xl border border-[#E7E7E7] hover:border-[#F97316]/50 hover:shadow-md transition-all cursor-pointer group'
          >
            <div className='flex items-start justify-between mb-3'>
              <div className='w-10 h-10 bg-[#F8F6F0] rounded-xl flex items-center justify-center text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-colors'>
                <BookOpen className='w-5 h-5' />
              </div>
              <span className='text-[10px] font-mono font-bold bg-[#FFF7ED] text-[#F97316] px-2 py-1 rounded-md'>
                {proj.status}
              </span>
            </div>
            <h3 className='text-base font-bold text-[#171717] mb-1 truncate'>{proj.title}</h3>
            <p className='text-xs text-[#737373] mb-4 truncate'>{proj.genres?.join(', ')}</p>

            {/* Progress Bar */}
            <div className='space-y-1.5'>
              <div className='flex justify-between text-[11px] font-semibold text-[#555555]'>
                <span>Tiến độ</span>
                <span>{proj.progressPercent}%</span>
              </div>
              <div className='w-full bg-[#FAF8F5] h-1.5 rounded-full overflow-hidden border border-[#E7E7E7]'>
                <div
                  className='bg-[#F97316] h-full rounded-full'
                  style={{ width: `${proj.progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
