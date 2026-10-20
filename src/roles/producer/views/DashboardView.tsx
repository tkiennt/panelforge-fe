import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { notificationService } from '@/services/notification.service';
import {
  seriesService,
  SeriesProgressDto,
  ChapterProgressDto,
  SeriesDetailDto,
} from '@/services/series.service';
import { SeriesChaptersModal } from '../modals/SeriesChaptersModal';
import { CreateAssignmentModal } from '../modals/CreateAssignmentModal';
import { SeriesBurndownCard } from '../components/SeriesBurndownCard';
import { MangaProject, AssistantRosterItem, ProvenanceLogItem } from '@/types';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { useTranslation } from '@/lib/i18n';

interface DashboardViewProps {
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeProject,
  onRunAiAudit = () => {},
  onShowToast = (_title?: string, _desc?: string) => {},
}) => {
  const { t } = useTranslation('pipeline');
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

  const fetchProgress = useCallback(async () => {
    if (!seriesId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [prog, detail] = await Promise.all([
        seriesService.getSeriesProgress(seriesId),
        seriesService.getSeriesById(seriesId).catch(() => null),
      ]);
      setProgress(prog);
      setSeriesDetail(detail);
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
  }, [seriesId, onShowToast]);

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
    <PageContainer className='w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6 pb-16 font-sans text-[#1C1917]'>
      {/* 1. Header & Actions */}
      <header className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 shadow-2xs'>
        <div className='flex flex-col xl:flex-row xl:items-center justify-between gap-4'>
          <div className='space-y-1.5'>
            {/* Metadata Pills */}
            <div className='flex flex-wrap items-center gap-2 text-xs font-semibold text-[#57534E]'>
              {seriesDetail?.storyArc && (
                <span className='px-2 py-0.5 rounded-md bg-[#F3F0E9] text-[#1C1917] border border-[#D8D2C5]'>
                  {seriesDetail.storyArc}
                </span>
              )}
              {(seriesDetail?.format || activeProject?.format) && (
                <span className='px-2 py-0.5 rounded-md bg-[#FFF2E6] text-[#C2410C] border border-[#D8D2C5]'>
                  {seriesDetail?.format || activeProject?.format}
                </span>
              )}
              {(seriesDetail?.genre || activeProject?.genres?.[0]) && (
                <span className='px-2 py-0.5 rounded-md bg-[#F3F0E9] text-[#1C1917] border border-[#D8D2C5]'>
                  {seriesDetail?.genre || activeProject?.genres?.[0]}
                </span>
              )}
            </div>

            <div className='flex items-center gap-3'>
              <h1 className='text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight'>
                <span>{t('dashboard.seriesOverview', { title: seriesTitle })}</span>
              </h1>
              {loading && <Loader2 className='w-5 h-5 text-[#F97316] animate-spin shrink-0' />}
            </div>

            <div className='flex flex-wrap items-center gap-3 text-xs text-[#57534E]'>
              <p>Theo dõi tiến độ chương, công đoạn và công việc của đội ngũ.</p>
              {progress?.generatedAt && <span className='text-stone-400'>•</span>}
              {progress?.generatedAt && (
                <span className='text-[#57534E] font-mono'>
                  Đồng bộ: {new Date(progress.generatedAt).toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className='flex flex-wrap items-center gap-2.5 pt-2 xl:pt-0'>
            {/* Refresh Button */}
            <button
              type='button'
              onClick={() => void fetchProgress()}
              disabled={loading}
              className='px-3.5 py-2 rounded-lg bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] text-[#1C1917] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50'
              title='Làm mới dữ liệu tiến độ từ máy chủ'
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#57534E] ${loading ? 'animate-spin' : ''}`}
              />
              <span>Làm mới</span>
            </button>

            {/* AI Continuity Audit */}
            <button
              type='button'
              onClick={handleAuditClick}
              disabled={auditRunning}
              className='px-3.5 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-70 shadow-2xs'
              title='Kiểm tra tính nhất quán model nhân vật và khung truyện với AI'
            >
              <Sparkles className={`w-3.5 h-3.5 ${auditRunning ? 'animate-spin' : ''}`} />
              <span>{auditRunning ? 'Đang kiểm tra...' : 'Kiểm tra nhất quán với AI'}</span>
            </button>

            {/* Manage Chapters Modal */}
            {seriesId && (
              <button
                type='button'
                onClick={() => setIsChapterModalOpen(true)}
                className='px-3.5 py-2 rounded-lg bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] text-[#1C1917] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95'
              >
                <BookOpen className='w-3.5 h-3.5 text-[#57534E]' />
                <span>{t('dashboard.manageChapters')}</span>
              </button>
            )}

            {/* Primary CTA: Production Pipeline */}
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
                className='px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95'
              >
                <span>Mở Quy trình sản xuất</span>
                <ArrowRight className='w-3.5 h-3.5 text-white' />
              </button>
            )}
          </div>
        </div>
      </header>

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

      {/* 2. Top 4 Core KPIs */}
      <section
        aria-label='Chỉ số tổng quan'
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
      >
        {/* KPI 1: Series Completion */}
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 shadow-2xs hover:border-[#F97316] transition-colors flex flex-col justify-between space-y-3'>
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-[#57534E] mb-1'>
              <span>{t('dashboard.totalProgress')}</span>
              <span className='inline-flex items-center gap-1 text-[#C2410C] bg-[#FFF2E6] border border-[#D8D2C5] px-1.5 py-0.5 rounded text-[11px] font-semibold'>
                <TrendingUp className='w-3 h-3' /> Hoàn thiện
              </span>
            </div>
            <div className='text-3xl font-bold font-sans tabular-nums text-[#1C1917] mt-1'>
              {loading ? '—' : `${overallPercent}%`}
            </div>
            <p className='text-[11px] text-[#57534E] mt-1'>
              Tính theo công đoạn hoàn tất cuối cùng
            </p>
          </div>
          <div className='pt-2 border-t border-[#D8D2C5]/70'>
            <div className='w-full bg-[#F3F0E9] h-2 rounded-full overflow-hidden mb-1.5'>
              <div
                className='bg-gradient-to-r from-[#F97316] to-[#EA580C] h-full rounded-full transition-all duration-500'
                style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
              />
            </div>
            <div className='text-[11px] font-mono text-[#57534E] flex justify-between'>
              <span>
                <strong className='text-[#1C1917] font-semibold'>{totalApprovedPanels}</strong>{' '}
                panel đã duyệt
              </span>
              <span>Tổng: {totalPanels} panel</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Chapter Pipeline Status */}
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 shadow-2xs hover:border-[#F97316] transition-colors flex flex-col justify-between space-y-3'>
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-[#57534E] mb-1'>
              <span>Chương Đang Sản Xuất</span>
              <span className='text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded text-[11px] font-semibold'>
                {totalChapters} Chương
              </span>
            </div>
            <div className='text-3xl font-bold font-sans tabular-nums text-[#1C1917] mt-1 flex items-baseline gap-2'>
              <span>{loading ? '—' : inProdChapters}</span>
              <span className='text-xs font-semibold text-[#C2410C]'>đang thực hiện</span>
            </div>
            <p className='text-[11px] text-[#57534E] mt-1'>Số chương đang ở giai đoạn sản xuất</p>
          </div>
          <div className='pt-2 border-t border-[#D8D2C5]/70 flex flex-wrap items-center gap-1.5 text-[11px] font-mono'>
            <span className='px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200'>
              {inProdChapters} Đang vẽ
            </span>
            <span className='px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200'>
              {approvedChapters} Đã duyệt
            </span>
            <span className='px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200'>
              {publishedChapters} Xuất bản
            </span>
          </div>
        </div>

        {/* KPI 3: Waiting Review Gate */}
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-5 shadow-2xs hover:border-[#F97316] transition-colors flex flex-col justify-between space-y-3'>
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-[#57534E] mb-1'>
              <span className='text-purple-900'>{t('dashboard.waitingReview')}</span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  waitingReviewTotal > 0
                    ? 'text-amber-800 bg-amber-50 border border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                }`}
              >
                {waitingReviewTotal > 0 ? 'Có việc chờ duyệt' : 'Không có việc tồn'}
              </span>
            </div>
            <div className='text-3xl font-bold font-sans tabular-nums text-[#1C1917] mt-1'>
              {loading ? '—' : waitingReviewTotal}{' '}
              <span className='text-sm font-normal text-[#57534E]'>{t('dashboard.submittedWork')}</span>
            </div>
            <p className='text-[11px] text-[#57534E] mt-1'>
              Bài nộp cần Producer hoặc Editor kiểm duyệt
            </p>
          </div>
          <div className='pt-2 border-t border-[#D8D2C5]/70 flex items-center justify-between text-[11px]'>
            <span className='text-[#57534E]'>Hành động:</span>
            {workspaceId && seriesId && waitingReviewTotal > 0 ? (
              <button
                type='button'
                onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/my-work`)}
                className='text-[#C2410C] font-bold hover:underline flex items-center gap-1 cursor-pointer'
              >
                Duyệt ngay <ArrowRight className='w-3 h-3' />
              </button>
            ) : (
              <span className='text-emerald-700 flex items-center gap-1 font-semibold'>
                <CheckCircle2 className='w-3.5 h-3.5' /> Đã thông suốt
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Overdue & Production Risks */}
        <div
          className={`bg-white border rounded-xl p-5 shadow-xs transition-colors flex flex-col justify-between space-y-3 ${
            overdueTotal > 0
              ? 'border-red-300 hover:border-red-400'
              : 'border-[#E7E5E4] hover:border-stone-300'
          }`}
        >
          <div>
            <div className='flex items-center justify-between text-xs font-semibold text-stone-500 mb-1'>
              <span>{t('dashboard.overdueRisk')}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  overdueTotal > 0
                    ? 'text-red-700 bg-red-50 border border-red-200 font-bold'
                    : 'text-stone-700 bg-stone-100 border border-stone-200'
                }`}
              >
                {overdueTotal > 0 ? 'CẦN XỬ LÝ' : 'ĐÚNG HẠN'}
              </span>
            </div>
            <div
              className={`text-3xl font-bold font-sans tabular-nums mt-1 ${
                overdueTotal > 0 ? 'text-red-600' : 'text-[#1C1917]'
              }`}
            >
              {loading ? '—' : overdueTotal}{' '}
              <span className='text-sm font-normal text-stone-500'>Mục</span>
            </div>
            <p className='text-[11px] text-stone-500 mt-1'>
              {overdueTotal > 0
                ? `${overdueAssignmentsCount} việc quá hạn · ${overdueChangeRequestsCount} mục sửa trễ hạn`
                : 'Không có công việc hoặc yêu cầu sửa quá hạn'}
            </p>
          </div>
          <div className='pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]'>
            <span className='text-stone-500'>Trạng thái hạn:</span>
            <span
              className={`font-medium flex items-center gap-1 ${
                overdueTotal > 0 ? 'text-red-600 font-bold' : 'text-stone-700'
              }`}
            >
              {overdueTotal > 0 ? (
                <>
                  <AlertTriangle className='w-3.5 h-3.5 text-red-500' /> Cần can thiệp hạn chót
                </>
              ) : (
                <>
                  <Check className='w-3.5 h-3.5 text-stone-600' /> Không trễ hạn
                </>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Chương & Mục cần chú ý (2 Cột phân bố) */}
      <section className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        {/* Left: Danh sách chương (7 cột trên lg) */}
        <div className='lg:col-span-7 space-y-4'>
          <div className='bg-white border border-[#E7E5E4] rounded-xl p-5 shadow-xs space-y-4'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3'>
              <div>
                <h2 className='text-base font-bold font-display text-[#1C1917] flex items-center gap-2'>
                  <BookOpen className='w-4 h-4 text-[#F97316]' />
                  <span>Tiến Độ Theo Từng Chương ({progress?.chapters.length || 0})</span>
                </h2>
                <p className='text-xs text-stone-500 mt-0.5'>
                  {selectedChapter
                    ? `Đang xem: Chương ${selectedChapter.chapterNumber} · Chọn chương để đối chiếu ma trận công đoạn bên dưới`
                    : 'Chọn một chương để xem chi tiết ma trận công đoạn bên dưới'}
                </p>
              </div>

              {seriesId && (
                <button
                  type='button'
                  onClick={() => setIsChapterModalOpen(true)}
                  className='text-xs font-semibold text-[#F97316] hover:text-[#EA580C] flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto'
                >
                  <span>Quản lý chương</span>
                  <ArrowRight className='w-3.5 h-3.5' />
                </button>
              )}
            </div>

            {/* Chapters list */}
            {!progress?.chapters || progress.chapters.length === 0 ? (
              <div className='py-8 text-center text-xs text-stone-500 bg-[#FCFBF8] rounded-xl border border-dashed border-stone-300'>
                Chưa có chương nào trong Series này. Hãy tạo chương mới từ danh sách Quản lý Chương.
              </div>
            ) : (
              <div className='space-y-2.5'>
                {progress.chapters.map((ch) => {
                  const isSelected = selectedChapter?.chapterId === ch.chapterId;
                  const statusStyle = CHAPTER_STATUS_STYLE[ch.status] || {
                    label: ch.status,
                    className: 'bg-stone-100 text-stone-700 border-stone-200',
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
                      className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#F97316] ${
                        isSelected
                          ? 'bg-amber-50/40 border-amber-300 border-l-4 border-l-[#F97316] shadow-xs'
                          : 'bg-[#FCFBF8] hover:bg-white border-[#E7E5E4] hover:border-stone-300'
                      }`}
                    >
                      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2'>
                        <div className='flex items-center gap-3 min-w-0'>
                          <span
                            className={`w-7 h-7 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-[#F97316] text-white' : 'bg-stone-800 text-white'
                            }`}
                          >
                            C{ch.chapterNumber}
                          </span>
                          <div className='min-w-0'>
                            <div className='text-sm font-semibold text-[#1C1917] truncate'>
                              {cleanLabel}
                            </div>
                            <div className='text-xs text-stone-500 font-sans flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5'>
                              {hasPanels ? (
                                <span>
                                  {ch.pageCount} trang · {ch.panelCount} panel
                                </span>
                              ) : (
                                <span className='text-stone-400 italic'>Chưa có nội dung</span>
                              )}
                              {formattedRelease && (
                                <>
                                  <span className='text-stone-300'>•</span>
                                  <span>Hạn: {formattedRelease}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chapter Actions & Badges */}
                        <div className='flex items-center gap-2 self-start sm:self-center shrink-0'>
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
                            className='px-2.5 py-1 rounded-md bg-white hover:bg-orange-50 text-stone-700 hover:text-[#EA580C] border border-stone-300 hover:border-orange-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer'
                            title={`Giao việc mới cho Chương ${ch.chapterNumber}`}
                          >
                            <UserCheck className='w-3.5 h-3.5 text-stone-500' />
                            <span>Giao việc</span>
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar (only if has panels) */}
                      {hasPanels && (
                        <div className='w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-2'>
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isSelected
                                ? 'bg-[#F97316]'
                                : ch.status === 'Approved' || ch.status === 'Published'
                                  ? 'bg-emerald-600'
                                  : 'bg-stone-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, ch.percentComplete))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Mục cần chú ý & Rủi ro (5 cột trên lg) */}
        <div className='lg:col-span-5 space-y-4'>
          <div className='bg-white border border-[#E7E5E4] rounded-xl p-5 shadow-xs space-y-4'>
            <div className='flex items-center justify-between border-b border-stone-200 pb-3'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4 text-[#F97316]' />
                <h2 className='text-base font-bold font-display text-[#1C1917]'>
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
                className='bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3'
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
                    className='px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50'
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
                      className='p-3 bg-white rounded-lg border border-amber-200 shadow-2xs space-y-2'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='text-xs font-semibold text-[#1C1917] line-clamp-1'>
                          {cr.description}
                        </div>
                        <span className='px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 shrink-0'>
                          1 yêu cầu sửa
                        </span>
                      </div>
                      <div className='flex items-center justify-between text-xs text-stone-600 font-sans'>
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
                          className='w-full text-center py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1'
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
              <div className='bg-red-50/70 border border-red-200 rounded-xl p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
                    <h3 className='text-xs font-bold text-red-950 font-sans'>
                      Danh Sách Công Việc Quá Hạn ({progress.overdue.length})
                    </h3>
                  </div>
                  <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200'>
                    Ưu tiên
                  </span>
                </div>

                <div className='space-y-2'>
                  {progress.overdue.map((od) => (
                    <div
                      key={od.assignmentId}
                      className='p-3 bg-white rounded-lg border border-red-200 shadow-2xs space-y-2'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='text-xs font-semibold text-[#1C1917] line-clamp-1'>
                          {od.brief}
                        </div>
                        <span className='px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 shrink-0'>
                          {od.status}
                        </span>
                      </div>
                      <div className='flex items-center justify-between text-xs text-stone-600 font-sans'>
                        <span>
                          Người làm: <strong>{od.assigneeName}</strong>
                        </span>
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
                          className='w-full text-center py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1'
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

            {/* Empty Attention State */}
            {(!progress?.overdue || progress.overdue.length === 0) &&
              (!progress?.overdueChangeRequests || progress.overdueChangeRequests.length === 0) && (
                <div className='py-10 text-center space-y-2 text-stone-500 bg-[#FCFBF8] rounded-xl border border-dashed border-stone-200 p-4'>
                  <div className='w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto'>
                    <CheckCircle2 className='w-5 h-5' />
                  </div>
                  <p className='text-xs font-semibold text-stone-800'>
                    Không có công việc hoặc yêu cầu sửa quá hạn
                  </p>
                  <p className='text-[11px] text-stone-500 max-w-xs mx-auto'>
                    Tất cả nhiệm vụ và yêu cầu sửa đổi trong Series đều đang nằm trong thời hạn xử
                    lý.
                  </p>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* 4. Tiến độ công đoạn của chương đang chọn (Ma trận công đoạn) */}
      {selectedChapter && (
        <section
          aria-label='Ma trận công đoạn'
          className='bg-white border border-[#E7E5E4] rounded-xl p-5 shadow-xs space-y-4'
        >
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3'>
            <div>
              <h2 className='text-base font-bold font-display text-[#1C1917] flex items-center gap-2'>
                <Sliders className='w-4 h-4 text-[#F97316]' />
                <span>Tiến độ công đoạn · Chương {selectedChapter.chapterNumber}</span>
              </h2>
              <p className='text-xs text-stone-500 mt-0.5'>
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
                className='px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer'
              >
                <UserCheck className='w-3.5 h-3.5' />
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
                  className='px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer'
                >
                  <ExternalLink className='w-3.5 h-3.5 text-stone-600' />
                  <span>Mở Pipeline</span>
                </button>
              )}
            </div>
          </div>

          {selectedChapter.stages.length === 0 ? (
            <div className='py-8 text-center text-xs text-stone-500 bg-[#FCFBF8] rounded-xl border border-dashed border-stone-200'>
              Chưa có công đoạn nào được thiết lập cho Series này.
            </div>
          ) : (
            <div className='overflow-x-auto rounded-lg border border-stone-200'>
              <table className='w-full text-xs text-left border-collapse'>
                <thead>
                  <tr className='border-b border-stone-200 text-stone-600 font-sans text-xs bg-[#FAF8F5]'>
                    <th className='py-3 px-3.5 font-semibold'>Công Đoạn</th>
                    <th className='py-3 px-2 text-center text-stone-500 font-semibold'>Chưa làm</th>
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
                <tbody className='divide-y divide-stone-100 font-mono tabular-nums'>
                  {selectedChapter.stages.map((st) => {
                    const total = selectedChapter.panelCount;
                    const pct = total > 0 ? Math.round((st.approved / total) * 100) : 0;

                    return (
                      <tr key={st.stageId} className='hover:bg-stone-50/70 transition-colors'>
                        <td className='py-3 px-3.5 font-sans font-semibold text-[#1C1917]'>
                          <div className='flex items-center gap-2'>
                            <span className='w-4 h-4 rounded bg-stone-800 text-white text-[10px] font-mono flex items-center justify-center shrink-0'>
                              {st.stageOrder}
                            </span>
                            <span>{st.name}</span>
                          </div>
                        </td>
                        <td className='py-3 px-2 text-center text-stone-500 font-medium'>
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
                            <div className='w-16 bg-stone-200 h-1.5 rounded-full overflow-hidden'>
                              <div
                                className='bg-emerald-600 h-full rounded-full'
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className='text-[11px] text-stone-600 font-medium w-12 text-right'>
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
      <section className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        {/* Biểu đồ Burndown / Công việc còn lại theo thời gian (6 cột trên lg) */}
        <div className='lg:col-span-6 space-y-4 self-start'>
          <SeriesBurndownCard burndown={progress?.burndown} loading={loading} />
        </div>

        {/* Phân công thành viên / Khối lượng công việc theo người (6 cột trên lg) */}
        <div className='lg:col-span-6 space-y-4 self-start'>
          <div className='bg-white border border-[#E7E5E4] rounded-xl p-5 shadow-xs space-y-4'>
            <div>
              <div className='flex items-center justify-between border-b border-stone-200 pb-3'>
                <div>
                  <h2 className='text-sm font-bold font-display text-[#1C1917] flex items-center gap-2'>
                    <Users className='w-4 h-4 text-[#F97316]' />
                    <span>Phân Công Thành Viên ({progress?.workload.length || 0})</span>
                  </h2>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    Khối lượng công việc theo người · Toàn bộ series
                  </p>
                </div>
              </div>

              {!progress?.workload || progress.workload.length === 0 ? (
                <div className='py-8 text-center text-xs text-stone-500 bg-[#FCFBF8] rounded-xl border border-dashed border-stone-200 mt-4'>
                  Chưa có thành viên nào được phân công việc trong Series này.
                </div>
              ) : (
                <div className='space-y-2.5 mt-4'>
                  {progress.workload.map((w) => {
                    const roleUpper = String(w.role || '').toUpperCase();
                    const roleStyle =
                      ROLE_COLOR_MAP[roleUpper] || 'bg-stone-100 text-stone-700 border-stone-200';

                    return (
                      <div
                        key={w.userId + w.role}
                        className='p-3 bg-[#FCFBF8] hover:bg-white border border-[#E7E5E4] rounded-xl transition-all shadow-2xs space-y-2'
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2.5 min-w-0'>
                            <div className='w-7 h-7 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center shrink-0'>
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
                        <div className='grid grid-cols-3 gap-2 pt-2 border-t border-stone-200 text-xs font-mono text-center tabular-nums'>
                          <div className='bg-white p-1.5 rounded-lg border border-stone-200'>
                            <div className='text-stone-500 text-[11px] font-sans'>Đang làm</div>
                            <div className='font-bold text-stone-900 text-sm'>{w.open}</div>
                          </div>
                          <div className='bg-white p-1.5 rounded-lg border border-stone-200'>
                            <div className='text-stone-500 text-[11px] font-sans'>Chờ duyệt</div>
                            <div className='font-bold text-amber-600 text-sm'>
                              {w.waitingReview}
                            </div>
                          </div>
                          <div className='bg-white p-1.5 rounded-lg border border-stone-200'>
                            <div className='text-stone-500 text-[11px] font-sans'>Hoàn thành</div>
                            <div className='font-bold text-emerald-600 text-sm'>{w.done}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className='text-xs text-stone-500 font-sans text-center mt-3 pt-2 border-t border-stone-100'>
              Số lượng nhiệm vụ được gán, không phản ánh độ dài hay độ khó của từng panel
            </p>
          </div>
        </div>
      </section>

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
