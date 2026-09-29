import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Download, CheckCircle2, FileText, ImageIcon, Code } from 'lucide-react';

interface ExportViewProps {
  onShowToast: (title: string, desc: string) => void;
}

export const ExportView: React.FC<ExportViewProps> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [isLocked, setIsLocked] = useState(false);
  const [exportFormat, setExportFormat] = useState({
    pdf: true,
    cbz: false,
    webtoon: false,
    json: true,
  });

  const handleLock = () => {
    setIsLocked(true);
    onShowToast('Chương truyện đã bị khóa', 'Dữ liệu đã được đóng băng thành công.');
  };

  const handleExport = () => {
    if (!isLocked) {
      onShowToast('Chưa khóa dữ liệu', 'Vui lòng Lock Chapter trước khi xuất bản!');
      return;
    }
    const formats = Object.keys(exportFormat)
      .filter((k) => exportFormat[k as keyof typeof exportFormat])
      .join(', ')
      .toUpperCase();
    onShowToast('Đang xuất bản...', `Tiến trình xuất file (${formats}) đang chạy ngầm.`);
  };

  return (
    <div className='p-8 max-w-4xl mx-auto flex flex-col h-full overflow-y-auto custom-scrollbar'>
      <button
        onClick={() => navigate(-1)}
        className='self-start flex items-center gap-2 text-sm text-[#737373] hover:text-[#171717] mb-6 transition-colors'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại
      </button>

      <h1 className='text-3xl font-display font-bold text-[#171717] mb-2 flex items-center gap-3'>
        <Download className='w-8 h-8 text-[#8B5CF6]' />
        Nghiệm thu & Xuất bản
      </h1>
      <p className='text-[#555555] mb-8'>
        Đóng băng chương truyện <b>{projectId || 'Unknown'}</b> và trích xuất dữ liệu đa nền tảng.
      </p>

      <div className='grid grid-cols-2 gap-6'>
        {/* LOCK SECTION */}
        <div
          className={`p-6 border rounded-xl flex flex-col gap-4 ${isLocked ? 'border-[#10B981] bg-[#ECFCCB]' : 'border-[#E7E7E7] bg-white'}`}
        >
          <div className='flex items-center gap-3'>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${isLocked ? 'bg-[#10B981] text-white' : 'bg-[#F3F3F3] text-[#737373]'}`}
            >
              {isLocked ? <CheckCircle2 className='w-6 h-6' /> : <Lock className='w-6 h-6' />}
            </div>
            <div>
              <h3 className='font-bold text-[#171717]'>
                {isLocked ? 'Đã đóng băng dữ liệu' : 'Khóa (Lock) Chapter'}
              </h3>
              <p className='text-xs text-[#555555]'>
                {isLocked
                  ? 'Không ai có thể thay đổi bản thảo nữa.'
                  : 'Đóng băng trạng thái cuối cùng, chặn mọi sửa đổi.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLock}
            disabled={isLocked}
            className='mt-auto py-2.5 bg-[#171717] text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors'
          >
            {isLocked ? 'Chapter Locked' : 'Thực hiện Lock Chapter'}
          </button>
        </div>

        {/* EXPORT SECTION */}
        <div
          className={`p-6 border rounded-xl flex flex-col gap-4 bg-white ${!isLocked ? 'border-[#E7E7E7] opacity-50 pointer-events-none' : 'border-[#8B5CF6] shadow-md'}`}
        >
          <h3 className='font-bold text-[#171717] border-b border-[#E7E7E7] pb-2'>
            Tùy chọn Xuất bản (Export Formats)
          </h3>

          <div className='space-y-3'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.pdf}
                onChange={(e) => setExportFormat((p) => ({ ...p, pdf: e.target.checked }))}
                className='w-4 h-4 rounded text-[#8B5CF6] focus:ring-[#8B5CF6]'
              />
              <FileText className='w-4 h-4 text-[#737373]' />
              <span className='text-sm font-semibold'>PDF Document (In ấn / Review)</span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.cbz}
                onChange={(e) => setExportFormat((p) => ({ ...p, cbz: e.target.checked }))}
                className='w-4 h-4 rounded text-[#8B5CF6] focus:ring-[#8B5CF6]'
              />
              <ImageIcon className='w-4 h-4 text-[#737373]' />
              <span className='text-sm font-semibold'>CBZ Archive (E-Reader)</span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.webtoon}
                onChange={(e) => setExportFormat((p) => ({ ...p, webtoon: e.target.checked }))}
                className='w-4 h-4 rounded text-[#8B5CF6] focus:ring-[#8B5CF6]'
              />
              <ImageIcon className='w-4 h-4 text-[#737373]' />
              <span className='text-sm font-semibold'>Webtoon Scroll (Cắt khung dọc)</span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.json}
                onChange={(e) => setExportFormat((p) => ({ ...p, json: e.target.checked }))}
                className='w-4 h-4 rounded text-[#8B5CF6] focus:ring-[#8B5CF6]'
              />
              <Code className='w-4 h-4 text-[#737373]' />
              <span className='text-sm font-semibold'>JSON Provenance (Lịch sử Audit)</span>
            </label>
          </div>

          <button
            onClick={handleExport}
            className='mt-auto py-2.5 bg-[#8B5CF6] text-white font-bold rounded-lg hover:bg-[#7C3AED] transition-colors'
          >
            Xuất file
          </button>
        </div>
      </div>
    </div>
  );
};
