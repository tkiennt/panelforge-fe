import React, { useMemo, useState } from 'react';
import { ArrowDownUp, BookOpen, Eye, Globe, Lock, RefreshCw, Star, Unlock } from 'lucide-react';
import {
  PublicChapterDto,
  PublicSeriesDetailDto,
  resolveCatalogImageUrl,
} from '@/services/catalog.service';
import { formatContentLanguageName } from '@/shared/lib/multilingual';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { SeriesCover } from './SeriesCover';

interface SeriesDetailModalProps {
  series: PublicSeriesDetailDto | null;
  loading: boolean;
  error: string | null;
  activeLanguage: string;
  onSelectLanguage: (code: string) => void;
  onReadChapter: (chapterId: string) => void;
  onClose: () => void;
}

type ChapterOrder = 'newest' | 'oldest';

export const SeriesDetailModal: React.FC<SeriesDetailModalProps> = ({
  series,
  loading,
  error,
  activeLanguage,
  onSelectLanguage,
  onReadChapter,
  onClose,
}) => {
  const { t, lang } = useTranslation();
  const [order, setOrder] = useState<ChapterOrder>('newest');
  const numberFormat = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const priceFormat = useMemo(
    () =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
    [lang],
  );
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }), [lang]);

  const currentLanguage = series?.language || activeLanguage;

  // BR-34 / D9b: chỉ cho chọn các ngôn ngữ đã phát hành ở ít nhất một chương.
  const publishedLanguages = useMemo(() => {
    const codes = new Set<string>();
    series?.chapters.forEach((c) => c.languages?.forEach((l) => codes.add(l.language)));
    return [...codes];
  }, [series]);

  const chaptersAsc = useMemo(
    () => [...(series?.chapters ?? [])].sort((a, b) => a.chapterNumber - b.chapterNumber),
    [series],
  );
  const chapters = order === 'oldest' ? chaptersAsc : [...chaptersAsc].reverse();
  const firstChapter = chaptersAsc[0];
  const latestChapter = chaptersAsc[chaptersAsc.length - 1];

  const accessBadge = (chap: PublicChapterDto) => {
    if (chap.isFree !== false) {
      return (
        <span className='rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700'>
          {t('workspace.reader.catalog.free')}
        </span>
      );
    }
    if (chap.isUnlocked) {
      return (
        <span className='inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700'>
          <Unlock className='w-3.5 h-3.5' aria-hidden='true' />
          {t('workspace.reader.catalog.unlocked')}
        </span>
      );
    }
    return (
      <span className='inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800'>
        <Lock className='w-3.5 h-3.5' aria-hidden='true' />
        {priceFormat.format(chap.priceVnd ?? 0)}
      </span>
    );
  };

  return (
    <Modal
      isOpen={!!series}
      onClose={onClose}
      size='xl'
      title={series?.title ?? ''}
      description={series ? `${series.studioName} · ${series.genre} · ${series.format}` : undefined}
      closeLabel={t('workspace.reader.catalog.close')}
    >
      {series && (
        <div className='space-y-5'>
          <div className='flex flex-col gap-5 sm:flex-row'>
            <SeriesCover
              title={series.title}
              coverUrl={series.coverUrl}
              priority
              className='w-36 shrink-0 self-start shadow-xs sm:w-44'
            />
            <div className='min-w-0 flex-1 space-y-3'>
              <div className='flex flex-wrap items-center gap-2 text-xs text-stone-600'>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-medium ${
                    series.isCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                  }`}
                >
                  {series.isCompleted
                    ? t('workspace.reader.catalog.statusCompleted')
                    : t('workspace.reader.catalog.statusOngoing')}
                </span>
                <span className='inline-flex items-center gap-1'>
                  <BookOpen className='w-3.5 h-3.5' aria-hidden='true' />
                  {t('workspace.reader.catalog.publishedChaptersCount', {
                    count: series.chapters.length,
                  })}
                </span>
                {(series.viewCount ?? 0) > 0 && (
                  <span className='inline-flex items-center gap-1'>
                    <Eye className='w-3.5 h-3.5' aria-hidden='true' />
                    {t('workspace.reader.catalog.viewsCount', {
                      count: numberFormat.format(series.viewCount ?? 0),
                    })}
                  </span>
                )}
                {(series.ratingCount ?? 0) > 0 && (
                  <span className='inline-flex items-center gap-1'>
                    <Star className='w-3.5 h-3.5 text-amber-500' aria-hidden='true' />
                    {t('workspace.reader.catalog.ratingSummary', {
                      average: (series.ratingAverage ?? 0).toFixed(1),
                      count: numberFormat.format(series.ratingCount ?? 0),
                    })}
                  </span>
                )}
              </div>

              <p className='text-sm leading-relaxed text-stone-700'>
                {series.synopsis || t('workspace.reader.catalog.noSynopsisShort')}
              </p>

              {firstChapter && (
                <div className='flex flex-wrap gap-2'>
                  <button
                    type='button'
                    onClick={() => onReadChapter(firstChapter.id)}
                    className='btn-cta-primary rounded-full px-4 py-2 text-xs font-semibold'
                  >
                    {t('workspace.reader.catalog.readFirst')}
                  </button>
                  {latestChapter && latestChapter.id !== firstChapter.id && (
                    <button
                      type='button'
                      onClick={() => onReadChapter(latestChapter.id)}
                      className='rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50'
                    >
                      {t('workspace.reader.catalog.readLatest', {
                        number: latestChapter.chapterNumber,
                      })}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {publishedLanguages.length > 1 && (
            <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200/80 bg-[#FAF9F5] px-3 py-2'>
              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-stone-600'>
                <Globe className='w-3.5 h-3.5 text-[#EA580C]' aria-hidden='true' />
                {t('workspace.reader.catalog.contentLanguage')}
              </span>
              <div className='flex items-center gap-1.5'>
                {publishedLanguages.map((code) => (
                  <button
                    key={code}
                    type='button'
                    disabled={loading}
                    aria-pressed={currentLanguage === code}
                    onClick={() => onSelectLanguage(code)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      currentLanguage === code
                        ? 'bg-stone-900 text-white'
                        : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {formatContentLanguageName(code, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700'>
              {error}
            </div>
          )}

          <section className='space-y-2'>
            <div className='flex items-center justify-between gap-2'>
              <h3 className='flex items-center gap-2 text-sm font-semibold text-stone-900'>
                {t('workspace.reader.catalog.publishedChaptersHeading', {
                  count: series.chapters.length,
                })}
                {loading && <RefreshCw className='w-3.5 h-3.5 animate-spin text-[#EA580C]' />}
              </h3>
              {series.chapters.length > 1 && (
                <button
                  type='button'
                  onClick={() => setOrder(order === 'newest' ? 'oldest' : 'newest')}
                  className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50'
                >
                  <ArrowDownUp className='w-3.5 h-3.5' aria-hidden='true' />
                  {order === 'newest'
                    ? t('workspace.reader.catalog.sortNewest')
                    : t('workspace.reader.catalog.sortOldest')}
                </button>
              )}
            </div>

            {series.chapters.length === 0 ? (
              <p className='py-6 text-center text-xs text-stone-500'>
                {t('workspace.reader.catalog.noChaptersReady')}
              </p>
            ) : (
              <ul className='divide-y divide-stone-200/80 overflow-hidden rounded-xl border border-stone-200/80 bg-white'>
                {chapters.map((chap) => (
                  <li key={chap.id}>
                    <button
                      type='button'
                      onClick={() => onReadChapter(chap.id)}
                      className='group flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#FAF9F5]'
                    >
                      {chap.coverUrl ? (
                        <img
                          src={resolveCatalogImageUrl(chap.coverUrl)}
                          alt=''
                          width={40}
                          height={56}
                          loading='lazy'
                          className='h-14 w-10 shrink-0 rounded border border-stone-200/80 bg-stone-100 object-cover'
                        />
                      ) : (
                        <div className='flex h-14 w-10 shrink-0 items-center justify-center rounded border border-stone-200/80 bg-[#F3F0E9] font-mono text-xs font-bold text-[#EA580C]'>
                          {chap.chapterNumber}
                        </div>
                      )}
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-sm font-semibold text-stone-900 group-hover:text-[#EA580C]'>
                          {t('workspace.reader.catalog.chapterLabel', {
                            number: chap.chapterNumber,
                          })}{' '}
                          <span className='font-normal text-stone-700'>
                            {chap.title || t('workspace.reader.catalog.untitled')}
                          </span>
                        </div>
                        <div className='mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-500'>
                          {accessBadge(chap)}
                          {chap.publishedAt && (
                            <time dateTime={chap.publishedAt}>
                              {dateFormat.format(new Date(chap.publishedAt))}
                            </time>
                          )}
                        </div>
                      </div>
                      <span className='shrink-0 text-xs font-semibold text-[#EA580C]'>
                        {t('workspace.reader.catalog.readBtn')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};
