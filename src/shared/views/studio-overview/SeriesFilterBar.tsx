import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
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
    <div className='space-y-3 font-sans'>
      {/* Stitch Top Bar: Heading + Status Filter Pills & Search */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        {/* Left: Heading & Status Pills */}
        <div className='flex items-center gap-4 flex-wrap'>
          <h2 className='text-xl font-bold text-stone-900'>
            {t('studioHub.series.title', 'Danh sách Bộ truyện')}{' '}
            <span className='text-stone-400 font-normal text-base' id='series-count-heading'>
              ({totalCount})
            </span>
          </h2>

          {onStatusFilterChange && (
            <div
              className='flex items-center bg-white p-1 rounded-lg border border-stone-200 shadow-2xs text-xs font-medium'
              id='series-filters-wrapper'
            >
              <button
                type='button'
                onClick={() => onStatusFilterChange('ALL')}
                className={`series-filter-pill px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-stone-100 text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tất cả ({statusCounts?.all ?? totalCount})
              </button>
              <button
                type='button'
                onClick={() => onStatusFilterChange('IN_PROD')}
                className={`series-filter-pill px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'IN_PROD'
                    ? 'bg-stone-100 text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Đang sản xuất ({statusCounts?.inProd ?? 0})
              </button>
              <button
                type='button'
                onClick={() => onStatusFilterChange('PRE_PROD')}
                className={`series-filter-pill px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'PRE_PROD'
                    ? 'bg-stone-100 text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tiền kỳ ({statusCounts?.preProd ?? 0})
              </button>
              <button
                type='button'
                onClick={() => onStatusFilterChange('COMPLETED')}
                className={`series-filter-pill px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-stone-100 text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Hoàn thành ({statusCounts?.completed ?? 0})
              </button>
            </div>
          )}
        </div>

        {/* Right: Search, Filter Dropdowns & Sort */}
        <div className='flex items-center gap-2.5 flex-wrap sm:flex-nowrap'>
          {/* Search Input */}
          <div className='relative w-full sm:w-64'>
            <Search className='w-4 h-4 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none' />
            <input
              type='text'
              id='series-search'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Tìm bộ truyện theo tên, tóm tắt...'
              className='w-full bg-white pl-8 pr-7 py-1.5 rounded-lg border border-stone-200 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-sans'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={onClearSearch}
                className='absolute right-2 top-2 text-stone-400 hover:text-stone-700 cursor-pointer'
                aria-label='Xóa tìm kiếm'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            )}
          </div>

          {/* Genre Filter */}
          {availableGenres && availableGenres.length > 0 && (
            <div className='relative shrink-0'>
              <select
                value={genreFilter}
                onChange={(e) => onGenreFilterChange(e.target.value)}
                aria-label='Lọc theo thể loại'
                className='bg-white border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-orange-600 cursor-pointer pr-7 appearance-none font-sans'
              >
                <option value='ALL'>Tất cả thể loại</option>
                {availableGenres.map((g) => (
                  <option key={g} value={g}>
                    {formatGenre(g)}
                  </option>
                ))}
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-stone-400 absolute right-2 top-2.5 pointer-events-none' />
            </div>
          )}

          {/* Reading Direction Filter */}
          <div className='relative shrink-0'>
            <select
              value={directionFilter}
              onChange={(e) => onDirectionFilterChange(e.target.value)}
              aria-label='Lọc theo định dạng đọc'
              className='bg-white border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-orange-600 cursor-pointer pr-7 appearance-none font-sans'
            >
              <option value='ALL'>Tất cả định dạng đọc</option>
              <option value='RTL'>Đọc phải → trái (RTL)</option>
              <option value='LTR'>Đọc trái → phải (LTR)</option>
              <option value='VERTICAL'>Cuộn dọc (Webtoon)</option>
            </select>
            <ChevronDown className='w-3.5 h-3.5 text-stone-400 absolute right-2 top-2.5 pointer-events-none' />
          </div>

          {/* Sort By Select */}
          <div className='relative shrink-0'>
            <select
              id='series-sort-select'
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              aria-label='Sắp xếp'
              className='bg-white border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-orange-600 cursor-pointer pr-7 appearance-none font-sans'
            >
              <option value='recent'>Mới cập nhật ▾</option>
              <option value='az'>Tên A-Z ▾</option>
              <option value='za'>Tên Z-A ▾</option>
              <option value='chapters'>Nhiều chương nhất ▾</option>
            </select>
            <ChevronDown className='w-3.5 h-3.5 text-stone-400 absolute right-2 top-2.5 pointer-events-none' />
          </div>

          {/* Clear Filters Button */}
          {isFiltering && (
            <button
              type='button'
              onClick={onClearFilters}
              aria-label='Xóa bộ lọc'
              className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer shrink-0'
            >
              <X className='w-3.5 h-3.5' />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
