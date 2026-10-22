import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    className: 'bg-stone-100 text-stone-600 border-stone-200',
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
 * Visual Pipeline Stepper Track cho từng chương (khớp thiết kế wireframe Tổng quan).
 * Thể hiện chuỗi 5 cột mốc: Bản thảo -> Phác thảo -> Vẽ nét -> Xét duyệt -> Hoàn tất.
 */
const ChapterPipelineStepper: React.FC<{
  percentComplete: number;
  status?: string;
}> = ({ percentComplete, status }) => {
  const isFinished = status === 'Approved' || status === 'Published' || percentComplete >= 100;

  let currentStageIndex = 0;
  if (isFinished) {
    currentStageIndex = 4;
  } else if (percentComplete >= 80) {
    currentStageIndex = 3;
  } else if (percentComplete >= 50) {
    currentStageIndex = 2;
  } else if (percentComplete >= 20) {
    currentStageIndex = 1;
  } else {
    currentStageIndex = 0;
  }

  const stages = [
    { label: 'Bản thảo', icon: BookOpen },
    { label: 'Phác thảo', icon: null },
    { label: 'Vẽ nét', icon: PenTool },
    { label: 'Xét duyệt', icon: null },
    { label: 'Hoàn tất', icon: CheckCircle2 },
  ];

  return (
    <div
      className='flex items-center gap-1 sm:gap-1.5 shrink-0 py-0.5'
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
                className={`h-[2px] w-3.5 sm:w-5 md:w-6 lg:w-7.5 rounded-full transition-colors ${
                  idx <= currentStageIndex || isFinished
                    ? 'bg-[#F97316]'
                    : 'bg-[#D8D2C5]'
                }`}
              />
            )}
            <div
              className={`relative flex items-center justify-center transition-all ${
                IconComponent
                  ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-lg'
                  : 'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full'
              } ${
                isCurrent
                  ? 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white ring-2 ring-[#F97316]/30 shadow-xs'
                  : isReached
                  ? 'bg-[#F97316] text-white'
                  : 'bg-[#FAF8F5] text-stone-400 border border-[#D8D2C5]'
              }`}
              title={`${st.label}: ${isReached ? 'Đã hoàn thành / Đang thực hiện' : 'Chưa bắt đầu'}`}
            >
              {IconComponent ? (
                <IconComponent className='w-3 h-3 sm:w-3.5 sm:h-3.5' />
              ) : (
                <span
                  className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                    isReached ? 'bg-white' : 'bg-stone-300'
                  }`}
                />
              )}
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
      const msg = err.message || 'Không thể tải tiến độ Series.';
      setError(msg);
      onShowToast('Lỗi tiến độ', msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, workspaceId, onShowToast]);

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
    if (!progress || progress.chapters.length === 0) {
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
      const lastStage = c.stages[c.stages.length - 1];
      return sum + (lastStage?.approved || 0);
    }, 0);

    const inProd = progress.chapters.filter((c) => c.status === 'InProduction').length;
    const approved = progress.chapters.filter((c) => c.status === 'Approved').length;
    const published = progress.chapters.filter((c) => c.status === 'Published').length;

    const waiting = progress.workload.reduce((sum, w) => sum + (w.waitingReview || 0), 0);
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

  const seriesTitle = seriesDetail?.title || activeProject?.title || 'Bộ truyện';

  return (
    <PageContainer className='w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6 pb-16 font-sans text-[#44403C] min-w-0'>
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
        ariaLabel='Nhận diện bộ truyện và điều phối'
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
              className='inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#FCFBF8]/90 hover:bg-white border border-[#D8D2C5] px-3 text-xs font-semibold text-[#44403C] shadow-xs backdrop-blur-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
            >
              <ImageIcon className='w-3.5 h-3.5 text-[#C2410C]' aria-hidden='true' />
              Đổi banner Series
            </button>
          ) : undefined
        }
        avatar={
          <div className='relative'>
            <div className='w-24 sm:w-28 lg:w-32 aspect-[3/4] rounded-xl sm:rounded-2xl border-[3px] border-[#FCFBF8] bg-[#FCFBF8] p-0.5 shadow-[0_8px_24px_rgba(28,25,23,0.25)] overflow-hidden shrink-0'>
              {seriesDetail?.avatarUrl ? (
                <AuthenticatedImage
                  key={seriesDetail.avatarUrl}
                  src={seriesDetail.avatarUrl}
                  alt={`Avatar ${seriesTitle}`}
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
                aria-label='Đổi avatar Series'
                title='Đổi avatar Series'
                data-testid='change-series-avatar-btn'
                className='absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-[#FCFBF8] border-2 border-[#D8D2C5] text-[#44403C] hover:border-[#F97316] hover:text-[#C2410C] flex items-center justify-center shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]'
              >
                <Camera className='w-4 h-4' aria-hidden='true' />
              </button>
            )}
          </div>
        }
      >
        {/* Ngữ cảnh & đồng bộ */}
        <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#57534E]'>
          <span className='uppercase tracking-wider font-semibold break-words min-w-0'>
            {workspaceName} / Tổng quan bộ truyện
          </span>
          {loading ? (
            <span className='inline-flex items-center gap-1.5 text-[#C2410C]'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              Đang nạp...
            </span>
          ) : progress?.generatedAt ? (
            <span className='inline-flex items-center gap-1'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
              Đồng bộ: {new Date(progress.generatedAt).toLocaleTimeString('vi-VN')}
            </span>
          ) : null}
        </div>

        <div className='relative inline-block max-w-full'>
          <h1
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className='pf-ink-bleed-title relative z-10 text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1C1917] tracking-tight leading-tight break-words [overflow-wrap:anywhere]'
            data-testid='series-title'
          >
            <span className='sr-only'>Tổng quan bộ truyện: </span>
            {seriesTitle}
          </h1>
          <svg
            className={`absolute -bottom-1.5 left-0 w-full max-w-[280px] h-[12px] pointer-events-none z-0 overflow-visible ${
              !hasAnimatedMount ? 'pf-brush-wipe' : ''
            }`}
            viewBox='0 0 320 16'
            fill='none'
            aria-hidden='true'
          >
            <path
              d='M 3 10 C 14 6.2, 40 8.5, 78 7.2 C 126 5.5, 192 9.5, 248 7.0 C 278 5.6, 304 7.2, 317 6.0 C 314 9.0, 286 11.2, 252 10.8 C 196 10.2, 134 13.0, 82 11.6 C 46 10.5, 16 12.2, 3 10 Z'
              fill='#F97316'
              opacity='0.8'
            />
          </svg>
        </div>

        <div className='flex flex-wrap items-center gap-1.5 text-[11px] font-semibold font-mono text-[#57534E]'>
          {seriesDetail?.storyArc && (
            <span className='px-2 py-0.5 rounded-md bg-white/70 text-[#1C1917] border border-[#D8D2C5] break-words'>
              {seriesDetail.storyArc}
            </span>
          )}
          {(seriesDetail?.format || activeProject?.format) && (
            <span className='px-2 py-0.5 rounded-md bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74]'>
              {seriesDetail?.format || activeProject?.format}
            </span>
          )}
          {(seriesDetail?.genre || activeProject?.genres?.[0]) && (
            <span className='px-2 py-0.5 rounded-md bg-white/70 text-[#1C1917] border border-[#D8D2C5]'>
              {seriesDetail?.genre || activeProject?.genres?.[0]}
            </span>
          )}
          {seriesDetail?.readingDirection && (
            <span className='px-2 py-0.5 rounded-md bg-white/70 border border-[#D8D2C5]'>
              {seriesDetail.readingDirection === 'Vertical' ? 'Cuộn dọc' : 'Phải sang trái'}
            </span>
          )}
          <span className='px-2 py-0.5 rounded-md bg-white/70 border border-[#D8D2C5]'>
            {progress?.chapters.length || seriesDetail?.chaptersCount || 0} Chương
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
            <p className='text-xs sm:text-[13px] text-[#44403C] leading-relaxed max-w-2xl break-words line-clamp-2'>
              {text}
            </p>
          );
        })()}

        {/* Thanh tác vụ quản lý dự án & điều phối Studio */}
        <div className='flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#D8D2C5]/60'>
          <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
            {seriesId && (
              <button
                type='button'
                onClick={() => setIsChapterModalOpen(true)}
                className='h-8.5 px-3 rounded-lg bg-white/90 hover:bg-[#FFF2E6] border border-[#D8D2C5] hover:border-[#FDBA74] text-[#1C1917] hover:text-[#C2410C] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs'
                title='Quản lý danh sách chương, kiểm duyệt và điều phối tập truyện'
              >
                <BookOpen className='w-3.5 h-3.5 text-[#F97316]' />
                <span>Quản Lý Chương (Duyệt)</span>
              </button>
            )}
            <button
              type='button'
              onClick={handleAuditClick}
              disabled={auditRunning}
              className='h-8.5 px-3 rounded-lg bg-white/90 hover:bg-[#FFF2E6] border border-[#D8D2C5] hover:border-[#FDBA74] text-[#1C1917] hover:text-[#C2410C] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-70 transition-colors shadow-2xs'
              title='Kiểm tra tính nhất quán model nhân vật và khung truyện với AI'
            >
              <Sparkles className={`w-3.5 h-3.5 text-purple-600 ${auditRunning ? 'animate-spin' : ''}`} />
              <span>{auditRunning ? 'Đang kiểm tra...' : 'Kiểm tra AI'}</span>
            </button>
            <button
              type='button'
              onClick={() => void fetchProgress()}
              disabled={loading}
              className='h-8.5 px-2.5 rounded-lg bg-white/90 hover:bg-stone-50 border border-[#D8D2C5] text-[#57534E] hover:text-[#1C1917] text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs'
              title='Làm mới dữ liệu tiến độ từ máy chủ'
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className='sr-only sm:not-sr-only'>Làm mới</span>
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
              className='h-8.5 px-4 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:shadow-sm'
            >
              <span>Mở Quy trình sản xuất</span>
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
              'Đã lưu ảnh',
              imageDialogKind === 'avatar'
                ? 'Avatar Series đã cập nhật.'
                : 'Banner Series đã cập nhật.',
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
            Thử lại
          </button>
        </div>
      )}

      {/* 2. Top 3 Summary Cards (Theo bản thiết kế Wireframe) */}
      <section
        aria-label='Chỉ số tổng quan'
        className='grid grid-cols-1 md:grid-cols-3 gap-4'
      >
        {/* Card 1: Tiến Độ Toàn Series (Progress Slider) */}
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4.5 shadow-2xs hover:border-[#F97316] transition-all flex flex-col justify-between space-y-2.5 pf-editorial-card'>
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-[#57534E] mb-1'>
              <span className='font-bold uppercase tracking-wider text-[11px] text-stone-700'>
                Tiến Độ Toàn Series
              </span>
              <span className='inline-flex items-center gap-1 text-[#C2410C] bg-[#FFF2E6] border border-[#FDBA74] px-2 py-0.5 rounded-full text-[11px] font-bold'>
                <TrendingUp className='w-3 h-3' /> Hoàn thiện
              </span>
            </div>
            <div className='text-3xl sm:text-4xl font-extrabold font-sans tabular-nums text-[#1C1917] mt-1'>
              {loading ? '—' : `${overallPercent}%`}
            </div>
          </div>

          <div className='pt-2 border-t border-[#D8D2C5]/70 space-y-1.5'>
            <div className='w-full bg-[#EAE5DC] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#D8D2C5]/80 shadow-inner'>
              <div
                className='bg-gradient-to-r from-[#F97316] to-[#EA580C] h-full rounded-full transition-all duration-700 shadow-xs'
                style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
              />
            </div>
            <div className='text-[11px] font-mono text-[#57534E] flex items-center justify-between'>
              <span>
                <strong className='text-[#1C1917] font-semibold'>{totalApprovedPanels}</strong> panel đã duyệt
              </span>
              <span>Tổng: {totalPanels} panel</span>
            </div>
          </div>
        </div>

        {/* Card 2: Chương Đang Sản Xuất (Status Dots theo wireframe) */}
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4.5 shadow-2xs hover:border-[#F97316] transition-all flex flex-col justify-between space-y-2.5 pf-editorial-card'>
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-[#57534E] mb-1'>
              <span className='font-bold uppercase tracking-wider text-[11px] text-stone-700'>
                Chương Đang Sản Xuất
              </span>
              <span className='text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold'>
                {totalChapters} Chương
              </span>
            </div>
            {/* 3 Status Circles trực quan theo wireframe */}
            <div className='flex items-center gap-3.5 mt-1.5'>
              <div className='flex items-center gap-1.5'>
                <div className='w-7 h-7 rounded-full bg-amber-500/15 border-2 border-amber-500 flex items-center justify-center font-mono font-bold text-xs text-amber-700'>
                  {inProdChapters}
                </div>
                <div className='text-left'>
                  <div className='text-[11px] font-bold text-[#1C1917]'>Đang làm</div>
                  <div className='text-[9.5px] text-stone-500 font-mono'>giai đoạn vẽ</div>
                </div>
              </div>

              <div className='flex items-center gap-1.5'>
                <div className='w-7 h-7 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center font-mono font-bold text-xs text-emerald-700'>
                  {approvedChapters}
                </div>
                <div className='text-left'>
                  <div className='text-[11px] font-bold text-[#1C1917]'>Đã duyệt</div>
                  <div className='text-[9.5px] text-stone-500 font-mono'>chờ phát hành</div>
                </div>
              </div>

              <div className='flex items-center gap-1.5'>
                <div className='w-7 h-7 rounded-full bg-stone-300/40 border-2 border-stone-400 flex items-center justify-center font-mono font-bold text-xs text-stone-600'>
                  {publishedChapters}
                </div>
                <div className='text-left'>
                  <div className='text-[11px] font-bold text-[#1C1917]'>Xuất bản</div>
                  <div className='text-[9.5px] text-stone-500 font-mono'>hoàn tất</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick gate & risk sub-strip */}
          <div className='pt-2 border-t border-[#D8D2C5]/70 flex items-center justify-between text-[11px] font-mono'>
            <div className='flex items-center gap-1'>
              <span className='text-stone-500'>Cổng Chờ Xét Duyệt</span>
              <span className='text-stone-400'>:</span>
              <strong className='text-amber-700 font-bold'>
                {waitingReviewTotal} <span>Việc nộp</span>
              </strong>
            </div>
            <div className='flex items-center gap-1'>
              <span className='text-stone-500'>Việc Quá Hạn &amp; Rủi Ro</span>
              <span className='text-stone-400'>:</span>
              <strong className={overdueTotal > 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                {overdueTotal} Mục
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Đội Ngũ Sản Xuất (Avatar Stack theo wireframe) */}
        <div
          onClick={() => setIsMembersModalOpen(true)}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsMembersModalOpen(true);
            }
          }}
          className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4.5 shadow-2xs hover:border-[#F97316] transition-all flex flex-col justify-between space-y-2.5 pf-editorial-card cursor-pointer group text-left'
        >
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-[#57534E] mb-1'>
              <span className='font-bold uppercase tracking-wider text-[11px] text-stone-700'>
                Đội Ngũ Sản Xuất
              </span>
              <span className='text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold'>
                {seriesMembers.length || 0} thành viên
              </span>
            </div>

            {/* Overlapping Avatar Stack theo wireframe */}
            <div className='flex items-center -space-x-2 py-1.5 overflow-hidden'>
              {seriesMembers.length === 0 ? (
                <span className='text-xs text-stone-400 italic'>Chưa gán thành viên</span>
              ) : (
                seriesMembers.slice(0, 5).map((m, idx) => (
                  <div
                    key={m.id || m.userId || idx}
                    title={`${m.fullName || m.email} (${m.seriesRole || (m as any).role || 'Member'})`}
                    className='w-9 h-9 rounded-full border-2 border-[#FCFBF8] bg-[#1C1917] text-white flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-105'
                    style={{ zIndex: 10 - idx }}
                  >
                    {(m.fullName || m.email || 'U').charAt(0).toUpperCase()}
                  </div>
                ))
              )}
              {seriesMembers.length > 5 && (
                <div
                  className='w-9 h-9 rounded-full border-2 border-[#FCFBF8] bg-stone-200 text-stone-800 flex items-center justify-center font-bold text-xs shadow-xs'
                  style={{ zIndex: 4 }}
                >
                  +{seriesMembers.length - 5}
                </div>
              )}
            </div>
          </div>

          <div className='pt-2 border-t border-[#D8D2C5]/70 flex items-center justify-between text-[11px]'>
            <span className='text-[#57534E]'>Phân công &amp; Quyền hạn:</span>
            <span className='text-[#F97316] font-bold group-hover:underline flex items-center gap-1'>
              Quản lý đội ngũ <ArrowRight className='w-3 h-3' />
            </span>
          </div>
        </div>
      </section>

      {/* Tab Navigation Điều Phối Quản Lý Trong Project Overview */}
      <nav
        aria-label='Phân nhóm quản lý tổng quan'
        className='flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D2C5] pb-3 pt-1'
      >
        <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('all')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#FCFBF8] hover:bg-white text-[#57534E] hover:text-[#1C1917] border border-[#D8D2C5]'
            }`}
          >
            <LayoutDashboard className='w-3.5 h-3.5' />
            <span>Tổng quan toàn diện</span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('chapters')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'chapters'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#FCFBF8] hover:bg-white text-[#57534E] hover:text-[#1C1917] border border-[#D8D2C5]'
            }`}
          >
            <BookOpen className='w-3.5 h-3.5' />
            <span>Chương & Công đoạn</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'chapters'
                  ? 'bg-stone-700 text-stone-200'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {progress?.chapters.length || 0}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('team')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#FCFBF8] hover:bg-white text-[#57534E] hover:text-[#1C1917] border border-[#D8D2C5]'
            }`}
          >
            <Users className='w-3.5 h-3.5' />
            <span>Đội ngũ & Phân công</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'team'
                  ? 'bg-stone-700 text-stone-200'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {seriesMembers.length || 0}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('reports')}
            className={`h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#FCFBF8] hover:bg-white text-[#57534E] hover:text-[#1C1917] border border-[#D8D2C5]'
            }`}
          >
            <TrendingDown className='w-3.5 h-3.5' />
            <span>Báo cáo Burndown</span>
          </button>
        </div>

        <div className='hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#57534E]'>
          <span>Khu vực:</span>
          <span className='font-semibold text-[#1C1917]'>
            {activeTab === 'all' && 'Tổng quan đầy đủ các phần'}
            {activeTab === 'chapters' && 'Chương & Ma trận công đoạn'}
            {activeTab === 'team' && 'Phân công nhân sự & Khối lượng'}
            {activeTab === 'reports' && 'Phân tích tiến độ & Xu hướng'}
          </span>
        </div>
      </nav>

      {/* 3. Chương & Mục cần chú ý (Bố cục 8/4: Chương là ngôi sao trung tâm) */}
      {(activeTab === 'all' || activeTab === 'chapters') && (
        <section className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        {/* Left: Danh sách chương nổi bật (8 cột trên lg) */}
        <div className='lg:col-span-8 space-y-4'>
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 pf-editorial-card'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8D2C5] pb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-orange-100/80 border border-orange-200/90 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs'>
                  <BookOpen className='w-5 h-5' />
                </div>
                <div>
                  <div className='flex items-center gap-2.5'>
                    <h2
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      className='text-lg sm:text-xl font-bold text-[#1C1917]'
                    >
                      Tiến Độ Theo Từng Chương ({progress?.chapters.length || 0})
                    </h2>
                  </div>
                  <p className='text-xs text-[#57534E] mt-0.5'>
                    {selectedChapter
                      ? `Đang xem: Chương ${selectedChapter.chapterNumber} · Chọn chương để đối chiếu ma trận công đoạn bên dưới`
                      : 'Chọn một chương để xem chi tiết ma trận công đoạn bên dưới'}
                  </p>
                </div>
              </div>

              {seriesId && (
                <div className='flex items-center gap-2 self-start sm:self-auto shrink-0'>
                  <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#D8D2C5] text-xs font-mono font-semibold text-[#57534E] shadow-2xs'>
                    <BookOpen className='w-3.5 h-3.5 text-[#F97316]' />
                    <span>{progress?.chapters.length || 0} tập</span>
                  </span>
                </div>
              )}
            </div>

            {/* Chapters list */}
            {!progress?.chapters || progress.chapters.length === 0 ? (
              <div className='py-12 text-center text-xs text-[#57534E] bg-[#FAF8F5] rounded-xl border border-dashed border-[#D8D2C5] space-y-2'>
                <BookOpen className='w-8 h-8 text-stone-300 mx-auto' />
                <p className='font-semibold text-stone-700'>Chưa có chương nào trong Series này</p>
                <p className='text-stone-500'>Hãy tạo chương mới từ danh sách Quản lý Chương.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {progress.chapters.map((ch) => {
                  const isSelected = selectedChapter?.chapterId === ch.chapterId;
                  const statusStyle = CHAPTER_STATUS_STYLE[ch.status] || {
                    label: ch.status,
                    className: 'bg-[#F3F0E9] text-[#1C1917] border-[#D8D2C5]',
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
                      className={`p-4 rounded-xl border transition-all text-left cursor-pointer relative group ${
                        isSelected
                          ? 'bg-white border-[#F97316] ring-2 ring-[#F97316]/20 shadow-sm'
                          : 'bg-[#FAF8F5]/90 hover:bg-white border-[#D8D2C5] hover:border-[#F97316]/50 shadow-2xs'
                      }`}
                    >
                      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
                        {/* Chapter Left: Avatar badge + Title + Metadata */}
                        <div className='flex items-center gap-3.5 min-w-0 flex-1'>
                          <div
                            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                              isSelected
                                ? 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-orange-500/20'
                                : 'bg-[#1C1917] text-white'
                            }`}
                          >
                            <span className='text-[8.5px] font-mono font-bold tracking-wider opacity-75 uppercase leading-none'>
                              TẬP
                            </span>
                            <span className='text-sm sm:text-base font-bold font-mono leading-none mt-0.5'>
                              {String(ch.chapterNumber).padStart(2, '0')}
                            </span>
                          </div>

                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2 flex-wrap'>
                              <span className='text-sm sm:text-base font-bold text-[#1C1917] tracking-tight truncate'>
                                {cleanLabel}
                              </span>
                              {isSelected && (
                                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 shrink-0'>
                                  Đang chọn
                                </span>
                              )}
                            </div>

                            <div className='text-xs text-[#57534E] flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1'>
                              {hasPanels ? (
                                <span className='inline-flex items-center gap-1 font-medium'>
                                  <Layers className='w-3 h-3 text-[#78716C]' />
                                  {ch.pageCount} trang · {ch.panelCount} panel
                                </span>
                              ) : (
                                <span className='text-stone-400 italic text-[11px]'>Chưa có nội dung</span>
                              )}
                              {formattedRelease && (
                                <span className='inline-flex items-center gap-1 font-medium'>
                                  <Calendar className='w-3 h-3 text-[#78716C]' />
                                  Hạn: {formattedRelease}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chapter Middle: Visual Pipeline Stepper Track (Theo wireframe) */}
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
                              {ch.overdueAssignments} Quá hạn
                            </span>
                          )}
                          {(ch.overdueChangeRequests ?? 0) > 0 && (
                            <span className='px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1'>
                              <AlertCircle className='w-3 h-3' />
                              {ch.overdueChangeRequests} Sửa trễ
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${statusStyle.className}`}
                          >
                            {statusStyle.label}
                          </span>
                          <span className='text-xs font-mono font-bold tabular-nums text-[#1C1917] min-w-10 text-right'>
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
                            className='px-2.5 py-1 rounded-md bg-[#FCFBF8] hover:bg-[#FFF2E6] text-[#44403C] hover:text-[#EA580C] border border-[#D8D2C5] hover:border-[#FDBA74] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs'
                            title={`Giao việc mới cho Chương ${ch.chapterNumber}`}
                          >
                            <UserCheck className='w-3.5 h-3.5 text-[#57534E]' />
                            <span>Giao việc</span>
                          </button>
                        </div>
                      </div>

                      {/* Visual Stepper trên màn hình nhỏ (Mobile) */}
                      <div className='sm:hidden flex items-center justify-start overflow-x-auto pt-2 pb-0.5'>
                        <ChapterPipelineStepper
                          percentComplete={ch.percentComplete || 0}
                          status={ch.status}
                        />
                      </div>

                      {/* Progress Bar under chapter card */}
                      <div className='w-full bg-[#EFECE6] h-1.5 rounded-full overflow-hidden mt-3'>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : ch.status === 'Approved' || ch.status === 'Published'
                              ? 'bg-emerald-600'
                              : 'bg-stone-500'
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
        </div>

        {/* Right: Đội ngũ sản xuất & Mục cần chú ý (4 cột trên lg, theo wireframe) */}
        <div className='lg:col-span-4 space-y-4'>
          {/* Card Đội Ngũ Sản Xuất (Đặt ở trên cùng cột phải theo đúng Wireframe) */}
          {seriesId && (
            <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4.5 shadow-xs space-y-3 pf-editorial-card'>
              <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2.5'>
                <div className='flex items-center gap-2'>
                  <Users className='w-4 h-4 text-[#F97316]' />
                  <h3 className='text-xs font-bold text-[#1C1917] font-sans'>
                    Đội Ngũ Sản Xuất ({seriesMembers.length})
                  </h3>
                </div>
                <button
                  type='button'
                  onClick={() => setIsMembersModalOpen(true)}
                  className='text-[11px] font-semibold text-[#F97316] hover:text-[#EA580C] hover:underline cursor-pointer'
                >
                  Quản lý →
                </button>
              </div>
              {seriesMembers.length === 0 ? (
                <div className='py-4 text-center text-xs text-stone-500 italic bg-[#FAF8F5] rounded-xl border border-dashed border-[#D8D2C5]'>
                  Chưa gán thành viên nào vào bộ truyện.
                </div>
              ) : (
                <div className='space-y-2'>
                  {seriesMembers.slice(0, 5).map((member) => {
                    const roleUpper = String(member.seriesRole || (member as any).role || 'ARTIST').toUpperCase();
                    const roleStyle =
                      ROLE_COLOR_MAP[roleUpper] || 'bg-[#F3F0E9] text-[#1C1917] border-[#D8D2C5]';

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
                        className='flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-white border border-[#E7E2D8] hover:border-[#D8D2C5] transition-all text-xs shadow-2xs group'
                      >
                        <div className='flex items-center gap-2.5 min-w-0'>
                          <div className='w-7.5 h-7.5 rounded-full bg-[#1C1917] text-white font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-[#F97316]/20 group-hover:scale-105 transition-transform'>
                            {(member.fullName || member.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className='min-w-0'>
                            <div className='font-bold text-[#1C1917] truncate leading-tight'>
                              {member.fullName || member.email}
                            </div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-medium border mt-0.5 ${roleStyle}`}
                            >
                              {member.seriesRole || (member as any).role || 'Thành viên'}
                            </span>
                          </div>
                        </div>

                        <div
                          className='w-6 h-6 rounded-full bg-white border border-[#D8D2C5] flex items-center justify-center text-[#57534E] shrink-0'
                          title={member.seriesRole || (member as any).role || 'Thành viên'}
                        >
                          <RoleIcon className='w-3 h-3 text-[#78716C]' />
                        </div>
                      </div>
                    );
                  })}

                  {seriesMembers.length > 5 && (
                    <p className='text-[10.5px] font-mono text-stone-500 text-center pt-0.5'>
                      + {seriesMembers.length - 5} thành viên khác
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Card Mục Cần Chú Ý & Rủi Ro (Bên dưới danh sách thành viên) */}
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4.5 shadow-xs space-y-3 pf-editorial-card'>
            <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-3'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4 text-[#F97316]' />
                <h2
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className='text-base font-bold text-[#1C1917]'
                >
                  Mục Cần Chú Ý &amp; Rủi Ro
                </h2>
              </div>
              {overdueTotal > 0 && (
                <span className='text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200'>
                  {overdueTotal} mục
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
                      Danh Sách Yêu Cầu Sửa Đổi Quá Hạn ({progress.overdueChangeRequests.length})
                    </h3>
                  </div>
                  <button
                    type='button'
                    onClick={handleSendReminders}
                    disabled={sendingReminders}
                    className='px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50'
                    title='Gửi thông báo nhắc nhở đến người phụ trách yêu cầu sửa'
                  >
                    {sendingReminders ? (
                      <Loader2 className='w-3 h-3 animate-spin' />
                    ) : (
                      <Bell className='w-3 h-3' />
                    )}
                    <span>{sendingReminders ? 'Đang gửi...' : 'Gửi thông báo nhắc hạn'}</span>
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
                        <div className='font-semibold text-[#1C1917] line-clamp-1'>
                          {cr.description}
                        </div>
                        <span className='px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-100 text-amber-800 shrink-0'>
                          1 yêu cầu sửa
                        </span>
                      </div>
                      <div className='flex items-center justify-between text-[11px] text-stone-600 font-sans'>
                        <span>
                          Người sửa: <strong>{cr.responsibleUserName}</strong>
                        </span>
                        <span className='text-red-600 font-bold'>
                          Hạn: {new Date(cr.dueDate).toLocaleDateString('vi-VN')}
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
                          <span>Xem yêu cầu cần sửa</span>
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
                      Danh Sách Công Việc Quá Hạn ({progress.overdue.length})
                    </h3>
                  </div>
                  <span className='text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200'>
                    Cần xử lý
                  </span>
                </div>

                <div className='space-y-2'>
                  {progress.overdue.map((od) => (
                    <div
                      key={od.assignmentId}
                      className='p-2.5 bg-white rounded-lg border border-red-200 shadow-2xs space-y-1.5 text-xs'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='font-semibold text-[#1C1917] line-clamp-1'>
                          {od.brief}
                        </div>
                        <span className='px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-red-100 text-red-700 shrink-0'>
                          {od.status}
                        </span>
                      </div>
                      <div className='flex items-center justify-between text-[11px] text-stone-600 font-sans'>
                        <span>{od.assigneeName}</span>
                        <span className='text-red-600 font-bold'>
                          Hạn: {new Date(od.dueDate).toLocaleDateString('vi-VN')}
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
                          <span>Xem việc cần xử lý</span>
                          <ArrowRight className='w-3 h-3' />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty Attention State - Tinh tế và gọn gàng */}
            {(!progress?.overdue || progress.overdue.length === 0) &&
              (!progress?.overdueChangeRequests || progress.overdueChangeRequests.length === 0) && (
                <div className='py-6 px-4 text-center space-y-1.5 bg-[#FAF8F5] rounded-xl border border-[#E7E2D8]'>
                  <div className='w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto'>
                    <CheckCircle2 className='w-4 h-4' />
                  </div>
                  <p className='text-xs font-semibold text-stone-800'>
                    Không có công việc hoặc yêu cầu sửa quá hạn
                  </p>
                  <p className='text-[11px] text-stone-500 max-w-xs mx-auto leading-relaxed'>
                    Tất cả nhiệm vụ và yêu cầu sửa đổi trong Series đều đang nằm trong thời hạn xử lý.
                  </p>
                </div>
              )}
          </div>
        </div>
      </section>
      )}

      {/* 4. Tiến độ công đoạn của chương đang chọn (Ma trận công đoạn) */}
      {(activeTab === 'all' || activeTab === 'chapters') && selectedChapter && (
        <section
          aria-label='Ma trận công đoạn'
          className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 shadow-2xs space-y-4 pf-editorial-card'
        >
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8D2C5] pb-3'>
            <div>
              <h2
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className='text-lg font-bold text-[#1C1917] flex items-center gap-2'
              >
                <Sliders className='w-4 h-4 text-[#F97316]' />
                <span>Tiến độ công đoạn · Chương {selectedChapter.chapterNumber}</span>
              </h2>
              <p className='text-xs text-[#57534E] mt-0.5'>
                Bảng đối chiếu trạng thái {selectedChapter.panelCount} Panel theo từng công đoạn sản
                xuất
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => {
                  setAssignModalChapter({
                    id: selectedChapter.chapterId,
                    number: selectedChapter.chapterNumber,
                  });
                  setIsAssignModalOpen(true);
                }}
                className='px-3 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-[#D8D2C5] hover:border-orange-300 text-[#44403C] hover:text-[#C2410C] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer'
              >
                <UserCheck className='w-3.5 h-3.5 text-[#57534E]' />
                <span>Giao Việc Cho Chương {selectedChapter.chapterNumber}</span>
              </button>
              {workspaceId && seriesId && (
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${selectedChapter.chapterId}`,
                    )
                  }
                  className='px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <ExternalLink className='w-3.5 h-3.5' />
                  <span>Mở Pipeline</span>
                </button>
              )}
            </div>
          </div>

          {selectedChapter.stages.length === 0 ? (
            <div className='py-8 text-center text-xs text-[#57534E] bg-[#FAF8F5] rounded-xl border border-dashed border-[#D8D2C5]'>
              Chưa có công đoạn nào được thiết lập cho Series này.
            </div>
          ) : (
            <div className='overflow-x-auto rounded-lg border border-[#D8D2C5] bg-[#FCFBF8]'>
              <table className='w-full text-xs text-left border-collapse'>
                <thead>
                  <tr className='border-b border-[#D8D2C5] text-[#57534E] font-sans text-xs bg-[#FAF8F5]'>
                    <th className='py-3 px-3.5 font-semibold'>Công Đoạn</th>
                    <th className='py-3 px-2 text-center text-[#57534E] font-semibold'>Chưa làm</th>
                    <th className='py-3 px-2 text-center text-blue-700 font-semibold'>Đang làm</th>
                    <th className='py-3 px-2 text-center text-amber-700 font-semibold'>Đã nộp</th>
                    <th className='py-3 px-2 text-center text-purple-700 font-semibold'>
                      Đang duyệt
                    </th>
                    <th className='py-3 px-2 text-center text-red-700 font-semibold'>
                      Yêu cầu sửa
                    </th>
                    <th className='py-3 px-2 text-center text-emerald-700 font-semibold'>
                      Đã duyệt
                    </th>
                    <th className='py-3 px-3.5 text-right font-semibold'>Tiến độ</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#EAE5DC] font-mono tabular-nums'>
                  {selectedChapter.stages.map((st) => {
                    const total = selectedChapter.panelCount;
                    const pct = total > 0 ? Math.round((st.approved / total) * 100) : 0;

                    return (
                      <tr key={st.stageId} className='hover:bg-[#F3F0E9]/60 transition-colors'>
                        <td className='py-3 px-3.5 font-sans font-semibold text-[#1C1917]'>
                          <div className='flex items-center gap-2'>
                            <span className='w-4 h-4 rounded bg-[#1C1917] text-white text-[10px] font-mono flex items-center justify-center shrink-0'>
                              {st.stageOrder}
                            </span>
                            <span>{st.name}</span>
                          </div>
                        </td>
                        <td className='py-3 px-2 text-center text-[#57534E] font-medium'>
                          {st.notStarted}
                        </td>
                        <td className='py-3 px-2 text-center text-blue-600 font-semibold'>
                          {st.inProgress}
                        </td>
                        <td className='py-3 px-2 text-center text-amber-600 font-semibold'>
                          {st.submitted}
                        </td>
                        <td className='py-3 px-2 text-center text-purple-600 font-semibold'>
                          {st.inReview}
                        </td>
                        <td className='py-3 px-2 text-center text-red-600 font-semibold'>
                          {st.changesRequested}
                        </td>
                        <td className='py-3 px-2 text-center text-emerald-600 font-bold'>
                          {st.approved}
                        </td>
                        <td className='py-3 px-3.5 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <div className='w-16 bg-[#F3F0E9] h-1.5 rounded-full overflow-hidden border border-[#D8D2C5]/50'>
                              <div
                                className='bg-emerald-600 h-full rounded-full'
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className='text-[11px] text-[#57534E] font-medium w-12 text-right'>
                              {st.approved}/{total} ({pct}%)
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

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
              <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 shadow-2xs space-y-4 pf-editorial-card'>
                <div>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D2C5] pb-3'>
                    <div>
                      <h2
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        className='text-base font-bold text-[#1C1917] flex items-center gap-2'
                      >
                        <Users className='w-4 h-4 text-[#F97316]' />
                        <span>Phân Bổ Khối Lượng Công Việc</span>
                      </h2>
                      <p className='text-xs text-[#57534E] mt-0.5'>
                        Số lượng panel và nhiệm vụ đang phụ trách theo từng nhân sự
                      </p>
                    </div>

                    <div className='flex items-center gap-2 self-start sm:self-auto shrink-0'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#D8D2C5] text-xs font-mono font-semibold text-[#57534E] shadow-2xs'>
                        <span>{progress?.workload?.length || 0} Nhân sự có việc</span>
                      </span>
                    </div>
                  </div>

                  {!progress?.workload || progress.workload.length === 0 ? (
                    <div className='py-8 text-center text-xs text-[#57534E] bg-[#FAF8F5] rounded-xl border border-dashed border-[#D8D2C5] mt-4 space-y-2'>
                      <p>
                        {seriesMembers.length > 0
                          ? `Bộ truyện đã có ${seriesMembers.length} thành viên nhưng chưa có phân công nào đang mở.`
                          : 'Chưa có nhân sự nào được gán vào bộ truyện này.'}
                      </p>
                      <button
                        type='button'
                        onClick={() => setIsMembersModalOpen(true)}
                        className='inline-flex items-center gap-1 px-3 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer'
                      >
                        <UserPlus className='w-3.5 h-3.5' />
                        <span>{seriesMembers.length > 0 ? 'Xem đội ngũ Series' : 'Gán thành viên từ Workspace'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className='space-y-2.5 mt-4'>
                      {progress.workload.map((w) => {
                        const roleUpper = String(w.role || '').toUpperCase();
                        const roleStyle =
                          ROLE_COLOR_MAP[roleUpper] || 'bg-[#F3F0E9] text-[#1C1917] border-[#D8D2C5]';

                        return (
                          <div
                            key={w.userId + w.role}
                            className='p-3 bg-[#FAF8F5] hover:bg-white border border-[#D8D2C5] rounded-xl transition-all shadow-2xs space-y-2'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex items-center gap-2.5 min-w-0'>
                                <div className='w-7 h-7 rounded-full bg-[#1C1917] text-white font-bold text-xs flex items-center justify-center shrink-0'>
                                  {w.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className='min-w-0'>
                                  <div className='text-xs font-bold text-[#1C1917] truncate'>
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
                                  {w.overdue} Quá hạn
                                </span>
                              )}
                            </div>

                            {/* Workload metric counters */}
                            <div className='grid grid-cols-3 gap-2 pt-2 border-t border-[#D8D2C5] text-xs font-mono text-center tabular-nums'>
                              <div className='bg-[#FCFBF8] p-1.5 rounded-lg border border-[#D8D2C5]'>
                                <div className='text-[#57534E] text-[11px] font-sans'>Đang làm</div>
                                <div className='font-bold text-[#1C1917] text-sm'>{w.open}</div>
                              </div>
                              <div className='bg-[#FCFBF8] p-1.5 rounded-lg border border-[#D8D2C5]'>
                                <div className='text-[#57534E] text-[11px] font-sans'>Chờ duyệt</div>
                                <div className='font-bold text-amber-600 text-sm'>
                                  {w.waitingReview}
                                </div>
                              </div>
                              <div className='bg-[#FCFBF8] p-1.5 rounded-lg border border-[#D8D2C5]'>
                                <div className='text-[#57534E] text-[11px] font-sans'>Hoàn thành</div>
                                <div className='font-bold text-emerald-600 text-sm'>{w.done}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className='text-xs text-[#57534E] font-sans text-center mt-3 pt-2 border-t border-[#D8D2C5]/60'>
                  Số lượng nhiệm vụ được gán, không phản ánh độ dài hay độ khó của từng panel
                </p>
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
