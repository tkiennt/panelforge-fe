import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Lock,
  Palette,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import {
  EditorQualityGate,
  EditorReviewQueueItemDto,
  normalizeWorkspaceRole,
  TaskGridReviewItemDto,
  WorkspaceRole,
} from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { bibleService } from '@/services/bible.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { workspaceService } from '@/services/workspace.service';
import {
  buildScriptEditorUrl,
  buildScriptReviewUrl,
  buildSeriesPath,
  buildSeriesReaderUrl,
  buildTaskReviewUrl,
} from '@/app/routePaths';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CountChip,
  Skeleton,
} from '@/shared/ui';

export interface EditorDeskViewProps {
  currentUserId?: string | null;
  workspaceRole?: WorkspaceRole | null;
  onShowToast?: (title: string, desc: string) => void;
}

type DeskQueueItem = EditorReviewQueueItemDto & {
  isGridItem?: boolean;
  taskId?: string;
  reviewerUserId?: string | null;
  reviewerName?: string | null;
  isInputOutdated?: boolean;
};

const inferGateFromStage = (stageName: string): 'gate1' | 'gate2' => {
  const n = (stageName || '').toLowerCase();
  if (
    n.includes('pencil') ||
    n.includes('storyboard') ||
    n.includes('layout') ||
    n.includes('thumb') ||
    n.includes('phác') ||
    n.includes('chì')
  ) {
    return 'gate1';
  }
  return 'gate2';
};

export const EditorDeskView: React.FC<EditorDeskViewProps> = ({
  currentUserId,
  workspaceRole,
  onShowToast,
}) => {
  const { t, lang } = useTranslation('review');
  const navigate = useNavigate();
  const isProducer = normalizeWorkspaceRole(workspaceRole) === 'PRODUCER';
  const {
    workspaceId,
    seriesId,
    chapterId: paramChapterId,
  } = useParams<{
    workspaceId: string;
    seriesId: string;
    chapterId?: string;
  }>();

  // State
  const [queueItems, setQueueItems] = useState<DeskQueueItem[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<SeriesDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGate, setActiveGate] = useState<EditorQualityGate>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Submitted' | 'UnderReview'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openingReviewId, setOpeningReviewId] = useState<string | null>(null);
  const [gridBusyTaskId, setGridBusyTaskId] = useState<string | null>(null);
  const [rejectingGridTaskId, setRejectingGridTaskId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  // Load Queue & Series Detail
  const [pendingBibleConcepts, setPendingBibleConcepts] = useState(0);
  /** D12: chương có kịch bản đang chờ duyệt (không đi qua Assignment). */
  const [scriptsInReview, setScriptsInReview] = useState<ChapterDto[]>([]);

  const loadData = useCallback(async () => {
    if (!seriesId) return;
    try {
      setLoading(true);
      setError(null);

      const [gridItems, legacyItems, series, bible, chapterPage] = await Promise.all([
        workspaceId && typeof assignmentService.getTaskGridReviewQueue === 'function'
          ? assignmentService
              .getTaskGridReviewQueue(workspaceId, { seriesId })
              .catch(() => [] as TaskGridReviewItemDto[])
          : Promise.resolve([] as TaskGridReviewItemDto[]),
        typeof assignmentService.getEditorReviewQueue === 'function'
          ? assignmentService
              .getEditorReviewQueue(seriesId, {
                gate: activeGate !== 'all' ? activeGate : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
              })
              .catch(() => [] as EditorReviewQueueItemDto[])
          : Promise.resolve([] as EditorReviewQueueItemDto[]),
        seriesService.getSeriesById(seriesId).catch(() => null),
        bibleService.getSeriesBible(seriesId).catch(() => null),
        chapterService.getChaptersBySeries(seriesId, 1, 100).catch(() => null),
      ]);

      const memberList =
        workspaceId && (gridItems || []).some((g) => Boolean(g.assigneeUserId))
          ? await workspaceService.getMembers(workspaceId).catch(() => [])
          : [];

      const mappedGridItems: DeskQueueItem[] = (gridItems || []).map((g) => {
        const m = (memberList || []).find((x) => x.userId === g.assigneeUserId);
        const reviewerName =
          g.reviewerName || (g.reviewerUserId ? g.reviewerUserId.slice(0, 8) : null);
        const gate = inferGateFromStage(g.stageName);
        return {
          isGridItem: true,
          taskId: g.taskId,
          assignmentId: g.taskId,
          reviewerUserId: g.reviewerUserId ?? null,
          reviewerName,
          isInputOutdated: Boolean(g.isInputOutdated),
          chapterId: g.chapterId,
          chapterNumber: g.chapterNumber,
          chapterTitle: g.chapterTitle ?? null,
          seriesId: g.seriesId,
          seriesTitle: g.seriesTitle,
          pipelineStageId: g.pipelineStageId,
          stageName: g.stageName,
          stageSlug: g.stageName.toLowerCase(),
          stageOrder: 0,
          stageColorCode: null,
          gate,
          status: g.status === 'UnderReview' ? 'UnderReview' : 'Submitted',
          entityType: g.pageId ? 'Page' : 'Chapter',
          targetEntityId: g.pageId ?? g.chapterId,
          scopeLabel:
            g.pageNumber != null
              ? t('artworkReview.header.page', { number: g.pageNumber })
              : t('chapterReview.wholeChapter'),
          assigneeUserId: g.assigneeUserId ?? '',
          assigneeName: m
            ? m.fullName || m.email.split('@')[0]
            : g.assigneeUserId
              ? g.assigneeUserId.slice(0, 8)
              : t('desk.unknownArtist'),
          assigneeAvatarUrl: m?.avatarUrl ?? null,
          latestSubmissionId: null,
          submissionAttempt: g.attemptNumber ?? 1,
          submittedAt: g.submittedAt ?? new Date().toISOString(),
          isSelfSubmission: Boolean(currentUserId && g.assigneeUserId === currentUserId),
          openChangeRequestsCount: 0,
          dueDate: null,
          priority: 'Medium',
          createdAt: g.submittedAt ?? new Date().toISOString(),
          artworkReferenceIds: [],
        };
      });

      const filteredGrid = mappedGridItems.filter((item) => {
        if (activeGate !== 'all' && item.gate !== activeGate) return false;
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        return true;
      });

      // D12: duyệt kịch bản không còn đi qua Assignment — bỏ việc kịch bản cũ khỏi hàng đợi
      const filteredLegacy = (legacyItems || []).filter((i) => i.stageSlug !== 'script');
      setQueueItems([...filteredGrid, ...filteredLegacy]);
      setScriptsInReview(
        (chapterPage?.items ?? [])
          .filter((c) => c.scriptStatus === 'InReview')
          .sort((a, b) => a.chapterNumber - b.chapterNumber),
      );
      setPendingBibleConcepts(
        (bible?.entries ?? []).filter((e) => {
          const r = e.effectiveRevision;
          return (
            !!r && !r.isLocked && (r.reviewStatus === 'ConceptSubmitted' || r.reviewStatus === 2)
          );
        }).length,
      );
      if (series) setSeriesInfo(series);
    } catch (err: any) {
      console.error('Failed to load Editor review queue:', err);
      setError(err.message || t('desk.errors.loadQueue'));
    } finally {
      setLoading(false);
    }
  }, [seriesId, workspaceId, activeGate, statusFilter, currentUserId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper to determine destination review URL
  const getReviewUrl = (item: EditorReviewQueueItemDto) => {
    if (!workspaceId || !seriesId) return '/workspaces';
    return item.stageSlug === 'script'
      ? buildScriptReviewUrl(workspaceId, seriesId, item.chapterId)
      : buildTaskReviewUrl(workspaceId, seriesId, item.assignmentId, item.chapterId);
  };

  // Handle Open Review
  const handleOpenReview = async (item: EditorReviewQueueItemDto) => {
    if (!workspaceId || !seriesId) return;
    if (item.isSelfSubmission) {
      onShowToast?.(t('desk.toast.fourEyesTitle'), t('desk.toast.fourEyesDesc'));
      return;
    }

    try {
      setOpeningReviewId(item.assignmentId);
      if (item.status === 'Submitted') {
        await assignmentService.openReview(item.chapterId, item.assignmentId);
        onShowToast?.(
          t('desk.toast.startReviewTitle'),
          t('desk.toast.startReviewDesc', { scope: item.scopeLabel }),
        );
      }
      navigate(getReviewUrl(item));
    } catch (err: any) {
      console.error('Failed to open review session:', err);
      onShowToast?.(t('desk.toast.openErrorTitle'), err.message || t('desk.toast.openErrorDesc'));
    } finally {
      setOpeningReviewId(null);
    }
  };

  const handleContinueReview = (item: EditorReviewQueueItemDto) => {
    if (!workspaceId || !seriesId) return;
    navigate(getReviewUrl(item));
  };

  const handleOpenGridReview = async (item: DeskQueueItem) => {
    if (!workspaceId || !seriesId || item.isSelfSubmission) return;
    const taskId = item.taskId || item.assignmentId;
    setGridBusyTaskId(`open:${taskId}`);
    try {
      if (
        item.status === 'Submitted' &&
        typeof assignmentService.openStageTaskReview === 'function'
      ) {
        await assignmentService.openStageTaskReview(item.chapterId, taskId);
      }
      navigate(getReviewUrl(item));
    } catch (err: any) {
      onShowToast?.(
        t('desk.toast.openErrorTitle'),
        err?.message || t('desk.toast.openGridErrorDesc'),
      );
      if (err?.status === 409) await loadData();
    } finally {
      setGridBusyTaskId(null);
    }
  };

  const handleReleaseGridReview = async (item: DeskQueueItem) => {
    const taskId = item.taskId || item.assignmentId;
    setGridBusyTaskId(`release:${taskId}`);
    try {
      const released = await assignmentService.releaseStageTaskReview(item.chapterId, taskId);
      onShowToast?.(
        t('chapterReview.releaseReviewToast'),
        t('desk.gridItemSummary', {
          chapter: item.chapterNumber,
          stage: item.stageName,
          scope: item.scopeLabel,
        }),
      );
      setQueueItems((prev) =>
        prev
          .map((q) =>
            q.assignmentId === item.assignmentId
              ? {
                  ...q,
                  status: (released?.status === 'UnderReview' ? 'UnderReview' : 'Submitted') as any,
                  reviewerUserId: released?.reviewerUserId ?? null,
                  reviewerName: null,
                  submissionAttempt: released?.attemptCount || q.submissionAttempt,
                  isInputOutdated: released?.isInputOutdated ?? q.isInputOutdated,
                }
              : q,
          )
          .filter((q) => statusFilter === 'all' || q.status === statusFilter),
      );
    } catch (err: any) {
      onShowToast?.(
        t('desk.toast.releaseErrorTitle'),
        err?.message || t('desk.toast.releaseErrorDesc'),
      );
      if (err?.status === 409) await loadData();
    } finally {
      setGridBusyTaskId(null);
    }
  };

  const handleApproveGridItem = async (item: DeskQueueItem) => {
    const taskId = item.taskId || item.assignmentId;
    if (item.isSelfSubmission) return;
    setGridBusyTaskId(`approve:${taskId}`);
    try {
      await assignmentService.approveStageTask(item.chapterId, taskId);
      onShowToast?.(
        t('desk.toast.gridApprovedTitle'),
        t('desk.gridItemSummary', {
          chapter: item.chapterNumber,
          stage: item.stageName,
          scope: item.scopeLabel,
        }),
      );
      await loadData();
    } catch (err: any) {
      onShowToast?.(
        t('desk.toast.gridApproveErrorTitle'),
        err?.message || t('desk.toast.gridApproveErrorDesc'),
      );
      if (err?.status === 409) await loadData();
    } finally {
      setGridBusyTaskId(null);
    }
  };

  const handleRejectGridItem = async (item: DeskQueueItem) => {
    const taskId = item.taskId || item.assignmentId;
    const trimmed = rejectComment.trim();
    if (item.isSelfSubmission || !trimmed) return;
    setGridBusyTaskId(`reject:${taskId}`);
    try {
      await assignmentService.requestStageTaskChanges(item.chapterId, taskId, trimmed);
      setRejectingGridTaskId(null);
      setRejectComment('');
      onShowToast?.(
        t('desk.toast.gridRejectedTitle'),
        t('desk.gridItemSummary', {
          chapter: item.chapterNumber,
          stage: item.stageName,
          scope: item.scopeLabel,
        }),
      );
      await loadData();
    } catch (err: any) {
      onShowToast?.(
        t('desk.toast.gridRejectErrorTitle'),
        err?.message || t('desk.toast.gridRejectErrorDesc'),
      );
      if (err?.status === 409) await loadData();
    } finally {
      setGridBusyTaskId(null);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = queueItems.length;
    const submittedCount = queueItems.filter((i) => i.status === 'Submitted').length;
    const underReviewCount = queueItems.filter((i) => i.status === 'UnderReview').length;
    const gate1Count = queueItems.filter((i) => i.gate === 'gate1').length;
    const gate2Count = queueItems.filter((i) => i.gate === 'gate2').length;
    const selfSubmissionCount = queueItems.filter((i) => i.isSelfSubmission).length;

    return {
      total,
      submittedCount,
      underReviewCount,
      gate1Count,
      gate2Count,
      selfSubmissionCount,
    };
  }, [queueItems]);

  // Filtered Items (Client-side search and optional chapter filter)
  const filteredItems = useMemo(() => {
    let result = queueItems;

    if (paramChapterId) {
      result = result.filter((i) => i.chapterId === paramChapterId);
    }

    if (scopeFilter === 'mine') {
      result = result.filter((i) =>
        Boolean(currentUserId && i.reviewerUserId && i.reviewerUserId === currentUserId),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.chapterTitle?.toLowerCase().includes(q) ||
          i.chapterNumber.toString().includes(q) ||
          i.assigneeName?.toLowerCase().includes(q) ||
          i.scopeLabel?.toLowerCase().includes(q) ||
          i.stageName?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [queueItems, paramChapterId, scopeFilter, currentUserId, searchQuery]);

  const hasClientFilter = scopeFilter !== 'all' || searchQuery.trim() !== '';
  const hasAnyFilter = activeGate !== 'all' || statusFilter !== 'all' || hasClientFilter;

  const handleClearFilters = () => {
    setActiveGate('all');
    setStatusFilter('all');
    setScopeFilter('all');
    setSearchQuery('');
  };

  // Date formatter
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return t('desk.justNow');
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const gateTabs: Array<{ id: EditorQualityGate; label: string; count: number }> = [
    { id: 'all', label: t('desk.gateAll', 'Tất cả cổng'), count: metrics.total },
    { id: 'gate1', label: t('desk.gate1', 'Gate 1: Storyboard'), count: metrics.gate1Count },
    { id: 'gate2', label: t('desk.gate2', 'Gate 2: Composite'), count: metrics.gate2Count },
  ];

  const visibleScriptsInReview = useMemo(
    () => scriptsInReview.filter((c) => !paramChapterId || c.id === paramChapterId),
    [scriptsInReview, paramChapterId],
  );

  return (
    <div className='flex-1 min-h-full bg-[#FAF9F5] text-stone-900 font-sans px-4 sm:px-6 lg:px-8 py-5'>
      <main className='max-w-[1440px] mx-auto w-full space-y-5'>
        {/* Single-Band Editorial Command Header */}
        <Card className='px-4 py-3.5 sm:px-5'>
          <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-3'>
            <div className='flex min-w-0 items-center gap-3.5'>
              <div
                className='grid size-10 shrink-0 place-items-center rounded-xl border border-head-line bg-head-wash text-accent-dark'
                aria-hidden='true'
              >
                <ShieldCheck className='size-5' />
              </div>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h1 className='font-serif text-xl sm:text-2xl font-bold leading-tight text-stone-900'>
                    {t('desk.title', 'Bàn thẩm định biên tập')}
                  </h1>
                  <CountChip>{seriesInfo?.title || t('desk.defaultSeriesTitle')}</CountChip>
                </div>
                <p className='mt-0.5 text-xs text-stone-500'>{t('desk.subtitle')}</p>
              </div>
            </div>

            <div className='flex flex-1 flex-wrap items-center justify-between gap-3 sm:justify-end xl:flex-initial xl:shrink-0'>
              {/* Clickable Status KPI Tray */}
              <div className='flex flex-wrap items-stretch divide-y divide-stone-200/80 rounded-xl border border-head-line bg-head-wash/65 sm:divide-x sm:divide-y-0'>
                <button
                  type='button'
                  aria-pressed={statusFilter === 'Submitted'}
                  data-testid='editor-kpi-submitted'
                  onClick={() =>
                    setStatusFilter((prev) => (prev === 'Submitted' ? 'all' : 'Submitted'))
                  }
                  className={`focus-ring flex items-center gap-2 px-3 py-2 text-xs transition-studio cursor-pointer first:rounded-t-xl sm:first:rounded-l-xl sm:first:rounded-tr-none ${
                    statusFilter === 'Submitted'
                      ? 'bg-amber-50/90 text-amber-900'
                      : 'text-stone-600 hover:bg-white/70'
                  }`}
                >
                  <span className='size-2 rounded-full bg-amber-500 shrink-0' aria-hidden='true' />
                  <span className='font-medium whitespace-nowrap'>{t('desk.kpiPending')}</span>
                  <span className='font-bold text-stone-900 tabular-nums'>
                    {metrics.submittedCount}
                  </span>
                </button>

                <button
                  type='button'
                  aria-pressed={statusFilter === 'UnderReview'}
                  data-testid='editor-kpi-under-review'
                  onClick={() =>
                    setStatusFilter((prev) => (prev === 'UnderReview' ? 'all' : 'UnderReview'))
                  }
                  className={`focus-ring flex items-center gap-2 px-3 py-2 text-xs transition-studio cursor-pointer ${
                    statusFilter === 'UnderReview'
                      ? 'bg-blue-50/90 text-blue-900'
                      : 'text-stone-600 hover:bg-white/70'
                  }`}
                >
                  <span className='size-2 rounded-full bg-blue-500 shrink-0' aria-hidden='true' />
                  <span className='font-medium whitespace-nowrap'>{t('desk.kpiUnderReview')}</span>
                  <span className='font-bold text-stone-900 tabular-nums'>
                    {metrics.underReviewCount}
                  </span>
                </button>

                {metrics.selfSubmissionCount > 0 && (
                  <div className='flex items-center gap-1.5 bg-rose-50/80 px-3 py-2 text-xs text-rose-800'>
                    <ShieldAlert className='size-3.5 shrink-0 text-rose-600' aria-hidden='true' />
                    <span className='font-medium whitespace-nowrap'>{t('desk.kpiFourEyes')}</span>
                    <span className='font-bold tabular-nums'>{metrics.selfSubmissionCount}</span>
                  </div>
                )}

                <div className='flex items-center px-3 py-2 text-xs font-medium text-stone-600 tabular-nums whitespace-nowrap'>
                  {t('desk.totalSubmissions', { count: metrics.total })}
                </div>
              </div>

              {/* Header Quick Actions */}
              <div className='flex items-center gap-2 shrink-0'>
                <Button
                  variant={pendingBibleConcepts > 0 ? 'warning' : 'secondary'}
                  size='sm'
                  leadingIcon={<Palette aria-hidden='true' />}
                  onClick={() =>
                    workspaceId &&
                    seriesId &&
                    navigate(buildSeriesPath(workspaceId, seriesId, 'bible?tab=review'))
                  }
                  className='whitespace-nowrap cursor-pointer'
                >
                  {t('desk.bibleReview', { count: pendingBibleConcepts })}
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  disabled={loading}
                  leadingIcon={
                    <RotateCcw
                      className={loading ? 'animate-spin' : undefined}
                      aria-hidden='true'
                    />
                  }
                  onClick={loadData}
                  title={t('desk.refreshQueueTitle')}
                  className='whitespace-nowrap cursor-pointer'
                >
                  {t('desk.refresh')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Zero-Scrollbar Underline Gate Tabs + Inline Controls (matches SeriesFilterBar) */}
        <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5 border-b border-stone-200/80'>
          <div className='-mb-px flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium'>
            {gateTabs.map((tab) => {
              const isSelected = activeGate === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  aria-pressed={isSelected}
                  onClick={() => setActiveGate(tab.id)}
                  className={`focus-ring inline-flex items-center gap-1.5 border-b-2 py-2.5 transition-studio cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'border-accent font-semibold text-stone-900'
                      : `border-transparent hover:border-stone-300 hover:text-stone-900 ${
                          tab.count === 0 ? 'text-stone-500' : 'text-stone-700'
                        }`
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${
                      isSelected ? 'bg-accent-soft text-accent-dark' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className='flex flex-wrap items-center gap-2 pb-2 min-w-0'>
            {/* Scope Filter: Tất cả / Của tôi (R2) */}
            <div
              role='group'
              aria-label={t('desk.scopeFilterAria', 'Lọc theo người được phân')}
              className='inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-stone-200 bg-white p-0.5 shadow-2xs'
            >
              <button
                type='button'
                data-testid='editor-scope-all'
                aria-pressed={scopeFilter === 'all'}
                onClick={() => setScopeFilter('all')}
                className={`focus-ring inline-flex min-h-8 items-center rounded-md px-2.5 text-xs transition-studio whitespace-nowrap cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-head-wash font-semibold text-stone-900'
                    : 'font-medium text-stone-500 hover:text-stone-900'
                }`}
              >
                {t('desk.scopeAll', 'Tất cả')}
              </button>
              <button
                type='button'
                data-testid='editor-scope-mine'
                aria-pressed={scopeFilter === 'mine'}
                onClick={() => setScopeFilter('mine')}
                className={`focus-ring inline-flex min-h-8 items-center rounded-md px-2.5 text-xs transition-studio whitespace-nowrap cursor-pointer ${
                  scopeFilter === 'mine'
                    ? 'bg-head-wash font-semibold text-stone-900'
                    : 'font-medium text-stone-500 hover:text-stone-900'
                }`}
              >
                {t('desk.scopeMine', 'Của tôi')}
              </button>
            </div>

            {/* Status Select */}
            <div className='relative shrink-0'>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label={t('desk.filterStatusAria')}
                className='focus-ring min-h-9 appearance-none cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs transition-studio hover:border-head-line'
              >
                <option value='all'>{t('desk.filterStatusAll')}</option>
                <option value='Submitted'>{t('desk.filterStatusSubmitted')}</option>
                <option value='UnderReview'>{t('desk.filterStatusUnderReview')}</option>
              </select>
              <ChevronDown
                className='pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400'
                aria-hidden='true'
              />
            </div>

            {/* Search Input */}
            <div className='relative w-full sm:w-56'>
              <Search
                className='pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-stone-400'
                aria-hidden='true'
              />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('desk.searchPlaceholder')}
                className='focus-ring w-full min-h-9 rounded-lg border border-stone-200 bg-white pl-9 pr-8 py-1.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 shadow-2xs transition-studio focus:border-accent'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => setSearchQuery('')}
                  aria-label={t('desk.clearFilters')}
                  className='focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700 cursor-pointer'
                >
                  <X className='size-3.5' aria-hidden='true' />
                </button>
              )}
            </div>

            {hasAnyFilter && (
              <button
                type='button'
                onClick={handleClearFilters}
                className='focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-head-line bg-accent-soft px-3 text-xs font-semibold text-accent-dark hover:bg-orange-100 transition-studio cursor-pointer whitespace-nowrap'
              >
                <X className='size-3.5' aria-hidden='true' />
                <span>{t('desk.clearFilters')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert tone='danger' className='text-xs'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='size-4 text-rose-600 shrink-0' aria-hidden='true' />
              <span>{error}</span>
            </div>
            <Button
              variant='danger'
              size='sm'
              onClick={loadData}
              className='shrink-0 cursor-pointer'
            >
              {t('desk.retry')}
            </Button>
          </Alert>
        )}

        {/* Loading State (Geometry-matched Skeleton Grid) */}
        {loading && (
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-xs font-medium text-stone-500'>
              <RotateCcw className='size-3.5 text-accent-dark animate-spin' aria-hidden='true' />
              <span>{t('desk.loadingQueue')}</span>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {[0, 1, 2].map((idx) => (
                <Card key={idx} className='p-4 space-y-3'>
                  <Skeleton height={18} width='55%' />
                  <Skeleton height={22} width='80%' />
                  <Skeleton height={14} width='65%' />
                  <div className='pt-2 flex justify-end gap-2'>
                    <Skeleton height={32} width={88} />
                    <Skeleton height={32} width={76} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* D12: Kịch bản chờ duyệt — Editor mở để góp ý theo dòng */}
        {!loading && !error && visibleScriptsInReview.length > 0 && (
          <Card as='section' tone='warning' data-testid='scripts-in-review'>
            <CardHeader
              icon={<FileText />}
              title={t('scriptReview.desk.scriptsInReview', {
                count: visibleScriptsInReview.length,
              })}
              titleAs='h2'
            />
            <CardBody className='p-4'>
              <ul className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                {visibleScriptsInReview.map((c) => (
                  <li
                    key={c.id}
                    className='flex items-center justify-between gap-3 rounded-xl border border-amber-200/90 bg-amber-50/50 px-4 py-3'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-stone-900'>
                        {t('scriptReview.header.title', { number: c.chapterNumber })}
                        {c.title ? `: ${c.title}` : ''}
                      </p>
                      <p className='text-xs text-stone-500 tabular-nums'>
                        {formatDate(c.scriptSubmittedAt)}
                      </p>
                    </div>
                    <Button
                      variant='primary'
                      size='sm'
                      onClick={() =>
                        workspaceId &&
                        seriesId &&
                        navigate(buildScriptReviewUrl(workspaceId, seriesId, c.id))
                      }
                      className='shrink-0 cursor-pointer whitespace-nowrap'
                    >
                      {t('scriptReview.desk.openComments')}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        {/* Empty State (distinguishes filtered-empty vs truly clean queue + actionable next links) */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className='rounded-2xl border-2 border-dashed border-head-line bg-white/80 px-6 py-12 text-center space-y-4'>
            {hasClientFilter && queueItems.length > 0 ? (
              <>
                <div className='mx-auto grid size-12 place-items-center rounded-2xl border border-head-line bg-head-wash text-accent-dark'>
                  <Search className='size-5' aria-hidden='true' />
                </div>
                <div className='space-y-1.5'>
                  <h2 className='font-serif text-lg font-bold text-stone-900'>
                    {t('desk.emptyFilteredTitle')}
                  </h2>
                  <p className='mx-auto max-w-md text-xs sm:text-sm text-stone-600 leading-relaxed'>
                    {t('desk.emptyFilteredDesc')}
                  </p>
                </div>
                <div>
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={handleClearFilters}
                    className='cursor-pointer'
                  >
                    {t('desk.clearFilters')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className='mx-auto grid size-12 place-items-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-700'>
                  <CheckCircle2 className='size-5' aria-hidden='true' />
                </div>
                <div className='space-y-1.5'>
                  <h2 className='font-serif text-lg font-bold text-stone-900'>
                    {t('desk.emptyTitle')}
                  </h2>
                  <p className='mx-auto max-w-md text-xs sm:text-sm text-stone-600 leading-relaxed'>
                    {t('desk.emptyDesc')}
                  </p>
                </div>
                {workspaceId && seriesId && (
                  <div className='flex flex-wrap items-center justify-center gap-2 pt-1'>
                    <Button
                      variant='secondary'
                      size='sm'
                      leadingIcon={<BookOpen aria-hidden='true' />}
                      onClick={() => navigate(buildSeriesReaderUrl(workspaceId, seriesId))}
                      className='cursor-pointer'
                    >
                      {t('desk.quickReadSeries')}
                    </Button>
                    <Button
                      variant='secondary'
                      size='sm'
                      leadingIcon={<FileText aria-hidden='true' />}
                      onClick={() => navigate(buildScriptEditorUrl(workspaceId, seriesId))}
                      className='cursor-pointer'
                    >
                      {t('desk.quickOpenScript')}
                    </Button>
                    <Button
                      variant='secondary'
                      size='sm'
                      leadingIcon={<Palette aria-hidden='true' />}
                      onClick={() =>
                        navigate(buildSeriesPath(workspaceId, seriesId, 'bible?tab=review'))
                      }
                      className='cursor-pointer'
                    >
                      {t('desk.quickOpenBible')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Queue Items Grid (Canonical PanelForge Cards) */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch'>
            {filteredItems.map((item) => {
              const isGate1 = item.gate === 'gate1';
              const isUnderReview = item.status === 'UnderReview';
              const isOpening = openingReviewId === item.assignmentId;
              const isLockedByOther = Boolean(
                item.isGridItem &&
                isUnderReview &&
                item.reviewerUserId &&
                item.reviewerUserId !== currentUserId,
              );
              const isLockedBySelf = Boolean(
                item.isGridItem &&
                isUnderReview &&
                currentUserId &&
                item.reviewerUserId === currentUserId,
              );
              const isSuggestedForSelf = Boolean(
                item.isGridItem &&
                item.status === 'Submitted' &&
                currentUserId &&
                item.reviewerUserId === currentUserId,
              );

              return (
                <Card
                  key={item.assignmentId}
                  as='article'
                  className={`flex h-full flex-col transition-studio hover:shadow-md ${
                    item.isSelfSubmission
                      ? 'border-rose-300 bg-rose-50/15'
                      : 'hover:border-orange-300'
                  }`}
                >
                  {/* Warm Compact Top Status Band */}
                  <div className='flex items-center justify-between gap-2 border-b border-head-line bg-head-wash/75 px-4 py-2.5 text-xs'>
                    <span className='truncate font-semibold text-kraft-ink'>
                      {item.stageSlug === 'script'
                        ? t('desk.gate1Script', 'Gate 1: Kịch bản')
                        : isGate1
                          ? t('desk.gate1', 'Gate 1: Storyboard')
                          : t('desk.gate2', 'Gate 2: Composite')}
                    </span>

                    <Badge tone={isUnderReview ? 'info' : 'warning'}>
                      <span
                        className={`size-1.5 rounded-full ${
                          isUnderReview ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                        aria-hidden='true'
                      />
                      <span>
                        {isUnderReview
                          ? t('desk.statusUnderReview', 'Đang thẩm định')
                          : t('desk.statusSubmitted', 'Chờ mở duyệt')}
                      </span>
                    </Badge>
                  </div>

                  {/* Card Body */}
                  <div className='flex flex-1 flex-col gap-3 p-4'>
                    <div className='space-y-1.5'>
                      <div className='flex flex-wrap items-start justify-between gap-2'>
                        <h3 className='font-serif text-base font-bold leading-snug text-stone-900'>
                          {t('scriptReview.header.title', { number: item.chapterNumber })} ·{' '}
                          <span className='text-accent-dark'>{item.scopeLabel}</span>
                        </h3>
                        <CountChip className='shrink-0'>{item.stageName}</CountChip>
                      </div>

                      <p className='truncate text-xs text-stone-500'>
                        {item.chapterTitle || t('desk.untitledChapter')}
                      </p>

                      {(isSuggestedForSelf || item.isInputOutdated) && (
                        <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
                          {isSuggestedForSelf && (
                            <Badge
                              tone='brand'
                              icon={<User aria-hidden='true' />}
                              data-testid={`editor-assigned-to-you-${item.assignmentId}`}
                            >
                              {t('desk.assignedToYouChip', 'Được phân cho bạn')}
                            </Badge>
                          )}
                          {item.isInputOutdated && (
                            <Badge
                              tone='warning'
                              icon={<AlertCircle aria-hidden='true' />}
                              data-testid={`editor-input-outdated-${item.assignmentId}`}
                            >
                              {t('chapterReview.inputOutdatedBadge')}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Artist & Submission Metadata */}
                    <div className='space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-600'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex min-w-0 items-center gap-2 font-medium text-stone-900'>
                          <Avatar
                            src={item.assigneeAvatarUrl || undefined}
                            name={item.assigneeName || t('desk.unknownArtist')}
                            size='sm'
                          />
                          <span className='truncate'>
                            {item.assigneeName || t('desk.unknownArtist')}
                          </span>
                        </div>
                        <span className='shrink-0 font-mono text-xs text-stone-500 tabular-nums'>
                          {t('desk.attemptLabel', { attempt: item.submissionAttempt })}
                        </span>
                      </div>

                      <div className='flex items-center justify-between gap-2 text-stone-500 tabular-nums'>
                        <span>{t('desk.submittedAt', { date: formatDate(item.submittedAt) })}</span>
                        {item.priority === 'Urgent' || item.priority === 4 ? (
                          <Badge tone='danger'>{t('desk.priorityUrgent')}</Badge>
                        ) : null}
                      </div>

                      {item.openChangeRequestsCount > 0 && (
                        <div className='flex items-center gap-1.5 pt-0.5 font-medium text-amber-800'>
                          <span
                            className='size-1.5 rounded-full bg-amber-500 shrink-0'
                            aria-hidden='true'
                          />
                          <span>
                            {t('desk.openChangeRequests', { count: item.openChangeRequestsCount })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contextual Lock / BR-26 Notices */}
                    {item.isSelfSubmission && (
                      <div className='flex items-start gap-2 rounded-lg border border-rose-200/80 bg-rose-50 px-3 py-2 text-xs text-rose-800 leading-relaxed'>
                        <ShieldAlert
                          className='mt-0.5 size-3.5 shrink-0 text-rose-600'
                          aria-hidden='true'
                        />
                        <div>
                          <span className='font-bold'>{t('desk.toast.fourEyesTitle')}:</span>{' '}
                          {t('desk.selfSubmissionNotice')}
                        </div>
                      </div>
                    )}

                    {isLockedByOther && (
                      <div
                        data-testid={`editor-locked-by-other-${item.assignmentId}`}
                        className='flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900'
                      >
                        <Lock className='size-3.5 shrink-0 text-amber-600' aria-hidden='true' />
                        <span>
                          {t('chapterReview.underReviewBy', {
                            name: item.reviewerName || item.reviewerUserId || '',
                          })}
                        </span>
                      </div>
                    )}

                    {isLockedBySelf && (
                      <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900'>
                        <Eye className='size-3.5 shrink-0 text-blue-600' aria-hidden='true' />
                        <span>{t('chapterReview.underReviewByYou')}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className='mt-auto border-t border-stone-100 bg-[#FAF9F5]/60 px-4 py-3 space-y-2.5'>
                    <div className='flex flex-wrap items-center justify-end gap-1.5'>
                      {item.isSelfSubmission ? (
                        <Button
                          variant='secondary'
                          size='sm'
                          disabled
                          leadingIcon={<Lock aria-hidden='true' />}
                          title={t('desk.lockedSelfTitle')}
                        >
                          {t('desk.lockedSelfAction')}
                        </Button>
                      ) : item.isGridItem ? (
                        <>
                          {isProducer && isLockedByOther && (
                            <Button
                              variant='warning'
                              size='sm'
                              data-testid={`editor-force-release-${item.assignmentId}`}
                              disabled={gridBusyTaskId !== null}
                              leadingIcon={<RotateCcw aria-hidden='true' />}
                              onClick={() => void handleReleaseGridReview(item)}
                              className='cursor-pointer'
                            >
                              {t('chapterReview.forceReleaseReviewBtn', 'Gỡ khoá duyệt')}
                            </Button>
                          )}
                          {isLockedBySelf && (
                            <Button
                              variant='secondary'
                              size='sm'
                              data-testid={`editor-release-own-${item.assignmentId}`}
                              disabled={gridBusyTaskId !== null}
                              leadingIcon={<RotateCcw aria-hidden='true' />}
                              onClick={() => void handleReleaseGridReview(item)}
                              className='cursor-pointer'
                            >
                              {t('chapterReview.releaseReviewBtn', 'Nhả khoá duyệt')}
                            </Button>
                          )}
                          <Button
                            variant='secondary'
                            size='sm'
                            onClick={() =>
                              navigate(
                                `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${encodeURIComponent(item.chapterId)}&board=grid-v3`,
                              )
                            }
                            className='cursor-pointer'
                          >
                            {t('desk.openGridV3')}
                          </Button>
                          <Button
                            variant='secondary'
                            size='sm'
                            data-testid={`editor-open-grid-review-${item.assignmentId}`}
                            disabled={isLockedByOther || gridBusyTaskId !== null}
                            leadingIcon={<Eye className='text-accent-dark' aria-hidden='true' />}
                            onClick={() => void handleOpenGridReview(item)}
                            className='cursor-pointer'
                          >
                            {gridBusyTaskId === `open:${item.assignmentId}`
                              ? t('desk.opening')
                              : t('chapterReview.openDetailReview')}
                          </Button>
                          <Button
                            variant='danger'
                            size='sm'
                            data-testid={`editor-reject-toggle-${item.assignmentId}`}
                            disabled={isLockedByOther || gridBusyTaskId !== null}
                            leadingIcon={<RotateCcw aria-hidden='true' />}
                            onClick={() => {
                              setRejectingGridTaskId((prev) =>
                                prev === item.assignmentId ? null : item.assignmentId,
                              );
                              setRejectComment('');
                            }}
                            className='cursor-pointer'
                          >
                            {t('chapterReview.gate2GridRequestChanges')}
                          </Button>
                          <Button
                            variant='success'
                            size='sm'
                            data-testid={`editor-approve-grid-${item.assignmentId}`}
                            disabled={
                              isLockedByOther ||
                              Boolean(item.isInputOutdated) ||
                              gridBusyTaskId !== null
                            }
                            leadingIcon={<CheckCircle2 aria-hidden='true' />}
                            onClick={() => void handleApproveGridItem(item)}
                            className='cursor-pointer'
                          >
                            {gridBusyTaskId === `approve:${item.assignmentId}`
                              ? t('desk.approving')
                              : t('desk.approveShort')}
                          </Button>
                        </>
                      ) : isUnderReview ? (
                        <Button
                          variant='primary'
                          size='sm'
                          leadingIcon={<Eye aria-hidden='true' />}
                          onClick={() => handleContinueReview(item)}
                          className='cursor-pointer'
                        >
                          {t('desk.continueReviewAction')}
                        </Button>
                      ) : (
                        <Button
                          variant='primary'
                          size='sm'
                          disabled={isOpening}
                          loading={isOpening}
                          leadingIcon={<Eye aria-hidden='true' />}
                          onClick={() => handleOpenReview(item)}
                          className='cursor-pointer'
                        >
                          {isOpening ? t('desk.opening') : t('desk.openReviewAction')}
                        </Button>
                      )}
                    </div>

                    {item.isGridItem &&
                      !item.isSelfSubmission &&
                      rejectingGridTaskId === item.assignmentId && (
                        <div className='rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 space-y-2'>
                          <textarea
                            rows={2}
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder={t('chapterReview.gate2GridCommentPlaceholder')}
                            aria-label={t('desk.rejectCommentAria')}
                            className='focus-ring w-full rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs text-stone-900 placeholder:text-stone-400'
                          />
                          <div className='flex items-center justify-end gap-1.5'>
                            <Button
                              variant='secondary'
                              size='sm'
                              onClick={() => {
                                setRejectingGridTaskId(null);
                                setRejectComment('');
                              }}
                              className='cursor-pointer'
                            >
                              {t('desk.cancel')}
                            </Button>
                            <button
                              type='button'
                              data-testid={`editor-confirm-reject-${item.assignmentId}`}
                              disabled={gridBusyTaskId !== null || !rejectComment.trim()}
                              onClick={() => void handleRejectGridItem(item)}
                              className='focus-ring inline-flex min-h-8 items-center rounded-full bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              {gridBusyTaskId === `reject:${item.assignmentId}`
                                ? t('desk.sending')
                                : t('chapterReview.gate2GridConfirmReturn')}
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
