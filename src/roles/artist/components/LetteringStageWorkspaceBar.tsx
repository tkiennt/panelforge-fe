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
      className='bg-[#FCFBF8] border-b border-[#E8E3D8] px-3 py-1 flex items-center justify-between gap-2 shadow-2xs text-xs overflow-x-auto no-scrollbar'
    >
      {/* Khối công cụ Lettering tinh gọn */}
      <div className='flex items-center gap-2 shrink-0'>
        {/* Kịch bản khóa Gate 1 */}
        <button
          type='button'
          data-testid='btn-toggle-locked-script-drawer'
          onClick={onToggleScriptDrawer}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
            scriptDrawerOpen
              ? 'bg-[#1C1917] text-white border-stone-800'
              : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
          }`}
        >
          <MessageSquare className='w-3.5 h-3.5 text-orange-600' />
          <span>Kịch bản</span>
          <span
            className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold ${
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
          className='flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold shadow-2xs cursor-pointer transition-all active:scale-95'
        >
          <Sparkles className='w-3 h-3' />
          <span>AI Tách thoại</span>
        </button>

        <span className='w-px h-4 bg-stone-300 mx-0.5' />

        {/* Bộ công cụ bóng thoại & SFX */}
        <div className='flex items-center gap-0.5 bg-[#F3EFE6] p-0.5 rounded-lg border border-[#DDD6C8] font-semibold'>
          <button
            type='button'
            data-testid='btn-tool-balloon'
            onClick={() => onSelectTool('balloon')}
            title='Bóng thoại (Speech Balloon)'
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              activeTool === 'balloon'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Bóng thoại
          </button>
          <button
            type='button'
            data-testid='btn-tool-thought'
            onClick={() => onSelectTool('thought')}
            title='Bóng suy nghĩ (Thought Cloud)'
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              activeTool === 'thought'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Suy nghĩ
          </button>
          <button
            type='button'
            data-testid='btn-tool-tail-edit'
            onClick={() => onSelectTool('tail-edit')}
            title='Chỉnh đuôi bóng thoại'
            className={`p-1 rounded-md transition-all cursor-pointer ${
              activeTool === 'tail-edit'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sliders className='w-3 h-3' />
          </button>
          <button
            type='button'
            data-testid='btn-tool-sfx'
            onClick={() => onSelectTool('sfx')}
            title='Hiệu ứng âm thanh (SFX)'
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              activeTool === 'sfx'
                ? 'bg-purple-600 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Volume2 className='w-3 h-3' />
            <span>SFX</span>
          </button>
        </div>

        {/* Lộ trình đọc (Reading Flow) */}
        <button
          type='button'
          data-testid='btn-toggle-reading-flow'
          onClick={onToggleReadingFlow}
          title='Hiển thị lộ trình mắt đọc (Reading Flow)'
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
            readingFlowVisible
              ? 'bg-purple-50 text-purple-900 border-purple-300'
              : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
          }`}
        >
          <Compass className='w-3.5 h-3.5 text-purple-600' />
          <span>Lộ trình đọc</span>
        </button>
      </div>

      {/* Nút nộp Gate 2 */}
      <button
        type='button'
        data-testid='btn-submit-gate2'
        onClick={onSubmitToGate2}
        disabled={isSubmitting}
        title='Nộp bản thảo hoàn chỉnh cho Editor thẩm định ở Gate 2'
        className='flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0 ml-auto'
      >
        <span>Nộp duyệt Gate 2</span>
        <Send className='w-3 h-3' />
      </button>
    </div>
  );
};
