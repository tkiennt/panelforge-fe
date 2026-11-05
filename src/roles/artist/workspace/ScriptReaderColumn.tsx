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
            const artworkUrl = panel.artwork?.imageUrl || panel.artwork?.thumbnailUrl;
            const hasArtwork = Boolean(artworkUrl);

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
                        src={artworkUrl!}
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
                        KHUNG #{panel.panelNumber}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          hasArtwork
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : 'bg-stone-50 text-stone-400 border-stone-200/60'
                        }`}
                      >
                        {hasArtwork ? 'Đã có tranh' : 'Chờ vẽ'}
                      </span>
                    </div>

                    <p className='text-[11px] text-stone-400 mt-0.5 font-mono'>
                      Thứ tự đọc: {panel.readingOrder || panel.panelNumber}
                    </p>
                  </div>
                </div>

                {/* Body thẻ: Chỉ dẫn hành động (Action) & Thoại nhân vật (Dialogue) */}
                <div className='space-y-2 text-xs leading-relaxed'>
                  {panel.scriptLines.length === 0 ? (
                    <p className='text-stone-400 italic text-[11px]'>
                      Chưa có chỉ dẫn hay lời thoại cho khung này.
                    </p>
                  ) : (
                    panel.scriptLines.map((line) => (
                      <div key={line.id} className='space-y-1'>
                        {/* Chỉ dẫn hành động (Action/Direction) - Font thẳng, sắc nét */}
                        {line.stageDirection && (
                          <div className='text-stone-700 font-sans text-xs bg-stone-50/70 p-2 rounded-lg border border-stone-200/50'>
                            <span className='font-semibold text-stone-500 text-[10px] uppercase tracking-wide block mb-0.5'>
                              Hành động:
                            </span>
                            {line.stageDirection}
                          </div>
                        )}

                        {/* Lời thoại nhân vật (Dialogue) */}
                        {line.dialogueText && (
                          <div className='pl-2 border-l-2 border-[#F97316] py-0.5 space-y-0.5'>
                            <div className='flex items-center gap-1.5'>
                              <span
                                className='font-bold text-xs'
                                style={{ color: line.characterColor || '#171717' }}
                              >
                                {line.characterName || 'Nhân vật'}:
                              </span>
                            </div>
                            <p className='text-stone-800 text-xs italic font-serif'>
                              &ldquo;{line.dialogueText}&rdquo;
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
