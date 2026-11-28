import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Layers } from 'lucide-react';
import { resolveCatalogImageUrl, type PublicSeriesDto } from '@/services/catalog.service';
import { useTranslation } from '@/lib/i18n';
import { SeriesCover } from './SeriesCover';

interface CatalogHeroProps {
  /** Truyện nổi bật theo lượt đọc tuần (đã xếp hạng sẵn), tối đa vài bộ. */
  items: PublicSeriesDto[];
  onOpen: (seriesId: string) => void;
  /** "30 chương · Hôm qua" của một truyện. */
  metaLine: (item: PublicSeriesDto) => string;
}

const ROTATE_MS = 7000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Băng truyện nổi bật đầu trang chủ độc giả: tự chuyển sau vài giây, dừng khi rê chuột / focus,
 * không tự chuyển nếu người dùng bật giảm chuyển động.
 */
export const CatalogHero: React.FC<CatalogHeroProps> = ({ items, onOpen, metaLine }) => {
  const { t, lang } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const current = items[Math.min(index, count - 1)];
  const views = new Intl.NumberFormat(lang, { notation: 'compact' });

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!current) return null;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const bg = current.coverUrl ? resolveCatalogImageUrl(current.coverUrl) : null;

  return (
    <section
      aria-roledescription='carousel'
      aria-label={t('workspace.reader.catalog.featuredLabel')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className='relative isolate overflow-hidden rounded-2xl bg-stone-900 text-white shadow-xs'
    >
      {bg && (
        <img
          src={bg}
          alt=''
          aria-hidden='true'
          width={600}
          height={800}
          className='absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-40 blur-2xl'
        />
      )}
      <div className='absolute inset-0 -z-10 bg-gradient-to-r from-stone-950/90 via-stone-900/70 to-stone-900/30' />

      <div
        key={current.id}
        className='flex min-h-80 flex-col gap-6 p-5 pb-16 motion-safe:animate-[reader-hero-in_400ms_ease-out] sm:flex-row sm:p-7'
      >
        <button
          type='button'
          onClick={() => onOpen(current.id)}
          className='group w-36 shrink-0 self-start sm:w-48'
          aria-label={current.title}
        >
          <SeriesCover
            title={current.title}
            coverUrl={current.coverUrl}
            priority
            className='border-white/10 shadow-lg'
          />
        </button>
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='text-xs font-bold uppercase tracking-widest text-orange-300'>
            {t('workspace.reader.catalog.featuredRank', { rank: index + 1 })}
          </span>
          <h2 className='mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl'>
            {current.title}
          </h2>
          <div className='mt-3 flex flex-wrap items-center gap-2 text-xs'>
            <span className='rounded-full bg-white/15 px-2.5 py-1 font-semibold'>
              {current.genre}
            </span>
            <span className='rounded-full bg-white/15 px-2.5 py-1 font-semibold'>
              {current.format}
            </span>
            {current.isCompleted && (
              <span className='rounded-full bg-emerald-500/90 px-2.5 py-1 font-semibold'>
                {t('workspace.reader.catalog.statusCompleted')}
              </span>
            )}
            <span className='text-stone-300'>{current.studioName}</span>
          </div>
          <p className='mt-4 line-clamp-3 max-w-2xl text-sm leading-relaxed text-stone-200'>
            {current.synopsis || t('workspace.reader.catalog.noSynopsis')}
          </p>
          <div className='mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5'>
            <button
              type='button'
              onClick={() => onOpen(current.id)}
              className='btn-cta-primary rounded-full px-5 py-2.5 text-sm font-semibold'
            >
              {t('workspace.reader.catalog.viewSeries')}
            </button>
            <span className='inline-flex items-center gap-1.5 text-xs text-stone-300'>
              <Layers className='w-3.5 h-3.5' aria-hidden='true' />
              {metaLine(current)}
            </span>
            {(current.viewsLast7Days ?? 0) > 0 && (
              <span className='inline-flex items-center gap-1.5 text-xs text-stone-300'>
                <Eye className='w-3.5 h-3.5' aria-hidden='true' />
                {t('workspace.reader.catalog.weeklyViews', {
                  count: views.format(current.viewsLast7Days ?? 0),
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className='absolute bottom-4 right-4 flex items-center gap-2'>
          <button
            type='button'
            onClick={() => go(-1)}
            aria-label={t('workspace.reader.catalog.heroPrev')}
            className='grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25'
          >
            <ChevronLeft className='w-4 h-4' aria-hidden='true' />
          </button>
          {items.map((item, i) => (
            <button
              key={item.id}
              type='button'
              onClick={() => setIndex(i)}
              aria-label={item.title}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-[#F97316]' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
          <button
            type='button'
            onClick={() => go(1)}
            aria-label={t('workspace.reader.catalog.heroNext')}
            className='grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25'
          >
            <ChevronRight className='w-4 h-4' aria-hidden='true' />
          </button>
        </div>
      )}
    </section>
  );
};
