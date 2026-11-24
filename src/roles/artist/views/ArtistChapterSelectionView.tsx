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
import { PageContainer } from '@/shared/components/PageContainer';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { useTranslation } from '@/lib/i18n';

interface ArtistChapterSelectionViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

type StatusFilterType = 'all' | 'frozen' | 'in_progress' | 'approved';
type SortByType = 'chapter_asc' | 'chapter_desc' | 'newest' | 'oldest';
type ViewModeType = 'grid' | 'table';

const getOpenBlockReason = (chapter: ChapterDto, t: (key: string) => string): string | null => {
  if (String(chapter.status) === 'PreProduction') {
    return t('chapterSelection.blockPreProduction');
  }
  if (!chapter.isScriptFrozen) {
    return t('chapterSelection.blockNotFrozen');
  }
  return null;
};

const isCompletedChapter = (chapter: ChapterDto): boolean =>
  ['ChapterApproved', 'HandedOffAndPublished'].includes(String(chapter.status));

export const ArtistChapterSelectionView: React.FC<ArtistChapterSelectionViewProps> = ({
  onShowToast,
}) => {
  const { t, lang } = useTranslation('artist');
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
      const msg = err?.message || t('chapterSelection.loadError');
      setError(msg);
      onShowToast?.(t('chapterSelection.loadErrorToastTitle'), msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, onShowToast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = chapters.length;
    const frozen = chapters.filter((c) => !!c.isScriptFrozen).length;
    const approved = chapters.filter(isCompletedChapter).length;
    const inProgress = chapters.filter((c) => !c.isScriptFrozen && !isCompletedChapter(c)).length;
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
      list = list.filter((c) => !c.isScriptFrozen && !isCompletedChapter(c));
    } else if (statusFilter === 'approved') {
      list = list.filter(isCompletedChapter);
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
    const blockReason = getOpenBlockReason(chapter, t);
    if (blockReason) {
      onShowToast?.(t('chapterSelection.cannotOpenDeskTitle'), blockReason);
      return;
    }
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

  const seriesTitle = seriesDetail?.title || t('chapterSelection.seriesFallback');

  const renderStatusBadge = (chapter: ChapterDto) => {
    if (String(chapter.status) === 'ChapterApproved') {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0'>
          <CheckCircle2 className='w-3 h-3 text-emerald-600' />
          <span>{t('chapterSelection.statusApproved')}</span>
        </span>
      );
    }
    if (String(chapter.status) === 'HandedOffAndPublished') {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0'>
          <Sparkles className='w-3 h-3 text-purple-600' />
          <span>{t('chapterSelection.statusPublishedFull')}</span>
        </span>
      );
    }
    if (chapter.isScriptFrozen) {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0'>
          <Lock className='w-3 h-3 text-indigo-600' />
          <span>{t('chapterSelection.statusScriptFrozen')}</span>
          {chapter.scriptContentHash && (
            <span
              className='font-mono text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200'
              title={`SHA-256: ${chapter.scriptContentHash}`}
            >
              #{chapter.scriptContentHash.slice(0, 8)}
            </span>
          )}
        </span>
      );
    }

    switch (chapter.status) {
      case 'PreProduction':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-50 text-stone-700 border border-stone-200 shrink-0'>
            <Clock className='w-3 h-3 text-stone-500' />
            <span>{t('chapterSelection.statusPreProduction')}</span>
          </span>
        );
      case 'ChapterApproved':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0'>
            <CheckCircle2 className='w-3 h-3 text-emerald-600' />
            <span>{t('chapterSelection.statusApproved')}</span>
          </span>
        );
      case 'HandedOffAndPublished':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0'>
            <Sparkles className='w-3 h-3 text-purple-600' />
            <span>{t('chapterSelection.statusPublishedShort')}</span>
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0'>
            <Clock className='w-3 h-3 text-amber-600' />
            <span>{t('chapterSelection.statusInProduction')}</span>
          </span>
        );
    }
  };

  return (
    <PageContainer
      data-testid='artist-chapter-selection-view'
      className='space-y-6 py-6 text-[#1C1917] font-sans'
    >
      {/* 1. TOP-BAR: TIÊU ĐỀ, HƯỚNG DẪN & THỐNG KÊ NHANH (KHÔNG LẶP LẠI BREADCRUMB CỦA APPSHELL ĐỂ TRÁNH TRÙNG 2 HEADER) */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
        <div className='space-y-1.5 min-w-0'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1'>
              <Palette className='w-3 h-3' />
              <span>ARTIST PRODUCTION DESK</span>
            </span>
            <h1 className='text-xl sm:text-2xl font-bold font-serif text-[#1C1917] tracking-tight'>
              {t('chapterSelection.pageTitlePrefix', { series: seriesTitle })}
            </h1>
          </div>
          <p className='text-xs text-[#57534E] leading-relaxed max-w-3xl'>
            <strong className='text-[#1C1917] font-semibold'>
              {t('chapterSelection.subtitleHighlight')}
            </strong>
            {t('chapterSelection.subtitleBody')}
          </p>
        </div>

        {/* Khối thống kê nhanh KPI */}
        <div className='flex items-center gap-3 flex-wrap shrink-0'>
          <div
            data-testid='artist-stats-total'
            className='bg-white border border-[#D8D2C5] rounded-xl px-4 py-2.5 shadow-2xs min-w-[100px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-[#78716C]'>
              {t('chapterSelection.statsTotal')}
            </div>
            <div className='text-xl font-black text-[#1C1917] mt-0.5'>{stats.total}</div>
          </div>

          <div
            data-testid='artist-stats-frozen'
            className='bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-4 py-2.5 shadow-2xs min-w-[110px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-indigo-800 flex items-center gap-1'>
              <Lock className='w-3 h-3' />
              <span>{t('chapterSelection.statsFrozen')}</span>
            </div>
            <div className='text-xl font-black text-indigo-900 mt-0.5'>{stats.frozen}</div>
          </div>

          <div
            data-testid='artist-stats-in-progress'
            className='bg-amber-50/70 border border-amber-200/80 rounded-xl px-4 py-2.5 shadow-2xs min-w-[110px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-amber-800 flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              <span>{t('chapterSelection.statsInProgress')}</span>
            </div>
            <div className='text-xl font-black text-amber-900 mt-0.5'>{stats.inProgress}</div>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, BỘ LỌC VÀ CHUYỂN CHẾ ĐỘ XEM */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4 shadow-xs space-y-3.5'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          {/* Ô tìm kiếm */}
          <div className='relative flex-1 max-w-md'>
            <Search className='w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              data-testid='artist-chapter-search-input'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chapterSelection.searchPlaceholder')}
              className='w-full pl-9.5 pr-8 py-2 rounded-xl bg-white border border-[#D8D2C5] text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] text-xs p-1 cursor-pointer'
                title={t('chapterSelection.clearSearchTitle')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sắp xếp & Chế độ xem */}
          <div className='flex items-center gap-2.5 self-end md:self-auto'>
            {/* Bộ chọn sắp xếp */}
            <div className='flex items-center gap-1.5 bg-white border border-[#D8D2C5] rounded-xl px-2.5 py-1.5 shadow-2xs'>
              <ArrowUpDown className='w-3.5 h-3.5 text-[#78716C]' />
              <select
                aria-label={t('chapterSelection.sortAriaLabel')}
                data-testid='artist-chapter-sort-select'
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortByType)}
                className='bg-transparent text-xs font-semibold text-[#1C1917] focus:outline-none cursor-pointer'
              >
                <option value='chapter_asc'>{t('chapterSelection.sortAsc')}</option>
                <option value='chapter_desc'>{t('chapterSelection.sortDesc')}</option>
                <option value='newest'>{t('chapterSelection.sortNewest')}</option>
                <option value='oldest'>{t('chapterSelection.sortOldest')}</option>
              </select>
            </div>

            {/* Chế độ xem Lưới / Bảng */}
            <div className='flex items-center bg-[#F3F0E9] border border-[#E5E0D8] rounded-xl p-1 shadow-2xs'>
              <button
                type='button'
                data-testid='artist-view-grid'
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-semibold'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                title={t('chapterSelection.viewGridTitle')}
              >
                <LayoutGrid className='w-4 h-4' />
              </button>
              <button
                type='button'
                data-testid='artist-view-table'
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-semibold'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                title={t('chapterSelection.viewTableTitle')}
              >
                <List className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>

        {/* Các nút Tab lọc trạng thái */}
        <div className='flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#EBE7DF]'>
          <span className='text-[11px] font-bold text-[#78716C] mr-1 select-none'>
            {t('chapterSelection.filterLabel')}
          </span>

          <button
            type='button'
            data-testid='artist-filter-all'
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-white text-[#57534E] border border-[#D8D2C5] hover:bg-[#FAF8F5]'
            }`}
          >
            {t('chapterSelection.filterAll', { count: stats.total })}
          </button>

          <button
            type='button'
            data-testid='artist-filter-frozen'
            onClick={() => setStatusFilter('frozen')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'frozen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <Lock className='w-3 h-3' />
            <span>{t('chapterSelection.filterFrozen', { count: stats.frozen })}</span>
          </button>

          <button
            type='button'
            data-testid='artist-filter-in-progress'
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <Clock className='w-3 h-3' />
            <span>{t('chapterSelection.filterInProgress', { count: stats.inProgress })}</span>
          </button>

          <button
            type='button'
            data-testid='artist-filter-approved'
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className='w-3 h-3' />
            <span>{t('chapterSelection.filterApproved', { count: stats.approved })}</span>
          </button>
        </div>
      </div>

      {/* 3. VÙNG HIỂN THỊ DANH SÁCH CHƯƠNG */}
      {loading ? (
        <div
          data-testid='artist-chapters-loading'
          className='py-20 flex flex-col items-center justify-center gap-3 text-[#57534E] bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl'
        >
          <Loader2 className='w-8 h-8 animate-spin text-[#C2410C]' />
          <p className='text-xs font-semibold'>{t('chapterSelection.loadingChapters')}</p>
        </div>
      ) : error ? (
        <div
          data-testid='artist-chapters-error'
          className='py-12 px-6 rounded-2xl bg-red-50 border border-red-200 text-center max-w-lg mx-auto space-y-3'
        >
          <AlertCircle className='w-8 h-8 text-red-600 mx-auto' />
          <h3 className='text-sm font-bold text-red-900'>{t('chapterSelection.errorTitle')}</h3>
          <p className='text-xs text-red-700'>{error}</p>
          <button
            type='button'
            onClick={loadData}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs'
          >
            <RotateCcw className='w-3.5 h-3.5' />
            <span>{t('chapterSelection.retry')}</span>
          </button>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div
          data-testid='artist-chapters-empty'
          className='py-16 px-6 rounded-2xl bg-[#FCFBF8] border border-dashed border-[#D8D2C5] text-center max-w-md mx-auto space-y-3'
        >
          <div className='w-12 h-12 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] flex items-center justify-center mx-auto shadow-2xs'>
            <BookOpen className='w-6 h-6' />
          </div>
          <h3 className='text-sm font-bold font-serif text-[#1C1917]'>
            {chapters.length === 0
              ? t('chapterSelection.emptyNoChapters')
              : t('chapterSelection.emptyNotFound')}
          </h3>
          <p className='text-xs text-[#78716C] leading-relaxed'>
            {chapters.length === 0
              ? t('chapterSelection.emptyNoChaptersHint')
              : t('chapterSelection.emptyNotFoundHint')}
          </p>
          {chapters.length > 0 && (searchQuery || statusFilter !== 'all') && (
            <button
              type='button'
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D8D2C5] hover:bg-[#FAF8F5] text-xs font-semibold text-[#1C1917] transition-colors cursor-pointer'
            >
              <RotateCcw className='w-3.5 h-3.5 text-[#78716C]' />
              <span>{t('chapterSelection.clearFilters')}</span>
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
            const blockReason = getOpenBlockReason(chapter, t);
            return (
              <div
                key={chapter.id}
                data-testid={`artist-chapter-card-${chapter.chapterNumber}`}
                onClick={() => !blockReason && handleOpenArtistDesk(chapter)}
                aria-disabled={blockReason ? 'true' : undefined}
                title={blockReason || undefined}
                className={`group relative rounded-2xl p-5 bg-white border border-[#D8D2C5]/80 shadow-2xs transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  blockReason
                    ? 'cursor-not-allowed opacity-70'
                    : 'hover:border-[#F97316]/60 hover:shadow-md cursor-pointer'
                }`}
              >
                {/* Viền nhấn màu phía trên khi hover */}
                <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C2410C] to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />

                <div className='space-y-3.5'>
                  {/* Hàng Header thẻ: Huy hiệu số chương + Badge trạng thái */}
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <div className='flex items-center gap-2'>
                      <span className='px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-[#1C1917] group-hover:border-[#F97316]/40 text-xs font-black font-mono tracking-tight transition-colors'>
                        {t('chapterSelection.chapterBadgeUpper', { number: chapter.chapterNumber })}
                      </span>
                      {isFrozen && (
                        <span className='text-[10.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 inline-flex items-center gap-1'>
                          <Lock className='w-2.5 h-2.5' />
                          <span>{t('chapterSelection.frozenBadge')}</span>
                        </span>
                      )}
                    </div>
                    {renderStatusBadge(chapter)}
                  </div>

                  {/* Tiêu đề chương */}
                  <div>
                    <h3 className='text-base font-bold font-serif text-[#1C1917] group-hover:text-[#C2410C] transition-colors line-clamp-1'>
                      {chapter.title ||
                        t('chapterSelection.chapterLabel', { number: chapter.chapterNumber })}
                    </h3>
                    <p className='text-xs text-[#57534E] mt-1.5 line-clamp-2 leading-relaxed bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EBE7DF] min-h-[3.25rem]'>
                      {chapter.outline || t('chapterSelection.noOutlineLong')}
                    </p>
                  </div>

                  {/* Thông tin phụ: Số trang, phân cảnh & trạng thái sẵn sàng vẽ */}
                  <div className='pt-2 border-t border-[#EBE7DF] flex items-center justify-between text-[11px] text-[#78716C]'>
                    <div className='flex items-center gap-3'>
                      <span className='flex items-center gap-1 font-semibold text-[#1C1917]'>
                        <Layers className='w-3.5 h-3.5 text-[#78716C]' />
                        <span>
                          {t('chapterSelection.pagesCount', { count: chapter.pagesCount || 0 })}
                        </span>
                      </span>
                      <span className='flex items-center gap-1'>
                        <FileText className='w-3.5 h-3.5 text-[#A8A29E]' />
                        <span>
                          {t('chapterSelection.scenesCount', { count: chapter.scenesCount || 0 })}
                        </span>
                      </span>
                    </div>

                    {isFrozen ? (
                      <span className='font-bold text-emerald-700 flex items-center gap-1'>
                        <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                        <span>{t('chapterSelection.readyToDraw')}</span>
                      </span>
                    ) : (
                      <span className='font-medium text-amber-800 flex items-center gap-1'>
                        <Clock className='w-3 h-3 text-amber-600' />
                        <span>{t('chapterSelection.scriptNotFrozen')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Nút vào bàn vẽ ở chân thẻ */}
                <div className='mt-4 pt-3 border-t border-[#EBE7DF] flex items-center justify-between'>
                  <span className='text-[10px] text-[#78716C] font-mono'>
                    {chapter.updatedAt
                      ? t('chapterSelection.updatedAt', {
                          date: new Date(chapter.updatedAt).toLocaleDateString(
                            lang === 'en' ? 'en-US' : 'vi-VN',
                          ),
                        })
                      : t('chapterSelection.newlyCreated')}
                  </span>

                  <button
                    type='button'
                    data-testid={`artist-enter-desk-btn-${chapter.chapterNumber}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenArtistDesk(chapter);
                    }}
                    disabled={Boolean(blockReason)}
                    title={blockReason || undefined}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#C2410C] text-white text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs group-hover:translate-x-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#1C1917]'
                  >
                    <LayoutTemplate className='w-3.5 h-3.5 text-orange-400' />
                    <span>{t('chapterSelection.enterDesk')}</span>
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
          className='bg-white border border-[#D8D2C5] rounded-2xl overflow-hidden shadow-xs'
        >
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-[#FAF8F5] text-[#78716C] font-bold border-b border-[#EBE7DF] uppercase text-[10.5px] tracking-wider select-none'>
                <tr>
                  <th className='py-3.5 px-4'>{t('chapterSelection.tableColChapter')}</th>
                  <th className='py-3.5 px-4'>{t('chapterSelection.tableColTitleOutline')}</th>
                  <th className='py-3.5 px-4'>{t('chapterSelection.tableColStatus')}</th>
                  <th className='py-3.5 px-4 text-center'>{t('chapterSelection.tableColPages')}</th>
                  <th className='py-3.5 px-4 text-center'>
                    {t('chapterSelection.tableColScenes')}
                  </th>
                  <th className='py-3.5 px-4 text-right'>
                    {t('chapterSelection.tableColActions')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#EBE7DF]'>
                {filteredChapters.map((chapter) => {
                  const blockReason = getOpenBlockReason(chapter, t);
                  return (
                    <tr
                      key={chapter.id}
                      data-testid={`artist-chapter-row-${chapter.chapterNumber}`}
                      onClick={() => !blockReason && handleOpenArtistDesk(chapter)}
                      aria-disabled={blockReason ? 'true' : undefined}
                      title={blockReason || undefined}
                      className={`transition-colors group ${
                        blockReason
                          ? 'cursor-not-allowed opacity-70'
                          : 'hover:bg-[#FFF8F2] cursor-pointer'
                      }`}
                    >
                      <td className='py-3.5 px-4 whitespace-nowrap'>
                        <span className='px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-[#1C1917] font-mono font-bold text-xs group-hover:border-[#F97316]/50'>
                          {t('chapterSelection.chapterLabel', { number: chapter.chapterNumber })}
                        </span>
                      </td>
                      <td className='py-3.5 px-4 min-w-[220px] max-w-sm'>
                        <div className='font-bold font-serif text-[#1C1917] group-hover:text-[#C2410C] transition-colors truncate'>
                          {chapter.title ||
                            t('chapterSelection.chapterLabel', { number: chapter.chapterNumber })}
                        </div>
                        <div className='text-[11px] text-[#57534E] truncate mt-0.5'>
                          {chapter.outline || t('chapterSelection.noOutlineShort')}
                        </div>
                      </td>
                      <td className='py-3.5 px-4 whitespace-nowrap'>
                        {renderStatusBadge(chapter)}
                      </td>
                      <td className='py-3.5 px-4 text-center whitespace-nowrap font-bold text-[#1C1917]'>
                        {chapter.pagesCount || 0}
                      </td>
                      <td className='py-3.5 px-4 text-center whitespace-nowrap text-[#78716C] font-medium'>
                        {chapter.scenesCount || 0}
                      </td>
                      <td className='py-3.5 px-4 text-right whitespace-nowrap'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenArtistDesk(chapter);
                          }}
                          disabled={Boolean(blockReason)}
                          title={blockReason || undefined}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#C2410C] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs'
                        >
                          <LayoutTemplate className='w-3.5 h-3.5 text-orange-400' />
                          <span>{t('chapterSelection.enterDesk')}</span>
                          <ArrowRight className='w-3 h-3' />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ArtistChapterSelectionView;
