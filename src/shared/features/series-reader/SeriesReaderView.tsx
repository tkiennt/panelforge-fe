import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ImageOff,
  Loader2,
  MapPin,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Unlock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ProducerSharedHeader } from '@/shared/features/production-workspace/ProducerSharedHeader';
import { chapterService, type ChapterDto } from '@/services/chapter.service';
import { seriesService, type SeriesDetailDto } from '@/services/series.service';
import { workspaceService } from '@/services/workspace.service';
import {
  pageCommentService,
  type PageCommentDto,
  type PageCommentStatus,
} from '@/services/pageComment.service';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  CountChip,
  Drawer,
  EmptyState,
  StatusBadge,
} from '@/shared/ui';
import { useChapterPagesLoader, type LoadedReaderPage } from './useChapterPagesLoader';
import {
  CommentPanelContent,
  type CommentScopeFilter,
  type DraftPinTarget,
} from './CommentPanelContent';
import { ReworkFromCommentModal } from './ReworkFromCommentModal';

export interface SeriesReaderViewProps {
  workspaceRole?: string;
  onShowToast: (title: string, desc: string) => void;
}

/** Khớp breakpoint `xl` của Tailwind: từ đây cột góp ý bên phải luôn hiện. */
const WIDE_QUERY = '(min-width: 1280px)';

const PIN_COLOR_CLASS: Record<PageCommentStatus, string> = {
  Open: 'bg-orange-500 text-white border-white',
  Resolved: 'bg-stone-500 text-white border-white',
  ConvertedToRework: 'bg-rose-600 text-white border-white',
};

export const SeriesReaderView: React.FC<SeriesReaderViewProps> = ({
  workspaceRole,
  onShowToast,
}) => {
  const { workspaceId = '', seriesId = '' } = useParams<{
    workspaceId: string;
    seriesId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation('review');

  const isProducer = ['producer', 'owner', 'admin', 'administrator'].includes(
    (workspaceRole ?? '').toLowerCase(),
  );
  // Khớp PageCommentsController: Producer/Editor/Writer xem và tạo góp ý;
  // đóng / mở lại / chuyển rework chỉ Producer/Editor. Vai trò khác gọi sẽ nhận 403.
  const canViewComments = ['producer', 'owner', 'editor', 'writer'].includes(
    (workspaceRole ?? '').toLowerCase(),
  );
  const canModerateComments = ['producer', 'owner', 'editor'].includes(
    (workspaceRole ?? '').toLowerCase(),
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [comments, setComments] = useState<PageCommentDto[]>([]);
  const [memberNamesById, setMemberNamesById] = useState<Record<string, string>>({});

  // Layout & filters
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [chapterStatusFilter, setChapterStatusFilter] = useState<string>('ALL');
  const [showEmptyChapters, setShowEmptyChapters] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // >= xl đã có cột góp ý bên phải; Drawer (dialog modal, class xl:hidden) chỉ dùng cho màn hẹp.
  // Mở Drawer ở màn rộng sẽ chỉ còn lớp nền xám vì panel của nó bị ẩn.
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE_QUERY).matches,
  );
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.(WIDE_QUERY) : undefined;
    if (!mq) return;
    const onChange = () => setIsWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const openCommentPanel = () => {
    if (!isWide) setDrawerOpen(true);
  };
  const [commentStatusFilter, setCommentStatusFilter] = useState<PageCommentStatus>('Open');
  const [commentScopeFilter, setCommentScopeFilter] = useState<CommentScopeFilter>('series');

  // Active viewport / selection
  const initialChapterParam = searchParams.get('chapterId');
  const initialPageParam = searchParams.get('pageId');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(initialChapterParam);
  const [activePageId, setActivePageId] = useState<string | null>(initialPageParam);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [flashingCommentId, setFlashingCommentId] = useState<string | null>(null);

  // Comment composer
  const [draftTarget, setDraftTarget] = useState<DraftPinTarget | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionCommentId, setActionCommentId] = useState<string | null>(null);

  // Rework modal
  const [reworkComment, setReworkComment] = useState<PageCommentDto | null>(null);
  const [reworkSubmitting, setReworkSubmitting] = useState(false);
  const [reworkError, setReworkError] = useState<string | null>(null);

  // Reopen chapter ConfirmDialog
  const [reopenChapterTarget, setReopenChapterTarget] = useState<ChapterDto | null>(null);
  const [reopenChapterReason, setReopenChapterReason] = useState('');
  const [reopenChapterBusy, setReopenChapterBusy] = useState(false);

  const { chapterDataMap, loadChapter, refreshTaskGrid } = useChapterPagesLoader();

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const didInitialScrollRef = useRef(false);
  const onShowToastRef = useRef(onShowToast);
  onShowToastRef.current = onShowToast;
  const tRef = useRef(t);
  tRef.current = t;
  const initialChapterParamRef = useRef(initialChapterParam);
  const initialPageParamRef = useRef(initialPageParam);

  // Initial load: series, chapters, comments, workspace members
  const loadInitialData = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [seriesRes, chaptersRes, commentsRes, membersRes] = await Promise.all([
        seriesService.getSeriesById(seriesId).catch(() => null),
        chapterService.getChaptersBySeries(seriesId, 1, 200),
        canViewComments
          ? pageCommentService.listBySeries(seriesId).catch(() => [] as PageCommentDto[])
          : Promise.resolve([] as PageCommentDto[]),
        workspaceId
          ? workspaceService.getMembers(workspaceId).catch(() => [])
          : Promise.resolve([]),
      ]);

      setSeries(seriesRes);
      const sortedChapters = [...(chaptersRes?.items ?? [])].sort(
        (a, b) => a.chapterNumber - b.chapterNumber,
      );
      setChapters(sortedChapters);
      setComments(commentsRes);

      const memberMap: Record<string, string> = {};
      for (const m of membersRes) {
        const key = m.userId || m.id;
        if (key) memberMap[key] = m.fullName || m.email || key;
      }
      setMemberNamesById(memberMap);

      const defaultChap =
        sortedChapters.find((c) => c.id === initialChapterParamRef.current) ??
        sortedChapters.find((c) => c.pagesCount > 0) ??
        sortedChapters[0] ??
        null;

      if (defaultChap) {
        setActiveChapterId((prev) => prev || defaultChap.id);
        setDraftTarget(
          (prev) =>
            prev ?? {
              chapterId: defaultChap.id,
              chapterNumber: defaultChap.chapterNumber,
              pageId: initialPageParamRef.current || null,
              pageNumber: null,
              assetReferenceId: null,
              pinX: null,
              pinY: null,
            },
        );
        void loadChapter(defaultChap.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : tRef.current('seriesReader.loadError');
      setLoadError(msg);
      onShowToastRef.current(tRef.current('seriesReader.loadErrorTitle'), msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, workspaceId, loadChapter, canViewComments]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // Keyboard shortcut: C toggles pin mode when not typing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setPinMode((prev) => !prev);
      } else if (e.key === 'Escape' && pinMode) {
        setPinMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pinMode]);

  const chaptersById = useMemo(
    () => Object.fromEntries(chapters.map((c) => [c.id, c])),
    [chapters],
  );

  const openCountByChapter = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of comments) {
      if (c.status === 'Open') {
        map[c.chapterId] = (map[c.chapterId] ?? 0) + 1;
      }
    }
    return map;
  }, [comments]);

  const visibleChapters = useMemo(() => {
    return chapters.filter((chap) => {
      if (!showEmptyChapters && chap.pagesCount === 0) return false;
      if (chapterStatusFilter !== 'ALL' && chap.status !== chapterStatusFilter) return false;
      return true;
    });
  }, [chapters, showEmptyChapters, chapterStatusFilter]);

  // Lazy-load chapter sections when approaching viewport
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const chapId = (entry.target as HTMLElement).dataset.chapterId;
          if (chapId) void loadChapter(chapId);
        }
      },
      { rootMargin: '600px 0px', threshold: 0.01 },
    );

    for (const chap of visibleChapters) {
      const el = sectionRefs.current[chap.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [visibleChapters, loadChapter]);

  // Track visible page in viewport & sync URL params (chapterId, pageId)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const el = visible.target as HTMLElement;
        const nextChapId = el.dataset.chapterId;
        const nextPageId = el.dataset.pageId;
        if (nextChapId && nextPageId) {
          setActiveChapterId(nextChapId);
          setActivePageId(nextPageId);
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set('chapterId', nextChapId);
              next.set('pageId', nextPageId);
              return next;
            },
            { replace: true },
          );
        }
      },
      { threshold: 0.35 },
    );

    for (const el of Object.values(pageRefs.current)) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [chapterDataMap, setSearchParams]);

  // Initial scroll to URL chapterId / pageId once available
  useEffect(() => {
    if (loading || didInitialScrollRef.current) return;
    if (initialPageParam && pageRefs.current[initialPageParam]) {
      didInitialScrollRef.current = true;
      pageRefs.current[initialPageParam]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } else if (initialChapterParam && sectionRefs.current[initialChapterParam]) {
      didInitialScrollRef.current = true;
      sectionRefs.current[initialChapterParam]?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [loading, chapterDataMap, initialChapterParam, initialPageParam]);

  const handleJumpToChapter = (chap: ChapterDto) => {
    setActiveChapterId(chap.id);
    setDraftTarget({
      chapterId: chap.id,
      chapterNumber: chap.chapterNumber,
      pageId: null,
      pageNumber: null,
      assetReferenceId: null,
      pinX: null,
      pinY: null,
    });
    void loadChapter(chap.id);
    sectionRefs.current[chap.id]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('chapterId', chap.id);
        next.delete('pageId');
        return next;
      },
      { replace: true },
    );
  };

  const handlePageImageClick = (
    e: React.MouseEvent<HTMLDivElement>,
    chap: ChapterDto,
    loadedPage: LoadedReaderPage,
  ) => {
    if (!pinMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pinX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const pinY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    setActiveChapterId(chap.id);
    setActivePageId(loadedPage.page.id);
    setDraftTarget({
      chapterId: chap.id,
      chapterNumber: chap.chapterNumber,
      pageId: loadedPage.page.id,
      pageNumber: loadedPage.page.pageNumber,
      assetReferenceId: loadedPage.assetReferenceId,
      pinX: Number(pinX.toFixed(4)),
      pinY: Number(pinY.toFixed(4)),
    });
    openCommentPanel();
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  const handleSelectComment = (comment: PageCommentDto) => {
    setSelectedCommentId(comment.id);
    setActiveChapterId(comment.chapterId);
    if (comment.pageId) {
      setActivePageId(comment.pageId);
      void loadChapter(comment.chapterId);
      const targetEl = pageRefs.current[comment.pageId] || sectionRefs.current[comment.chapterId];
      targetEl?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } else {
      sectionRefs.current[comment.chapterId]?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'start',
      });
    }
    setFlashingCommentId(comment.id);
    setTimeout(() => {
      setFlashingCommentId((prev) => (prev === comment.id ? null : prev));
    }, 1800);
  };

  const handleSubmitComment = async () => {
    if (!draftTarget || !draftMessage.trim()) return;
    setSubmittingComment(true);
    try {
      const created = await pageCommentService.create(draftTarget.chapterId, {
        pageId: draftTarget.pageId,
        assetReferenceId: draftTarget.assetReferenceId,
        pinX: draftTarget.pinX,
        pinY: draftTarget.pinY,
        message: draftMessage.trim(),
      });
      setComments((prev) => [created, ...prev]);
      setDraftMessage('');
      setDraftTarget((prev) => (prev ? { ...prev, pinX: null, pinY: null } : null));
      setSelectedCommentId(created.id);
      setCommentStatusFilter('Open');
      onShowToast(
        t('seriesReader.toast.commentCreatedTitle'),
        t('seriesReader.toast.commentCreatedDesc'),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('seriesReader.toast.actionFailed');
      onShowToast(t('seriesReader.toast.actionFailedTitle'), msg);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolveComment = async (comment: PageCommentDto, note?: string) => {
    setActionCommentId(comment.id);
    try {
      const updated = await pageCommentService.resolve(comment.chapterId, comment.id, { note });
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      onShowToast(t('seriesReader.toast.resolvedTitle'), t('seriesReader.toast.resolvedDesc'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('seriesReader.toast.actionFailed');
      onShowToast(t('seriesReader.toast.actionFailedTitle'), msg);
    } finally {
      setActionCommentId(null);
    }
  };

  const handleReopenComment = async (comment: PageCommentDto) => {
    setActionCommentId(comment.id);
    try {
      const updated = await pageCommentService.reopen(comment.chapterId, comment.id);
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      onShowToast(t('seriesReader.toast.reopenedTitle'), t('seriesReader.toast.reopenedDesc'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('seriesReader.toast.actionFailed');
      onShowToast(t('seriesReader.toast.actionFailedTitle'), msg);
    } finally {
      setActionCommentId(null);
    }
  };

  const handleOpenReworkModal = (comment: PageCommentDto) => {
    setReworkError(null);
    setReworkComment(comment);
    if (!chapterDataMap[comment.chapterId]?.taskGrid) {
      void loadChapter(comment.chapterId);
    }
  };

  const handleSubmitRework = async (stageTaskId: string, reason: string) => {
    if (!reworkComment) return;
    setReworkSubmitting(true);
    setReworkError(null);
    try {
      const updated = await pageCommentService.convertToRework(
        reworkComment.chapterId,
        reworkComment.id,
        { stageTaskId, reason },
      );
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await refreshTaskGrid(reworkComment.chapterId);
      setReworkComment(null);
      onShowToast(
        t('seriesReader.toast.reworkSuccessTitle'),
        t('seriesReader.toast.reworkSuccessDesc'),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('seriesReader.toast.actionFailed');
      setReworkError(msg);
      onShowToast(t('seriesReader.toast.actionFailedTitle'), msg);
    } finally {
      setReworkSubmitting(false);
    }
  };

  const handleConfirmReopenChapter = async () => {
    if (!reopenChapterTarget || !reopenChapterReason.trim()) return;
    setReopenChapterBusy(true);
    try {
      await chapterService.reopenChapter(reopenChapterTarget.id, reopenChapterReason.trim());
      setChapters((prev) =>
        prev.map((c) => (c.id === reopenChapterTarget.id ? { ...c, status: 'InProduction' } : c)),
      );
      await refreshTaskGrid(reopenChapterTarget.id);
      onShowToast(
        t('seriesReader.toast.chapterReopenedTitle'),
        t('seriesReader.toast.chapterReopenedDesc', { number: reopenChapterTarget.chapterNumber }),
      );
      setReopenChapterTarget(null);
      setReopenChapterReason('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('seriesReader.toast.actionFailed');
      onShowToast(t('seriesReader.toast.actionFailedTitle'), msg);
    } finally {
      setReopenChapterBusy(false);
    }
  };

  const commentsByPageId = useMemo(() => {
    const map: Record<string, PageCommentDto[]> = {};
    for (const c of comments) {
      if (c.pageId && c.pinX != null && c.pinY != null) {
        if (!map[c.pageId]) map[c.pageId] = [];
        map[c.pageId].push(c);
      }
    }
    return map;
  }, [comments]);

  const totalOpenComments = useMemo(
    () => comments.filter((c) => c.status === 'Open').length,
    [comments],
  );

  const commentPanelProps = {
    comments,
    chaptersById,
    activeChapterId,
    activePageId,
    selectedCommentId,
    statusFilter: commentStatusFilter,
    scopeFilter: commentScopeFilter,
    isProducer,
    canModerate: canModerateComments,
    draftTarget,
    draftMessage,
    submittingComment,
    actionCommentId,
    textareaRef,
    onStatusFilterChange: setCommentStatusFilter,
    onScopeFilterChange: setCommentScopeFilter,
    onSelectComment: handleSelectComment,
    onDraftMessageChange: setDraftMessage,
    onClearPin: () => setDraftTarget((prev) => (prev ? { ...prev, pinX: null, pinY: null } : null)),
    onSubmitComment: handleSubmitComment,
    onResolveComment: handleResolveComment,
    onReopenComment: handleReopenComment,
    onRequestRework: handleOpenReworkModal,
    onRequestReopenChapter: (chap: ChapterDto) => {
      setReopenChapterTarget(chap);
      setReopenChapterReason('');
    },
  };

  return (
    <div
      className='w-full min-h-screen bg-[#FAF9F5] font-sans text-stone-900 flex flex-col'
      data-testid='series-reader-view'
    >
      <ProducerSharedHeader
        mode='series'
        workspaceId={workspaceId}
        seriesId={seriesId}
        seriesTitle={series?.title}
        seriesFormat={series?.format}
        subtitle={t('seriesReader.headerSubtitle')}
        actionCta={
          <div className='flex items-center gap-2'>
            <Button
              variant={pinMode ? 'primary' : 'secondary'}
              size='sm'
              leadingIcon={<MapPin aria-hidden='true' />}
              onClick={() => setPinMode((prev) => !prev)}
              data-testid='series-reader-pin-mode-btn'
            >
              {pinMode
                ? t('seriesReader.toolbar.pinModeActive')
                : t('seriesReader.toolbar.addCommentMode')}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              leadingIcon={<MessageSquare aria-hidden='true' />}
              className='xl:hidden'
              onClick={() => setDrawerOpen(true)}
              data-testid='series-reader-open-drawer-btn'
            >
              {t('seriesReader.toolbar.commentsBtn', { count: totalOpenComments })}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className='flex flex-1 items-center justify-center py-24 text-stone-500'>
          <Loader2 className='w-6 h-6 animate-spin' aria-hidden='true' />
        </div>
      ) : loadError ? (
        <div className='max-w-xl mx-auto p-6 w-full'>
          <Alert tone='danger'>{loadError}</Alert>
        </div>
      ) : (
        <div className='flex flex-1 min-h-0 h-[calc(100vh-4.25rem)] overflow-hidden'>
          {/* Left Column: Table of Contents (~240px, collapsible) */}
          <aside
            data-testid='series-reader-toc'
            className={`shrink-0 border-r border-stone-200 bg-white flex flex-col transition-all ${
              tocCollapsed ? 'w-12' : 'w-[240px]'
            }`}
          >
            <div className='p-2.5 border-b border-stone-200 flex items-center justify-between gap-2'>
              {!tocCollapsed && (
                <span className='text-xs font-bold uppercase tracking-wider text-stone-700 truncate'>
                  {t('seriesReader.toc.title')}
                </span>
              )}
              <button
                type='button'
                onClick={() => setTocCollapsed((prev) => !prev)}
                aria-label={
                  tocCollapsed ? t('seriesReader.toc.expand') : t('seriesReader.toc.collapse')
                }
                className='p-1 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 cursor-pointer'
              >
                {tocCollapsed ? (
                  <PanelLeftOpen className='w-4 h-4' aria-hidden='true' />
                ) : (
                  <PanelLeftClose className='w-4 h-4' aria-hidden='true' />
                )}
              </button>
            </div>

            {!tocCollapsed && (
              <>
                <div className='p-2.5 border-b border-stone-100 space-y-2 bg-[#FAF9F5]'>
                  <select
                    aria-label={t('seriesReader.toc.statusFilterLabel')}
                    value={chapterStatusFilter}
                    onChange={(e) => setChapterStatusFilter(e.target.value)}
                    className='w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-800 focus:border-orange-500 focus:outline-none'
                  >
                    <option value='ALL'>{t('seriesReader.toc.allStatuses')}</option>
                    <option value='PreProduction'>
                      {t('seriesReader.toc.statusPreProduction')}
                    </option>
                    <option value='InProduction'>{t('seriesReader.toc.statusInProduction')}</option>
                    <option value='ChapterApproved'>{t('seriesReader.toc.statusApproved')}</option>
                    <option value='HandedOffAndPublished'>
                      {t('seriesReader.toc.statusPublished')}
                    </option>
                  </select>

                  <label className='flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none'>
                    <input
                      type='checkbox'
                      checked={showEmptyChapters}
                      onChange={(e) => setShowEmptyChapters(e.target.checked)}
                      className='accent-orange-600'
                    />
                    <span>{t('seriesReader.toc.showEmptyChapters')}</span>
                  </label>
                </div>

                <nav
                  aria-label={t('seriesReader.toc.title')}
                  className='flex-1 overflow-y-auto p-2 space-y-1'
                >
                  {visibleChapters.length === 0 ? (
                    <p className='p-3 text-xs text-stone-500 text-center'>
                      {t('seriesReader.toc.empty')}
                    </p>
                  ) : (
                    visibleChapters.map((chap) => {
                      const isActive = activeChapterId === chap.id;
                      const openCount = openCountByChapter[chap.id] ?? 0;
                      return (
                        <button
                          key={chap.id}
                          type='button'
                          data-testid={`toc-chapter-${chap.id}`}
                          onClick={() => handleJumpToChapter(chap)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer space-y-1.5 ${
                            isActive
                              ? 'bg-orange-50 border-orange-300 text-stone-900'
                              : 'bg-white border-transparent hover:bg-stone-50 hover:border-stone-200 text-stone-800'
                          }`}
                        >
                          <div className='flex items-center justify-between gap-1.5'>
                            <span className='text-xs font-bold truncate'>
                              {t('seriesReader.toc.chapterLabel', { number: chap.chapterNumber })}
                            </span>
                            {openCount > 0 && <CountChip>{openCount}</CountChip>}
                          </div>
                          {chap.title && (
                            <div className='text-xs text-stone-600 truncate'>{chap.title}</div>
                          )}
                          <div className='flex items-center justify-between gap-1'>
                            <StatusBadge kind='chapter' status={chap.status || 'PreProduction'} />
                            <span className='text-xs font-mono text-stone-500'>
                              {t('seriesReader.toc.pagesCount', { count: chap.pagesCount })}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </nav>
              </>
            )}
          </aside>

          {/* Center: Continuous Vertical Reader */}
          <main
            data-testid='series-reader-canvas'
            className='flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 py-6 space-y-10 bg-stone-100/70'
          >
            {visibleChapters.length === 0 ? (
              <div className='max-w-lg mx-auto py-16'>
                <EmptyState
                  icon={<BookOpen className='w-6 h-6' aria-hidden='true' />}
                  title={t('seriesReader.emptyChaptersTitle')}
                  description={t('seriesReader.emptyChaptersDesc')}
                />
              </div>
            ) : (
              visibleChapters.map((chap) => {
                const loaded = chapterDataMap[chap.id];
                return (
                  <section
                    key={chap.id}
                    ref={(el) => {
                      sectionRefs.current[chap.id] = el;
                    }}
                    data-chapter-id={chap.id}
                    data-testid={`reader-chapter-section-${chap.id}`}
                    className='max-w-[900px] mx-auto space-y-4'
                  >
                    {/* Chapter Section Header */}
                    <div className='sticky top-0 z-10 bg-white/95 backdrop-blur-md border border-stone-200 rounded-xl px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-2'>
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <BookOpen className='w-4 h-4 text-orange-600 shrink-0' aria-hidden='true' />
                        <h3 className='text-sm font-bold text-stone-900 truncate'>
                          {t('seriesReader.chapterSectionTitle', {
                            number: chap.chapterNumber,
                            title: chap.title || t('seriesReader.untitledChapter'),
                          })}
                        </h3>
                        <StatusBadge kind='chapter' status={chap.status || 'PreProduction'} />
                      </div>

                      {isProducer && chap.status !== 'InProduction' && (
                        <Button
                          variant='secondary'
                          size='sm'
                          leadingIcon={<Unlock aria-hidden='true' />}
                          onClick={() => {
                            setReopenChapterTarget(chap);
                            setReopenChapterReason('');
                          }}
                        >
                          {t('seriesReader.comments.reopenChapterBtn')}
                        </Button>
                      )}
                    </div>

                    {/* Chapter Pages */}
                    {!loaded || loaded.status === 'idle' || loaded.status === 'loading' ? (
                      <div className='bg-white border border-stone-200 rounded-xl p-10 flex items-center justify-center gap-2 text-xs text-stone-500'>
                        <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />
                        <span>{t('seriesReader.loadingChapter')}</span>
                      </div>
                    ) : loaded.pages.length === 0 ? (
                      <div className='bg-white border border-dashed border-stone-300 rounded-xl p-8 text-center text-xs text-stone-500'>
                        {t('seriesReader.noPagesInChapter')}
                      </div>
                    ) : (
                      <div className='space-y-4'>
                        {loaded.pages.map((loadedPage) => {
                          const { page, imageUrl, currentStageName } = loadedPage;
                          const pagePins = commentsByPageId[page.id] ?? [];
                          const ratio =
                            page.widthPx > 0 && page.heightPx > 0
                              ? `${page.widthPx} / ${page.heightPx}`
                              : '2 / 3';

                          return (
                            <div
                              key={page.id}
                              ref={(el) => {
                                pageRefs.current[page.id] = el;
                              }}
                              data-chapter-id={chap.id}
                              data-page-id={page.id}
                              data-testid={`reader-page-${page.id}`}
                              className='bg-white border border-stone-200/80 rounded-xl overflow-hidden shadow-xs'
                            >
                              {/* Page strip */}
                              <div className='px-3.5 py-2 bg-[#FAF9F5] border-b border-stone-200/70 flex items-center justify-between gap-2 text-xs text-stone-600'>
                                <span className='font-mono font-semibold text-stone-800'>
                                  {t('seriesReader.pageHeader', { number: page.pageNumber })}
                                </span>
                                <div className='flex items-center gap-2'>
                                  {currentStageName && (
                                    <Badge tone='info'>{currentStageName}</Badge>
                                  )}
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setDraftTarget({
                                        chapterId: chap.id,
                                        chapterNumber: chap.chapterNumber,
                                        pageId: page.id,
                                        pageNumber: page.pageNumber,
                                        assetReferenceId: loadedPage.assetReferenceId,
                                        pinX: null,
                                        pinY: null,
                                      });
                                      openCommentPanel();
                                      setTimeout(() => textareaRef.current?.focus(), 60);
                                    }}
                                    className='text-xs font-medium text-orange-700 hover:underline cursor-pointer'
                                  >
                                    {t('seriesReader.commentOnPageBtn')}
                                  </button>
                                </div>
                              </div>

                              {/* Page image or placeholder */}
                              <div
                                onClick={(e) => handlePageImageClick(e, chap, loadedPage)}
                                className={`relative w-full bg-stone-50 ${
                                  pinMode ? 'cursor-crosshair' : ''
                                }`}
                              >
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={t('seriesReader.pageAlt', {
                                      chapter: chap.chapterNumber,
                                      page: page.pageNumber,
                                    })}
                                    loading='lazy'
                                    width={page.widthPx || 1200}
                                    height={page.heightPx || 1800}
                                    style={{ aspectRatio: ratio }}
                                    className='w-full h-auto block select-none'
                                  />
                                ) : (
                                  <div
                                    style={{ aspectRatio: '16 / 9' }}
                                    className='w-full flex flex-col items-center justify-center gap-2 p-8 text-center text-stone-500 bg-stone-50'
                                  >
                                    <ImageOff
                                      className='w-6 h-6 text-stone-400'
                                      aria-hidden='true'
                                    />
                                    <p className='text-xs font-semibold text-stone-700'>
                                      {t('seriesReader.noArtworkPlaceholder')}
                                    </p>
                                    {currentStageName && (
                                      <p className='text-xs text-stone-500'>
                                        {t('seriesReader.currentStageLabel', {
                                          stage: currentStageName,
                                        })}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Draft Pin Preview */}
                                {draftTarget?.pageId === page.id &&
                                  draftTarget.pinX != null &&
                                  draftTarget.pinY != null && (
                                    <div
                                      style={{
                                        left: `${draftTarget.pinX * 100}%`,
                                        top: `${draftTarget.pinY * 100}%`,
                                      }}
                                      className='absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-orange-600 text-white border-2 border-white shadow-md flex items-center justify-center text-xs font-bold pointer-events-none ring-4 ring-orange-400/50'
                                    >
                                      +
                                    </div>
                                  )}

                                {/* Saved Comment Pins */}
                                {pagePins.map((pin, idx) => {
                                  const isSelected = selectedCommentId === pin.id;
                                  const isFlashing = flashingCommentId === pin.id;
                                  return (
                                    <button
                                      key={pin.id}
                                      type='button'
                                      aria-label={t('seriesReader.pinAriaLabel', {
                                        index: idx + 1,
                                        author: pin.authorName,
                                      })}
                                      style={{
                                        left: `${(pin.pinX ?? 0) * 100}%`,
                                        top: `${(pin.pinY ?? 0) * 100}%`,
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCommentId(pin.id);
                                        setCommentStatusFilter(pin.status);
                                        openCommentPanel();
                                      }}
                                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 shadow-md flex items-center justify-center text-xs font-bold cursor-pointer transition-transform ${
                                        PIN_COLOR_CLASS[pin.status]
                                      } ${isSelected ? 'scale-125 ring-4 ring-orange-300' : 'hover:scale-110'} ${
                                        isFlashing ? 'animate-ping' : ''
                                      }`}
                                    >
                                      {idx + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </main>

          {/* Right Column: Comments Panel (~360px on >= 1280px) */}
          <aside
            data-testid='series-reader-comments-panel'
            className='hidden xl:flex w-[360px] shrink-0 border-l border-stone-200 bg-white flex-col min-h-0'
          >
            <CommentPanelContent {...commentPanelProps} />
          </aside>
        </div>
      )}

      {/* Responsive Drawer (< 1280px) */}
      <Drawer
        isOpen={drawerOpen && !isWide}
        onClose={() => setDrawerOpen(false)}
        title={t('seriesReader.comments.drawerTitle')}
        closeLabel={t('seriesReader.close')}
        placement='right'
        size='sm'
        className='xl:hidden'
      >
        <div className='-m-6 h-[calc(100%+3rem)] flex flex-col'>
          <CommentPanelContent {...commentPanelProps} />
        </div>
      </Drawer>

      {/* Convert to Rework Modal (Producer only) */}
      <ReworkFromCommentModal
        isOpen={Boolean(reworkComment)}
        comment={reworkComment}
        taskGrid={
          reworkComment ? (chapterDataMap[reworkComment.chapterId]?.taskGrid ?? null) : null
        }
        memberNamesById={memberNamesById}
        submitting={reworkSubmitting}
        errorMessage={reworkError}
        onClose={() => {
          setReworkComment(null);
          setReworkError(null);
        }}
        onSubmit={handleSubmitRework}
      />

      {/* Reopen Chapter ConfirmDialog */}
      <ConfirmDialog
        isOpen={Boolean(reopenChapterTarget)}
        variant='default'
        title={t('seriesReader.reopenChapterDialog.title')}
        description={
          reopenChapterTarget
            ? t('seriesReader.reopenChapterDialog.description', {
                number: reopenChapterTarget.chapterNumber,
              })
            : undefined
        }
        confirmLabel={t('seriesReader.reopenChapterDialog.confirmBtn')}
        cancelLabel={t('seriesReader.cancel')}
        closeLabel={t('seriesReader.close')}
        confirmDisabled={reopenChapterBusy || !reopenChapterReason.trim()}
        onConfirm={() => void handleConfirmReopenChapter()}
        onCancel={() => {
          setReopenChapterTarget(null);
          setReopenChapterReason('');
        }}
      >
        <div className='space-y-1.5 mt-2'>
          <label
            htmlFor='reopen-chapter-reason'
            className='block text-xs font-semibold text-stone-700'
          >
            {t('seriesReader.reopenChapterDialog.reasonLabel')}
          </label>
          <textarea
            id='reopen-chapter-reason'
            rows={3}
            value={reopenChapterReason}
            onChange={(e) => setReopenChapterReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && reopenChapterReason.trim()) {
                e.preventDefault();
                void handleConfirmReopenChapter();
              }
            }}
            placeholder={t('seriesReader.reopenChapterDialog.reasonPlaceholder')}
            className='w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-orange-500 focus:outline-none'
          />
        </div>
      </ConfirmDialog>
    </div>
  );
};
