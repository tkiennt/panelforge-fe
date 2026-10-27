import React from 'react';
import { Search, X } from 'lucide-react';
import { formatGenre } from './formatters';

export interface SeriesFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  genreFilter: string;
  onGenreFilterChange: (value: string) => void;
  availableGenres: string[];
  directionFilter: string;
  onDirectionFilterChange: (value: string) => void;
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
  sortBy,
  onSortByChange,
  isFiltering,
  onClearFilters,
  displayedCount,
  totalCount,
}) => {
  return (
    <div className='space-y-2'>
      <div className='p-3.5 sm:p-4 bg-white/90 backdrop-blur-xs rounded-2xl border border-stone-200/80 shadow-soft-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
        <div className='flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
          {/* Search Input */}
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Tìm bộ truyện theo tên, tóm tắt...'
              className='w-full pl-9.5 pr-8 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={onClearSearch}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors'
                aria-label='Xóa tìm kiếm'
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
              aria-label='Lọc theo thể loại'
              className='w-full sm:w-auto px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer pr-8'
            >
              <option value='ALL'>Tất cả thể loại</option>
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
              aria-label='Lọc theo định dạng đọc'
              className='w-full sm:w-auto px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer pr-8'
            >
              <option value='ALL'>Tất cả định dạng đọc</option>
              <option value='RTL'>Đọc phải → trái (RTL)</option>
              <option value='LTR'>Đọc trái → phải (LTR)</option>
              <option value='VERTICAL'>Cuộn dọc (Webtoon)</option>
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
              Sắp xếp:
            </label>
            <select
              id='series-sort-select'
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className='px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer'
            >
              <option value='recent'>Mới cập nhật</option>
              <option value='az'>Tên (A → Z)</option>
              <option value='za'>Tên (Z → A)</option>
              <option value='chapters'>Nhiều chương nhất</option>
            </select>
          </div>

          {isFiltering && (
            <button
              type='button'
              onClick={onClearFilters}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer shrink-0'
            >
              <X className='w-3.5 h-3.5' />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Stats Indicator */}
      <div className='flex items-center justify-between text-xs text-stone-500 px-1'>
        <p>
          Hiển thị <span className='font-bold text-stone-800'>{displayedCount}</span> / {totalCount}{' '}
          bộ truyện
          {isFiltering && <span className='text-orange-600 font-medium ml-1'>(đang lọc)</span>}
        </p>
        {totalCount > 0 && (
          <span className='text-[11px] text-stone-400 italic hidden sm:inline'>
            Định dạng đọc: RTL (Manga), LTR (Comic), Dọc (Webtoon)
          </span>
        )}
      </div>
    </div>
  );
};
