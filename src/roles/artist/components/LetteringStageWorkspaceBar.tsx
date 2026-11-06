/* Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/ */
import React from 'react';
import {
  Type,
  Sparkles,
  MessageSquare,
  Volume2,
  Compass,
  Send,
  Sliders,
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
      className='flex items-center gap-1.5 text-xs shrink-0 select-none'
    >
      {/* Kịch bản khóa Gate 1 */}
      <button
        type='button'
        data-testid='btn-toggle-locked-script-drawer'
        onClick={onToggleScriptDrawer}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border font-semibold text-[11px] cursor-pointer transition-colors ${
          scriptDrawerOpen
            ? 'bg-[#1C1917] text-white border-stone-800'
            : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
        }`}
      >
        <MessageSquare className='w-3 h-3 text-orange-600' />
        <span>Kịch bản</span>
        <span
          className={`px-1 rounded text-[10px] font-mono font-bold ${
            unplacedCount === 0
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-900'
          }`}
        >
          {totalLetterableCount - unplacedCount}/{totalLetterableCount}
        </span>
      </button>

      {/* AI Tách Thoại */}
      <button
        type='button'
        data-testid='lettering-bar-auto-assign-btn'
        onClick={onOpenAutoAssignModal}
        title='AI Tách Thoại: Tự động phân bổ câu thoại vào đúng khung'
        className='flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-[11px] shadow-2xs cursor-pointer transition-all active:scale-95'
      >
        <Sparkles className='w-3 h-3' />
        <span>AI Tách thoại</span>
      </button>

      {/* Bộ công cụ bóng thoại & SFX */}
      <div className='flex items-center gap-0.5 bg-[#F3EFE6] p-0.5 rounded-lg border border-[#DDD6C8] font-semibold text-[11px]'>
        <button
          type='button'
          data-testid='btn-tool-balloon'
          onClick={() => onSelectTool('balloon')}
          title='Bóng thoại (Speech Balloon)'
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
            activeTool === 'balloon'
              ? 'bg-purple-600 text-white shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Type className='w-3 h-3' />
          <span>Thoại</span>
        </button>
        <button
          type='button'
          data-testid='btn-tool-thought'
          onClick={() => onSelectTool('thought')}
          title='Bóng suy nghĩ (Thought Bubble)'
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
            activeTool === 'thought'
              ? 'bg-purple-600 text-white shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>💭 Nghĩ</span>
        </button>
        <button
          type='button'
          data-testid='btn-tool-tail-edit'
          onClick={() => onSelectTool('tail-edit')}
          title='Chỉnh đuôi bóng thoại'
          className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
            activeTool === 'tail-edit'
              ? 'bg-purple-600 text-white shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Đuôi
        </button>
        <button
          type='button'
          data-testid='btn-tool-sfx'
          onClick={() => onSelectTool('sfx')}
          title='Hiệu ứng âm thanh (SFX Manga)'
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
            activeTool === 'sfx'
              ? 'bg-purple-600 text-white shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Volume2 className='w-3 h-3' />
          <span>SFX</span>
        </button>
      </div>

      {/* Dòng đọc & Điều hướng thị giác (Reading Flow) */}
      <button
        type='button'
        data-testid='btn-toggle-reading-flow'
        onClick={onToggleReadingFlow}
        title='Ẩn / hiện luồng đọc Manga (Reading Flow Z-pattern)'
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border font-semibold text-[11px] cursor-pointer transition-colors ${
          readingFlowVisible
            ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold'
            : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
        }`}
      >
        <Compass className='w-3 h-3 text-indigo-600' />
        <span>Dòng đọc</span>
      </button>

      {/* Nút nộp Gate 2 */}
      <button
        type='button'
        data-testid='btn-submit-gate2'
        onClick={onSubmitToGate2}
        disabled={isSubmitting}
        title='Nộp duyệt Gate 2'
        className='hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF8F5] hover:bg-[#F3EFE6] text-stone-700 border border-[#DDD6C8] text-[11px] font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0'
      >
        <span>➔ Gate 2</span>
      </button>
    </div>
  );
};
