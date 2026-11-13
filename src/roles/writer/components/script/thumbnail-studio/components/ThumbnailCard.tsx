// src/roles/writer/components/script/thumbnail-studio/components/ThumbnailCard.tsx
import React, { useState } from 'react';
import { PanelNode, CameraShotType } from '../types';
import {
  Camera,
  MessageSquare,
  Sparkles,
  Zap,
  Volume2,
  Phone,
  Eye,
  Edit2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { QuickSketchModal } from './QuickSketchModal';

interface ThumbnailCardProps {
  panel: PanelNode;
  pageNumber: number;
  sketchDataUrl?: string;
  isActive?: boolean;
  onSelectPanel: (panel: PanelNode) => void;
  onSaveSketch: (panelId: string, dataUrl: string) => void;
  onClearSketch: (panelId: string) => void;
}

const shotTypeConfig: Record<
  CameraShotType,
  { label: string; bg: string; text: string; border: string }
> = {
  extreme_wide: {
    label: 'Đại toàn cảnh (X-Wide)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  wide: {
    label: 'Toàn cảnh (Wide)',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  medium: {
    label: 'Trung cảnh (Medium)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  close_up: {
    label: 'Cận cảnh (Close-up)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  extreme_close_up: {
    label: 'Đặc tả (X-Close)',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  pov: {
    label: 'Góc nhìn (POV)',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  unknown: {
    label: 'Tiêu chuẩn',
    bg: 'bg-stone-50',
    text: 'text-stone-700',
    border: 'border-stone-200',
  },
};

export const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  panel,
  pageNumber,
  sketchDataUrl,
  isActive,
  onSelectPanel,
  onSaveSketch,
  onClearSketch,
}) => {
  const [sketchModalOpen, setSketchModalOpen] = useState(false);
  const shotConfig = shotTypeConfig[panel.shotType || 'unknown'];

  return (
    <>
      <div
        data-testid={`thumbnail-card-${panel.id}`}
        onClick={() => onSelectPanel(panel)}
        className={`group relative rounded-xl border transition-all cursor-pointer overflow-hidden bg-white shadow-2xs ${
          isActive
            ? 'border-[#C2410C] ring-2 ring-[#F97316]/30 shadow-md'
            : 'border-[#D8D2C5] hover:border-[#F97316]/70 hover:shadow-xs'
        }`}
      >
        {/* Card Header: Panel Number + Shot Badge */}
        <div className='flex items-center justify-between gap-2 px-3 py-2 bg-[#FCFBF8] border-b border-[#EBE7DF]'>
          <div className='flex items-center gap-1.5'>
            <span className='px-1.5 py-0.5 rounded-md bg-[#1C1917] text-[#FCFBF8] font-mono text-[10px] font-bold'>
              P{pageNumber}.{panel.panelNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${shotConfig.bg} ${shotConfig.text} ${shotConfig.border}`}
            >
              {shotConfig.label}
            </span>
          </div>

          {panel.cameraNote && (
            <span
              className='text-[10px] font-mono text-[#57534E] truncate max-w-[110px]'
              title={panel.cameraNote}
            >
              {panel.cameraNote}
            </span>
          )}
        </div>

        {/* Thumbnail Visual Area (Sketch or Dropzone) */}
        <div className='relative aspect-video w-full bg-[#F7F5EE] border-b border-[#EBE7DF] overflow-hidden flex items-center justify-center'>
          {sketchDataUrl ? (
            <div className='relative w-full h-full group/thumb'>
              <img
                src={sketchDataUrl}
                alt={`Phác thảo P${pageNumber}.${panel.panelNumber}`}
                className='w-full h-full object-contain bg-white'
              />
              <div className='absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    setSketchModalOpen(true);
                  }}
                  className='p-1.5 rounded-lg bg-white text-[#1C1917] hover:bg-[#F3F0E9] shadow-xs cursor-pointer text-xs flex items-center gap-1 font-semibold'
                >
                  <Edit2 className='w-3.5 h-3.5' /> Sửa
                </button>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSketch(panel.id);
                  }}
                  className='p-1.5 rounded-lg bg-white text-rose-600 hover:bg-rose-50 shadow-xs cursor-pointer text-xs flex items-center gap-1 font-semibold'
                >
                  <Trash2 className='w-3.5 h-3.5' /> Xoá
                </button>
              </div>
            </div>
          ) : (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                setSketchModalOpen(true);
              }}
              className='flex flex-col items-center justify-center gap-1 text-[#57534E] hover:text-[#C2410C] p-3 w-full h-full transition-colors cursor-pointer border border-dashed border-transparent hover:border-[#C2410C]/40'
            >
              <div className='w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-2xs border border-[#D8D2C5]'>
                <ImageIcon className='w-3.5 h-3.5 text-[#57534E]' />
              </div>
              <span className='text-[11px] font-semibold'>+ Thêm hình phác</span>
            </button>
          )}
        </div>

        {/* Action Description Snippet */}
        {panel.actionDescription && (
          <div className='p-2.5 text-xs text-[#1C1917] leading-snug line-clamp-2 italic font-serif'>
            &ldquo;{panel.actionDescription}&rdquo;
          </div>
        )}

        {/* Dialogue Bubbles & SFX Preview */}
        {(panel.dialogues.length > 0 || panel.sfx.length > 0) && (
          <div className='p-2 pt-0 space-y-1.5'>
            {/* SFX Badges */}
            {panel.sfx.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {panel.sfx.map((s) => (
                  <span
                    key={s.id}
                    className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10px] font-black uppercase tracking-wider shadow-2xs'
                  >
                    <Volume2 className='w-2.5 h-2.5 text-amber-600' /> {s.text}
                  </span>
                ))}
              </div>
            )}

            {/* Speech Bubble Chips */}
            {panel.dialogues.map((d) => {
              const isShout = d.modifier === 'shout';
              const isThought = d.modifier === 'thought';
              const isWhisper = d.modifier === 'whisper';
              const isFilter = d.modifier === 'filter';

              return (
                <div
                  key={d.id}
                  className={`flex items-start gap-1.5 p-1.5 rounded-lg border text-[11px] ${
                    isShout
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-bold'
                      : isThought
                        ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 italic'
                        : isWhisper
                          ? 'bg-stone-50 border-stone-200 text-stone-600 italic'
                          : isFilter
                            ? 'bg-amber-50/80 border-amber-200 text-amber-950 font-mono'
                            : 'bg-amber-50/50 border-[#EBE7DF] text-[#1C1917]'
                  }`}
                >
                  <span className='shrink-0 mt-0.5'>
                    {isShout ? (
                      <Zap className='w-3 h-3 text-rose-600' />
                    ) : isThought ? (
                      <Sparkles className='w-3 h-3 text-indigo-600' />
                    ) : isFilter ? (
                      <Phone className='w-3 h-3 text-amber-600' />
                    ) : (
                      <MessageSquare className='w-3 h-3 text-amber-700' />
                    )}
                  </span>
                  <div className='min-w-0'>
                    <span className='font-mono font-bold uppercase tracking-wider text-[10px] text-[#C2410C] mr-1'>
                      {d.character}
                      {d.modifier && (
                        <span className='text-[9px] font-normal lowercase ml-0.5 opacity-70'>
                          ({d.modifier})
                        </span>
                      )}
                      :
                    </span>
                    <span className='text-[11px] leading-tight line-clamp-2'>{d.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QuickSketchModal
        isOpen={sketchModalOpen}
        panelTitle={`P${pageNumber}.${panel.panelNumber}`}
        initialDataUrl={sketchDataUrl}
        onClose={() => setSketchModalOpen(false)}
        onSave={(dataUrl) => onSaveSketch(panel.id, dataUrl)}
        onClear={() => onClearSketch(panel.id)}
      />
    </>
  );
};
