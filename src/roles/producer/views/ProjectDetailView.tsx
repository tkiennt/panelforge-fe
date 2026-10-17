import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Users,
  BookOpen,
  ChevronRight,
  FileImage,
  LayoutTemplate,
} from 'lucide-react';
import { MangaProject } from '../../../types'; // Hãy đảm bảo đường dẫn đúng

interface ProjectDetailViewProps {
  project: MangaProject;
  onBack: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack }) => {
  // STATE ĐIỀU HƯỚNG BÊN TRONG CHI TIẾT DỰ ÁN
  // 'overview': Màn hình tổng quan (như hình số 2 của bạn)
  // 'chapter-X': Màn hình danh sách trang của Chapter X
  const [currentView, setCurrentView] = useState<string>('overview');

  // MOCK DATA: Danh sách các chapter của dự án này
  const mockChapters = [
    {
      id: 'ch1',
      title: 'Chapter 01: Khởi nguồn',
      pages: 12,
      status: 'Completed',
      date: 'Oct 15, 2026',
    },
    {
      id: 'ch2',
      title: 'Chapter 02: Bức màn bí ẩn',
      pages: 15,
      status: 'In Review',
      date: 'Oct 22, 2026',
    },
    {
      id: 'ch3',
      title: 'Chapter 03: Hành trình mới',
      pages: 18,
      status: 'Inking',
      date: 'Nov 05, 2026',
    },
    {
      id: 'ch4',
      title: 'Chapter 04: Thử thách',
      pages: 0,
      status: 'Scripting',
      date: 'Nov 12, 2026',
    },
  ];

  // ==========================================
  // MÀN HÌNH 2: DANH SÁCH TRANG CỦA 1 CHAPTER
  // ==========================================
  if (currentView.startsWith('chapter-')) {
    const chapterId = currentView.split('-')[1];
    const chapterInfo = mockChapters.find((c) => c.id === chapterId);

    // Mock data: Danh sách các trang
    const mockPages = Array.from({ length: chapterInfo?.pages || 0 }, (_, i) => ({
      id: `p${i + 1}`,
      pageNumber: i + 1,
      status: i < 5 ? 'Approved' : i < 10 ? 'Inking' : 'Pencil',
    }));

    return (
      <div className='p-6 h-full flex flex-col bg-[#FAF8F4] overflow-y-auto custom-scrollbar'>
        {/* Nút quay lại danh sách Chapter */}
        <button
          onClick={() => setCurrentView('overview')}
          className='flex items-center gap-2 text-sm text-gray-500 hover:text-[#171717] transition w-fit mb-6 font-medium'
        >
          <ArrowLeft className='w-4 h-4' /> Quay lại {project.title}
        </button>

        <div className='flex justify-between items-center mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-[#171717]'>{chapterInfo?.title}</h1>
            <p className='text-sm text-gray-500 mt-1'>
              Danh sách {chapterInfo?.pages} trang truyện đang được sản xuất
            </p>
          </div>
          <span className='px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600'>
            {chapterInfo?.status}
          </span>
        </div>

        {/* Lưới hiển thị các trang truyện */}
        {mockPages.length > 0 ? (
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
            {mockPages.map((page) => (
              <div
                key={page.id}
                className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer group'
              >
                {/* Khu vực mô phỏng ảnh hiển thị của trang */}
                <div className='aspect-[1/1.4] bg-gray-100 relative flex items-center justify-center group-hover:bg-gray-200 transition'>
                  <LayoutTemplate className='w-8 h-8 text-gray-300 group-hover:text-gray-400' />
                  <div className='absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded'>
                    Pg. {page.pageNumber}
                  </div>
                </div>
                {/* Trạng thái trang */}
                <div className='p-3'>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm
                    ${
                      page.status === 'Approved'
                        ? 'bg-green-100 text-green-700'
                        : page.status === 'Inking'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                    }
                  `}
                  >
                    {page.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300'>
            <FileImage className='w-12 h-12 text-gray-300 mb-3' />
            <p className='text-gray-500 font-medium'>Chapter này chưa có trang truyện nào.</p>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MÀN HÌNH 1: TỔNG QUAN DỰ ÁN & DANH SÁCH CHAPTER
  // ==========================================
  return (
    <div className='p-6 h-full flex flex-col bg-[#FAF8F4] overflow-y-auto custom-scrollbar'>
      {/* Nút quay lại Danh sách dự án (MyProjectsView) */}
      <button
        onClick={onBack}
        className='flex items-center gap-2 text-sm text-gray-500 hover:text-[#171717] transition w-fit mb-6 font-medium'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại danh sách
      </button>

      <div className='flex justify-between items-start mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-[#171717] mb-2'>{project.title}</h1>
          <p className='text-gray-500 text-sm font-medium'>{project.subtitle}</p>
        </div>
        <span className='px-4 py-1.5 bg-[#FFF7ED] text-[#F97316] rounded-full text-sm font-semibold border border-[#F97316]/20'>
          {project.status}
        </span>
      </div>

      {/* 3 Khối Thống Kê */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-10'>
        <div className='p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center gap-4'>
          <div className='p-3 bg-blue-50 rounded-xl'>
            <BookOpen className='w-6 h-6 text-blue-500' />
          </div>
          <div>
            <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1'>
              Số trang hoàn thành
            </p>
            <p className='text-2xl font-bold text-[#171717]'>
              {project.completedPages}{' '}
              <span className='text-lg text-gray-400 font-medium'>/ {project.totalPages}</span>
            </p>
          </div>
        </div>
        <div className='p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center gap-4'>
          <div className='p-3 bg-orange-50 rounded-xl'>
            <Clock className='w-6 h-6 text-orange-500' />
          </div>
          <div>
            <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1'>
              Deadline dự án
            </p>
            <p className='text-xl font-bold text-[#171717]'>{project.dueDate}</p>
          </div>
        </div>
        <div className='p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center gap-4'>
          <div className='p-3 bg-green-50 rounded-xl'>
            <Users className='w-6 h-6 text-green-500' />
          </div>
          <div>
            <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1'>
              Nhân sự tham gia
            </p>
            <p className='text-xl font-bold text-[#171717]'>5 thành viên</p>
          </div>
        </div>
      </div>

      {/* Danh sách Chapter */}
      <div>
        <h2 className='text-lg font-bold text-[#171717] mb-4'>Danh sách Chapter</h2>
        <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
          {mockChapters.map((chapter, index) => (
            <div
              key={chapter.id}
              onClick={() => setCurrentView(`chapter-${chapter.id}`)}
              className={`flex items-center justify-between p-4 cursor-pointer hover:bg-orange-50 transition ${index !== mockChapters.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200'>
                  <BookOpen className='w-5 h-5' />
                </div>
                <div>
                  <h3 className='font-bold text-[#171717]'>{chapter.title}</h3>
                  <div className='flex items-center gap-3 text-xs text-gray-500 mt-1'>
                    <span>{chapter.pages} trang</span>
                    <span className='w-1 h-1 rounded-full bg-gray-300'></span>
                    <span>Cập nhật: {chapter.date}</span>
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-4'>
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                  ${
                    chapter.status === 'Completed'
                      ? 'bg-green-100 text-green-700'
                      : chapter.status === 'In Review'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                  }
                `}
                >
                  {chapter.status}
                </span>
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
