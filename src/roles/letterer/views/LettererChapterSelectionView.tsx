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
import { useTranslation } from '@/lib/i18n';

interface LettererChapterSelectionViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

type StatusFilterType = 'all' | 'frozen' | 'in_progress' | 'approved';
type SortByType = 'chapter_asc' | 'chapter_desc' | 'newest' | 'oldest';
type ViewModeType = 'grid' | 'table';

const getOpenBlockReason = (
  chapter: ChapterDto,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null => {
  if (String(chapter.status) === 'PreProduction') {
    return t('production.lettering.chapterSelection.blockPreProduction');
  }
  if (!chapter.isScriptFrozen) {
    return t('production.lettering.chapterSelection.blockNotFrozen');
  }
  return null;
};

const isCompletedChapter = (chapter: ChapterDto): boolean =>
  ['ChapterApproved', 'HandedOffAndPublished'].includes(String(chapter.status));

export const LettererChapterSelectionView: React.FC<LettererChapterSelectionViewProps> = ({
  onShowToast,
}) => {
  const { t } = useTranslation();
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
      const msg = err.message || t('production.lettering.chapterSelection.loadError');
      setError(msg);
      onShowToast?.(t('production.lettering.chapterSelection.loadErrorTitle'), msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, onShowToast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick stats
  const stats = useMemo(() => {
    const total = chapters.length;
    const frozen = chapters.filter((c) => !!c.isScriptFrozen).length;
    const approved = chapters.filter(isCompletedChapter).length;
    const inProgress = chapters.filter((c) => !c.isScriptFrozen && !isCompletedChapter(c)).length;
    return { total, frozen, approved, inProgress };
  }, [chapters]);

  // Filter & Sort
  const filteredChapters = useMemo(() => {
    let list = [...chapters];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const chapterWord = t('production.lettering.chapterSelection.chapterWord').toLowerCase();
      list = list.filter((chap) => {
        const matchNum =
          String(chap.chapterNumber).includes(q) ||
          `${chapterWord} ${chap.chapterNumber}`.includes(q);
        const matchTitle = (chap.title || '').toLowerCase().includes(q);
        const matchOutline = (chap.outline || '').toLowerCase().includes(q);
        return matchNum || matchTitle || matchOutline;
      });
    }

    if (statusFilter === 'frozen') {
      list = list.filter((c) => !!c.isScriptFrozen);
    } else if (statusFilter === 'in_progress') {
      list = list.filter((c) => !c.isScriptFrozen && !isCompletedChapter(c));
    } else if (statusFilter === 'approved') {
      list = list.filter(isCompletedChapter);
    }

    list.sort((a, b) => {
      if (sortBy === 'chapter_asc') return a.chapterNumber - b.chapterNumber;
      if (sortBy === 'chapter_desc') return b.chapterNumber - a.chapterNumber;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [chapters, searchQuery, statusFilter, sortBy, t]);

  const seriesTitle =
    seriesDetail?.title || t('production.lettering.chapterSelection.defaultSeriesTitle');

  const handleSelectChapter = (chapter: ChapterDto) => {
    if (!workspaceId || !seriesId) return;
    const blockReason = getOpenBlockReason(chapter, t);
    if (blockReason) {
      onShowToast?.(t('production.lettering.chapterSelection.cannotOpenTitle'), blockReason);
      return;
    }
    navigate(
      `/workspaces/${workspaceId}/series/${seriesId}/artist/desk?chapterId=${chapter.id}&tab=lettering`,
    );
  };

  const getStatusBadge = (chapter: ChapterDto) => {
    if (String(chapter.status) === 'ChapterApproved') {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0'>
          <CheckCircle2 className='w-3 h-3 text-emerald-600' />
          <span>{t('production.lettering.chapterSelection.statusApproved')}</span>
        </span>
      );
    }
    if (String(chapter.status) === 'HandedOffAndPublished') {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0'>
          <Sparkles className='w-3 h-3 text-purple-600' />
          <span>{t('production.lettering.chapterSelection.statusPublishedFull')}</span>
        </span>
      );
    }
    if (chapter.isScriptFrozen) {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0'>
          <Lock className='w-3 h-3 text-indigo-600' />
          <span>{t('production.lettering.chapterSelection.statusFrozen')}</span>
        </span>
      );
    }

    switch (chapter.status) {
      case 'PreProduction':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-50 text-stone-700 border border-stone-200 shrink-0'>
            <Clock className='w-3 h-3 text-stone-500' />
            <span>{t('production.lettering.chapterSelection.statusPreProduction')}</span>
          </span>
        );
      case 'ChapterApproved':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0'>
            <CheckCircle2 className='w-3 h-3 text-emerald-600' />
            <span>{t('production.lettering.chapterSelection.statusApproved')}</span>
          </span>
        );
      case 'HandedOffAndPublished':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0'>
            <Sparkles className='w-3 h-3 text-purple-600' />
            <span>{t('production.lettering.chapterSelection.statusPublished')}</span>
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0'>
            <Clock className='w-3 h-3 text-amber-600' />
            <span>{t('production.lettering.chapterSelection.statusInProduction')}</span>
          </span>
        );
    }
  };

  return (
    <PageContainer
      data-testid='letterer-chapter-selection-view'
      className='space-y-6 py-6 text-[#1C1917] font-sans'
    >
      {/* 1. TOP-BAR: TIÊU ĐỀ & THỐNG KÊ NHANH (KHÔNG LẶP LẠI BREADCRUMB CỦA APPSHELL) */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
        <div className='space-y-1.5 min-w-0'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1'>
              <Type className='w-3 h-3' />
              <span>LETTERING PRODUCTION DESK</span>
            </span>
            <h1 className='text-xl sm:text-2xl font-bold font-serif text-[#1C1917] tracking-tight'>
              {t('production.lettering.chapterSelection.heading', { series: seriesTitle })}
            </h1>
          </div>
          <p className='text-xs text-[#57534E] leading-relaxed max-w-3xl'>
            <strong className='text-[#1C1917] font-semibold'>
              {t('production.lettering.chapterSelection.subHeadingStrong')}
            </strong>{' '}
            {t('production.lettering.chapterSelection.subHeadingDesc')}
          </p>
        </div>

        {/* Khối thống kê nhanh KPI */}
        <div className='flex items-center gap-3 flex-wrap shrink-0'>
          <div
            data-testid='letterer-stats-total'
            className='bg-white border border-[#D8D2C5] rounded-xl px-4 py-2.5 shadow-2xs min-w-[100px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-[#78716C]'>
              {t('production.lettering.chapterSelection.statsTotal')}
            </div>
            <div className='text-xl font-black text-[#1C1917] mt-0.5'>{stats.total}</div>
          </div>

          <div
            data-testid='letterer-stats-progress'
            className='bg-amber-50/70 border border-amber-200/80 rounded-xl px-4 py-2.5 shadow-2xs min-w-[100px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-amber-800'>
              {t('production.lettering.chapterSelection.statsInProgress')}
            </div>
            <div className='text-xl font-black text-amber-900 mt-0.5'>{stats.inProgress}</div>
          </div>

          <div
            data-testid='letterer-stats-frozen'
            className='bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-4 py-2.5 shadow-2xs min-w-[100px]'
          >
            <div className='text-[10.5px] uppercase font-bold tracking-wider text-indigo-800'>
              {t('production.lettering.chapterSelection.statsFrozen')}
            </div>
            <div className='text-xl font-black text-indigo-900 mt-0.5'>{stats.frozen}</div>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, BỘ LỌC VÀ CHUYỂN DẠNG HIỂN THỊ */}
      <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FCFBF8] p-3.5 rounded-2xl border border-[#D8D2C5] shadow-2xs'>
        <div className='flex-1 flex items-center gap-2.5 bg-white border border-[#D8D2C5] rounded-xl px-3.5 py-2 focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/15 transition-all shadow-inner'>
          <Search className='w-4 h-4 text-[#78716C] shrink-0' />
          <input
            type='text'
            data-testid='letterer-chapter-search-input'
            placeholder={t('production.lettering.chapterSelection.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent text-xs text-[#1C1917] placeholder-[#A8A29E] outline-none'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='text-[#78716C] hover:text-[#1C1917] text-xs font-bold px-1 cursor-pointer'
            >
              ✕
            </button>
          )}
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          <div className='flex items-center bg-[#F3F0E9] p-1 rounded-xl border border-[#D8D2C5] text-xs'>
            {(
              [
                { id: 'all', label: t('production.lettering.chapterSelection.filterAll') },
                { id: 'frozen', label: t('production.lettering.chapterSelection.filterFrozen') },
                {
                  id: 'in_progress',
                  label: t('production.lettering.chapterSelection.filterInProgress'),
                },
                {
                  id: 'approved',
                  label: t('production.lettering.chapterSelection.filterApproved'),
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#C2410C] font-bold shadow-2xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className='flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#D8D2C5] text-xs'>
            <ArrowUpDown className='w-3.5 h-3.5 text-[#78716C]' />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByType)}
              className='bg-transparent text-xs font-medium text-[#1C1917] outline-none cursor-pointer'
            >
              <option value='chapter_asc'>
                {t('production.lettering.chapterSelection.sortChapterAsc')}
              </option>
              <option value='chapter_desc'>
                {t('production.lettering.chapterSelection.sortChapterDesc')}
              </option>
              <option value='newest'>
                {t('production.lettering.chapterSelection.sortNewest')}
              </option>
              <option value='oldest'>
                {t('production.lettering.chapterSelection.sortOldest')}
              </option>
            </select>
          </div>

          <div className='flex items-center bg-[#F3F0E9] p-1 rounded-xl border border-[#D8D2C5]'>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#C2410C] shadow-2xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
              title={t('production.lettering.chapterSelection.viewGridTitle')}
            >
              <LayoutGrid className='w-4 h-4' />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#C2410C] shadow-2xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
              title={t('production.lettering.chapterSelection.viewTableTitle')}
            >
              <List className='w-4 h-4' />
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className='p-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#D8D2C5] text-[#57534E] hover:text-[#1C1917] transition-colors shadow-2xs cursor-pointer'
            title={t('production.lettering.chapterSelection.reloadTitle')}
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C2410C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH: DANH SÁCH CHƯƠNG */}
      {loading ? (
        <div className='bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] p-16 flex flex-col items-center justify-center gap-3 shadow-xs'>
          <Loader2 className='w-8 h-8 text-[#C2410C] animate-spin' />
          <span className='text-xs font-semibold text-[#78716C]'>
            {t('production.lettering.chapterSelection.loading')}
          </span>
        </div>
      ) : error ? (
        <div className='bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center text-center gap-3'>
          <AlertCircle className='w-8 h-8 text-red-600' />
          <p className='text-sm font-bold text-red-900'>{error}</p>
          <button
            onClick={loadData}
            className='px-4 py-2 bg-white border border-red-300 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 shadow-xs cursor-pointer'
          >
            {t('production.lettering.chapterSelection.retry')}
          </button>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div className='bg-[#FCFBF8] rounded-2xl border border-dashed border-[#D8D2C5] p-12 text-center flex flex-col items-center gap-3'>
          <div className='w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#C2410C]'>
            <Type className='w-6 h-6' />
          </div>
          <h3 className='text-sm font-bold font-serif text-[#1C1917]'>
            {searchQuery || statusFilter !== 'all'
              ? t('production.lettering.chapterSelection.emptyFilteredTitle')
              : t('production.lettering.chapterSelection.emptySeriesTitle')}
          </h3>
          <p className='text-xs text-[#78716C] max-w-sm'>
            {searchQuery || statusFilter !== 'all'
              ? t('production.lettering.chapterSelection.emptyFilteredDesc')
              : t('production.lettering.chapterSelection.emptySeriesDesc')}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {filteredChapters.map((chap) => {
            const blockReason = getOpenBlockReason(chap, t);
            return (
              <div
                key={chap.id}
                data-testid={`letterer-chapter-card-${chap.chapterNumber}`}
                onClick={() => !blockReason && handleSelectChapter(chap)}
                aria-disabled={blockReason ? 'true' : undefined}
                title={blockReason || undefined}
                className={`group bg-white border border-[#D8D2C5]/80 rounded-2xl p-5 shadow-2xs transition-all duration-200 flex flex-col justify-between gap-4 ${
                  blockReason
                    ? 'cursor-not-allowed opacity-70'
                    : 'hover:border-[#F97316]/60 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className='space-y-3'>
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <span className='font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-[#1C1917] group-hover:border-[#F97316]/50 transition-colors'>
                      {t('production.lettering.chapterSelection.chapterBadge', {
                        number: chap.chapterNumber,
                      })}
                    </span>
                    {getStatusBadge(chap)}
                  </div>

                  <div>
                    <h3 className='text-sm font-bold font-serif text-[#1C1917] group-hover:text-[#C2410C] transition-colors line-clamp-2 leading-snug'>
                      {chap.title ||
                        t('production.lettering.chapterSelection.chapterNumber', {
                          number: chap.chapterNumber,
                        })}
                    </h3>
                    {chap.outline && (
                      <p className='text-xs text-[#57534E] line-clamp-3 mt-1.5 leading-relaxed bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EBE7DF]'>
                        {chap.outline}
                      </p>
                    )}
                  </div>
                </div>

                <div className='pt-3 border-t border-[#EBE7DF] flex items-center justify-between text-xs text-[#78716C]'>
                  <span className='flex items-center gap-1 font-mono text-[11px]'>
                    <Type className='w-3 h-3 text-[#C2410C]' />
                    <span>{t('production.lettering.chapterSelection.cardTag')}</span>
                  </span>
                  <span className='flex items-center gap-1 text-[#C2410C] font-bold group-hover:translate-x-0.5 transition-transform'>
                    <span>{t('production.lettering.chapterSelection.enterDesk')}</span>
                    <ArrowRight className='w-3.5 h-3.5' />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className='bg-white rounded-2xl border border-[#D8D2C5] shadow-2xs overflow-hidden'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-[#FAF8F5] border-b border-[#EBE7DF] text-[#78716C] font-bold uppercase tracking-wider text-[10.5px]'>
              <tr>
                <th className='py-3 px-4'>
                  {t('production.lettering.chapterSelection.colChapter')}
                </th>
                <th className='py-3 px-4'>{t('production.lettering.chapterSelection.colTitle')}</th>
                <th className='py-3 px-4'>
                  {t('production.lettering.chapterSelection.colStatus')}
                </th>
                <th className='py-3 px-4 text-right'>
                  {t('production.lettering.chapterSelection.colAction')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#EBE7DF] text-[#1C1917]'>
              {filteredChapters.map((chap) => {
                const blockReason = getOpenBlockReason(chap, t);
                return (
                  <tr
                    key={chap.id}
                    onClick={() => !blockReason && handleSelectChapter(chap)}
                    aria-disabled={blockReason ? 'true' : undefined}
                    title={blockReason || undefined}
                    className={`transition-colors group ${
                      blockReason
                        ? 'cursor-not-allowed opacity-70'
                        : 'hover:bg-[#FFF8F2] cursor-pointer'
                    }`}
                  >
                    <td className='py-3 px-4 font-mono font-bold text-[#C2410C]'>
                      {t('production.lettering.chapterSelection.chapterNumber', {
                        number: chap.chapterNumber,
                      })}
                    </td>
                    <td className='py-3 px-4 font-bold font-serif max-w-md truncate group-hover:text-[#C2410C]'>
                      {chap.title ||
                        t('production.lettering.chapterSelection.chapterNumber', {
                          number: chap.chapterNumber,
                        })}
                    </td>
                    <td className='py-3 px-4'>{getStatusBadge(chap)}</td>
                    <td className='py-3 px-4 text-right'>
                      <button
                        type='button'
                        disabled={Boolean(blockReason)}
                        title={blockReason || undefined}
                        className='inline-flex items-center gap-1 text-xs font-bold text-[#C2410C] group-hover:underline disabled:cursor-not-allowed disabled:text-[#A8A29E] disabled:no-underline'
                      >
                        <span>{t('production.lettering.chapterSelection.openDesk')}</span>
                        <ArrowRight className='w-3.5 h-3.5' />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
};
