/* Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/ */
import React, { useState } from 'react';
import {
  Palette,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  BookmarkCheck,
  Upload,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import { BibleEntryDto } from '@/services/bible.service';

interface Props {
  // Storyboard Overlay
  storyboardOpacity: number;
  onStoryboardOpacityChange: (val: number) => void;
  showStoryboardOverlay: boolean;
  onToggleStoryboardOverlay: () => void;
  hasStoryboard: boolean;

  // Model Sheet Quick-Picker
  bibleEntries: BibleEntryDto[];
  selectedBibleEntryId: string | null;
  onSelectBibleEntry: (id: string | null) => void;

  // Two-Tone Sketch Palette / Display Filter
  sketchColor: 'blue' | 'graphite';
  onSketchColorChange: (color: 'blue' | 'graphite') => void;

  // Dedicated Artwork Upload Action & Status (Hệ thống dùng để upload ảnh vì chưa hỗ trợ vẽ)
  onTriggerUpload?: () => void;
  hasPencilArtwork?: boolean;
  pencilArtworkVersion?: number | null;
  isUploading?: boolean;

  // Action Handoff
  onHandoffToInk: () => void;
  isSubmitting?: boolean;
}

export const PencilStageWorkspaceBar: React.FC<Props> = ({
  storyboardOpacity,
  onStoryboardOpacityChange,
  showStoryboardOverlay,
  onToggleStoryboardOverlay,
  hasStoryboard,
  bibleEntries,
  selectedBibleEntryId,
  onSelectBibleEntry,
  sketchColor,
  onSketchColorChange,
  onTriggerUpload,
  hasPencilArtwork = false,
  pencilArtworkVersion,
  isUploading = false,
  onHandoffToInk,
  isSubmitting = false,
}) => {
  const [modelSheetOpen, setModelSheetOpen] = useState(false);

  return (
    <div
      data-testid='pencil-stage-workspace-bar'
      className='flex items-center gap-1.5 text-xs shrink-0 select-none'
    >
      {/* Badge định hướng: Upload ảnh nét chì */}
      <div
        data-testid='badge-pencil-upload-mode'
        title='Hệ thống hiện tại chưa hỗ trợ vẽ trực tiếp. Vui lòng vẽ trên phần mềm ngoài (Clip Studio, Photoshop, SAI...) và tải tệp ảnh nét chì lên.'
        className='flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 font-medium text-[11px]'
      >
        <Info className='w-3 h-3 text-amber-600 shrink-0' />
        <span className='font-semibold'>Pencil:</span>
        <span>Upload ảnh nét chì</span>
      </div>

      {/* Nút Upload ảnh nét chì trực tiếp */}
      {onTriggerUpload && (
        <button
          type='button'
          data-testid='btn-upload-pencil-art'
          onClick={onTriggerUpload}
          disabled={isUploading}
          title='Tải tệp ảnh nét chì (PNG, JPG, WEBP) lên máy chủ'
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 ${
            hasPencilArtwork
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {isUploading ? (
            <Loader2 className='w-3 h-3 animate-spin' />
          ) : hasPencilArtwork ? (
            <CheckCircle2 className='w-3 h-3 text-amber-700' />
          ) : (
            <Upload className='w-3 h-3' />
          )}
          <span>
            {isUploading
              ? 'Đang tải...'
              : hasPencilArtwork
                ? `Nét chì v${pencilArtworkVersion ?? 1} (Tải bản mới)`
                : '+ Tải ảnh nét chì'}
          </span>
        </button>
      )}

      {/* Two-Tone Preview Tint (Bộ lọc xem nét chì: Chì Xanh / Chì Đen) */}
      <div className='flex items-center gap-0.5 bg-[#F3EFE6] p-0.5 rounded-lg border border-[#DDD6C8] font-semibold text-[11px]'>
        <button
          type='button'
          data-testid='btn-pencil-blue'
          onClick={() => onSketchColorChange('blue')}
          title='Chế độ xem Chì Xanh: Nét phác thảo dáng & phối cảnh'
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
            sketchColor === 'blue'
              ? 'bg-sky-600 text-white shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className='w-1.5 h-1.5 rounded-full bg-sky-400 border border-white' />
          <span>Chì Xanh</span>
        </button>
        <button
          type='button'
          data-testid='btn-pencil-graphite'
          onClick={() => onSketchColorChange('graphite')}
          title='Chế độ xem Chì Đen: Định hình nét đậm'
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
            sketchColor === 'graphite'
              ? 'bg-stone-800 text-white shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className='w-1.5 h-1.5 rounded-full bg-stone-700 border border-white' />
          <span>Chì Đen</span>
        </button>
      </div>

      {/* Storyboard Overlay Mode: So sánh ảnh nét chì với Storyboard phân cảnh */}
      <div className='flex items-center gap-1 bg-[#F3EFE6] px-1.5 py-0.5 rounded-lg border border-[#DDD6C8] text-[11px]'>
        <button
          type='button'
          data-testid='btn-toggle-storyboard-overlay'
          onClick={onToggleStoryboardOverlay}
          disabled={!hasStoryboard}
          title={hasStoryboard ? 'Ẩn / hiện lớp Storyboard để so sánh' : 'Chưa có ảnh Storyboard'}
          className={`flex items-center gap-1 font-semibold cursor-pointer ${
            showStoryboardOverlay && hasStoryboard
              ? 'text-orange-700'
              : 'text-stone-500 hover:text-stone-800'
          } ${!hasStoryboard ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {showStoryboardOverlay && hasStoryboard ? (
            <Eye className='w-3 h-3 text-orange-600' />
          ) : (
            <EyeOff className='w-3 h-3' />
          )}
          <span className='hidden sm:inline'>Storyboard:</span>
        </button>

        <input
          type='range'
          data-testid='input-storyboard-opacity'
          min={0}
          max={100}
          value={storyboardOpacity}
          onChange={(e) => onStoryboardOpacityChange(Number(e.target.value))}
          disabled={!hasStoryboard || !showStoryboardOverlay}
          className='w-12 accent-orange-600 h-1 bg-stone-200 rounded cursor-pointer disabled:opacity-40'
        />
        <span className='font-mono text-[10px] text-stone-600 w-5 text-right'>
          {showStoryboardOverlay && hasStoryboard ? `${storyboardOpacity}%` : '0%'}
        </span>
      </div>

      {/* Model Sheet Quick-Picker Toggle */}
      <div className='relative'>
        <button
          type='button'
          data-testid='btn-model-sheet-picker'
          onClick={() => setModelSheetOpen(!modelSheetOpen)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
            selectedBibleEntryId || modelSheetOpen
              ? 'bg-purple-50 text-purple-900 border-purple-300'
              : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
          }`}
        >
          <User className='w-3 h-3 text-purple-600' />
          <span>Model Sheet ({bibleEntries.length})</span>
        </button>

        {modelSheetOpen && (
          <div
            data-testid='model-sheet-dropdown'
            className='absolute top-full left-0 mt-1 w-60 bg-white border border-stone-200 rounded-xl shadow-lg p-2 z-50 space-y-1'
          >
            <div className='text-[10px] font-bold text-stone-400 uppercase px-1 pb-1 border-b border-stone-100 flex items-center justify-between'>
              <span>Thiết kế nhân vật</span>
              {selectedBibleEntryId && (
                <button
                  type='button'
                  onClick={() => onSelectBibleEntry(null)}
                  className='text-orange-600 hover:underline text-[10px] cursor-pointer'
                >
                  Bỏ ghim
                </button>
              )}
            </div>
            <div className='max-h-48 overflow-y-auto space-y-1 py-1'>
              {bibleEntries.length === 0 ? (
                <p className='text-xs text-stone-400 p-2 italic'>Chưa có Model Sheet.</p>
              ) : (
                bibleEntries.map((b) => (
                  <button
                    key={b.id}
                    type='button'
                    onClick={() => {
                      onSelectBibleEntry(b.id === selectedBibleEntryId ? null : b.id);
                      setModelSheetOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                      selectedBibleEntryId === b.id
                        ? 'bg-purple-100 text-purple-900 font-bold'
                        : 'hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    {b.referenceImageUrl ? (
                      <img
                        src={b.referenceImageUrl}
                        alt={b.name}
                        className='w-6 h-6 rounded object-cover border border-stone-200'
                      />
                    ) : (
                      <div className='w-6 h-6 rounded bg-stone-100 flex items-center justify-center text-stone-400'>
                        <User className='w-3 h-3' />
                      </div>
                    )}
                    <span className='truncate flex-1'>{b.name}</span>
                    {selectedBibleEntryId === b.id && (
                      <BookmarkCheck className='w-3 h-3 text-purple-700 shrink-0' />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nút bàn giao nội bộ sang Inking */}
      <button
        type='button'
        data-testid='btn-handoff-pencil-ink-direct'
        onClick={onHandoffToInk}
        disabled={isSubmitting}
        title='Bàn giao nét chì sang Ink: Hoàn tất nội bộ, không qua duyệt Editor'
        className='hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF8F5] hover:bg-[#F3EFE6] text-stone-700 border border-[#DDD6C8] text-[11px] font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0'
      >
        <span>➔ Ink</span>
      </button>
    </div>
  );
};
