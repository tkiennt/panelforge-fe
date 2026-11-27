import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
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

interface PanelGroup {
  key: string;
  panelId: string | null;
  panelNumber: number | null;
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
  const [scope, setScope] = useState<'page' | 'all'>('page');

  // Lấy các dòng kịch bản của trang hiện tại (hoặc toàn chương khi chọn "Tất cả")
  const { visibleLines, isShowingUnpagedFallback } = useMemo(() => {
    if (scope === 'all') {
      return { visibleLines: scriptLines, isShowingUnpagedFallback: false };
    }
    const isOnCurrentPage = (l: ScriptLineItem) =>
      pageId && l.pageId
        ? l.pageId === pageId
        : typeof l.pageNumber === 'number' && l.pageNumber === pageNumber;

    const matched = scriptLines.filter(isOnCurrentPage);
    if (matched.length > 0) {
      return { visibleLines: matched, isShowingUnpagedFallback: false };
    }
    return {
      visibleLines: scriptLines.filter(
        (l) => !l.pageId && (typeof l.pageNumber !== 'number' || l.pageNumber <= 0),
      ),
      isShowingUnpagedFallback: scriptLines.length > 0,
    };
  }, [scriptLines, pageId, pageNumber, scope]);

  // Gom dòng kịch bản thành các card "Khung N" theo chuẩn Stitch
  const panelGroups = useMemo<PanelGroup[]>(() => {
    const panelById = new Map<string, PanelDto>();
    const panelByNum = new Map<number, PanelDto>();
    panels.forEach((p, idx) => {
      panelById.set(p.id, p);
      panelByNum.set(p.panelNumber || p.readingOrder || idx + 1, p);
    });

    const groups: PanelGroup[] = [];
    const groupByKey = new Map<string, PanelGroup>();

    for (const line of visibleLines) {
      const matchedPanel =
        (line.panelId ? panelById.get(line.panelId) : undefined) ||
        (typeof line.panelNumber === 'number' ? panelByNum.get(line.panelNumber) : undefined);
      const pNum =
        matchedPanel?.panelNumber ||
        matchedPanel?.readingOrder ||
        (typeof line.panelNumber === 'number' && line.panelNumber > 0 ? line.panelNumber : null);
      const pId = matchedPanel?.id || line.panelId || null;
      const key = pId ? `id:${pId}` : pNum ? `num:${pNum}` : 'unassigned';

      let grp = groupByKey.get(key);
      if (!grp) {
        grp = { key, panelId: pId, panelNumber: pNum, lines: [] };
        groupByKey.set(key, grp);
        groups.push(grp);
      }
      grp.lines.push(line);
    }

    return groups;
  }, [visibleLines, panels]);

  const isGroupSelected = (grp: PanelGroup): boolean => {
    if (selectedPanelId && grp.panelId) {
      return grp.panelId === selectedPanelId;
    }
    if (selectedPanelNumber && grp.panelNumber) {
      return grp.panelNumber === selectedPanelNumber;
    }
    return false;
  };

  if (!isOpen) {
    return (
      <div
        data-testid='artist-script-ref-collapsed'
        className='h-full border-l border-[#E7E5E4] bg-white flex flex-col items-center py-3 px-1.5 shrink-0 z-10 select-none'
      >
        <button
          type='button'
          onClick={onToggle}
          data-testid='artist-script-ref-toggle'
          title={t('scriptRefSidebar.openTitle')}
          aria-label={t('scriptRefSidebar.openTitle')}
          className='w-8 h-8 rounded-lg border border-[#E7E5E4] bg-[#FAF9F5] hover:bg-stone-100 text-stone-700 flex items-center justify-center cursor-pointer transition-colors'
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
          <span className='text-xs font-mono font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180'>
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
      className='w-72 h-full border-l border-[#E7E5E4] bg-white text-stone-900 flex flex-col shrink-0 z-10 select-none'
    >
      {/* Header chuẩn Stitch: Icon + Kịch bản tham chiếu | Toggle Cả trang / Tất cả */}
      <div className='px-2 py-2.5 border-b border-[#E7E5E4] flex items-center justify-between gap-1 shrink-0'>
        <div className='flex items-center gap-1 text-stone-900 font-semibold text-xs whitespace-nowrap shrink-0'>
          <FileText className='w-3.5 h-3.5 text-[#EA580C] shrink-0' />
          <span>{t('scriptRefSidebar.headerTitle')}</span>
        </div>

        <div className='flex items-center gap-0.5 shrink-0'>
          <div className='flex items-center bg-[#FAF9F5] border border-[#E7E5E4] p-0.5 rounded text-[10.5px]'>
            <button
              type='button'
              data-testid='artist-script-ref-filter-all'
              onClick={() => {
                setScope('page');
                onSelectPanel(null);
              }}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                scope === 'page'
                  ? 'bg-white text-[#EA580C] font-semibold shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              {t('scriptRefSidebar.allPage')}
            </button>
            <button
              type='button'
              data-testid='artist-script-ref-filter-chapter'
              onClick={() => setScope('all')}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                scope === 'all'
                  ? 'bg-white text-[#EA580C] font-semibold shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              {t('scriptRefSidebar.allChapter')}
            </button>
          </div>

          <button
            type='button'
            onClick={onToggle}
            data-testid='artist-script-ref-toggle'
            title={t('scriptRefSidebar.collapseTitle')}
            aria-label={t('scriptRefSidebar.collapseTitle')}
            className='p-0.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer transition-colors shrink-0'
          >
            <ChevronRight className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>

      {/* Nội dung kịch bản theo từng card Khung N */}
      <div
        data-testid='artist-script-ref-lines'
        className='flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 text-left select-text custom-scrollbar text-xs'
      >
        {isLoading && visibleLines.length === 0 ? (
          <p className='text-xs text-stone-500 italic py-6 text-center'>
            {t('scriptRefSidebar.loading')}
          </p>
        ) : panelGroups.length === 0 ? (
          <p className='text-xs text-stone-500 italic py-6 text-center'>
            {t('scriptRefSidebar.emptyPage', { pageNumber })}
          </p>
        ) : (
          <>
            {isShowingUnpagedFallback && (
              <p className='text-xs text-stone-500 italic pb-1 border-b border-dashed border-[#E7E5E4]'>
                {t('scriptRefSidebar.unpagedFallback', { pageNumber })}
              </p>
            )}

            {panelGroups.map((group) => {
              const isSelected = isGroupSelected(group);
              const heading = group.panelNumber
                ? t('scriptRefSidebar.panelCardTitle', { panelNum: group.panelNumber })
                : t('scriptRefSidebar.sceneFallback');

              return (
                <div
                  key={group.key}
                  data-testid={
                    group.panelNumber
                      ? `artist-script-ref-panel-btn-${group.panelNumber}`
                      : undefined
                  }
                  onClick={() => {
                    if (group.panelId) {
                      onSelectPanel(isSelected ? null : group.panelId);
                    }
                  }}
                  className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-colors ${
                    group.panelId ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-orange-50/50 border-[#EA580C] shadow-2xs'
                      : 'bg-white border-[#E7E5E4] hover:border-stone-300'
                  }`}
                >
                  <div
                    className={`text-xs ${
                      isSelected ? 'font-bold text-[#EA580C]' : 'font-semibold text-stone-800'
                    }`}
                  >
                    {heading}
                    {isSelected ? ` · ${t('scriptRefSidebar.selectedSuffix')}` : ''}
                  </div>

                  {group.lines.map((line) => {
                    const meta = resolveScriptLineMeta(line);
                    const speakerLabel = (
                      line.characterName ||
                      line.speakerLabel ||
                      meta.speaker ||
                      ''
                    ).toUpperCase();
                    // SFX/thoại/dẫn chuyện có thể lưu chữ trong stageDirection: hiển thị theo loại dòng,
                    // chỉ gắn nhãn "Mô tả cảnh" cho dòng hành động hoặc chỉ dẫn phụ đi kèm thoại.
                    const stageText = meta.kind === 'action' ? meta.text : meta.secondaryAction;
                    const typedText = meta.kind !== 'action' ? meta.text : '';

                    return (
                      <div
                        key={line.id}
                        data-testid={`artist-script-ref-line-${line.id}`}
                        data-line-highlighted={isSelected ? 'true' : 'false'}
                        className='flex flex-col gap-1'
                      >
                        {stageText && (
                          <p
                            className={`italic text-xs leading-relaxed ${
                              isSelected ? 'text-stone-700' : 'text-stone-600'
                            }`}
                          >
                            {t('scriptRefSidebar.shortDescriptionTag')} {stageText}
                          </p>
                        )}

                        {meta.kind === 'sfx' && typedText ? (
                          <div className='font-mono font-bold text-[#EA580C] text-xs mt-0.5'>
                            SFX: {typedText}
                          </div>
                        ) : typedText ? (
                          <div
                            className={`text-xs leading-relaxed mt-0.5 ${
                              isSelected ? 'text-stone-900' : 'text-stone-800'
                            }`}
                          >
                            {speakerLabel && (
                              <span className='font-bold uppercase text-[#EA580C] mr-1'>
                                {speakerLabel}:
                              </span>
                            )}
                            <span>&ldquo;{typedText}&rdquo;</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
};
