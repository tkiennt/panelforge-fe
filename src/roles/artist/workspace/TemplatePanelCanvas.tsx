import React, { useState, useRef } from 'react';
import {
  LayoutTemplate,
  Plus,
  Upload,
  RefreshCw,
  Trash2,
  RotateCcw,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import { PanelBlockData, FramePresetTemplate } from './workspace.types';

export const FRAME_PRESETS: FramePresetTemplate[] = [
  {
    id: 'preset-single-bleed',
    name: '1 Khung Tràn Lề (Full Bleed)',
    description: 'Tranh toàn trang tràn mép bleed 100%, dành cho trang bìa hoặc đại cảnh splash',
    panelCount: 1,
    previewGrid: '1 row',
    panels: [
      { panelNumber: 1, x: 0, y: 0, width: 100, height: 100 },
    ],
  },
  {
    id: 'preset-3-row',
    name: '3 Khung Cơ Bản',
    description: 'Bố cục 3 hàng dọc kinh điển cho manga truyền thống (lề chuẩn manga 2.5% phủ 95% trang)',
    panelCount: 3,
    previewGrid: '3 rows',
    panels: [
      { panelNumber: 1, x: 2.5, y: 2.5, width: 95, height: 29 },
      { panelNumber: 2, x: 2.5, y: 33, width: 95, height: 29 },
      { panelNumber: 3, x: 2.5, y: 63.5, width: 95, height: 34 },
    ],
  },
  {
    id: 'preset-4-yonkoma',
    name: '4-Koma (Yonkoma)',
    description: '4 khung truyện thẳng hàng chuẩn hài hước & đời thường (căn lề chuẩn in ấn)',
    panelCount: 4,
    previewGrid: '4 rows',
    panels: [
      { panelNumber: 1, x: 3, y: 2.5, width: 94, height: 22.4 },
      { panelNumber: 2, x: 3, y: 26.1, width: 94, height: 22.4 },
      { panelNumber: 3, x: 3, y: 49.7, width: 94, height: 22.4 },
      { panelNumber: 4, x: 3, y: 73.3, width: 94, height: 22.4 },
    ],
  },
  {
    id: 'preset-action-dynamic',
    name: 'Hành Động Shonen (5 Khung)',
    description: '1 khung mở lớn đầu trang kết hợp 4 khung đối đầu dồn dập',
    panelCount: 5,
    previewGrid: 'dynamic',
    panels: [
      { panelNumber: 1, x: 2.5, y: 2.5, width: 95, height: 44 },
      { panelNumber: 2, x: 2.5, y: 48, width: 46.9, height: 22 },
      { panelNumber: 3, x: 50.6, y: 48, width: 46.9, height: 22 },
      { panelNumber: 4, x: 2.5, y: 71.5, width: 46.9, height: 26 },
      { panelNumber: 5, x: 50.6, y: 71.5, width: 46.9, height: 26 },
    ],
  },
  {
    id: 'preset-webtoon-spread',
    name: '2 Khung Toàn Cảnh',
    description: '2 khung rộng rãi cho các đại cảnh thiên nhiên hoặc cao trào',
    panelCount: 2,
    previewGrid: '2 rows',
    panels: [
      { panelNumber: 1, x: 2.5, y: 2.5, width: 95, height: 46.75 },
      { panelNumber: 2, x: 2.5, y: 50.75, width: 95, height: 46.75 },
    ],
  },
];

interface TemplatePanelCanvasProps {
  panels: PanelBlockData[];
  selectedPanelNumber: number | null;
  activeTemplateId: string | null;
  onSelectPanel: (panelNumber: number) => void;
  onApplyTemplate: (template: FramePresetTemplate) => void;
  onResetTemplate: () => void;
  onUploadPanelArtwork: (panelNumber: number, file: File) => void;
  onRemovePanelArtwork: (panelNumber: number) => void;
}

export const TemplatePanelCanvas: React.FC<TemplatePanelCanvasProps> = ({
  panels,
  selectedPanelNumber,
  activeTemplateId,
  onSelectPanel,
  onApplyTemplate,
  onResetTemplate,
  onUploadPanelArtwork,
  onRemovePanelArtwork,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hoveredPanelNumber, setHoveredPanelNumber] = useState<number | null>(null);
  const panelFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleDragOver = (e: React.DragEvent, panelNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredPanelNumber(panelNumber);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredPanelNumber(null);
  };

  const handleDrop = (e: React.DragEvent, panelNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredPanelNumber(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadPanelArtwork(panelNumber, file);
    }
  };

  return (
    <div
      data-testid='template-panel-canvas-container'
      className='w-full h-full flex flex-col items-center justify-center p-6 relative overflow-auto custom-scrollbar bg-[#EBE7DF]'
    >
      {/* 1. Empty State: Chưa chọn Mẫu Khung nào */}
      {panels.length === 0 ? (
        <div
          data-testid='template-empty-state-card'
          className='flex flex-col items-center justify-center text-center p-10 bg-white rounded-2xl shadow-xl border border-stone-200 max-w-md select-none'
        >
          <div className='w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-[#F97316] mb-4'>
            <LayoutTemplate className='w-8 h-8 stroke-[1.75]' />
          </div>

          <h3 className='text-base font-bold text-[#171717]'>
            Chưa có mẫu khung tranh cho trang này
          </h3>
          <p className='text-xs text-stone-500 mt-1.5 leading-relaxed'>
            Chọn một mẫu bố cục khung dựng sẵn (3 khung, 4-koma, shonen...) để chia ô và nạp tranh cho từng khung.
          </p>

          <button
            type='button'
            onClick={() => setIsPickerOpen(true)}
            data-testid='open-template-picker-btn'
            className='mt-5 px-5 py-2.5 rounded-xl bg-[#F97316] text-white hover:bg-orange-600 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95'
          >
            <Plus className='w-4 h-4' />
            <span>Chọn Mẫu Khung Tranh</span>
          </button>
        </div>
      ) : (
        /* 2. Interactive B5 Canvas Viewport */
        <div
          data-testid='manga-panel-canvas-sheet'
          className='w-[480px] h-[720px] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-stone-300 relative overflow-hidden select-none'
        >
          {/* Print Production Guides: Trim line (1.8% ~0.125" / 3mm bleed) & Live Safe Margin */}
          <div
            aria-hidden='true'
            className='absolute inset-[1.8%] pointer-events-none border border-dashed border-stone-300/40 z-0'
            title='Đường xén chuẩn (Trim Line: 3mm / 0.125" Bleed)'
          />
          <div
            aria-hidden='true'
            className='absolute top-[3.8%] bottom-[3.8%] left-[4.8%] right-[4.8%] pointer-events-none border border-dotted border-stone-200/50 z-0'
            title='Vùng an toàn (Live Safe Area)'
          />

          {panels.map((panel) => {
            const isSelected = selectedPanelNumber === panel.panelNumber;
            const isHovered = hoveredPanelNumber === panel.panelNumber;
            const hasArt = Boolean(panel.artwork?.previewUrl);

            return (
              <div
                key={panel.id || `panel-canvas-${panel.panelNumber}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPanel(panel.panelNumber);
                }}
                onDragOver={(e) => handleDragOver(e, panel.panelNumber)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, panel.panelNumber)}
                data-testid={`canvas-panel-slot-${panel.panelNumber}`}
                style={{
                  position: 'absolute',
                  left: `${panel.x}%`,
                  top: `${panel.y}%`,
                  width: `${panel.width}%`,
                  height: `${panel.height}%`,
                }}
                className={`border-2 border-[#171717] transition-all duration-150 relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'ring-3 ring-[#F97316] z-20 shadow-md'
                    : isHovered
                      ? 'border-[#F97316] ring-2 ring-[#F97316]/40 z-10'
                      : 'hover:border-stone-800'
                } ${!hasArt ? 'bg-stone-50/70' : 'bg-black'}`}
              >
                {/* Hidden File Input for this specific panel */}
                <input
                  ref={(el) => {
                    panelFileInputRefs.current[panel.panelNumber] = el;
                  }}
                  type='file'
                  accept='image/png,image/jpeg,image/webp'
                  className='hidden'
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadPanelArtwork(panel.panelNumber, f);
                  }}
                />

                {/* Panel Label Pill */}
                <div className='absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold pointer-events-none'>
                  <span>#{panel.panelNumber}</span>
                  {panel.artwork?.version && (
                    <span className='text-amber-300 font-semibold'>
                      · {panel.artwork.version}
                    </span>
                  )}
                </div>

                {hasArt ? (
                  /* Uploaded State */
                  <div className='w-full h-full relative group/art'>
                    <img
                      src={panel.artwork!.previewUrl!}
                      alt={`Khung #${panel.panelNumber}`}
                      className='w-full h-full object-cover'
                    />

                    {/* Hover Action Controls */}
                    <div className='absolute inset-0 bg-black/60 opacity-0 group-hover/art:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          panelFileInputRefs.current[panel.panelNumber]?.click();
                        }}
                        data-testid={`replace-panel-art-btn-${panel.panelNumber}`}
                        title='Thay thế ảnh cho khung này'
                        className='px-2.5 py-1.5 rounded-lg bg-white text-[#171717] hover:bg-stone-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-sm'
                      >
                        <RefreshCw className='w-3 h-3' />
                        <span>Thay thế</span>
                      </button>

                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePanelArtwork(panel.panelNumber);
                        }}
                        data-testid={`remove-panel-art-btn-${panel.panelNumber}`}
                        title='Xóa ảnh khỏi khung này'
                        className='p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-[11px] font-bold cursor-pointer shadow-sm'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty State: Dashed Dropzone */
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      panelFileInputRefs.current[panel.panelNumber]?.click();
                    }}
                    className='w-full h-full flex flex-col items-center justify-center p-2 text-center text-stone-400 hover:text-[#F97316] transition-colors'
                  >
                    <Upload className='w-5 h-5 mb-1 stroke-[1.5]' />
                    <span className='text-[10px] font-bold uppercase tracking-wider'>
                      {isHovered ? `Thả vào Khung #${panel.panelNumber}` : '+ Tải ảnh'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Bottom Floating Control Toolbar */}
      {panels.length > 0 && (
        <div
          data-testid='template-floating-toolbar'
          className='absolute bottom-6 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-xl border border-stone-200 text-xs font-semibold select-none'
        >
          <button
            type='button'
            onClick={() => setIsPickerOpen(true)}
            data-testid='change-template-floating-btn'
            className='flex items-center gap-1.5 text-stone-700 hover:text-[#F97316] px-2.5 py-1 rounded-lg hover:bg-stone-100 cursor-pointer transition-colors'
          >
            <LayoutTemplate className='w-3.5 h-3.5 text-[#F97316]' />
            <span>Đổi Mẫu Khung</span>
          </button>

          <div className='w-px h-4 bg-stone-200' />

          <button
            type='button'
            onClick={onResetTemplate}
            data-testid='reset-template-floating-btn'
            className='flex items-center gap-1.5 text-stone-500 hover:text-rose-600 px-2.5 py-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors'
          >
            <RotateCcw className='w-3.5 h-3.5' />
            <span>Đặt lại</span>
          </button>
        </div>
      )}

      {/* 4. Template Picker Modal */}
      {isPickerOpen && (
        <div
          data-testid='template-picker-modal'
          className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none'
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className='bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className='p-4 border-b border-stone-100 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-[#F97316]'>
                  <LayoutTemplate className='w-4 h-4' />
                </div>
                <div>
                  <h4 className='text-sm font-bold text-[#171717]'>Kho Mẫu Khung Truyện</h4>
                  <p className='text-xs text-stone-500'>Chọn mẫu bố cục chuẩn cho trang manga</p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setIsPickerOpen(false)}
                className='p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Presets Grid */}
            <div className='p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar'>
              {FRAME_PRESETS.map((preset) => {
                const isCurrent = activeTemplateId === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onApplyTemplate(preset);
                      setIsPickerOpen(false);
                    }}
                    data-testid={`preset-card-${preset.id}`}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-[#F97316] bg-orange-50/40 ring-2 ring-[#F97316]/30'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                    }`}
                  >
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-xs font-bold text-[#171717]'>{preset.name}</span>
                      <span className='text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-bold'>
                        {preset.panelCount} Khung
                      </span>
                    </div>

                    <p className='text-[11px] text-stone-500 leading-snug'>
                      {preset.description}
                    </p>

                    {/* Miniature Layout Preview */}
                    <div className='mt-3 h-20 bg-stone-100 rounded-lg border border-stone-200 relative p-1 overflow-hidden'>
                      {preset.panels.map((p) => (
                        <div
                          key={`preview-${preset.id}-${p.panelNumber}`}
                          style={{
                            position: 'absolute',
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            width: `${p.width}%`,
                            height: `${p.height}%`,
                          }}
                          className='border border-stone-700 bg-white flex items-center justify-center text-[9px] font-mono font-bold text-stone-600'
                        >
                          #{p.panelNumber}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
