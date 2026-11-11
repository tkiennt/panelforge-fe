import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Users,
  ExternalLink,
  Loader2,
  Sliders,
  UserCheck,
  AlertCircle,
  Bell,
  CheckCircle2,
  Layers,
  Calendar,
  Compass,
  Check,
  Camera,
  Image as ImageIcon,
  UserPlus,
  LayoutDashboard,
  TrendingDown,
  PenTool,
  Palette,
  Crown,
  Zap,
  Eye,
} from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { notificationService } from '@/services/notification.service';
import {
  seriesService,
  SeriesProgressDto,
  ChapterProgressDto,
  SeriesDetailDto,
  SeriesMemberDto,
} from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { IdentityBanner } from '@/shared/components/IdentityBanner';
import { SeriesImagePickerDialog } from '@/shared/features/series-identity/SeriesImagePickerDialog';
import {
  SeriesAvatarFallback,
  SeriesBannerFallback,
} from '@/shared/features/series-identity/SeriesImageFallbacks';
import { SERIES_BANNER_POSITION } from '@/shared/utils/seriesImagePresets';
import type { SeriesImageKind } from '@/services/series.service';
import { SeriesChaptersModal } from '../modals/SeriesChaptersModal';
import { SeriesMembersModal } from '../modals/SeriesMembersModal';
import { CreateAssignmentModal } from '../modals/CreateAssignmentModal';
import { SeriesBurndownCard } from '../components/SeriesBurndownCard';
import { MangaProject, AssistantRosterItem, ProvenanceLogItem } from '@/types';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';

interface DashboardViewProps {
  /** Vai trò trong workspace hiện tại: chỉ Producer thấy nút đổi avatar/banner Series. */
  workspaceRole?: string | null;
  activeProject?: MangaProject;
  assistants?: AssistantRosterItem[];
  provenanceLogs?: ProvenanceLogItem[];
  onOpenSpreadModal?: () => void;
  onOpenCanvasModal?: () => void;
  onRunAiAudit?: () => void;
  onExportReport?: () => void;
  onConfigureAnchors?: () => void;
  onViewAuditLog?: () => void;
  onManageAssignments?: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

const CHAPTER_STATUS_STYLE: Record<string, { label: string; className: string }> = {
  InProduction: {
    label: 'Đang sản xuất',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Approved: {
    label: 'Đã duyệt',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Published: {
    label: 'Đã phát hành',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  Locked: {
    label: 'Đã khoá',
    className: 'bg-zinc-100 text-zinc-600 border-stone-200',
  },
};

const ROLE_COLOR_MAP: Record<string, string> = {
  WRITER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARTIST: 'bg-blue-50 text-blue-700 border-blue-200',
  LETTERER: 'bg-pink-50 text-pink-700 border-pink-200',
  EDITOR: 'bg-amber-50 text-amber-700 border-amber-200',
  PRODUCER: 'bg-purple-50 text-purple-700 border-purple-200',
  PUBLISHER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const formatReleaseDate = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/**
 * Compact 4-Step Mini-Stepper cho từng chương (Manga Studio Pipeline).
 * Chuỗi 4 công đoạn: Script (Bản thảo) -> Sketch (Phác thảo) -> Ink/Color (Vẽ nét & Màu) -> Done (Hoàn tất).
 */
const ChapterPipelineStepper: React.FC<{
  percentComplete: number;
  status?: string;
}> = ({ percentComplete, status }) => {
  const isFinished = status === 'Approved' || status === 'Published' || percentComplete >= 100;

  let currentStageIndex = 0;
  if (isFinished) {
    currentStageIndex = 3;
  } else if (percentComplete >= 66) {
    currentStageIndex = 2;
  } else if (percentComplete >= 33) {
    currentStageIndex = 1;
  } else {
    currentStageIndex = 0;
  }

  const stages = [
    { label: 'Bản thảo', short: 'Script', icon: BookOpen },
    { label: 'Phác thảo', short: 'Sketch', icon: PenTool },
    { label: 'Vẽ nét & màu', short: 'Ink/Color', icon: Palette },
    { label: 'Hoàn tất', short: 'Done', icon: CheckCircle2 },
  ];

  return (
    <div
      className='flex items-center gap-1 sm:gap-2 shrink-0 py-0.5'
      aria-label={`Tiến trình chương: ${percentComplete}%`}
    >
      {stages.map((st, idx) => {
        const isReached = isFinished || idx <= currentStageIndex;
        const isCurrent = !isFinished && idx === currentStageIndex;
        const IconComponent = st.icon;

        return (
          <React.Fragment key={st.label}>
            {idx > 0 && (
              <div
                className={`h-[2px] w-4 sm:w-6 md:w-8 lg:w-10 rounded-full transition-colors ${
                  idx <= currentStageIndex || isFinished
                    ? 'bg-studio-accent'
                    : 'bg-zinc-200'
                }`}
              />
            )}
            <div
              className={`relative flex items-center justify-center transition-colors w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${
                isCurrent
                  ? 'bg-studio-accent text-white ring-2 ring-studio-accent/30 shadow-xs'
                  : isReached
                  ? 'bg-studio-accent text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
              }`}
              title={`${st.label} (${st.short}): ${isReached ? 'Đã hoàn thành / Đang thực hiện' : 'Chưa bắt đầu'}`}
            >
              <IconComponent className='w-3 h-3 sm:w-3.5 sm:h-3.5' />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspaceRole,
  activeProject,
  onRunAiAudit = () => {},
  onShowToast = (_title?: string, _desc?: string) => {},
}) => {
  const { t } = useTranslation('production');
  const navigate = useNavigate();
  const { workspaceId, seriesId: routeSeriesId } = useParams<{
    workspaceId: string;
    seriesId: string;
  }>();
  const seriesId = routeSeriesId || activeProject?.id;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<SeriesProgressDto | null>(null);
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalChapter, setAssignModalChapter] = useState<{
    id: string;
    number?: number | string;
  } | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'chapters' | 'team' | 'reports'>('all');

  // Entrance animation played state - ensures entrance animations only execute once on initial mount
  const [hasAnimatedMount, setHasAnimatedMount] = useState(false);

  // Ảnh nhận diện Series: dialog đổi avatar/banner (chỉ Producer; Backend vẫn kiểm quyền)
  const [imageDialogKind, setImageDialogKind] = useState<SeriesImageKind | null>(null);
  const canManageSeriesImages = String(workspaceRole ?? '').toUpperCase() === 'PRODUCER';

  // Mark entrance animation sequence as complete after 1000ms
  useEffect(() => {
    if (!hasAnimatedMount) {
      const timer = setTimeout(() => {
        setHasAnimatedMount(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasAnimatedMount]);

  const workspaceName = useMemo(() => {
    try {
      const stored = localStorage.getItem('activeWorkspace');
      return stored ? JSON.parse(stored).name || 'Studio Workspace' : 'Studio Workspace';
    } catch {
      return 'Studio Workspace';
    }
  }, []);

  // Quản lý thành viên / Đội ngũ Series
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [seriesMembers, setSeriesMembers] = useState<SeriesMemberDto[]>([]);

  const fetchProgress = useCallback(async () => {
    if (!seriesId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [prog, detail, members] = await Promise.all([
        seriesService.getSeriesProgress(seriesId),
        seriesService.getSeriesById(seriesId).catch(() => null),
        seriesService.getSeriesMembers(workspaceId || '', seriesId).catch(() => []),
      ]);
      setProgress(prog);
      setSeriesDetail(detail);
      setSeriesMembers(members);
      if (prog.chapters.length > 0) {
        setSelectedChapterId((prev) =>
          prev && prog.chapters.some((c) => c.chapterId === prev)
            ? prev
            : prog.chapters[0].chapterId,
        );
      }
    } catch (err: any) {
      const msg = err.message || t('dashboard.kpi.loadError', 'Không thể tải tiến độ Series.');
      setError(msg);
      onShowToast('Lỗi tiến độ', msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, workspaceId, onShowToast, t]);

  useEffect(() => {
    void fetchProgress();
  }, [fetchProgress]);

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await notificationService.sendReminders();
      onShowToast(
        'Thông báo nhắc hạn',
        res.created > 0
          ? `Đã gửi ${res.created} thông báo nhắc hạn cho các công việc & yêu cầu sửa quá hạn.`
          : 'Hệ thống đã kiểm tra: tất cả người phụ trách đã được gửi thông báo gần đây.',
      );
    } catch {
      onShowToast('Thông báo', 'Đã yêu cầu hệ thống gửi thông báo nhắc hạn.');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleAuditClick = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      onRunAiAudit();
      onShowToast('Kiểm tra nhất quán AI', 'Đã hoàn tất kiểm tra tính nhất quán Model Continuity.');
    }, 1200);
  };

  // KPIs
  const {
    overallPercent,
    totalPanels,
    totalApprovedPanels,
    inProdChapters,
    approvedChapters,
    publishedChapters,
    totalChapters,
    waitingReviewTotal,
    overdueTotal,
    overdueAssignmentsCount,
    overdueChangeRequestsCount,
  } = useMemo(() => {
    if (!progress || !progress.chapters || progress.chapters.length === 0) {
      return {
        overallPercent: 0,
        totalPanels: 0,
        totalApprovedPanels: 0,
        inProdChapters: 0,
        approvedChapters: 0,
        publishedChapters: 0,
        totalChapters: 0,
        waitingReviewTotal: 0,
        overdueTotal: 0,
        overdueAssignmentsCount: 0,
        overdueChangeRequestsCount: 0,
      };
    }

    const tPanels = progress.chapters.reduce((sum, c) => sum + (c.panelCount || 0), 0);
    const avgPercent = Math.round(
      progress.chapters.reduce((sum, c) => sum + (c.percentComplete || 0), 0) /
        progress.chapters.length,
    );
    const tApproved = progress.chapters.reduce((sum, c) => {
      if (!c.stages || c.stages.length === 0) return sum;
      const lastStage = c.stages[c.stages.length - 1];
      return sum + (lastStage?.approved || 0);
    }, 0);

    const inProd = progress.chapters.filter((c) => c.status === 'InProduction').length;
    const approved = progress.chapters.filter((c) => c.status === 'Approved').length;
    const published = progress.chapters.filter((c) => c.status === 'Published').length;

    const waiting = (progress.workload || []).reduce((sum, w) => sum + (w.waitingReview || 0), 0);
    const overdueAsg = progress.overdue?.length || 0;
    const overdueCr = progress.overdueChangeRequests?.length || 0;
    const overdue = overdueAsg + overdueCr;

    return {
      overallPercent: avgPercent,
      totalPanels: tPanels,
      totalApprovedPanels: tApproved,
      inProdChapters: inProd,
      approvedChapters: approved,
      publishedChapters: published,
      totalChapters: progress.chapters.length,
      waitingReviewTotal: waiting,
      overdueTotal: overdue,
      overdueAssignmentsCount: overdueAsg,
      overdueChangeRequestsCount: overdueCr,
    };
  }, [progress]);

  // Selected chapter for stage breakdown
  const selectedChapter: ChapterProgressDto | undefined = useMemo(() => {
    if (!progress?.chapters?.length) return undefined;
    if (!selectedChapterId) return progress.chapters[0];
    return progress.chapters.find((c) => c.chapterId === selectedChapterId) || progress.chapters[0];
  }, [progress, selectedChapterId]);

  // Active production chapter for detailed cockpit view
  const activeProductionChapter: ChapterProgressDto | undefined = useMemo(() => {
    if (!progress?.chapters?.length) return undefined;
    return (
      progress.chapters.find(
        (c) => c.status === 'InProduction' || c.status === 'Draft' || c.status === 'Review',
      ) || progress.chapters[0]
    );
  }, [progress]);

  const seriesTitle = seriesDetail?.title || activeProject?.title || 'Bộ truyện';

  return (
    <PageContainer className='w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6 pb-16 font-sans text-studio-ink min-w-0'>
      {/* Scoped CSS keyframes for Manga Cover entrance sequence & manuscript ink motions */}
      <style>{`
        @keyframes mangaCoverSpreadEnter {
          0% {
            opacity: 0.88;
            transform: translateY(10px) scale(0.995);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes mangaPortraitReveal {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes mangaInfoReveal {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pf-ink-bleed-title {
          filter: url(#pf-manuscript-ink-bleed);
          color: #1c1917;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: subpixel-antialiased;
        }
        @supports not (filter: url(#pf-manuscript-ink-bleed)) {
          .pf-ink-bleed-title {
            filter: none;
          }
        }

        @keyframes brushWipeReveal {
          0% {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
          }
          20% {
            opacity: 0.95;
          }
          100% {
            clip-path: inset(0 0% 0 0);
            opacity: 0.82;
          }
        }

        .pf-cover-enter {
          animation: mangaCoverSpreadEnter 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .pf-portrait-enter {
          animation: mangaPortraitReveal 450ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both;
        }

        .pf-info-enter {
          animation: mangaInfoReveal 450ms cubic-bezier(0.16, 1, 0.3, 1) 180ms both;
        }

        .pf-brush-wipe {
          clip-path: inset(0 100% 0 0);
          animation: brushWipeReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 180ms forwards;
          will-change: clip-path, opacity;
        }

        .pf-editorial-card {
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease-out;
        }
        @media (hover: hover) and (pointer: fine) {
          .pf-editorial-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px -4px rgba(68, 64, 60, 0.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pf-cover-enter,
          .pf-portrait-enter,
          .pf-info-enter,
          .pf-brush-wipe {
            animation: none !important;
            transform: none !important;
            opacity: 0.82 !important;
            clip-path: none !important;
          }
          .pf-editorial-card {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* SVG Filter cho hiệu ứng mực in loang sần mép (Manga Manuscript Ink Bleed) */}
      <svg
        width='0'
        height='0'
        className='absolute pointer-events-none -z-50 overflow-hidden'
        aria-hidden='true'
        focusable='false'
      >
        <defs>
          <filter
            id='pf-manuscript-ink-bleed'
            x='-10%'
            y='-10%'
            width='120%'
            height='120%'
            filterUnits='objectBoundingBox'
          >
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.065 0.065'
              numOctaves='2'
              seed='23'
              result='paperGrain'
            />
            <feDisplacementMap
              in='SourceGraphic'
              in2='paperGrain'
              scale='1.2'
              xChannelSelector='R'
              yChannelSelector='G'
              result='raggedEdge'
            />
            <feMerge>
              <feMergeNode in='raggedEdge' />
              <feMergeNode in='SourceGraphic' opacity='0.92' />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* ========================================================================= */}
      {/* 1. NHẬN DIỆN SERIES: banner ngang + avatar vuông (độc lập với bìa dọc)       */}
      {/* ========================================================================= */}
      <IdentityBanner
        size='compact'
        ariaLabel={t('dashboard.identity.bannerAria', 'Nhận diện bộ truyện và điều phối')}
        testId='series-banner'
        background={
          seriesDetail?.bannerUrl ? (
            <AuthenticatedImage
              key={seriesDetail.bannerUrl}
              src={seriesDetail.bannerUrl}
              alt=''
              data-testid='series-banner-img'
              className='w-full h-full object-cover'
              style={{ objectPosition: SERIES_BANNER_POSITION }}
              fallback={<SeriesBannerFallback />}
            />
          ) : (
            <SeriesBannerFallback />
          )
        }
        topLeft={
          canManageSeriesImages && seriesId ? (
            <button
              type='button'
              onClick={() => setImageDialogKind('banner')}
              data-testid='change-series-banner-btn'
              className='inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-studio-paper-card/90 hover:bg-white border border-studio-line px-3 text-xs font-semibold text-studio-ink shadow-xs backdrop-blur-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
            >
              <ImageIcon className='w-3.5 h-3.5 text-studio-accent-dark' aria-hidden='true' />
              {t('dashboard.identity.changeBanner', 'Đổi banner Series')}
            </button>
          ) : undefined
        }
        avatar={
          <div className='relative'>
            <div className='w-24 sm:w-28 lg:w-32 aspect-[3/4] rounded-xl sm:rounded-2xl border-[3px] border-[#FCFBF8] bg-studio-paper-card p-0.5 shadow-[0_8px_24px_rgba(28,25,23,0.25)] overflow-hidden shrink-0'>
              {seriesDetail?.avatarUrl ? (
                <AuthenticatedImage
                  key={seriesDetail.avatarUrl}
                  src={seriesDetail.avatarUrl}
                  alt={t('dashboard.identity.avatarAlt', { title: seriesTitle, defaultValue: `Avatar ${seriesTitle}` })}
                  data-testid='series-avatar-img'
                  className='w-full h-full rounded-[13px] object-cover'
                  fallback={<SeriesAvatarFallback title={seriesTitle} />}
                />
              ) : (
                <SeriesAvatarFallback title={seriesTitle} />
              )}
            </div>
            {canManageSeriesImages && seriesId && (
              <button
                type='button'
                onClick={() => setImageDialogKind('avatar')}
                aria-label={t('dashboard.identity.changeAvatar', 'Đổi avatar Series')}
                title={t('dashboard.identity.changeAvatar', 'Đổi avatar Series')}
                data-testid='change-series-avatar-btn'
                className='absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-studio-paper-card border-2 border-studio-line text-studio-ink hover:border-[#F97316] hover:text-studio-accent-dark flex items-center justify-center shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
              >
                <Camera className='w-4 h-4' aria-hidden='true' />
              </button>
            )}
          </div>
        }
      >
        {/* Ngữ cảnh & đồng bộ phong cách bản thảo Manga */}
        <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500'>
          <div className='flex items-center gap-1.5 min-w-0'>
            <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100/70 border border-orange-200/80 text-studio-accent-dark text-[9.5px] font-semibold'>
              {t('dashboard.identity.contextStudio', 'Bản thảo Studio')}
            </span>
            <span className='text-zinc-400'>/</span>
            <span className='font-medium text-zinc-600 truncate'>
              {workspaceName}
            </span>
          </div>
          {loading ? (
            <span className='inline-flex items-center gap-1.5 text-studio-accent-dark'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              {t('dashboard.identity.loading', 'Đang nạp…')}
            </span>
          ) : progress?.generatedAt ? (
            <span className='inline-flex items-center gap-1.5 text-zinc-500'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-2xs' />
              <span>{t('dashboard.identity.synced', { time: new Date(progress.generatedAt).toLocaleTimeString('vi-VN'), defaultValue: `Đồng bộ: ${new Date(progress.generatedAt).toLocaleTimeString('vi-VN')}` })}</span>
            </span>
          ) : null}
        </div>

        {/* Tiêu đề truyện Manga với nét cọ Sumi-e & con dấu ấn triện */}
        <div className='relative inline-block max-w-full'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1
              style={{ fontFamily: "'Playfair Display', 'Lora', 'Be Vietnam Pro', Georgia, serif" }}
              className='pf-ink-bleed-title relative z-10 text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight leading-tight break-words [overflow-wrap:anywhere]'
              data-testid='series-title'
            >
              <span className='sr-only'>{t('dashboard.identity.seriesOverviewSr', 'Tổng quan bộ truyện: ')}</span>
              {seriesTitle}
            </h1>
            <span
              title='Tác phẩm đang được xuất bản kỳ dài tập (Serial Manga Edition)'
              className='inline-flex items-center px-1.5 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 text-[10px] font-serif font-semibold shadow-2xs select-none'
            >
              連載 · Serial
            </span>
          </div>
          <svg
            className={`absolute -bottom-1.5 left-0 w-full max-w-[320px] h-[14px] pointer-events-none z-0 overflow-visible ${
              !hasAnimatedMount ? 'pf-brush-wipe' : ''
            }`}
            viewBox='0 0 340 18'
            fill='none'
            aria-hidden='true'
          >
            <path
              d='M 2 11 C 18 6.5, 48 9.0, 92 7.5 C 146 5.8, 218 10.0, 276 7.2 C 308 5.8, 328 7.6, 338 6.2 C 334 9.5, 304 12.0, 268 11.4 C 208 10.8, 142 14.0, 88 12.2 C 48 11.0, 16 13.0, 2 11 Z'
              fill='#F97316'
              opacity='0.85'
            />
          </svg>
        </div>

        {/* Phân loại & Thông số tác phẩm dạng tem nhãn ấn bản truyện tranh */}
        <div className='flex flex-wrap items-center gap-1.5 text-[11px] font-semibold font-mono text-zinc-600'>
          {seriesDetail?.storyArc && (
            <span className='px-2 py-0.5 rounded-md bg-white text-zinc-800 border border-zinc-200 shadow-2xs break-words'>
              {seriesDetail.storyArc}
            </span>
          )}
          {(seriesDetail?.format || activeProject?.format) && (
            <span className='px-2 py-0.5 rounded-md bg-orange-50 text-studio-accent-dark border border-orange-200/90 shadow-2xs font-bold'>
              {seriesDetail?.format || activeProject?.format}
            </span>
          )}
          {(seriesDetail?.genre || activeProject?.genres?.[0]) && (
            <span className='px-2 py-0.5 rounded-md bg-white text-zinc-800 border border-zinc-200 shadow-2xs'>
              {seriesDetail?.genre || activeProject?.genres?.[0]}
            </span>
          )}
          {seriesDetail?.readingDirection && (
            <span className='px-2 py-0.5 rounded-md bg-white text-zinc-700 border border-zinc-200 shadow-2xs'>
              {seriesDetail.readingDirection === 'Vertical' ? t('dashboard.identity.readingVertical', 'Cuộn dọc') : t('dashboard.identity.readingRtl', 'Phải sang trái')}
            </span>
          )}
          <span className='px-2 py-0.5 rounded-md bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs'>
            {t('dashboard.identity.chaptersCount', { count: progress?.chapters?.length || seriesDetail?.chaptersCount || 0, defaultValue: `${progress?.chapters?.length || seriesDetail?.chaptersCount || 0} Chương` })}
          </span>
        </div>

        {(() => {
          const raw = seriesDetail?.synopsis || activeProject?.subtitle;
          const text = typeof raw === 'string' ? raw.trim() : '';
          if (
            !text ||
            text.toUpperCase() === 'N/A' ||
            text.toLowerCase() === 'null' ||
            text.toLowerCase() === 'undefined'
          ) {
            return null;
          }
          return (
            <p className='text-xs sm:text-[13px] text-zinc-700 leading-relaxed max-w-2xl break-words line-clamp-2'>
              {text}
            </p>
          );
        })()}

        {/* Thanh tác vụ quản lý dự án & điều phối Studio (Đã bỏ Kiểm tra AI) */}
        <div className='flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-200/60'>
          <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
            {seriesId && (
              <button
                type='button'
                onClick={() => setIsChapterModalOpen(true)}
                className='focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-accent focus-ring h-8.5 px-3 rounded-lg bg-white hover:bg-orange-50 border border-zinc-200 hover:border-studio-accent-border text-zinc-800 hover:text-studio-accent-dark text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs'
                title='Quản lý danh sách chương, kiểm duyệt và điều phối tập truyện'
              >
                <BookOpen className='w-3.5 h-3.5 text-studio-accent' />
                <span>{t('dashboard.identity.manageChaptersBtn', 'Quản Lý Chương (Duyệt)')}</span>
              </button>
            )}
            <button
              type='button'
              onClick={() => void fetchProgress()}
              disabled={loading}
              className='focus-ring h-8.5 px-2.5 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900 text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs'
              title='Làm mới dữ liệu tiến độ từ máy chủ'
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className='sr-only sm:not-sr-only'>{t('dashboard.identity.refreshBtn', 'Làm mới')}</span>
            </button>
          </div>

          {/* Nút hành động chính (Primary CTA) */}
          {workspaceId && seriesId && (
            <button
              type='button'
              onClick={() =>
                navigate(
                  `/workspaces/${workspaceId}/series/${seriesId}/workspace${
                    selectedChapterId ? `?chapterId=${selectedChapterId}` : ''
                  }`,
                )
              }
              className='focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-accent focus-ring h-8.5 px-4 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors hover:shadow-sm focus-ring'
            >
              <span>{t('dashboard.identity.openPipeline', 'Mở Quy trình sản xuất')}</span>
              <ArrowRight className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      </IdentityBanner>

      {imageDialogKind && seriesId && (
        <SeriesImagePickerDialog
          seriesId={seriesId}
          kind={imageDialogKind}
          currentUrl={
            (imageDialogKind === 'avatar' ? seriesDetail?.avatarUrl : seriesDetail?.bannerUrl) ??
            null
          }
          onClose={() => setImageDialogKind(null)}
          onApplied={(url) => {
            setSeriesDetail((d) =>
              d ? { ...d, [imageDialogKind === 'avatar' ? 'avatarUrl' : 'bannerUrl']: url } : d,
            );
            onShowToast(
              t('dashboard.identity.imageSavedTitle', 'Đã lưu ảnh'),
              imageDialogKind === 'avatar'
                ? t('dashboard.identity.avatarSavedDesc', 'Avatar Series đã cập nhật.')
                : t('dashboard.identity.bannerSavedDesc', 'Banner Series đã cập nhật.'),
            );
          }}
        />
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div
          role='alert'
          className='p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between gap-3'
        >
          <div className='flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 shrink-0 text-red-500' />
            <span>{error}</span>
          </div>
          <button
            type='button'
            onClick={() => void fetchProgress()}
            className='px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold text-xs transition-colors cursor-pointer'
          >
            {t('dashboard.kpi.retry', 'Thử lại')}
          </button>
        </div>
      )}

      {/* 2. Top Summary Cards (Pulse Metrics - Manga Studio Design System) */}
      <section
        aria-label='Chỉ số tổng quan'
        className='grid grid-cols-1 lg:grid-cols-12 gap-4.5'
      >
        {/* Card 1: Tiến Độ Toàn Series (Overall Progress - 4 columns on lg ~ 33%) */}
        <div className='lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs hover:border-studio-accent/50 transition-colors flex flex-col justify-between space-y-4'>
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-zinc-500 mb-1'>
              <span className='font-semibold text-xs text-zinc-700'>
                {t('dashboard.kpi.overallTitle', 'Tiến Độ Toàn Series')}
              </span>
              <span className='inline-flex items-center gap-1 text-studio-accent-dark bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full text-[11px] font-bold'>
                <TrendingUp className='w-3 h-3 text-studio-accent' /> {t('dashboard.kpi.completedBadge', 'Hoàn thiện')}
              </span>
            </div>
            <div className='flex items-baseline gap-2 mt-2'>
              <span className='text-3xl sm:text-4xl font-extrabold font-sans tabular-nums text-zinc-900'>
                {loading ? '—' : `${overallPercent}%`}
              </span>
              <span className='text-xs text-zinc-500 font-medium'>
                {t('dashboard.kpi.averageDesc', 'trung bình toàn series')}
              </span>
            </div>
          </div>

          <div className='pt-3 border-t border-zinc-100 space-y-2'>
            <div className='w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200/80'>
              <div
                className='bg-studio-accent h-full rounded-full transition-colors shadow-2xs'
                style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
              />
            </div>
            <div className='text-[11px] text-zinc-500 flex items-center justify-between'>
              <span>
                <strong className='text-zinc-900 font-semibold'>{totalApprovedPanels}</strong>{' '}
                {t('dashboard.kpi.approvedPanels', { count: totalApprovedPanels, defaultValue: `${totalApprovedPanels} panel đã duyệt` })}
              </span>
              <span>{t('dashboard.kpi.totalPanels', { count: totalPanels, defaultValue: `Tổng: ${totalPanels} panel` })}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Chương Đang Sản Xuất (Chi tiết sản xuất & Điều phối công đoạn - 8 columns on lg ~ 67%) */}
        <div className='lg:col-span-8 bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs hover:border-studio-accent/50 transition-colors flex flex-col justify-between space-y-4'>
          <div>
            {/* Header: Title + Active Chapter Badge + Total count */}
            <div className='flex items-center justify-between text-xs font-semibold text-zinc-500 mb-3'>
              <div className='flex items-center gap-2'>
                <span className='font-semibold text-xs text-zinc-700'>
                  {t('dashboard.kpi.inProdTitle', 'Chương đang sản xuất')}
                </span>
                <span className='text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1'>
                  <span className='w-1.5 h-1.5 rounded-full bg-studio-accent motion-safe:animate-pulse' />
                  {t('dashboard.kpi.inProdBadge', { count: inProdChapters, defaultValue: `${inProdChapters} Đang sản xuất` })}
                </span>
              </div>
              <span className='text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-semibold'>
                {t('dashboard.kpi.totalChaptersBadge', { count: totalChapters, defaultValue: `Tổng số: ${totalChapters} Chương` })}
              </span>
            </div>

            {/* Chi tiết nội dung: 2 phân khu trực quan (Trọng tâm sản xuất + Phân bổ vòng đời) */}
            <div className='grid grid-cols-1 sm:grid-cols-12 gap-3.5'>
              {/* Phân khu 1: Chương trọng tâm đang chạy (7 cột) */}
              <div className='sm:col-span-7 p-3.5 bg-zinc-50/70 rounded-xl border border-zinc-200 space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-[10.5px] font-semibold text-zinc-500 flex items-center gap-1.5'>
                    <Sparkles className='w-3 h-3 text-studio-accent' /> {t('dashboard.kpi.focusProgress', 'Trọng tâm tiến độ')}
                  </span>
                  {activeProductionChapter && (
                    <span className='text-xs font-mono font-bold text-zinc-900 tabular-nums'>
                      {activeProductionChapter.percentComplete}%
                    </span>
                  )}
                </div>

                {activeProductionChapter ? (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-9 h-9 rounded-lg bg-zinc-900 text-white font-bold text-xs flex flex-col items-center justify-center shrink-0 leading-none shadow-2xs'>
                        <span className='text-[8px] opacity-75 font-medium'>{t('dashboard.kpi.chapterFocusFallback', { number: '', defaultValue: 'Tập' })}</span>
                        <span className='text-xs font-bold mt-0.5'>
                          {String(activeProductionChapter.chapterNumber).padStart(2, '0')}
                        </span>
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='text-xs font-bold text-zinc-900 truncate'>
                          {activeProductionChapter.title
                            ? t('dashboard.kpi.chapterFocusTitle', { title: activeProductionChapter.title, defaultValue: `Tiến độ: ${activeProductionChapter.title}` })
                            : t('dashboard.kpi.chapterFocusFallback', { number: activeProductionChapter.chapterNumber, defaultValue: `Tập ${activeProductionChapter.chapterNumber}` })}
                        </div>
                        <div className='text-[11px] text-zinc-500 flex flex-wrap items-center gap-2 mt-1'>
                          <span className='px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium'>
                            {t('dashboard.kpi.focusPages', { count: activeProductionChapter.pageCount, defaultValue: `${activeProductionChapter.pageCount} trang` })}
                          </span>
                          <span className='px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium'>
                            {t('dashboard.kpi.focusPanels', { count: activeProductionChapter.panelCount, defaultValue: `${activeProductionChapter.panelCount} panel` })}
                          </span>
                          {activeProductionChapter.targetReleaseDate && (
                            <span className='px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/60 font-medium'>
                              {t('dashboard.kpi.focusDue', { date: formatReleaseDate(activeProductionChapter.targetReleaseDate), defaultValue: `Hạn: ${formatReleaseDate(activeProductionChapter.targetReleaseDate)}` })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mini progress bar cho chương trọng tâm */}
                    <div className='w-full bg-zinc-200/80 h-1.5 rounded-full overflow-hidden'>
                      <div
                        className='bg-studio-accent h-full rounded-full transition-colors'
                        style={{ width: `${Math.min(100, Math.max(0, activeProductionChapter.percentComplete || 0))}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className='text-xs text-zinc-400 italic py-2'>{t('dashboard.kpi.noChapters', 'Chưa có chương nào trong Series')}</p>
                )}
              </div>

              {/* Phân khu 2: Phân bố vòng đời các chương (5 cột) */}
              <div className='sm:col-span-5 grid grid-cols-3 gap-2 text-center'>
                <div className='p-2 bg-zinc-50/70 rounded-xl border border-zinc-200 flex flex-col justify-center'>
                  <div className='text-base font-bold font-mono text-amber-700 leading-tight'>
                    {inProdChapters}
                  </div>
                  <div className='text-[11px] font-bold text-zinc-800 mt-0.5'>{t('dashboard.kpi.inProdStage', 'Đang làm')}</div>
                  <div className='text-[9.5px] text-zinc-500'>{t('dashboard.kpi.inProdSub', 'giai đoạn vẽ')}</div>
                </div>

                <div className='p-2 bg-zinc-50/70 rounded-xl border border-zinc-200 flex flex-col justify-center'>
                  <div className='text-base font-bold font-mono text-emerald-700 leading-tight'>
                    {approvedChapters}
                  </div>
                  <div className='text-[11px] font-bold text-zinc-800 mt-0.5'>{t('dashboard.kpi.approvedStage', 'Đã duyệt')}</div>
                  <div className='text-[9.5px] text-zinc-500'>{t('dashboard.kpi.approvedSub', 'chờ phát hành')}</div>
                </div>

                <div className='p-2 bg-zinc-50/70 rounded-xl border border-zinc-200 flex flex-col justify-center'>
                  <div className='text-base font-bold font-mono text-zinc-600 leading-tight'>
                    {publishedChapters}
                  </div>
                  <div className='text-[11px] font-bold text-zinc-800 mt-0.5'>{t('dashboard.kpi.publishedStage', 'Xuất bản')}</div>
                  <div className='text-[9.5px] text-zinc-500'>{t('dashboard.kpi.publishedSub', 'hoàn tất')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Strip: Gate & Risk Indicators */}
          <div className='pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono'>
            <div className='flex items-center gap-1.5'>
              <span className='text-zinc-500'>{t('dashboard.kpi.gateTitle', 'Cổng Chờ Xét Duyệt')}</span>
              <span className='text-zinc-400'>:</span>
              <strong className='text-amber-700 font-bold px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200'>
                {waitingReviewTotal} <span>{t('dashboard.kpi.gateSubmissions', 'Việc nộp')}</span>
              </strong>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='text-zinc-500'>{t('dashboard.kpi.riskTitle', 'Việc Quá Hạn & Rủi Ro')}</span>
              <span className='text-zinc-400'>:</span>
              <strong className={overdueTotal > 0 ? 'text-red-600 font-bold px-1.5 py-0.5 bg-red-50 rounded border border-red-200' : 'text-emerald-700 font-bold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200'}>
                {t('dashboard.kpi.riskItems', { count: overdueTotal, defaultValue: `${overdueTotal} Mục` })}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation Điều Phối Quản Lý Trong Project Overview */}
      <nav
        aria-label='Phân nhóm quản lý tổng quan'
        className='flex flex-wrap items-center justify-between gap-3 border-b border-studio-line pb-3 pt-1'
      >
        <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('all')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-ring cursor-pointer ${
              activeTab === 'all'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-studio-line shadow-2xs'
            }`}
          >
            <LayoutDashboard className='w-3.5 h-3.5' />
            <span>{t('dashboard.tabs.all', 'Tổng quan toàn diện')}</span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('chapters')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-ring cursor-pointer ${
              activeTab === 'chapters'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-studio-line shadow-2xs'
            }`}
          >
            <BookOpen className='w-3.5 h-3.5' />
            <span>{t('dashboard.tabs.chapters', 'Chương & Công đoạn')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'chapters'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {progress?.chapters?.length || 0}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('team')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-ring cursor-pointer ${
              activeTab === 'team'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-studio-line shadow-2xs'
            }`}
          >
            <Users className='w-3.5 h-3.5' />
            <span>{t('dashboard.tabs.team', 'Đội ngũ & Phân công')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'team'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {seriesMembers.length || 0}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('reports')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-ring cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-studio-line shadow-2xs'
            }`}
          >
            <TrendingDown className='w-3.5 h-3.5' />
            <span>{t('dashboard.tabs.reports', 'Báo cáo Burndown')}</span>
          </button>
        </div>

        <div className='hidden sm:flex items-center gap-2 text-[11px] font-mono text-studio-ink-muted'>
          <span>{t('dashboard.tabs.area', 'Khu vực:')}</span>
          <span className='font-semibold text-studio-ink'>
            {activeTab === 'all' && t('dashboard.tabs.areaAll', 'Tổng quan đầy đủ các phần')}
            {activeTab === 'chapters' && t('dashboard.tabs.areaChapters', 'Chương & Ma trận công đoạn')}
            {activeTab === 'team' && t('dashboard.tabs.areaTeam', 'Phân công nhân sự & Khối lượng')}
            {activeTab === 'reports' && t('dashboard.tabs.areaReports', 'Phân tích tiến độ & Xu hướng')}
          </span>
        </div>
      </nav>

      {/* 3. Tiến Độ Theo Từng Chương (Trọng tâm sản xuất, trải rộng toàn chiều ngang, giữ nguyên toàn bộ chi tiết) */}
      {(activeTab === 'all' || activeTab === 'chapters') && (
        <section aria-label='Tiến độ chương' className='space-y-4'>
          <div className='bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-studio-accent flex items-center justify-center shrink-0 shadow-2xs'>
                  <BookOpen className='w-5 h-5' />
                </div>
                <div>
                  <div className='flex items-center gap-2.5'>
                    <h2 className='text-lg sm:text-xl font-bold text-zinc-900 font-sans'>
                      {t('dashboard.chapters.title', { count: progress?.chapters?.length || 0, defaultValue: `Tiến Độ Theo Từng Chương (${progress?.chapters?.length || 0})` })}
                    </h2>
                  </div>
                  <p className='text-xs text-zinc-500 mt-0.5'>
                    {selectedChapter
                      ? t('dashboard.chapters.viewingSelected', { number: selectedChapter.chapterNumber, defaultValue: `Đang xem: Chương ${selectedChapter.chapterNumber} · Chọn chương để đối chiếu ma trận công đoạn bên dưới` })
                      : t('dashboard.chapters.viewingHint', 'Chọn một chương để xem chi tiết ma trận công đoạn bên dưới')}
                  </p>
                </div>
              </div>

              {seriesId && (
                <div className='flex items-center gap-2 self-start sm:self-auto shrink-0'>
                  <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-semibold text-zinc-700 shadow-2xs'>
                    <BookOpen className='w-3.5 h-3.5 text-studio-accent' />
                    <span>{t('dashboard.chapters.episodes', { count: progress?.chapters?.length || 0, defaultValue: `${progress?.chapters?.length || 0} tập` })}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Chapters list */}
            {!progress?.chapters || progress.chapters.length === 0 ? (
              <div className='py-12 text-center text-xs text-zinc-500 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 space-y-2'>
                <BookOpen className='w-8 h-8 text-zinc-300 mx-auto' />
                <p className='font-semibold text-zinc-700'>{t('dashboard.chapters.empty', 'Chưa có chương nào trong Series này')}</p>
                <p className='text-zinc-400'>{t('dashboard.chapters.emptyHint', 'Hãy tạo chương mới từ danh sách Quản lý Chương.')}</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {progress.chapters.map((ch) => {
                  const isSelected = selectedChapter?.chapterId === ch.chapterId;
                  const statusStyle = CHAPTER_STATUS_STYLE[ch.status] || {
                    label: ch.status,
                    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                  };
                  const formattedRelease = formatReleaseDate(ch.targetReleaseDate);
                  const cleanLabel = formatChapterLabel(ch.chapterNumber, ch.title);
                  const hasPanels = (ch.panelCount || 0) > 0;

                  return (
                    <div
                      key={ch.chapterId}
                      onClick={() => setSelectedChapterId(ch.chapterId)}
                      tabIndex={0}
                      role='button'
                      aria-pressed={isSelected}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedChapterId(ch.chapterId);
                        }
                      }}
                      className={`p-4 rounded-xl border transition-colors text-left cursor-pointer relative group ${
                        isSelected
                          ? 'bg-white border-zinc-300 ring-2 ring-studio-accent/20 shadow-sm'
                          : 'bg-white hover:bg-zinc-50/60 border-zinc-200 hover:border-zinc-300 shadow-xs'
                      }`}
                    >
                      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
                        {/* Chapter Left: Avatar badge + Title + Metadata */}
                        <div className='flex items-center gap-3.5 min-w-0 flex-1'>
                          <div
                            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                              isSelected
                                ? 'bg-studio-accent text-white shadow-orange-500/20'
                                : 'bg-zinc-900 text-white'
                            }`}
                          >
                            <span className='text-[9px] font-semibold opacity-75 leading-none'>
                              {t('dashboard.chapters.episodeLabel', 'TẬP')}
                            </span>
                            <span className='text-sm sm:text-base font-bold font-mono leading-none mt-0.5'>
                              {String(ch.chapterNumber).padStart(2, '0')}
                            </span>
                          </div>

                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2 flex-wrap'>
                              <span className='text-sm sm:text-base font-bold text-zinc-900 tracking-tight truncate'>
                                {cleanLabel}
                              </span>
                              {isSelected && (
                                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-studio-accent border border-orange-200/80 shrink-0'>
                                  {t('dashboard.chapters.selected', 'Đang chọn')}
                                </span>
                              )}
                            </div>

                            <div className='text-xs text-zinc-500 flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1'>
                              {hasPanels ? (
                                <span className='inline-flex items-center gap-1 font-medium'>
                                  <Layers className='w-3 h-3 text-zinc-400' />
                                  {ch.pageCount} trang · {ch.panelCount} panel
                                </span>
                              ) : (
                                <span className='text-zinc-400 italic text-[11px]'>{t('dashboard.chapters.noContent', 'Chưa có nội dung')}</span>
                              )}
                              {formattedRelease && (
                                <span className='inline-flex items-center gap-1 font-medium'>
                                  <Calendar className='w-3 h-3 text-zinc-400' />
                                  {t('dashboard.chapters.due', { date: formattedRelease, defaultValue: `Hạn: ${formattedRelease}` })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chapter Middle: Visual Pipeline Stepper Track */}
                        <div className='hidden sm:flex items-center justify-center px-1'>
                          <ChapterPipelineStepper
                            percentComplete={ch.percentComplete || 0}
                            status={ch.status}
                          />
                        </div>

                        {/* Chapter Right: Badges + Action Buttons */}
                        <div className='flex items-center gap-2 self-start lg:self-center shrink-0'>
                          {ch.overdueAssignments > 0 && (
                            <span className='px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1'>
                              <AlertTriangle className='w-3 h-3' />
                              {t('dashboard.chapters.overdueBadge', { count: ch.overdueAssignments, defaultValue: `${ch.overdueAssignments} Quá hạn` })}
                            </span>
                          )}
                          {(ch.overdueChangeRequests ?? 0) > 0 && (
                            <span className='px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1'>
                              <AlertCircle className='w-3 h-3' />
                              {t('dashboard.chapters.lateReworkBadge', { count: ch.overdueChangeRequests, defaultValue: `${ch.overdueChangeRequests} Sửa trễ` })}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${statusStyle.className}`}
                          >
                            {statusStyle.label}
                          </span>
                          <span className='text-xs font-mono font-bold tabular-nums text-zinc-900 min-w-10 text-right'>
                            {hasPanels ? `${ch.percentComplete}%` : '—'}
                          </span>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignModalChapter({
                                id: ch.chapterId,
                                number: ch.chapterNumber,
                              });
                              setIsAssignModalOpen(true);
                            }}
                            className='px-2.5 py-1 rounded-md bg-white hover:bg-orange-50 text-zinc-700 hover:text-studio-accent border border-zinc-200 hover:border-orange-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs'
                            title={t('dashboard.chapters.assignTooltip', { number: ch.chapterNumber, defaultValue: `Giao việc mới cho Chương ${ch.chapterNumber}` })}
                          >
                            <UserCheck className='w-3.5 h-3.5 text-zinc-500' />
                            <span>{t('dashboard.chapters.assignBtn', 'Giao việc')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Visual Stepper trên mobile */}
                      <div className='sm:hidden flex items-center justify-start overflow-x-auto pt-2 pb-0.5'>
                        <ChapterPipelineStepper
                          percentComplete={ch.percentComplete || 0}
                          status={ch.status}
                        />
                      </div>

                      {/* Progress Bar under chapter card */}
                      <div className='w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mt-3'>
                        <div
                          className={`h-full rounded-full transition-colors ${
                            isSelected
                              ? 'bg-studio-accent'
                              : ch.status === 'Approved' || ch.status === 'Published'
                              ? 'bg-emerald-600'
                              : 'bg-zinc-400'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, ch.percentComplete || 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Đội Ngũ Sản Xuất & Mục Cần Chú Ý (Bố cục 2 cột cân bằng 50/50, loại bỏ hoàn toàn khoảng trống) */}
      {(activeTab === 'all' || activeTab === 'team') && (
        <section aria-label='Đội ngũ và rủi ro' className='grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch'>
          {/* Card Đội Ngũ Sản Xuất */}
          {seriesId && (
            <div className='bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full space-y-4'>
              <div className='space-y-3.5'>
                <div className='flex items-center justify-between border-b border-zinc-100 pb-3'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-studio-accent flex items-center justify-center shrink-0 shadow-2xs'>
                      <Users className='w-4 h-4' />
                    </div>
                    <div>
                      <h3 className='text-xs sm:text-sm font-bold text-zinc-900 font-sans'>
                        {t('dashboard.team.title', { count: seriesMembers.length })}
                      </h3>
                      <p className='text-[11px] text-zinc-500'>{t('dashboard.team.subtitle')}</p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => setIsMembersModalOpen(true)}
                    className='text-xs font-semibold text-studio-accent hover:text-studio-accent-hover hover:underline cursor-pointer flex items-center gap-1'
                  >
                    <span>{t('dashboard.team.manage')}</span>
                    <ArrowRight className='w-3 h-3' />
                  </button>
                </div>

                {seriesMembers.length === 0 ? (
                  <div className='py-8 text-center text-xs text-zinc-400 italic bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200'>
                    {t('dashboard.team.empty')}
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {seriesMembers.slice(0, 5).map((member) => {
                      const roleUpper = String(member.seriesRole || (member as any).role || 'ARTIST').toUpperCase();
                      const roleStyle =
                        ROLE_COLOR_MAP[roleUpper] || 'bg-zinc-100 text-zinc-800 border-zinc-200';

                      const RoleIcon =
                        roleUpper === 'PRODUCER'
                          ? Crown
                          : roleUpper === 'ARTIST'
                          ? Palette
                          : roleUpper === 'EDITOR'
                          ? PenTool
                          : Users;

                      return (
                        <div
                          key={member.id || member.userId}
                          className='flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white hover:bg-zinc-50/80 border border-zinc-200 transition-colors text-xs shadow-2xs group'
                        >
                          <div className='flex items-center gap-2.5 min-w-0'>
                            <div className='w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-studio-accent/20 group-hover:scale-105 transition-transform'>
                              {(member.fullName || member.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className='min-w-0'>
                              <div className='font-bold text-zinc-900 truncate leading-tight'>
                                {member.fullName || member.email}
                              </div>
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-medium border mt-0.5 ${roleStyle}`}
                              >
                                {member.seriesRole || (member as any).role || t('dashboard.team.memberFallback')}
                              </span>
                            </div>
                          </div>

                          <div
                            className='w-7 h-7 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-500 shrink-0'
                            title={member.seriesRole || (member as any).role || t('dashboard.team.memberFallback')}
                          >
                            <RoleIcon className='w-3.5 h-3.5 text-zinc-500' />
                          </div>
                        </div>
                      );
                    })}

                    {seriesMembers.length > 5 && (
                      <p className='text-[10.5px] font-mono text-zinc-400 text-center pt-0.5'>
                        {t('dashboard.team.moreMembers', { count: seriesMembers.length - 5 })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card Mục Cần Chú Ý & Rủi Ro */}
          <div className='bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full space-y-4'>
            <div className='space-y-3.5 flex-1 flex flex-col'>
              <div className='flex items-center justify-between border-b border-zinc-100 pb-3'>
                <div className='flex items-center gap-2.5'>
                  <div className='w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-studio-accent flex items-center justify-center shrink-0 shadow-2xs'>
                    <AlertTriangle className='w-4 h-4' />
                  </div>
                  <div>
                    <h2 className='text-xs sm:text-sm font-bold text-zinc-900 font-sans'>
                      {t('dashboard.attention.title')}
                    </h2>
                    <p className='text-[11px] text-zinc-500'>{t('dashboard.attention.subtitle')}</p>
                  </div>
                </div>
                {overdueTotal > 0 ? (
                  <span className='text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200'>
                    {t('dashboard.attention.itemsCount', { count: overdueTotal })}
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200'>
                    <CheckCircle2 className='w-3 h-3' />
                    <span>{t('dashboard.attention.stable')}</span>
                  </span>
                )}
              </div>

              {/* Overdue Change Requests Section (if any) */}
              {progress?.overdueChangeRequests && progress.overdueChangeRequests.length > 0 && (
                <div
                  data-testid='overdue-cr-banner'
                  className='bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex items-center gap-1.5'>
                      <AlertCircle className='w-4 h-4 text-amber-700 shrink-0' />
                      <h3 className='text-xs font-bold text-amber-950 font-sans'>
                        {t('dashboard.attention.overdueCrTitle', { count: progress.overdueChangeRequests.length })}
                      </h3>
                    </div>
                    <button
                      type='button'
                      onClick={handleSendReminders}
                      disabled={sendingReminders}
                      className='px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50'
                      title={t('dashboard.attention.sendReminders')}
                    >
                      {sendingReminders ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        <Bell className='w-3 h-3' />
                      )}
                      <span>{sendingReminders ? t('dashboard.attention.sendingReminders') : t('dashboard.attention.sendReminders')}</span>
                    </button>
                  </div>

                  <div className='space-y-2'>
                    {progress.overdueChangeRequests.map((cr) => (
                      <div
                        key={cr.changeRequestId}
                        data-testid={`overdue-cr-card-${cr.changeRequestId}`}
                        className='p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs space-y-1.5 text-xs'
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <div className='font-semibold text-zinc-900 line-clamp-1'>
                            {cr.description}
                          </div>
                          <span className='px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-100 text-amber-800 shrink-0'>
                            {t('dashboard.attention.crBadge')}
                          </span>
                        </div>
                        <div className='flex items-center justify-between text-[11px] text-zinc-600 font-sans'>
                          <span>
                            {t('dashboard.attention.responsible', { name: cr.responsibleUserName })}
                          </span>
                          <span className='text-red-600 font-bold'>
                            {t('dashboard.attention.due', { date: cr.dueDate && !isNaN(new Date(cr.dueDate).getTime()) ? new Date(cr.dueDate).toLocaleDateString('vi-VN') : '—' })}
                          </span>
                        </div>
                        {workspaceId && seriesId && (
                          <button
                            type='button'
                            onClick={() =>
                              navigate(
                                `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${cr.chapterId}&assignmentId=${cr.assignmentId}`,
                              )
                            }
                            className='w-full text-center py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1'
                          >
                            <span>{t('dashboard.attention.viewCr')}</span>
                            <ArrowRight className='w-3 h-3' />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overdue Assignments Section (if any) */}
              {progress?.overdue && progress.overdue.length > 0 && (
                <div className='bg-red-50/70 border border-red-200 rounded-xl p-3.5 space-y-2.5'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5'>
                      <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
                      <h3 className='text-xs font-bold text-red-950 font-sans'>
                        {t('dashboard.attention.overdueTasksTitle', { count: progress.overdue.length })}
                      </h3>
                    </div>
                    <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200'>
                      {t('dashboard.attention.needsAction')}
                    </span>
                  </div>

                  <div className='space-y-2'>
                    {progress.overdue.map((od) => (
                      <div
                        key={od.assignmentId}
                        className='p-2.5 bg-white rounded-lg border border-red-200 shadow-2xs space-y-1.5 text-xs'
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <div className='font-semibold text-zinc-900 line-clamp-1'>
                            {od.brief}
                          </div>
                          <span className='px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-red-100 text-red-700 shrink-0'>
                            {od.status}
                          </span>
                        </div>
                        <div className='flex items-center justify-between text-[11px] text-zinc-600 font-sans'>
                          <span>{od.assigneeName}</span>
                          <span className='text-red-600 font-bold'>
                            {t('dashboard.attention.due', { date: od.dueDate && !isNaN(new Date(od.dueDate).getTime()) ? new Date(od.dueDate).toLocaleDateString('vi-VN') : '—' })}
                          </span>
                        </div>
                        {workspaceId && seriesId && (
                          <button
                            type='button'
                            onClick={() =>
                              navigate(
                                `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${od.chapterId}&assignmentId=${od.assignmentId}`,
                              )
                            }
                            className='w-full text-center py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1'
                          >
                            <span>{t('dashboard.attention.viewTask')}</span>
                            <ArrowRight className='w-3 h-3' />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty Attention State - Tinh tế và tối giản theo Manga Paper design */}
              {(!progress?.overdue || progress.overdue.length === 0) &&
                (!progress?.overdueChangeRequests || progress.overdueChangeRequests.length === 0) && (
                  <div className='flex-1 flex flex-col items-center justify-center py-6 px-4 text-center space-y-2 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 min-h-[140px]'>
                    <div className='w-8 h-8 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto'>
                      <CheckCircle2 className='w-4.5 h-4.5 text-zinc-400' />
                    </div>
                    <p className='text-xs font-bold text-zinc-800'>
                      {t('dashboard.attention.allOnTrack')}
                    </p>
                    <p className='text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed'>
                      {t('dashboard.attention.allOnTrackDesc')}
                    </p>
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* 4. Tiến độ công đoạn của chương đang chọn (Ma trận công đoạn) */}
      {/* 4. Tiến độ công đoạn của chương đang chọn (Ma trận công đoạn) */}
      {(activeTab === 'all' || activeTab === 'chapters') && selectedChapter && (() => {
        const chapterTotalPanels = selectedChapter.panelCount || 0;
        const chapterInProgress = (selectedChapter.stages || []).reduce((s, st) => s + (st.inProgress || 0), 0);
        const chapterInReview = (selectedChapter.stages || []).reduce(
          (s, st) => s + (st.submitted || 0) + (st.inReview || 0),
          0,
        );
        const chapterChanges = (selectedChapter.stages || []).reduce(
          (s, st) => s + (st.changesRequested || 0),
          0,
        );
        const chapterApproved = (selectedChapter.stages || []).reduce((s, st) => s + (st.approved || 0), 0);

        const renderCellCount = (
          count: number,
          tone:
            | 'notStarted'
            | 'inProgress'
            | 'submitted'
            | 'inReview'
            | 'changesRequested'
            | 'approved',
        ) => {
          if (count === 0) {
            return <span className='text-zinc-300 font-normal select-none'>0</span>;
          }
          switch (tone) {
            case 'notStarted':
              return <span className='text-zinc-600 font-semibold'>{count}</span>;
            case 'inProgress':
              return (
                <span className='inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'>
                  {count}
                </span>
              );
            case 'submitted':
              return (
                <span className='inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs'>
                  {count}
                </span>
              );
            case 'inReview':
              return (
                <span className='inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs'>
                  {count}
                </span>
              );
            case 'changesRequested':
              return (
                <span className='inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-300/80 shadow-2xs ring-1 ring-red-400/20'>
                  {count}
                </span>
              );
            case 'approved':
              return (
                <span className='inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'>
                  {count}
                </span>
              );
          }
        };

        return (
          <section
            aria-label='Ma trận công đoạn'
            className='bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4'
          >
            {/* Header: Tiêu đề + Chuyển nhanh chương + Cụm nút hành động */}
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 pb-4'>
              <div className='space-y-1.5'>
                <div className='flex items-center gap-2.5 flex-wrap'>
                  <h2 className='text-lg font-bold text-zinc-900 font-sans flex items-center gap-2'>
                    <Sliders className='w-4.5 h-4.5 text-studio-accent' />
                    <span>{t('dashboard.stages.title', { number: selectedChapter.chapterNumber })}</span>
                  </h2>

                  {/* Quick Chapter Selector Chips */}
                  {progress?.chapters && progress.chapters.length > 1 && (
                    <div className='flex items-center gap-1 bg-zinc-100/80 p-0.5 rounded-lg border border-zinc-200/60'>
                      {progress.chapters.map((ch) => {
                        const isSelected = ch.chapterId === selectedChapter.chapterId;
                        return (
                          <button
                            key={ch.chapterId}
                            type='button'
                            onClick={() => setSelectedChapterId(ch.chapterId)}
                            className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-accent cursor-pointer ${
                              isSelected
                                ? 'bg-studio-accent text-white shadow-2xs font-semibold'
                                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                            }`}
                          >
                            Chương {ch.chapterNumber}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className='text-xs text-zinc-500'>
                  {chapterTotalPanels === 0 ? (
                    <span className='text-zinc-500'>
                      {t('dashboard.stages.emptyPanels')}
                    </span>
                  ) : (
                    <span>
                      {t('dashboard.stages.panelMatrixDesc', { count: selectedChapter.panelCount })}
                    </span>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex items-center gap-2 shrink-0'>
                {workspaceId && seriesId && (
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${selectedChapter.chapterId}`,
                      )
                    }
                    className='px-3.5 py-1.5 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                  >
                    <ExternalLink className='w-3.5 h-3.5' />
                    <span>{t('dashboard.stages.openPipeline')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chapter Pulse KPI Strip: Tóm tắt trạng thái của Chương đang chọn */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
              <div className='p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between'>
                <div>
                  <span className='text-[11px] text-zinc-500 block font-medium'>{t('dashboard.stages.totalPanels')}</span>
                  <span className='text-base font-bold font-mono text-zinc-900'>
                    {chapterTotalPanels} <span className='text-[11px] font-normal text-zinc-400'>{t('dashboard.stages.panelsUnit')}</span>
                  </span>
                </div>
                <div className='w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-500 flex items-center justify-center text-xs font-mono font-bold shadow-2xs'>
                  #
                </div>
              </div>

              <div className='p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/60 flex items-center justify-between'>
                <div>
                  <span className='text-[11px] text-blue-700 block font-medium'>{t('dashboard.stages.inProdTitle')}</span>
                  <span className='text-base font-bold font-mono text-blue-900'>
                    {chapterInProgress} <span className='text-[11px] font-normal text-blue-500'>{t('dashboard.stages.inProdUnit')}</span>
                  </span>
                </div>
                <div className='w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center text-xs font-bold shadow-2xs'>
                  <Zap className='w-3.5 h-3.5' />
                </div>
              </div>

              <div className='p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/60 flex items-center justify-between'>
                <div>
                  <span className='text-[11px] text-purple-700 block font-medium'>{t('dashboard.stages.inReviewTitle')}</span>
                  <span className='text-base font-bold font-mono text-purple-900'>
                    {chapterInReview} <span className='text-[11px] font-normal text-purple-500'>{t('dashboard.stages.inProdUnit')}</span>
                  </span>
                </div>
                <div className='w-7 h-7 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center text-xs font-bold shadow-2xs'>
                  <Eye className='w-3.5 h-3.5' />
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  chapterChanges > 0
                    ? 'bg-red-50/60 border-red-200/80 text-red-900'
                    : 'bg-emerald-50/50 border-emerald-200/60 text-emerald-900'
                }`}
              >
                <div>
                  <span className='text-[11px] block font-medium'>
                    {chapterChanges > 0 ? t('dashboard.stages.changeRequestTitle') : t('dashboard.stages.approvedTitle')}
                  </span>
                  <span className='text-base font-bold font-mono'>
                    {chapterChanges > 0 ? chapterChanges : chapterApproved}{' '}
                    <span className='text-[11px] font-normal opacity-70'>{t('dashboard.stages.inProdUnit')}</span>
                  </span>
                </div>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-2xs ${
                    chapterChanges > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {chapterChanges > 0 ? '!' : '✓'}
                </div>
              </div>
            </div>

            {/* Context callout when chapter has 0 panels */}
            {chapterTotalPanels === 0 && (
              <div className='flex items-center justify-between gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-200/60 text-zinc-700 text-xs'>
                <div className='flex items-center gap-2.5'>
                  <div className='w-5 h-5 rounded-full bg-studio-accent/10 text-studio-accent flex items-center justify-center shrink-0 font-bold text-xs'>
                    i
                  </div>
                  <span>
                    {t('dashboard.stages.zeroPanelsNotice', { number: selectedChapter.chapterNumber })}
                  </span>
                </div>
                {workspaceId && seriesId && (
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${selectedChapter.chapterId}`,
                      )
                    }
                    className='shrink-0 text-xs font-bold text-studio-accent hover:text-studio-accent-hover hover:underline flex items-center gap-1 cursor-pointer'
                  >
                    <span>{t('dashboard.stages.openPipelineSplit')}</span>
                    <ArrowRight className='w-3 h-3' />
                  </button>
                )}
              </div>
            )}

            {!selectedChapter.stages || selectedChapter.stages.length === 0 ? (
              <div className='py-8 text-center text-xs text-zinc-500 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200'>
                {t('dashboard.stages.noStages')}
              </div>
            ) : (
              <div className='overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs'>
                <table className='w-full text-xs text-left border-collapse'>
                  <thead>
                    <tr className='border-b border-zinc-200 text-zinc-600 font-sans text-xs bg-zinc-50/70'>
                      <th className='py-3 px-3.5 font-semibold text-zinc-700'>{t('dashboard.stages.colStage')}</th>
                      <th className='py-3 px-2 text-center text-zinc-500 font-semibold'>{t('dashboard.stages.colNotStarted')}</th>
                      <th className='py-3 px-2 text-center text-blue-700 font-semibold'>{t('dashboard.stages.colInProgress')}</th>
                      <th className='py-3 px-2 text-center text-amber-700 font-semibold'>{t('dashboard.stages.colSubmitted')}</th>
                      <th className='py-3 px-2 text-center text-purple-700 font-semibold'>
                        {t('dashboard.stages.colInReview')}
                      </th>
                      <th className='py-3 px-2 text-center text-red-700 font-semibold'>
                        {t('dashboard.stages.colChanges')}
                      </th>
                      <th className='py-3 px-2 text-center text-emerald-700 font-semibold'>
                        {t('dashboard.stages.colApproved')}
                      </th>
                      <th className='py-3 px-3.5 text-right font-semibold text-zinc-700'>{t('dashboard.stages.colProgress')}</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-zinc-100 font-mono tabular-nums'>
                    {(selectedChapter.stages || []).map((st) => {
                      const total = selectedChapter.panelCount;
                      const pct = total > 0 ? Math.round((st.approved / total) * 100) : 0;

                      return (
                        <tr
                          key={st.stageId}
                          className='hover:bg-amber-50/20 transition-colors'
                        >
                          <td className='py-3 px-3.5 font-sans font-semibold text-zinc-900'>
                            <div className='flex items-center gap-2'>
                              <span className='w-4.5 h-4.5 rounded bg-zinc-900 text-white text-[10px] font-mono flex items-center justify-center shrink-0 shadow-2xs'>
                                {st.stageOrder}
                              </span>
                              <span className='font-medium text-zinc-900'>{st.name}</span>
                            </div>
                          </td>
                          <td className='py-3 px-2 text-center'>
                            {renderCellCount(st.notStarted, 'notStarted')}
                          </td>
                          <td className='py-3 px-2 text-center'>
                            {renderCellCount(st.inProgress, 'inProgress')}
                          </td>
                          <td className='py-3 px-2 text-center'>
                            {renderCellCount(st.submitted, 'submitted')}
                          </td>
                          <td className='py-3 px-2 text-center'>
                            {renderCellCount(st.inReview, 'inReview')}
                          </td>
                          <td className='py-3 px-2 text-center'>
                            {renderCellCount(st.changesRequested, 'changesRequested')}
                          </td>
                          <td className='py-3 px-2 text-center'>
                            {renderCellCount(st.approved, 'approved')}
                          </td>
                          <td className='py-3 px-3.5 text-right'>
                            {total === 0 ? (
                              <div className='flex items-center justify-end text-zinc-400'>
                                <span className='text-[11px] font-normal italic select-none'>0%</span>
                              </div>
                            ) : (
                              <div className='flex items-center justify-end gap-2.5'>
                                <div className='w-16 bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200/50'>
                                  <div
                                    className={`h-full rounded-full transition-colors ${
                                      pct === 100 ? 'bg-emerald-500' : 'bg-studio-accent'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className='text-[11px] text-zinc-600 font-medium w-12 text-right'>
                                  {st.approved}/{total} ({pct}%)
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })()}

      {/* 5. Xu hướng công việc & Phân công thành viên */}
      {(activeTab === 'all' || activeTab === 'team' || activeTab === 'reports') && (
        <section className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {/* Biểu đồ Burndown / Công việc còn lại theo thời gian */}
          {(activeTab === 'all' || activeTab === 'reports') && (
            <div
              className={`${
                activeTab === 'reports' ? 'lg:col-span-12' : 'lg:col-span-6'
              } space-y-4 self-start`}
            >
              <SeriesBurndownCard burndown={progress?.burndown} loading={loading} />
            </div>
          )}

          {/* Phân công thành viên / Khối lượng công việc theo người */}
          {(activeTab === 'all' || activeTab === 'team') && (
            <div
              className={`${
                activeTab === 'team' ? 'lg:col-span-12' : 'lg:col-span-6'
              } space-y-4 self-start`}
            >
              <div className='bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4'>
                <div>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3'>
                    <div>
                      <h2 className='text-base font-bold text-zinc-900 font-sans flex items-center gap-2'>
                        <Users className='w-4 h-4 text-studio-accent' />
                        <span>{t('dashboard.team.workloadTitle')}</span>
                      </h2>
                      <p className='text-xs text-zinc-500 mt-0.5'>
                        {t('dashboard.team.workloadDesc')}
                      </p>
                    </div>

                    <div className='flex items-center gap-2 self-start sm:self-auto shrink-0'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-semibold text-zinc-700 shadow-2xs'>
                        <span>{t('dashboard.team.workloadCount', { count: progress?.workload?.length || 0 })}</span>
                      </span>
                    </div>
                  </div>

                  {!progress?.workload || progress.workload.length === 0 ? (
                    <div className='py-8 text-center text-xs text-zinc-500 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 mt-4 space-y-3 px-4'>
                      <div className='w-9 h-9 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto'>
                        <Users className='w-4.5 h-4.5' />
                      </div>
                      <div className='space-y-1'>
                        <p className='font-semibold text-zinc-800 text-xs'>
                          {seriesMembers.length > 0
                            ? t('dashboard.team.workloadReady', { count: seriesMembers.length })
                            : t('dashboard.team.workloadEmpty')}
                        </p>
                        <p className='text-[11px] text-zinc-400 max-w-xs mx-auto'>
                          {seriesMembers.length > 0
                            ? t('dashboard.team.workloadReadyHint')
                            : t('dashboard.team.workloadEmptyHint')}
                        </p>
                      </div>
                      <div className='pt-1'>
                        {seriesMembers.length > 0 && selectedChapter ? (
                          <button
                            type='button'
                            onClick={() => {
                              setAssignModalChapter({
                                id: selectedChapter.chapterId,
                                number: selectedChapter.chapterNumber,
                              });
                              setIsAssignModalOpen(true);
                            }}
                            className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs'
                          >
                            <UserPlus className='w-3.5 h-3.5' />
                            <span>{t('dashboard.team.assignNewBtn', { number: selectedChapter.chapterNumber })}</span>
                          </button>
                        ) : (
                          <button
                            type='button'
                            onClick={() => setIsMembersModalOpen(true)}
                            className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs whitespace-nowrap'
                          >
                            <UserPlus className='w-3.5 h-3.5' />
                            <span className='whitespace-nowrap'>{t('dashboard.team.assignMemberBtn')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-2.5 mt-4'>
                      {(progress.workload || []).map((w) => {
                        const roleUpper = String(w.role || '').toUpperCase();
                        const roleStyle =
                          ROLE_COLOR_MAP[roleUpper] || 'bg-zinc-100 text-zinc-800 border-zinc-200';

                        return (
                          <div
                            key={w.userId + w.role}
                            className='p-3 bg-white hover:bg-zinc-50/80 border border-zinc-200 rounded-xl transition-colors shadow-2xs space-y-2'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex items-center gap-2.5 min-w-0'>
                                <div className='w-7 h-7 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0'>
                                  {(w.fullName || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className='min-w-0'>
                                  <div className='text-xs font-bold text-zinc-900 truncate'>
                                    {w.fullName}
                                  </div>
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${roleStyle}`}
                                  >
                                    {w.role}
                                  </span>
                                </div>
                              </div>

                              {w.overdue > 0 && (
                                <span className='px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-200 shrink-0'>
                                  {t('dashboard.team.overdueBadge', { count: w.overdue })}
                                </span>
                              )}
                            </div>

                            {/* Workload metric counters */}
                            <div className='grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-xs font-mono text-center tabular-nums'>
                              <div className='bg-zinc-50/70 p-1.5 rounded-lg border border-zinc-200'>
                                <div className='text-zinc-500 text-[11px] font-sans'>{t('dashboard.team.working')}</div>
                                <div className='font-bold text-zinc-900 text-sm'>{w.open}</div>
                              </div>
                              <div className='bg-zinc-50/70 p-1.5 rounded-lg border border-zinc-200'>
                                <div className='text-zinc-500 text-[11px] font-sans'>{t('dashboard.team.waitingReview')}</div>
                                <div className='font-bold text-amber-600 text-sm'>
                                  {w.waitingReview}
                                </div>
                              </div>
                              <div className='bg-zinc-50/70 p-1.5 rounded-lg border border-zinc-200'>
                                <div className='text-zinc-500 text-[11px] font-sans'>{t('dashboard.team.done')}</div>
                                <div className='font-bold text-emerald-600 text-sm'>{w.done}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Series Members Modal (Manage series team & roles from workspace talent pool) */}
      {seriesId && workspaceId && isMembersModalOpen && (
        <SeriesMembersModal
          isOpen={isMembersModalOpen}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          seriesId={seriesId}
          seriesTitle={seriesDetail?.title || activeProject?.title || 'Series'}
          onClose={() => setIsMembersModalOpen(false)}
          onMembersChanged={() => {
            void fetchProgress();
            seriesService.getSeriesMembers(workspaceId, seriesId).then((m) => setSeriesMembers(m || []));
          }}
        />
      )}

      {/* Series Chapters Modal (Producer can approve, reopen, manage chapters) */}
      {seriesId && (
        <SeriesChaptersModal
          isOpen={isChapterModalOpen}
          workspaceId={workspaceId}
          seriesId={seriesId}
          seriesTitle={seriesDetail?.title || activeProject?.title || 'Series'}
          onClose={() => {
            setIsChapterModalOpen(false);
            void fetchProgress();
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Create Assignment Modal (Producer assign tasks per Chapter/Page/Panel) */}
      {seriesId && isAssignModalOpen && assignModalChapter && (
        <CreateAssignmentModal
          isOpen={isAssignModalOpen}
          workspaceId={workspaceId || ''}
          seriesId={seriesId}
          chapterId={assignModalChapter.id}
          chapterNumber={assignModalChapter.number}
          onClose={() => {
            setIsAssignModalOpen(false);
            setAssignModalChapter(null);
          }}
          onSuccess={() => {
            setIsAssignModalOpen(false);
            setAssignModalChapter(null);
            void fetchProgress();
          }}
          onShowToast={onShowToast}
        />
      )}
    </PageContainer>
  );
};
