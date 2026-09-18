import React, { useState } from 'react';
import {
  UploadCloud,
  Clock,
  LayoutTemplate,
  ShieldCheck,
  History,
  Image as ImageIcon,
  Check,
  FileImage,
  AlertCircle,
} from 'lucide-react';

// Mock data cho danh sách task của Họa sĩ
const ASSIGNED_TASKS = [
  {
    id: 't1',
    page: 'PAGE 12',
    stage: 'Pencil',
    due: 'Hôm nay, 17:00',
    status: 'In Progress',
    urgent: true,
  },
  {
    id: 't2',
    page: 'PAGE 14',
    stage: 'Ink',
    due: 'Ngày mai, 10:00',
    status: 'To Do',
    urgent: false,
  },
  {
    id: 't3',
    page: 'PAGE 15',
    stage: 'Thumbnail',
    due: '20/10/2026',
    status: 'To Do',
    urgent: false,
  },
];

export default function ArtistWorkspace() {
  const [activeTask, setActiveTask] = useState(ASSIGNED_TASKS[0]);
  const [isUploading, setIsUploading] = useState(false);

  // Giả lập hành động tải file
  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => setIsUploading(false), 1500);
  };

  return (
    <div className='flex flex-col h-full bg-[#F8F6F0] text-[#171717] font-sans'>
      {/* --- HEADER --- */}
      <div className='flex justify-between items-center px-6 py-4 border-b border-[#E7E7E7] bg-white shrink-0 shadow-xs'>
        <div>
          <h2 className='text-xl font-bold font-display tracking-tight text-[#171717]'>
            Artist Workspace
          </h2>
          <p className='text-xs text-[#888888] font-mono mt-0.5'>Studio Inking & Asset Upload</p>
        </div>
        <button className='px-4 py-2 bg-[#F97316] text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-[#EA580C] transition-all shadow-sm cursor-pointer active:scale-95'>
          <Check className='w-4 h-4' />
          <span>Hoàn thành Task</span>
        </button>
      </div>

      {/* --- MAIN CONTENT (3 COLUMNS) --- */}
      <div className='flex flex-1 overflow-hidden p-4 md:p-6 gap-5'>
        {/* COL 1: MY ASSIGNED TASKS BOARD */}
        <div className='w-1/4 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7]'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <Clock className='w-4 h-4 text-[#F97316]' />
              My Assigned Tasks
            </h3>
          </div>
          <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar'>
            {ASSIGNED_TASKS.map((task) => (
              <div
                key={task.id}
                onClick={() => setActiveTask(task)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  activeTask.id === task.id
                    ? 'border-[#F97316] bg-[#FFF7ED] shadow-sm'
                    : 'border-[#E7E7E7] bg-white hover:border-[#171717]'
                }`}
              >
                <div className='flex items-center justify-between mb-2'>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      activeTask.id === task.id
                        ? 'bg-[#F97316] text-white'
                        : 'bg-[#171717] text-white'
                    }`}
                  >
                    {task.page}
                  </span>
                  <span className='text-[10px] font-mono font-bold text-[#888888] uppercase'>
                    {task.stage}
                  </span>
                </div>
                <div className='flex items-center gap-1.5 text-xs font-medium text-[#555555]'>
                  <AlertCircle
                    className={`w-3.5 h-3.5 ${task.urgent ? 'text-[#DC2626]' : 'text-[#888888]'}`}
                  />
                  <span className={task.urgent ? 'text-[#DC2626]' : ''}>Due: {task.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 2: INTERACTIVE PANEL CANVAS & SCRIPT */}
        <div className='w-2/4 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7] flex justify-between items-center'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <LayoutTemplate className='w-4 h-4 text-[#0EA5E9]' />
              Interactive Panel Canvas
            </h3>
            <span className='text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E7E7E7] text-[#888888]'>
              B5 Layout (600 DPI)
            </span>
          </div>

          <div className='flex flex-col flex-1 overflow-hidden p-4 bg-[#F3F1EB]'>
            {/* Script Reference Block */}
            <div className='mb-4 p-3 bg-white border border-[#E7E7E7] border-l-4 border-l-[#171717] rounded shadow-xs'>
              <h4 className='text-[10px] font-mono font-bold text-[#888888] mb-1 uppercase tracking-wider'>
                Script Reference
              </h4>
              <p className='text-sm text-[#171717] leading-relaxed'>
                <strong>Panel 1:</strong> Con thú ngoài thân kim quang lấp lánh, hình thể cuồng
                trướng. <br />
                <em className='text-[#555555] text-xs'>
                  *Ghi chú: Đánh bóng nét Ink dày ở phần sừng, tham khảo Series Bible (Mã V-4).
                </em>
              </p>
            </div>

            {/* Visual Canvas Area (Mock) */}
            <div className='flex-1 border-2 border-dashed border-[#AAAAAA] rounded-lg bg-white relative flex items-center justify-center overflow-hidden group'>
              {/* Giả lập bố cục Layout */}
              <div className='absolute inset-4 grid grid-cols-2 grid-rows-3 gap-2 opacity-20 pointer-events-none'>
                <div className='col-span-2 row-span-1 border-2 border-[#171717] bg-[#F8F6F0]'></div>
                <div className='col-span-1 row-span-2 border-2 border-[#171717] bg-[#F8F6F0]'></div>
                <div className='col-span-1 row-span-1 border-2 border-[#171717] bg-[#F8F6F0]'></div>
                <div className='col-span-1 row-span-1 border-2 border-[#171717] bg-[#F8F6F0]'></div>
              </div>

              <div className='text-center z-10'>
                <ImageIcon className='w-12 h-12 text-[#E7E7E7] mx-auto mb-2 group-hover:text-[#F97316] transition-colors' />
                <p className='text-sm font-semibold text-[#888888]'>HTML5 Canvas Planner</p>
                <p className='text-xs text-[#AAAAAA] mt-1'>(Khu vực vẽ / thao tác bố cục)</p>
              </div>
            </div>
          </div>
        </div>

        {/* COL 3: ASSET UPLOAD & PROVENANCE MODAL */}
        <div className='w-1/4 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7]'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <UploadCloud className='w-4 h-4 text-[#10B981]' />
              Asset & Provenance
            </h3>
          </div>

          <div className='flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4'>
            {/* Uploader Box */}
            <div
              onClick={handleUpload}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                isUploading
                  ? 'border-[#F97316] bg-[#FFF7ED]'
                  : 'border-[#E7E7E7] hover:border-[#171717] hover:bg-[#FAF8F4]'
              }`}
            >
              {isUploading ? (
                <div className='animate-pulse text-[#F97316]'>
                  <UploadCloud className='w-8 h-8 mx-auto mb-2' />
                  <p className='text-xs font-bold font-mono'>Đang tải lên CAS...</p>
                </div>
              ) : (
                <div className='text-[#888888]'>
                  <FileImage className='w-8 h-8 mx-auto mb-2 text-[#AAAAAA]' />
                  <p className='text-xs font-medium text-[#171717] mb-1'>Kéo thả hoặc Click</p>
                  <p className='text-[10px] font-mono'>Hỗ trợ PSD, CLIP, PNG</p>
                </div>
              )}
            </div>

            {/* Provenance Tags (Bắt buộc theo nghiệp vụ ảnh 2) */}
            <div className='p-3 bg-[#F8F6F0] rounded-lg border border-[#E7E7E7]'>
              <h4 className='text-[10px] font-mono font-bold text-[#171717] mb-2 flex items-center gap-1.5 uppercase tracking-wider'>
                <ShieldCheck className='w-3.5 h-3.5 text-[#10B981]' />
                Provenance Tracking
              </h4>
              <div className='space-y-1.5'>
                <div className='flex justify-between items-center bg-white px-2 py-1.5 rounded border border-[#E7E7E7]'>
                  <span className='text-[10px] text-[#555555] font-semibold'>Tác giả (Human):</span>
                  <span className='text-[10px] font-mono text-[#10B981] bg-[#ECFDF5] px-1.5 py-0.5 rounded'>
                    100% Khớp
                  </span>
                </div>
                <div className='flex justify-between items-center bg-white px-2 py-1.5 rounded border border-[#E7E7E7]'>
                  <span className='text-[10px] text-[#555555] font-semibold'>AI Assist:</span>
                  <span className='text-[10px] font-mono text-[#888888] bg-[#F3F1EB] px-1.5 py-0.5 rounded'>
                    0% (None)
                  </span>
                </div>
              </div>
            </div>

            {/* Version Control */}
            <div>
              <h4 className='text-[10px] font-mono font-bold text-[#888888] mb-2 flex items-center gap-1.5 uppercase tracking-wider'>
                <History className='w-3.5 h-3.5' />
                Lịch sử phiên bản
              </h4>
              <div className='space-y-2'>
                <div className='flex items-center justify-between p-2 bg-white rounded border border-[#E7E7E7] shadow-xs'>
                  <div className='flex flex-col'>
                    <span className='text-xs font-semibold text-[#171717]'>V2 - Inking Final</span>
                    <span className='text-[9px] text-[#888888] font-mono'>10 phút trước</span>
                  </div>
                  <span className='px-1.5 py-0.5 text-[9px] font-bold text-white bg-[#10B981] rounded uppercase tracking-wider'>
                    Đã lưu
                  </span>
                </div>
                <div className='flex items-center justify-between p-2 bg-[#FAF8F4] rounded border border-[#E7E7E7]'>
                  <div className='flex flex-col'>
                    <span className='text-xs font-medium text-[#555555]'>V1 - Pencil Sketch</span>
                    <span className='text-[9px] text-[#888888] font-mono'>Hôm qua, 14:30</span>
                  </div>
                  <span className='px-1.5 py-0.5 text-[9px] font-bold text-[#555555] bg-[#E7E7E7] rounded uppercase tracking-wider'>
                    Bản nháp
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
