import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Palette,
  LayoutTemplate,
  Lock,
  Clock,
  CheckCircle2,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  RotateCcw,
  BookOpen,
  Layers,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { PageHeader, StatusBadge } from '@/shared/ui';
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
    const inProgress = chapters.filter((c) => String(c.status) === 'InProduction').length;
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
      list = list.filter((c) => String(c.status) === 'InProduction');
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

  const renderChapterStatusBadge = (chapter: ChapterDto) => {
    const status = String(chapter.status);
    if (status === 'ChapterApproved' || status === 'HandedOffAndPublished') {
      return (
        <StatusBadge
          kind='chapter'
          status={status}
          label={
            status === 'ChapterApproved'
              ? t('chapterSelection.statusApproved')
              : t('chapterSelection.statusPublishedFull')
          }
        />
      );
    }
    const label =
      status === 'PreProduction'
        ? t('chapterSelection.statusPreProduction')
        : t('chapterSelection.statusInProduction');
    return <StatusBadge kind='chapter' status={status || 'InProduction'} label={label} />;
  };

  const renderScriptStatusBadge = (chapter: ChapterDto) => (
    <StatusBadge
      kind='script'
      status={chapter.isScriptFrozen ? 'Frozen' : 'Draft'}
      label={
        chapter.isScriptFrozen
          ? t('chapterSelection.statusScriptFrozen')
          : t('chapterSelection.scriptNotFrozen')
      }
    />
  );

  return (
    <PageContainer
      data-testid='artist-chapter-selection-view'
      className='space-y-6 py-6 text-stone-900 font-sans'
    >
      {/* 1. TOP-BAR: TIÊU ĐỀ, HƯỚNG DẪN & THỐNG KÊ NHANH */}
      <PageHeader
        icon={<Palette className='w-5 h-5' />}
        eyebrow={t('chapterSelection.eyebrow')}
        title={t('chapterSelection.pageTitlePrefix', { series: seriesTitle })}
        description={t('chapterSelection.subtitle')}
      />

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, BỘ LỌC VÀ CHUYỂN CHẾ ĐỘ XEM */}
      <div className='bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs space-y-3.5'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          {/* Ô tìm kiếm */}
          <div className='relative flex-1 max-w-md'>
            <Search className='w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              data-testid='artist-chapter-search-input'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chapterSelection.searchPlaceholder')}
              className='w-full pl-9.5 pr-8 py-2 rounded-xl bg-white border border-head-line text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 text-xs p-1 cursor-pointer'
                title={t('chapterSelection.clearSearchTitle')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sắp xếp & Chế độ xem */}
          <div className='flex items-center gap-2.5 self-end md:self-auto'>
            {/* Bộ chọn sắp xếp */}
            <div className='flex items-center gap-1.5 bg-white border border-head-line rounded-xl px-2.5 py-1.5 shadow-2xs'>
              <ArrowUpDown className='w-3.5 h-3.5 text-stone-500' />
              <select
                aria-label={t('chapterSelection.sortAriaLabel')}
                data-testid='artist-chapter-sort-select'
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortByType)}
                className='bg-transparent text-xs font-semibold text-stone-900 focus:outline-none cursor-pointer'
              >
                <option value='chapter_asc'>{t('chapterSelection.sortAsc')}</option>
                <option value='chapter_desc'>{t('chapterSelection.sortDesc')}</option>
                <option value='newest'>{t('chapterSelection.sortNewest')}</option>
                <option value='oldest'>{t('chapterSelection.sortOldest')}</option>
              </select>
            </div>

            {/* Chế độ xem Lưới / Bảng */}
            <div className='flex items-center bg-[#F3F0E9] border border-head-line rounded-xl p-1 shadow-2xs'>
              <button
                type='button'
                data-testid='artist-view-grid'
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#C2410C] shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-900'
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
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title={t('chapterSelection.viewTableTitle')}
              >
                <List className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>

        {/* Các nút Tab lọc trạng thái */}
        <div className='flex items-center gap-1.5 flex-wrap pt-1 border-t border-head-line'>
          <span className='text-xs font-bold text-stone-500 mr-1 select-none'>
            {t('chapterSelection.filterLabel')}
          </span>

          <button
            type='button'
            data-testid='artist-filter-all'
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-head-line hover:bg-stone-50'
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
          className='py-20 flex flex-col items-center justify-center gap-3 text-stone-500 bg-white border border-head-line rounded-2xl'
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
          className='py-16 px-6 rounded-2xl bg-head-wash border border-dashed border-head-line text-center max-w-md mx-auto space-y-3'
        >
          <div className='w-12 h-12 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] flex items-center justify-center mx-auto shadow-2xs'>
            <BookOpen className='w-6 h-6' />
          </div>
          <h3 className='text-sm font-bold font-serif text-stone-900'>
            {chapters.length === 0
              ? t('chapterSelection.emptyNoChapters')
              : t('chapterSelection.emptyNotFound')}
          </h3>
          <p className='text-xs text-stone-500 leading-relaxed'>
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
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-head-line hover:bg-stone-50 text-xs font-semibold text-stone-900 transition-colors cursor-pointer'
            >
              <RotateCcw className='w-3.5 h-3.5 text-stone-500' />
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
                className={`group relative rounded-2xl p-5 bg-white border shadow-2xs transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  blockReason
                    ? 'cursor-not-allowed border-stone-300'
                    : 'border-stone-200/80 hover:border-[#F97316]/60 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className='space-y-3.5'>
                  {/* Hàng Header thẻ: Huy hiệu số chương + Badge trạng thái */}
                  <div className='flex items-center gap-2'>
                    <span className='px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-stone-900 group-hover:border-[#F97316]/40 text-xs font-black font-mono tracking-tight transition-colors'>
                      {t('chapterSelection.chapterBadgeUpper', { number: chapter.chapterNumber })}
                    </span>
                  </div>

                  {/* Tiêu đề chương */}
                  <div>
                    <h3 className='text-base font-bold font-serif text-stone-900 group-hover:text-[#C2410C] transition-colors line-clamp-1'>
                      {chapter.title ||
                        t('chapterSelection.chapterLabel', { number: chapter.chapterNumber })}
                    </h3>
                  </div>

                  <div className='space-y-2 rounded-xl border border-stone-200 bg-[#FAF8F5] p-3 text-xs'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='font-medium text-stone-500'>
                        {t('chapterSelection.chapterStatusLabel')}
                      </span>
                      {renderChapterStatusBadge(chapter)}
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='font-medium text-stone-500'>
                        {t('chapterSelection.scriptStatusLabel')}
                      </span>
                      {renderScriptStatusBadge(chapter)}
                    </div>
                    <div className='flex items-center justify-between gap-3 border-t border-stone-200 pt-2'>
                      <span className='flex items-center gap-1 font-semibold text-stone-900'>
                        <Layers className='w-3.5 h-3.5 text-stone-500' />
                        <span>
                          {t('chapterSelection.pagesCount', { count: chapter.pagesCount || 0 })}
                        </span>
                      </span>
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

                  {blockReason && (
                    <div className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900'>
                      <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden='true' />
                      <span>{blockReason}</span>
                    </div>
                  )}
                </div>

                {/* Nút vào bàn vẽ ở chân thẻ */}
                <div className='mt-4 pt-3 border-t border-[#EBE7DF] flex items-center justify-between'>
                  <span className='text-xs text-stone-500 font-mono'>
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
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-[#C2410C] text-white text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs group-hover:translate-x-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-stone-900'
                  >
                    <LayoutTemplate className='w-3.5 h-3.5 text-orange-400' />
                    <span>{t('chapterSelection.openDesk')}</span>
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
          className='bg-white border border-head-line rounded-2xl overflow-hidden shadow-xs'
        >
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-head-wash text-kraft-ink font-bold border-b border-head-line uppercase text-xs tracking-wider select-none'>
                <tr>
                  <th className='py-3.5 px-4'>{t('chapterSelection.tableColChapter')}</th>
                  <th className='py-3.5 px-4'>{t('chapterSelection.tableColTitle')}</th>
                  <th className='py-3.5 px-4'>{t('chapterSelection.tableColChapterStatus')}</th>
                  <th className='py-3.5 px-4'>{t('chapterSelection.tableColScriptStatus')}</th>
                  <th className='py-3.5 px-4 text-center'>{t('chapterSelection.tableColPages')}</th>
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
                          ? 'cursor-not-allowed bg-stone-50'
                          : 'hover:bg-[#FFF8F2] cursor-pointer'
                      }`}
                    >
                      <td className='py-3.5 px-4 whitespace-nowrap'>
                        <span className='px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-stone-900 font-mono font-bold text-xs group-hover:border-[#F97316]/50'>
                          {t('chapterSelection.chapterLabel', { number: chapter.chapterNumber })}
                        </span>
                      </td>
                      <td className='py-3.5 px-4 min-w-[220px] max-w-sm'>
                        <div className='font-bold font-serif text-stone-900 group-hover:text-[#C2410C] transition-colors truncate'>
                          {chapter.title ||
                            t('chapterSelection.chapterLabel', { number: chapter.chapterNumber })}
                        </div>
                        {blockReason && (
                          <div className='mt-1 text-xs text-amber-800'>{blockReason}</div>
                        )}
                      </td>
                      <td className='py-3.5 px-4 whitespace-nowrap'>
                        {renderChapterStatusBadge(chapter)}
                      </td>
                      <td className='py-3.5 px-4 whitespace-nowrap'>
                        {renderScriptStatusBadge(chapter)}
                      </td>
                      <td className='py-3.5 px-4 text-center whitespace-nowrap font-bold text-stone-900'>
                        {chapter.pagesCount || 0}
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
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-[#C2410C] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs'
                        >
                          <LayoutTemplate className='w-3.5 h-3.5 text-orange-400' />
                          <span>{t('chapterSelection.openDesk')}</span>
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
