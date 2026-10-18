import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ProductionBoard } from '@/shared/features/pipeline-board/ProductionBoard';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { CreateAssignmentModal } from '@/roles/producer/modals/CreateAssignmentModal';
import { SystemRole, WorkspaceRole } from '@/types';
import { BookOpen, RefreshCw, ArrowUpRight, ShieldAlert, Lock } from 'lucide-react';
import { chapterService, ChapterDto } from '@/services/chapter.service';

export interface WorkspaceViewProps {
  currentUserRole?: WorkspaceRole | null;
  systemRole?: SystemRole;
  userRoles?: string[];
  currentUserId?: string;
  onShowToast: (title: string, desc: string) => void;
  isReaderMode?: boolean;
}

const CHAPTER_STATUS_META: Record<string, { label: string; cls: string }> = {
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
    <div className='w-full h-full min-w-0 overflow-x-hidden overflow-y-auto bg-landing-paper font-sans text-landing-ink'>
      <div className='flex min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7'>
        {/* Header chương */}
        <header className='flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div className='min-w-0'>
            <h1 className='font-serif text-2xl font-semibold text-landing-ink sm:text-3xl'>
              Quy trình sản xuất
            </h1>
            <div className='mt-3 flex flex-wrap items-center gap-3'>
              <div className='flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-landing-border bg-landing-paper-light px-3'>
                <BookOpen className='h-4 w-4 shrink-0 text-landing-ink-muted' aria-hidden='true' />
                <label
                  htmlFor='pipeline-chapter-select'
                  className='text-sm font-medium text-landing-ink-muted'
                >
                  Chương:
                </label>
                <select
                  id='pipeline-chapter-select'
                  value={currentChapterId}
                  onChange={handleChapterChange}
                  disabled={loadingChapters || chapters.length === 0}
                  className={`min-h-10 max-w-[60vw] min-w-0 truncate rounded bg-transparent pr-2 text-sm font-semibold text-landing-ink cursor-pointer sm:max-w-md ${focusRing}`}
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

              {statusMeta && (
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusMeta.cls}`}
                >
                  {statusMeta.label}
                </span>
              )}
              {currentChapter &&
                ['Approved', 'Published'].includes(String(currentChapter.status)) && (
                  <span className='inline-flex items-center gap-1.5 text-xs text-landing-ink-muted'>
                    <Lock className='h-3.5 w-3.5' aria-hidden='true' />
                    Bị khoá: nội dung chương chỉ còn xem, không sửa được
                  </span>
                )}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => {
                loadChapters();
                setRefreshKey((k) => k + 1);
              }}
              aria-label='Làm mới dữ liệu'
              title='Làm mới dữ liệu'
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-landing-border bg-landing-paper-light px-3.5 text-sm font-semibold text-landing-ink hover:bg-white transition-colors cursor-pointer ${focusRing}`}
            >
              <RefreshCw className='h-4 w-4' aria-hidden='true' />
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
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-landing-ink px-4 text-sm font-semibold text-white hover:bg-black transition-colors cursor-pointer ${focusRing}`}
              >
                <span>Công việc &amp; Xét duyệt</span>
                <ArrowUpRight className='h-4 w-4' aria-hidden='true' />
              </button>
            )}
          </div>
        </header>

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
