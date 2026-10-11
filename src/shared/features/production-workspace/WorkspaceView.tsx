import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { KanbanBoard } from '@/shared/features/pipeline-board/KanbanBoard';
import { CreateAssignmentModal } from '@/roles/producer/modals/CreateAssignmentModal';
import { SystemRole, WorkspaceRole } from '@/types';
import {
  Layers,
  BookOpen,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService, SeriesProgressDto } from '@/services/series.service';

export interface WorkspaceViewProps {
  currentUserRole?: WorkspaceRole | null;
  systemRole?: SystemRole;
  userRoles?: string[];
  currentUserId?: string;
  onShowToast: (title: string, desc: string) => void;
  isReaderMode?: boolean;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  currentUserRole,
  systemRole,
  userRoles = [],
  currentUserId,
  onShowToast,
  isReaderMode = false,
}) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const chapterIdFromUrl = searchParams.get('chapterId');

  const effectiveRoles = useMemo(() => {
    return userRoles.length > 0
      ? userRoles
      : [...(systemRole ? [systemRole] : []), ...(currentUserRole ? [currentUserRole] : [])];
  }, [userRoles, systemRole, currentUserRole]);

  const [filterType, setFilterType] = useState<'all' | 'my-tasks' | 'overdue'>('all');
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [seriesProgress, setSeriesProgress] = useState<SeriesProgressDto | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isReaderOnly = effectiveRoles.length === 1 && effectiveRoles[0] === 'READER';
  const isProducer = useMemo(() => {
    return effectiveRoles.some((r) => r.toUpperCase() === 'PRODUCER');
  }, [effectiveRoles]);

  // Nạp danh sách chương của Series
  const loadChapters = useCallback(async () => {
    if (!seriesId) return;
    setLoadingChapters(true);
    try {
      const res = await chapterService.getChaptersBySeries(seriesId, 1, 50);
      const items = res.items || [];
      setChapters(items);

      if (items.length > 0) {
        const matched = items.find((c) => c.id === chapterIdFromUrl);
        const activeId = matched ? matched.id : items[0].id;
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

  // Nạp tiến độ sản xuất SeriesProgress (chỉ dành cho Producer)
  const loadProgress = useCallback(async () => {
    if (!seriesId || !isProducer) return;
    try {
      const prog = await seriesService.getSeriesProgress(seriesId);
      setSeriesProgress(prog);
    } catch (err) {
      console.warn('Không thể nạp tiến độ SeriesProgress:', err);
    }
  }, [seriesId, isProducer]);

  useEffect(() => {
    loadChapters();
    if (isProducer) {
      loadProgress();
    }
  }, [loadChapters, loadProgress, isProducer]);

  // Xử lý chuyển đổi chương
  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCurrentChapterId(newId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('chapterId', newId);
      return next;
    });
  };

  // Tính toán KPI cho chương hiện tại
  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.id === currentChapterId);
  }, [chapters, currentChapterId]);

  const currentChapterProgress = useMemo(() => {
    if (!seriesProgress?.chapters || !currentChapterId) return null;
    return seriesProgress.chapters.find((c) => c.chapterId === currentChapterId);
  }, [seriesProgress, currentChapterId]);

  const completionPercent = currentChapterProgress
    ? Math.round(currentChapterProgress.percentComplete)
    : 0;

  const overdueCount = currentChapterProgress?.overdueAssignments || 0;

  const waitingReviewCount = useMemo(() => {
    if (!currentChapterProgress?.assignmentsByStatus) return 0;
    const submitted = currentChapterProgress.assignmentsByStatus['Submitted'] || 0;
    const underReview = currentChapterProgress.assignmentsByStatus['UnderReview'] || 0;
    return submitted + underReview;
  }, [currentChapterProgress]);

  // Chặn độc giả không phận sự
  if (isReaderMode || isReaderOnly) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center p-8 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4'>
          <ShieldAlert className='w-8 h-8' />
        </div>
        <h2 className='text-xl font-serif font-semibold text-zinc-900 mb-2'>
          Khu Vực Sản Xuất Giới Hạn
        </h2>
        <p className='text-sm text-zinc-500 max-w-md mb-4'>
          Bạn không có quyền truy cập khu vực sản xuất Pipeline. Vui lòng quay lại danh mục truyện
          để đọc bản phát hành công khai.
        </p>
        <button
          type='button'
          onClick={() => navigate('/catalog')}
          className='px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors'
        >
          Đến Public Catalog
        </button>
      </div>
    );
  }

  return (
    <div className='w-full h-full flex flex-col bg-white overflow-hidden'>
      {/* Sub-header / Board Controls */}
      <div className='shrink-0 border-b border-zinc-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white z-20 shadow-2xs'>
        {/* Left: Chương Dropdown & KPI Metrics */}
        <div className='flex flex-wrap items-center gap-6'>
          {/* Chapter Selector */}
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl shadow-2xs'>
              <BookOpen className='w-4 h-4 text-zinc-500' />
              <label
                htmlFor='pipeline-chapter-select'
                className='text-xs font-medium text-zinc-500'
              >
                Chương:
              </label>
              <select
                id='pipeline-chapter-select'
                value={currentChapterId}
                onChange={handleChapterChange}
                disabled={loadingChapters || chapters.length === 0}
                className='bg-transparent text-xs font-bold text-zinc-900 outline-none cursor-pointer pr-2'
              >
                {chapters.length === 0 ? (
                  <option value=''>Đang nạp danh sách chương...</option>
                ) : (
                  chapters.map((chap) => (
                    <option key={chap.id} value={chap.id}>
                      Chương {chap.chapterNumber}: {chap.title || 'Bản thảo'}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Trạng thái Chapter Badge */}
            {currentChapter && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs ${
                  currentChapter.status === 'Approved'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : currentChapter.status === 'Published'
                      ? 'text-purple-700 bg-purple-50 border-purple-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}
              >
                {currentChapter.status === 'InProduction'
                  ? 'Đang sản xuất'
                  : currentChapter.status === 'Approved'
                    ? 'Đã duyệt chương'
                    : currentChapter.status === 'Published'
                      ? 'Đã xuất bản'
                      : currentChapter.status}
              </span>
            )}
          </div>

          {/* Real KPIs from Backend (Chỉ hiển thị cho Producer) */}
          {isProducer && (
            <div className='hidden lg:flex items-center gap-5 pl-6 border-l border-zinc-200'>
              <div className='flex flex-col'>
                <span className='text-[10px] text-zinc-400 uppercase tracking-wider font-bold'>
                  Hoàn thành
                </span>
                <span className='text-sm font-mono font-bold text-zinc-900'>
                  {completionPercent}%
                </span>
              </div>

              <div className='flex flex-col'>
                <span className='text-[10px] text-zinc-400 uppercase tracking-wider font-bold'>
                  Chờ xét duyệt
                </span>
                <span className='text-sm font-mono font-bold text-purple-600'>
                  {waitingReviewCount}
                </span>
              </div>

              <div className='flex flex-col'>
                <span className='text-[10px] text-zinc-400 uppercase tracking-wider font-bold'>
                  Quá hạn
                </span>
                <span
                  className={`text-sm font-mono font-bold ${
                    overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {overdueCount}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Bộ lọc & Phím chuyển hướng nhanh */}
        <div className='flex items-center gap-3'>
          {/* Bộ lọc Thẻ */}
          <div className='flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200'>
            <button
              type='button'
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white shadow-xs text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type='button'
              onClick={() => setFilterType('my-tasks')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === 'my-tasks'
                  ? 'bg-white shadow-xs text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Của tôi
            </button>
            <button
              type='button'
              onClick={() => setFilterType('overdue')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === 'overdue'
                  ? 'bg-white shadow-xs text-rose-600 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Quá hạn
            </button>
          </div>

          {/* Nút Làm mới */}
          <button
            type='button'
            onClick={() => {
              loadChapters();
              loadProgress();
            }}
            title='Làm mới dữ liệu'
            className='p-2 text-zinc-500 hover:text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl shadow-2xs transition-colors cursor-pointer'
          >
            <RefreshCw className='w-4 h-4' />
          </button>

          {/* Nút chuyển sang Bàn làm việc & Xét duyệt */}
          {workspaceId && seriesId && (
            <button
              type='button'
              onClick={() =>
                navigate(
                  `/workspaces/${workspaceId}/series/${seriesId}/my-work${
                    currentChapterId ? `?chapterId=${currentChapterId}` : ''
                  }`,
                )
              }
              className='inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0'
            >
              <span>Công việc & Xét duyệt</span>
              <ArrowUpRight className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>

      {/* Board Area */}
      <KanbanBoard
        key={`${currentChapterId}-${refreshKey}`}
        chapterId={currentChapterId}
        filterType={filterType}
        currentUserRole={currentUserRole}
        systemRole={systemRole}
        userRoles={effectiveRoles}
        currentUserId={currentUserId}
        onShowToast={onShowToast}
        onOpenCreateAssignment={() => setIsCreateModalOpen(true)}
      />

      {/* Modal giao việc trực tiếp */}
      {workspaceId && seriesId && currentChapterId && isCreateModalOpen && (
        <CreateAssignmentModal
          isOpen={isCreateModalOpen}
          workspaceId={workspaceId}
          seriesId={seriesId}
          chapterId={currentChapterId}
          chapterNumber={currentChapter?.chapterNumber}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            setRefreshKey((k) => k + 1);
            loadProgress();
            onShowToast('Giao việc thành công', 'Nhiệm vụ mới đã được thêm vào bảng tiến độ');
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};

export const ProductionPipelineView = WorkspaceView;
export type ProductionPipelineViewProps = WorkspaceViewProps;
