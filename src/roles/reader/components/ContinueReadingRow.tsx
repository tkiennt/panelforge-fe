import React from 'react';
import { Play } from 'lucide-react';
import type { PublicSeriesDto } from '@/services/catalog.service';
import type { ReadingProgressDto } from '@/services/readerLibrary.service';
import { useTranslation } from '@/lib/i18n';
import { SeriesCover } from './SeriesCover';

interface ContinueReadingRowProps {
  history: ReadingProgressDto[];
  seriesById: Map<string, PublicSeriesDto>;
  onContinue: (chapterId: string) => void;
}

const MAX_ITEMS = 4;

/** "Đọc tiếp": chương đọc dở gần nhất của độc giả đã đăng nhập (lịch sử đồng bộ với app mobile). */
export const ContinueReadingRow: React.FC<ContinueReadingRowProps> = ({
  history,
  seriesById,
  onContinue,
}) => {
  const { t } = useTranslation();
  const items = [...history]
    .sort((a, b) => Date.parse(b.readAt) - Date.parse(a.readAt))
    .filter((h) => seriesById.has(h.seriesId))
    .slice(0, MAX_ITEMS);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby='continue-reading-title'>
      <h2
        id='continue-reading-title'
        className='mb-4 border-b border-stone-200/80 pb-3 font-serif text-xl font-bold text-stone-900'
      >
        {t('workspace.reader.catalog.continueReading')}
      </h2>
      <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {items.map((h) => {
          const series = seriesById.get(h.seriesId)!;
          const total = Math.max(1, h.totalPages);
          const percent = Math.min(100, Math.round((h.lastPageNumber / total) * 100));
          return (
            <li key={h.seriesId}>
              <button
                type='button'
                onClick={() => onContinue(h.chapterId)}
                className='group flex w-full items-center gap-3 rounded-xl border border-stone-200/80 bg-white p-3 text-left shadow-xs hover:border-orange-300'
              >
                <SeriesCover
                  title={series.title}
                  coverUrl={series.coverUrl}
                  className='w-14 shrink-0'
                />
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-semibold text-stone-900'>
                    {series.title}
                  </span>
                  <span className='mt-0.5 block text-xs text-stone-500'>
                    {t('workspace.reader.catalog.continueProgress', {
                      chapter: h.chapterNumber,
                      page: h.lastPageNumber,
                      total,
                    })}
                  </span>
                  <span
                    className='mt-2 block h-1.5 overflow-hidden rounded-full bg-stone-100'
                    role='progressbar'
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={series.title}
                  >
                    <span
                      className='block h-full rounded-full bg-[#F97316]'
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>
                <span className='grid size-8 shrink-0 place-items-center rounded-full bg-orange-50 text-[#EA580C] group-hover:bg-[#F97316] group-hover:text-white'>
                  <Play className='w-3.5 h-3.5' aria-hidden='true' />
                  <span className='sr-only'>{t('workspace.reader.catalog.continueAction')}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
