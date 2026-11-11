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
} from 'lucide-react';
import {
  AssignmentPriority,
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

export const EditorDeskView: React.FC<EditorDeskViewProps> = ({ workspaceRole, onShowToast }) => {
  const { t } = useTranslation('review');
  const navigate = useNavigate();
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
                  </div>

                  {/* Footer & Action Button */}
                  <div className='pt-2.5 mt-2 border-t border-[#E5E0D8]/70 flex items-center justify-end gap-2'>
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
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
