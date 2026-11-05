import React from 'react';
import { BookOpen, Image as ImageIcon, Sparkles, User } from 'lucide-react';
import { PanelBlockData } from './workspace.types';

interface ScriptReaderColumnProps {
  sceneTitle: string;
  sceneSlugline?: string;
  panels: PanelBlockData[];
  selectedPanelNumber: number | null;
  onSelectPanel: (panelNumber: number) => void;
}

export const ScriptReaderColumn: React.FC<ScriptReaderColumnProps> = ({
  sceneTitle,
  sceneSlugline,
  panels,
  selectedPanelNumber,
  onSelectPanel,
}) => {
  return (
    <aside
      data-testid='script-reader-column'
      className='w-full h-full flex flex-col bg-[#FAF8F5] border-r border-[#E7E7E7] overflow-hidden select-none'
    >
      {/* 1. Header: Phân cảnh & Bối cảnh (Strictly Read-Only) */}
      <div className='p-4 border-b border-[#E7E7E7] bg-white shrink-0'>
        <div className='flex items-center gap-2 mb-1.5'>
          <div className='w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center text-[#F97316]'>
            <BookOpen className='w-3.5 h-3.5' />
          </div>
          <span className='text-[11px] font-bold uppercase tracking-wider text-stone-500'>
            Kịch bản phân cảnh
          </span>
        </div>
        <h2 className='text-sm font-bold text-[#171717] font-serif tracking-tight truncate'>
          {sceneTitle}
        </h2>
        {sceneSlugline && (
          <p className='text-[11px] font-mono text-stone-500 uppercase tracking-wide truncate mt-0.5'>
            {sceneSlugline}
          </p>
        )}
      </div>

      {/* 2. Danh sách Thẻ Khung (Panel Block Cards) */}
      <div className='flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3'>
        {panels.length === 0 ? (
          <div className='h-full flex flex-col items-center justify-center text-center p-6 text-stone-400'>
            <BookOpen className='w-8 h-8 stroke-[1.5] text-stone-300 mb-2' />
            <p className='text-xs font-serif italic'>Trang này chưa có dữ liệu kịch bản.</p>
          </div>
        ) : (
          panels.map((panel) => {
            const isSelected = selectedPanelNumber === panel.panelNumber;
            const hasArtwork = Boolean(panel.artwork?.previewUrl);

            return (
              <div
                key={panel.id || `panel-${panel.panelNumber}`}
                data-testid={`panel-script-card-${panel.panelNumber}`}
                onClick={() => onSelectPanel(panel.panelNumber)}
                className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer relative group text-left ${
                  isSelected
                    ? 'border-[#F97316] bg-white ring-2 ring-[#F97316]/20 shadow-xs'
                    : 'border-[#E7E7E7] bg-white hover:border-stone-300 hover:shadow-2xs'
                }`}
              >
                {/* Header thẻ: Số khung & Thumbnail 60x60 */}
                <div className='flex items-start gap-3 mb-2.5 pb-2.5 border-b border-stone-100'>
                  {/* Thumbnail Slot (60x60px) */}
                  <div className='w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-stone-50 flex items-center justify-center relative'>
                    {hasArtwork ? (
                      <img
                        src={panel.artwork!.previewUrl!}
                        alt={`Khung #${panel.panelNumber}`}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='flex flex-col items-center justify-center text-stone-300 gap-0.5'>
                        <ImageIcon className='w-5 h-5 stroke-[1.5]' />
                        <span className='text-[9px] font-mono'>Trống</span>
                      </div>
                    )}
                    {panel.artwork?.version && (
                      <span className='absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/75 text-[8px] font-mono font-bold text-white'>
                        {panel.artwork.version}
                      </span>
                    )}
                  </div>

                  {/* Nhãn khung & Trạng thái */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between gap-1.5'>
                      <span
                        className={`text-xs font-bold font-mono tracking-tight ${
                          isSelected ? 'text-[#F97316]' : 'text-[#171717]'
                        }`}
                      >
                        Khung #{panel.panelNumber}
                      </span>
                      <span className='text-[10px] font-mono text-stone-400'>
                        Thứ tự #{panel.readingOrder}
                      </span>
                    </div>

                    <div className='mt-1 flex items-center gap-1 text-[11px] text-stone-500'>
                      {hasArtwork ? (
                        <span className='inline-flex items-center gap-1 text-emerald-600 font-medium'>
                          <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
                          Đã có tranh
                        </span>
                      ) : (
                        <span className='text-stone-400 italic'>Chưa nạp tranh</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nội dung kịch bản của khung */}
                <div className='space-y-2'>
                  {panel.scriptLines.length === 0 ? (
                    <p className='text-xs text-stone-400 italic font-serif'>
                      (Chưa có chỉ dẫn cụ thể cho khung này)
                    </p>
                  ) : (
                    panel.scriptLines.map((line) => (
                      <div key={line.id} className='space-y-1'>
                        {/* 1. Chỉ dẫn hành động / Bối cảnh */}
                        {line.stageDirection && (
                          <p className='text-xs text-stone-700 italic font-serif leading-relaxed'>
                            {line.stageDirection}
                          </p>
                        )}

                        {/* 2. Lời thoại nhân vật */}
                        {line.dialogueText && (
                          <div className='pl-2.5 border-l-2 border-stone-200 py-0.5 mt-1'>
                            {line.characterName && (
                              <div className='flex items-center gap-1.5 mb-0.5'>
                                <span
                                  className='w-2 h-2 rounded-full shrink-0'
                                  style={{
                                    backgroundColor: line.characterColor || '#F97316',
                                  }}
                                />
                                <span className='text-[11px] font-bold text-[#171717] tracking-wide'>
                                  {line.characterName}
                                </span>
                              </div>
                            )}
                            <p className='text-xs text-[#171717] font-sans leading-relaxed'>
                              "{line.dialogueText}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
