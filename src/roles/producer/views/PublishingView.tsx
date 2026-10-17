import React, { useState } from 'react';
import {
  BookOpen,
  ArrowLeft,
  CheckCircle,
  Lock,
  Download,
  Link,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import { MangaProject } from '../../../types';

interface PublishingViewProps {
  projects: MangaProject[];
  onOpenExportModal: () => void;
  onShowToast: (title: string, desc: string) => void;
}

export const PublishingView: React.FC<PublishingViewProps> = ({
  projects,
  onOpenExportModal,
  onShowToast,
}) => {
  // null = Màn hình 1 (Danh sách dự án), có data = Màn hình 2 (Danh sách chapter của dự án đó)
  const [selectedProject, setSelectedProject] = useState<MangaProject | null>(null);

  // MOCK DATA: Các chapter đang chờ xuất bản của dự án được chọn
  const mockChapters = [
    {
      id: 'ch1',
      title: 'Chapter 01: Khởi nguồn',
      pages: 32,
      status: 'Ready for Export',
      date: 'Vừa xong',
    },
    {
      id: 'ch2',
      title: 'Chapter 02: Bức màn bí ẩn',
      pages: 28,
      status: 'Pending Approval',
      date: '2 ngày trước',
      findings: 2,
    },
    {
      id: 'ch3',
      title: 'Chapter 03: Hành trình mới',
      pages: 30,
      status: 'In Review',
      date: '5 ngày trước',
    },
  ];

  const handleApproveAndLock = (chapterTitle: string) => {
    onShowToast('Đã duyệt & Khóa', `Chapter "${chapterTitle}" đã sẵn sàng xuất bản.`);
  };

  const handleCreatePreviewLink = (chapterTitle: string) => {
    onShowToast(
      'Tạo Preview Link',
      `Đã tạo link đọc thử giới hạn thời gian cho "${chapterTitle}".`,
    );
  };

  // ==========================================
  // MÀN HÌNH 1: DANH SÁCH DỰ ÁN CẦN DUYỆT / XUẤT BẢN
  // ==========================================
  if (!selectedProject) {
    return (
      <div className='p-6 h-full flex flex-col bg-[#FAF8F4] overflow-y-auto custom-scrollbar'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-[#171717]'>Xuất bản & Phân phối</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Duyệt các chapter đã hoàn thành và xuất bản ra các định dạng chuẩn
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-[#F97316] transition group'
            >
              <div className='flex items-start justify-between mb-4'>
                <div className='w-10 h-10 bg-[#FFFBEB] text-[#D97706] rounded-lg flex items-center justify-center group-hover:bg-[#D97706] group-hover:text-white transition-colors'>
                  <BookOpen className='w-5 h-5' />
                </div>
                <span className='text-xs font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-200'>
                  2 Ch. Cần duyệt
                </span>
              </div>
              <h3 className='font-bold text-[#171717] mb-1 truncate'>{project.title}</h3>
              <p className='text-sm text-gray-500 line-clamp-1 mb-4'>{project.subtitle}</p>

              <div className='pt-3 border-t border-gray-50 flex items-center justify-between text-sm'>
                <span className='text-gray-500'>Trạng thái dự án:</span>
                <span className='font-semibold text-[#171717]'>{project.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // MÀN HÌNH 2: DANH SÁCH CHAPTER ĐỂ XUẤT BẢN
  // ==========================================
  return (
    <div className='p-6 h-full flex flex-col bg-[#FAF8F4]'>
      <button
        onClick={() => setSelectedProject(null)}
        className='flex items-center gap-2 text-sm text-gray-500 hover:text-[#171717] transition w-fit mb-6 font-medium'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại danh sách dự án
      </button>

      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-[#171717]'>
            Xuất bản: <span className='text-[#F97316]'>{selectedProject.title}</span>
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Kiểm duyệt cuối cùng và xuất file (PDF, CBZ, Webtoon)
          </p>
        </div>
      </div>

      <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse min-w-[800px]'>
            <thead>
              <tr className='bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider'>
                <th className='p-4 font-medium w-1/3'>Chapter</th>
                <th className='p-4 font-medium'>Trạng thái</th>
                <th className='p-4 font-medium'>Phê duyệt</th>
                <th className='p-4 font-medium text-right'>Hành động xuất bản</th>
              </tr>
            </thead>
            <tbody>
              {mockChapters.map((chapter) => (
                <tr
                  key={chapter.id}
                  className='border-b border-gray-50 hover:bg-gray-50/50 transition'
                >
                  <td className='p-4'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 border border-gray-200'>
                        <FileImage className='w-5 h-5' />
                      </div>
                      <div className='min-w-0'>
                        <p className='font-bold text-sm text-[#171717] truncate'>{chapter.title}</p>
                        <p className='text-xs text-gray-500 mt-0.5'>
                          {chapter.pages} Pages • Cập nhật: {chapter.date}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className='p-4'>
                    {chapter.status === 'Ready for Export' ? (
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap'>
                        <Lock className='w-3.5 h-3.5' /> Locked & Ready
                      </span>
                    ) : chapter.status === 'Pending Approval' ? (
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700 whitespace-nowrap'>
                        <AlertCircle className='w-3.5 h-3.5' /> Chờ duyệt cuối
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap'>
                        Đang rà soát
                      </span>
                    )}

                    {chapter.findings && (
                      <div className='text-[10px] text-red-500 font-medium mt-1'>
                        Cảnh báo: Còn {chapter.findings} lỗi Consistency
                      </div>
                    )}
                  </td>

                  <td className='p-4'>
                    <button
                      onClick={() => handleApproveAndLock(chapter.title)}
                      disabled={chapter.status === 'Ready for Export'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm border
                        ${
                          chapter.status === 'Ready for Export'
                            ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed'
                            : 'bg-white hover:bg-gray-50 text-[#171717] border-gray-200'
                        }`}
                    >
                      <CheckCircle className='w-4 h-4' /> Duyệt & Khóa
                    </button>
                  </td>

                  <td className='p-4 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <button
                        onClick={() => handleCreatePreviewLink(chapter.title)}
                        className='p-2 text-gray-500 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition border border-transparent hover:border-orange-200'
                        title='Tạo link Preview cho độc giả ngoài'
                      >
                        <Link className='w-4 h-4' />
                      </button>
                      <button
                        onClick={onOpenExportModal}
                        disabled={chapter.status !== 'Ready for Export'}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm
                          ${
                            chapter.status === 'Ready for Export'
                              ? 'bg-[#F97316] text-white hover:bg-[#EA580C]'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                      >
                        <Download className='w-4 h-4' /> Export File
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
