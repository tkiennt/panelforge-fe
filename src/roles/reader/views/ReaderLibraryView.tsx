import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Alert, EmptyState, Skeleton, Tabs } from '@/shared/ui';
import { catalogService, type PublicSeriesDto } from '@/services/catalog.service';
import {
  readerLibraryService,
  type LibraryList,
  type ReaderLibraryDto,
} from '@/services/readerLibrary.service';
import { useTranslation } from '@/lib/i18n';
import { SeriesCover } from '../components/SeriesCover';

type LibraryTab = 'following' | 'read-later' | 'favorites' | 'history';

interface SeriesInfo {
  id: string;
  title: string;
  studioName: string;
  coverUrl?: string | null;
}

/** Thư viện của độc giả, đồng bộ với app mobile qua /api/users/me/library. */
export const ReaderLibraryView: React.FC = () => {
  const { t, lang } = useTranslation();
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }), [lang]);
  const [tab, setTab] = useState<LibraryTab>('following');
  const [library, setLibrary] = useState<ReaderLibraryDto | null>(null);
  const [series, setSeries] = useState<Map<string, SeriesInfo>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await readerLibraryService.get();
        if (!active) return;
        setLibrary(data);
        const ids = new Set([
          ...data.readLater,
          ...data.favorites,
          ...data.following.map((f) => f.seriesId),
          ...data.history.map((h) => h.seriesId),
        ]);
        // Bộ mới nhất có sẵn trong trang đầu catalog; bộ còn lại tải chi tiết từng bộ.
        const first = await catalogService.getPublicSeries({ pageIndex: 1, pageSize: 50 });
        const found = new Map<string, SeriesInfo>();
        first.items
          .filter((s: PublicSeriesDto) => ids.has(s.id))
          .forEach((s) => found.set(s.id, s));
        const missing = [...ids].filter((id) => !found.has(id));
        const details = await Promise.allSettled(
          missing.map((id) => catalogService.getPublicSeriesDetail(id)),
        );
        details.forEach((r) => {
          if (r.status === 'fulfilled') found.set(r.value.id, r.value);
        });
        if (active) setSeries(found);
      } catch (err) {
        if (active) setError((err as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = async (list: LibraryList, seriesId: string) => {
    setError(null);
    try {
      await readerLibraryService.set(list, seriesId, false);
      setLibrary(await readerLibraryService.get());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const idsFor = (which: Exclude<LibraryTab, 'history'>): string[] =>
    !library
      ? []
      : which === 'following'
        ? library.following.map((f) => f.seriesId)
        : which === 'read-later'
          ? library.readLater
          : library.favorites;

  const tabs = [
    { id: 'following', label: t('workspace.reader.library.tabFollowing') },
    { id: 'read-later', label: t('workspace.reader.library.tabReadLater') },
    { id: 'favorites', label: t('workspace.reader.library.tabFavorites') },
    { id: 'history', label: t('workspace.reader.library.tabHistory') },
  ];

  const card = (id: string, caption?: React.ReactNode, list?: LibraryList) => {
    const info = series.get(id);
    // Bộ đã gỡ khỏi catalog (không còn chương phát hành) thì không hiện.
    if (!info) return null;
    return (
      <li key={id} className='relative'>
        <Link to={`/catalog?series=${id}`} className='group flex flex-col gap-2'>
          <SeriesCover title={info.title} coverUrl={info.coverUrl} className='shadow-xs' />
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-stone-900 group-hover:text-[#EA580C]'>
              {info.title}
            </p>
            <p className='truncate text-xs text-stone-500'>{caption ?? info.studioName}</p>
          </div>
        </Link>
        {list && (
          <button
            type='button'
            onClick={() => void remove(list, id)}
            className='absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-stone-600 shadow-xs hover:text-rose-700'
            aria-label={t('workspace.reader.library.remove', { title: info.title })}
          >
            <X className='w-4 h-4' aria-hidden='true' />
          </button>
        )}
      </li>
    );
  };

  const grid = (items: (React.ReactElement | null)[]) => {
    const shown = items.filter(Boolean);
    return shown.length === 0 ? (
      <EmptyState
        title={t('workspace.reader.library.emptyTitle')}
        description={t('workspace.reader.library.emptyDesc')}
        action={
          <Link
            to='/catalog'
            className='btn-cta-primary rounded-full px-4 py-2 text-xs font-semibold'
          >
            {t('workspace.reader.library.browse')}
          </Link>
        }
      />
    ) : (
      <ul className='grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6'>{shown}</ul>
    );
  };

  return (
    <main className='mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6'>
      <h1 className='font-serif text-2xl font-bold text-stone-900'>
        {t('workspace.reader.library.title')}
      </h1>
      <Tabs
        items={tabs}
        value={tab}
        onChange={(id) => setTab(id as LibraryTab)}
        aria-label={t('workspace.reader.library.title')}
      />
      {error && (
        <Alert tone='danger' className='text-sm'>
          {error}
        </Alert>
      )}
      {!library && !error ? (
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6'>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className='aspect-[3/4] w-full' />
          ))}
        </div>
      ) : tab === 'history' ? (
        grid(
          (library?.history ?? []).map((h) =>
            card(
              h.seriesId,
              <>
                {t('workspace.reader.library.historyCaption', {
                  number: h.chapterNumber,
                  page: h.lastPageNumber,
                  total: h.totalPages,
                })}{' '}
                · <time dateTime={h.readAt}>{dateFormat.format(new Date(h.readAt))}</time>
              </>,
            ),
          ),
        )
      ) : (
        grid(idsFor(tab).map((id) => card(id, undefined, tab)))
      )}
    </main>
  );
};
