import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Flag,
  Loader2,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
  MessageSquare,
  AlertTriangle,
  History,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ChapterReadingMode } from './ChapterReadingMode';
import { Badge, Button, EmptyState, PageHeader } from '@/shared/ui';
import {
  buildChapterManagementUrl,
  buildEditorDeskUrl,
  buildRoleChapterReaderUrl,
  buildSeriesPath,
  type StudioReaderRole,
} from '@/app/routePaths';
import { chapterService, ChapterDto, ScriptVersionRow } from '@/services/chapter.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { pageService, PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { assignmentService } from '@/services/assignment.service';
import { formatDateTime } from '@/lib/format';
import { useChapterPagesLoader } from '@/shared/features/series-reader/useChapterPagesLoader';
import type { ChangeRequestDto, PanelDto, TaskGridDto } from '@/types';

export interface ChapterReaderViewProps {
  currentUserId?: string;
  readerRole: StudioReaderRole;
  onShowToast: (title: string, desc: string) => void;
}

export const ChapterReaderView: React.FC<ChapterReaderViewProps> = ({
  currentUserId,
  readerRole,
  onShowToast,
}) => {
  const {
    workspaceId,
    seriesId,
    chapterId = '',
  } = useParams<{
    workspaceId: string;
    seriesId: string;
    chapterId: string;
  }>();
  const navigate = useNavigate();
  const { t } = useTranslation('review');
  const { chapterDataMap, loadChapter } = useChapterPagesLoader();
  const canReview = readerRole === 'editor' || readerRole === 'producer';
  const roleTone = readerRole === 'writer' ? 'info' : readerRole === 'editor' ? 'warning' : 'brand';

  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('');
  const [panelsByPage, setPanelsByPage] = useState<Record<string, PanelDto[]>>({});
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [taskGrid, setTaskGrid] = useState<TaskGridDto | null>(null);
  const [scriptRows, setScriptRows] = useState<ScriptVersionRow[]>([]);

  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [readingMode, setReadingMode] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [activeTool, setActiveTool] = useState<'pan' | 'crop'>('crop');

  // Load all initial chapter metadata and assets
  const loadChapterData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    try {
      const [chapterData, seriesData, allChapters, pagesData, crData, gridData, scriptCopy] =
        await Promise.all([
          chapterService.getChapterById(chapterId).catch(() => null),
          seriesId
            ? seriesService.getSeriesById(seriesId).catch(() => null)
            : Promise.resolve(null),
          seriesId
            ? chapterService
                .getChaptersBySeries(seriesId, 1, 100)
                .catch(() => ({ items: [] as ChapterDto[] }))
            : Promise.resolve({ items: [] as ChapterDto[] }),
          pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
          assignmentService.getChangeRequests(chapterId).catch(() => [] as ChangeRequestDto[]),
          assignmentService.getTaskGrid(chapterId).catch(() => null),
          chapterService.getScriptWorkingCopy(chapterId).catch(() => null),
        ]);

      if (chapterData) setChapter(chapterData);
      if (seriesData) setSeries(seriesData);
      if (allChapters?.items) setChapters(allChapters.items);
      if (crData) setChangeRequests(crData);
      if (gridData) setTaskGrid(gridData);
      if (scriptCopy?.rows) setScriptRows(scriptCopy.rows);

      const sortedPages = [...pagesData].sort((a, b) => a.pageNumber - b.pageNumber);
      setPages(sortedPages);

      if (sortedPages.length > 0) {
        setCurrentPageId(sortedPages[0].id);

        // Fetch panels for each page
        const panelsEntries = await Promise.all(
          sortedPages.map(async (pg) => {
            const pList = await panelService.getPanelsByPage(pg.id).catch(() => [] as PanelDto[]);
            return [pg.id, pList.sort((a, b) => a.panelNumber - b.panelNumber)] as const;
          }),
        );
        const panelsMap = Object.fromEntries(panelsEntries);
        setPanelsByPage(panelsMap);

        if (panelsEntries[0]?.[1]?.[0]) {
          setSelectedPanelId(panelsEntries[0][1][0].id);
        }
      }
    } catch (err: any) {
      onShowToast(t('readerView.loadErrorTitle'), err.message || t('readerView.loadErrorDesc'));
    } finally {
      setLoading(false);
    }
  }, [chapterId, seriesId, onShowToast, t]);

  useEffect(() => {
    loadChapterData();
  }, [loadChapterData]);

  useEffect(() => {
    if (chapterId) void loadChapter(chapterId);
  }, [chapterId, loadChapter]);

  const loadedPageImages = chapterDataMap[chapterId]?.pages ?? [];

  // Current page object and its panels
  const currentPage = useMemo(
    () => pages.find((p) => p.id === currentPageId) || pages[0] || null,
    [pages, currentPageId],
  );

  const currentPagePanels = useMemo(
    () => (currentPage ? panelsByPage[currentPage.id] || [] : []),
    [currentPage, panelsByPage],
  );

  const selectedPanel = useMemo(
    () => currentPagePanels.find((p) => p.id === selectedPanelId) || currentPagePanels[0] || null,
    [currentPagePanels, selectedPanelId],
  );

  // Script lines matching the current page
  const currentPageScriptBlocks = useMemo(() => {
    if (!currentPage) return [];
    const pNum = currentPage.pageNumber;
    return currentPagePanels.map((p) => {
      const lines = scriptRows.filter(
        (r) => Number(r.page) === pNum && Number(r.panel) === p.panelNumber,
      );
      return {
        panel: p,
        lines,
      };
    });
  }, [currentPage, currentPagePanels, scriptRows]);

  // Filter change requests for current page/panel
  const openChangeRequests = useMemo(
    () => changeRequests.filter((c) => String(c.status) === 'Open'),
    [changeRequests],
  );

  const currentPanelChangeRequests = useMemo(() => {
    if (!selectedPanel) return [];
    return changeRequests.filter(
      (c) => c.panelId === selectedPanel.id || (c.pageId && c.pageId === currentPage?.id),
    );
  }, [changeRequests, selectedPanel, currentPage]);

  // Find assignee artist for selected panel/page
  const currentTask = useMemo(() => {
    if (!taskGrid || !currentPage) return null;
    return taskGrid.tasks.find((t) => t.pageId === currentPage.id && t.status !== 'Cancelled');
  }, [taskGrid, currentPage]);

  const assignedArtistName = useMemo(() => {
    return currentTask?.assigneeUserId || null;
  }, [currentTask]);

  // Actions
  const handleSelectPanel = (panelId: string) => {
    setSelectedPanelId(panelId);
  };

  const handleSelectPage = (pageId: string) => {
    setCurrentPageId(pageId);
    const nextPanels = panelsByPage[pageId] || [];
    if (nextPanels.length > 0) {
      setSelectedPanelId(nextPanels[0].id);
    } else {
      setSelectedPanelId(null);
    }
  };

  const handleAddComment = async (type: 'comment' | 'rework') => {
    if (!canReview || !commentText.trim() || !chapterId) return;
    setSubmittingComment(true);
    try {
      if (currentTask) {
        await assignmentService.requestChanges(chapterId, currentTask.id, {
          comment: commentText.trim(),
          changes: [
            {
              panelId: selectedPanel?.id,
              description: commentText.trim(),
              layer: 'Artwork',
            },
          ],
        });
        const updated = await assignmentService.getChangeRequests(chapterId);
        setChangeRequests(updated);
      } else {
        const fallbackCr = {
          id: `cr-${Date.now()}`,
          assignmentId: '',
          chapterId,
          panelId: selectedPanel?.id,
          pageId: currentPage?.id,
          description: commentText.trim(),
          status: 'Open' as const,
          responsibleUserId: '',
          createdByUserId: currentUserId || 'Editor',
          createdAt: new Date().toISOString(),
        } as unknown as ChangeRequestDto;
        setChangeRequests((prev) => [fallbackCr, ...prev]);
      }
      setCommentText('');
      onShowToast(
        type === 'rework' ? t('readerView.reworkRequestedTitle') : t('readerView.commentSentTitle'),
        t('readerView.commentForPanelDesc', { number: selectedPanel?.panelNumber ?? 1 }),
      );
    } catch (err: any) {
      onShowToast(
        t('readerView.commentErrorTitle'),
        err.message || t('readerView.commentErrorDesc'),
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleApprovePage = async () => {
    if (!canReview || !currentPage || !chapterId) return;
    try {
      // Approve grid tasks corresponding to this page
      const pageTasks =
        taskGrid?.tasks.filter((t) => t.pageId === currentPage.id && t.status === 'Submitted') ||
        [];
      await Promise.all(
        pageTasks.map((t) => assignmentService.approveStageTask(chapterId, t.id).catch(() => null)),
      );
      onShowToast(
        t('readerView.approvePageSuccessTitle'),
        t('readerView.approvePageSuccessDesc', { page: currentPage.pageNumber }),
      );
      loadChapterData();
    } catch (err: any) {
      onShowToast(t('readerView.approvePageErrorTitle'), err.message);
    }
  };

  return (
    <div className='flex min-h-screen w-full flex-col bg-[#FAF9F5] font-sans text-stone-900'>
      <PageHeader
        variant='toolbar'
        icon={<BookOpen aria-hidden='true' />}
        eyebrow={t(`readerView.roles.${readerRole}.eyebrow`)}
        title={
          series?.title
            ? `${series.title} · ${t('readerView.chapterLabel', { number: chapter?.chapterNumber || 1 })}`
            : t('readerView.chapterLabel', { number: chapter?.chapterNumber || 1 })
        }
        description={t(`readerView.roles.${readerRole}.description`)}
        className='sticky top-0 z-[var(--studio-z-sticky)]'
        actions={
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Badge tone={roleTone}>{t(`readerView.roles.${readerRole}.badge`)}</Badge>
            <label htmlFor='chapter-reader-select' className='sr-only'>
              {t('readerView.chapterSelectLabel')}
            </label>
            <select
              id='chapter-reader-select'
              value={chapterId}
              onChange={(event) =>
                navigate(
                  buildRoleChapterReaderUrl(
                    readerRole,
                    workspaceId || '',
                    seriesId || '',
                    event.target.value,
                  ),
                )
              }
              className='min-h-8 max-w-[220px] rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-800 focus:border-orange-500 focus:outline-none'
            >
              {chapters.map((item) => (
                <option key={item.id} value={item.id}>
                  {t('readerView.chapterOption', {
                    number: item.chapterNumber,
                    title: item.title || t('readerView.draftFallback'),
                  })}
                </option>
              ))}
            </select>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                if (!workspaceId || !seriesId) return;
                const backUrl =
                  readerRole === 'writer'
                    ? buildSeriesPath(workspaceId, seriesId, 'script')
                    : readerRole === 'editor'
                      ? buildEditorDeskUrl(workspaceId, seriesId, { chapterId })
                      : buildChapterManagementUrl(workspaceId, seriesId, chapterId);
                navigate(backUrl);
              }}
            >
              {t(`readerView.roles.${readerRole}.back`)}
            </Button>
          </div>
        }
      />

      {!loading && pages.length > 0 && (
        <div className='flex justify-end px-4 sm:px-6 pt-3 max-w-[1720px] mx-auto w-full'>
          <button
            type='button'
            onClick={() => setReadingMode(true)}
            data-testid='open-reading-mode'
            className='inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:border-orange-300 hover:bg-orange-50 cursor-pointer'
          >
            <BookOpen className='h-4 w-4 text-orange-600' aria-hidden='true' />
            {t('readerView.readingModeBtn')}
          </button>
        </div>
      )}

      {readingMode && chapterId && seriesId && (
        <ChapterReadingMode
          chapterId={chapterId}
          seriesId={seriesId}
          readingDirection={series?.readingDirection}
          pages={pages}
          initialPageId={currentPageId}
          onClose={() => setReadingMode(false)}
          onReviewPage={(pageId) => {
            setCurrentPageId(pageId);
            setReadingMode(false);
          }}
        />
      )}

      {loading && (
        <div className='flex flex-1 items-center justify-center py-24 text-stone-500'>
          <Loader2 className='w-6 h-6 animate-spin' />
        </div>
      )}

      {/* Proper Empty State when chapter has no pages / submissions (NEVER an error) */}
      {!loading && pages.length === 0 && (
        <div className='flex flex-1 items-center justify-center p-8'>
          <EmptyState
            icon={<BookOpen aria-hidden='true' />}
            title={t('readerView.emptyDraftTitle')}
            description={t('readerView.emptyDraftDesc')}
            className='max-w-md'
          />
        </div>
      )}

      {/* Main View-Reader Content */}
      {!loading && pages.length > 0 && currentPage && (
        <div className='p-4 sm:p-6 max-w-[1720px] mx-auto w-full space-y-3' id='view-reader'>
          {/* Top Review Bar */}
          <div className='h-14 px-5 bg-white border border-stone-200 rounded-xl shadow-xs flex items-center justify-between gap-4 flex-wrap'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-1.5'>
                <BookOpen className='w-4 h-4 text-orange-600' />
                <h2 className='text-xs font-bold text-stone-900 whitespace-nowrap'>
                  {t(`readerView.roles.${readerRole}.title`, {
                    number: chapter?.chapterNumber || 1,
                    title: chapter?.title || t('readerView.draftFallback'),
                  })}
                </h2>
              </div>
              <span className='text-stone-300'>|</span>
              <div className='flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 text-xs font-semibold'>
                <span>
                  {t('readerView.pageIndicator', {
                    current: String(currentPage.pageNumber).padStart(2, '0'),
                    total: String(pages.length).padStart(2, '0'),
                  })}
                </span>
              </div>
            </div>

            {canReview && <div className='flex items-center gap-2'>
              <button
                type='button'
                id='btn-rework-count'
                className='px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
              >
                <Flag className='w-3.5 h-3.5 text-rose-600' />
                <span>{t('readerView.reworkCount', { count: openChangeRequests.length })}</span>
              </button>
              <button
                type='button'
                onClick={handleApprovePage}
                className='px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs'
              >
                <CheckCircle2 className='w-3.5 h-3.5' />
                <span>{t('readerView.approvePage', 'Duyệt đạt trang này')}</span>
              </button>
            </div>}
          </div>

          {/* 3-Column Reader Canvas Layout */}
          <div className='min-h-[760px] flex overflow-hidden border border-stone-200 rounded-2xl bg-white shadow-xs'>
            {/* Column 1: Left (w-80): Kịch bản đối chiếu */}
            <div className='w-80 shrink-0 bg-[#FAF9F5] border-r border-stone-200 flex flex-col justify-between overflow-y-auto'>
              <div className='p-3.5 space-y-3'>
                <div className='pb-2 border-b border-stone-200'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5'>
                      <History className='w-3.5 h-3.5 text-orange-600' />
                      <span>{t('readerView.scriptRefTitle', 'Kịch bản đối chiếu')}</span>
                    </span>
                    <span className='text-xs font-mono px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded font-semibold'>
                      {t('readerView.pageShort', {
                        page: String(currentPage.pageNumber).padStart(2, '0'),
                      })}
                    </span>
                  </div>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    {t(
                      'readerView.scriptRefSubtitle',
                      'Đồng bộ trực tiếp theo khung tranh đang soi',
                    )}
                  </p>
                </div>

                <div className='space-y-2'>
                  {currentPageScriptBlocks.length === 0 ? (
                    <div className='p-4 text-center text-xs text-stone-400'>
                      {t('readerView.noMatchingScript')}
                    </div>
                  ) : (
                    currentPageScriptBlocks.map(({ panel, lines }, idx) => {
                      const isSelected = selectedPanel?.id === panel.id;
                      const hasOpenCr = changeRequests.some(
                        (c) => c.panelId === panel.id && String(c.status) === 'Open',
                      );

                      return (
                        <div
                          key={panel.id}
                          id={`script-card-${idx + 1}`}
                          onClick={() => handleSelectPanel(panel.id)}
                          className={`p-2.5 rounded-xl cursor-pointer shadow-2xs transition-all space-y-1.5 ${
                            isSelected
                              ? 'bg-orange-50/70 border-2 border-orange-500'
                              : 'bg-white border border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <span className='text-xs font-bold text-stone-900'>
                              {t('readerView.panelCode', {
                                page: currentPage.pageNumber,
                                panel: panel.panelNumber,
                              })}
                            </span>
                            {hasOpenCr ? (
                              <span className='px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold'>
                                {t('readerView.hasReworkFlag')}
                              </span>
                            ) : (
                              <span className='px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold'>
                                {t('readerView.matchedBadge')}
                              </span>
                            )}
                          </div>

                          {lines.length > 0 ? (
                            lines.map((line, lIdx) => (
                              <div key={line.key || lIdx} className='text-xs'>
                                {line.type === 'Dialogue' ? (
                                  <div className='bg-stone-50 p-1.5 rounded border border-stone-100 text-stone-800'>
                                    {line.label && (
                                      <span className='font-bold text-stone-900 mr-1'>
                                        @{line.label}:
                                      </span>
                                    )}
                                    <span>"{line.text}"</span>
                                  </div>
                                ) : line.type === 'Sfx' ? (
                                  <div className='font-mono text-orange-700 font-bold text-xs'>
                                    SFX: {line.text}
                                  </div>
                                ) : (
                                  <p className='text-stone-600 italic leading-relaxed text-xs'>
                                    {line.text}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className='text-stone-400 italic text-xs'>
                              {t('readerView.actionPanelNoDialogue')}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Center (flex-1 bg-stone-900): Toolbar, Page Canvas, Bottom Switcher */}
            <div className='flex-1 bg-stone-900 flex flex-col items-center justify-between p-3 relative overflow-hidden'>
              {/* Floating Toolbar */}
              <div className='bg-stone-800/90 backdrop-blur-xs text-white px-4 py-1.5 rounded-full text-xs flex items-center gap-3 z-10 shadow-lg border border-stone-700 select-none'>
                <button
                  type='button'
                  onClick={() => setActiveTool('pan')}
                  className={`flex items-center gap-1 transition-colors text-xs cursor-pointer ${
                    activeTool === 'pan'
                      ? 'text-orange-400 font-bold'
                      : 'hover:text-orange-400 text-stone-300'
                  }`}
                >
                  <Move className='w-3.5 h-3.5' />
                  <span>{t('readerView.toolPan', 'Di chuyển')}</span>
                </button>
                <span className='text-stone-600'>|</span>
                <button
                  type='button'
                  onClick={() => setActiveTool('crop')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    activeTool === 'crop'
                      ? 'bg-orange-600 text-white font-semibold shadow-xs'
                      : 'hover:text-white text-stone-300'
                  }`}
                >
                  <Crop className='w-3.5 h-3.5' />
                  <span>{t('readerView.toolCrop', 'Soi & Ghim Panel')}</span>
                </button>
                <span className='text-stone-600'>|</span>
                <div className='flex items-center gap-1 text-xs text-stone-300'>
                  <button
                    type='button'
                    onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                    className='hover:text-white px-1 font-mono font-bold cursor-pointer'
                  >
                    -
                  </button>
                  <span className='font-mono font-semibold text-white'>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type='button'
                    onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.25))}
                    className='hover:text-white px-1 font-mono font-bold cursor-pointer'
                  >
                    +
                  </button>
                </div>
                <span className='text-stone-600'>|</span>
                <span className='text-xs font-mono text-emerald-400 bg-stone-900/60 px-2 py-0.5 rounded border border-emerald-500/30'>
                  {t('readerView.manuscriptSize')}
                </span>
              </div>

              {/* Page Paper Container */}
              <div className='flex-1 flex items-center justify-center w-full py-4 overflow-auto'>
                <div
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                  className='bg-white rounded shadow-2xl relative w-[460px] min-h-[580px] p-4 flex flex-col gap-2.5 overflow-hidden select-none border-4 border-stone-300 transition-transform'
                >
                  {currentPagePanels.length === 0 ? (
                    <div className='flex-1 flex items-center justify-center text-xs text-stone-400 italic'>
                      {t('readerView.noPanelsInPage')}
                    </div>
                  ) : (
                    currentPagePanels.map((panel, idx) => {
                      const isSelected = selectedPanel?.id === panel.id;
                      const hasOpenCr = changeRequests.some(
                        (c) => c.panelId === panel.id && String(c.status) === 'Open',
                      );
                      const artworkSrc =
                        loadedPageImages.find((entry) => entry.page.id === currentPage.id)?.imageUrl ??
                        null;

                      return (
                        <div
                          key={panel.id}
                          id={`panel-frame-${idx + 1}`}
                          onClick={() => handleSelectPanel(panel.id)}
                          className={`min-h-[140px] flex-1 w-full rounded border-2 cursor-pointer relative overflow-hidden transition-all ${
                            hasOpenCr
                              ? 'border-rose-500 ring-rose-400/40 bg-rose-50/10'
                              : isSelected
                                ? 'border-orange-500 ring-2 ring-orange-400 bg-stone-50'
                                : 'border-stone-200 hover:border-stone-400 bg-stone-50'
                          }`}
                        >
                          {artworkSrc ? (
                            <img
                              src={artworkSrc}
                              alt={t('readerView.panelAlt', { number: idx + 1 })}
                              width={currentPage.widthPx || 1200}
                              height={currentPage.heightPx || 1800}
                              loading={idx === 0 ? 'eager' : 'lazy'}
                              fetchPriority={idx === 0 ? 'high' : 'auto'}
                              className='w-full h-full object-cover object-center block'
                            />
                          ) : (
                            <div className='w-full h-full flex flex-col items-center justify-center p-4 text-stone-400 text-xs gap-1'>
                              <BookOpen className='w-5 h-5 opacity-40' />
                              <span>
                                {t('readerView.panelHash', { number: panel.panelNumber })}
                              </span>
                            </div>
                          )}

                          {/* Status pill on panel frame */}
                          <div className='absolute top-1.5 left-1.5 text-xs font-mono px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 bg-stone-900/80 text-white'>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                hasOpenCr
                                  ? 'bg-rose-500'
                                  : isSelected
                                    ? 'bg-orange-400'
                                    : 'bg-emerald-400'
                              }`}
                            />
                            <span>
                              {t('readerView.panelHash', { number: panel.panelNumber })} ·{' '}
                              {hasOpenCr
                                ? t('readerView.statusNeedsRework')
                                : t('readerView.statusApproved')}
                            </span>
                          </div>

                          {/* Pin overlay if rework requested */}
                          {hasOpenCr && (
                            <div className='absolute top-7 right-3 px-2 py-1 border border-dashed border-rose-600 bg-rose-500/20 rounded pointer-events-none flex items-center gap-1'>
                              <span className='bg-rose-600 text-white font-mono text-xs font-bold px-1 rounded'>
                                {t('readerView.needsReworkPin')}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Page Navigation Switcher */}
              <div className='w-full h-12 bg-stone-950 border-t border-stone-800 px-4 flex items-center justify-center gap-2 select-none overflow-x-auto'>
                {pages.map((p) => {
                  const isCurrent = p.id === currentPage.id;
                  const pageHasRework = changeRequests.some(
                    (c) => c.pageId === p.id && String(c.status) === 'Open',
                  );

                  return (
                    <button
                      key={p.id}
                      type='button'
                      onClick={() => handleSelectPage(p.id)}
                      className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                        isCurrent
                          ? 'bg-orange-600 text-white font-bold shadow-xs'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      {t('readerView.pageShort', {
                        page: String(p.pageNumber).padStart(2, '0'),
                      })}
                      {pageHasRework ? ` ${t('readerView.pageReworkSuffix')}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Right (w-80): Nhận xét & Góp ý */}
            <div className='w-80 shrink-0 bg-white border-l border-stone-200 flex flex-col justify-between overflow-y-auto'>
              <div className='p-3.5 space-y-3.5'>
                <div className='pb-2 border-b border-stone-200 flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <MessageSquare className='w-3.5 h-3.5 text-stone-700' />
                    <span className='text-xs font-bold text-stone-900 uppercase tracking-wider'>
                      {t('readerView.feedbackTitle', 'Nhận xét & Góp ý')}
                    </span>
                  </div>
                  <span className='px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold text-xs'>
                    {t('readerView.itemCount', { count: currentPanelChangeRequests.length })}
                  </span>
                </div>

                {canReview ? (
                <div className='bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2'>
                  <div className='flex items-center justify-between text-xs'>
                    <span
                      id='selected-panel-badge'
                      className='font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200'
                    >
                      {t('readerView.selectedPanelBadge', {
                        number: selectedPanel?.panelNumber || 1,
                      })}
                    </span>
                    <span className='text-xs text-stone-500 font-mono'>
                      {t('readerView.artistLabel', {
                        name: assignedArtistName || t('readerView.defaultArtistName'),
                      })}
                    </span>
                  </div>

                  <textarea
                    id='panel-comment-input'
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t(
                      'readerView.panelCommentPlaceholder',
                      'Nhập nhận xét chi tiết cho khung tranh này...',
                    )}
                    className='w-full text-xs p-2 rounded-lg bg-white border border-stone-200 focus:outline-none focus:border-stone-400 placeholder-stone-400 resize-none shadow-2xs'
                  />

                  <div className='flex items-center gap-1.5 pt-1'>
                    <button
                      type='button'
                      disabled={submittingComment || !commentText.trim()}
                      onClick={() => handleAddComment('comment')}
                      className='flex-1 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50'
                    >
                      {t('readerView.btnComment', 'Bình luận')}
                    </button>
                    <button
                      type='button'
                      disabled={submittingComment || !commentText.trim()}
                      onClick={() => handleAddComment('rework')}
                      className='flex-1 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50'
                    >
                      <Flag className='w-3 h-3' />
                      <span>{t('readerView.btnRequestRework', 'Yêu cầu vẽ lại')}</span>
                    </button>
                  </div>
                </div>
                ) : (
                  <div className='rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800'>
                    {t('readerView.roles.writer.readOnlyNotice')}
                  </div>
                )}

                {/* Discussions list */}
                <div className='space-y-2'>
                  <div className='text-xs font-bold text-stone-500 uppercase tracking-wider px-1'>
                    {t('readerView.threadsTitle', {
                      count: currentPanelChangeRequests.length,
                    })}
                  </div>
                  <div id='panel-comments-list' className='space-y-2.5'>
                    {currentPanelChangeRequests.length === 0 ? (
                      <div className='p-4 text-center text-xs text-stone-400 italic'>
                        {t('readerView.noPanelFeedback')}
                      </div>
                    ) : (
                      currentPanelChangeRequests.map((cr) => {
                        const isRework = String(cr.status) === 'Open';
                        return (
                          <div
                            key={cr.id}
                            className={`p-3 rounded-xl border space-y-2 ${
                              isRework
                                ? 'bg-rose-50/60 border-rose-200'
                                : 'bg-stone-50 border-stone-200'
                            }`}
                          >
                            <div className='flex items-start justify-between gap-1'>
                              <div className='flex items-center gap-1.5'>
                                <div className='w-5 h-5 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center'>
                                  PF
                                </div>
                                <div className='text-xs font-bold text-stone-900'>
                                  {cr.createdByUserId || t('readerView.defaultEditorName')}
                                </div>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                                  isRework
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isRework
                                  ? t('readerView.statusNeedsReworkFlag')
                                  : t('readerView.statusApproved')}
                              </span>
                            </div>
                            <p className='text-xs text-stone-800 leading-relaxed'>
                              {cr.description}
                            </p>
                            <div className='flex items-center justify-between pt-1 border-t border-stone-200/60 text-xs'>
                              <span
                                className={
                                  isRework ? 'text-rose-700 font-semibold' : 'text-emerald-700'
                                }
                              >
                                {isRework
                                  ? t('readerView.waitingArtist', 'Chờ họa sĩ sửa lại')
                                  : t('readerView.statusCompleted')}
                              </span>
                              <span className='text-stone-400 font-mono'>
                                {formatDateTime(cr.createdAt, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Keyboard shortcuts footer */}
              <div className='p-3 border-t border-stone-200 bg-stone-50 text-center'>
                <div className='text-xs text-stone-500'>
                  {t('readerView.shortcutsHint', 'Phím tắt: 1 2 3 chuyển khung tranh')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
