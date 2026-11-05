import React, { useState } from 'react';
import {
  Type,
  Sparkles,
  MessageSquare,
  GitBranch,
  Volume2,
  Compass,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Maximize2,
} from 'lucide-react';

interface Props {
  // Reading Flow Path Previewer
  readingFlowVisible: boolean;
  onToggleReadingFlow: () => void;

  // AI Tách Thoại
  onOpenAutoAssignModal: () => void;

  // Locked Script Checklist
  scriptDrawerOpen: boolean;
  onToggleScriptDrawer: () => void;
  unplacedCount: number;
  totalLetterableCount: number;

  // Typography & Balloon Tools
  activeTool: 'balloon' | 'thought' | 'caption' | 'sfx' | 'tail-edit';
  onSelectTool: (tool: 'balloon' | 'thought' | 'caption' | 'sfx' | 'tail-edit') => void;

  // Action Gate 2 Handoff
  onSubmitToGate2: () => void;
  isSubmitting?: boolean;
}

export const LetteringStageWorkspaceBar: React.FC<Props> = ({
  readingFlowVisible,
  onToggleReadingFlow,
  onOpenAutoAssignModal,
  scriptDrawerOpen,
  onToggleScriptDrawer,
  unplacedCount,
  totalLetterableCount,
  activeTool,
  onSelectTool,
  onSubmitToGate2,
  isSubmitting = false,
}) => {
  return (
    <div
      data-testid='lettering-stage-workspace-bar'
      className='bg-[#FCFBF8] border-b border-[#E7E2D7] px-3 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs'
    >
      {/* Khối bên trái: Công cụ Lettering, Kịch bản khóa & AI Tách thoại */}
      <div className='flex items-center gap-3 flex-wrap'>
        {/* Badge nhận diện Stage */}
        <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-950 text-xs font-bold tracking-wide uppercase font-mono'>
          <span className='w-2 h-2 rounded-full bg-sky-600 animate-pulse' />
          [LETTERING STAGE] Ráp bóng thoại, Kiểu chữ &amp; SFX
        </div>

        {/* Locked Script Checklist Drawer Button */}
        <button
          type='button'
          data-testid='btn-toggle-locked-script-drawer'
          onClick={onToggleScriptDrawer}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
            scriptDrawerOpen
              ? 'bg-[#1C1917] text-white border-stone-800'
              : 'bg-[#F5F2EB] text-stone-700 border-[#E0D9CC] hover:bg-stone-100'
          }`}
        >
          <MessageSquare className='w-3.5 h-3.5 text-orange-600' />
          <span>Kịch bản khóa (Gate 1)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              unplacedCount === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {totalLetterableCount - unplacedCount}/{totalLetterableCount} đã đặt
          </span>
        </button>

        {/* AI TÁCH THOẠI / PHÂN BỔ KỊCH BẢN (CHỈ XUẤT HIỆN Ở STAGE LETTERING) */}
        <button
          type='button'
          data-testid='lettering-bar-auto-assign-btn'
          onClick={onOpenAutoAssignModal}
          title='AI Tách Thoại: Tự động phân bổ các câu thoại kịch bản vào đúng khung tranh'
          className='flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95'
        >
          <Sparkles className='w-3.5 h-3.5 animate-spin' style={{ animationDuration: '6s' }} />
          <span>AI Tách thoại vào khung</span>
        </button>

        {/* Balloon & Typography Toolset */}
        <div className='flex items-center gap-1 bg-[#F5F2EB] p-1 rounded-lg border border-[#E0D9CC] text-xs font-semibold'>
          <button
            type='button'
            data-testid='btn-tool-balloon'
            onClick={() => onSelectTool('balloon')}
            title='Bóng thoại tiêu chuẩn (Oval Speech Balloon)'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              activeTool === 'balloon'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageSquare className='w-3.5 h-3.5' />
            <span>Thoại</span>
          </button>
          <button
            type='button'
            data-testid='btn-tool-thought'
            onClick={() => onSelectTool('thought')}
            title='Bóng suy nghĩ đám mây (Thought Balloon)'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              activeTool === 'thought'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Compass className='w-3.5 h-3.5' />
            <span>Suy nghĩ</span>
          </button>
          <button
            type='button'
            data-testid='btn-tool-tail-edit'
            onClick={() => onSelectTool('tail-edit')}
            title='Vector Balloon Tail Editor: Uốn vuốt đuôi bóng Bezier về phía miệng nhân vật'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              activeTool === 'tail-edit'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <GitBranch className='w-3.5 h-3.5' />
            <span>Vuốt đuôi Bezier</span>
          </button>
          <button
            type='button'
            data-testid='btn-tool-sfx'
            onClick={() => onSelectTool('sfx')}
            title='SFX Styling Engine: Hiệu ứng chữ âm thanh (Warp, Perspective, Outline)'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              activeTool === 'sfx'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Volume2 className='w-3.5 h-3.5 text-rose-500' />
            <span>SFX Âm thanh</span>
          </button>
        </div>

        {/* Reading Flow Path Previewer */}
        <button
          type='button'
          data-testid='btn-toggle-reading-flow'
          onClick={onToggleReadingFlow}
          title='Mô phỏng luồng đọc mắt (Vector Guide Line nối bóng 1 ➔ bóng 2 ➔ bóng 3)'
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
            readingFlowVisible
              ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold'
              : 'bg-[#F5F2EB] text-stone-600 border-[#E0D9CC] hover:bg-stone-100'
          }`}
        >
          <GitBranch className='w-3.5 h-3.5 text-purple-600' />
          <span>Luồng đọc mắt (Flow)</span>
        </button>
      </div>

      {/* Khối bên phải: Nộp hoàn tất trang lên Gate 2 */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          data-testid='btn-submit-gate2'
          onClick={onSubmitToGate2}
          disabled={isSubmitting}
          title='Nộp trang hoàn thiện lên Gate 2 cho Editor kiểm duyệt (Đầy đủ cả Tranh & Chữ)'
          className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-tight shadow-soft-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50'
        >
          <CheckCircle2 className='w-3.5 h-3.5' />
          <span>Nộp duyệt Gate 2</span>
        </button>
      </div>
    </div>
  );
};
