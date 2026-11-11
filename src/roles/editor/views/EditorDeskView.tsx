import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
  ShieldCheck,
  Eye,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Layers,
  Lock,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  AssignmentPriority,
  AssignmentStatus,
  EditorQualityGate,
  EditorReviewQueueItemDto,
  WorkspaceRole,
} from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';

export interface EditorDeskViewProps {
  workspaceRole?: WorkspaceRole | null;
  onShowToast?: (title: string, desc: string) => void;
}

export const EditorDeskView: React.FC<EditorDeskViewProps> = ({
  workspaceRole,
  onShowToast,
}) => {
  const { t } = useTranslation('review');
  const navigate = useNavigate();
  const { workspaceId, seriesId, chapterId: paramChapterId } = useParams<{
    workspaceId: string;
    seriesId: string;
    chapterId?: string;
  }>();

  // State
  const [queueItems, setQueueItems] = useState<EditorReviewQueueItemDto[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<SeriesDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGate, setActiveGate] = useState<EditorQualityGate>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Submitted' | 'UnderReview'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openingReviewId, setOpeningReviewId] = useState<string | null>(null);

  // Load Queue & Series Detail
  const loadData = useCallback(async () => {
    if (!seriesId) return;
    try {
      setLoading(true);
      setError(null);

      const [items, series] = await Promise.all([
        assignmentService.getEditorReviewQueue(seriesId, {
          gate: activeGate !== 'all' ? activeGate : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        seriesService.getSeriesById(seriesId).catch(() => null),
      ]);

      setQueueItems(items);
      if (series) setSeriesInfo(series);
    } catch (err: any) {
      console.error('Lỗi tải hàng đợi thẩm định Editor:', err);
      setError(err.message || 'Không thể tải hàng đợi thẩm định.');
    } finally {
      setLoading(false);
    }
  }, [seriesId, activeGate, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Open Review
  const handleOpenReview = async (item: EditorReviewQueueItemDto) => {
    if (!workspaceId || !seriesId) return;
    if (item.isSelfSubmission) {
      onShowToast?.(
        'Quy tắc 4 mắt (BR-26)',
        'Bạn không thể tự duyệt bài do chính mình nộp. Vui lòng chuyển giao cho Biên tập viên khác.'
      );
      return;
    }

    try {
      setOpeningReviewId(item.assignmentId);
      if (item.status === 'Submitted') {
        await assignmentService.openReview(item.chapterId, item.assignmentId);
        onShowToast?.('Bắt đầu thẩm định', `Đã mở phiên duyệt cho ${item.scopeLabel}`);
      }
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/review/${item.assignmentId}`);
    } catch (err: any) {
      console.error('Không thể mở phiên duyệt:', err);
      onShowToast?.('Lỗi mở duyệt', err.message || 'Không thể mở phiên thẩm định bài nộp.');
    } finally {
      setOpeningReviewId(null);
    }
  };

  const handleContinueReview = (item: EditorReviewQueueItemDto) => {
    if (!workspaceId || !seriesId) return;
    navigate(`/workspaces/${workspaceId}/series/${seriesId}/review/${item.assignmentId}`);
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
          i.stageName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [queueItems, paramChapterId, searchQuery]);

  // Date formatter
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Chưa ghi nhận';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Priority color
  const getPriorityBadge = (p: AssignmentPriority) => {
    switch (p) {
      case 'Urgent':
      case 4:
        return (
          <span className='px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-700 border border-rose-200'>
            Khẩn cấp
          </span>
        );
      case 'High':
      case 3:
        return (
          <span className='px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-700 border border-orange-200'>
            Ưu tiên cao
          </span>
        );
      case 'Low':
      case 1:
        return (
          <span className='px-2 py-0.5 text-xs font-semibold rounded bg-stone-100 text-stone-600 border border-stone-200'>
            Thấp
          </span>
        );
      default:
        return (
          <span className='px-2 py-0.5 text-xs font-semibold rounded bg-stone-100 text-stone-700 border border-stone-200'>
            Bình thường
          </span>
        );
    }
  };

  return (
    <div className='flex flex-col min-h-screen bg-[#FAF9F5] text-stone-900'>
      {/* Top Header */}
      <header className='sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-6 py-4 shadow-xs'>
        <div className='max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4'>
          {/* Left: Navigation and Titles */}
          <div className='flex items-start md:items-center gap-3'>
            <button
              type='button'
              onClick={() => navigate(`/workspaces/${workspaceId}/series`)}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors shrink-0'
              aria-label='Về danh sách Series'
            >
              <ArrowLeft className='w-4 h-4' />
              <span>Về Series</span>
            </button>

            <div className='h-6 w-[1px] bg-stone-200 hidden md:block' />

            <div>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='w-6 h-6 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold text-xs'>
                  ED
                </span>
                <h1 className='text-base font-bold text-stone-900 flex items-center gap-2'>
                  {t('desk.title', 'Bàn Thẩm Định Biên Tập (Editor Desk)')}
                  <span className='px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200'>
                    Quality Gates
                  </span>
                </h1>
              </div>
              <p className='text-xs text-stone-500 mt-0.5 flex items-center gap-1'>
                <span className='font-medium text-stone-700'>
                  {seriesInfo?.title || 'Bộ truyện'}
                </span>
                <ChevronRight className='w-3 h-3 text-stone-400' />
                <span>{t('desk.subtitle', 'Hàng đợi kiểm soát chất lượng theo 2 cổng Gate 1 & Gate 2')}</span>
              </p>
            </div>
          </div>

          {/* Right: Refresh & Actions */}
          <div className='flex items-center gap-2 self-end md:self-auto'>
            <button
              type='button'
              onClick={loadData}
              disabled={loading}
              className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-stone-600 bg-white hover:bg-stone-50 border border-stone-200/80 shadow-xs transition-all disabled:opacity-50'
              title='Làm mới hàng đợi'
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className='flex-1 max-w-7xl mx-auto w-full p-6 space-y-6'>
        {/* KPI Metrics Summary Bar */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {/* Card 1: Chờ mở duyệt */}
          <div className='bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-stone-500'>Chờ mở duyệt</p>
              <p className='text-2xl font-bold text-amber-600 mt-1'>{metrics.submittedCount}</p>
              <span className='text-xs text-stone-400'>Bài nộp mới từ hoạ sĩ</span>
            </div>
            <div className='w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600'>
              <Clock className='w-5 h-5' />
            </div>
          </div>

          {/* Card 2: Đang thẩm định */}
          <div className='bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-stone-500'>Đang thẩm định</p>
              <p className='text-2xl font-bold text-sky-600 mt-1'>{metrics.underReviewCount}</p>
              <span className='text-xs text-stone-400'>Đang trong phiên kiểm tra</span>
            </div>
            <div className='w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600'>
              <Eye className='w-5 h-5' />
            </div>
          </div>

          {/* Card 3: Phân loại theo Gate */}
          <div className='bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-stone-500'>Tỷ lệ Gates</p>
              <div className='flex items-center gap-3 mt-1'>
                <span className='text-sm font-bold text-purple-700'>
                  G1: {metrics.gate1Count}
                </span>
                <span className='text-stone-300'>|</span>
                <span className='text-sm font-bold text-emerald-700'>
                  G2: {metrics.gate2Count}
                </span>
              </div>
              <span className='text-xs text-stone-400'>Phân cảnh vs Hoàn thiện</span>
            </div>
            <div className='w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600'>
              <Layers className='w-5 h-5' />
            </div>
          </div>

          {/* Card 4: Chặn tự duyệt (BR-26) */}
          <div className='bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-stone-500'>Khóa 4 mắt (BR-26)</p>
              <p className='text-2xl font-bold text-rose-600 mt-1'>{metrics.selfSubmissionCount}</p>
              <span className='text-xs text-stone-400'>Cần Editor khác duyệt hộ</span>
            </div>
            <div className='w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600'>
              <ShieldAlert className='w-5 h-5' />
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className='bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
          {/* Gate Tabs */}
          <div className='flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg border border-stone-200/80 overflow-x-auto'>
            <button
              type='button'
              onClick={() => setActiveGate('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                activeGate === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('desk.gateAll', 'Tất cả cổng')} ({metrics.total})
            </button>
            <button
              type='button'
              onClick={() => setActiveGate('gate1')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeGate === 'gate1'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-purple-700'
              }`}
            >
              <span className='w-2 h-2 rounded-full bg-purple-300' />
              {t('desk.gate1', 'Gate 1: Storyboard')} ({metrics.gate1Count})
            </button>
            <button
              type='button'
              onClick={() => setActiveGate('gate2')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeGate === 'gate2'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-emerald-700'
              }`}
            >
              <span className='w-2 h-2 rounded-full bg-emerald-300' />
              {t('desk.gate2', 'Gate 2: Composite')} ({metrics.gate2Count})
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className='flex items-center gap-3 flex-wrap md:flex-nowrap'>
            {/* Status Select */}
            <div className='relative'>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label='Lọc theo trạng thái'
                className='px-3 py-1.5 pr-8 bg-stone-50 border border-stone-200/80 rounded-lg text-xs font-medium text-stone-700 focus:outline-none focus:border-orange-500'
              >
                <option value='all'>Tất cả trạng thái</option>
                <option value='Submitted'>Chờ mở duyệt (Submitted)</option>
                <option value='UnderReview'>Đang thẩm định (UnderReview)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className='relative flex-1 md:w-64'>
              <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Tìm theo chương, tác giả, trang...'
                className='w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200/80 rounded-lg text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-orange-500'
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className='p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
              <span>{error}</span>
            </div>
            <button
              type='button'
              onClick={loadData}
              className='px-2.5 py-1 bg-white border border-rose-300 rounded font-semibold text-rose-700 hover:bg-rose-100 transition-colors'
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className='p-12 text-center bg-white border border-stone-200/80 rounded-2xl shadow-xs'>
            <RotateCcw className='w-8 h-8 text-orange-500 animate-spin mx-auto mb-3' />
            <p className='text-xs font-semibold text-stone-600'>Đang nạp hàng đợi duyệt bài của Editor...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className='p-12 text-center bg-white border border-stone-200/80 rounded-2xl shadow-xs space-y-3'>
            <div className='w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto'>
              <CheckCircle2 className='w-6 h-6' />
            </div>
            <h2 className='text-sm font-bold text-stone-800'>Hàng Đợi Thẩm Định Đang Sạch (Inbox Zero)</h2>
            <p className='text-xs text-stone-500 max-w-md mx-auto leading-relaxed'>
              Không có bài nộp nào đang chờ duyệt trong cổng này. Mọi tác phẩm đều đã được xử lý hoặc nghệ sĩ đang tiếp tục hoàn thiện.
            </p>
          </div>
        )}

        {/* Queue Items Grid */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {filteredItems.map((item) => {
              const isGate1 = item.gate === 'gate1';
              const isUnderReview = item.status === 'UnderReview';
              const isOpening = openingReviewId === item.assignmentId;

              return (
                <div
                  key={item.assignmentId}
                  className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                    item.isSelfSubmission
                      ? 'border-rose-300/80 bg-rose-50/20'
                      : 'border-stone-200/80 hover:border-orange-300'
                  }`}
                >
                  {/* Card Header: Gate & Stage Badges */}
                  <div>
                    <div className='flex items-center justify-between gap-2 mb-3'>
                      {/* Gate Pill */}
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold tracking-tight uppercase flex items-center gap-1 ${
                          isGate1
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <Layers className='w-3 h-3' />
                        {isGate1 ? 'Gate 1: Storyboard' : 'Gate 2: Composite'}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                          isUnderReview
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
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

                    {/* Chapter & Scope Info */}
                    <div className='mb-3'>
                      <div className='flex items-baseline gap-1.5 flex-wrap'>
                        <span className='text-xs font-bold text-stone-500'>
                          Chương {item.chapterNumber}:
                        </span>
                        <h3 className='text-sm font-bold text-stone-900 leading-snug line-clamp-1'>
                          {item.chapterTitle || 'Chưa đặt tên'}
                        </h3>
                      </div>
                      <p className='text-xs font-semibold text-stone-700 mt-0.5 flex items-center gap-1.5'>
                        <span className='px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-xs border border-stone-200'>
                          {item.scopeLabel}
                        </span>
                        <span className='text-stone-300'>•</span>
                        <span
                          className='inline-block w-2 h-2 rounded-full'
                          style={{ backgroundColor: item.stageColorCode || '#94A3B8' }}
                        />
                        <span className='text-stone-600 text-xs'>{item.stageName}</span>
                      </p>
                    </div>

                    {/* Artist & Submission Metadata */}
                    <div className='bg-stone-50 rounded-lg p-2.5 border border-stone-200/60 mb-3 space-y-1.5'>
                      <div className='flex items-center justify-between text-xs'>
                        <div className='flex items-center gap-1.5 text-stone-700 font-medium truncate'>
                          {item.assigneeAvatarUrl ? (
                            <img
                              src={item.assigneeAvatarUrl}
                              alt={item.assigneeName || 'Avatar'}
                              className='w-4 h-4 rounded-full object-cover'
                            />
                          ) : (
                            <User className='w-3.5 h-3.5 text-stone-400' />
                          )}
                          <span className='truncate'>{item.assigneeName || 'Chưa rõ nghệ sĩ'}</span>
                        </div>
                        <span className='px-1.5 py-0.5 rounded bg-white text-stone-600 border border-stone-200 font-semibold text-xs shrink-0'>
                          Lần nộp #{item.submissionAttempt}
                        </span>
                      </div>

                      <div className='flex items-center justify-between text-xs text-stone-500'>
                        <span className='flex items-center gap-1'>
                          <Calendar className='w-3 h-3 text-stone-400' />
                          {formatDate(item.submittedAt)}
                        </span>
                        {getPriorityBadge(item.priority)}
                      </div>

                      {item.openChangeRequestsCount > 0 && (
                        <div className='pt-1 border-t border-stone-200/60 flex items-center gap-1 text-xs text-amber-700 font-medium'>
                          <AlertTriangle className='w-3.5 h-3.5 text-amber-500 shrink-0' />
                          <span>{item.openChangeRequestsCount} yêu cầu sửa chưa hoàn tất</span>
                        </div>
                      )}
                    </div>

                    {/* Anti-Self-Approval Warning (Rule BR-26) */}
                    {item.isSelfSubmission && (
                      <div className='mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200/90 text-rose-800 text-xs flex items-start gap-2'>
                        <ShieldAlert className='w-4 h-4 text-rose-600 shrink-0 mt-0.5' />
                        <div className='leading-relaxed'>
                          <span className='font-bold'>Quy tắc 4 mắt (BR-26):</span> Bạn là người đã nộp bài này. Để đảm bảo tính khách quan, hệ thống khóa quyền tự duyệt. Vui lòng chuyển bài cho Biên tập viên khác.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className='pt-2 border-t border-stone-100 flex items-center justify-between gap-2'>
                    <span className='text-xs text-stone-400 font-mono'>
                      #{item.assignmentId.substring(0, 8)}
                    </span>

                    {item.isSelfSubmission ? (
                      <button
                        type='button'
                        disabled
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed'
                        title='Bạn không thể tự duyệt bài do chính mình nộp'
                      >
                        <Lock className='w-3.5 h-3.5' />
                        <span>{t('desk.lockedSelfAction', 'Khóa: Cần Editor khác duyệt')}</span>
                      </button>
                    ) : isUnderReview ? (
                      <button
                        type='button'
                        onClick={() => handleContinueReview(item)}
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-xs transition-colors'
                      >
                        <Eye className='w-3.5 h-3.5' />
                        <span>{t('desk.continueReviewAction', 'Tiếp tục thẩm định')}</span>
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={() => handleOpenReview(item)}
                        disabled={isOpening}
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] active:bg-[#C2410C] shadow-xs transition-colors disabled:opacity-50'
                      >
                        <Eye className={`w-3.5 h-3.5 ${isOpening ? 'animate-spin' : ''}`} />
                        <span>{isOpening ? 'Đang mở...' : t('desk.openReviewAction', 'Mở Thẩm Định')}</span>
                      </button>
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
