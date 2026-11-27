import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { TaskGridBoard } from '@/shared/features/pipeline-board/TaskGridBoard';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { SystemRole, WorkspaceRole, normalizeWorkspaceRole } from '@/types';
import {
  BookOpen,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  Lock,
  ChevronRight,
  ArrowLeft,
  Rocket,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flag,
  FileText,
  Eye,
  UploadCloud,
  Check,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { chapterService, ChapterDto, ChapterLockGateDto } from '@/services/chapter.service';
import { workspaceService } from '@/services/workspace.service';
import {
  seriesService,
  SeriesDetailDto,
  SeriesMemberDto,
  SeriesProgressDto,
} from '@/services/series.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { StartProductionModal } from '@/shared/modals/StartProductionModal';
import { RefreezeScriptModal } from '@/shared/modals/RefreezeScriptModal';
import { Card, CardHeader } from '@/shared/ui';
import { SeriesMembersModal } from '@/roles/producer/modals/SeriesMembersModal';
import { formatDate } from '@/lib/format';
import { ProducerSharedHeader } from './ProducerSharedHeader';
import {
  notifyChapterHubChanged,
  useChapterReadiness,
} from './useChapterProductionHub';
import {
  buildChapterManagementUrl,
  buildChapterReaderUrl,
  buildScriptReviewUrl,
} from '@/app/routePaths';
import {
  countGateWarnings,
  daysUntil,
  getBibleMetrics,
  getChapterMetrics,
  getCrewMetrics,
  getMemberLoad,
  isApprovedStatus,
  isPublishedStatus,
} from './workspaceMetrics';

export interface WorkspaceViewProps {
  currentUserRole?: WorkspaceRole | null;
  systemRole?: SystemRole;
  userRoles?: string[];
  currentUserId?: string;
  onShowToast: (title: string, desc: string) => void;
  isReaderMode?: boolean;
}

const CHAPTER_STATUS_CLS: Record<string, string> = {
  PreProduction: 'text-stone-800 bg-stone-100 border-stone-200',
  InProduction: 'text-amber-800 bg-amber-50 border-amber-200',
  ChapterApproved: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  Approved: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  HandedOffAndPublished: 'text-stone-800 bg-stone-100 border-stone-200',
  Published: 'text-emerald-800 bg-emerald-50 border-emerald-200',
};

type SubTabKey = 'progress' | 'chapters' | 'crew';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  currentUserRole,
  systemRole,
  userRoles = [],
  currentUserId,
  onShowToast,
  isReaderMode = false,
}) => {
  const { t } = useTranslation('pipeline');
  const { t: tf } = useTranslation('features');
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const chapterIdFromUrl = searchParams.get('chapterId');
  const tabFromUrl = searchParams.get('tab') as SubTabKey | null;

  const [activeSubtab, setActiveSubtab] = useState<SubTabKey>(
    tabFromUrl === 'chapters' || tabFromUrl === 'crew' ? tabFromUrl : 'progress',
  );

  useEffect(() => {
    if (tabFromUrl === 'chapters' && workspaceId && seriesId) {
      navigate(buildChapterManagementUrl(workspaceId, seriesId, chapterIdFromUrl ?? undefined), {
        replace: true,
      });
      return;
    }
    const nextTab: SubTabKey =
      tabFromUrl === 'chapters' || tabFromUrl === 'crew' ? tabFromUrl : 'progress';
    setActiveSubtab((current) => (current === nextTab ? current : nextTab));
  }, [chapterIdFromUrl, navigate, seriesId, tabFromUrl, workspaceId]);

  const normalizedWsRole = useMemo(
    () => normalizeWorkspaceRole(currentUserRole),
    [currentUserRole],
  );

  const effectiveRoles = useMemo(() => {
    if (normalizedWsRole) {
      return [normalizedWsRole, ...(systemRole ? [systemRole] : [])];
    }
    return userRoles.length > 0 ? userRoles : systemRole ? [systemRole] : [];
  }, [normalizedWsRole, userRoles, systemRole]);

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Series and Workspace metadata
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [seriesTitle, setSeriesTitle] = useState<string>('');
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);
  const [seriesMembers, setSeriesMembers] = useState<SeriesMemberDto[]>([]);
  const [seriesProgress, setSeriesProgress] = useState<SeriesProgressDto | null>(null);
  const [lockGate, setLockGate] = useState<ChapterLockGateDto | null>(null);
  const [startProductionOpen, setStartProductionOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [bibleEntries, setBibleEntries] = useState<BibleEntryDto[]>([]);
  const [chapterFilter, setChapterFilter] = useState<'all' | 'inProd' | 'published'>('all');
  const [crewRoleFilter, setCrewRoleFilter] = useState<'all' | 'artist' | 'tech'>('all');

  const isReaderOnly = effectiveRoles.length === 1 && effectiveRoles[0] === 'READER';
  const isProducer = useMemo(() => {
    if (normalizedWsRole) return normalizedWsRole === 'PRODUCER';
    return userRoles.some((r) => r.toUpperCase() === 'PRODUCER');
  }, [normalizedWsRole, userRoles]);
  const isEditor = useMemo(() => {
    if (normalizedWsRole) return normalizedWsRole === 'EDITOR';
    return userRoles.some((r) => r.toUpperCase() === 'EDITOR');
  }, [normalizedWsRole, userRoles]);

  // Load workspace and series metadata
  useEffect(() => {
    if (workspaceId) {
      workspaceService
        .getWorkspaceById(workspaceId)
        .then((ws) => {
          if (ws?.name) setWorkspaceName(ws.name);
        })
        .catch(() => {});
    }
    if (seriesId) {
      seriesService
        .getSeriesById(seriesId)
        .then((s) => {
          if (s) {
            setSeriesDetail(s);
            if (s.title) setSeriesTitle(s.title);
          }
        })
        .catch(() => {});

      bibleService
        .getSeriesBible(seriesId)
        .then((bible) => setBibleEntries(bible?.entries ?? []))
        .catch(() => setBibleEntries([]));
    }
  }, [workspaceId, seriesId]);

  const loadMembers = useCallback(() => {
    if (!seriesId) return;
    seriesService
      .getSeriesMembers(workspaceId || '', seriesId)
      .then((members) => {
        if (Array.isArray(members)) setSeriesMembers(members);
      })
      .catch(() => {});
  }, [workspaceId, seriesId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Tiến độ series (UC-16) nạp lại khi bấm Làm mới
  useEffect(() => {
    if (!seriesId) return;
    seriesService
      .getSeriesProgress(seriesId)
      .then((prog) => {
        if (prog) setSeriesProgress(prog);
      })
      .catch(() => {});
  }, [seriesId, refreshKey]);

  // Load chapters list
  const loadChapters = useCallback(async () => {
    if (!seriesId) return;
    setLoadingChapters(true);
    try {
      const res = await chapterService.getChaptersBySeries(seriesId, 1, 100);
      const items = res.items || [];
      const sorted = [...items].sort((a, b) => a.chapterNumber - b.chapterNumber);
      setChapters(sorted);

      if (sorted.length > 0) {
        const matched = sorted.find((c) => c.id === chapterIdFromUrl);
        const activeId = matched ? matched.id : sorted[0].id;
        setCurrentChapterId(activeId);
        if (!matched) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('chapterId', activeId);
            return next;
          });
        }
      }
    } catch (err: any) {
      console.error('Không thể nạp danh sách chương cho WorkspaceView:', err);
      onShowToast(
        tf('productionWorkspace.workspace.loadChaptersErrorTitle'),
        tf('productionWorkspace.workspace.loadChaptersErrorDesc'),
      );
    } finally {
      setLoadingChapters(false);
    }
  }, [seriesId, chapterIdFromUrl, setSearchParams, onShowToast, tf]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  // Load lock gate when active chapter changes
  useEffect(() => {
    if (currentChapterId) {
      chapterService
        .getChapterLockGate(currentChapterId)
        .then((gate) => setLockGate(gate))
        .catch(() => setLockGate(null));
    }
  }, [currentChapterId]);

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCurrentChapterId(newId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('chapterId', newId);
      return next;
    });
  };

  const handleSwitchSubtab = (newTab: SubTabKey) => {
    setActiveSubtab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    });
  };

  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.id === currentChapterId);
  }, [chapters, currentChapterId]);

  const currentChapterFormattedTitle = useMemo(() => {
    if (!currentChapter) return tf('productionWorkspace.workspace.loadingChapter');
    return formatChapterLabel(
      currentChapter.chapterNumber,
      currentChapter.title || tf('productionWorkspace.workspace.draftFallback'),
    );
  }, [currentChapter, tf]);

  const { readiness: chapterReadiness, refetch: refetchReadiness } =
    useChapterReadiness(currentChapterId || null);

  const canRefreezeScript = useMemo(() => {
    if (!currentChapter) return false;
    return currentChapter.status === 'InProduction' && currentChapter.scriptStatus === 'InReview';
  }, [currentChapter]);

  // Readers access barrier
  if (isReaderMode || isReaderOnly) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center p-8 text-center min-h-[60vh]'>
        <div className='w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4'>
          <ShieldAlert className='w-8 h-8' />
        </div>
        <h2 className='text-xl font-serif font-semibold text-stone-900 mb-2'>
          {tf('productionWorkspace.workspace.restrictedTitle')}
        </h2>
        <p className='text-sm text-stone-500 max-w-md mb-4'>
          {tf('productionWorkspace.workspace.restrictedDesc')}
        </p>
        <button
          type='button'
          onClick={() => navigate('/catalog')}
          className='px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs'
        >
          {tf('productionWorkspace.workspace.goToCatalog')}
        </button>
      </div>
    );
  }

  const statusKey = currentChapter ? String(currentChapter.status) : '';
  const statusMeta = currentChapter
    ? {
        label: t(`workbench.chapterStatus.${statusKey}`, statusKey),
        cls: CHAPTER_STATUS_CLS[statusKey] ?? 'text-stone-800 bg-stone-100 border-stone-200',
      }
    : null;

  // Filtered chapters for chapter overview tab
  const isDoneChapter = (c: ChapterDto) =>
    isPublishedStatus(c.status) || isApprovedStatus(c.status);
  const filteredChapters = chapters.filter((c) => {
    if (chapterFilter === 'inProd') return c.status === 'InProduction';
    if (chapterFilter === 'published') return isDoneChapter(c);
    return true;
  });
  const publishedCount = chapters.filter((c) => isPublishedStatus(c.status)).length;
  const approvedCount = chapters.filter((c) => isApprovedStatus(c.status)).length;
  const inProdCount = chapters.filter((c) => c.status === 'InProduction').length;

  const currentMetrics = getChapterMetrics(currentChapter, seriesProgress);
  const gateWarnings = countGateWarnings(lockGate);
  const bibleMetrics = getBibleMetrics(bibleEntries);
  const workload = seriesProgress?.workload ?? [];
  const workloadByUser = new Map(workload.map((w) => [w.userId, w]));
  const crewMetrics = getCrewMetrics(
    seriesMembers.map((m) => m.userId),
    workload,
  );

  const formatShortDate = (iso?: string | null) =>
    iso ? formatDate(iso, { day: '2-digit', month: '2-digit' }) : '';
  const deadlineHint = (iso?: string | null) => {
    const days = daysUntil(iso);
    if (days === null) return t('workbench.chaptersOverview.noDeadline');
    if (days === 0) return t('workbench.chaptersOverview.dueToday');
    return days > 0
      ? t('workbench.chaptersOverview.daysLeft', { days })
      : t('workbench.chaptersOverview.overdueDays', { days: -days });
  };
  const scriptStatusLabel = (c?: ChapterDto) => {
    const s = c?.scriptStatus ?? (c?.isScriptFrozen ? 'Frozen' : 'Draft');
    return t(`workbench.readiness.scriptStatus${s}`);
  };

  // Filtered crew members
  const filteredMembers = seriesMembers.filter((m) => {
    const role = String(m.seriesRole || '').toLowerCase();
    if (crewRoleFilter === 'artist')
      return role.includes('artist') || role.includes('pencil') || role.includes('ink');
    if (crewRoleFilter === 'tech') return role.includes('letter') || role.includes('editor');
    return true;
  });

  const totalPanels =
    seriesProgress?.chapters?.reduce((sum, c) => sum + (c.panelCount || 0), 0) || 0;
  const approvedPanels =
    seriesProgress?.chapters?.reduce(
      (sum, c) => sum + (c.stages?.[c.stages.length - 1]?.approved || 0),
      0,
    ) || 0;
  const completionPercent = totalPanels > 0 ? Math.round((approvedPanels / totalPanels) * 100) : 0;

  return (
    <div className='w-full min-h-screen min-w-0 bg-[#FAF9F5] font-sans text-stone-900'>
      {/* Hidden Accessible Heading for Section Landmark */}
      <h1 className='sr-only'>{tf('productionWorkspace.workspace.workflowTitle')}</h1>

      {/* SUB-HEADER PIPELINE & CHAPTER BAR */}
      <ProducerSharedHeader
        workspaceId={workspaceId}
        seriesId={seriesId}
        currentChapterId={currentChapterId}
        chapters={chapters}
        seriesTitle={seriesTitle}
        seriesFormat={seriesDetail?.format}
        currentChapter={currentChapter}
        readiness={chapterReadiness}
        onChapterChange={(nextId) => {
          setCurrentChapterId(nextId);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('chapterId', nextId);
            return next;
          });
        }}
        loadingChapters={loadingChapters}
        actionCta={
          <div className='flex items-center gap-2'>
            {/* Sub-tab switch inside Production Workspace: Board vs Team */}
            <div className='inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs'>
              <button
                type='button'
                onClick={() => {
                  setActiveSubtab('progress');
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('tab', 'progress');
                    return next;
                  });
                }}
                data-testid='production-subtab-board'
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeSubtab === 'progress'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Bảng sản xuất
              </button>
              <button
                type='button'
                onClick={() => {
                  setActiveSubtab('crew');
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('tab', 'crew');
                    return next;
                  });
                }}
                data-testid='production-subtab-crew'
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeSubtab === 'crew'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ê-kíp & Tải việc
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type='button'
              onClick={() => {
                loadChapters();
                refetchReadiness();
                setRefreshKey((k) => k + 1);
                notifyChapterHubChanged({ seriesId, chapterId: currentChapterId });
              }}
              aria-label={tf('productionWorkspace.workspace.refreshAria')}
              title={tf('productionWorkspace.workspace.refreshAria')}
              className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-2xs transition-colors cursor-pointer'
            >
              <RefreshCw className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
            </button>

            {/* Contextual Action: Refreeze if unfrozen in production, else Overview if still PreProduction */}
            {canRefreezeScript && isProducer ? (
              <button
                type='button'
                onClick={() => setStartProductionOpen(true)}
                className='px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer'
              >
                <Rocket className='w-3.5 h-3.5' aria-hidden='true' />
                <span>Khóa lại kịch bản</span>
              </button>
            ) : currentChapter?.status === 'PreProduction' && workspaceId && seriesId ? (
              <button
                type='button'
                onClick={() =>
                  navigate(buildChapterManagementUrl(workspaceId, seriesId, currentChapterId))
                }
                className='px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer'
              >
                <Rocket className='w-3.5 h-3.5' aria-hidden='true' />
                <span>Về Tổng quan để Bắt đầu SX</span>
              </button>
            ) : null}
          </div>
        }
      />

      {/* CONTENT BODY CONTAINER */}
      <div className='w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'>
        {/* ========================================================================= */}
        {/* TAB 1: MA TRẬN TRANG (id="view-progress") */}
        {/* ========================================================================= */}
        {activeSubtab === 'progress' && (
          <div className='space-y-4' id='view-progress'>
            {/* Production Snapshot & Progress Summary Bar (uses authoritative /readiness — NO duplicate Pre-production Gate) */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {/* Card 1: Production Script Snapshot */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-stone-700 uppercase tracking-wider'>
                    Bản Kịch bản Sản xuất
                  </span>
                  <span
                    data-testid='readiness-script-status'
                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                      currentChapter?.isScriptFrozen || currentChapter?.scriptStatus === 'Frozen'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {scriptStatusLabel(currentChapter)}
                  </span>
                </div>
                <div>
                  <div className='text-base font-bold text-stone-900'>
                    {t('workbench.readiness.scriptSize', {
                      scenes: chapterReadiness?.script.sceneCount ?? currentChapter?.scenesCount ?? 0,
                      pages: chapterReadiness?.script.pageCount ?? currentChapter?.pagesCount ?? 0,
                    })}
                  </div>
                  <div className='text-xs text-stone-500 mt-0.5'>
                    {chapterReadiness?.script.productionVersionNumber
                      ? `Đang sản xuất theo bản v${chapterReadiness.script.productionVersionNumber}`
                      : chapterReadiness?.script.approvedVersionNumber
                        ? `Bản gửi duyệt v${chapterReadiness.script.approvedVersionNumber} (chưa khóa SX)`
                        : currentChapter?.isScriptFrozen
                          ? t('workbench.readiness.scriptFrozen')
                          : t('workbench.readiness.scriptNotFrozen')}
                  </div>
                </div>
                <div className='pt-2 border-t border-stone-100 flex items-center justify-between'>
                  <span className='text-xs text-stone-400 font-mono'>
                    {chapterReadiness?.script.latestVersionNumber
                      ? `Mới nhất: v${chapterReadiness.script.latestVersionNumber}`
                      : 'Chưa có bản lưu'}
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      workspaceId && seriesId && currentChapterId
                        ? navigate(buildScriptReviewUrl(workspaceId, seriesId, currentChapterId))
                        : undefined
                    }
                    className='text-orange-700 hover:underline text-xs font-medium cursor-pointer'
                  >
                    {t('workbench.readiness.viewScript', 'Xem kịch bản →')}
                  </button>
                </div>
              </div>

              {/* Card 2: Chapter-Scoped Series Bible Snapshot */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-stone-700 uppercase tracking-wider'>
                    Tài liệu Chương (Bible)
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                      (chapterReadiness
                        ? chapterReadiness.bible.requiredTotal === 0 ||
                          chapterReadiness.bible.readyCount === chapterReadiness.bible.requiredTotal
                        : bibleMetrics.total > 0 && bibleMetrics.pending === 0)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {(chapterReadiness
                      ? chapterReadiness.bible.requiredTotal === 0 ||
                        chapterReadiness.bible.readyCount === chapterReadiness.bible.requiredTotal
                      : bibleMetrics.total > 0 && bibleMetrics.pending === 0)
                      ? t('workbench.readiness.bibleReady')
                      : t('workbench.readiness.bibleReview')}
                  </span>
                </div>
                <div>
                  <div className='flex items-center gap-1.5'>
                    <span
                      className='text-base font-bold text-stone-900'
                      data-testid='readiness-bible-locked'
                    >
                      {chapterReadiness
                        ? `${chapterReadiness.bible.readyCount}/${chapterReadiness.bible.requiredTotal}`
                        : t('workbench.readiness.bibleLocked', {
                            locked: bibleMetrics.locked,
                            total: bibleMetrics.total,
                          })}
                    </span>
                    <span className='text-xs text-stone-500'>
                      {t('workbench.readiness.bibleSub', 'đã khóa chuẩn')}
                    </span>
                  </div>
                  <div className='text-xs text-stone-600 mt-0.5'>
                    {chapterReadiness
                      ? chapterReadiness.bible.crowdOptionalCount > 0
                        ? `Phạm vi chương · ${chapterReadiness.bible.crowdOptionalCount} quần chúng tùy chọn`
                        : 'Phạm vi thực thể bắt buộc trong chương'
                      : bibleMetrics.total === 0
                        ? t('workbench.readiness.bibleEmpty')
                        : t('workbench.readiness.bibleDetail', {
                            locked: bibleMetrics.locked,
                            pending: bibleMetrics.pending,
                          })}
                  </div>
                </div>
                <div className='pt-2 border-t border-stone-100 flex items-center justify-between'>
                  <span className='text-xs text-stone-400'>Chapter Scope</span>
                  <button
                    type='button'
                    onClick={() =>
                      workspaceId && seriesId && currentChapterId
                        ? navigate(
                            `${buildScriptReviewUrl(workspaceId, seriesId, currentChapterId)}?tab=entities`,
                          )
                        : navigate(`/workspaces/${workspaceId}/series/${seriesId}/bible`)
                    }
                    className='text-orange-700 hover:underline text-xs font-medium cursor-pointer'
                  >
                    {t('workbench.readiness.checkBible', 'Kiểm tra ngay →')}
                  </button>
                </div>
              </div>

              {/* Card 3: Separated Task / Page / Panel Production Progress */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-stone-700 uppercase tracking-wider'>
                    Tiến độ Ô công việc (Task)
                  </span>
                  <span className='text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 font-mono'>
                    {chapterReadiness
                      ? `${chapterReadiness.production.approvedTasks}/${chapterReadiness.production.totalTasks} ô`
                      : t('workbench.readiness.completedBadge', {
                          completed: currentMetrics.approvedPanels,
                          total: currentMetrics.panelCount,
                        })}
                  </span>
                </div>
                <div>
                  <div className='flex items-baseline justify-between'>
                    <span
                      className='text-2xl font-bold text-stone-900'
                      data-testid='readiness-page-percent'
                    >
                      {chapterReadiness
                        ? chapterReadiness.production.taskProgressPercent
                        : currentMetrics.percent}
                      %
                    </span>
                    {(currentMetrics.rework > 0 || gateWarnings > 0) && (
                      <span className='text-xs text-rose-700 font-semibold flex items-center gap-1'>
                        <Flag className='w-3 h-3 text-rose-600' />
                        {t('workbench.readiness.reworkAlert', {
                          rework: chapterReadiness?.production.reworkTasks ?? currentMetrics.rework,
                          flags: gateWarnings,
                        })}
                      </span>
                    )}
                  </div>
                  <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1.5'>
                    <div
                      className='bg-orange-600 h-full transition-all'
                      style={{
                        width: `${
                          chapterReadiness
                            ? chapterReadiness.production.taskProgressPercent
                            : currentMetrics.percent
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className='pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500'>
                  <span>
                    {chapterReadiness
                      ? `Trang xong: ${chapterReadiness.production.completedPages}/${chapterReadiness.production.totalPages} · Panel cuối: ${chapterReadiness.production.approvedPanels}/${chapterReadiness.production.totalPanels}`
                      : t('workbench.readiness.pageLoad', {
                          pages: currentMetrics.pageCount,
                          panels: currentMetrics.panelCount,
                        })}
                  </span>
                  <span className='font-mono font-medium text-stone-700'>
                    Ch.{currentChapter?.chapterNumber || '01'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2D Task Matrix Table */}
            <Card className='shadow-xs' featured>
              {currentChapterId ? (
                <TaskGridBoard
                  chapterId={currentChapterId}
                  seriesId={seriesId}
                  workspaceId={workspaceId}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  isProducer={isProducer}
                  isEditor={isEditor}
                  refreshKey={refreshKey}
                  onShowToast={onShowToast}
                  isChapterLocked={[
                    'ChapterApproved',
                    'Approved',
                    'HandedOffAndPublished',
                    'Published',
                  ].includes(String(currentChapter?.status))}
                />
              ) : (
                <div className='rounded-xl border border-dashed border-head-line bg-head-wash p-10 text-center'>
                  <div className='font-semibold text-stone-900'>
                    {t('taskGridV3.noChapterSelectedTitle', 'Chưa chọn chương')}
                  </div>
                  <p className='mt-1 text-sm text-stone-500'>
                    {t(
                      'taskGridV3.noChapterSelectedDesc',
                      'Chọn một chương ở phía trên để xem Lưới Giao Việc.',
                    )}
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TỔNG QUAN CHƯƠNG (id="view-chapters") */}
        {/* ========================================================================= */}
        {activeSubtab === 'chapters' && (
          <div className='space-y-6' id='view-chapters'>
            {/* Banner card */}
            <div className='p-5 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0'>
                  <Calendar className='w-5 h-5' />
                </div>
                <div>
                  <div className='flex items-center gap-2.5 flex-wrap'>
                    <h3 className='text-lg font-bold text-stone-900 leading-tight'>
                      {t('workbench.chaptersOverview.bannerTitle', {
                        seriesTitle: seriesTitle || t('workbench.seriesFallback'),
                      })}
                    </h3>
                    {seriesDetail?.format && (
                      <span className='px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold'>
                        {seriesDetail.format}
                      </span>
                    )}
                  </div>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    {t('workbench.chaptersOverview.bannerDesc', { count: chapters.length })}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2.5'>
                <button
                  type='button'
                  onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/chapters`)}
                  className='px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer'
                >
                  <Plus className='w-3.5 h-3.5' />
                  <span>{t('workbench.chaptersOverview.newChapterBtn', '+ Thêm chương mới')}</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
              {/* KPI 1: Tổng số chương */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('workbench.chaptersOverview.kpiTotalChapters', 'Tổng số chương')}</span>
                  <BookOpen className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>{chapters.length}</span>
                  <span className='text-xs text-stone-500'>
                    {t('workbench.chaptersOverview.kpiVolDesc')}
                  </span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {t('workbench.chaptersOverview.kpiSummary', {
                    published: publishedCount,
                    approved: approvedCount,
                    inProd: inProdCount,
                  })}
                </div>
              </div>

              {/* KPI 2: Tổng số trang hoàn tất */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>
                    {t('workbench.chaptersOverview.kpiCompletedPages', 'Tổng số trang hoàn tất')}
                  </span>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-emerald-700'>
                    {approvedPanels} / {totalPanels}
                  </span>
                  <span className='text-xs text-emerald-700 font-medium'>{completionPercent}%</span>
                </div>
                <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                  <div
                    className='bg-emerald-600 h-full'
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              {/* KPI 3: Chương trọng tâm Sprint */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>
                    {t('workbench.chaptersOverview.kpiSprintFocus', 'Chương trọng tâm Sprint')}
                  </span>
                  <Clock className='w-4 h-4 text-orange-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>
                    CH.
                    {currentChapter?.chapterNumber
                      ? String(currentChapter.chapterNumber).padStart(2, '0')
                      : '01'}
                  </span>
                  <span className='text-xs text-orange-700 font-semibold'>
                    {currentChapter?.title || tf('productionWorkspace.workspace.draftFallback')} (
                    {currentMetrics.percent}%)
                  </span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {statusMeta?.label || t('workbench.chapterStatus.InProduction')}
                </div>
              </div>

              {/* KPI 4: Hạn bàn giao NXB kế tiếp */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>
                    {t('workbench.chaptersOverview.kpiNextDeadline', 'Hạn bàn giao NXB kế tiếp')}
                  </span>
                  <Calendar className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>
                    {formatShortDate(currentChapter?.targetReleaseDate) || '—'}
                  </span>
                  <span className='text-xs text-stone-500'>
                    {deadlineHint(currentChapter?.targetReleaseDate)}
                  </span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {currentChapterFormattedTitle}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className='p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-xs font-bold text-stone-900 mr-1'>
                  {t('workbench.chaptersOverview.filterLabel', 'Bộ lọc:')}
                </span>
                <button
                  type='button'
                  onClick={() => setChapterFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    chapterFilter === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {t('workbench.chaptersOverview.filterAll', {
                    count: chapters.length,
                    defaultValue: `Tất cả (${chapters.length})`,
                  })}
                </button>
                <button
                  type='button'
                  onClick={() => setChapterFilter('inProd')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    chapterFilter === 'inProd'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white border border-stone-200 text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  {t('workbench.chaptersOverview.filterInProd', { count: inProdCount })}
                </button>
                <button
                  type='button'
                  onClick={() => setChapterFilter('published')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    chapterFilter === 'published'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-stone-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {t('workbench.chaptersOverview.filterPublished', {
                    count: publishedCount + approvedCount,
                  })}
                </button>
              </div>
            </div>

            {/* Grid of Chapter Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
              {filteredChapters.map((chap) => {
                const isCurrent = chap.id === currentChapterId;
                const isReleased = isPublishedStatus(chap.status);
                const isPublished = isReleased || isApprovedStatus(chap.status);
                const isInProd = chap.status === 'InProduction';
                const metrics = getChapterMetrics(chap, seriesProgress);

                return (
                  <div
                    key={chap.id}
                    className={`p-4 rounded-xl flex flex-col justify-between space-y-4 transition-all ${
                      isCurrent
                        ? 'bg-orange-50/40 border-2 border-orange-500 shadow-xs'
                        : 'bg-white border border-stone-200 shadow-xs hover:border-stone-400'
                    }`}
                  >
                    <div className='space-y-2'>
                      <div className='flex items-start justify-between gap-2'>
                        {isPublished ? (
                          <span className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold'>
                            {isReleased
                              ? t('workbench.chaptersOverview.publishedBadge')
                              : t('workbench.chaptersOverview.completedBadge')}
                          </span>
                        ) : isInProd ? (
                          <span className='px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center gap-1'>
                            <span className='w-1.5 h-1.5 rounded-full bg-white' />
                            {t('workbench.chaptersOverview.inProdSprint', 'Đang sản xuất (Sprint)')}
                          </span>
                        ) : (
                          <span className='px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold'>
                            {t('workbench.chaptersOverview.reviewScriptBadge', 'Duyệt kịch bản')}
                          </span>
                        )}
                        {isCurrent && (
                          <span className='px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-bold'>
                            {t('workbench.chaptersOverview.currentBadge', 'Hiện tại')}
                          </span>
                        )}
                      </div>

                      <h4 className='text-sm font-bold text-stone-900'>
                        {formatChapterLabel(
                          chap.chapterNumber,
                          chap.title || tf('productionWorkspace.workspace.draftFallback'),
                        )}
                      </h4>
                      <p className='text-xs text-stone-500 line-clamp-2'>
                        {chap.outline || t('workbench.chaptersOverview.outlineFallback')}
                      </p>
                    </div>

                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-stone-500'>
                          {t('workbench.chaptersOverview.progressLabel', 'Tiến độ:')}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isPublished
                              ? 'text-emerald-700'
                              : isInProd
                                ? 'text-orange-700'
                                : 'text-amber-700'
                          }`}
                        >
                          {isPublished || isInProd
                            ? t('workbench.chaptersOverview.pageProgress', {
                                percent: metrics.percent,
                                pages: metrics.pageCount,
                              })
                            : scriptStatusLabel(chap)}
                        </span>
                      </div>
                      <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                        <div
                          className={`h-full ${
                            isPublished
                              ? 'bg-emerald-600'
                              : isInProd
                                ? 'bg-orange-600'
                                : 'bg-amber-500'
                          }`}
                          style={{ width: `${isPublished || isInProd ? metrics.percent : 0}%` }}
                        />
                      </div>
                      {isInProd && (
                        <div className='flex items-center justify-between text-xs text-amber-800'>
                          {metrics.rework > 0 ? (
                            <span className='flex items-center gap-1 font-semibold text-rose-700'>
                              <Flag className='w-3 h-3 text-rose-600' />
                              {t('workbench.chaptersOverview.reworkFlags', {
                                rework: metrics.rework,
                              })}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span>
                            {chap.targetReleaseDate
                              ? t('workbench.chaptersOverview.deadlineLabel', {
                                  date: formatShortDate(chap.targetReleaseDate),
                                })
                              : t('workbench.chaptersOverview.noDeadline')}
                          </span>
                        </div>
                      )}
                    </div>

                    {isCurrent ? (
                      <button
                        type='button'
                        onClick={() => handleSwitchSubtab('progress')}
                        className='w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer'
                      >
                        <span>
                          {t('workbench.chaptersOverview.enterChapterBtn', 'Vào chi tiết chương →')}
                        </span>
                      </button>
                    ) : isPublished ? (
                      <button
                        type='button'
                        onClick={() =>
                          workspaceId &&
                          seriesId &&
                          navigate(buildChapterReaderUrl(workspaceId, seriesId, chap.id))
                        }
                        className='w-full py-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer'
                      >
                        <span>
                          {t('workbench.chaptersOverview.viewPrintBtn', 'Xem lại bản in')}
                        </span>
                        <ChevronRight className='w-3.5 h-3.5' />
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={() => {
                          setCurrentChapterId(chap.id);
                          handleSwitchSubtab('progress');
                        }}
                        className='w-full py-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer'
                      >
                        <span>
                          {t('workbench.chaptersOverview.enterChapterBtn', 'Vào chi tiết chương →')}
                        </span>
                        <ChevronRight className='w-3.5 h-3.5' />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: QUẢN LÝ Ê-KÍP (id="view-crew") */}
        {/* ========================================================================= */}
        {activeSubtab === 'crew' && (
          <div className='space-y-6' id='view-crew'>
            {/* Crew Banner Card */}
            <div className='p-5 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0'>
                  <Users className='w-5 h-5' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-lg font-bold text-stone-900 leading-tight'>
                      {t('workbench.crewOverview.bannerTitle', 'Quản lý Ê-kíp & Phân công nhân sự')}
                    </h3>
                    <span className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold'>
                      {t('workbench.crewOverview.bannerBadge', 'Đang hoạt động')}
                    </span>
                  </div>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    {t('workbench.crewOverview.bannerSubtitle', {
                      seriesTitle: seriesTitle || 'Series',
                      chapter: currentChapter?.chapterNumber || '01',
                      title:
                        currentChapter?.title || tf('productionWorkspace.workspace.draftFallback'),
                      count: seriesMembers.length,
                    })}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2.5'>
                <button
                  type='button'
                  data-testid='crew-add-member-btn'
                  disabled={!isProducer}
                  onClick={() => setMembersModalOpen(true)}
                  className='px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer'
                >
                  <Users className='w-3.5 h-3.5' />
                  <span>{t('workbench.crewOverview.addMemberBtn', 'Thêm thành viên')}</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Cards for Crew */}
            <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
              {/* KPI 1: Tổng quy mô */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('workbench.crewOverview.kpiSize', 'Tổng quy mô ê-kíp')}</span>
                  <Users className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>{seriesMembers.length}</span>
                  <span className='text-xs text-stone-500'>
                    {t('workbench.crewOverview.kpiSizeUnit', 'nhân sự cốt lõi')}
                  </span>
                </div>
              </div>

              {/* KPI 2: Trạng thái sẵn sàng */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('workbench.crewOverview.kpiReadiness', 'Trạng thái sẵn sàng')}</span>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-emerald-700' data-testid='crew-ready'>
                    {seriesMembers.length > 0
                      ? Math.round((crewMetrics.ready / seriesMembers.length) * 100)
                      : 0}
                    %
                  </span>
                  <span className='text-xs text-stone-500'>
                    {t('workbench.crewOverview.kpiReadinessSub', {
                      ready: crewMetrics.ready,
                      total: seriesMembers.length,
                    })}
                  </span>
                </div>
                <div
                  className={`text-xs pt-1 border-t border-stone-100 font-medium ${
                    crewMetrics.withOverdue > 0 ? 'text-amber-700' : 'text-stone-500'
                  }`}
                >
                  {crewMetrics.withOverdue > 0
                    ? t('workbench.crewOverview.kpiReadinessNote', {
                        count: crewMetrics.withOverdue,
                      })
                    : t('workbench.crewOverview.kpiReadinessAllGood')}
                </div>
              </div>

              {/* KPI 3: Khối lượng công việc */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>
                    {t('workbench.crewOverview.kpiWorkload', 'Khối lượng công việc (Cap)')}
                  </span>
                  <Clock className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>{crewMetrics.open}</span>
                  <span className='text-xs text-stone-500'>
                    {t('workbench.crewOverview.kpiWorkloadSub', { avg: crewMetrics.avgOpen })}
                  </span>
                </div>
                <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                  <div
                    className='bg-orange-600 h-full'
                    style={{
                      width: `${crewMetrics.total > 0 ? Math.round((crewMetrics.open / crewMetrics.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* KPI 4: Nhiệm vụ tuần hoàn tất */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>
                    {t('workbench.crewOverview.kpiWeeklyTasks', 'Nhiệm vụ tuần hoàn tất')}
                  </span>
                  <Check className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900' data-testid='crew-done'>
                    {crewMetrics.done} / {crewMetrics.total}
                  </span>
                  <span className='text-xs text-emerald-700 font-medium'>
                    {crewMetrics.donePercent}%
                  </span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {t('workbench.crewOverview.kpiWeeklyTasksDeadline', {
                    chapter: currentChapter?.chapterNumber ?? '—',
                    date:
                      formatShortDate(currentChapter?.targetReleaseDate) ||
                      t('workbench.chaptersOverview.noDeadline'),
                  })}
                </div>
              </div>
            </div>

            {/* Crew Roster Table */}
            <Card className='shadow-xs'>
              <CardHeader
                icon={<Users className='w-4 h-4' />}
                title={
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-bold text-stone-900 uppercase tracking-wider'>
                      {t('workbench.crewOverview.rosterTitle', {
                        chapter: currentChapter?.chapterNumber || '01',
                        defaultValue: `Bảng phân bổ nhân sự Chapter ${currentChapter?.chapterNumber || '01'}`,
                      })}
                    </span>
                    <span className='text-xs px-2 py-0.5 rounded-full bg-kraft text-kraft-ink font-mono font-semibold'>
                      {t('workbench.crewOverview.rosterCount', {
                        count: filteredMembers.length,
                        defaultValue: `${filteredMembers.length} Thành viên`,
                      })}
                    </span>
                  </div>
                }
                actions={
                  <div className='flex items-center gap-2 text-xs'>
                    <button
                      type='button'
                      onClick={() => setCrewRoleFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        crewRoleFilter === 'all'
                          ? 'bg-stone-900 text-white'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {t('workbench.crewOverview.filterAllRoles', 'Tất cả vai trò')}
                    </button>
                    <button
                      type='button'
                      onClick={() => setCrewRoleFilter('artist')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        crewRoleFilter === 'artist'
                          ? 'bg-stone-900 text-white'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {t('workbench.crewOverview.filterArtists', 'Họa sĩ vẽ')}
                    </button>
                    <button
                      type='button'
                      onClick={() => setCrewRoleFilter('tech')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        crewRoleFilter === 'tech'
                          ? 'bg-stone-900 text-white'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {t('workbench.crewOverview.filterTech', 'Kỹ thuật & Thoại')}
                    </button>
                  </div>
                }
              />

              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-head-wash text-kraft-ink text-xs font-semibold uppercase tracking-wide border-b border-head-line'>
                    <tr>
                      <th className='py-3 px-4'>
                        {t('workbench.crewOverview.colMember', 'Thành viên & Hồ sơ')}
                      </th>
                      <th className='py-3 px-4'>
                        {t('workbench.crewOverview.colRole', 'Vai trò chính')}
                      </th>
                      <th className='py-3 px-4'>
                        {t('workbench.crewOverview.colScope', 'Phạm vi phụ trách')}
                      </th>
                      <th className='py-3 px-4'>
                        {t('workbench.crewOverview.colStatus', 'Trạng thái tiến độ')}
                      </th>
                      <th className='py-3 px-4'>
                        {t('workbench.crewOverview.colLoad', 'Tải công việc')}
                      </th>
                      <th className='py-3 px-4 text-right'>
                        {t('workbench.crewOverview.colActions', 'Thao tác')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-stone-200 text-stone-800'>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className='py-6 text-center text-stone-500'>
                          {t('workbench.crewOverview.emptyRoster')}
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member, idx) => {
                        const initials = (member.fullName || member.userId || 'PF')
                          .slice(0, 2)
                          .toUpperCase();
                        const isLeader = member.seriesRole === 'Producer';
                        const memberWork = workloadByUser.get(member.userId);
                        const load = getMemberLoad(memberWork);
                        const memberStatus =
                          (memberWork?.overdue || 0) > 0
                            ? {
                                label: t('workbench.crewOverview.statusOverdue', {
                                  count: memberWork!.overdue,
                                }),
                                cls: 'bg-rose-50 text-rose-700 border-rose-200',
                              }
                            : (memberWork?.waitingReview || 0) > 0
                              ? {
                                  label: t('workbench.crewOverview.statusWaitingReview', {
                                    count: memberWork!.waitingReview,
                                  }),
                                  cls: 'bg-amber-50 text-amber-700 border-amber-200',
                                }
                              : (memberWork?.open || 0) > 0
                                ? {
                                    label: t('workbench.crewOverview.statusWorking', {
                                      count: memberWork!.open,
                                    }),
                                    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                  }
                                : {
                                    label: isLeader
                                      ? t('workbench.crewOverview.leaderStatus')
                                      : t('workbench.crewOverview.statusIdle'),
                                    cls: 'bg-stone-50 text-stone-600 border-stone-200',
                                  };

                        return (
                          <tr
                            key={member.userId || idx}
                            className='hover:bg-stone-50/60 transition-colors'
                          >
                            <td className='py-3 px-4'>
                              <div className='flex items-center gap-3'>
                                <div className='w-9 h-9 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs shrink-0'>
                                  {initials}
                                </div>
                                <div>
                                  <div className='text-xs font-bold text-stone-900'>
                                    {member.fullName || t('workbench.crewOverview.memberFallback')}
                                  </div>
                                  <div className='text-xs text-stone-500 font-mono'>
                                    {member.email || `${member.userId.slice(0, 8)}…`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className='py-3 px-4'>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  isLeader
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {member.seriesRole || 'Artist'}
                              </span>
                            </td>
                            <td className='py-3 px-4 text-stone-600'>
                              {member.seriesRole === 'Producer'
                                ? t('workbench.crewOverview.producerScope')
                                : t('workbench.crewOverview.memberScope', {
                                    role:
                                      member.seriesRole ||
                                      t('workbench.crewOverview.defaultStageRole'),
                                    chapter: currentChapter?.chapterNumber || '01',
                                  })}
                            </td>
                            <td className='py-3 px-4'>
                              <span
                                className={`px-2 py-0.5 rounded-full border text-xs font-medium ${memberStatus.cls}`}
                              >
                                {memberStatus.label}
                              </span>
                            </td>
                            <td className='py-3 px-4'>
                              <div className='w-24'>
                                <div className='flex justify-between text-xs mb-1 font-medium'>
                                  <span>
                                    {t('workbench.crewOverview.loadDetail', {
                                      done: memberWork?.done ?? 0,
                                      total: load.total,
                                    })}
                                  </span>
                                </div>
                                <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                                  <div
                                    className='h-full bg-emerald-600'
                                    style={{ width: `${load.percent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className='py-3 px-4 text-right'>
                              <button
                                type='button'
                                onClick={() => handleSwitchSubtab('progress')}
                                className='px-2.5 py-1 rounded bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 font-medium text-xs cursor-pointer'
                              >
                                {t('workbench.crewOverview.btnAssignPages', 'Giao trang')}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {membersModalOpen && workspaceId && seriesId && (
        <SeriesMembersModal
          isOpen={membersModalOpen}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          seriesId={seriesId}
          seriesTitle={seriesTitle}
          onClose={() => setMembersModalOpen(false)}
          onMembersChanged={loadMembers}
        />
      )}

      {/* Start Production / Refreeze Modal */}
      {startProductionOpen && currentChapter?.status === 'InProduction' && (
        <RefreezeScriptModal
          isOpen={startProductionOpen}
          onClose={() => setStartProductionOpen(false)}
          chapterId={currentChapterId}
          chapterNumber={currentChapter?.chapterNumber || 0}
          chapterTitle={currentChapter?.title || ''}
          seriesId={seriesId || ''}
          workspaceId={workspaceId || ''}
          onSuccess={() => {
            setStartProductionOpen(false);
            loadChapters();
            setRefreshKey((k) => k + 1);
          }}
          onShowToast={onShowToast}
        />
      )}
      {startProductionOpen && currentChapter?.status !== 'InProduction' && (
        <StartProductionModal
          isOpen={startProductionOpen}
          onClose={() => setStartProductionOpen(false)}
          chapterId={currentChapterId}
          chapterNumber={currentChapter?.chapterNumber || 0}
          chapterTitle={currentChapter?.title || ''}
          seriesId={seriesId || ''}
          workspaceId={workspaceId || ''}
          onSuccess={() => {
            loadChapters();
            onShowToast(
              t('workbench.startProductionToastTitle'),
              t('workbench.startProductionToastDesc'),
            );
          }}
        />
      )}
    </div>
  );
};

export const ProductionPipelineView = WorkspaceView;
export type ProductionPipelineViewProps = WorkspaceViewProps;
