import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Palette,
  LayoutTemplate,
  Lock,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  RotateCcw,
  BookOpen,
  FileText,
  Layers,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';

interface ArtistChapterSelectionViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

type StatusFilterType = 'all' | 'frozen' | 'in_progress' | 'approved';
type SortByType = 'chapter_asc' | 'chapter_desc' | 'newest' | 'oldest';
type ViewModeType = 'grid' | 'table';

export const ArtistChapterSelectionView: React.FC<ArtistChapterSelectionViewProps> = ({
  onShowToast,
}) => {
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const navigate = useNavigate();

  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter, Sort, View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [sortBy, setSortBy] = useState<SortByType>('chapter_asc');
  const [viewMode, setViewMode] = useState<ViewModeType>('grid');

  // Nạp thông tin Bộ truyện & danh sách Chương
  const loadData = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);
    try {
      const [seriesRes, chaptersRes] = await Promise.allSettled([
        seriesService.getSeriesById(seriesId),
        chapterService.getChaptersBySeries(seriesId),
      ]);

      if (seriesRes.status === 'fulfilled' && seriesRes.value) {
        setSeriesDetail(seriesRes.value);
      }

      if (chaptersRes.status === 'fulfilled' && chaptersRes.value) {
        const raw = chaptersRes.value;
        const items: ChapterDto[] = Array.isArray(raw) ? raw : (raw as any)?.items || [];
        setChapters(items);
      } else if (chaptersRes.status === 'rejected') {
        throw chaptersRes.reason;
      }
    } catch (err: any) {
      const msg = err?.message || 'Không thể tải danh sách chương.';
      setError(msg);
      onShowToast?.('Lỗi tải dữ liệu', msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = chapters.length;
    const frozen = chapters.filter((c) => !!c.isScriptFrozen).length;
    const approved = chapters.filter(
      (c) => c.status === 'Approved' || c.status === 'Published',
    ).length;
    const inProgress = chapters.filter(
      (c) => !c.isScriptFrozen && c.status !== 'Approved' && c.status !== 'Published',
    ).length;
    return { total, frozen, approved, inProgress };
  }, [chapters]);

  // Lọc & Sắp xếp danh sách chương
  const filteredChapters = useMemo(() => {
    let list = [...chapters];

    // Tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((chap) => {
        const matchNum =
          String(chap.chapterNumber).includes(q) ||
          `chương ${chap.chapterNumber}`.includes(q) ||
          `ch ${chap.chapterNumber}`.includes(q);
        const matchTitle = (chap.title || '').toLowerCase().includes(q);
        const matchOutline = (chap.outline || '').toLowerCase().includes(q);
        return matchNum || matchTitle || matchOutline;
      });
    }

    // Bộ lọc trạng thái
    if (statusFilter === 'frozen') {
      list = list.filter((c) => !!c.isScriptFrozen);
    } else if (statusFilter === 'in_progress') {
      list = list.filter((c) => !c.isScriptFrozen && c.status !== 'Approved' && c.status !== 'Published');
    } else if (statusFilter === 'approved') {
      list = list.filter((c) => c.status === 'Approved' || c.status === 'Published');
    }

    // Sắp xếp
    list.sort((a, b) => {
      if (sortBy === 'chapter_asc') {
        return (a.chapterNumber || 0) - (b.chapterNumber || 0);
      }
      if (sortBy === 'chapter_desc') {
        return (b.chapterNumber || 0) - (a.chapterNumber || 0);
      }
      if (sortBy === 'newest') {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'oldest') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      }
      return 0;
    });

    return list;
  }, [chapters, searchQuery, statusFilter, sortBy]);

  // Chuyển sang bàn vẽ độc lập (FocusWorkspaceLayout) cho chương được chọn
  const handleOpenArtistDesk = (chapter: ChapterDto) => {
    if (!workspaceId || !seriesId) return;
    const targetUrl = `/workspaces/${workspaceId}/series/${seriesId}/artist/desk?chapterId=${encodeURIComponent(chapter.id)}`;

    // Tận dụng View Transition API nếu trình duyệt hỗ trợ để chuyển cảnh êm ái
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        navigate(targetUrl);
      });
    } else {
      navigate(targetUrl);
    }
  };

  const seriesTitle = seriesDetail?.title || 'Bộ truyện';

  const renderStatusBadge = (chapter: ChapterDto) => {
    if (chapter.isScriptFrozen) {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0'>
          <Lock className='w-3 h-3 text-indigo-600 dark:text-indigo-400' />
          <span>Kịch bản đã chốt</span>
          {chapter.scriptContentHash && (
            <span
              className='font-mono text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-700'
              title={`SHA-256: ${chapter.scriptContentHash}`}
            >
              #{chapter.scriptContentHash.slice(0, 8)}
            </span>
          )}
        </span>
      );
    }

    switch (chapter.status) {
      case 'Approved':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0'>
            <CheckCircle2 className='w-3 h-3 text-emerald-600 dark:text-emerald-400' />
            <span>Đã duyệt kịch bản</span>
          </span>
        );
      case 'Published':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0'>
            <Sparkles className='w-3 h-3 text-purple-600 dark:text-purple-400' />
            <span>Đã phát hành</span>
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0'>
            <Clock className='w-3 h-3 text-amber-600 dark:text-amber-400' />
            <span>Đang sản xuất</span>
          </span>
        );
    }
  };

  return (
    <div
      data-testid='artist-chapter-selection-view'
      className='w-full min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-6 md:px-8 space-y-6 bg-[#FAF8F5] dark:bg-[#1C1917] text-[#1C1917] dark:text-[#F5F5F4] transition-colors'
    >
      {/* 1. TOP-BAR: TIÊU ĐỀ, HƯỚNG DẪN & THỐNG KÊ NHANH */}
      <div className='bg-[#FCFBF8] dark:bg-[#292524] border border-[#D8D2C5] dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
        <div className='space-y-2 min-w-0'>
          {/* Breadcrumb */}
          <nav
            aria-label='Breadcrumb'
            className='flex items-center gap-1.5 text-xs text-[#78716C] dark:text-stone-400 font-medium flex-wrap'
          >
            <span className='hover:text-[#1C1917] dark:hover:text-stone-200 transition-colors'>
              Trang chủ
            </span>
            <span className='text-[#A8A29E] select-none'>/</span>
            <span className='hover:text-[#1C1917] dark:hover:text-stone-200 transition-colors'>
              Series
            </span>
            <span className='text-[#A8A29E] select-none'>/</span>
            <span className='text-[#C2410C] font-semibold truncate max-w-xs'>{seriesTitle}</span>
            <span className='text-[#A8A29E] select-none'>/</span>
            <span className='text-[#1C1917] dark:text-stone-200 font-semibold'>Bàn vẽ họa sĩ</span>
          </nav>

          {/* Tiêu đề & hướng dẫn */}
          <div className='space-y-1'>
            <div className='flex items-center gap-2.5 flex-wrap'>
              <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] dark:bg-orange-950/50 border border-[#F97316]/30 text-[#C2410C] dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1'>
                <Palette className='w-3 h-3' />
                <span>ARTIST PRODUCTION DESK</span>
              </span>
              <h1 className='text-xl sm:text-2xl font-bold font-serif text-[#1C1917] dark:text-stone-100 tracking-tight'>
                Bàn vẽ họa sĩ — {seriesTitle}
              </h1>
            </div>
            <p className='text-xs text-[#57534E] dark:text-stone-400 leading-relaxed max-w-3xl'>
              <strong className='text-[#1C1917] dark:text-stone-200 font-semibold'>
                Chọn Chương Để Mở Bàn Vẽ Chuyên Dụng
              </strong>{' '}
              — Lựa chọn một chương để bước vào không gian vẽ toàn màn hình độc lập (Focus
              Workspace), phân rã bố cục khung tranh (Panel Templates), nạp bản thảo chì (Pencil),
              đi nét mực (Ink) và tải tranh hoàn thiện.
            </p>
          </div>
        </div>

        {/* Khối thống kê nhanh KPI */}
        <div className='flex items-center gap-3 flex-wrap shrink-0'>
          <div
            data-testid='artist-stats-total'
            className='bg-white dark:bg-stone-900 border border-[#D8D2C5] dark:border-stone-800 rounded-xl px-4 py-2.5 shadow-2xs min-w-[100px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-[#78716C] dark:text-stone-400'>
              Tổng chương
            </div>
            <div className='text-xl font-black text-[#1C1917] dark:text-stone-100 mt-0.5'>
              {stats.total}
            </div>
          </div>

          <div
            data-testid='artist-stats-frozen'
            className='bg-white dark:bg-stone-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl px-4 py-2.5 shadow-2xs min-w-[110px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1'>
              <Lock className='w-3 h-3' />
              <span>Sẵn sàng vẽ</span>
            </div>
            <div className='text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5'>
              {stats.frozen}
            </div>
          </div>

          <div
            data-testid='artist-stats-in-progress'
            className='bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900/60 rounded-xl px-4 py-2.5 shadow-2xs min-w-[110px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              <span>Đang sản xuất</span>
            </div>
            <div className='text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5'>
              {stats.inProgress}
            </div>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, BỘ LỌC VÀ CHUYỂN CHẾ ĐỘ XEM */}
      <div className='bg-[#FCFBF8] dark:bg-[#292524] border border-[#D8D2C5] dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-3.5'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          {/* Ô tìm kiếm */}
          <div className='relative flex-1 max-w-md'>
            <Search className='w-4 h-4 text-[#78716C] dark:text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              data-testid='artist-chapter-search-input'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Tìm theo số chương, tiêu đề hoặc nội dung tóm tắt...'
              className='w-full pl-9.5 pr-8 py-2 rounded-xl bg-white dark:bg-stone-900 border border-[#D8D2C5] dark:border-stone-700 text-xs text-[#1C1917] dark:text-stone-100 placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs p-1'
                title='Xóa tìm kiếm'
              >
                ✕
              </button>
            )}
          </div>

          {/* Sắp xếp & Chế độ xem */}
          <div className='flex items-center gap-2.5 self-end md:self-auto'>
            {/* Bộ chọn sắp xếp */}
            <div className='flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-[#D8D2C5] dark:border-stone-700 rounded-xl px-2.5 py-1.5'>
              <ArrowUpDown className='w-3.5 h-3.5 text-[#78716C] dark:text-stone-400' />
              <select
                aria-label='Sắp xếp chương'
                data-testid='artist-chapter-sort-select'
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortByType)}
                className='bg-transparent text-xs font-semibold text-[#1C1917] dark:text-stone-200 focus:outline-none cursor-pointer'
              >
                <option value='chapter_asc'>Chương tăng dần (1 → N)</option>
                <option value='chapter_desc'>Chương giảm dần (N → 1)</option>
                <option value='newest'>Mới cập nhật</option>
                <option value='oldest'>Cũ nhất</option>
              </select>
            </div>

            {/* Chế độ xem Lưới / Bảng */}
            <div className='flex items-center bg-white dark:bg-stone-900 border border-[#D8D2C5] dark:border-stone-700 rounded-xl p-0.5'>
              <button
                type='button'
                data-testid='artist-view-grid'
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#1C1917] text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs'
                    : 'text-[#78716C] dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-stone-200'
                }`}
                title='Xem dạng thẻ lưới'
              >
                <LayoutGrid className='w-4 h-4' />
              </button>
              <button
                type='button'
                data-testid='artist-view-table'
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#1C1917] text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs'
                    : 'text-[#78716C] dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-stone-200'
                }`}
                title='Xem dạng bảng danh sách'
              >
                <List className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>

        {/* Các nút Tab lọc trạng thái */}
        <div className='flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#E7E2D7] dark:border-stone-800'>
          <span className='text-[11px] font-bold text-[#78716C] dark:text-stone-400 mr-1 select-none'>
            Lọc trạng thái:
          </span>

          <button
            type='button'
            data-testid='artist-filter-all'
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#1C1917] text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                : 'bg-white dark:bg-stone-900 text-[#57534E] dark:text-stone-400 border border-[#D8D2C5] dark:border-stone-700 hover:bg-[#F3F0E9] dark:hover:bg-stone-800'
            }`}
          >
            Tất cả ({stats.total})
          </button>

          <button
            type='button'
            data-testid='artist-filter-frozen'
            onClick={() => setStatusFilter('frozen')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'frozen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
            }`}
          >
            <Lock className='w-3 h-3' />
            <span>Sẵn sàng vẽ ({stats.frozen})</span>
          </button>

          <button
            type='button'
            data-testid='artist-filter-in-progress'
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Clock className='w-3 h-3' />
            <span>Đang sản xuất ({stats.inProgress})</span>
          </button>

          <button
            type='button'
            data-testid='artist-filter-approved'
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className='w-3 h-3' />
            <span>Đã duyệt ({stats.approved})</span>
          </button>
        </div>
      </div>

      {/* 3. VÙNG HIỂN THỊ DANH SÁCH CHƯƠNG */}
      {loading ? (
        <div
          data-testid='artist-chapters-loading'
          className='py-20 flex flex-col items-center justify-center gap-3 text-stone-500'
        >
          <Loader2 className='w-8 h-8 animate-spin text-[#C2410C]' />
          <p className='text-xs font-semibold'>Đang tải danh sách chương của bộ truyện...</p>
        </div>
      ) : error ? (
        <div
          data-testid='artist-chapters-error'
          className='py-12 px-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-center max-w-lg mx-auto space-y-3'
        >
          <AlertCircle className='w-8 h-8 text-red-600 mx-auto' />
          <h3 className='text-sm font-bold text-red-900 dark:text-red-200'>Lỗi tải danh sách chương</h3>
          <p className='text-xs text-red-700 dark:text-red-300'>{error}</p>
          <button
            type='button'
            onClick={loadData}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs'
          >
            <RotateCcw className='w-3.5 h-3.5' />
            <span>Thử lại</span>
          </button>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div
          data-testid='artist-chapters-empty'
          className='py-16 px-6 rounded-2xl bg-[#FCFBF8] dark:bg-[#292524] border border-[#D8D2C5] dark:border-stone-800 text-center max-w-md mx-auto space-y-3'
        >
          <div className='w-12 h-12 rounded-full bg-[#FFF2E6] dark:bg-orange-950/60 text-[#C2410C] flex items-center justify-center mx-auto shadow-2xs'>
            <BookOpen className='w-6 h-6' />
          </div>
          <h3 className='text-sm font-bold text-[#1C1917] dark:text-stone-100'>
            {chapters.length === 0
              ? 'Chưa có chương nào trong bộ truyện'
              : 'Không tìm thấy chương phù hợp'}
          </h3>
          <p className='text-xs text-[#78716C] dark:text-stone-400 leading-relaxed'>
            {chapters.length === 0
              ? 'Bộ truyện này chưa được khởi tạo chương. Vui lòng liên hệ Producer để thêm chương và phân bổ công việc.'
              : 'Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác để xem danh sách chương.'}
          </p>
          {chapters.length > 0 && (searchQuery || statusFilter !== 'all') && (
            <button
              type='button'
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D2C5] dark:border-stone-700 hover:bg-[#F3F0E9] dark:hover:bg-stone-800 text-xs font-semibold text-[#1C1917] dark:text-stone-200 transition-colors cursor-pointer'
            >
              <RotateCcw className='w-3.5 h-3.5' />
              <span>Xóa bộ lọc tìm kiếm</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* CHẾ ĐỘ THẺ LƯỚI (GRID VIEW) */
        <div
          data-testid='artist-chapters-grid'
          className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5'
        >
          {filteredChapters.map((chapter) => {
            const isFrozen = !!chapter.isScriptFrozen;
            return (
              <div
                key={chapter.id}
                data-testid={`artist-chapter-card-${chapter.chapterNumber}`}
                onClick={() => handleOpenArtistDesk(chapter)}
                className='group relative rounded-2xl p-5 bg-[#FCFBF8] dark:bg-[#292524] border border-[#D8D2C5] dark:border-stone-800 hover:border-[#C2410C]/60 dark:hover:border-orange-500/60 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden'
              >
                {/* Viền nhấn màu phía trên khi hover */}
                <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C2410C] to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />

                <div className='space-y-3.5'>
                  {/* Hàng Header thẻ: Huy hiệu số chương + Badge trạng thái */}
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <div className='flex items-center gap-2'>
                      <span className='px-2.5 py-1 rounded-lg bg-[#FFF2E6] dark:bg-orange-950/60 border border-[#F97316]/20 text-[#C2410C] dark:text-orange-400 text-xs font-black tracking-tight'>
                        CHƯƠNG {chapter.chapterNumber}
                      </span>
                      {isFrozen && (
                        <span className='text-[10.5px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1'>
                          <Lock className='w-2.5 h-2.5' />
                          <span>Đã chốt</span>
                        </span>
                      )}
                    </div>
                    {renderStatusBadge(chapter)}
                  </div>

                  {/* Tiêu đề chương */}
                  <div>
                    <h3 className='text-base font-bold font-serif text-[#1C1917] dark:text-stone-100 group-hover:text-[#C2410C] dark:group-hover:text-orange-400 transition-colors line-clamp-1'>
                      {chapter.title || `Chương ${chapter.chapterNumber}`}
                    </h3>
                    <p className='text-xs text-[#57534E] dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed min-h-[2rem]'>
                      {chapter.outline || 'Chưa có mô tả tóm tắt cho chương này.'}
                    </p>
                  </div>

                  {/* Thông tin phụ: Số trang, phân cảnh & trạng thái sẵn sàng vẽ */}
                  <div className='pt-2 border-t border-[#E7E2D7] dark:border-stone-800 flex items-center justify-between text-[11px] text-[#78716C] dark:text-stone-400'>
                    <div className='flex items-center gap-3'>
                      <span className='flex items-center gap-1 font-semibold text-[#1C1917] dark:text-stone-200'>
                        <Layers className='w-3.5 h-3.5 text-stone-500' />
                        <span>{chapter.pagesCount || 0} trang</span>
                      </span>
                      <span className='flex items-center gap-1'>
                        <FileText className='w-3.5 h-3.5 text-stone-400' />
                        <span>{chapter.scenesCount || 0} cảnh</span>
                      </span>
                    </div>

                    {isFrozen ? (
                      <span className='font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1'>
                        <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                        <span>Sẵn sàng vẽ</span>
                      </span>
                    ) : (
                      <span className='font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1'>
                        <Clock className='w-3 h-3 text-amber-600' />
                        <span>Chưa chốt kịch bản</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Nút vào bàn vẽ ở chân thẻ */}
                <div className='mt-4 pt-3 border-t border-[#E7E2D7] dark:border-stone-800 flex items-center justify-between'>
                  <span className='text-[10px] text-[#A8A29E] font-medium'>
                    {chapter.updatedAt
                      ? `Cập nhật: ${new Date(chapter.updatedAt).toLocaleDateString('vi-VN')}`
                      : 'Mới tạo'}
                  </span>

                  <button
                    type='button'
                    data-testid={`artist-enter-desk-btn-${chapter.chapterNumber}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenArtistDesk(chapter);
                    }}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#C2410C] dark:bg-stone-100 dark:hover:bg-orange-500 dark:text-stone-900 text-white text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs group-hover:translate-x-0.5'
                  >
                    <LayoutTemplate className='w-3.5 h-3.5 text-orange-400 dark:text-orange-600' />
                    <span>Vào bàn vẽ</span>
                    <ArrowRight className='w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5' />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CHẾ ĐỘ DANH SÁCH BẢNG (TABLE VIEW) */
        <div
          data-testid='artist-chapters-table'
          className='bg-[#FCFBF8] dark:bg-[#292524] border border-[#D8D2C5] dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs'
        >
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-[#F3F0E9] dark:bg-stone-800/80 text-[#57534E] dark:text-stone-300 font-bold border-b border-[#D8D2C5] dark:border-stone-800 uppercase text-[10.5px] tracking-wider select-none'>
                <tr>
                  <th className='py-3 px-4'>Chương</th>
                  <th className='py-3 px-4'>Tiêu đề & Tóm tắt</th>
                  <th className='py-3 px-4'>Trạng thái kịch bản</th>
                  <th className='py-3 px-4 text-center'>Số trang</th>
                  <th className='py-3 px-4 text-center'>Số phân cảnh</th>
                  <th className='py-3 px-4 text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#E7E2D7] dark:divide-stone-800'>
                {filteredChapters.map((chapter) => (
                  <tr
                    key={chapter.id}
                    data-testid={`artist-chapter-row-${chapter.chapterNumber}`}
                    onClick={() => handleOpenArtistDesk(chapter)}
                    className='hover:bg-[#F3F0E9]/70 dark:hover:bg-stone-800/50 transition-colors cursor-pointer group'
                  >
                    <td className='py-3.5 px-4 whitespace-nowrap'>
                      <span className='px-2.5 py-1 rounded-lg bg-[#FFF2E6] dark:bg-orange-950/60 border border-[#F97316]/20 text-[#C2410C] dark:text-orange-400 font-black text-xs'>
                        Chương {chapter.chapterNumber}
                      </span>
                    </td>
                    <td className='py-3.5 px-4 min-w-[220px] max-w-sm'>
                      <div className='font-bold text-[#1C1917] dark:text-stone-100 group-hover:text-[#C2410C] dark:group-hover:text-orange-400 transition-colors truncate'>
                        {chapter.title || `Chương ${chapter.chapterNumber}`}
                      </div>
                      <div className='text-[11px] text-[#78716C] dark:text-stone-400 truncate mt-0.5'>
                        {chapter.outline || 'Chưa có mô tả tóm tắt.'}
                      </div>
                    </td>
                    <td className='py-3.5 px-4 whitespace-nowrap'>{renderStatusBadge(chapter)}</td>
                    <td className='py-3.5 px-4 text-center whitespace-nowrap font-bold text-[#1C1917] dark:text-stone-200'>
                      {chapter.pagesCount || 0}
                    </td>
                    <td className='py-3.5 px-4 text-center whitespace-nowrap text-[#78716C] dark:text-stone-400 font-medium'>
                      {chapter.scenesCount || 0}
                    </td>
                    <td className='py-3.5 px-4 text-right whitespace-nowrap'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenArtistDesk(chapter);
                        }}
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#C2410C] dark:bg-stone-100 dark:hover:bg-orange-500 dark:text-stone-900 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs'
                      >
                        <LayoutTemplate className='w-3.5 h-3.5 text-orange-400 dark:text-orange-600' />
                        <span>Vào bàn vẽ</span>
                        <ArrowRight className='w-3 h-3' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistChapterSelectionView;
