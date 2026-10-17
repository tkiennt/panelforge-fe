import React, { useState } from 'react';
import { Plus, Search, FolderKanban } from 'lucide-react';
import { MangaProject } from '../../../types';
import { CreateProjectModal } from '../modals/CreateProjectModal';

interface MyProjectsViewProps {
  projects: MangaProject[];
  onNavigateToDetail: (project: MangaProject) => void;
}

export const MyProjectsView: React.FC<MyProjectsViewProps> = ({ projects, onNavigateToDetail }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className='p-6 h-full flex flex-col bg-[#FAF8F4]'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-[#171717]'>Dự án của tôi</h1>
          <p className='text-sm text-gray-500 mt-1'>Quản lý và theo dõi tiến độ các ấn phẩm</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className='flex items-center gap-2 bg-[#171717] text-white px-4 py-2 rounded-lg hover:bg-black transition'
        >
          <Plus className='w-4 h-4' />
          <span>Dự án mới</span>
        </button>
      </div>

      <div className='relative mb-6'>
        <Search className='w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
        <input
          type='text'
          placeholder='Tìm kiếm dự án...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#F97316]'
        />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar'>
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => onNavigateToDetail(project)}
            className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition'
          >
            <div className='flex items-start justify-between mb-4'>
              <div className='w-10 h-10 bg-[#FFF7ED] text-[#F97316] rounded-lg flex items-center justify-center'>
                <FolderKanban className='w-5 h-5' />
              </div>
              <span className='text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600'>
                {project.status}
              </span>
            </div>
            <h3 className='font-bold text-[#171717] mb-1'>{project.title}</h3>
            <p className='text-sm text-gray-500 line-clamp-1'>{project.subtitle}</p>

            <div className='mt-4 pt-4 border-t border-gray-50'>
              <div className='flex justify-between text-sm mb-1'>
                <span className='text-gray-500'>Tiến độ</span>
                <span className='font-medium'>{project.progressPercent}%</span>
              </div>
              <div className='w-full bg-gray-100 rounded-full h-1.5'>
                <div
                  className='bg-[#F97316] h-1.5 rounded-full'
                  style={{ width: `${project.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={(data) => {
          console.log('Dữ liệu dự án mới:', data);
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
};
