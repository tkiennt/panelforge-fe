import React, { useState } from 'react';
import {
  BookOpen,
  Image as ImageIcon,
  Users,
  ChevronLeft,
  Palette,
  Sparkles,
  User,
} from 'lucide-react';
import { PanelBlockData, CharacterModelSheet } from './workspace.types';

const DEFAULT_CHARACTERS: CharacterModelSheet[] = [
  {
    id: 'char-1',
    name: 'Minh Triết',
    role: 'Nhân vật chính · Kiếm sĩ',
    avatarUrl: '',
    palette: ['#F97316', '#1E293B', '#F1F5F9', '#B45309'],
    notes: 'Tóc đen cột cao, áo choàng lam sẫm rách gấu, thanh kiếm bản rộng sau lưng.',
  },
  {
    id: 'char-2',
    name: 'Lãnh chúa Hắc Phong',
    role: 'Phản diện chính · Chỉ huy',
    avatarUrl: '',
    palette: ['#475569', '#0F172A', '#DC2626', '#E2E8F0'],
    notes: 'Giáp thép đen có gai vai, mắt trái có vết sẹo kiếm, tay cầm lệnh tiễn.',
  },
];

interface ScriptReaderColumnProps {
  sceneTitle: string;
  sceneSlugline?: string;
  panels: PanelBlockData[];
  selectedPanelNumber: number | null;
  onSelectPanel: (panelNumber: number) => void;
  characters?: CharacterModelSheet[];
  onToggleCollapse?: () => void;
}

export const ScriptReaderColumn: React.FC<ScriptReaderColumnProps> = ({
  sceneTitle,
  sceneSlugline,
  panels,
  selectedPanelNumber,
  onSelectPanel,
  characters = DEFAULT_CHARACTERS,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'characters'>('script');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterModelSheet | null>(null);

  return (
    <aside
      data-testid='script-reader-column'
      className='w-full h-full flex flex-col bg-[#FAF8F5] border-r border-[#E7E7E7] overflow-hidden select-none'
    >
      {/* 1. Header: Phân cảnh & Tab Switcher */}
      <div className='p-3.5 border-b border-[#E7E7E7] bg-white shrink-0'>
        <div className='flex items-center justify-between gap-2 mb-2'>
          <div className='flex items-center gap-2 min-w-0'>
            <div className='w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center text-[#F97316] shrink-0'>
              <BookOpen className='w-3.5 h-3.5' />
            </div>
            <span className='text-[11px] font-bold uppercase tracking-wider text-stone-500 truncate'>
              Tham chiếu sáng tác
            </span>
          </div>

          {onToggleCollapse && (
            <button
              type='button'
              data-testid='collapse-left-sidebar-btn'
              onClick={onToggleCollapse}
              className='p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer'
              title='Thu gọn thanh tham chiếu (Phím [)'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
          )}
        </div>

        <h2 className='text-sm font-bold text-[#171717] font-serif tracking-tight truncate'>
          {sceneTitle}
        </h2>
        {sceneSlugline && (
          <p className='text-[11px] font-mono text-stone-500 uppercase tracking-wide truncate mt-0.5'>
            {sceneSlugline}
          </p>
        )}

        {/* Tab Switcher: Kịch bản vs Nhân vật */}
        <div className='flex items-center gap-1 mt-3 bg-[#FAF8F5] p-1 rounded-lg border border-stone-200'>
          <button
            type='button'
            data-testid='tab-script-btn'
            onClick={() => setActiveTab('script')}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'script'
                ? 'bg-white text-[#F97316] shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className='w-3.5 h-3.5' />
            <span>Kịch bản ({panels.length} ô)</span>
          </button>
          <button
            type='button'
            data-testid='tab-characters-btn'
            onClick={() => setActiveTab('characters')}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'characters'
                ? 'bg-white text-[#F97316] shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className='w-3.5 h-3.5' />
            <span>Nhân vật ({characters.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Nội dung Tab: Kịch bản hoặc Nhân vật */}
      <div className='flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3'>
        {activeTab === 'script' ? (
          panels.length === 0 ? (
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
          )
        ) : (
          /* TAB 2: NHÂN VẬT & MODEL SHEETS */
          <div data-testid='character-bible-list' className='space-y-3'>
            {characters.map((char) => (
              <div
                key={char.id}
                data-testid={`character-card-${char.id}`}
                onClick={() => setSelectedCharacter(char)}
                className='p-3.5 rounded-xl border border-stone-200 bg-white hover:border-[#F97316]/50 transition-all cursor-pointer shadow-2xs'
              >
                <div className='flex items-start gap-3'>
                  <div className='w-11 h-11 rounded-lg bg-orange-100 flex items-center justify-center text-[#F97316] shrink-0 font-bold text-sm overflow-hidden border border-orange-200'>
                    {char.avatarUrl ? (
                      <img
                        src={char.avatarUrl}
                        alt={char.name}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      char.name.charAt(0)
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-xs font-bold text-stone-900 truncate'>{char.name}</h4>
                    <p className='text-[10px] text-stone-500 truncate'>{char.role}</p>

                    {/* Palette swatches */}
                    <div className='flex items-center gap-1.5 mt-2'>
                      {char.palette.map((color, idx) => (
                        <span
                          key={idx}
                          className='w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-2xs'
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {char.notes && (
                  <p className='mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-600 leading-relaxed font-sans'>
                    {char.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Sheet Lightbox Modal */}
      {selectedCharacter && (
        <div
          data-testid='character-modal'
          className='fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs'
          onClick={() => setSelectedCharacter(null)}
        >
          <div
            className='bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-bold text-base text-stone-900'>{selectedCharacter.name}</h3>
                <p className='text-xs text-stone-500'>{selectedCharacter.role}</p>
              </div>
              <button
                type='button'
                onClick={() => setSelectedCharacter(null)}
                className='text-stone-400 hover:text-stone-700 text-sm font-semibold'
              >
                Đóng
              </button>
            </div>

            <div className='h-48 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 border border-stone-200'>
              <div className='text-center space-y-1'>
                <User className='w-10 h-10 mx-auto text-stone-300' />
                <p className='text-xs font-medium'>Bản thiết kế Model Sheet</p>
                <p className='text-[10px] text-stone-400'>Tỷ lệ cơ thể 7.5 đầu · Góc nghiêng 3/4</p>
              </div>
            </div>

            <div>
              <span className='text-xs font-bold text-stone-700 block mb-1'>
                Bảng màu đặc trưng:
              </span>
              <div className='flex items-center gap-2'>
                {selectedCharacter.palette.map((color, idx) => (
                  <div
                    key={idx}
                    className='flex items-center gap-1 bg-stone-50 px-2 py-1 rounded border border-stone-200'
                  >
                    <span className='w-3 h-3 rounded-full' style={{ backgroundColor: color }} />
                    <span className='text-[10px] font-mono text-stone-600'>{color}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className='text-xs font-bold text-stone-700 block mb-1'>
                Ghi chú trang phục & tạo hình:
              </span>
              <p className='text-xs text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200'>
                {selectedCharacter.notes}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
