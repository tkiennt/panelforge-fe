import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Card, CardBody } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { formatGenre } from './formatters';

export type SeriesStatusFilter = 'ALL' | 'IN_PROD' | 'PRE_PROD' | 'COMPLETED';

export interface SeriesFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  genreFilter: string;
  onGenreFilterChange: (value: string) => void;
  availableGenres: string[];
  directionFilter: string;
  onDirectionFilterChange: (value: string) => void;
  statusFilter?: SeriesStatusFilter;
  onStatusFilterChange?: (value: SeriesStatusFilter) => void;
  statusCounts?: { all: number; inProd: number; preProd: number; completed: number };
  sortBy: 'recent' | 'az' | 'za' | 'chapters';
  onSortByChange: (value: 'recent' | 'az' | 'za' | 'chapters') => void;
  isFiltering: boolean;
  onClearFilters: () => void;
  displayedCount: number;
  totalCount: number;
}

export const SeriesFilterBar: React.FC<SeriesFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
  genreFilter,
  onGenreFilterChange,
  availableGenres,
  directionFilter,
  onDirectionFilterChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  statusCounts,
  sortBy,
  onSortByChange,
  isFiltering,
  onClearFilters,
  displayedCount,
  totalCount,
}) => {
  const { t } = useTranslation();

  const statusTabs: Array<{ id: SeriesStatusFilter; label: string }> = [
    {
      id: 'ALL',
      label: t('workspace.studioHub.series.filterAll', {
        count: statusCounts?.all ?? totalCount,
      }),
    },
    {
      id: 'IN_PROD',
      label: t('workspace.studioHub.series.filterInProd', {
        count: statusCounts?.inProd ?? 0,
      }),
    },
    {
      id: 'PRE_PROD',
      label: t('workspace.studioHub.series.filterPreProd', {
        count: statusCounts?.preProd ?? 0,
      }),
    },
    {
      id: 'COMPLETED',
      label: t('workspace.studioHub.series.filterCompleted', {
        count: statusCounts?.completed ?? 0,
      }),
    },
  ];

  return (
    <Card className='font-sans'>
      <CardBody className='p-3.5 space-y-3'>
        {/* Row 1: Status filter tabs + kraft count chip + clear filters */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {onStatusFilterChange ? (
            <div
              className='inline-flex flex-wrap items-center gap-1 rounded-lg bg-head-wash border border-head-line p-1 text-xs font-medium'
              id='series-filters-wrapper'
            >
              {statusTabs.map((tab) => {
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type='button'
                    aria-pressed={isSelected}
                    onClick={() => onStatusFilterChange(tab.id)}
                    className={`series-filter-pill focus-ring px-3 py-1.5 rounded-md transition-studio cursor-pointer tabular-nums whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-stone-900 font-semibold border border-head-line shadow-2xs'
                        : 'border border-transparent text-kraft-ink hover:text-stone-900 hover:bg-white/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          <div className='flex items-center gap-2'>
            <span
              id='series-count-heading'
              className='rounded-full bg-kraft px-2.5 py-1 text-xs font-semibold text-kraft-ink tabular-nums whitespace-nowrap'
            >
              {t('workspace.portal.showing', {
                shown: displayedCount,
                total: totalCount,
              })}
            </span>

            {isFiltering && (
              <button
                type='button'
                onClick={onClearFilters}
                aria-label={t('workspace.studioHub.series.clearFilters')}
                className='focus-ring inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-accent-dark bg-accent-soft border border-head-line hover:bg-orange-100 transition-studio cursor-pointer shrink-0'
              >
                <X className='w-3.5 h-3.5' aria-hidden='true' />
                <span>{t('workspace.studioHub.series.clearFilters')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search + Genre + Reading direction + Sort */}
        <div className='flex flex-col md:flex-row md:items-center gap-2.5'>
          <div className='relative flex-1 min-w-[200px]'>
            <Search
              className='w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
              aria-hidden='true'
            />
            <input
              type='text'
              id='series-search'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('workspace.studioHub.series.searchPlaceholder')}
              className='focus-ring w-full min-h-9 bg-[#FAF9F5]/70 focus:bg-white pl-9 pr-8 py-1.5 rounded-lg border border-stone-200 focus:border-accent text-stone-900 placeholder:text-stone-400 text-xs font-medium shadow-2xs transition-studio font-sans'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={onClearSearch}
                className='focus-ring absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-stone-700 cursor-pointer'
                aria-label={t('workspace.portal.clearSearch')}
              >
                <X className='w-3.5 h-3.5' aria-hidden='true' />
              </button>
            )}
          </div>

          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            {availableGenres && availableGenres.length > 0 && (
              <div className='relative'>
                <select
                  value={genreFilter}
                  onChange={(e) => onGenreFilterChange(e.target.value)}
                  aria-label={t('workspace.studioHub.series.allGenres')}
                  className='focus-ring min-h-9 bg-white hover:border-head-line border border-stone-200 text-stone-700 pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium shadow-2xs cursor-pointer appearance-none transition-studio font-sans'
                >
                  <option value='ALL'>{t('workspace.studioHub.series.allGenres')}</option>
                  {availableGenres.map((g) => (
                    <option key={g} value={g}>
                      {formatGenre(g)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className='w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none'
                  aria-hidden='true'
                />
              </div>
            )}

            <div className='relative'>
              <select
                value={directionFilter}
                onChange={(e) => onDirectionFilterChange(e.target.value)}
                aria-label={t('workspace.studioHub.series.allDirections')}
                className='focus-ring min-h-9 bg-white hover:border-head-line border border-stone-200 text-stone-700 pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium shadow-2xs cursor-pointer appearance-none transition-studio font-sans'
              >
                <option value='ALL'>{t('workspace.studioHub.series.allDirections')}</option>
                <option value='RTL'>{t('workspace.studioHub.series.rtlOption')}</option>
                <option value='LTR'>{t('workspace.studioHub.series.ltrOption')}</option>
                <option value='VERTICAL'>{t('workspace.studioHub.series.verticalOption')}</option>
              </select>
              <ChevronDown
                className='w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none'
                aria-hidden='true'
              />
            </div>

            <div className='relative'>
              <select
                id='series-sort-select'
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                aria-label={t('workspace.shelf.search.sort')}
                className='focus-ring min-h-9 bg-white hover:border-head-line border border-stone-200 text-stone-700 pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium shadow-2xs cursor-pointer appearance-none transition-studio font-sans'
              >
                <option value='recent'>{t('workspace.studioHub.series.sortRecent')}</option>
                <option value='az'>{t('workspace.studioHub.series.sortAz')}</option>
                <option value='za'>{t('workspace.studioHub.series.sortZa')}</option>
                <option value='chapters'>{t('workspace.studioHub.series.sortChapters')}</option>
              </select>
              <ChevronDown
                className='w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none'
                aria-hidden='true'
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
