import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  ImageOff,
  Minus,
  Plus,
  Search,
  Volume2,
} from 'lucide-react';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';
import type { BibleEntityItem, ScriptLineItem, SidebarChapterOption } from './ArtistCanvaSidebar';

type ScriptViewMode = 'current-page' | 'all';

export interface ChapterPanelRef {
  id: string;
  pageNumber?: number;
  panelNumber?: number;
  direction?: string | null;
  pageId?: string;
}

export interface ArtistScriptReaderProps {
  scriptLines: ScriptLineItem[];
  chapterPanels?: ChapterPanelRef[];
  activePageNumber: number;
  chapterTitle?: string;
  chapters?: SidebarChapterOption[];
  selectedChapterId?: string | null;
  onSelectChapter?: (chapterId: string) => void;
  isLoading?: boolean;
  bibleEntities: BibleEntityItem[];
  selectedPanelId?: string | null;
  selectedPanelNumber?: number | null;
  artworkPanelKeys: Set<string | number>;
  onSelectPanel?: (pageNumber: number, panelNumber: number) => void;
  width: number;
  onWidthChange: (width: number) => void;
}

interface PanelGroup {
  pageNumber: number;
  panelNumber: number;
  panelId?: string | null;
  direction?: string | null;
  lines: ScriptLineItem[];
}

const FONT_STEPS = [13, 14, 16] as const;
const FONT_STORAGE_KEY = 'pf.artist.scriptReader.fontStep';
const MIN_WIDTH = 320;
const MAX_WIDTH = 560;

function readFontStep(): number {
  try {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);
    if (saved === null) return 1;
    const parsed = Number(saved);
    return Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_STEPS.length ? parsed : 1;
  } catch {
    return 1;
  }
}

function formatNarrationMode(mode?: string, t?: (key: string) => string): string | null {
  if (!mode || mode === 'Present') return null;
  const lower = mode.toLowerCase();
  if (lower.includes('flashback')) return t ? t('scriptReader.narrationFlashback') : 'Hồi tưởng';
  if (lower.includes('inner') || lower.includes('monologue') || lower.includes('thought')) {
    return t ? t('scriptReader.narrationInner') : 'Độc thoại nội tâm';
  }
  if (lower.includes('voice') || lower.includes('narrat')) {
    return t ? t('scriptReader.narrationVoice') : 'Lời dẫn';
  }
  return null;
}

function lineKind(line: ScriptLineItem): 'sfx' | 'caption' | 'dialogue' | 'action' {
  const mode = (line.narrationMode || '').toLowerCase();
  if (mode.includes('sfx') || mode.includes('sound')) return 'sfx';
  if (mode.includes('caption') || mode.includes('narrat') || mode.includes('voice'))
    return 'caption';
  if (line.dialogueText) return 'dialogue';
  return 'action';
}

function matchesSearch(line: ScriptLineItem, query: string): boolean {
  const haystack = [
    line.dialogueText,
    line.stageDirection,
    line.characterName,
    line.sceneTitle,
    line.sceneSlugline,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi');
  return haystack.includes(query.toLocaleLowerCase('vi'));
}

function mentionedEntities(lines: ScriptLineItem[], entities: BibleEntityItem[]) {
  const text = lines
    .flatMap((line) => [line.characterName, line.dialogueText, line.stageDirection])
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi');
  return entities.filter((entity) => text.includes(entity.name.toLocaleLowerCase('vi')));
}

const EntityChip: React.FC<{ entity: BibleEntityItem }> = ({ entity }) => (
  <span className='group/entity relative inline-flex'>
    <span
      tabIndex={0}
      className='rounded-full border border-[var(--sb-border)] bg-[var(--sb-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--sb-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-accent)]'
    >
      {entity.name}
    </span>
    <span className='pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-56 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-popover,var(--sb-bg))] p-2 opacity-0 shadow-xl transition-opacity group-hover/entity:visible group-hover/entity:opacity-100 group-focus-within/entity:visible group-focus-within/entity:opacity-100'>
      {entity.imageUrl && (
        <AuthenticatedImage
          src={entity.imageUrl}
          alt={`Model sheet ${entity.name}`}
          className='mb-2 h-28 w-full rounded-md object-cover'
        />
      )}
      <strong className='block text-xs text-[var(--sb-text)]'>{entity.name}</strong>
      {entity.visualNotes[0] && (
        <span className='mt-1 block text-xs leading-relaxed text-[var(--sb-muted)]'>
          {entity.visualNotes[0]}
        </span>
      )}
    </span>
  </span>
);

const ScriptLine: React.FC<{ line: ScriptLineItem; fontSize: number }> = ({ line, fontSize }) => {
  const { t } = useTranslation('artist');
  const kind = lineKind(line);
  const narrationMode = formatNarrationMode(line.narrationMode, t);
  return (
    <div data-testid={`script-line-${line.id}`} className='space-y-1.5'>
      {line.stageDirection && (
        <p
          className='font-sans font-medium leading-relaxed text-[var(--sb-text)]'
          style={{ fontSize }}
        >
          {line.stageDirection}
        </p>
      )}
      {line.dialogueText && kind === 'sfx' && (
        <div className='flex items-start gap-2 rounded-md border border-[var(--sb-border)] bg-[var(--sb-hover)] px-2.5 py-2 text-[var(--sb-accent)]'>
          <Volume2 className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
          <strong className='uppercase tracking-wider' style={{ fontSize }}>
            {line.dialogueText}
          </strong>
        </div>
      )}
      {line.dialogueText && kind === 'caption' && (
        <div className='border-l-2 border-[var(--sb-accent)] bg-[var(--sb-surface)] px-3 py-2'>
          <span className='mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--sb-muted)]'>
            {narrationMode || t('scriptReader.narrationVoice')}
          </span>
          <p className='font-serif leading-relaxed text-[var(--sb-text)]' style={{ fontSize }}>
            {line.dialogueText}
          </p>
        </div>
      )}
      {line.dialogueText && kind === 'dialogue' && (
        <div>
          <div className='mb-1 flex flex-wrap items-center gap-1.5'>
            {line.characterName && (
              <span
                className='rounded-full border border-[var(--sb-border)] bg-[var(--sb-surface)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1.5'
                style={{ color: line.characterColor || 'var(--sb-accent)' }}
              >
                <span
                  className='w-1.5 h-1.5 rounded-full shrink-0'
                  style={{ backgroundColor: line.characterColor || 'var(--sb-accent)' }}
                  aria-hidden='true'
                />
                <span>{line.characterName}</span>
              </span>
            )}
            {narrationMode && (
              <span className='text-xs text-[var(--sb-muted)]'>({narrationMode})</span>
            )}
          </div>
          <p className='font-serif leading-relaxed text-[var(--sb-text)]' style={{ fontSize }}>
            “{line.dialogueText}”
          </p>
        </div>
      )}
    </div>
  );
};

export const ArtistScriptReader: React.FC<ArtistScriptReaderProps> = ({
  scriptLines,
  chapterPanels,
  activePageNumber,
  chapterTitle,
  chapters,
  selectedChapterId,
  onSelectChapter,
  isLoading = false,
  bibleEntities,
  selectedPanelId = null,
  selectedPanelNumber = null,
  artworkPanelKeys,
  onSelectPanel,
  width,
  onWidthChange,
}) => {
  const { t } = useTranslation('artist');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ScriptViewMode>('current-page');
  const [fontStep, setFontStep] = useState(readFontStep);
  const selectedCardRef = useRef<HTMLElement | null>(null);

  const groups = useMemo(() => {
    const normalizedQuery = query.trim();
    const visibleLines = scriptLines.filter(
      (line) =>
        (!normalizedQuery || matchesSearch(line, normalizedQuery)) &&
        (viewMode === 'all' || line.pageNumber === activePageNumber),
    );
    const panelMap = new Map<string, PanelGroup>();

    // 1. Khởi tạo danh sách Panel từ chapterPanels (Left-join mô hình khung xương từ DB)
    if (chapterPanels && chapterPanels.length > 0) {
      chapterPanels
        .filter(
          (p) =>
            typeof p.pageNumber === 'number' &&
            p.pageNumber > 0 &&
            (viewMode === 'all' || p.pageNumber === activePageNumber),
        )
        .forEach((p) => {
          const pageNumber = p.pageNumber!;
          const panelNumber = p.panelNumber && p.panelNumber > 0 ? p.panelNumber : 0;
          const key = `${pageNumber}:${panelNumber}`;
          panelMap.set(key, {
            pageNumber,
            panelNumber,
            panelId: p.id,
            direction: p.direction ?? null,
            lines: [],
          });
        });
    }

    // 2. Điền scriptLines vào từng panel
    visibleLines
      .filter((line) => typeof line.pageNumber === 'number' && line.pageNumber > 0)
      .forEach((line) => {
        const pageNumber = line.pageNumber!;
        const panelNumber = line.panelNumber && line.panelNumber > 0 ? line.panelNumber : 0;
        const key = `${pageNumber}:${panelNumber}`;
        const group = panelMap.get(key) || {
          pageNumber,
          panelNumber,
          panelId: line.panelId ?? null,
          direction: null,
          lines: [],
        };
        group.lines.push(line);
        if (line.panelId && !group.panelId) group.panelId = line.panelId;
        panelMap.set(key, group);
      });

    // Nếu query tìm kiếm đang có, chỉ giữ các panel có dòng khớp hoặc có direction khớp
    let panelValues = [...panelMap.values()];
    if (normalizedQuery) {
      panelValues = panelValues.filter(
        (g) =>
          g.lines.length > 0 ||
          (g.direction &&
            g.direction.toLocaleLowerCase('vi').includes(normalizedQuery.toLocaleLowerCase('vi'))),
      );
    }

    const panels = panelValues.sort(
      (a, b) =>
        a.pageNumber - b.pageNumber ||
        (a.panelNumber === 0 ? 1 : b.panelNumber === 0 ? -1 : a.panelNumber - b.panelNumber),
    );
    const unpaged = visibleLines.filter(
      (line) => typeof line.pageNumber !== 'number' || line.pageNumber <= 0,
    );
    return { panels, unpaged: viewMode === 'all' ? unpaged : [] };
  }, [activePageNumber, chapterPanels, query, scriptLines, viewMode]);

  const hasSelectedPanel = selectedPanelId !== null || selectedPanelNumber !== null;

  useEffect(() => {
    if (!selectedCardRef.current) return;
    let reduceMotion = false;
    try {
      reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduceMotion = true;
    }
    selectedCardRef.current.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [selectedPanelId, selectedPanelNumber, activePageNumber, viewMode]);

  const changeFontStep = (next: number) => {
    const clamped = Math.max(0, Math.min(FONT_STEPS.length - 1, next));
    setFontStep(clamped);
    try {
      localStorage.setItem(FONT_STORAGE_KEY, String(clamped));
    } catch {
      // Reading preferences remain usable for this session when storage is unavailable.
    }
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (moveEvent: PointerEvent) => {
      onWidthChange(
        Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + startX - moveEvent.clientX)),
      );
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  let previousSceneKey = '';
  return (
    <div
      data-testid='canva-drawer-script'
      className='relative flex h-full flex-col overflow-hidden'
    >
      <div
        role='separator'
        aria-label={t('scriptReader.resizeAriaLabel')}
        aria-orientation='vertical'
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          onWidthChange(
            Math.max(
              MIN_WIDTH,
              Math.min(MAX_WIDTH, width + (event.key === 'ArrowLeft' ? 16 : -16)),
            ),
          );
        }}
        className='absolute inset-y-0 left-0 z-40 w-2 cursor-ew-resize border-l border-transparent hover:border-[var(--sb-accent)] focus-visible:border-[var(--sb-accent)] focus-visible:outline-none'
      />

      <div className='shrink-0 space-y-2 border-b border-[var(--sb-border)] bg-[var(--sb-surface)] p-3 pl-4'>
        <div className='flex items-center justify-between gap-2'>
          <div className='min-w-0'>
            {chapters && chapters.length > 1 && onSelectChapter ? (
              <select
                aria-label={t('scriptReader.selectChapterAriaLabel')}
                value={selectedChapterId || ''}
                onChange={(event) => onSelectChapter(event.target.value)}
                data-testid='canva-script-chapter-select'
                className='max-w-full rounded-md border border-[var(--sb-border)] bg-[var(--sb-bg)] px-2 py-1.5 text-sm font-bold text-[var(--sb-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-accent)]'
              >
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {t('scriptReader.chapterOption', {
                      number: chapter.chapterNumber,
                      title: chapter.title ? `: ${chapter.title}` : '',
                    })}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className='truncate text-sm font-bold text-[var(--sb-text)]'>
                {chapterTitle || t('scriptReader.fallbackTitle')}
              </h2>
            )}
            {isLoading && (
              <span className='text-xs text-[var(--sb-muted)]'>{t('scriptReader.loading')}</span>
            )}
          </div>
          <div className='flex items-center rounded-md border border-[var(--sb-border)] bg-[var(--sb-bg)]'>
            <button
              type='button'
              aria-label={t('scriptReader.decreaseFontAriaLabel')}
              disabled={fontStep === 0}
              onClick={() => changeFontStep(fontStep - 1)}
              className='p-1.5 text-[var(--sb-text)] disabled:opacity-35'
            >
              <Minus className='h-3.5 w-3.5' aria-hidden='true' />
              <span className='sr-only'>A-</span>
            </button>
            <span className='text-xs font-bold text-[var(--sb-muted)]'>A</span>
            <button
              type='button'
              aria-label={t('scriptReader.increaseFontAriaLabel')}
              disabled={fontStep === FONT_STEPS.length - 1}
              onClick={() => changeFontStep(fontStep + 1)}
              className='p-1.5 text-[var(--sb-text)] disabled:opacity-35'
            >
              <Plus className='h-3.5 w-3.5' aria-hidden='true' />
              <span className='sr-only'>A+</span>
            </button>
          </div>
        </div>

        <div className='grid grid-cols-2 rounded-lg bg-[var(--sb-bg)] p-1'>
          <button
            type='button'
            data-testid='canva-script-mode-current-page'
            aria-pressed={viewMode === 'current-page'}
            onClick={() => setViewMode('current-page')}
            className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
              viewMode === 'current-page'
                ? 'bg-[var(--sb-accent)] text-[var(--sb-bg)]'
                : 'text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
            }`}
          >
            {t('scriptReader.currentPage')}
          </button>
          <button
            type='button'
            data-testid='canva-script-mode-all'
            aria-pressed={viewMode === 'all'}
            onClick={() => setViewMode('all')}
            className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
              viewMode === 'all'
                ? 'bg-[var(--sb-accent)] text-[var(--sb-bg)]'
                : 'text-[var(--sb-muted)] hover:text-[var(--sb-text)]'
            }`}
          >
            {t('scriptReader.allChapter')}
          </button>
        </div>

        <label className='relative block'>
          <span className='sr-only'>{t('scriptReader.searchLabel')}</span>
          <Search
            className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sb-muted)]'
            aria-hidden='true'
          />
          <input
            type='search'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('scriptReader.searchPlaceholder')}
            data-testid='canva-input-search-script'
            className='w-full rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg)] py-2 pl-8 pr-3 text-sm text-[var(--sb-text)] outline-none placeholder:text-[var(--sb-muted)] focus-visible:ring-2 focus-visible:ring-[var(--sb-accent)]'
          />
        </label>
      </div>

      <div
        data-testid='canva-script-manuscript-flow'
        className='custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-[var(--sb-bg)] p-3.5 pl-4'
      >
        {groups.panels.length === 0 && groups.unpaged.length === 0 ? (
          <div className='py-10 text-center text-sm text-[var(--sb-muted)]'>
            <FileText className='mx-auto mb-2 h-6 w-6' aria-hidden='true' />
            <p>
              {query
                ? t('scriptReader.noMatch')
                : t('scriptReader.noScriptForPage', { page: activePageNumber })}
            </p>
            {viewMode === 'current-page' && !query && scriptLines.length > 0 && (
              <button
                type='button'
                onClick={() => setViewMode('all')}
                className='mt-3 font-semibold text-[var(--sb-accent)] underline-offset-2 hover:underline'
              >
                {t('scriptReader.viewAllChapter')}
              </button>
            )}
          </div>
        ) : (
          groups.panels.map((group, groupIndex) => {
            const panelId = group.panelId || group.lines.find((line) => line.panelId)?.panelId;
            const isSelected =
              group.pageNumber === activePageNumber &&
              group.panelNumber > 0 &&
              ((selectedPanelId && panelId === selectedPanelId) ||
                (!selectedPanelId && selectedPanelNumber === group.panelNumber));
            const hasArtwork =
              group.pageNumber === activePageNumber &&
              Boolean(
                (panelId && artworkPanelKeys.has(panelId)) ||
                artworkPanelKeys.has(group.panelNumber),
              );
            const sceneKey = `${group.lines[0]?.sceneId || ''}|${group.lines[0]?.sceneTitle || ''}|${group.lines[0]?.sceneSlugline || ''}`;
            const showSceneHeader = Boolean(
              sceneKey.replaceAll('|', '') && sceneKey !== previousSceneKey,
            );
            if (sceneKey.replaceAll('|', '')) previousSceneKey = sceneKey;
            const entities = mentionedEntities(group.lines, bibleEntities);
            return (
              <details
                key={`${group.pageNumber}:${group.panelNumber}`}
                open={isSelected || (!hasSelectedPanel && groupIndex === 0) || undefined}
                className={`group overflow-hidden rounded-lg border bg-[var(--sb-surface)] ${
                  isSelected
                    ? 'border-[var(--sb-accent)] bg-[var(--sb-surface-hover)] ring-1 ring-[var(--sb-accent)]'
                    : 'border-[var(--sb-border)]'
                }`}
              >
                <summary
                  ref={isSelected ? selectedCardRef : undefined}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() =>
                    group.panelNumber > 0 && onSelectPanel?.(group.pageNumber, group.panelNumber)
                  }
                  data-testid={`script-panel-section-${group.pageNumber}-${group.panelNumber}`}
                  className='focus-ring cursor-pointer list-none p-2.5 text-left [&::-webkit-details-marker]:hidden'
                >
                  {showSceneHeader && (
                    <div className='mb-2 flex min-w-0 items-baseline gap-2 border-b border-[var(--sb-border)] pb-2'>
                      <span className='truncate text-xs font-bold uppercase tracking-wide text-[var(--sb-accent)]'>
                        {group.lines[0]?.sceneTitle ||
                          t('scriptReader.sceneFallback', {
                            number: group.lines[0]?.sceneNumber || '',
                          })}
                      </span>
                      {group.lines[0]?.sceneSlugline && (
                        <span className='truncate text-xs font-semibold uppercase tracking-wide text-[var(--sb-muted)]'>
                          {group.lines[0].sceneSlugline}
                        </span>
                      )}
                    </div>
                  )}
                  <div className='flex items-center justify-between gap-2'>
                    <strong className='text-sm text-[var(--sb-text)]'>
                      {group.panelNumber > 0
                        ? t('scriptReader.panelLabel', { number: group.panelNumber })
                        : t('scriptReader.unassignedPanel')}
                    </strong>
                    <span className='flex items-center gap-2'>
                      {group.panelNumber > 0 && group.pageNumber === activePageNumber && (
                        <span className='inline-flex items-center gap-1 text-xs font-semibold text-[var(--sb-muted)]'>
                          {hasArtwork ? (
                            <CheckCircle2
                              className='h-3.5 w-3.5 text-[var(--sb-accent)]'
                              aria-hidden='true'
                            />
                          ) : (
                            <ImageOff className='h-3.5 w-3.5' aria-hidden='true' />
                          )}
                          {hasArtwork ? t('scriptReader.hasArtwork') : t('scriptReader.notDrawn')}
                        </span>
                      )}
                      <ChevronRight
                        className='h-4 w-4 text-[var(--sb-muted)] transition-transform group-open:rotate-90'
                        aria-hidden='true'
                      />
                    </span>
                  </div>
                </summary>
                <div className='space-y-3 border-t border-[var(--sb-border)] px-3 py-3'>
                  {group.direction && (
                    <div className='rounded bg-[var(--sb-bg)] p-2 text-xs italic text-[var(--sb-muted)] border border-[var(--sb-border)]'>
                      <span className='font-semibold not-italic text-[var(--sb-text)] mr-1'>
                        {t('scriptReader.directionLabel', 'Chỉ dẫn')}:
                      </span>
                      {group.direction}
                    </div>
                  )}
                  {group.lines.length > 0 ? (
                    <div className='space-y-3'>
                      {group.lines.map((line) => (
                        <ScriptLine key={line.id} line={line} fontSize={FONT_STEPS[fontStep]} />
                      ))}
                    </div>
                  ) : (
                    <div className='py-2 text-center text-xs italic text-[var(--sb-muted)]'>
                      {t('scriptReader.emptyPanelNotice', 'Khung trống — chưa có mô tả/thoại')}
                    </div>
                  )}
                  {entities.length > 0 && (
                    <div className='flex flex-wrap gap-1.5 border-t border-[var(--sb-border)] pt-2.5'>
                      {entities.map((entity) => (
                        <EntityChip key={entity.id} entity={entity} />
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })
        )}

        {groups.unpaged.length > 0 && (
          <section
            data-testid='script-unpaged-scenes'
            className='rounded-xl border border-dashed border-[var(--sb-border)] bg-[var(--sb-surface)] p-3'
          >
            <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-[var(--sb-muted)]'>
              {t('scriptReader.unpagedScenes')}
            </h3>
            <div className='space-y-3'>
              {groups.unpaged.map((line) => (
                <React.Fragment key={line.id}>
                  {line.sceneTitle && (
                    <div className='text-xs font-bold text-[var(--sb-accent)]'>
                      {line.sceneTitle}
                    </div>
                  )}
                  <ScriptLine line={line} fontSize={FONT_STEPS[fontStep]} />
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
