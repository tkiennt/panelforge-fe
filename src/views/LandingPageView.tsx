import React from 'react';
import { Search, LayoutGrid, ArrowRight } from 'lucide-react';
import { MangaProject } from '../types';

interface LandingPageViewProps {
  projects: MangaProject[];
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  projects,
  onLoginClick,
  onRegisterClick,
}) => {
  return (
    <div className='min-h-screen bg-[#F8F6F0] text-[#171717] font-sans flex flex-col'>
      {/* Public Header */}
      <header className='bg-white border-b border-[#E7E7E7] px-6 lg:px-10 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white font-bold text-sm'>
            PF
          </div>
          <div>
            <div className='font-bold text-sm tracking-tight flex items-center gap-1.5 font-display'>
              PANELFORGE <span className='text-[9px] px-1 bg-[#F3F1EB] rounded'>PUBLIC</span>
            </div>
            <div className='text-[10px] text-[#888888] font-mono'>KHÁM PHÁ CÁC ẤN PHẨM</div>
          </div>
        </div>

        {/* Login / Register Buttons */}
        <div className='flex items-center gap-3'>
          <button
            onClick={onLoginClick}
            className='px-4 py-2 text-xs font-bold text-[#171717] hover:bg-[#F3F1EB] rounded-lg transition-colors cursor-pointer'
          >
            Đăng nhập
          </button>
          <button
            onClick={onRegisterClick}
            className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer'
          >
            Đăng ký miễn phí
          </button>
        </div>
      </header>

      {/* Main Showcase Body */}
      <main className='max-w-7xl w-full mx-auto px-6 lg:px-10 py-10 space-y-8 flex-1'>
        <div className='text-center max-w-2xl mx-auto space-y-4 mb-12'>
          <h1 className='text-4xl font-black font-display tracking-tight text-[#171717]'>
            Nền tảng sản xuất Manga thế hệ mới
          </h1>
          <p className='text-sm text-[#555555] leading-relaxed'>
            Khám phá các ấn phẩm đang được thực hiện. PanelForge kết nối quy trình làm việc của Biên
            kịch, Họa sĩ và AI để tạo ra những tác phẩm Tankōbon chất lượng cao.
          </p>
        </div>

        {/* Project Grid Showcase */}
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5'>
          {projects.map((project) => (
            <div
              key={project.id}
              className='bg-white rounded-2xl border border-[#E7E7E7] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group'
            >
              <div className='relative h-48 bg-[#171717] p-4 flex flex-col justify-between overflow-hidden'>
                {project.coverImage && (
                  <img
                    src={project.coverImage}
                    alt={project.title}
                    className='absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700'
                  />
                )}
                <div className='absolute inset-0 bg-gradient-to-t from-black/90 to-transparent'></div>
                <div className='relative z-10 mt-auto'>
                  <div className='text-xs font-mono text-[#F97316] font-bold mb-1'>
                    {project.format}
                  </div>
                  <div className='text-lg font-black text-white font-display uppercase tracking-wide leading-tight'>
                    {project.title}
                  </div>
                </div>
              </div>
              <div className='p-4 space-y-2'>
                <div className='flex items-center gap-2 text-xs text-[#555555]'>
                  <span className='w-2 h-2 rounded-full bg-[#10B981]'></span>
                  {project.status} ({project.progressPercent}%)
                </div>
                <p className='text-xs text-[#888888] line-clamp-2'>
                  {project.tagline || project.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
