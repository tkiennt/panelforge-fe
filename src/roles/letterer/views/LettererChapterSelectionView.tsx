// src/roles/letterer/views/LettererChapterSelectionView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Type,
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
import { PageContainer } from '@/shared/components/PageContainer';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';

interface LettererChapterSelectionViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

type StatusFilterType = 'all' | 'frozen' | 'in_progress' | 'approved';
type SortByType = 'chapter_asc' | 'chapter_desc' | 'newest' | 'oldest';
type ViewModeType = 'grid' | 'table';

export const LettererChapterSelectionView: React.FC<LettererChapterSelectionViewProps> = ({
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

  const loadData = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);
    try {
      const [seriesRes, chaptersRes] = await Promise.all([
        seriesService.getSeriesById(seriesId).catch(() => null),
        chapterService.getChaptersBySeries(seriesId, 1, 100).catch(() => ({ items: [], total: 0 })),
      ]);

      if (seriesRes) setSeriesDetail(seriesRes);
      setChapters(chaptersRes.items || []);
    } catch (err: any) {
      const msg = err.message || 'Không thể tải danh sách chương.';
      setError(msg);
      onShowToast?.('Lỗi tải dữ liệu', msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick stats
  const stats = useMemo(() => {
    const total = chapters.length;
    const frozen = chapters.filter((c) => !!c.isScriptFrozen).length;
    const approved = chapters.filter((c) => c.status === 'Approved' || c.status === 'Published').length;
    const inProgress = chapters.filter(
      (c) => !c.isScriptFrozen && c.status !== 'Approved' && c.status !== 'Published',
    ).length;
    return { total, frozen, approved, inProgress };
  }, [chapters]);

  // Filter & Sort
  const filteredChapters = useMemo(() => {
    let list = [...chapters];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((chap) => {
        const matchNum =
          String(chap.chapterNumber).includes(q) || `chương ${chap.chapterNumber}`.includes(q);
        const matchTitle = (chap.title || '').toLowerCase().includes(q);
        const matchOutline = (chap.outline || '').toLowerCase().includes(q);
        return matchNum || matchTitle || matchOutline;
      });
    }

    if (statusFilter === 'frozen') {
      list = list.filter((c) => !!c.isScriptFrozen);
    } else if (statusFilter === 'in_progress') {
      list = list.filter((c) => !c.isScriptFrozen && c.status !== 'Approved' && c.status !== 'Published');
    } else if (statusFilter === 'approved') {
      list = list.filter((c) => c.status === 'Approved' || c.status === 'Published');
    }

    list.sort((a, b) => {
      if (sortBy === 'chapter_asc') return a.chapterNumber - b.chapterNumber;
      if (sortBy === 'chapter_desc') return b.chapterNumber - a.chapterNumber;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [chapters, searchQuery, statusFilter, sortBy]);

  const seriesTitle = seriesDetail?.title || 'Bộ truyện';

  const handleSelectChapter = (chapterId: string) => {
    if (!workspaceId || !seriesId) return;
    navigate(`/workspaces/${workspaceId}/series/${seriesId}/letterer/desk?chapterId=${chapterId}`);
  };

  const getStatusBadge = (chapter: ChapterDto) => {
    if (chapter.isScriptFrozen) {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0'>
          <Lock className='w-3 h-3 text-indigo-600 dark:text-indigo-400' />
          <span>Kịch bản đã khóa</span>
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
    <PageContainer
      data-testid='letterer-chapter-selection-view'
      className='space-y-6 py-6 text-[#1C1917] dark:text-[#F5F5F4] font-sans'
    >
      {/* 1. TOP-BAR: TIÊU ĐỀ & THỐNG KÊ NHANH (KHÔNG LẶP LẠI BREADCRUMB CỦA APPSHELL) */}
      <div className='bg-[#FCFBF8] dark:bg-[#292524] border border-[#D8D2C5] dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
        <div className='space-y-1.5 min-w-0'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] dark:bg-orange-950/50 border border-[#F97316]/30 text-[#C2410C] dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1'>
              <Type className='w-3 h-3' />
              <span>LETTERING PRODUCTION DESK</span>
            </span>
            <h1 className='text-xl sm:text-2xl font-bold font-serif text-[#1C1917] dark:text-stone-100 tracking-tight'>
              Bàn làm việc thoại &amp; chữ — {seriesTitle}
            </h1>
          </div>
          <p className='text-xs text-[#57534E] dark:text-stone-400 leading-relaxed max-w-3xl'>
            <strong className='text-[#1C1917] dark:text-stone-200 font-semibold'>
              Chọn Chương Để Mở Bàn Xếp Chữ Chuyên Dụng
            </strong>{' '}
            — Lựa chọn một chương để bước vào không gian làm việc toàn màn hình độc lập (Focus
            Workspace), định vị bóng thoại (Balloons), neo liên kết kịch bản (Script Anchoring),
            căn chỉnh kiểu chữ và xuất trang thoại hoàn chỉnh.
          </p>
        </div>

        {/* Khối thống kê nhanh KPI */}
        <div className='flex items-center gap-3 flex-wrap shrink-0'>
          <div
            data-testid='letterer-stats-total'
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
            data-testid='letterer-stats-progress'
            className='bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl px-4 py-2.5 shadow-2xs min-w-[100px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400'>
              Đang viết / vẽ
            </div>
            <div className='text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5'>
              {stats.inProgress}
            </div>
          </div>

          <div
            data-testid='letterer-stats-frozen'
            className='bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl px-4 py-2.5 shadow-2xs min-w-[100px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-indigo-800 dark:text-indigo-400'>
              Kịch bản khóa
            </div>
            <div className='text-xl font-black text-indigo-900 dark:text-indigo-200 mt-0.5'>
              {stats.frozen}
            </div>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, BỘ LỌC VÀ CHUYỂN DẠNG HIỂN THỊ */}
      <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FCFBF8] dark:bg-[#292524] p-3.5 rounded-2xl border border-[#D8D2C5] dark:border-stone-800 shadow-2xs'>
        <div className='flex-1 flex items-center gap-2.5 bg-white dark:bg-stone-900 border border-[#D8D2C5] dark:border-stone-800 rounded-xl px-3.5 py-2 focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/15 transition-all shadow-inner'>
          <Search className='w-4 h-4 text-[#78716C] dark:text-stone-400 shrink-0' />
          <input
            type='text'
            data-testid='letterer-chapter-search-input'
            placeholder='Tìm theo số chương, tiêu đề hoặc nội dung tóm tắt...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent text-xs text-[#1C1917] dark:text-stone-100 placeholder-[#78716C] dark:placeholder-stone-500 outline-none'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='text-[#78716C] dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-stone-200 text-xs font-bold px-1'
            >
              ✕
            </button>
          )}
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          <div className='flex items-center bg-[#F3F0E9] dark:bg-stone-900 p-1 rounded-xl border border-[#D8D2C5] dark:border-stone-800 text-xs'>
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'frozen', label: 'Đã khóa' },
                { id: 'in_progress', label: 'Đang làm' },
                { id: 'approved', label: 'Đã duyệt' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-stone-800 text-[#C2410C] dark:text-orange-400 font-bold shadow-2xs'
                    : 'text-[#57534E] dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className='flex items-center gap-1.5 bg-white dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-[#D8D2C5] dark:border-stone-800 text-xs'>
            <ArrowUpDown className='w-3.5 h-3.5 text-[#78716C] dark:text-stone-400' />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByType)}
              className='bg-transparent text-xs font-medium text-[#1C1917] dark:text-stone-200 outline-none cursor-pointer'
            >
              <option value='chapter_asc'>Chương tăng dần (1 → n)</option>
              <option value='chapter_desc'>Chương giảm dần (n → 1)</option>
              <option value='newest'>Mới cập nhật</option>
              <option value='oldest'>Cũ nhất</option>
            </select>
          </div>

          <div className='flex items-center bg-[#F3F0E9] dark:bg-stone-900 p-1 rounded-xl border border-[#D8D2C5] dark:border-stone-800'>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-stone-800 text-[#C2410C] dark:text-orange-400 shadow-2xs'
                  : 'text-[#78716C] dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-stone-200'
              }`}
              title='Hiển thị dạng thẻ (Lưới)'
            >
              <LayoutGrid className='w-4 h-4' />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-stone-800 text-[#C2410C] dark:text-orange-400 shadow-2xs'
                  : 'text-[#78716C] dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-stone-200'
              }`}
              title='Hiển thị dạng danh sách'
            >
              <List className='w-4 h-4' />
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className='p-2 rounded-xl bg-white dark:bg-stone-900 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 border border-[#D8D2C5] dark:border-stone-800 text-[#57534E] dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-stone-200 transition-colors shadow-2xs cursor-pointer'
            title='Tải lại danh sách'
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C2410C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH: DANH SÁCH CHƯƠNG */}
      {loading ? (
        <div className='bg-[#FCFBF8] dark:bg-[#292524] rounded-2xl border border-[#D8D2C5] dark:border-stone-800 p-16 flex flex-col items-center justify-center gap-3 shadow-xs'>
          <Loader2 className='w-8 h-8 text-[#C2410C] animate-spin' />
          <span className='text-xs font-semibold text-[#78716C] dark:text-stone-400'>
            Đang tải danh sách chương xếp chữ...
          </span>
        </div>
      ) : error ? (
        <div className='bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-8 flex flex-col items-center text-center gap-3'>
          <AlertCircle className='w-8 h-8 text-red-600 dark:text-red-400' />
          <p className='text-sm font-bold text-red-900 dark:text-red-200'>{error}</p>
          <button
            onClick={loadData}
            className='px-4 py-2 bg-white dark:bg-stone-900 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-50 shadow-xs cursor-pointer'
          >
            Thử lại
          </button>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div className='bg-[#FCFBF8] dark:bg-[#292524] rounded-2xl border border-dashed border-[#D8D2C5] dark:border-stone-800 p-12 text-center flex flex-col items-center gap-3'>
          <div className='w-12 h-12 rounded-2xl bg-[#F3F0E9] dark:bg-stone-800 flex items-center justify-center text-[#78716C] dark:text-stone-400'>
            <Type className='w-6 h-6 text-[#C2410C]' />
          </div>
          <h3 className='text-sm font-bold text-[#1C1917] dark:text-stone-100'>
            {searchQuery || statusFilter !== 'all'
              ? 'Không tìm thấy chương nào phù hợp với bộ lọc'
              : 'Chưa có chương truyện nào trong series này'}
          </h3>
          <p className='text-xs text-[#78716C] dark:text-stone-400 max-w-sm'>
            {searchQuery || statusFilter !== 'all'
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái.'
              : 'Vui lòng khởi tạo chương kịch bản trước khi tiến hành chèn chữ & bóng thoại.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {filteredChapters.map((chap) => (
            <div
              key={chap.id}
              data-testid={`letterer-chapter-card-${chap.chapterNumber}`}
              onClick={() => handleSelectChapter(chap.id)}
              className='group bg-[#FCFBF8] dark:bg-[#292524] hover:bg-white dark:hover:bg-stone-800 border border-[#D8D2C5] dark:border-stone-800 hover:border-[#C2410C] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4'
            >
              <div className='space-y-3'>
                <div className='flex items-center justify-between gap-2 flex-wrap'>
                  <span className='font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#F3F0E9] dark:bg-stone-900 border border-[#D8D2C5] dark:border-stone-800 text-[#1C1917] dark:text-stone-100 group-hover:border-[#F97316]/50 transition-colors'>
                    CHƯƠNG {chap.chapterNumber}
                  </span>
                  {getStatusBadge(chap)}
                </div>

                <div>
                  <h3 className='text-sm font-bold font-serif text-[#1C1917] dark:text-stone-100 group-hover:text-[#C2410C] dark:group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug'>
                    {chap.title || `Chương ${chap.chapterNumber}`}
                  </h3>
                  {chap.outline && (
                    <p className='text-xs text-[#57534E] dark:text-stone-400 line-clamp-3 mt-1.5 leading-relaxed'>
                      {chap.outline}
                    </p>
                  )}
                </div>
              </div>

              <div className='pt-3 border-t border-[#EBE7DF] dark:border-stone-800 flex items-center justify-between text-xs text-[#78716C] dark:text-stone-400'>
                <span className='flex items-center gap-1 font-mono text-[11px]'>
                  <Type className='w-3 h-3 text-[#C2410C]' />
                  <span>Xếp chữ &amp; thoại</span>
                </span>
                <span className='flex items-center gap-1 text-[#C2410C] dark:text-orange-400 font-bold group-hover:translate-x-0.5 transition-transform'>
                  <span>Vào bàn làm việc</span>
                  <ArrowRight className='w-3.5 h-3.5' />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='bg-[#FCFBF8] dark:bg-[#292524] rounded-2xl border border-[#D8D2C5] dark:border-stone-800 shadow-2xs overflow-hidden'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-[#F3F0E9] dark:bg-stone-900 border-b border-[#D8D2C5] dark:border-stone-800 text-[#78716C] dark:text-stone-400 font-bold uppercase tracking-wider text-[10.5px]'>
              <tr>
                <th className='py-3 px-4'>Chương</th>
                <th className='py-3 px-4'>Tiêu đề</th>
                <th className='py-3 px-4'>Trạng thái</th>
                <th className='py-3 px-4 text-right'>Hành động</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#EBE7DF] dark:divide-stone-800 text-[#1C1917] dark:text-stone-200'>
              {filteredChapters.map((chap) => (
                <tr
                  key={chap.id}
                  onClick={() => handleSelectChapter(chap.id)}
                  className='hover:bg-[#FAF8F5] dark:hover:bg-stone-800/60 transition-colors cursor-pointer group'
                >
                  <td className='py-3 px-4 font-mono font-bold text-[#C2410C] dark:text-orange-400'>
                    Chương {chap.chapterNumber}
                  </td>
                  <td className='py-3 px-4 font-medium max-w-md truncate'>
                    {chap.title || `Chương ${chap.chapterNumber}`}
                  </td>
                  <td className='py-3 px-4'>{getStatusBadge(chap)}</td>
                  <td className='py-3 px-4 text-right'>
                    <button className='inline-flex items-center gap-1 text-xs font-bold text-[#C2410C] dark:text-orange-400 group-hover:underline'>
                      <span>Mở bàn chữ</span>
                      <ArrowRight className='w-3.5 h-3.5' />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
};
