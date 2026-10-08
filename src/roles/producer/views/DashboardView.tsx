import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Download,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Users,
  User,
  ExternalLink,
  Loader2,
  ShieldCheck,
  GitBranch,
  Sliders,
  Eye,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  seriesService,
  SeriesProgressDto,
  ChapterProgressDto,
  StageBreakdownDto,
  WorkloadDto,
  OverdueAssignmentDto,
  BurndownPointDto,
  SeriesDetailDto,
} from '@/services/series.service';
import { SeriesChaptersModal } from '../modals/SeriesChaptersModal';
import { MangaProject, AssistantRosterItem, ProvenanceLogItem } from '@/types';

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
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
};

const ROLE_COLOR_MAP: Record<string, string> = {
  WRITER: 'bg-blue-100 text-blue-800 border-blue-200',
  ARTIST: 'bg-purple-100 text-purple-800 border-purple-200',
  LETTERER: 'bg-amber-100 text-amber-800 border-amber-200',
  EDITOR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PRODUCER: 'bg-orange-100 text-orange-800 border-orange-200',
  PUBLISHER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeProject,
  onOpenSpreadModal = () => {},
  onOpenCanvasModal = () => {},
  onRunAiAudit = () => {},
  onExportReport = () => {},
  onViewAuditLog = () => {},
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
  const [auditRunning, setAuditRunning] = useState(false);

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

  const handleAuditClick = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      onRunAiAudit();
      onShowToast('AI Audit', 'Đã hoàn tất kiểm tra tính nhất quán Model Continuity.');
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
    waitingReviewTotal,
    overdueTotal,
  } = useMemo(() => {
    if (!progress || progress.chapters.length === 0) {
      return {
        overallPercent: 0,
        totalPanels: 0,
        totalApprovedPanels: 0,
        inProdChapters: 0,
        approvedChapters: 0,
        publishedChapters: 0,
        waitingReviewTotal: 0,
        overdueTotal: 0,
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
    const overdue = progress.overdue.length;

    return {
      overallPercent: avgPercent,
      totalPanels: tPanels,
      totalApprovedPanels: tApproved,
      inProdChapters: inProd,
      approvedChapters: approved,
      publishedChapters: published,
      waitingReviewTotal: waiting,
      overdueTotal: overdue,
    };
  }, [progress]);

  // Selected chapter for stage breakdown
  const selectedChapter: ChapterProgressDto | undefined = useMemo(() => {
    if (!progress?.chapters?.length) return undefined;
    if (!selectedChapterId) return progress.chapters[0];
    return progress.chapters.find((c) => c.chapterId === selectedChapterId) || progress.chapters[0];
  }, [progress, selectedChapterId]);

  // Burndown chart calculation
  const burndownChartData = useMemo(() => {
    const list = progress?.burndown || [];
    if (list.length === 0) return null;

    const maxRemaining = Math.max(...list.map((p) => p.remaining), 5);
    const width = 640;
    const height = 180;
    const padLeft = 45;
    const padRight = 30;
    const padTop = 20;
    const padBottom = 30;

    const graphW = width - padLeft - padRight;
    const graphH = height - padTop - padBottom;

    const points = list.map((item, idx) => {
      const x =
        list.length === 1 ? padLeft + graphW / 2 : padLeft + (idx / (list.length - 1)) * graphW;
      const y = padTop + (1 - item.remaining / maxRemaining) * graphH;
      return { x, y, ...item };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const areaD =
      points.length > 0
        ? `${pathD} L ${points[points.length - 1].x} ${padTop + graphH} L ${points[0].x} ${
            padTop + graphH
          } Z`
        : '';

    return {
      points,
      pathD,
      areaD,
      maxRemaining,
      firstDate: list[0]?.date || '',
      lastDate: list[list.length - 1]?.date || '',
      currentRemaining: list[list.length - 1]?.remaining ?? 0,
      width,
      height,
    };
  }, [progress?.burndown]);

  return (
    <div className='space-y-6 max-w-7xl mx-auto pb-12'>
      {/* Top Banner Context & Header Row */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div>
            <div className='flex flex-wrap items-center gap-2 text-[11px] font-mono font-semibold tracking-wider text-[#F97316] mb-1'>
              <span className='uppercase'>
                {seriesDetail?.storyArc || 'TIẾN ĐỘ SẢN XUẤT SERIES (UC-16)'}
              </span>
              <span className='text-[#888888]'>•</span>
              <span className='text-[#555555] uppercase'>
                {seriesDetail?.format || activeProject?.format || 'DIGITAL MANUSCRIPT'}
              </span>
              <span className='text-[#888888]'>•</span>
              <span className='text-[#555555] uppercase'>
                {seriesDetail?.genre || activeProject?.genres?.[0] || 'GENERAL'}
              </span>
            </div>
            <h1 className='text-2xl lg:text-3xl font-bold font-display text-[#171717] tracking-tight flex items-center gap-3'>
              <span>
                Dashboard: {seriesDetail?.title || activeProject?.title || 'Tổng quan Series'}
              </span>
              {loading && <Loader2 className='w-5 h-5 text-[#F97316] animate-spin shrink-0' />}
            </h1>
            <p className='text-xs text-[#555555] mt-1'>
              Tổng hợp tiến độ thời gian thực qua StageProgress (Panel, Công đoạn, Khối lượng việc &
              Burndown).
              {progress?.generatedAt && (
                <span className='ml-2 font-mono text-[#888888]'>
                  Đồng bộ: {new Date(progress.generatedAt).toLocaleTimeString('vi-VN')}
                </span>
              )}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Refresh Progress Button */}
            <button
              onClick={() => void fetchProgress()}
              disabled={loading}
              className='px-3.5 py-2 rounded-lg bg-white hover:bg-[#F8F6F0] border border-[#E7E7E7] text-[#171717] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50'
              title='Làm mới dữ liệu tiến độ từ máy chủ'
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#555555] ${loading ? 'animate-spin' : ''}`}
              />
              <span>Làm mới</span>
            </button>

            {/* Run AI Audit Button */}
            <button
              onClick={handleAuditClick}
              disabled={auditRunning}
              className='px-3.5 py-2 rounded-lg bg-[#F3E8FF] hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#6D28D9] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-70'
            >
              <Sparkles className={`w-3.5 h-3.5 ${auditRunning ? 'animate-spin' : ''}`} />
              <span>{auditRunning ? 'Đang phân tích...' : 'AI Continuity Audit'}</span>
            </button>

            {/* Manage Chapters Modal Button */}
            {seriesId && (
              <button
                onClick={() => setIsChapterModalOpen(true)}
                className='px-3.5 py-2 rounded-lg bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FDBA74] text-[#C2410C] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
              >
                <BookOpen className='w-3.5 h-3.5 text-[#EA580C]' />
                <span>Quản Lý Chương (Duyệt)</span>
              </button>
            )}

            {/* Go to My Work & Reviews */}
            {workspaceId && seriesId && (
              <button
                onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/my-work`)}
                className='px-3.5 py-2 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95'
              >
                <ExternalLink className='w-3.5 h-3.5 text-[#F97316]' />
                <span>Bàn Làm Việc &amp; Duyệt</span>
              </button>
            )}
          </div>
        </div>
      </div>

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
            onClick={() => void fetchProgress()}
            className='px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold text-[11px] transition-colors cursor-pointer'
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Top KPI Metric Cards (Real Progress Data) */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Metric 1: Series Completion */}
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-4 shadow-xs hover:border-[#F97316]/40 transition-colors flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span>Tiến Độ Toàn Series</span>
              <span className='inline-flex items-center gap-1 text-[#EA580C] bg-[#FFF7ED] border border-[#FDBA74]/40 px-1.5 py-0.2 rounded font-semibold text-[10px]'>
                <TrendingUp className='w-3 h-3' /> StageProgress
              </span>
            </div>
            <div className='text-3xl font-bold font-display text-[#171717] mt-1'>
              {overallPercent}% <span className='text-sm font-normal text-[#888888]'>/ 100%</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB]'>
            <div className='w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden mb-1.5'>
              <div
                className='bg-gradient-to-r from-[#F97316] to-[#EA580C] h-full rounded-full transition-all duration-500'
                style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
              ></div>
            </div>
            <div className='text-[10px] font-mono text-[#555555] flex justify-between'>
              <span>
                <strong className='text-[#171717]'>{totalApprovedPanels}</strong> panel đã duyệt
              </span>
              <span>Tổng: {totalPanels} panel</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Chapter Pipeline Status */}
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-4 shadow-xs hover:border-[#F97316]/40 transition-colors flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span>Quy Trình Chương</span>
              <span className='text-[#0284C7] bg-[#E0F2FE] border border-[#0EA5E9]/30 px-1.5 py-0.2 rounded font-semibold text-[10px]'>
                {progress?.chapters.length || 0} Chương
              </span>
            </div>
            <div className='text-3xl font-bold font-display text-[#171717] mt-1 flex items-baseline gap-2'>
              <span>{inProdChapters}</span>
              <span className='text-xs font-semibold text-amber-600 font-sans'>Đang vẽ</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB] flex flex-wrap items-center gap-1.5 text-[10px] font-mono'>
            <span className='px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200'>
              {inProdChapters} Sản xuất
            </span>
            <span className='px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200'>
              {approvedChapters} Đã duyệt
            </span>
            <span className='px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200'>
              {publishedChapters} Xuất bản
            </span>
          </div>
        </div>

        {/* Metric 3: Waiting Review Gate */}
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-4 shadow-xs hover:border-[#8B5CF6]/40 transition-colors flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span className='text-[#6D28D9]'>Cổng Chờ Xét Duyệt</span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                  waitingReviewTotal > 0
                    ? 'text-[#C2410C] bg-[#FFF7ED] border border-[#FDBA74]'
                    : 'text-[#059669] bg-[#ECFDF5] border border-[#10B981]/30'
                }`}
              >
                {waitingReviewTotal > 0 ? 'Có việc chờ' : 'Thông suốt'}
              </span>
            </div>
            <div className='text-3xl font-bold font-display text-[#171717] mt-1'>
              {waitingReviewTotal}{' '}
              <span className='text-sm font-normal text-[#555555]'>Việc nộp</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB] flex items-center justify-between text-[10px] font-mono'>
            <span className='text-[#555555]'>Chờ Editor/Producer:</span>
            {workspaceId && seriesId && waitingReviewTotal > 0 ? (
              <button
                onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/my-work`)}
                className='text-[#6D28D9] font-bold hover:underline flex items-center gap-0.5 cursor-pointer'
              >
                Duyệt ngay <ArrowRight className='w-2.5 h-2.5' />
              </button>
            ) : (
              <span className='text-[#059669] flex items-center gap-1 font-semibold'>
                <CheckCircle2 className='w-3 h-3' /> Đã giải phóng
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Overdue & Production Gates */}
        <div
          className={`bg-white border rounded-xl p-4 shadow-xs transition-colors flex flex-col justify-between ${
            overdueTotal > 0
              ? 'border-red-300 hover:border-red-500'
              : 'border-[#E7E7E7] hover:border-[#10B981]/40'
          }`}
        >
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span>Việc Quá Hạn &amp; Rủi Ro</span>
              <span
                className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                  overdueTotal > 0
                    ? 'text-red-700 bg-red-50 border border-red-200'
                    : 'text-[#059669] bg-[#ECFDF5] border border-[#10B981]/30'
                }`}
              >
                {overdueTotal > 0 ? 'CẦN CAN THIỆP' : 'TIẾN ĐỘ AN TOÀN'}
              </span>
            </div>
            <div
              className={`text-3xl font-bold font-display mt-1 ${
                overdueTotal > 0 ? 'text-red-600' : 'text-[#171717]'
              }`}
            >
              {overdueTotal} <span className='text-base font-normal text-[#555555]'>Việc</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB] flex items-center justify-between text-[10px] font-mono'>
            <span className='text-[#555555]'>Kiểm tra thời hạn:</span>
            <span
              className={`font-semibold flex items-center gap-1 ${
                overdueTotal > 0 ? 'text-red-600' : 'text-[#059669]'
              }`}
            >
              {overdueTotal > 0 ? (
                <>
                  <AlertTriangle className='w-3.5 h-3.5 text-red-500' /> Có việc trễ hạn
                </>
              ) : (
                <>
                  <CheckCircle2 className='w-3.5 h-3.5' /> Tất cả đúng hạn
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Assignments Alert Banner (if any) */}
      {progress?.overdue && progress.overdue.length > 0 && (
        <div className='bg-red-50/80 border border-red-200 rounded-xl p-5 shadow-xs space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
              <h3 className='text-sm font-bold text-red-900 font-display'>
                Danh Sách Công Việc Quá Hạn ({progress.overdue.length})
              </h3>
            </div>
            <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200'>
              Ưu tiên xử lý
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {progress.overdue.map((od) => (
              <div
                key={od.assignmentId}
                className='p-3 bg-white rounded-lg border border-red-200 shadow-2xs space-y-2'
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='text-xs font-bold text-[#171717] line-clamp-1'>{od.brief}</div>
                  <span className='px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-100 text-red-700 shrink-0'>
                    {od.status}
                  </span>
                </div>
                <div className='flex items-center justify-between text-[11px] text-[#555555] font-mono'>
                  <span>
                    Người làm: <strong>{od.assigneeName}</strong>
                  </span>
                  <span className='text-red-600 font-bold'>
                    Hạn: {new Date(od.dueDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {workspaceId && seriesId && (
                  <button
                    onClick={() =>
                      navigate(
                        `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${od.chapterId}&assignmentId=${od.assignmentId}`,
                      )
                    }
                    className='w-full text-center py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1'
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

      {/* Main 2-Column Content: Chapter Progress & Stage Matrix vs Burndown & Workload */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left 2 Columns: Chapter Progress & Stage Matrix */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Section: Chapter Throughput & Selection */}
          <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs space-y-4'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-3'>
              <div>
                <h3 className='text-base font-bold font-display text-[#171717] flex items-center gap-2'>
                  <BookOpen className='w-4 h-4 text-[#F97316]' />
                  <span>Tiến Độ Theo Từng Chương ({progress?.chapters.length || 0})</span>
                </h3>
                <p className='text-xs text-[#555555]'>
                  Chọn một chương để đối chiếu chi tiết ma trận Panel theo từng công đoạn bên dưới
                </p>
              </div>

              {seriesId && (
                <button
                  onClick={() => setIsChapterModalOpen(true)}
                  className='text-xs font-semibold text-[#F97316] hover:text-[#EA580C] flex items-center gap-1 transition-colors cursor-pointer'
                >
                  <span>Mở danh sách quản lý chương</span>
                  <ArrowRight className='w-3.5 h-3.5' />
                </button>
              )}
            </div>

            {/* Chapters Progress Cards */}
            {!progress?.chapters || progress.chapters.length === 0 ? (
              <div className='py-8 text-center text-xs text-[#888888] bg-[#FAF8F5] rounded-lg border border-dashed border-[#E7E7E7]'>
                Chưa có chương nào trong Series này. Hãy tạo chương mới từ modal Quản lý Chương.
              </div>
            ) : (
              <div className='space-y-3'>
                {progress.chapters.map((ch) => {
                  const isSelected = selectedChapter?.chapterId === ch.chapterId;
                  const statusStyle = CHAPTER_STATUS_STYLE[ch.status] || {
                    label: ch.status,
                    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                  };

                  return (
                    <div
                      key={ch.chapterId}
                      onClick={() => setSelectedChapterId(ch.chapterId)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF7ED]/30 border-[#F97316] ring-2 ring-[#F97316]/20 shadow-xs'
                          : 'bg-[#FAF8F4] hover:bg-white border-[#E7E7E7] hover:border-zinc-300'
                      }`}
                    >
                      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2'>
                        <div className='flex items-center gap-2.5'>
                          <span
                            className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-[#F97316] text-white' : 'bg-zinc-800 text-white'
                            }`}
                          >
                            C{ch.chapterNumber}
                          </span>
                          <div>
                            <div className='text-xs font-bold text-[#171717] line-clamp-1'>
                              Chương {ch.chapterNumber}: {ch.title || 'Chưa đặt tiêu đề'}
                            </div>
                            <div className='text-[10px] text-[#737373] font-mono flex items-center gap-2'>
                              <span>{ch.pageCount} Trang</span>
                              <span>•</span>
                              <span>{ch.panelCount} Panel</span>
                              {ch.targetReleaseDate && (
                                <>
                                  <span>•</span>
                                  <span>Hẹn phát hành: {ch.targetReleaseDate}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center gap-2 self-start sm:self-center shrink-0'>
                          {ch.overdueAssignments > 0 && (
                            <span className='px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1'>
                              <AlertTriangle className='w-3 h-3' />
                              {ch.overdueAssignments} Quá hạn
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${statusStyle.className}`}
                          >
                            {statusStyle.label}
                          </span>
                          <span className='text-xs font-mono font-bold text-[#171717] w-12 text-right'>
                            {ch.percentComplete}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className='w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden'>
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected
                              ? 'bg-[#F97316]'
                              : ch.status === 'Approved' || ch.status === 'Published'
                                ? 'bg-[#10B981]'
                                : 'bg-zinc-700'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, ch.percentComplete))}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Stage Breakdown Matrix for Selected Chapter */}
          {selectedChapter && (
            <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs space-y-4'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E7E7] pb-3'>
                <div>
                  <h3 className='text-base font-bold font-display text-[#171717] flex items-center gap-2'>
                    <Sliders className='w-4 h-4 text-[#3B82F6]' />
                    <span>
                      Ma Trận Công Đoạn: Chương {selectedChapter.chapterNumber} (
                      {selectedChapter.title || 'Chưa đặt tiêu đề'})
                    </span>
                  </h3>
                  <p className='text-xs text-[#555555]'>
                    Phân bố {selectedChapter.panelCount} Panel theo từng Stage trong quy trình sản
                    xuất
                  </p>
                </div>
                <span className='text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700'>
                  {selectedChapter.stages.length} Công đoạn
                </span>
              </div>

              {selectedChapter.stages.length === 0 ? (
                <div className='py-6 text-center text-xs text-[#888888] bg-[#FAF8F5] rounded-lg'>
                  Chưa có công đoạn nào được thiết lập cho Series này.
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-xs text-left border-collapse'>
                    <thead>
                      <tr className='border-b border-[#E7E7E7] text-[#888888] font-mono text-[11px] uppercase tracking-wider bg-[#FAF8F5]'>
                        <th className='py-2.5 px-3'>Công Đoạn</th>
                        <th className='py-2.5 px-2 text-center text-zinc-500'>Chưa làm</th>
                        <th className='py-2.5 px-2 text-center text-blue-600'>Đang làm</th>
                        <th className='py-2.5 px-2 text-center text-amber-600'>Đã nộp</th>
                        <th className='py-2.5 px-2 text-center text-purple-600'>Đang duyệt</th>
                        <th className='py-2.5 px-2 text-center text-red-600'>Yêu cầu sửa</th>
                        <th className='py-2.5 px-2 text-center text-emerald-600'>Đã duyệt</th>
                        <th className='py-2.5 px-3 text-right'>Tiến độ</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-[#F0ECE1]'>
                      {selectedChapter.stages.map((st) => {
                        const total = selectedChapter.panelCount;
                        const pct = total > 0 ? Math.round((st.approved / total) * 100) : 0;

                        return (
                          <tr
                            key={st.stageId}
                            className='hover:bg-[#FAF8F5] transition-colors font-mono'
                          >
                            <td className='py-2.5 px-3 font-sans font-bold text-[#171717]'>
                              <div className='flex items-center gap-2'>
                                <span className='w-4 h-4 rounded bg-zinc-800 text-white text-[9px] font-mono flex items-center justify-center'>
                                  {st.stageOrder}
                                </span>
                                <span>{st.name}</span>
                              </div>
                            </td>
                            <td className='py-2.5 px-2 text-center text-zinc-500 font-semibold'>
                              {st.notStarted}
                            </td>
                            <td className='py-2.5 px-2 text-center text-blue-600 font-semibold'>
                              {st.inProgress}
                            </td>
                            <td className='py-2.5 px-2 text-center text-amber-600 font-semibold'>
                              {st.submitted}
                            </td>
                            <td className='py-2.5 px-2 text-center text-purple-600 font-semibold'>
                              {st.inReview}
                            </td>
                            <td className='py-2.5 px-2 text-center text-red-600 font-semibold'>
                              {st.changesRequested}
                            </td>
                            <td className='py-2.5 px-2 text-center text-emerald-600 font-bold'>
                              {st.approved}
                            </td>
                            <td className='py-2.5 px-3 text-right'>
                              <div className='flex items-center justify-end gap-2'>
                                <div className='w-16 bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden'>
                                  <div
                                    className='bg-emerald-600 h-full rounded-full'
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                                <span className='text-[10px] text-zinc-600 font-semibold w-8 text-right'>
                                  {pct}%
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
            </div>
          )}
        </div>

        {/* Right Column: Burndown Chart & Team Workload */}
        <div className='space-y-6'>
          {/* Section: Burndown SVG Chart */}
          <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div>
                <h3 className='text-sm font-bold font-display text-[#171717] flex items-center gap-2'>
                  <GitBranch className='w-4 h-4 text-[#F97316]' />
                  <span>Biểu Đồ Burndown (Việc Còn Lại)</span>
                </h3>
                <div className='text-[10px] font-mono text-[#888888]'>
                  Đo theo số lượng Assignment chưa hoàn thành
                </div>
              </div>
              {burndownChartData && (
                <span className='px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-mono font-bold'>
                  Còn: {burndownChartData.currentRemaining} việc
                </span>
              )}
            </div>

            {burndownChartData ? (
              <div>
                <div className='relative w-full h-48 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] p-2 overflow-hidden'>
                  <svg
                    viewBox={`0 0 ${burndownChartData.width} ${burndownChartData.height}`}
                    className='w-full h-full text-xs select-none'
                  >
                    <defs>
                      <linearGradient id='burndownGradient' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0%' stopColor='#F97316' stopOpacity='0.3' />
                        <stop offset='100%' stopColor='#F97316' stopOpacity='0.0' />
                      </linearGradient>
                    </defs>

                    {/* Horizontal gridlines */}
                    <line x1='40' y1='30' x2='610' y2='30' stroke='#E5E5E5' strokeDasharray='3 3' />
                    <text x='15' y='34' fill='#888888' fontSize='9' fontFamily='monospace'>
                      {burndownChartData.maxRemaining}
                    </text>

                    <line x1='40' y1='90' x2='610' y2='90' stroke='#E5E5E5' strokeDasharray='3 3' />
                    <text x='15' y='94' fill='#888888' fontSize='9' fontFamily='monospace'>
                      {Math.round(burndownChartData.maxRemaining / 2)}
                    </text>

                    <line
                      x1='40'
                      y1='150'
                      x2='610'
                      y2='150'
                      stroke='#E5E5E5'
                      strokeDasharray='3 3'
                    />
                    <text x='25' y='154' fill='#888888' fontSize='9' fontFamily='monospace'>
                      0
                    </text>

                    {/* Gradient fill area */}
                    {burndownChartData.areaD && (
                      <path d={burndownChartData.areaD} fill='url(#burndownGradient)' />
                    )}

                    {/* Line path */}
                    {burndownChartData.pathD && (
                      <path
                        d={burndownChartData.pathD}
                        fill='none'
                        stroke='#F97316'
                        strokeWidth='2.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    )}

                    {/* Data Points */}
                    {burndownChartData.points.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={idx === burndownChartData.points.length - 1 ? 4 : 2}
                        fill={idx === burndownChartData.points.length - 1 ? '#EA580C' : '#F97316'}
                        stroke='#FFFFFF'
                        strokeWidth='1.5'
                      />
                    ))}

                    {/* X axis labels */}
                    <text x='45' y='172' fill='#888888' fontSize='9' fontFamily='monospace'>
                      {burndownChartData.firstDate}
                    </text>
                    <text
                      x={burndownChartData.width - 90}
                      y='172'
                      fill='#F97316'
                      fontSize='9'
                      fontFamily='monospace'
                      fontWeight='bold'
                    >
                      Hôm nay
                    </text>
                  </svg>
                </div>
                <p className='text-[10px] text-[#737373] mt-2 font-mono text-center'>
                  Lộ trình hoàn thành các công việc theo dòng thời gian (90 ngày gần nhất)
                </p>
              </div>
            ) : (
              <div className='py-10 text-center text-xs text-[#888888] bg-[#FAF8F5] rounded-lg border border-dashed border-[#E7E7E7] space-y-2'>
                <GitBranch className='w-6 h-6 mx-auto text-[#CCCCCC]' />
                <p>Chưa có dữ liệu lịch sử Burndown.</p>
                <p className='text-[10px] text-[#AAAAAA]'>
                  Khi có công việc được tạo và phân công trong Series, đồ thị sẽ tự động hiển thị.
                </p>
              </div>
            )}
          </div>

          {/* Section: Team Workload Table */}
          <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div>
                <h3 className='text-sm font-bold font-display text-[#171717] flex items-center gap-2'>
                  <Users className='w-4 h-4 text-[#F97316]' />
                  <span>Khối Lượng Công Việc Theo Người ({progress?.workload.length || 0})</span>
                </h3>
                <div className='text-[10px] font-mono text-[#888888]'>
                  Thống kê các nhiệm vụ đang gán cho từng thành viên
                </div>
              </div>
            </div>

            {!progress?.workload || progress.workload.length === 0 ? (
              <div className='py-8 text-center text-xs text-[#888888] bg-[#FAF8F5] rounded-lg border border-dashed border-[#E7E7E7]'>
                Chưa có thành viên nào được phân công việc trong Series này.
              </div>
            ) : (
              <div className='space-y-2.5'>
                {progress.workload.map((w) => {
                  const roleUpper = String(w.role || '').toUpperCase();
                  const roleStyle =
                    ROLE_COLOR_MAP[roleUpper] || 'bg-zinc-100 text-zinc-700 border-zinc-200';

                  return (
                    <div
                      key={w.userId + w.role}
                      className='p-3 bg-[#FAF8F4] hover:bg-white border border-[#E7E7E7] rounded-xl transition-all shadow-2xs space-y-2'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <div className='w-7 h-7 rounded-full bg-[#171717] text-white font-bold text-xs flex items-center justify-center shrink-0'>
                            {w.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className='min-w-0'>
                            <div className='text-xs font-bold text-[#171717] truncate'>
                              {w.fullName}
                            </div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border ${roleStyle}`}
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
                      <div className='grid grid-cols-3 gap-1 pt-1 border-t border-[#F0ECE1] text-[10px] font-mono text-center'>
                        <div className='bg-white p-1 rounded border border-[#E7E7E7]'>
                          <div className='text-[#888888]'>Đang làm</div>
                          <div className='font-bold text-zinc-900'>{w.open}</div>
                        </div>
                        <div className='bg-white p-1 rounded border border-[#E7E7E7]'>
                          <div className='text-[#888888]'>Chờ duyệt</div>
                          <div className='font-bold text-amber-600'>{w.waitingReview}</div>
                        </div>
                        <div className='bg-white p-1 rounded border border-[#E7E7E7]'>
                          <div className='text-[#888888]'>Hoàn thành</div>
                          <div className='font-bold text-emerald-600'>{w.done}</div>
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
    </div>
  );
};
