import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ProductionBoard } from '@/shared/features/pipeline-board/ProductionBoard';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { CreateAssignmentModal } from '@/roles/producer/modals/CreateAssignmentModal';
import { SystemRole, WorkspaceRole } from '@/types';
import { BookOpen, RefreshCw, ArrowUpRight, ShieldAlert, Lock, ChevronRight } from 'lucide-react';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { workspaceService } from '@/services/workspace.service';
import { seriesService } from '@/services/series.service';

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
    cls: 'text-stone-800 bg-stone-50 border-stone-300',
  },
  InProduction: { label: 'Đang sản xuất', cls: 'text-amber-900 bg-amber-50 border-amber-300' },
  Approved: { label: 'Đã duyệt chương', cls: 'text-emerald-900 bg-emerald-50 border-emerald-300' },
  Published: { label: 'Đã xuất bản', cls: 'text-violet-900 bg-violet-50 border-violet-300' },
};

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink';

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

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Metadata cho breadcrumb Studio / Series
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [seriesTitle, setSeriesTitle] = useState<string>('');

  const isReaderOnly = effectiveRoles.length === 1 && effectiveRoles[0] === 'READER';
  const isProducer = useMemo(() => {
    return effectiveRoles.some((r) => r.toUpperCase() === 'PRODUCER');
  }, [effectiveRoles]);

  // Nạp metadata ngữ cảnh Studio và Series
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
          if (s?.title) setSeriesTitle(s.title);
        })
        .catch(() => {});
    }
  }, [workspaceId, seriesId]);

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

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

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

  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.id === currentChapterId);
  }, [chapters, currentChapterId]);

  const currentChapterFormattedTitle = useMemo(() => {
    if (!currentChapter) return 'Đang nạp chương...';
    return formatChapterLabel(currentChapter.chapterNumber, currentChapter.title || 'Bản thảo');
  }, [currentChapter]);

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

  const statusMeta = currentChapter
    ? (CHAPTER_STATUS_META[String(currentChapter.status)] ?? {
        label: String(currentChapter.status),
        cls: 'text-stone-800 bg-stone-100 border-stone-300',
      })
    : null;

  return (
    <div className='w-full min-h-screen min-w-0 bg-[#F3F0E9] font-sans text-landing-ink'>
      <div className='flex min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-6'>
        {/* A. Header ngữ cảnh Editorial Studio */}
        <header className='flex min-w-0 flex-col gap-4 border-b border-landing-border pb-5 lg:flex-row lg:items-end lg:justify-between'>
          <div className='min-w-0'>
            {/* Breadcrumb Studio / Series / Chương */}
            <nav
              aria-label='Đường dẫn ngữ cảnh'
              className='flex items-center gap-1.5 text-xs text-landing-ink-muted mb-2 flex-wrap'
            >
              <Link
                to={workspaceId ? `/workspaces/${workspaceId}` : '#'}
                className='hover:text-landing-ink transition-colors max-w-[140px] truncate'
                title={workspaceName || 'Studio'}
              >
                {workspaceName || 'Studio'}
              </Link>
              <ChevronRight className='h-3 w-3 text-stone-400 shrink-0' aria-hidden='true' />
              <Link
                to={workspaceId && seriesId ? `/workspaces/${workspaceId}/series/${seriesId}` : '#'}
                className='hover:text-landing-ink transition-colors max-w-[160px] truncate'
                title={seriesTitle || 'Series'}
              >
                {seriesTitle || 'Series'}
              </Link>
              <ChevronRight className='h-3 w-3 text-stone-400 shrink-0' aria-hidden='true' />
              <span
                className='font-semibold text-landing-ink max-w-[200px] truncate'
                title={currentChapterFormattedTitle}
              >
                {currentChapter ? `Chương ${currentChapter.chapterNumber}` : 'Chương'}
              </span>
            </nav>

            {/* Nhãn chức năng phụ + Tên chương nổi bật */}
            <div className='flex items-center gap-2 mb-1.5'>
              <h1 className='text-sm font-semibold text-landing-ink-muted'>Quy trình sản xuất</h1>
              {statusMeta && (
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusMeta.cls}`}
                >
                  {statusMeta.label}
                </span>
              )}
              {currentChapter &&
                ['Approved', 'Published'].includes(String(currentChapter.status)) && (
                  <span className='inline-flex items-center gap-1 text-xs text-landing-ink-muted'>
                    <Lock className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
                    <span className='hidden sm:inline'>
                      Bị khoá: nội dung chương chỉ còn xem, không sửa được
                    </span>
                  </span>
                )}
            </div>

            {/* Tiêu đề chương nổi bật */}
            <h2 className='font-serif text-2xl font-bold tracking-tight text-landing-ink sm:text-3xl'>
              {currentChapter
                ? currentChapter.title
                  ? currentChapter.title.replace(/^\s*chương\s*\d+\s*[:.\-–—]?\s*/i, '').trim()
                  : `Bản thảo Chương ${currentChapter.chapterNumber}`
                : 'Đang nạp chương...'}
            </h2>

            {/* Bộ chọn chương */}
            <div className='mt-3 flex flex-wrap items-center gap-3'>
              <div className='flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-landing-border bg-[#FCFBF8] px-3 shadow-2xs'>
                <BookOpen className='h-4 w-4 shrink-0 text-landing-ink-muted' aria-hidden='true' />
                <label
                  htmlFor='pipeline-chapter-select'
                  className='text-xs font-semibold text-landing-ink-muted'
                >
                  Chương:
                </label>
                <select
                  id='pipeline-chapter-select'
                  aria-label='Chương:'
                  value={currentChapterId}
                  onChange={handleChapterChange}
                  disabled={loadingChapters || chapters.length === 0}
                  className={`min-h-9 max-w-[60vw] min-w-0 truncate rounded bg-transparent pr-2 text-sm font-semibold text-landing-ink cursor-pointer sm:max-w-md ${focusRing}`}
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
            </div>
          </div>

          {/* Nhóm hành động: tối đa 1 CTA chính nổi bật */}
          <div className='flex flex-wrap items-center gap-2.5'>
            <button
              type='button'
              onClick={() => {
                loadChapters();
                setRefreshKey((k) => k + 1);
              }}
              aria-label='Làm mới dữ liệu'
              title='Làm mới dữ liệu'
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-landing-border bg-[#FCFBF8] px-3.5 text-sm font-semibold text-landing-ink hover:bg-white shadow-2xs transition-colors cursor-pointer ${focusRing}`}
            >
              <RefreshCw className='h-4 w-4 text-landing-ink-muted' aria-hidden='true' />
              <span className='max-sm:sr-only'>Làm mới</span>
            </button>

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
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#1C1917] px-4 text-sm font-semibold text-white shadow-xs hover:bg-stone-800 transition-colors cursor-pointer ${focusRing}`}
              >
                <span>Công việc &amp; Xét duyệt</span>
                <ArrowUpRight className='h-4 w-4' aria-hidden='true' />
              </button>
            )}
          </div>
        </header>

        {/* Bàn điều phối sản xuất */}
        <ProductionBoard
          chapterId={currentChapterId}
          refreshKey={refreshKey}
          currentUserRole={currentUserRole}
          isProducer={isProducer}
          currentUserId={currentUserId}
          onShowToast={onShowToast}
          onOpenCreateAssignment={() => setIsCreateModalOpen(true)}
        />
      </div>

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
