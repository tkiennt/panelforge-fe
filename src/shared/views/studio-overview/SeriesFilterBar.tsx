import React from 'react';
import { Search, X } from 'lucide-react';
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

  return (
    <div className='space-y-3'>
      {/* Stitch Status Filter Pills Bar */}
      {onStatusFilterChange && statusCounts && (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center bg-stone-200/60 p-1 rounded-xl text-xs'>
            <button
              type='button'
              onClick={() => onStatusFilterChange('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('workspace.seriesFilter.allCount', { count: statusCounts.all })}
            </button>
            <button
              type='button'
              onClick={() => onStatusFilterChange('IN_PROD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'IN_PROD'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('workspace.seriesFilter.inProdCount', { count: statusCounts.inProd })}
            </button>
            <button
              type='button'
              onClick={() => onStatusFilterChange('PRE_PROD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'PRE_PROD'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('workspace.seriesFilter.preProdCount', { count: statusCounts.preProd })}
            </button>
            <button
              type='button'
              onClick={() => onStatusFilterChange('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'COMPLETED'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('workspace.seriesFilter.completedCount', { count: statusCounts.completed })}
            </button>
          </div>
        </div>
      )}

      <div className='p-3.5 sm:p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
        <div className='flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
          {/* Search Input */}
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('workspace.seriesFilter.searchPlaceholder')}
              className='w-full pl-9.5 pr-8 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={onClearSearch}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors'
                aria-label={t('workspace.seriesFilter.clearSearchAria')}
              >
                <X className='w-3 h-3' />
              </button>
            )}
          </div>

          {/* Genre Filter */}
          <div className='relative'>
            <select
              value={genreFilter}
              onChange={(e) => onGenreFilterChange(e.target.value)}
              aria-label={t('workspace.seriesFilter.genreAria')}
              className='w-full sm:w-auto px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer pr-8'
            >
              <option value='ALL'>{t('workspace.seriesFilter.allGenres')}</option>
              {availableGenres.map((g) => (
                <option key={g} value={g}>
                  {formatGenre(g)}
                </option>
              ))}
            </select>
          </div>

          {/* Reading Direction Filter */}
          <div className='relative'>
            <select
              value={directionFilter}
              onChange={(e) => onDirectionFilterChange(e.target.value)}
              aria-label={t('workspace.seriesFilter.directionAria')}
              className='w-full sm:w-auto px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer pr-8'
            >
              <option value='ALL'>{t('workspace.seriesFilter.allDirections')}</option>
              <option value='RTL'>{t('workspace.seriesFilter.dirRtl')}</option>
              <option value='LTR'>{t('workspace.seriesFilter.dirLtr')}</option>
              <option value='VERTICAL'>{t('workspace.seriesFilter.dirVertical')}</option>
            </select>
          </div>
        </div>

        {/* Sort & Clear Options */}
        <div className='flex items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100'>
          <div className='flex items-center gap-1.5'>
            <label
              htmlFor='series-sort-select'
              className='text-xs text-stone-500 font-medium whitespace-nowrap hidden sm:inline'
            >
              {t('workspace.seriesFilter.sortLabel')}
            </label>
            <select
              id='series-sort-select'
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className='px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer'
            >
              <option value='recent'>{t('workspace.seriesFilter.sortRecent')}</option>
              <option value='az'>{t('workspace.seriesFilter.sortAz')}</option>
              <option value='za'>{t('workspace.seriesFilter.sortZa')}</option>
              <option value='chapters'>{t('workspace.seriesFilter.sortChapters')}</option>
            </select>
          </div>

          {isFiltering && (
            <button
              type='button'
              onClick={onClearFilters}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer shrink-0'
            >
              <X className='w-3.5 h-3.5' />
              <span>{t('workspace.seriesFilter.clearFilters')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Stats Indicator */}
      <div className='flex items-center justify-between text-xs text-stone-500 px-1'>
        <p>
          {t('workspace.seriesFilter.showingPrefix')}{' '}
          <span className='font-bold text-stone-800'>{displayedCount}</span> / {totalCount}{' '}
          {t('workspace.seriesFilter.seriesUnit')}
          {isFiltering && (
            <span className='text-orange-600 font-medium ml-1'>
              {t('workspace.seriesFilter.filteringTag')}
            </span>
          )}
        </p>
        {totalCount > 0 && (
          <span className='text-[11px] text-stone-400 italic hidden sm:inline'>
            {t('workspace.seriesFilter.directionLegend')}
          </span>
        )}
      </div>
    </div>
  );
};
