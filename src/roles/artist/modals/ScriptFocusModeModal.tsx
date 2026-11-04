import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  X,
  BookOpen,
  Search,
  Film,
  MessageSquare,
  Sun,
  Moon,
  Trees,
  Home,
  ArrowRight,
  Maximize2,
  ExternalLink,
  Layers,
  ChevronRight,
  List,
} from 'lucide-react';
import { SceneDto, SceneDetailDto, SceneScriptLineSummaryDto, scriptLineService } from '@/services/scriptLine.service';
import { BibleEntryDto } from '@/services/bible.service';
import { PageDto } from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';

export interface ScriptFocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle?: string;
  chapterNumber?: number;
  chapterOutline?: string | null;
  scenes: SceneDto[];
  bibleEntries: BibleEntryDto[];
  pages: PageDto[];
  allPanels: PanelDto[];
  onSelectPanelAndPage?: (panel: PanelDto, page: PageDto) => void;
}

export const ScriptFocusModeModal: React.FC<ScriptFocusModeModalProps> = ({
  isOpen,
  onClose,
  chapterTitle,
  chapterNumber,
  chapterOutline,
  scenes,
  bibleEntries,
  pages,
  allPanels,
  onSelectPanelAndPage,
}) => {
  const [sceneDetails, setSceneDetails] = useState<Record<string, SceneDetailDto>>({});
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [activeTocSceneId, setActiveTocSceneId] = useState<string>('');

  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Tạo map Bible entries để tra cứu nhanh thông tin nhân vật
  const bibleEntryById = useMemo(() => {
    const map: Record<string, BibleEntryDto> = {};
    for (const b of bibleEntries) {
      map[b.id] = b;
    }
    return map;
  }, [bibleEntries]);

  // Tạo map Panel theo ID
  const panelById = useMemo(() => {
    const map: Record<string, PanelDto> = {};
    for (const p of allPanels) {
      map[p.id] = p;
    }
    return map;
  }, [allPanels]);

  // Tạo map Page theo ID
  const pageById = useMemo(() => {
    const map: Record<string, PageDto> = {};
    for (const p of pages) {
      map[p.id] = p;
    }
    return map;
  }, [pages]);

  // Helper sinh màu nhận diện cho avatar nhân vật
  const getCharacterColor = (nameOrId: string) => {
    const colors = [
      'bg-amber-100 text-amber-800 border-amber-300',
      'bg-sky-100 text-sky-800 border-sky-300',
      'bg-emerald-100 text-emerald-800 border-emerald-300',
      'bg-rose-100 text-rose-800 border-rose-300',
      'bg-indigo-100 text-indigo-800 border-indigo-300',
      'bg-purple-100 text-purple-800 border-purple-300',
    ];
    let hash = 0;
    for (let i = 0; i < nameOrId.length; i++) {
      hash = nameOrId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Nạp toàn bộ script lines của các scenes khi modal mở
  useEffect(() => {
    if (!isOpen || scenes.length === 0) return;

    let alive = true;
    setLoadingScenes(true);

    Promise.all(
      scenes.map(async (sc) => {
        try {
          const detail = await scriptLineService.getSceneById(sc.id);
          return { id: sc.id, detail };
        } catch {
          return {
            id: sc.id,
            detail: {
              ...sc,
              scriptLines: [],
            } as SceneDetailDto,
          };
        }
      })
    )
      .then((results) => {
        if (!alive) return;
        const map: Record<string, SceneDetailDto> = {};
        for (const item of results) {
          map[item.id] = item.detail;
        }
        setSceneDetails(map);
        if (scenes.length > 0 && !activeTocSceneId) {
          setActiveTocSceneId(scenes[0].id);
        }
      })
      .finally(() => {
        if (alive) setLoadingScenes(false);
      });

    return () => {
      alive = false;
    };
  }, [isOpen, scenes]);

  // Tính tổng số dòng kịch bản
  const totalScriptLinesCount = useMemo(() => {
    let count = 0;
    for (const sc of scenes) {
      const detail = sceneDetails[sc.id];
      count += detail?.scriptLines?.length || sc.scriptLinesCount || 0;
    }
    return count;
  }, [scenes, sceneDetails]);

  // Nhảy tới một phân cảnh cụ thể
  const scrollToScene = (sceneId: string) => {
    setActiveTocSceneId(sceneId);
    const targetEl = document.getElementById(`focus-scene-block-${sceneId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) return null;

  const textSizeClasses = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='script-focus-modal-title'
      data-testid='script-focus-mode-modal'
      className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs'
    >
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
        {/* Modal Header */}
        <div className='px-5 py-3.5 bg-[#F8F6F0] border-b border-[#D8D2C5] flex items-center justify-between gap-4 shrink-0'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='p-2 bg-[#FFF2E6] border border-[#FDBA74] text-[#C2410C] rounded-xl shrink-0'>
              <BookOpen className='w-5 h-5' />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <h2
                  id='script-focus-modal-title'
                  className='text-base sm:text-lg font-bold text-[#1C1917] truncate'
                >
                  {chapterTitle || `Chương #${chapterNumber ?? 1}`}
                </h2>
                <span className='px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EFECE6] text-[#57534E] shrink-0 border border-[#D8D2C5]'>
                  Focus Mode
                </span>
              </div>
              <div className='flex items-center gap-3 text-xs text-[#78716C] mt-0.5'>
                <span>{scenes.length} phân cảnh</span>
                <span>•</span>
                <span>{totalScriptLinesCount} dòng kịch bản</span>
                {chapterOutline && (
                  <>
                    <span className='hidden sm:inline'>•</span>
                    <span className='hidden sm:inline truncate max-w-md italic'>
                      {chapterOutline}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Công cụ đọc & Tìm kiếm & Đóng */}
          <div className='flex items-center gap-2.5 shrink-0'>
            {/* Search Input */}
            <div className='relative w-40 sm:w-64 hidden sm:block'>
              <Search className='w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Tìm kiếm toàn văn kịch bản...'
                data-testid='focus-mode-search-input'
                className='w-full pl-8 pr-6 py-1.5 text-xs bg-white border border-[#D8D2C5] rounded-xl focus:outline-none focus:border-[#C2410C] focus:ring-1 focus:ring-[#C2410C] placeholder:text-stone-400 text-stone-800 transition-colors'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600'
                >
                  <X className='w-3 h-3' />
                </button>
              )}
            </div>

            {/* Font Size Selector */}
            <div
              className='flex items-center bg-[#EBE7DF] p-0.5 rounded-lg text-xs font-bold text-stone-600'
              title='Cỡ chữ'
            >
              <button
                type='button'
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  fontSize === 'sm'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-bold'
                    : 'hover:text-stone-900'
                }`}
                title='Cỡ chữ nhỏ'
              >
                A-
              </button>
              <button
                type='button'
                onClick={() => setFontSize('base')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  fontSize === 'base'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-bold'
                    : 'hover:text-stone-900'
                }`}
                title='Cỡ chữ vừa'
              >
                A
              </button>
              <button
                type='button'
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  fontSize === 'lg'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-bold'
                    : 'hover:text-stone-900'
                }`}
                title='Cỡ chữ lớn'
              >
                A+
              </button>
            </div>

            {/* Close Button */}
            <button
              type='button'
              onClick={onClose}
              data-testid='script-focus-modal-close-btn'
              className='p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer'
              title='Đóng chế độ Focus Mode (Esc)'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Modal Body: Split View (Sidebar Mục Lục + Luồng Kịch Bản) */}
        <div className='flex-1 min-h-0 flex overflow-hidden'>
          {/* Cột trái: Mục lục phân cảnh (Table of Contents) */}
          <aside className='w-64 lg:w-72 border-r border-[#D8D2C5] bg-[#F8F6F0]/80 p-3 flex flex-col min-h-0 shrink-0 hidden md:flex'>
            <div className='flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-[#78716C] uppercase tracking-wider mb-2'>
              <List className='w-3.5 h-3.5' />
              <span>Mục Lục Phân Cảnh</span>
            </div>

            <div className='flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1'>
              {scenes.map((sc) => {
                const isActive = activeTocSceneId === sc.id;
                const detail = sceneDetails[sc.id];
                const linesCount = detail?.scriptLines?.length || sc.scriptLinesCount || 0;

                return (
                  <button
                    key={sc.id}
                    type='button'
                    data-testid={`focus-toc-item-${sc.id}`}
                    onClick={() => scrollToScene(sc.id)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer space-y-1 border ${
                      isActive
                        ? 'bg-white border-[#FDBA74] text-[#C2410C] shadow-2xs font-medium'
                        : 'bg-transparent border-transparent text-[#44403C] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <div className='flex items-center justify-between gap-1'>
                      <span className='text-xs font-bold truncate'>
                        Cảnh #{sc.sceneNumber}: {sc.heading || sc.sceneName || 'Không tiêu đề'}
                      </span>
                      <span className='text-[10px] font-mono text-[#78716C] bg-stone-200/60 px-1 py-0.5 rounded shrink-0'>
                        {linesCount} dòng
                      </span>
                    </div>
                    {sc.summary && (
                      <p className='text-[11px] text-stone-500 line-clamp-1 italic'>
                        {sc.summary}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Cột phải: Toàn văn kịch bản của chương */}
          <main
            ref={contentScrollRef}
            data-testid='focus-mode-script-stream'
            className='flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-8 bg-[#FCFBF8]'
          >
            {loadingScenes ? (
              <div className='py-20 text-center space-y-3'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent' />
                <p className='text-sm text-stone-500'>Đang tải toàn văn kịch bản chương...</p>
              </div>
            ) : scenes.length === 0 ? (
              <div className='py-20 text-center text-stone-400 italic text-sm'>
                Chương này chưa có phân cảnh nào.
              </div>
            ) : (
              scenes.map((sc) => {
                const detail = sceneDetails[sc.id];
                const rawLines = detail?.scriptLines || [];

                // Lọc theo search query
                const filteredLines = rawLines.filter((l) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase().trim();
                  const charName = l.speakerCharacterId
                    ? bibleEntryById[l.speakerCharacterId]?.name || ''
                    : '';
                  return (
                    (l.dialogueText && l.dialogueText.toLowerCase().includes(q)) ||
                    (l.stageDirection && l.stageDirection.toLowerCase().includes(q)) ||
                    charName.toLowerCase().includes(q) ||
                    String(l.lineOrder).includes(q)
                  );
                });

                if (searchQuery.trim() && filteredLines.length === 0) {
                  return null;
                }

                const isExt = sc.slugline?.toUpperCase().includes('EXT') || sc.heading?.toUpperCase().includes('NGOẠI');
                const isNight = sc.slugline?.toUpperCase().includes('NIGHT') || sc.heading?.toUpperCase().includes('ĐÊM') || sc.slugline?.toUpperCase().includes('TỐI');

                return (
                  <section
                    key={sc.id}
                    id={`focus-scene-block-${sc.id}`}
                    data-testid={`focus-scene-block-${sc.id}`}
                    className='space-y-3.5 pb-6 border-b border-[#E7E2D8] last:border-b-0'
                  >
                    {/* Header Phân Cảnh */}
                    <div className='bg-[#F5F2EB]/90 border border-[#D8D2C5] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5'>
                      <div className='space-y-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='px-2 py-0.5 bg-[#C2410C] text-white font-bold text-xs rounded-md shadow-2xs'>
                            Cảnh #{sc.sceneNumber}
                          </span>
                          <h3 className='text-sm sm:text-base font-bold text-[#1C1917] tracking-wide uppercase truncate'>
                            {sc.heading || sc.sceneName || 'Không tiêu đề'}
                          </h3>
                        </div>

                        {sc.summary && (
                          <p className='text-xs text-stone-600 italic'>
                            {sc.summary}
                          </p>
                        )}
                      </div>

                      {/* Slugline Badge */}
                      <div className='flex items-center gap-2 shrink-0'>
                        <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-semibold shadow-2xs'>
                          {isNight ? (
                            <Moon className='w-3.5 h-3.5 text-indigo-500' />
                          ) : (
                            <Sun className='w-3.5 h-3.5 text-amber-500' />
                          )}
                          {isExt ? (
                            <Trees className='w-3.5 h-3.5 text-emerald-600' />
                          ) : (
                            <Home className='w-3.5 h-3.5 text-sky-600' />
                          )}
                          <span className='uppercase tracking-wider text-[11px] font-mono'>
                            {sc.slugline || (isExt ? 'EXT' : 'INT')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách Dòng Kịch Bản của Cảnh */}
                    <div className='space-y-2.5 pl-1 sm:pl-3'>
                      {filteredLines.length === 0 ? (
                        <p className='text-xs italic text-stone-400 py-2'>
                          Phân cảnh này chưa có dòng kịch bản nào.
                        </p>
                      ) : (
                        filteredLines.map((line) => {
                          const hasDialogue = Boolean(line.speakerCharacterId || line.dialogueText?.trim());
                          const hasDirection = Boolean(line.stageDirection?.trim());
                          const bibleEntry = line.speakerCharacterId
                            ? bibleEntryById[line.speakerCharacterId]
                            : null;
                          const characterName = bibleEntry?.name || (line.speakerCharacterId ? 'Nhân vật' : 'Lời thoại');

                          // Tìm panel và page được gán
                          const assignedPanel = line.panelId ? panelById[line.panelId] : null;
                          const assignedPage = assignedPanel?.pageId ? pageById[assignedPanel.pageId] : null;

                          return (
                            <div
                              key={line.id}
                              data-testid={`focus-script-line-${line.id}`}
                              className='p-3.5 rounded-xl border border-[#E7E2D8] bg-white hover:border-[#FDBA74] transition-all space-y-2 shadow-2xs'
                            >
                              {/* Header Dòng & Nút nhảy tới Panel */}
                              <div className='flex items-center justify-between gap-2 text-xs'>
                                <div className='flex items-center gap-2'>
                                  <span className='font-mono font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded'>
                                    #{line.lineOrder}
                                  </span>
                                  {hasDirection && (
                                    <span className='inline-flex items-center gap-1 text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded font-semibold text-[11px]'>
                                      <Film className='w-3 h-3 text-amber-700' />
                                      <span>Chỉ dẫn</span>
                                    </span>
                                  )}
                                  {hasDialogue && (
                                    <span className='inline-flex items-center gap-1 text-sky-800 bg-sky-100/70 px-1.5 py-0.5 rounded font-semibold text-[11px]'>
                                      <MessageSquare className='w-3 h-3 text-sky-700' />
                                      <span>Thoại</span>
                                    </span>
                                  )}
                                </div>

                                {/* Nhảy tới Canvas Panel */}
                                {assignedPanel && assignedPage && onSelectPanelAndPage ? (
                                  <button
                                    type='button'
                                    data-testid={`focus-jump-to-panel-${line.id}`}
                                    onClick={() => {
                                      onSelectPanelAndPage(assignedPanel, assignedPage);
                                      onClose();
                                    }}
                                    title={`Chuyển tới Trang ${assignedPage.pageNumber} › Khung #${assignedPanel.panelNumber} trên Canvas`}
                                    className='inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer'
                                  >
                                    <Layers className='w-3 h-3 text-amber-700' />
                                    <span>
                                      Trang {assignedPage.pageNumber} › Khung {assignedPanel.panelNumber}
                                    </span>
                                    <ArrowRight className='w-2.5 h-2.5' />
                                  </button>
                                ) : (
                                  <span className='text-[11px] text-stone-400 font-mono'>
                                    (Chưa gán khung)
                                  </span>
                                )}
                              </div>

                              {/* 1. Khối Chỉ Dẫn Diễn Xuất */}
                              {hasDirection && (
                                <div className='p-2.5 rounded-lg bg-[#F8F6F0] border border-[#EBE7DF] text-stone-800 leading-relaxed font-serif'>
                                  <div className='flex items-start gap-2'>
                                    <Film className='w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5' />
                                    <span className={`italic ${textSizeClasses[fontSize]}`}>
                                      {line.stageDirection}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* 2. Khối Lời Thoại */}
                              {hasDialogue && (
                                <div className='space-y-1.5'>
                                  {/* Nhân vật */}
                                  <div className='flex items-center gap-2'>
                                    {bibleEntry?.referenceImageUrl ? (
                                      <img
                                        src={bibleEntry.referenceImageUrl}
                                        alt={characterName}
                                        className='w-5 h-5 rounded-full object-cover border border-amber-300'
                                      />
                                    ) : (
                                      <div
                                        className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center ${getCharacterColor(
                                          characterName
                                        )}`}
                                      >
                                        {characterName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className='font-bold text-[#1C1917] text-xs sm:text-sm'>
                                      {characterName}
                                    </span>
                                    {bibleEntry?.subtitle && (
                                      <span className='text-xs text-stone-500 italic'>
                                        ({bibleEntry.subtitle})
                                      </span>
                                    )}
                                  </div>

                                  {/* Bong bóng thoại */}
                                  <div
                                    className={`p-2.5 bg-[#FFFDF9] border border-amber-200/90 rounded-lg text-stone-900 shadow-2xs font-medium leading-relaxed ${textSizeClasses[fontSize]}`}
                                  >
                                    &ldquo;{line.dialogueText || ''}&rdquo;
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
