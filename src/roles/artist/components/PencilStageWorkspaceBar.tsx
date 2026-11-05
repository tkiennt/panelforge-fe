import React, { useState } from 'react';
import {
  Sliders,
  Layers,
  Palette,
  Eye,
  EyeOff,
  User,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  BookmarkCheck,
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

  // Two-Tone Sketch Palette
  sketchColor: 'blue' | 'graphite';
  onSketchColorChange: (color: 'blue' | 'graphite') => void;

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
  onHandoffToInk,
  isSubmitting = false,
}) => {
  const [modelSheetOpen, setModelSheetOpen] = useState(false);

  return (
    <div
      data-testid='pencil-stage-workspace-bar'
      className='bg-[#FCFBF8] border-b border-[#E7E2D7] px-3 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs'
    >
      {/* Khối bên trái: Bút chì 2 tông & Áp bóng Storyboard */}
      <div className='flex items-center gap-3 flex-wrap'>
        {/* Badge nhận diện Stage */}
        <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold tracking-wide uppercase font-mono'>
          <span className='w-2 h-2 rounded-full bg-amber-500 animate-pulse' />
          [PENCIL STAGE] Phác thảo nét chì thô &amp; Bố cục
        </div>

        {/* Two-Tone Sketch Palette */}
        <div className='flex items-center gap-1 bg-[#F5F2EB] p-1 rounded-lg border border-[#E0D9CC] text-xs font-semibold'>
          <button
            type='button'
            data-testid='btn-pencil-blue'
            onClick={() => onSketchColorChange('blue')}
            title='Non-photo Blue Pencil: Phác thảo dáng người & phối cảnh sơ bộ'
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
              sketchColor === 'blue'
                ? 'bg-sky-600 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className='w-2.5 h-2.5 rounded-full bg-sky-400 border border-white' />
            <span>Chì Xanh (Non-photo Blue)</span>
          </button>
          <button
            type='button'
            data-testid='btn-pencil-graphite'
            onClick={() => onSketchColorChange('graphite')}
            title='Graphite Pencil: Chì graphite đậm định hình nét'
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
              sketchColor === 'graphite'
                ? 'bg-stone-800 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className='w-2.5 h-2.5 rounded-full bg-stone-700 border border-white' />
            <span>Chì Đen (Graphite)</span>
          </button>
        </div>

        {/* Storyboard Overlay Mode */}
        <div className='flex items-center gap-2 bg-[#F5F2EB] px-2.5 py-1 rounded-lg border border-[#E0D9CC] text-xs'>
          <button
            type='button'
            data-testid='btn-toggle-storyboard-overlay'
            onClick={onToggleStoryboardOverlay}
            disabled={!hasStoryboard}
            title={hasStoryboard ? 'Ẩn / hiện lớp Storyboard áp bóng' : 'Chưa có ảnh Storyboard/Thumbnail'}
            className={`flex items-center gap-1 font-semibold cursor-pointer ${
              showStoryboardOverlay && hasStoryboard
                ? 'text-orange-700'
                : 'text-stone-500 hover:text-stone-800'
            } ${!hasStoryboard ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {showStoryboardOverlay && hasStoryboard ? (
              <Eye className='w-3.5 h-3.5 text-orange-600' />
            ) : (
              <EyeOff className='w-3.5 h-3.5' />
            )}
            <span>Áp bóng Storyboard:</span>
          </button>

          <input
            type='range'
            data-testid='input-storyboard-opacity'
            min={0}
            max={100}
            value={storyboardOpacity}
            onChange={(e) => onStoryboardOpacityChange(Number(e.target.value))}
            disabled={!hasStoryboard || !showStoryboardOverlay}
            className='w-20 accent-orange-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer disabled:opacity-40'
          />
          <span className='font-mono text-[11px] text-stone-600 w-8 text-right'>
            {showStoryboardOverlay && hasStoryboard ? `${storyboardOpacity}%` : 'Tắt'}
          </span>
        </div>

        {/* Model Sheet Quick-Picker Toggle */}
        <div className='relative'>
          <button
            type='button'
            data-testid='btn-model-sheet-picker'
            onClick={() => setModelSheetOpen(!modelSheetOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              selectedBibleEntryId || modelSheetOpen
                ? 'bg-purple-50 text-purple-900 border-purple-300'
                : 'bg-[#F5F2EB] text-stone-700 border-[#E0D9CC] hover:bg-stone-100'
            }`}
          >
            <User className='w-3.5 h-3.5 text-purple-600' />
            <span>Ghim Model Sheet ({bibleEntries.length})</span>
          </button>

          {modelSheetOpen && (
            <div
              data-testid='model-sheet-dropdown'
              className='absolute top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-xl shadow-lg p-2 z-50 space-y-1'
            >
              <div className='text-[11px] font-bold text-stone-500 uppercase px-1 pb-1 border-b border-stone-100 flex items-center justify-between'>
                <span>Thiết kế nhân vật chuẩn</span>
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
                  <p className='text-xs text-stone-400 p-2 italic'>Chưa có Model Sheet trong Bible.</p>
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
                          className='w-7 h-7 rounded-md object-cover border border-stone-200'
                        />
                      ) : (
                        <div className='w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center text-stone-400'>
                          <User className='w-3.5 h-3.5' />
                        </div>
                      )}
                      <span className='truncate flex-1'>{b.name}</span>
                      {selectedBibleEntryId === b.id && (
                        <BookmarkCheck className='w-3.5 h-3.5 text-purple-700 shrink-0' />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Khối bên phải: Bàn giao sang Inking (Frictionless Internal Handoff) */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          data-testid='btn-handoff-pencil-ink-direct'
          onClick={onHandoffToInk}
          disabled={isSubmitting}
          title='Bàn giao nét phác thảo sang Đi Nét Mực (Ink): Hoàn tất nội bộ, không qua duyệt Editor'
          className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold tracking-tight shadow-soft-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50'
        >
          <span>Bàn giao sang Inking (Hand-off to Ink)</span>
          <ArrowRight className='w-3.5 h-3.5' />
        </button>
      </div>
    </div>
  );
};
