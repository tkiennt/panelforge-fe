import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
  ShieldCheck,
  Eye,
  Clock,
  Layers,
  Lock,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ShieldAlert,
  SlidersHorizontal,
  Palette,
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
  const { t } = useTranslation('review');
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

      const [gridItems, memberList, legacyItems, series, bible, chapterPage] = await Promise.all([
        workspaceId && typeof assignmentService.getTaskGridReviewQueue === 'function'
          ? assignmentService
              .getTaskGridReviewQueue(workspaceId, { seriesId })
              .catch(() => [] as TaskGridReviewItemDto[])
          : Promise.resolve([] as TaskGridReviewItemDto[]),
        workspaceId
          ? workspaceService.getMembers(workspaceId).catch(() => [])
          : Promise.resolve([]),
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

      const mappedGridItems: DeskQueueItem[] = (gridItems || []).map((g) => {
        const m = (memberList || []).find((x) => x.userId === g.assigneeUserId);
        const reviewer = g.reviewerUserId
          ? (memberList || []).find((x) => x.userId === g.reviewerUserId)
          : undefined;
        const reviewerName = reviewer
          ? reviewer.fullName || reviewer.email.split('@')[0]
          : g.reviewerUserId
            ? g.reviewerUserId.slice(0, 8)
            : null;
        const gate = inferGateFromStage(g.stageName);
        return {
          isGridItem: true,
          taskId: g.taskId,
          assignmentId: g.taskId,
          reviewerUserId: g.reviewerUserId ?? null,
          reviewerName,
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
          scopeLabel: g.pageNumber != null ? `Trang ${g.pageNumber}` : 'Toàn chương',
          assigneeUserId: g.assigneeUserId ?? '',
          assigneeName: m
            ? m.fullName || m.email.split('@')[0]
            : g.assigneeUserId
              ? g.assigneeUserId.slice(0, 8)
              : 'Chưa rõ nghệ sĩ',
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
      console.error('Lỗi tải hàng đợi thẩm định Editor:', err);
      setError(err.message || 'Không thể tải hàng đợi thẩm định.');
    } finally {
      setLoading(false);
    }
  }, [seriesId, workspaceId, activeGate, statusFilter, currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper to determine destination review URL
  const getReviewUrl = (item: EditorReviewQueueItemDto) => {
    return item.stageSlug === 'script'
      ? `/workspaces/${workspaceId}/series/${seriesId}/chapters/${item.chapterId}/script/review?assignmentId=${item.assignmentId}`
      : `/workspaces/${workspaceId}/series/${seriesId}/chapters/${item.chapterId}/review/${item.assignmentId}?chapterId=${item.chapterId}`;
  };

  // Handle Open Review
  const handleOpenReview = async (item: EditorReviewQueueItemDto) => {
    if (!workspaceId || !seriesId) return;
    if (item.isSelfSubmission) {
      onShowToast?.(
        'Quy tắc 4 mắt (BR-26)',
        'Bạn không thể tự duyệt bài do chính mình nộp. Vui lòng chuyển giao cho Biên tập viên khác.',
      );
      return;
    }

    try {
      setOpeningReviewId(item.assignmentId);
      if (item.status === 'Submitted') {
        await assignmentService.openReview(item.chapterId, item.assignmentId);
        onShowToast?.('Bắt đầu thẩm định', `Đã mở phiên duyệt cho ${item.scopeLabel}`);
      }
      navigate(getReviewUrl(item));
    } catch (err: any) {
      console.error('Không thể mở phiên duyệt:', err);
      onShowToast?.('Lỗi mở duyệt', err.message || 'Không thể mở phiên thẩm định bài nộp.');
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
      if (item.status === 'Submitted' && typeof assignmentService.openStageTaskReview === 'function') {
        await assignmentService.openStageTaskReview(item.chapterId, taskId);
      }
      navigate(getReviewUrl(item));
    } catch (err: any) {
      onShowToast?.('Lỗi mở duyệt', err?.message || 'Không thể mở phiên duyệt ô công việc.');
      if (err?.status === 409) await loadData();
    } finally {
      setGridBusyTaskId(null);
    }
  };

  const handleReleaseGridReview = async (item: DeskQueueItem) => {
    const taskId = item.taskId || item.assignmentId;
    setGridBusyTaskId(`release:${taskId}`);
    try {
      await assignmentService.releaseStageTaskReview(item.chapterId, taskId);
      onShowToast?.(
        t('chapterReview.releaseReviewToast', 'Đã nhả khoá duyệt'),
        `Chương ${item.chapterNumber} · ${item.stageName} (${item.scopeLabel})`,
      );
      await loadData();
    } catch (err: any) {
      onShowToast?.('Lỗi nhả khoá duyệt', err?.message || 'Không thể nhả khoá duyệt.');
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
      if (typeof assignmentService.getTaskGrid === 'function') {
        await assignmentService.getTaskGrid(item.chapterId).catch(() => null);
      }
      onShowToast?.(
        'Đã duyệt ô công việc',
        `Chương ${item.chapterNumber} · ${item.stageName} (${item.scopeLabel})`,
      );
      await loadData();
    } catch (err: any) {
      onShowToast?.('Lỗi duyệt ô việc', err?.message || 'Không thể duyệt ô công việc này.');
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
      if (typeof assignmentService.getTaskGrid === 'function') {
        await assignmentService.getTaskGrid(item.chapterId).catch(() => null);
      }
      setRejectingGridTaskId(null);
      setRejectComment('');
      onShowToast?.(
        'Đã yêu cầu sửa lại',
        `Chương ${item.chapterNumber} · ${item.stageName} (${item.scopeLabel})`,
      );
      await loadData();
    } catch (err: any) {
      onShowToast?.('Lỗi yêu cầu sửa', err?.message || 'Không thể gửi yêu cầu sửa lại.');
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
  }, [queueItems, paramChapterId, searchQuery]);

  // Date formatter
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Vừa xong';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className='flex flex-col min-h-full bg-[#FAF8F5] text-[#1C1917] font-sans'>
      {/* Studio Workbench Header (Clean Editorial Header, integrated with Focus Studio) */}
      <div className='px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[#E5E0D8] bg-[#FCFBF8] shadow-2xs'>
        <div className='max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2.5'>
              <h1 className='text-lg font-serif font-bold text-[#1C1917] tracking-tight'>
                {t('desk.title', 'Bàn Thẩm Định Biên Tập (Editor Desk)')}
              </h1>
              <span className='text-xs text-[#57534E] font-medium'>
                · {seriesInfo?.title || 'Bộ truyện'}
              </span>
            </div>
            <p className='text-xs text-[#78716C] mt-0.5'>
              {t('desk.subtitle', 'Hàng đợi kiểm soát chất lượng theo 2 cổng Gate 1 & Gate 2')}
            </p>
          </div>

          {/* Quick Refresh */}
          <div className='flex items-center gap-2 self-start md:self-auto'>
            <button
              type='button'
              onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/editor/bible`)}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] border border-[#D8D2C5] bg-[#FCFBF8] shadow-2xs transition-colors cursor-pointer'
            >
              <Palette className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>{t('desk.bibleReview', { count: pendingBibleConcepts })}</span>
            </button>
            <button
              type='button'
              onClick={loadData}
              disabled={loading}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] border border-[#D8D2C5] bg-[#FCFBF8] shadow-2xs transition-colors cursor-pointer disabled:opacity-50'
              title='Làm mới hàng đợi'
            >
              <RotateCcw
                className={`w-3.5 h-3.5 text-[#C2410C] ${loading ? 'animate-spin' : ''}`}
              />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Minimalist Summary KPIs Row (Clean Paper Strip) */}
        <div className='max-w-7xl mx-auto mt-4 pt-3 border-t border-[#E5E0D8]/70 flex items-center justify-between gap-4 flex-wrap text-xs'>
          <div className='flex items-center gap-4 sm:gap-6 flex-wrap'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 rounded-full bg-amber-500' />
              <span className='text-[#57534E] font-medium'>Chờ mở duyệt:</span>
              <span className='font-bold text-[#1C1917]'>{metrics.submittedCount}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 rounded-full bg-sky-500' />
              <span className='text-[#57534E] font-medium'>Đang thẩm định:</span>
              <span className='font-bold text-[#1C1917]'>{metrics.underReviewCount}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='text-[#57534E] font-medium'>Gate 1: Storyboard:</span>
              <span className='font-bold text-[#1C1917]'>{metrics.gate1Count}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='text-[#57534E] font-medium'>Gate 2: Composite:</span>
              <span className='font-bold text-[#1C1917]'>{metrics.gate2Count}</span>
            </div>
            {metrics.selfSubmissionCount > 0 && (
              <div className='flex items-center gap-1.5 text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded-md border border-rose-200/60'>
                <ShieldAlert className='w-3 h-3 text-rose-600' />
                <span className='font-medium'>Khóa 4 mắt (BR-26):</span>
                <span className='font-bold'>{metrics.selfSubmissionCount}</span>
              </div>
            )}
          </div>

          <div className='text-xs text-[#78716C] font-mono'>Tổng: {metrics.total} bài nộp</div>
        </div>
      </div>

      {/* Main Container */}
      <main className='flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-5'>
        {/* Filter & Search Bar (Sleek Segmented Track) */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FCFBF8] p-2.5 rounded-xl border border-[#D8D2C5] shadow-2xs'>
          {/* Segmented Gate Switcher */}
          <div className='flex items-center gap-1 p-1 bg-[#F3F0E9] rounded-lg border border-[#E5E0D8] overflow-x-auto'>
            <button
              type='button'
              onClick={() => setActiveGate('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeGate === 'all'
                  ? 'bg-[#FCFBF8] text-[#1C1917] shadow-soft-sm font-bold'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {t('desk.gateAll', 'Tất cả cổng')} ({metrics.total})
            </button>
            <button
              type='button'
              onClick={() => setActiveGate('gate1')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeGate === 'gate1'
                  ? 'bg-[#FCFBF8] text-[#1C1917] shadow-soft-sm font-bold'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {t('desk.gate1', 'Gate 1: Storyboard')} ({metrics.gate1Count})
            </button>
            <button
              type='button'
              onClick={() => setActiveGate('gate2')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeGate === 'gate2'
                  ? 'bg-[#FCFBF8] text-[#1C1917] shadow-soft-sm font-bold'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {t('desk.gate2', 'Gate 2: Composite')} ({metrics.gate2Count})
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className='flex items-center gap-2.5 flex-wrap md:flex-nowrap'>
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label='Lọc theo trạng thái'
              className='px-3 py-1.5 bg-[#F3F0E9] border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#1C1917] focus:outline-none focus:border-[#C2410C] cursor-pointer'
            >
              <option value='all'>Tất cả trạng thái</option>
              <option value='Submitted'>Chờ mở duyệt (Submitted)</option>
              <option value='UnderReview'>Đang thẩm định (UnderReview)</option>
            </select>

            {/* Search Input */}
            <div className='relative flex-1 md:w-64'>
              <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Tìm chương, họa sĩ, trang...'
                className='w-full pl-9 pr-3 py-1.5 bg-[#F3F0E9] border border-[#E5E0D8] rounded-lg text-xs text-[#1C1917] placeholder-[#78716C] focus:outline-none focus:border-[#C2410C]'
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className='p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-2xs'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='w-4 h-4 text-red-600 shrink-0' />
              <span>{error}</span>
            </div>
            <button
              type='button'
              onClick={loadData}
              className='px-2.5 py-1 bg-white border border-red-300 rounded font-semibold text-red-700 hover:bg-red-50 transition-colors cursor-pointer'
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className='p-12 text-center bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xs'>
            <RotateCcw className='w-7 h-7 text-[#C2410C] animate-spin mx-auto mb-2.5' />
            <p className='text-xs font-semibold text-[#57534E]'>
              Đang nạp hàng đợi duyệt bài của Editor...
            </p>
          </div>
        )}

        {/* D12: Kịch bản chờ duyệt — Editor mở để góp ý theo dòng */}
        {!loading && !error && scriptsInReview.length > 0 && (
          <section className='mb-6' data-testid='scripts-in-review'>
            <h2 className='mb-2 text-sm font-semibold text-stone-800'>
              {t('scriptReview.desk.scriptsInReview', { count: scriptsInReview.length })}
            </h2>
            <ul className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
              {scriptsInReview
                .filter((c) => !paramChapterId || c.id === paramChapterId)
                .map((c) => (
                  <li
                    key={c.id}
                    className='flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-stone-900'>
                        {t('scriptReview.header.title', { number: c.chapterNumber })}
                        {c.title ? `: ${c.title}` : ''}
                      </p>
                      <p className='text-xs text-stone-500'>{formatDate(c.scriptSubmittedAt)}</p>
                    </div>
                    <button
                      type='button'
                      onClick={() =>
                        navigate(
                          `/workspaces/${workspaceId}/series/${seriesId}/chapters/${c.id}/script/review`,
                        )
                      }
                      className='shrink-0 rounded-full bg-[#EA580C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C]'
                    >
                      {t('scriptReview.desk.openComments')}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Empty State */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className='p-12 text-center bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xs space-y-2.5'>
            <div className='w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mx-auto'>
              <CheckCircle2 className='w-5 h-5' />
            </div>
            <h2 className='text-sm font-serif font-bold text-[#1C1917]'>
              Hàng Đợi Thẩm Định Đang Sạch (Inbox Zero)
            </h2>
            <p className='text-xs text-[#78716C] max-w-md mx-auto leading-relaxed'>
              Không có bài nộp nào đang chờ duyệt trong cổng này. Mọi tác phẩm đều đã được xử lý
              hoặc nghệ sĩ đang tiếp tục hoàn thiện.
            </p>
          </div>
        )}

        {/* Queue Items Grid (Clean Editorial Paper Cards) */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
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

              return (
                <div
                  key={item.assignmentId}
                  className={`relative flex flex-col justify-between bg-[#FCFBF8] border rounded-xl p-4 sm:p-5 shadow-soft-sm transition-all hover:shadow-md ${
                    item.isSelfSubmission
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-[#D8D2C5] hover:border-[#F97316]'
                  }`}
                >
                  {/* Top: Metadata & Title */}
                  <div>
                    {/* Gate & Status Row */}
                    <div className='flex items-center justify-between text-xs mb-2 pt-1'>
                      <span className='font-semibold flex items-center gap-1.5 text-[#57534E]'>
                        {item.stageSlug === 'script'
                          ? t('desk.gate1Script', 'Gate 1: Kịch bản')
                          : isGate1
                            ? t('desk.gate1', 'Gate 1: Storyboard')
                            : t('desk.gate2', 'Gate 2: Composite')}
                      </span>

                      <span className='flex items-center gap-1 text-[#57534E] font-medium'>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isUnderReview ? 'bg-sky-500' : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        {isUnderReview
                          ? t('desk.statusUnderReview', 'Đang thẩm định')
                          : t('desk.statusSubmitted', 'Chờ mở duyệt')}
                      </span>
                    </div>

                    {/* Main Title: Chapter & Scope */}
                    <div className='mb-2'>
                      <h3 className='text-sm font-bold text-[#1C1917] leading-snug'>
                        Chương {item.chapterNumber} ·{' '}
                        <span className='text-[#C2410C]'>{item.scopeLabel}</span>
                      </h3>
                      <p className='text-xs text-[#57534E] mt-0.5 truncate'>
                        {item.chapterTitle || 'Chưa đặt tên'} ·{' '}
                        <span className='font-medium text-[#1C1917]'>{item.stageName}</span>
                      </p>
                    </div>

                    {/* Artist & Submission Context */}
                    <div className='pt-2.5 pb-2 border-t border-[#E5E0D8]/70 text-xs text-[#57534E] space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-1.5 truncate font-medium text-[#1C1917]'>
                          {item.assigneeAvatarUrl ? (
                            <img
                              src={item.assigneeAvatarUrl}
                              alt={item.assigneeName || 'Avatar'}
                              className='w-4 h-4 rounded-full object-cover shrink-0'
                            />
                          ) : (
                            <span className='w-4 h-4 rounded-full bg-[#E5E0D8] text-[#57534E] flex items-center justify-center font-bold text-[10px] shrink-0'>
                              {item.assigneeName ? item.assigneeName.charAt(0).toUpperCase() : 'A'}
                            </span>
                          )}
                          <span className='truncate'>{item.assigneeName || 'Chưa rõ nghệ sĩ'}</span>
                        </div>
                        <span className='text-[#78716C] font-mono'>
                          Lần #{item.submissionAttempt}
                        </span>
                      </div>

                      <div className='flex items-center justify-between text-[#78716C]'>
                        <span>Nộp: {formatDate(item.submittedAt)}</span>
                        {item.priority === 'Urgent' || item.priority === 4 ? (
                          <span className='text-rose-700 font-semibold'>Khẩn cấp</span>
                        ) : null}
                      </div>

                      {item.openChangeRequestsCount > 0 && (
                        <div className='pt-1 text-amber-800 flex items-center gap-1 font-medium'>
                          <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />
                          <span>{item.openChangeRequestsCount} yêu cầu sửa cần xác nhận</span>
                        </div>
                      )}
                    </div>

                    {/* Anti-Self-Approval Note (Rule BR-26) */}
                    {item.isSelfSubmission && (
                      <div className='mt-1 mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-1.5 leading-relaxed'>
                        <ShieldAlert className='w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5' />
                        <div>
                          <span className='font-bold'>Quy tắc 4 mắt (BR-26):</span> Bạn là người đã
                          nộp bài này. Vui lòng chuyển bài cho Biên tập viên khác.
                        </div>
                      </div>
                    )}

                    {isLockedByOther && (
                      <div
                        data-testid={`editor-locked-by-other-${item.assignmentId}`}
                        className='mt-1 mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-1.5 font-medium'
                      >
                        <Lock className='w-3.5 h-3.5 text-amber-600 shrink-0' />
                        <span>
                          {t('chapterReview.underReviewBy', {
                            name: item.reviewerName || item.reviewerUserId,
                            defaultValue: `Đang được duyệt bởi ${item.reviewerName || item.reviewerUserId}`,
                          })}
                        </span>
                      </div>
                    )}

                    {isLockedBySelf && (
                      <div className='mt-1 mb-2 p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center gap-1.5 font-medium'>
                        <Eye className='w-3.5 h-3.5 text-sky-600 shrink-0' />
                        <span>{t('chapterReview.underReviewByYou', 'Bạn đang giữ khoá duyệt')}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer & Action Button */}
                  <div className='pt-2.5 mt-2 border-t border-[#E5E0D8]/70 space-y-2'>
                    <div className='flex flex-wrap items-center justify-end gap-2'>
                      {item.isSelfSubmission ? (
                        <button
                          type='button'
                          disabled
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A8A29E] bg-[#F3F0E9] border border-[#E5E0D8] cursor-not-allowed'
                          title='Bạn không thể tự duyệt bài do chính mình nộp'
                        >
                          <Lock className='w-3 h-3' />
                          <span>{t('desk.lockedSelfAction', 'Khóa: Cần Editor khác duyệt')}</span>
                        </button>
                      ) : item.isGridItem ? (
                        <>
                          {isProducer && isLockedByOther && (
                            <button
                              type='button'
                              data-testid={`editor-force-release-${item.assignmentId}`}
                              disabled={gridBusyTaskId !== null}
                              onClick={() => void handleReleaseGridReview(item)}
                              className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer disabled:opacity-50'
                            >
                              <RotateCcw className='w-3.5 h-3.5' />
                              <span>
                                {t('chapterReview.forceReleaseReviewBtn', 'Gỡ khoá duyệt')}
                              </span>
                            </button>
                          )}
                          {isLockedBySelf && (
                            <button
                              type='button'
                              data-testid={`editor-release-own-${item.assignmentId}`}
                              disabled={gridBusyTaskId !== null}
                              onClick={() => void handleReleaseGridReview(item)}
                              className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 transition-colors cursor-pointer disabled:opacity-50'
                            >
                              <RotateCcw className='w-3.5 h-3.5' />
                              <span>{t('chapterReview.releaseReviewBtn', 'Nhả khoá duyệt')}</span>
                            </button>
                          )}
                          <button
                            type='button'
                            data-testid={`editor-open-grid-review-${item.assignmentId}`}
                            disabled={isLockedByOther || gridBusyTaskId !== null}
                            onClick={() => void handleOpenGridReview(item)}
                            className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <Eye className='w-3.5 h-3.5 text-[#F97316]' />
                            <span>
                              {gridBusyTaskId === `open:${item.assignmentId}`
                                ? 'Đang mở...'
                                : t('chapterReview.openDetailReview', 'Mở màn duyệt')}
                            </span>
                          </button>
                          <button
                            type='button'
                            onClick={() =>
                              navigate(
                                `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${encodeURIComponent(item.chapterId)}&board=grid-v3`,
                              )
                            }
                            className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1C1917] bg-[#F3F0E9] hover:bg-[#E5E0D8] border border-[#D8D2C5] transition-colors cursor-pointer'
                          >
                            <Eye className='w-3.5 h-3.5 text-[#C2410C]' />
                            <span>Mở Lưới V3</span>
                          </button>
                          <button
                            type='button'
                            data-testid={`editor-reject-toggle-${item.assignmentId}`}
                            disabled={isLockedByOther || gridBusyTaskId !== null}
                            onClick={() => {
                              setRejectingGridTaskId((prev) =>
                                prev === item.assignmentId ? null : item.assignmentId,
                              );
                              setRejectComment('');
                            }}
                            className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <RotateCcw className='w-3.5 h-3.5' />
                            <span>Yêu cầu sửa</span>
                          </button>
                          <button
                            type='button'
                            data-testid={`editor-approve-grid-${item.assignmentId}`}
                            disabled={isLockedByOther || gridBusyTaskId !== null}
                            onClick={() => void handleApproveGridItem(item)}
                            className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <CheckCircle2 className='w-3.5 h-3.5' />
                            <span>
                              {gridBusyTaskId === `approve:${item.assignmentId}`
                                ? 'Đang duyệt...'
                                : 'Duyệt'}
                            </span>
                          </button>
                        </>
                      ) : isUnderReview ? (
                        <button
                          type='button'
                          onClick={() => handleContinueReview(item)}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] active:bg-[#0C0A09] shadow-soft-sm transition-colors cursor-pointer'
                        >
                          <Eye className='w-3.5 h-3.5' />
                          <span>{t('desk.continueReviewAction', 'Tiếp tục thẩm định')}</span>
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={() => handleOpenReview(item)}
                          disabled={isOpening}
                          className='inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] active:bg-[#C2410C] shadow-soft-sm transition-colors cursor-pointer disabled:opacity-50'
                        >
                          <Eye className={`w-3.5 h-3.5 ${isOpening ? 'animate-spin' : ''}`} />
                          <span>
                            {isOpening ? 'Đang mở...' : t('desk.openReviewAction', 'Mở Thẩm Định')}
                          </span>
                        </button>
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
                            placeholder='Nhập nhận xét yêu cầu sửa bắt buộc (BR-06)...'
                            aria-label='Nhận xét yêu cầu sửa'
                            className='w-full rounded border border-rose-300 bg-white px-2.5 py-1.5 text-xs text-[#1C1917]'
                          />
                          <div className='flex items-center justify-end gap-1.5'>
                            <button
                              type='button'
                              onClick={() => {
                                setRejectingGridTaskId(null);
                                setRejectComment('');
                              }}
                              className='px-2.5 py-1 rounded border border-stone-300 bg-white text-xs font-semibold text-stone-700 cursor-pointer'
                            >
                              Huỷ
                            </button>
                            <button
                              type='button'
                              data-testid={`editor-confirm-reject-${item.assignmentId}`}
                              disabled={gridBusyTaskId !== null || !rejectComment.trim()}
                              onClick={() => void handleRejectGridItem(item)}
                              className='px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50'
                            >
                              {gridBusyTaskId === `reject:${item.assignmentId}`
                                ? 'Đang gửi...'
                                : 'Gửi yêu cầu sửa'}
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
