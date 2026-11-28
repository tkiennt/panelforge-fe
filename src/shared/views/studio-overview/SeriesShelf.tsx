import React from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { SeriesDto } from '@/services/series.service';
import { BlankPageSketch } from '@/shared/components/BlankPageSketch';
import { Card, CardBody } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { SeriesCardItem, type SeriesCardItemProps } from './SeriesCardItem';
import type { SeriesViewMode } from './SeriesFilterBar';

type CardActions = Omit<
  SeriesCardItemProps,
  'series' | 'isProducerOrAdmin' | 'isOpenMenu' | 'onToggleMenu' | 'views'
>;

interface SeriesShelfProps extends CardActions {
  loading: boolean;
  totalCount: number;
  series: SeriesDto[];
  canCreate: boolean;
  onCreateSeries: () => void;
  onClearFilters: () => void;
  /** seriesId -> lượt xem (chỉ Producer). Thiếu key = ẩn dòng lượt xem của thẻ đó. */
  viewsBySeries?: Record<string, number>;
  /** list = thẻ ngang (mặc định), grid = thẻ bìa dọc. */
  viewMode?: SeriesViewMode;
}

const SHELF_GRID_LIST = 'grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch';
const SHELF_GRID_CARDS = 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 items-stretch';

const ShelfSkeleton: React.FC<{ viewMode: SeriesViewMode }> = ({ viewMode }) => {
  const { t } = useTranslation();
  return (
    <div
      className={viewMode === 'grid' ? SHELF_GRID_CARDS : SHELF_GRID_LIST}
      aria-busy='true'
      aria-label={t('workspace.seriesShelf.loadingAria')}
    >
      {[1, 2, 3].map((n) => (
        <Card key={n} className='animate-pulse'>
          <div className='aspect-[3/4] w-full bg-head-wash' />
          <CardBody className='space-y-2.5 p-3.5'>
            <div className='h-4 w-3/4 rounded-md bg-stone-200/70' />
            <div className='h-3 w-1/2 rounded-md bg-stone-200/70' />
            <div className='h-3 w-2/3 rounded-md bg-stone-200/70' />
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export const SeriesShelf: React.FC<SeriesShelfProps> = ({
  loading,
  totalCount,
  series,
  canCreate,
  onCreateSeries,
  onClearFilters,
  viewsBySeries,
  viewMode = 'list',
  ...cardActions
}) => {
  const { t } = useTranslation();

  if (loading) return <ShelfSkeleton viewMode={viewMode} />;

  if (totalCount === 0) {
    return (
      <div className='border-2 border-dashed border-head-line bg-head-wash/60 rounded-xl p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left'>
        <BlankPageSketch />
        <div className='flex-1 space-y-1.5'>
          <h3 className='font-serif text-lg font-bold text-stone-900'>
            {t('workspace.seriesShelf.emptyTitle')}
          </h3>
          <p className='text-sm text-stone-600 leading-relaxed max-w-xl'>
            {t('workspace.seriesShelf.emptyDesc')}
          </p>
          {!canCreate && (
            <p className='text-xs text-stone-500'>
              {t('workspace.seriesShelf.onlyProducerCanCreate')}
            </p>
          )}
        </div>
        {canCreate && (
          <button
            type='button'
            onClick={onCreateSeries}
            className='focus-ring inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white min-h-10 px-5 text-sm font-semibold shadow-xs transition-studio cursor-pointer shrink-0'
          >
            <Plus className='w-4 h-4' aria-hidden='true' />
            <span>{t('workspace.seriesShelf.createNow')}</span>
          </button>
        )}
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <Card>
        <CardBody className='flex flex-col sm:flex-row sm:items-center gap-4'>
          <div
            className='bg-accent-soft text-accent-dark p-3 rounded-xl self-start shrink-0'
            aria-hidden='true'
          >
            <Search className='w-5 h-5' />
          </div>
          <div className='flex-1'>
            <h3 className='text-sm font-bold text-stone-900'>
              {t('workspace.seriesShelf.noMatchTitle')}
            </h3>
            <p className='text-xs text-stone-600 leading-relaxed'>
              {t('workspace.seriesShelf.noMatchDesc')}
            </p>
          </div>
          <button
            type='button'
            onClick={onClearFilters}
            className='focus-ring min-h-9 inline-flex items-center gap-1.5 px-4 text-xs font-semibold text-accent-dark bg-accent-soft border border-head-line hover:bg-orange-100 rounded-full transition-studio cursor-pointer self-start sm:self-auto'
          >
            <X className='w-3.5 h-3.5' aria-hidden='true' />
            <span>{t('workspace.seriesShelf.clearAllFilters')}</span>
          </button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div id='series-grid' className={viewMode === 'grid' ? SHELF_GRID_CARDS : SHELF_GRID_LIST}>
      {series.map((s) => (
        <SeriesCardItem
          key={s.id}
          series={s}
          isProducerOrAdmin={canCreate}
          views={viewsBySeries?.[s.id]}
          variant={viewMode}
          {...cardActions}
        />
      ))}
    </div>
  );
};
