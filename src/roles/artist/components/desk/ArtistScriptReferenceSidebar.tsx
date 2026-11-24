import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { resolveScriptLineMeta, type ScriptLineItem } from './ArtistCanvaSidebar';
import type { PanelDto } from '@/types/pipeline';

export interface ArtistScriptReferenceSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pageId?: string | null;
  pageNumber: number;
  panels: PanelDto[];
  scriptLines: ScriptLineItem[];
  selectedPanelId: string | null;
  selectedPanelNumber: number | null;
  onSelectPanel: (panelId: string | null) => void;
  isLoading?: boolean;
}

interface SceneGroup {
  key: string;
  sceneNumber?: number;
  sceneTitle: string;
  sceneSlugline?: string;
  lines: ScriptLineItem[];
}

export const ArtistScriptReferenceSidebar: React.FC<ArtistScriptReferenceSidebarProps> = ({
  isOpen,
  onToggle,
  pageId,
  pageNumber,
  panels,
  scriptLines,
  selectedPanelId,
  selectedPanelNumber,
  onSelectPanel,
  isLoading = false,
}) => {
  const { t } = useTranslation('artist');
  // Lấy các dòng kịch bản của trang hiện tại (ưu tiên khớp pageId từ BE, lùi về pageNumber; fallback dòng chưa gắn trang)
  const { pageLines, isShowingUnpagedFallback } = useMemo(() => {
    const isOnCurrentPage = (l: ScriptLineItem) =>
      pageId && l.pageId
        ? l.pageId === pageId
        : typeof l.pageNumber === 'number' && l.pageNumber === pageNumber;

    const matched = scriptLines.filter(isOnCurrentPage);
    if (matched.length > 0) {
      return { pageLines: matched, isShowingUnpagedFallback: false };
    }
    return {
      pageLines: scriptLines.filter(
        (l) => !l.pageId && (typeof l.pageNumber !== 'number' || l.pageNumber <= 0),
      ),
      isShowingUnpagedFallback: scriptLines.length > 0,
    };
  }, [scriptLines, pageId, pageNumber]);

  // Gom các dòng theo Scene theo đúng thứ tự xuất hiện (KHÔNG chia box/card cho từng dòng)
  const sceneGroups = useMemo<SceneGroup[]>(() => {
    const groups: SceneGroup[] = [];
    for (const line of pageLines) {
      const key =
        line.sceneId ||
        `${line.sceneNumber || 0}:${line.sceneTitle || ''}:${line.sceneSlugline || ''}`;
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        groups.push({
          key,
          sceneNumber: line.sceneNumber,
          sceneTitle:
            line.sceneTitle ||
            (line.sceneNumber
              ? t('scriptRefSidebar.sceneNumbered', { sceneNumber: line.sceneNumber })
              : t('scriptRefSidebar.sceneFallback')),
          sceneSlugline: line.sceneSlugline,
          lines: [line],
        });
      } else {
        last.lines.push(line);
      }
    }
    return groups;
  }, [pageLines, t]);

  const hasPanelFilter = Boolean(selectedPanelId || selectedPanelNumber);

  const isLineMatchedToSelectedPanel = (line: ScriptLineItem): boolean => {
    if (!hasPanelFilter) return false;
    if (selectedPanelId && line.panelId) {
      return line.panelId === selectedPanelId;
    }
    if (selectedPanelNumber && line.panelNumber) {
      return line.panelNumber === selectedPanelNumber;
    }
    return false;
  };

  if (!isOpen) {
    return (
      <div
        data-testid='artist-script-ref-collapsed'
        className='h-full border-l border-[#D8D2C5] bg-[#FAF8F4] flex flex-col items-center py-3 px-1.5 shrink-0 z-20 select-none'
      >
        <button
          type='button'
          onClick={onToggle}
          data-testid='artist-script-ref-toggle'
          title={t('scriptRefSidebar.openTitle')}
          aria-label={t('scriptRefSidebar.openTitle')}
          className='w-8 h-8 rounded-lg border border-[#D8D2C5] bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs'
        >
          <ChevronLeft className='w-4 h-4' />
        </button>
        <button
          type='button'
          onClick={onToggle}
          className='mt-3 flex flex-col items-center gap-1.5 text-stone-600 hover:text-stone-900 cursor-pointer'
          title={t('scriptRefSidebar.openTitle')}
        >
          <FileText className='w-4 h-4 text-[#EA580C]' />
          <span className='text-[10px] font-mono font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180'>
            {t('scriptRefSidebar.verticalLabel', { pageNumber })}
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      data-testid='artist-script-ref-sidebar'
      aria-label={t('scriptRefSidebar.asideAria')}
      className='w-[300px] sm:w-[320px] h-full border-l border-[#D8D2C5] bg-[#FAF8F4] text-[#1C1917] flex flex-col shrink-0 z-20 select-none'
    >
      {/* Header thu gọn & lọc nhanh theo Khung */}
      <div className='px-3.5 py-2.5 border-b border-[#E5E0D5] bg-[#FCFBF8] flex flex-col gap-2 shrink-0'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-1.5 min-w-0'>
            <FileText className='w-3.5 h-3.5 text-[#EA580C] shrink-0' />
            <span className='text-xs font-bold uppercase tracking-wider text-stone-800 truncate'>
              {t('scriptRefSidebar.headerTitle')}
            </span>
            <span className='text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-200/80 text-stone-700 font-semibold shrink-0'>
              {t('scriptRefSidebar.pageBadge', { pageNumber })}
            </span>
          </div>

          <button
            type='button'
            onClick={onToggle}
            data-testid='artist-script-ref-toggle'
            title={t('scriptRefSidebar.collapseTitle')}
            aria-label={t('scriptRefSidebar.collapseTitle')}
            className='p-1 rounded-md hover:bg-stone-200/70 text-stone-500 hover:text-stone-800 cursor-pointer transition-colors'
          >
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>

        {/* Thanh chọn Khung (Panel) nhanh hoặc trạng thái đang chọn khung trên canvas */}
        {panels.length > 0 && (
          <div className='flex flex-wrap items-center gap-1 pt-0.5'>
            <button
              type='button'
              data-testid='artist-script-ref-filter-all'
              onClick={() => onSelectPanel(null)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                !hasPanelFilter
                  ? 'bg-[#1C1917] text-white'
                  : 'bg-stone-200/70 text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('scriptRefSidebar.allPage')}
            </button>
            {panels.map((pnl, idx) => {
              const pNum = pnl.panelNumber || pnl.readingOrder || idx + 1;
              const isSelected =
                selectedPanelId === pnl.id || (!selectedPanelId && selectedPanelNumber === pNum);
              return (
                <button
                  key={pnl.id}
                  type='button'
                  data-testid={`artist-script-ref-panel-btn-${pNum}`}
                  onClick={() => onSelectPanel(isSelected ? null : pnl.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EA580C] text-white'
                      : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/70'
                  }`}
                >
                  {t('scriptRefSidebar.panelButton', { panelNum: pNum })}
                </button>
              );
            })}
          </div>
        )}

        {hasPanelFilter && panels.length === 0 && (
          <div className='flex items-center justify-between text-[10px] font-mono text-[#C2410C]'>
            <span>
              {t('scriptRefSidebar.filteringPanel', { panelNum: selectedPanelNumber || '?' })}
            </span>
            <button
              type='button'
              onClick={() => onSelectPanel(null)}
              className='inline-flex items-center gap-0.5 underline cursor-pointer'
            >
              <X className='w-3 h-3' /> {t('scriptRefSidebar.showAll')}
            </button>
          </div>
        )}
      </div>

      {/* Nội dung kịch bản dạng dòng (chỉ đọc, không chia card/box cho từng dòng, ngăn cách nhẹ theo Scene) */}
      <div
        data-testid='artist-script-ref-lines'
        className='flex-1 overflow-y-auto px-3.5 py-3 space-y-3 text-left select-text custom-scrollbar'
      >
        {isLoading && pageLines.length === 0 ? (
          <p className='text-xs text-stone-500 italic py-6 text-center'>
            {t('scriptRefSidebar.loading')}
          </p>
        ) : sceneGroups.length === 0 ? (
          <p className='text-xs text-stone-500 italic py-6 text-center'>
            {t('scriptRefSidebar.emptyPage', { pageNumber })}
          </p>
        ) : (
          <>
            {isShowingUnpagedFallback && (
              <p className='text-[10px] font-mono text-stone-500 italic pb-1 border-b border-dashed border-[#DFD9CC]'>
                {t('scriptRefSidebar.unpagedFallback', { pageNumber })}
              </p>
            )}

            {sceneGroups.map((scene, sceneIdx) => (
              <div
                key={scene.key}
                data-testid={`artist-script-ref-scene-${sceneIdx + 1}`}
                className={
                  sceneIdx > 0
                    ? 'pt-2.5 border-t border-dashed border-[#DFD9CC] space-y-1.5'
                    : 'space-y-1.5'
                }
              >
                {/* Tiêu đề Scene ngăn cách nhẹ */}
                <div className='text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold'>
                  {scene.sceneTitle}
                  {scene.sceneSlugline ? ` · ${scene.sceneSlugline}` : ''}
                </div>

                {/* Danh sách dòng kịch bản chảy liên tục theo thứ tự */}
                <div className='space-y-1.5'>
                  {scene.lines.map((line) => {
                    const meta = resolveScriptLineMeta(line);
                    const isHighlighted = isLineMatchedToSelectedPanel(line);
                    const pNum = line.panelNumber;

                    return (
                      <div
                        key={line.id}
                        data-testid={`artist-script-ref-line-${line.id}`}
                        data-line-highlighted={isHighlighted ? 'true' : 'false'}
                        className={`text-xs leading-relaxed transition-colors ${
                          isHighlighted
                            ? 'pl-2 -ml-2 border-l-2 border-[#EA580C] bg-[#FFF7ED] text-stone-950 font-medium'
                            : hasPanelFilter
                              ? 'opacity-45 text-stone-600'
                              : 'text-stone-800'
                        }`}
                      >
                        {/* Dòng mô tả cảnh (nếu có cả stageDirection và dialogueText thì hiện thành 2 dòng chảy liền) */}
                        {line.stageDirection && (
                          <p className='leading-relaxed'>
                            {typeof pNum === 'number' && pNum > 0 && (
                              <span className='font-mono text-[10px] text-stone-400 mr-1'>
                                K{pNum}
                              </span>
                            )}
                            <span className='font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500 mr-1.5'>
                              {t('scriptRefSidebar.sceneDescriptionTag')}
                            </span>
                            <span className='italic text-stone-700'>{line.stageDirection}</span>
                          </p>
                        )}

                        {(line.dialogueText || (line.text && !line.stageDirection)) && (
                          <p className='leading-relaxed'>
                            {!line.stageDirection && typeof pNum === 'number' && pNum > 0 && (
                              <span className='font-mono text-[10px] text-stone-400 mr-1'>
                                K{pNum}
                              </span>
                            )}
                            <span
                              className='font-mono text-[10px] font-bold uppercase tracking-wider mr-1.5'
                              style={{
                                color:
                                  meta.kind === 'sfx'
                                    ? '#D97706'
                                    : meta.kind === 'narration'
                                      ? '#4F46E5'
                                      : line.characterColor || '#EA580C',
                              }}
                            >
                              [{meta.typeLabel}]
                            </span>
                            <span className='font-serif text-stone-900'>
                              &ldquo;{line.dialogueText || line.text}&rdquo;
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
};
