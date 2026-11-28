import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
} from 'lucide-react';
import { catalogService, PublicSeriesDetailDto, PublicSeriesDto } from '@/services/catalog.service';
import { CONTENT_LANGUAGES } from '@/services/payment.service';
import { ChapterReaderModal } from '@/shared/modals/ChapterReaderModal';
import { EmptyState, Skeleton, Tabs } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { SeriesCover } from '../components/SeriesCover';
import { SeriesDetailModal } from '../components/SeriesDetailModal';
import {
  distinctGenres,
  groupByStudio,
  groupByUpdateDay,
  isRecentlyUpdated,
  pickFeatured,
  rankByViews,
  RankingPeriod,
  sortByLatestUpdate,
  viewsInPeriod,
} from '../components/catalogSections';

type CatalogTab = 'home' | 'updates' | 'ranking' | 'browse';
const CATALOG_TABS: CatalogTab[] = ['home', 'updates', 'ranking', 'browse'];

/** Trang chủ chỉ cần một lượt tải: backend giới hạn 50 truyện/trang, xếp theo chương mới nhất. */
const HOME_FETCH_SIZE = 50;
const BROWSE_PAGE_SIZE = 24;
const HOME_ROW_SIZE = 12;
const STUDIO_ROW_SIZE = 6;
const HOME_STUDIO_LIMIT = 4;

const readSavedLanguage = (): string => {
  try {
    const saved = localStorage.getItem('preferred_reading_language');
    return saved && CONTENT_LANGUAGES.includes(saved as (typeof CONTENT_LANGUAGES)[number])
      ? saved
      : 'vi';
  } catch {
    return 'vi';
  }
};

/** Trang chủ khu độc giả (`/catalog`); header và tài khoản do `ReaderLayout` dựng. */
export const PublicCatalogView: React.FC = () => {
  const { t, lang } = useTranslation();
  const numberFormat = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const relativeFormat = useMemo(
    () => new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }),
    [lang],
  );
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }),
    [lang],
  );

  // Tab nằm trên URL (?tab=) để logo / link chia sẻ mở đúng tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as CatalogTab | null;
  const tab: CatalogTab = tabParam && CATALOG_TABS.includes(tabParam) ? tabParam : 'home';
  const setTab = useCallback(
    (next: CatalogTab) =>
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === 'home') params.delete('tab');
          else params.set('tab', next);
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
  // Mốc "bây giờ" cho nhãn thời gian, chốt lại mỗi lần tải trang chủ để render thuần.
  const [now, setNow] = useState(() => new Date());

  const [homeList, setHomeList] = useState<PublicSeriesDto[]>([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState(false);

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [browseList, setBrowseList] = useState<PublicSeriesDto[]>([]);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('week');

  const [selectedSeries, setSelectedSeries] = useState<PublicSeriesDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null);
  const [contentLang, setContentLang] = useState<string>(readSavedLanguage);

  const loadHome = useCallback(async () => {
    setHomeLoading(true);
    setHomeError(false);
    try {
      const res = await catalogService.getPublicSeries({ pageIndex: 1, pageSize: HOME_FETCH_SIZE });
      setHomeList(res.items || []);
      setNow(new Date());
    } catch {
      setHomeList([]);
      setHomeError(true);
    } finally {
      setHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useEffect(() => {
    if (tab !== 'browse') return;
    let active = true;
    setBrowseLoading(true);
    catalogService
      .getPublicSeries({
        search: appliedSearch || undefined,
        genre: genre || undefined,
        pageIndex,
        pageSize: BROWSE_PAGE_SIZE,
      })
      .then((res) => {
        if (!active) return;
        setBrowseList(res.items || []);
        setBrowseTotalPages(Math.max(1, res.totalPages || 1));
        setBrowseTotal(res.totalCount || 0);
      })
      .catch(() => {
        if (!active) return;
        setBrowseList([]);
        setBrowseTotalPages(1);
        setBrowseTotal(0);
      })
      .finally(() => {
        if (active) setBrowseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, appliedSearch, genre, pageIndex]);

  const openDetail = async (seriesId: string, language: string = contentLang) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setSelectedSeries(await catalogService.getPublicSeriesDetail(seriesId, language));
    } catch (err: any) {
      setDetailError(err?.message || t('workspace.reader.catalog.detailLoadError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const selectLanguage = (code: string) => {
    setContentLang(code);
    try {
      localStorage.setItem('preferred_reading_language', code);
    } catch {
      // Trình duyệt chặn lưu trữ: vẫn đổi ngôn ngữ cho phiên hiện tại.
    }
    if (selectedSeries) openDetail(selectedSeries.id, code);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPageIndex(1);
    setTab('browse');
  };

  const updatedAgo = (iso?: string | null): string => {
    if (!iso) return '';
    const minutes = Math.round((Date.parse(iso) - now.getTime()) / 60000);
    if (Math.abs(minutes) < 1) return t('workspace.reader.catalog.justNow');
    if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return relativeFormat.format(hours, 'hour');
    return relativeFormat.format(Math.round(hours / 24), 'day');
  };

  const dayLabel = (daysAgo: number, date: Date): string => {
    if (daysAgo === 0) return t('workspace.reader.catalog.today');
    if (daysAgo === 1) return t('workspace.reader.catalog.yesterday');
    return dayFormat.format(date);
  };

  const latestUpdates = useMemo(() => sortByLatestUpdate(homeList), [homeList]);
  const featured = useMemo(() => pickFeatured(homeList), [homeList]);
  const weeklyTop = useMemo(() => rankByViews(homeList, 'week').slice(0, 5), [homeList]);
  const ranking = useMemo(() => rankByViews(homeList, rankingPeriod), [homeList, rankingPeriod]);
  const dayGroups = useMemo(() => groupByUpdateDay(homeList, now), [homeList, now]);
  const studios = useMemo(() => groupByStudio(homeList), [homeList]);
  const genres = useMemo(() => distinctGenres(homeList), [homeList]);

  const tabs = [
    { id: 'home', label: t('workspace.reader.catalog.tabHome') },
    { id: 'updates', label: t('workspace.reader.catalog.tabUpdates') },
    { id: 'ranking', label: t('workspace.reader.catalog.tabRanking') },
    { id: 'browse', label: t('workspace.reader.catalog.tabBrowse') },
  ];

  // ─── Khối hiển thị dùng lại ─────────────────────────────────────────────

  const seriesCard = (item: PublicSeriesDto, priority = false) => (
    <button
      key={item.id}
      type='button'
      onClick={() => openDetail(item.id)}
      className='group flex flex-col gap-2 text-left'
    >
      <SeriesCover
        title={item.title}
        coverUrl={item.coverUrl}
        priority={priority}
        className='shadow-xs'
      >
        <div className='absolute left-2 top-2 flex flex-col items-start gap-1'>
          {isRecentlyUpdated(item, now) && (
            <span className='rounded bg-[#EA580C] px-1.5 py-0.5 text-xs font-bold uppercase text-white'>
              {t('workspace.reader.catalog.newBadge')}
            </span>
          )}
          {item.isCompleted && (
            <span className='rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white'>
              {t('workspace.reader.catalog.statusCompleted')}
            </span>
          )}
        </div>
      </SeriesCover>
      <div className='min-w-0'>
        <h3 className='line-clamp-2 text-sm font-bold leading-snug text-stone-900 group-hover:text-[#EA580C]'>
          {item.title}
        </h3>
        <p className='mt-0.5 truncate text-xs text-stone-500'>{item.studioName}</p>
        <p className='mt-0.5 text-xs text-stone-500'>
          {t('workspace.reader.catalog.publishedChaptersCount', {
            count: item.publishedChapterCount,
          })}
          {item.latestPublishedAt && ` · ${updatedAgo(item.latestPublishedAt)}`}
        </p>
      </div>
    </button>
  );

  const coverGrid = (items: PublicSeriesDto[], priorityCount = 0) => (
    <div className='grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'>
      {items.map((item, i) => seriesCard(item, i < priorityCount))}
    </div>
  );

  const gridSkeleton = (count: number) => (
    <div className='grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className='space-y-2'>
          <Skeleton className='aspect-[3/4] w-full rounded-lg' />
          <Skeleton height={14} className='w-4/5' />
          <Skeleton height={12} className='w-1/2' />
        </div>
      ))}
    </div>
  );

  const sectionHeader = (title: string, onSeeAll?: () => void, meta?: string) => (
    <div className='mb-4 flex items-end justify-between gap-3 border-b border-stone-200/80 pb-2'>
      <div className='min-w-0'>
        <h2 className='font-serif text-xl font-bold text-stone-900'>{title}</h2>
        {meta && <p className='mt-0.5 text-xs text-stone-500'>{meta}</p>}
      </div>
      {onSeeAll && (
        <button
          type='button'
          onClick={onSeeAll}
          className='inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#EA580C] hover:underline'
        >
          {t('workspace.reader.catalog.seeAll')}
          <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
        </button>
      )}
    </div>
  );

  const rankRow = (item: PublicSeriesDto, rank: number, period: RankingPeriod, compact = false) => (
    <li key={item.id}>
      <button
        type='button'
        onClick={() => openDetail(item.id)}
        className='group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#FAF9F5]'
      >
        <span
          className={`w-7 shrink-0 text-center font-serif text-xl font-bold ${
            rank <= 3 ? 'text-[#EA580C]' : 'text-stone-400'
          }`}
        >
          {rank}
        </span>
        <SeriesCover
          title={item.title}
          coverUrl={item.coverUrl}
          className={compact ? 'w-11 shrink-0' : 'w-14 shrink-0'}
        />
        <div className='min-w-0 flex-1'>
          <p className='line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-[#EA580C]'>
            {item.title}
          </p>
          <p className='truncate text-xs text-stone-500'>
            {item.studioName}
            {!compact && ` · ${item.genre}`}
          </p>
        </div>
        <span className='inline-flex shrink-0 items-center gap-1 text-xs text-stone-500'>
          <Eye className='w-3.5 h-3.5' aria-hidden='true' />
          {numberFormat.format(viewsInPeriod(item, period))}
        </span>
      </button>
    </li>
  );

  const catalogEmpty = (
    <EmptyState
      icon={<BookOpen />}
      title={t('workspace.reader.catalog.emptyTitle')}
      description={t('workspace.reader.catalog.emptyDesc')}
      action={
        homeError ? (
          <button
            type='button'
            onClick={loadHome}
            className='btn-cta-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold'
          >
            <RefreshCw className='w-3.5 h-3.5' aria-hidden='true' />
            {t('workspace.reader.catalog.retry')}
          </button>
        ) : undefined
      }
    />
  );

  // ─── Các tab ────────────────────────────────────────────────────────────

  const homeTab = () => {
    if (homeLoading) {
      return (
        <div className='space-y-10'>
          <Skeleton className='h-72 w-full rounded-2xl' />
          {gridSkeleton(6)}
        </div>
      );
    }
    if (homeList.length === 0 || !featured) return catalogEmpty;

    return (
      <div className='space-y-12'>
        <div className='grid gap-6 lg:grid-cols-3'>
          <article className='flex flex-col gap-5 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:flex-row lg:col-span-2'>
            <button
              type='button'
              onClick={() => openDetail(featured.id)}
              className='group w-40 shrink-0 self-start sm:w-48'
              aria-label={featured.title}
            >
              <SeriesCover title={featured.title} coverUrl={featured.coverUrl} priority />
            </button>
            <div className='flex min-w-0 flex-1 flex-col'>
              <span className='text-xs font-semibold uppercase tracking-wide text-[#EA580C]'>
                {t('workspace.reader.catalog.featuredLabel')}
              </span>
              <h2 className='mt-1 font-serif text-2xl font-bold leading-tight text-stone-900 sm:text-3xl'>
                {featured.title}
              </h2>
              <p className='mt-1 text-xs text-stone-500'>
                {featured.studioName} · {featured.genre} · {featured.format}
              </p>
              <p className='mt-3 line-clamp-4 text-sm leading-relaxed text-stone-700'>
                {featured.synopsis || t('workspace.reader.catalog.noSynopsis')}
              </p>
              <div className='mt-auto flex flex-wrap items-center gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => openDetail(featured.id)}
                  className='btn-cta-primary rounded-full px-5 py-2 text-xs font-semibold'
                >
                  {t('workspace.reader.catalog.viewSeries')}
                </button>
                <span className='text-xs text-stone-500'>
                  {t('workspace.reader.catalog.publishedChaptersCount', {
                    count: featured.publishedChapterCount,
                  })}
                  {featured.latestPublishedAt && ` · ${updatedAgo(featured.latestPublishedAt)}`}
                </span>
              </div>
            </div>
          </article>

          <aside className='rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs'>
            <div className='mb-2 flex items-center justify-between px-2'>
              <h2 className='font-serif text-lg font-bold text-stone-900'>
                {t('workspace.reader.catalog.weeklyTop')}
              </h2>
              <button
                type='button'
                onClick={() => setTab('ranking')}
                className='text-xs font-semibold text-[#EA580C] hover:underline'
              >
                {t('workspace.reader.catalog.seeAll')}
              </button>
            </div>
            <ol>{weeklyTop.map((item, i) => rankRow(item, i + 1, 'week', true))}</ol>
          </aside>
        </div>

        <section>
          {sectionHeader(t('workspace.reader.catalog.latestUpdates'), () => setTab('updates'))}
          {coverGrid(latestUpdates.slice(0, HOME_ROW_SIZE), 6)}
        </section>

        <section className='space-y-10'>
          <div>
            <h2 className='font-serif text-2xl font-bold text-stone-900'>
              {t('workspace.reader.catalog.studiosHeading')}
            </h2>
            <p className='mt-1 text-xs text-stone-500'>
              {t('workspace.reader.catalog.studiosDesc', { count: studios.length })}
            </p>
          </div>
          {studios.slice(0, HOME_STUDIO_LIMIT).map((studio) => (
            <div key={studio.studioName}>
              {sectionHeader(
                studio.studioName || t('workspace.reader.catalog.unknownStudio'),
                studio.items.length > STUDIO_ROW_SIZE ? () => setTab('browse') : undefined,
                t('workspace.reader.catalog.seriesCount', { count: studio.items.length }),
              )}
              {coverGrid(studio.items.slice(0, STUDIO_ROW_SIZE))}
            </div>
          ))}
        </section>
      </div>
    );
  };

  const updatesTab = () => {
    if (homeLoading) return gridSkeleton(12);
    if (dayGroups.length === 0) return catalogEmpty;
    return (
      <div className='space-y-10'>
        {dayGroups.map((group) => (
          <section key={group.daysAgo}>
            {sectionHeader(
              dayLabel(group.daysAgo, group.date),
              undefined,
              t('workspace.reader.catalog.seriesCount', { count: group.items.length }),
            )}
            <ul className='grid gap-3 md:grid-cols-2'>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type='button'
                    onClick={() => openDetail(item.id)}
                    className='group flex w-full gap-4 rounded-xl border border-stone-200/80 bg-white p-3 text-left shadow-xs hover:border-orange-300'
                  >
                    <SeriesCover
                      title={item.title}
                      coverUrl={item.coverUrl}
                      className='w-20 shrink-0'
                    />
                    <div className='min-w-0 flex-1 py-0.5'>
                      <div className='flex items-start justify-between gap-2'>
                        <h3 className='line-clamp-2 text-sm font-bold text-stone-900 group-hover:text-[#EA580C]'>
                          {item.title}
                        </h3>
                        {isRecentlyUpdated(item, now) && (
                          <span className='shrink-0 rounded bg-[#EA580C] px-1.5 py-0.5 text-xs font-bold uppercase text-white'>
                            {t('workspace.reader.catalog.newBadge')}
                          </span>
                        )}
                      </div>
                      <p className='mt-1 truncate text-xs text-stone-500'>
                        {item.studioName} · {item.genre}
                      </p>
                      <p className='mt-2 line-clamp-2 text-xs leading-relaxed text-stone-600'>
                        {item.synopsis || t('workspace.reader.catalog.noSynopsis')}
                      </p>
                      <p className='mt-2 text-xs font-medium text-stone-700'>
                        {t('workspace.reader.catalog.chapterUpTo', {
                          count: item.publishedChapterCount,
                        })}
                        <span className='font-normal text-stone-500'>
                          {' · '}
                          {updatedAgo(item.latestPublishedAt)}
                        </span>
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  };

  const rankingTab = () => {
    const periods: { id: RankingPeriod; label: string }[] = [
      { id: 'day', label: t('workspace.reader.catalog.periodDay') },
      { id: 'week', label: t('workspace.reader.catalog.periodWeek') },
      { id: 'month', label: t('workspace.reader.catalog.periodMonth') },
    ];
    return (
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-xs text-stone-500'>{t('workspace.reader.catalog.rankingDesc')}</p>
          <div
            role='group'
            aria-label={t('workspace.reader.catalog.tabRanking')}
            className='inline-flex rounded-full border border-stone-200 bg-white p-0.5'
          >
            {periods.map((p) => (
              <button
                key={p.id}
                type='button'
                aria-pressed={rankingPeriod === p.id}
                onClick={() => setRankingPeriod(p.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  rankingPeriod === p.id
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {homeLoading ? (
          <Skeleton className='h-96 w-full rounded-2xl' />
        ) : ranking.length === 0 ? (
          catalogEmpty
        ) : (
          <ol className='grid gap-x-6 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xs md:grid-cols-2'>
            {ranking.map((item, i) => rankRow(item, i + 1, rankingPeriod))}
          </ol>
        )}
      </div>
    );
  };

  const browseTab = () => (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-2'>
        {['', ...genres].map((g) => (
          <button
            key={g || 'all'}
            type='button'
            aria-pressed={genre === g}
            onClick={() => {
              setGenre(g);
              setPageIndex(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              genre === g
                ? 'border border-orange-300 bg-orange-50 text-[#C2410C]'
                : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            {g || t('workspace.reader.catalog.genreAll')}
          </button>
        ))}
      </div>
      {appliedSearch && (
        <p className='text-xs text-stone-600'>
          {t('workspace.reader.catalog.searchResult', {
            count: browseTotal,
            query: appliedSearch,
          })}
        </p>
      )}
      {browseLoading ? (
        gridSkeleton(12)
      ) : browseList.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title={t('workspace.reader.catalog.noResultTitle')}
          description={t('workspace.reader.catalog.noResultDesc')}
        />
      ) : (
        coverGrid(browseList)
      )}
      {browseTotalPages > 1 && (
        <nav
          className='flex items-center justify-center gap-3'
          aria-label={t('workspace.reader.catalog.pagination')}
        >
          <button
            type='button'
            disabled={pageIndex <= 1 || browseLoading}
            onClick={() => setPageIndex((p) => p - 1)}
            aria-label={t('workspace.reader.catalog.prevPage')}
            className='grid size-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-700 disabled:opacity-40'
          >
            <ChevronLeft className='w-4 h-4' />
          </button>
          <span className='text-xs text-stone-600'>
            {t('workspace.reader.catalog.pageOf', { page: pageIndex, total: browseTotalPages })}
          </span>
          <button
            type='button'
            disabled={pageIndex >= browseTotalPages || browseLoading}
            onClick={() => setPageIndex((p) => p + 1)}
            aria-label={t('workspace.reader.catalog.nextPage')}
            className='grid size-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-700 disabled:opacity-40'
          >
            <ChevronRight className='w-4 h-4' />
          </button>
        </nav>
      )}
    </div>
  );

  return (
    <>
      <div className='sticky top-14 z-20 border-b border-stone-200/80 bg-white'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 px-4 sm:px-6'>
          <Tabs
            items={tabs}
            value={tab}
            onChange={(id) => setTab(id as CatalogTab)}
            aria-label={t('workspace.reader.catalog.tabsLabel')}
            className='min-w-0 flex-1 border-b-0'
          />
          <form onSubmit={submitSearch} className='relative w-full py-2 sm:w-64' role='search'>
            <Search
              className='pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-stone-400'
              aria-hidden='true'
            />
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('workspace.reader.catalog.searchPlaceholder')}
              aria-label={t('workspace.reader.catalog.searchPlaceholder')}
              className='w-full rounded-full border border-stone-200 bg-[#FAF9F5] py-2 pl-9 pr-3 text-xs placeholder:text-stone-400 focus:border-orange-400 focus:outline-none'
            />
          </form>
        </div>
      </div>

      <main className='mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6'>
        {tab === 'home' && homeTab()}
        {tab === 'updates' && updatesTab()}
        {tab === 'ranking' && rankingTab()}
        {tab === 'browse' && browseTab()}
      </main>

      <SeriesDetailModal
        series={selectedSeries}
        loading={detailLoading}
        error={detailError}
        activeLanguage={contentLang}
        onSelectLanguage={selectLanguage}
        onReadChapter={setReadingChapterId}
        onClose={() => setSelectedSeries(null)}
      />

      {readingChapterId && (
        <ChapterReaderModal
          isOpen={!!readingChapterId}
          chapterId={readingChapterId}
          initialLanguage={selectedSeries?.language || contentLang}
          onClose={() => setReadingChapterId(null)}
        />
      )}
    </>
  );
};
