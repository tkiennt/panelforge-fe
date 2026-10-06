import React, { useState } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  MessageSquare,
  SlidersHorizontal,
  ShieldAlert,
  Send,
  Crosshair,
  Search,
  EyeOff,
} from 'lucide-react';

// Mock data cho AI Continuity Warnings
const AI_WARNINGS = [
  {
    id: 'w1',
    type: 'critical',
    msg: 'Sai màu mắt nhân vật Kuro (Hiện tại: Xanh dương | Yêu cầu: Xanh lá).',
    panel: 'Panel 1',
  },
  { id: 'w2', type: 'warning', msg: 'Thiếu họa tiết áo choàng ở góc trái.', panel: 'Panel 1' },
  {
    id: 'w3',
    type: 'info',
    msg: 'Ánh sáng bối cảnh hơi tối so với quy chuẩn Scene 1.',
    panel: 'Panel 2',
  },
];

export default function EditorWorkspace() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [comment, setComment] = useState('');

  return (
    <div className='flex flex-col h-full bg-[#F8F6F0] text-[#171717] font-sans'>
      {/* --- HEADER --- */}
      <div className='flex justify-between items-center px-6 py-4 border-b border-[#E7E7E7] bg-white shrink-0 shadow-xs'>
        <div>
          <h2 className='text-xl font-bold font-display tracking-tight text-[#171717]'>
            Editor Workspace (QC)
          </h2>
          <p className='text-xs text-[#888888] font-mono mt-0.5'>Review Desk & Continuity Check</p>
        </div>
        <div className='flex items-center gap-3'>
          <button className='px-4 py-2 bg-[#DC2626] text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-[#B91C1C] transition-all shadow-sm cursor-pointer active:scale-95'>
            <X className='w-4 h-4' />
            <span>Reject (Yêu cầu sửa)</span>
          </button>
          <button className='px-4 py-2 bg-[#10B981] text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-[#059669] transition-all shadow-sm cursor-pointer active:scale-95'>
            <Check className='w-4 h-4' />
            <span>Approve (Duyệt)</span>
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT (3 COLUMNS) --- */}
      <div className='flex flex-1 overflow-hidden p-4 md:p-6 gap-5'>
        {/* COL 1: AI CONTINUITY TRIAGE FEED */}
        <div className='w-1/4 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7] flex justify-between items-center'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <ShieldAlert className='w-4 h-4 text-[#F97316]' />
              AI Continuity Triage
            </h3>
            <span className='text-[10px] font-mono bg-[#FFF7ED] text-[#F97316] px-2 py-0.5 rounded border border-[#FDBA74]/50'>
              3 Issues
            </span>
          </div>

          <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-[#F3F1EB]'>
            <p className='text-xs text-[#555555] mb-2 px-1'>
              Hệ thống AI đối chiếu Series Bible và phát hiện các điểm bất thường:
            </p>
            {AI_WARNINGS.map((warn) => (
              <div
                key={warn.id}
                className='bg-white p-3 rounded-lg border border-[#E7E7E7] shadow-xs'
              >
                <div className='flex items-start gap-2'>
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${warn.type === 'critical' ? 'text-[#DC2626]' : warn.type === 'warning' ? 'text-[#F59E0B]' : 'text-[#3B82F6]'}`}
                  />
                  <div>
                    <span className='text-[10px] font-mono font-bold text-[#888888] uppercase mb-1 block'>
                      {warn.panel}
                    </span>
                    <p className='text-xs font-medium text-[#171717] leading-relaxed'>{warn.msg}</p>
                  </div>
                </div>
                <div className='mt-2 pt-2 border-t border-[#F8F6F0] flex justify-end gap-2'>
                  <button className='text-[10px] font-semibold text-[#888888] hover:text-[#171717] transition-colors'>
                    Bỏ qua (False Flag)
                  </button>
                  <button className='text-[10px] font-semibold text-[#F97316] hover:text-[#EA580C] transition-colors'>
                    Tạo Yêu cầu sửa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 2: SIDE-BY-SIDE VISUAL DIFF VIEWER & PANEL-ANCHORED REVIEW */}
        <div className='w-2/4 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7] flex justify-between items-center'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <SlidersHorizontal className='w-4 h-4 text-[#0EA5E9]' />
              Visual Diff Viewer
            </h3>
            <div className='flex gap-2'>
              <button
                className='p-1.5 bg-white border border-[#E7E7E7] rounded text-[#888888] hover:text-[#171717] transition-colors cursor-pointer'
                title='Zoom In'
              >
                <Search className='w-3.5 h-3.5' />
              </button>
              <button
                className='p-1.5 bg-white border border-[#E7E7E7] rounded text-[#888888] hover:text-[#171717] transition-colors cursor-pointer'
                title='Hide Annotations'
              >
                <EyeOff className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>

          {/* Viewer Area */}
          <div className='flex-1 relative bg-[#E5E5E5] overflow-hidden flex items-center justify-center cursor-crosshair group'>
            {/* Giả lập A/B Slider */}
            <div className='absolute inset-4 bg-white border border-[#AAAAAA] shadow-sm overflow-hidden'>
              {/* Left Side (V1) */}
              <div
                className='absolute inset-y-0 left-0 bg-[#F8F6F0] border-r-2 border-[#F97316] flex items-center justify-center'
                style={{ width: `${sliderPosition}%` }}
              >
                <span className='absolute bottom-4 left-4 text-xs font-mono font-bold text-[#888888] bg-white/80 px-2 py-1 rounded'>
                  V1 - Phiên bản cũ
                </span>
              </div>

              {/* Right Side (V2) */}
              <div
                className='absolute inset-y-0 right-0 bg-white flex items-center justify-center'
                style={{ width: `${100 - sliderPosition}%` }}
              >
                <span className='absolute bottom-4 right-4 text-xs font-mono font-bold text-[#10B981] bg-[#ECFDF5]/80 px-2 py-1 rounded border border-[#10B981]/20'>
                  V2 - Bản mới nhất
                </span>
              </div>

              {/* Slider Handle */}
              <div
                className='absolute inset-y-0 flex items-center justify-center w-1 cursor-col-resize z-10'
                style={{ left: `${sliderPosition}%` }}
              >
                <div className='w-4 h-8 bg-[#F97316] rounded-full shadow-md flex flex-col items-center justify-center gap-0.5 border-2 border-white transform -translate-x-1/2'>
                  <div className='w-0.5 h-1 bg-white rounded'></div>
                  <div className='w-0.5 h-1 bg-white rounded'></div>
                </div>
              </div>

              {/* Panel-Anchored Bounding Box (Mock) */}
              <div className='absolute top-1/4 left-1/3 w-32 h-32 border-2 border-dashed border-[#DC2626] bg-[#DC2626]/10 flex items-start justify-end p-1 z-20'>
                <span className='bg-[#DC2626] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow'>
                  Pin #1
                </span>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#171717]/80 backdrop-blur-sm text-white text-[11px] px-4 py-1.5 rounded-full font-mono flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
              <Crosshair className='w-3 h-3' />
              Kéo thả để khoanh vùng (Bounding Box)
            </div>
          </div>

          {/* Custom Slider Input cho tương tác thật */}
          <div className='h-8 bg-white border-t border-[#E7E7E7] px-4 flex items-center'>
            <input
              type='range'
              min='0'
              max='100'
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className='w-full accent-[#F97316] cursor-pointer'
            />
          </div>
        </div>

        {/* COL 3: FEEDBACK & CHANGE REQUESTS */}
        <div className='w-1/4 flex flex-col bg-white rounded-xl border border-[#E7E7E7] shadow-sm overflow-hidden flex-shrink-0'>
          <div className='px-4 py-3 bg-[#FAF8F4] border-b border-[#E7E7E7]'>
            <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
              <MessageSquare className='w-4 h-4 text-[#8B5CF6]' />
              Feedback & Request
            </h3>
          </div>

          <div className='flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col'>
            {/* Pinned Comments List */}
            <div className='space-y-3 mb-6'>
              <div className='p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg shadow-xs'>
                <div className='flex justify-between items-start mb-1.5'>
                  <strong className='text-[11px] font-mono text-[#DC2626] bg-white px-1.5 py-0.5 rounded border border-[#FCA5A5]'>
                    Pin #1
                  </strong>
                  <span className='text-[9px] text-[#888888] font-mono'>10 phút trước</span>
                </div>
                <p className='text-xs text-[#171717] leading-relaxed'>
                  Màu mắt của nhân vật đang là màu xanh dương, hãy đổi lại thành màu xanh lá theo
                  Series Bible (Mã V-3).
                </p>
                <div className='mt-2 pt-2 border-t border-[#FCA5A5]/30 flex justify-between'>
                  <span className='text-[9px] text-[#DC2626] font-semibold'>
                    Trạng thái: Chưa sửa
                  </span>
                  <button className='text-[10px] text-[#888888] hover:text-[#171717]'>Xóa</button>
                </div>
              </div>
            </div>

            {/* Comment Input Area */}
            <div className='mt-auto pt-4 border-t border-[#E7E7E7]'>
              <div className='bg-[#F8F6F0] p-2 rounded-lg border border-[#E7E7E7] focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-[#F97316] transition-all'>
                <textarea
                  className='w-full bg-transparent p-2 text-xs text-[#171717] placeholder-[#AAAAAA] resize-none focus:outline-none custom-scrollbar'
                  rows={4}
                  placeholder='Thêm nhận xét chung hoặc mô tả cho vùng đã khoanh...'
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className='flex justify-end mt-2'>
                  <button className='px-3 py-1.5 bg-[#171717] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 hover:bg-black transition-colors'>
                    <Send className='w-3 h-3' />
                    Gửi Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
