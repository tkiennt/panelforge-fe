import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
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
import { seriesService, SeriesDetailDto, SeriesMemberDto, SeriesProgressDto } from '@/services/series.service';
import { StartProductionModal } from '@/shared/modals/StartProductionModal';

export interface WorkspaceViewProps {
  currentUserRole?: WorkspaceRole | null;
  systemRole?: SystemRole;
  userRoles?: string[];
  currentUserId?: string;
  onShowToast: (title: string, desc: string) => void;
  isReaderMode?: boolean;
}

const CHAPTER_STATUS_META: Record<string, { label: string; cls: string }> = {
  PreProduction: {
    label: 'Tiền kỳ (viết kịch bản)',
    cls: 'text-stone-800 bg-stone-100 border-stone-200',
  },
  InProduction: {
    label: 'Đang sản xuất',
    cls: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  ChapterApproved: {
    label: 'Đã nghiệm thu (Gate 3)',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  Approved: {
    label: 'Đã duyệt hoàn tất',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  HandedOffAndPublished: {
    label: 'Đã bàn giao & phát hành',
    cls: 'text-stone-800 bg-stone-100 border-stone-200',
  },
  Published: {
    label: 'Đã xuất bản',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
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
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const chapterIdFromUrl = searchParams.get('chapterId');
  const tabFromUrl = searchParams.get('tab') as SubTabKey | null;

  const [activeSubtab, setActiveSubtab] = useState<SubTabKey>(
    tabFromUrl === 'chapters' || tabFromUrl === 'crew' ? tabFromUrl : 'progress',
  );

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

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && ['progress', 'chapters', 'crew'].includes(tabFromUrl)) {
      setActiveSubtab(tabFromUrl as SubTabKey);
    }
  }, [tabFromUrl]);

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

      seriesService
        .getSeriesMembers(workspaceId || '', seriesId)
        .then((members) => {
          if (Array.isArray(members)) setSeriesMembers(members);
        })
        .catch(() => {});

      seriesService
        .getSeriesProgress(seriesId)
        .then((prog) => {
          if (prog) setSeriesProgress(prog);
        })
        .catch(() => {});
    }
  }, [workspaceId, seriesId]);

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
      onShowToast('Lỗi tải danh mục', 'Không thể nạp danh sách chương của bộ truyện.');
    } finally {
      setLoadingChapters(false);
    }
  }, [seriesId, chapterIdFromUrl, setSearchParams, onShowToast]);

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
    if (!currentChapter) return 'Đang nạp chương...';
    return formatChapterLabel(currentChapter.chapterNumber, currentChapter.title || 'Bản thảo');
  }, [currentChapter]);

  // Gate 1 check: Only allow starting production when chapter is PreProduction and conditions met
  const canStartProduction = useMemo(() => {
    if (!currentChapter) return false;
    const isPreProd = currentChapter.status === 'PreProduction';
    if (lockGate) return isPreProd && !lockGate.items.some((i) => i.blocking);
    return isPreProd;
  }, [currentChapter, lockGate]);

  // Readers access barrier
  if (isReaderMode || isReaderOnly) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center p-8 text-center min-h-[60vh]'>
        <div className='w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4'>
          <ShieldAlert className='w-8 h-8' />
        </div>
        <h2 className='text-xl font-serif font-semibold text-stone-900 mb-2'>
          Khu vực giới hạn
        </h2>
        <p className='text-sm text-stone-500 max-w-md mb-4'>
          Không có quyền truy cập sản xuất. Quay lại danh mục truyện để đọc bản phát hành.
        </p>
        <button
          type='button'
          onClick={() => navigate('/catalog')}
          className='px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs'
        >
          Đến Public Catalog
        </button>
      </div>
    );
  }

  const statusMeta = currentChapter
    ? (CHAPTER_STATUS_META[String(currentChapter.status)] ?? {
        label: String(currentChapter.status),
        cls: 'text-stone-800 bg-stone-100 border-stone-200',
      })
    : null;

  // Filtered chapters for chapter overview tab
  const filteredChapters = chapters.filter((c) => {
    if (chapterFilter === 'inProd') return c.status === 'InProduction';
    if (chapterFilter === 'published') return c.status === 'HandedOffAndPublished' || c.status === 'ChapterApproved';
    return true;
  });

  // Filtered crew members
  const filteredMembers = seriesMembers.filter((m) => {
    const role = String(m.seriesRole || '').toLowerCase();
    if (crewRoleFilter === 'artist') return role.includes('artist') || role.includes('pencil') || role.includes('ink');
    if (crewRoleFilter === 'tech') return role.includes('letter') || role.includes('editor');
    return true;
  });

  const totalPanels = seriesProgress?.chapters?.reduce((sum, c) => sum + (c.panelCount || 0), 0) || 0;
  const approvedPanels = seriesProgress?.chapters?.reduce(
    (sum, c) => sum + (c.stages?.[c.stages.length - 1]?.approved || 0),
    0,
  ) || 0;
  const completionPercent = totalPanels > 0 ? Math.round((approvedPanels / totalPanels) * 100) : 0;

  return (
    <div className='w-full min-h-screen min-w-0 bg-[#FAF9F5] font-sans text-stone-900'>
      {/* Hidden Accessible Heading for Section Landmark */}
      <h1 className='sr-only'>Quy trình sản xuất</h1>

      {/* SUB-HEADER PIPELINE & CHAPTER BAR */}
      <div className='w-full bg-white border-b border-stone-200 sticky top-0 md:top-16 z-30 px-4 sm:px-6 lg:px-8 py-3 shadow-2xs'>
        <div className='max-w-[1640px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4'>
          {/* Left: Back Link, Title, Subtitle, Status Pill */}
          <div className='flex flex-wrap items-center gap-3'>
            <div>
              <button
                type='button'
                onClick={() => handleSwitchSubtab('chapters')}
                className='inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800 hover:underline mb-1 transition-colors cursor-pointer'
              >
                <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
                <span>{t('workbench.backToChapters', 'Quay lại Tổng quan chương')}</span>
              </button>
              <h2 className='text-base font-bold text-stone-900 leading-tight'>
                {seriesTitle || 'Series'} : {currentChapterFormattedTitle}
              </h2>
              <p className='text-xs text-stone-500'>
                {seriesDetail?.format || t('workbench.shonenFormat', 'Quy chuẩn Shonen')}
              </p>
            </div>
            {statusMeta && (
              <span
                className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusMeta.cls}`}
              >
                {statusMeta.label}
              </span>
            )}
          </div>

          {/* Right: Chapter Selector, Subtab Bar, Action CTA */}
          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Chapter Selector Dropdown */}
            <div className='relative flex items-center'>
              <label htmlFor='pipeline-chapter-select' className='sr-only'>
                Chương:
              </label>
              <select
                id='pipeline-chapter-select'
                aria-label='Chương:'
                value={currentChapterId}
                onChange={handleChapterChange}
                disabled={loadingChapters || chapters.length === 0}
                className='px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium focus:outline-none focus:border-stone-400 cursor-pointer shadow-2xs'
              >
                {chapters.length === 0 ? (
                  <option value=''>Đang nạp danh sách chương...</option>
                ) : (
                  chapters.map((chap) => (
                    <option key={chap.id} value={chap.id}>
                      {formatChapterLabel(chap.chapterNumber, chap.title || 'Bản thảo')}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Sub-tabs Navigation: EXACTLY Ma trận trang · Tổng quan chương · Kịch bản · Đọc thử & Soát trang · Bàn giao */}
            <div
              className='inline-flex p-1 rounded-lg bg-stone-100 border border-stone-200'
              id='subtab-bar'
            >
              <button
                type='button'
                data-subtab='progress'
                id='subtab-progress'
                onClick={() => handleSwitchSubtab('progress')}
                className={`subtab-btn px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  activeSubtab === 'progress'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 font-medium'
                }`}
              >
                {t('workbench.subtabs.progress', 'Ma trận trang')}
              </button>
              <button
                type='button'
                data-subtab='chapters'
                id='subtab-chapters'
                onClick={() => handleSwitchSubtab('chapters')}
                className={`subtab-btn px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  activeSubtab === 'chapters'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 font-medium'
                }`}
              >
                {t('workbench.subtabs.chapters', 'Tổng quan chương')}
              </button>
              <button
                type='button'
                data-subtab='script'
                id='subtab-script'
                onClick={() =>
                  navigate(
                    currentChapterId
                      ? `/workspaces/${workspaceId}/series/${seriesId}/chapters/${currentChapterId}/script/review`
                      : `/workspaces/${workspaceId}/series/${seriesId}/chapters`,
                  )
                }
                className='subtab-btn px-2.5 py-1 rounded-md text-stone-600 hover:text-stone-900 text-xs font-medium transition-colors cursor-pointer'
              >
                {t('workbench.subtabs.script', 'Kịch bản')}
              </button>
              <button
                type='button'
                data-subtab='reader'
                id='subtab-reader'
                onClick={() =>
                  navigate(
                    currentChapterId
                      ? `/workspaces/${workspaceId}/series/${seriesId}/chapters/${currentChapterId}/review/latest`
                      : `/workspaces/${workspaceId}/series/${seriesId}/workspace`,
                  )
                }
                className='subtab-btn px-2.5 py-1 rounded-md text-stone-600 hover:text-stone-900 text-xs font-medium transition-colors cursor-pointer'
              >
                {t('workbench.subtabs.reader', 'Đọc thử & Soát trang')}
              </button>
              <button
                type='button'
                data-subtab='handoff'
                id='subtab-handoff'
                onClick={() =>
                  navigate(
                    `/workspaces/${workspaceId}/series/${seriesId}/export${
                      currentChapterId ? `?chapterId=${currentChapterId}` : ''
                    }`,
                  )
                }
                className='subtab-btn px-2.5 py-1 rounded-md text-stone-600 hover:text-stone-900 text-xs font-medium transition-colors cursor-pointer'
              >
                {t('workbench.subtabs.handoff', 'Bàn giao')}
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type='button'
              onClick={() => {
                loadChapters();
                setRefreshKey((k) => k + 1);
              }}
              aria-label='Làm mới dữ liệu'
              title='Làm mới dữ liệu'
              className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-2xs transition-colors cursor-pointer'
            >
              <RefreshCw className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
            </button>

            {/* Start Production CTA */}
            <button
              type='button'
              disabled={!canStartProduction}
              onClick={() => setStartProductionOpen(true)}
              className={`px-4 py-2 rounded-lg text-white text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${
                canStartProduction
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-60'
              }`}
              title={
                canStartProduction
                  ? t('workbench.startProduction', 'Bắt đầu sản xuất')
                  : t(
                      'workbench.startProductionHint',
                      'Chỉ khả dụng khi Kịch bản và Gate 1 được duyệt',
                    )
              }
            >
              <Rocket className='w-3.5 h-3.5' aria-hidden='true' />
              <span>{t('workbench.startProduction', 'Bắt đầu sản xuất')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT BODY CONTAINER */}
      <div className='w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'>
        {/* ========================================================================= */}
        {/* TAB 1: MA TRẬN TRANG (id="view-progress") */}
        {/* ========================================================================= */}
        {activeSubtab === 'progress' && (
          <div className='space-y-4' id='view-progress'>
            {/* Pre-Production Readiness Bar */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {/* Card 1: Trạng thái Kịch bản */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-stone-700 uppercase tracking-wider'>
                    {t('workbench.readiness.scriptTitle', 'Trạng thái Kịch bản')}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                      currentChapter?.status === 'PreProduction'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {currentChapter?.status === 'PreProduction'
                      ? t('workbench.readiness.scriptPending', 'Chờ duyệt kịch bản')
                      : t('workbench.readiness.scriptApproved', 'Đã gửi duyệt')}
                  </span>
                </div>
                <div>
                  <div className='text-base font-bold text-stone-900'>
                    {t('workbench.readiness.scriptLines', {
                      count: currentChapter?.scenesCount ? currentChapter.scenesCount * 12 : 48,
                      defaultValue: '48 dòng thoại',
                    })}
                  </div>
                  <div className='text-xs text-stone-500 mt-0.5'>
                    {t('workbench.readiness.editorFeedback', {
                      count: 3,
                      defaultValue: '3 góp ý từ Editor',
                    })}
                  </div>
                </div>
                <div className='pt-2 border-t border-stone-100 flex items-center justify-between'>
                  <span className='text-xs text-stone-400'>
                    {t('workbench.readiness.scriptVersion', {
                      version: currentChapter?.versionVector || 1.2,
                      defaultValue: 'Phiên bản v1.2',
                    })}
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        `/workspaces/${workspaceId}/series/${seriesId}/script${
                          currentChapterId ? `?chapterId=${currentChapterId}` : ''
                        }`,
                      )
                    }
                    className='text-orange-700 hover:underline text-xs font-medium cursor-pointer'
                  >
                    {t('workbench.readiness.viewScript', 'Xem kịch bản →')}
                  </button>
                </div>
              </div>

              {/* Card 2: Series Bible */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-stone-700 uppercase tracking-wider'>
                    {t('workbench.readiness.bibleTitle', 'Series Bible')}
                  </span>
                  <span className='bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded font-medium'>
                    {t('workbench.readiness.bibleReview', 'Cần rà soát')}
                  </span>
                </div>
                <div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-base font-bold text-stone-900'>
                      {t('workbench.readiness.bibleLocked', {
                        locked: 7,
                        total: 8,
                        defaultValue: '7 / 8 nhân vật',
                      })}
                    </span>
                    <span className='text-xs text-stone-500'>
                      {t('workbench.readiness.bibleSub', 'đã khóa chuẩn')}
                    </span>
                  </div>
                  <div className='text-xs text-stone-600 mt-0.5'>
                    {t('workbench.readiness.bibleDetail', {
                      locked: 7,
                      pending: 1,
                      defaultValue: '7 Đã khóa, 1 Chờ duyệt bản vẽ',
                    })}
                  </div>
                </div>
                <div className='pt-2 border-t border-stone-100 flex items-center justify-between'>
                  <span className='text-xs text-stone-400'>
                    {t('workbench.readiness.nonCrowdCheck', 'Non-Crowd Check')}
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      navigate(`/workspaces/${workspaceId}/series/${seriesId}/bible`)
                    }
                    className='text-orange-700 hover:underline text-xs font-medium cursor-pointer'
                  >
                    {t('workbench.readiness.checkBible', 'Kiểm tra ngay →')}
                  </button>
                </div>
              </div>

              {/* Card 3: Tiến độ Trang truyện */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-stone-700 uppercase tracking-wider'>
                    {t('workbench.readiness.pageProgressTitle', 'Tiến độ Trang truyện')}
                  </span>
                  <span className='text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200'>
                    {t('workbench.readiness.completedBadge', {
                      completed: Math.round(
                        ((currentChapter?.pagesCount || 18) *
                          (currentChapter?.status === 'ChapterApproved' ? 100 : 58)) /
                          100,
                      ),
                      total: currentChapter?.pagesCount || 18,
                      defaultValue: '2/6 trang hoàn tất',
                    })}
                  </span>
                </div>
                <div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-2xl font-bold text-stone-900'>
                      {currentChapter?.status === 'ChapterApproved' ? '100%' : '58%'}
                    </span>
                    <span className='text-xs text-rose-700 font-semibold flex items-center gap-1'>
                      <Flag className='w-3 h-3 text-rose-600' />
                      {t('workbench.readiness.reworkAlert', {
                        rework: 2,
                        flags: 1,
                        defaultValue: '2 cần sửa, 1 cảnh báo ⚑',
                      })}
                    </span>
                  </div>
                  <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1.5'>
                    <div
                      className='bg-orange-600 h-full'
                      style={{
                        width: `${currentChapter?.status === 'ChapterApproved' ? 100 : 58}%`,
                      }}
                    />
                  </div>
                </div>
                <div className='pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500'>
                  <span>{t('workbench.readiness.drawingLoad', 'Khối lượng vẽ')}</span>
                  <span className='font-mono font-medium text-stone-700'>
                    Ch.{currentChapter?.chapterNumber || '01'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2D Task Matrix Table */}
            <div className='rounded-xl bg-white border border-stone-200 shadow-xs overflow-hidden'>
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
                <div className='rounded-xl border border-dashed border-stone-200 bg-[#FCFBF8] p-10 text-center'>
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
            </div>
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
                        seriesTitle: seriesTitle || 'Bộ truyện',
                        defaultValue: `Tổng quan tiến độ các chương: ${seriesTitle || 'Bộ truyện'}`,
                      })}
                    </h3>
                    <span className='px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold'>
                      {seriesDetail?.format || t('workbench.chaptersOverview.bannerBadge', 'Khối Shonen')}
                    </span>
                  </div>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    {t('workbench.chaptersOverview.bannerDesc', {
                      count: chapters.length,
                      defaultValue: `Theo dõi toàn bộ ${chapters.length} chương theo chu kỳ xuất bản tạp chí tuần và Tankōbon`,
                    })}
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
                    {t('workbench.chaptersOverview.kpiVolDesc', 'chương (Vol 1-2)')}
                  </span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {t('workbench.chaptersOverview.kpiSummary', {
                    published: chapters.filter((c) => c.status === 'HandedOffAndPublished' || c.status === 'ChapterApproved').length,
                    inProd: chapters.filter((c) => c.status === 'InProduction').length,
                    defaultValue: `${chapters.filter((c) => c.status === 'HandedOffAndPublished' || c.status === 'ChapterApproved').length} Đã xuất bản, ${chapters.filter((c) => c.status === 'InProduction').length} Đang thực hiện`,
                  })}
                </div>
              </div>

              {/* KPI 2: Tổng số trang hoàn tất */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('workbench.chaptersOverview.kpiCompletedPages', 'Tổng số trang hoàn tất')}</span>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-emerald-700'>
                    {approvedPanels} / {totalPanels || 196}
                  </span>
                  <span className='text-xs text-emerald-700 font-medium'>
                    {completionPercent}%
                  </span>
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
                  <span>{t('workbench.chaptersOverview.kpiSprintFocus', 'Chương trọng tâm Sprint')}</span>
                  <Clock className='w-4 h-4 text-orange-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>
                    CH.{currentChapter?.chapterNumber ? String(currentChapter.chapterNumber).padStart(2, '0') : '01'}
                  </span>
                  <span className='text-xs text-orange-700 font-semibold'>
                    {currentChapter?.title || 'Thức Tỉnh'} (58%)
                  </span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {statusMeta?.label || 'Đang sản xuất'}
                </div>
              </div>

              {/* KPI 4: Hạn bàn giao NXB kế tiếp */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('workbench.chaptersOverview.kpiNextDeadline', 'Hạn bàn giao NXB kế tiếp')}</span>
                  <Calendar className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>
                    {currentChapter?.targetReleaseDate
                      ? new Date(currentChapter.targetReleaseDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : '—'}
                  </span>
                  <span className='text-xs text-stone-500'>Thứ Sáu, 17:00</span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {t('workbench.chaptersOverview.kpiWeeklyIssue', 'Kỳ phát hành Weekly Shonen')}
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
                  {t('workbench.chaptersOverview.filterInProd', {
                    count: chapters.filter((c) => c.status === 'InProduction').length,
                    defaultValue: `Đang sản xuất (${chapters.filter((c) => c.status === 'InProduction').length})`,
                  })}
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
                    count: chapters.filter((c) => c.status === 'HandedOffAndPublished' || c.status === 'ChapterApproved').length,
                    defaultValue: `Đã xuất bản (${chapters.filter((c) => c.status === 'HandedOffAndPublished' || c.status === 'ChapterApproved').length})`,
                  })}
                </button>
              </div>
            </div>

            {/* Grid of Chapter Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
              {filteredChapters.map((chap) => {
                const isCurrent = chap.id === currentChapterId;
                const isPublished = chap.status === 'HandedOffAndPublished' || chap.status === 'ChapterApproved';
                const isInProd = chap.status === 'InProduction';

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
                            {t('workbench.chaptersOverview.publishedBadge', 'Đã xuất bản')}
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
                        {formatChapterLabel(chap.chapterNumber, chap.title || 'Bản thảo')}
                      </h4>
                      <p className='text-xs text-stone-500 line-clamp-2'>
                        {chap.outline || 'Theo dõi chu trình phác thảo, đi nét, lên màu và thoại.'}
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
                          {isPublished
                            ? `${chap.pagesCount || 18} / ${chap.pagesCount || 18} trang (100%)`
                            : isInProd
                              ? '10 / 18 trang (58%)'
                              : '0 / 18 trang (Kịch bản 85%)'}
                        </span>
                      </div>
                      <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                        <div
                          className={`h-full ${
                            isPublished
                              ? 'bg-emerald-600 w-full'
                              : isInProd
                                ? 'bg-orange-600 w-[58%]'
                                : 'bg-amber-500 w-[25%]'
                          }`}
                        />
                      </div>
                      {isInProd && (
                        <div className='flex items-center justify-between text-xs text-amber-800'>
                          <span className='flex items-center gap-1 font-semibold text-rose-700'>
                            <Flag className='w-3 h-3 text-rose-600' />
                            {t('workbench.chaptersOverview.reworkFlags', {
                              rework: 2,
                              defaultValue: '2 cờ sửa',
                            })}
                          </span>
                          <span>Hạn: Thứ Sáu</span>
                        </div>
                      )}
                    </div>

                    {isCurrent ? (
                      <button
                        type='button'
                        onClick={() => handleSwitchSubtab('progress')}
                        className='w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer'
                      >
                        <span>{t('workbench.chaptersOverview.enterChapterBtn', 'Vào chi tiết chương →')}</span>
                      </button>
                    ) : isPublished ? (
                      <button
                        type='button'
                        onClick={() =>
                          navigate(
                            `/workspaces/${workspaceId}/series/${seriesId}/editor/desk?chapterId=${chap.id}`,
                          )
                        }
                        className='w-full py-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer'
                      >
                        <span>{t('workbench.chaptersOverview.viewPrintBtn', 'Xem lại bản in')}</span>
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
                        <span>{t('workbench.chaptersOverview.enterChapterBtn', 'Vào chi tiết chương →')}</span>
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
                      title: currentChapter?.title || 'Bản thảo',
                      count: seriesMembers.length,
                      defaultValue: `${seriesTitle} • Chapter ${currentChapter?.chapterNumber}: ${currentChapter?.title} • ${seriesMembers.length} Thành viên chính phụ trách tiến độ tuần`,
                    })}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2.5'>
                <button
                  type='button'
                  onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/dashboard`)}
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
                  <span className='text-2xl font-bold text-stone-900'>{seriesMembers.length || 5}</span>
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
                  <span className='text-2xl font-bold text-emerald-700'>80%</span>
                  <span className='text-xs text-stone-500'>
                    {t('workbench.crewOverview.kpiReadinessSub', {
                      ready: 4,
                      total: 5,
                      defaultValue: '4/5 sẵn sàng',
                    })}
                  </span>
                </div>
                <div className='text-xs text-amber-700 pt-1 border-t border-stone-100 font-medium'>
                  {t('workbench.crewOverview.kpiReadinessNote', '1 thành viên đang xử lý cờ sửa')}
                </div>
              </div>

              {/* KPI 3: Khối lượng công việc */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('workbench.crewOverview.kpiWorkload', 'Khối lượng công việc (Cap)')}</span>
                  <Clock className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>78%</span>
                  <span className='text-xs text-stone-500'>
                    {t('workbench.crewOverview.kpiWorkloadSub', 'trung bình')}
                  </span>
                </div>
                <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                  <div className='bg-orange-600 h-full w-[78%]' />
                </div>
              </div>

              {/* KPI 4: Nhiệm vụ tuần hoàn tất */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('workbench.crewOverview.kpiWeeklyTasks', 'Nhiệm vụ tuần hoàn tất')}</span>
                  <Check className='w-4 h-4 text-stone-400' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900'>14 / 18</span>
                  <span className='text-xs text-emerald-700 font-medium'>77%</span>
                </div>
                <div className='text-xs text-stone-500 pt-1 border-t border-stone-100'>
                  {t('workbench.crewOverview.kpiWeeklyTasksDeadline', {
                    chapter: currentChapter?.chapterNumber || '01',
                    defaultValue: `Hạn bàn giao Ch.${currentChapter?.chapterNumber || '01'}: Thứ Sáu`,
                  })}
                </div>
              </div>
            </div>

            {/* Crew Roster Table */}
            <div className='bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden'>
              <div className='px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-bold text-stone-900 uppercase tracking-wider'>
                    {t('workbench.crewOverview.rosterTitle', {
                      chapter: currentChapter?.chapterNumber || '01',
                      defaultValue: `Bảng phân bổ nhân sự Chapter ${currentChapter?.chapterNumber || '01'}`,
                    })}
                  </span>
                  <span className='text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono'>
                    {t('workbench.crewOverview.rosterCount', {
                      count: filteredMembers.length,
                      defaultValue: `${filteredMembers.length} Thành viên`,
                    })}
                  </span>
                </div>
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
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-stone-50/70 border-b border-stone-200 text-stone-600 uppercase tracking-wider font-semibold'>
                    <tr>
                      <th className='py-3 px-4'>{t('workbench.crewOverview.colMember', 'Thành viên & Hồ sơ')}</th>
                      <th className='py-3 px-4'>{t('workbench.crewOverview.colRole', 'Vai trò chính')}</th>
                      <th className='py-3 px-4'>{t('workbench.crewOverview.colScope', 'Phạm vi phụ trách')}</th>
                      <th className='py-3 px-4'>{t('workbench.crewOverview.colStatus', 'Trạng thái tiến độ')}</th>
                      <th className='py-3 px-4'>{t('workbench.crewOverview.colLoad', 'Tải công việc')}</th>
                      <th className='py-3 px-4 text-right'>{t('workbench.crewOverview.colActions', 'Thao tác')}</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-stone-200 text-stone-800'>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className='py-6 text-center text-stone-500'>
                          Chưa có thành viên nào trong danh sách.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member, idx) => {
                        const initials = (member.fullName || member.userId || 'PF')
                          .slice(0, 2)
                          .toUpperCase();
                        const isLeader = idx === 0 || member.seriesRole === 'Producer';

                        return (
                          <tr key={member.userId || idx} className='hover:bg-stone-50/60 transition-colors'>
                            <td className='py-3 px-4'>
                              <div className='flex items-center gap-3'>
                                <div className='w-9 h-9 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs shrink-0'>
                                  {initials}
                                </div>
                                <div>
                                  <div className='text-xs font-bold text-stone-900'>
                                    {member.fullName || 'Thành viên'}
                                  </div>
                                  <div className='text-xs text-stone-500 font-mono'>
                                    {member.userId ? `${member.userId.slice(0, 8)}...` : 'user@panelforge.io'}
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
                                ? 'Quản lý Series, duyệt kịch bản & điều phối lịch in'
                                : `Phụ trách công đoạn ${member.seriesRole || 'vẽ'} Chương ${currentChapter?.chapterNumber || '01'}`}
                            </td>
                            <td className='py-3 px-4'>
                              <span className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium'>
                                {isLeader ? 'Chủ nhiệm' : 'Đang vẽ (Đúng lịch)'}
                              </span>
                            </td>
                            <td className='py-3 px-4'>
                              <div className='w-24'>
                                <div className='flex justify-between text-xs mb-1 font-medium'>
                                  <span>{isLeader ? '65%' : '85%'}</span>
                                </div>
                                <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                                  <div
                                    className={`h-full ${isLeader ? 'bg-orange-500 w-[65%]' : 'bg-emerald-600 w-[85%]'}`}
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
            </div>
          </div>
        )}
      </div>

      {/* Start Production Modal */}
      {startProductionOpen && (
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
            onShowToast('Sản xuất bắt đầu', 'Chương đã chuyển sang công đoạn vẽ phác thảo.');
          }}
        />
      )}
    </div>
  );
};

export const ProductionPipelineView = WorkspaceView;
export type ProductionPipelineViewProps = WorkspaceViewProps;
