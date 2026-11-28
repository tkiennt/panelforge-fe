import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, Rows3, Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { formatGenre } from './formatters';
import {
  hasNativeInvoker,
  invokerAttrs,
  positionPopoverFallback,
  safeHidePopover,
  safeShowPopover,
} from './popoverMenu';

export type SeriesStatusFilter = 'ALL' | 'IN_PROD' | 'PRE_PROD' | 'COMPLETED';
export type SeriesSortBy = 'recent' | 'az' | 'za' | 'chapters';
export type SeriesViewMode = 'list' | 'grid';

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
  sortBy: SeriesSortBy;
  onSortByChange: (value: SeriesSortBy) => void;
  isFiltering: boolean;
  onClearFilters: () => void;
  viewMode?: SeriesViewMode;
  onViewModeChange?: (value: SeriesViewMode) => void;
}

const selectClass =
  'focus-ring w-full min-h-9 appearance-none cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs transition-studio hover:border-head-line font-sans';

const SelectField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ id, label, value, onChange, children }) => (
  <div className='space-y-1.5'>
    <label htmlFor={id} className='block text-xs font-semibold text-stone-600'>
      {label}
    </label>
    <div className='relative'>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {children}
      </select>
      <ChevronDown
        className='pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400'
        aria-hidden='true'
      />
    </div>
  </div>
);

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
  viewMode = 'list',
  onViewModeChange,
}) => {
  const { t } = useTranslation();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Phím "/" nhảy vào ô tìm kiếm, trừ khi người dùng đang gõ ở ô nhập khác hoặc đang gõ IME.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const onToggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === 'open';
      setMenuOpen(open);
      if (open) positionPopoverFallback(triggerRef.current, menu);
    };
    menu.addEventListener('toggle', onToggle);
    return () => menu.removeEventListener('toggle', onToggle);
  }, []);

  const handleToggleClick = () => {
    if (hasNativeInvoker()) return;
    const menu = menuRef.current;
    if (!menuOpen) {
      positionPopoverFallback(triggerRef.current, menu);
      safeShowPopover(menu, triggerRef.current);
      setMenuOpen(true);
    } else {
      safeHidePopover(menu);
      setMenuOpen(false);
    }
  };

  // Chỉ thể loại và định dạng đọc tính là "bộ lọc"; trạng thái nằm ở tab, sắp xếp không tính.
  const directionLabel = (value: string) => {
    if (value === 'RTL') return t('workspace.studioHub.series.rtlOption');
    if (value === 'LTR') return t('workspace.studioHub.series.ltrOption');
    if (value === 'VERTICAL') return t('workspace.studioHub.series.verticalOption');
    return value;
  };
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (genreFilter !== 'ALL') {
    activeChips.push({
      key: 'genre',
      label: t('workspace.studioHub.series.chipGenre', { value: formatGenre(genreFilter) }),
      onRemove: () => onGenreFilterChange('ALL'),
    });
  }
  if (directionFilter !== 'ALL') {
    activeChips.push({
      key: 'direction',
      label: t('workspace.studioHub.series.chipDirection', {
        value: directionLabel(directionFilter),
      }),
      onRemove: () => onDirectionFilterChange('ALL'),
    });
  }
  const activeFilterCount = activeChips.length;

  const statusTabs: Array<{ id: SeriesStatusFilter; label: string; count: number }> = [
    { id: 'ALL', label: t('workspace.studioHub.series.tabAll'), count: statusCounts?.all ?? 0 },
    {
      id: 'IN_PROD',
      label: t('workspace.studioHub.series.statusInProd'),
      count: statusCounts?.inProd ?? 0,
    },
    {
      id: 'PRE_PROD',
      label: t('workspace.studioHub.series.statusPreProd'),
      count: statusCounts?.preProd ?? 0,
    },
    {
      id: 'COMPLETED',
      label: t('workspace.studioHub.series.statusCompleted'),
      count: statusCounts?.completed ?? 0,
    },
  ];

  const viewOptions: Array<{ id: SeriesViewMode; label: string; icon: React.ReactNode }> = [
    {
      id: 'list',
      label: t('workspace.studioHub.series.viewList'),
      icon: <Rows3 className='size-3.5' aria-hidden='true' />,
    },
    {
      id: 'grid',
      label: t('workspace.studioHub.series.viewGrid'),
      icon: <LayoutGrid className='size-3.5' aria-hidden='true' />,
    },
  ];

  return (
    <div
      className='sticky top-0 z-20 -mx-1 space-y-3 bg-[#FAF9F5] px-1 pt-2 font-sans'
      id='series-filters-wrapper'
    >
      <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-stone-200/80'>
        {onStatusFilterChange ? (
          <div className='-mb-px flex flex-wrap items-center gap-x-5 text-sm font-medium'>
            {statusTabs.map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  aria-pressed={isSelected}
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`series-filter-pill focus-ring inline-flex items-center gap-1.5 border-b-2 py-2.5 transition-studio cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'border-accent font-semibold text-stone-900'
                      : `border-transparent hover:border-stone-300 hover:text-stone-900 ${
                          tab.count === 0 ? 'text-stone-400' : 'text-stone-600'
                        }`
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${
                      isSelected ? 'bg-accent-soft text-accent-dark' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}

        <div className='flex flex-wrap items-center gap-2 min-w-0 pb-2'>
          <div className='relative w-full sm:w-64'>
            <Search
              className='w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
              aria-hidden='true'
            />
            {!searchQuery && (
              <kbd
                title={t('workspace.studioHub.series.searchShortcutHint')}
                className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-stone-200 bg-stone-50 px-1.5 font-mono text-xs text-stone-500'
              >
                /
              </kbd>
            )}
            <input
              ref={searchRef}
              type='text'
              id='series-search'
              aria-keyshortcuts='/'
              aria-label={t('workspace.portal.searchLabel')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('workspace.studioHub.series.searchPlaceholder')}
              className='focus-ring w-full min-h-9 bg-white pl-9 pr-8 py-1.5 rounded-lg border border-stone-200 focus:border-accent text-stone-900 placeholder:text-stone-400 text-xs font-medium shadow-2xs transition-studio font-sans'
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

          <select
            id='series-sort-select'
            aria-label={t('workspace.shelf.search.sort')}
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SeriesSortBy)}
            className='focus-ring min-h-9 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs transition-studio hover:border-head-line font-sans'
          >
            <option value='recent'>{t('workspace.studioHub.series.sortRecent')}</option>
            <option value='az'>{t('workspace.studioHub.series.sortAz')}</option>
            <option value='za'>{t('workspace.studioHub.series.sortZa')}</option>
            <option value='chapters'>{t('workspace.studioHub.series.sortChapters')}</option>
          </select>

          <div className='relative shrink-0'>
            <button
              ref={triggerRef}
              type='button'
              aria-expanded={menuOpen}
              aria-controls={menuId}
              {...invokerAttrs(menuId)}
              onClick={handleToggleClick}
              data-testid='series-filters-trigger'
              className={`focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-studio cursor-pointer ${
                activeFilterCount > 0
                  ? 'border-accent bg-accent-soft text-accent-dark'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-head-line hover:text-stone-900'
              }`}
            >
              <SlidersHorizontal className='size-3.5' aria-hidden='true' />
              <span>
                {activeFilterCount > 0
                  ? t('workspace.studioHub.series.filtersButtonCount', {
                      count: activeFilterCount,
                    })
                  : t('workspace.studioHub.series.filtersButton')}
              </span>
            </button>

            <div
              ref={menuRef}
              id={menuId}
              popover='auto'
              data-placement='bottom-end'
              aria-label={t('workspace.studioHub.series.filtersButton')}
              className={`pf-sb-popover-menu w-72 space-y-4 rounded-xl border border-stone-200 bg-white p-4 text-stone-900 shadow-xl ${
                !hasNativeInvoker() && !menuOpen ? 'hidden' : ''
              }`}
            >
              {availableGenres && availableGenres.length > 0 && (
                <SelectField
                  id={`${menuId}-genre`}
                  label={t('workspace.studioHub.series.genreLabel')}
                  value={genreFilter}
                  onChange={onGenreFilterChange}
                >
                  <option value='ALL'>{t('workspace.studioHub.series.allGenres')}</option>
                  {availableGenres.map((g) => (
                    <option key={g} value={g}>
                      {formatGenre(g)}
                    </option>
                  ))}
                </SelectField>
              )}

              <SelectField
                id={`${menuId}-format`}
                label={t('workspace.studioHub.series.readingFormatLabel')}
                value={directionFilter}
                onChange={onDirectionFilterChange}
              >
                <option value='ALL'>{t('workspace.studioHub.series.allDirections')}</option>
                <option value='RTL'>{t('workspace.studioHub.series.rtlOption')}</option>
                <option value='LTR'>{t('workspace.studioHub.series.ltrOption')}</option>
                <option value='VERTICAL'>{t('workspace.studioHub.series.verticalOption')}</option>
              </SelectField>

              <div className='flex items-center justify-end border-t border-stone-100 pt-3'>
                <button
                  type='button'
                  onClick={onClearFilters}
                  disabled={!isFiltering}
                  className='focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-head-line bg-accent-soft px-3.5 text-xs font-semibold text-accent-dark transition-studio hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
                >
                  <X className='w-3.5 h-3.5' aria-hidden='true' />
                  <span>{t('workspace.studioHub.series.clearFilters')}</span>
                </button>
              </div>
            </div>
          </div>

          {onViewModeChange && (
            <div
              role='group'
              aria-label={t('workspace.studioHub.series.viewToggleAria')}
              className='inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-stone-200 bg-white p-0.5 shadow-2xs'
            >
              {viewOptions.map((opt) => {
                const isSelected = viewMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type='button'
                    aria-pressed={isSelected}
                    onClick={() => onViewModeChange(opt.id)}
                    data-testid={`series-view-${opt.id}`}
                    className={`focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-studio cursor-pointer ${
                      isSelected
                        ? 'bg-head-wash font-semibold text-stone-900'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className='flex flex-wrap items-center gap-2' data-testid='series-active-filters'>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className='inline-flex items-center gap-1 rounded-full border border-head-line bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent-dark'
            >
              <span>{chip.label}</span>
              <button
                type='button'
                onClick={chip.onRemove}
                aria-label={t('workspace.studioHub.series.removeFilterAria', {
                  label: chip.label,
                })}
                className='focus-ring inline-flex size-5 items-center justify-center rounded-full hover:bg-orange-100 cursor-pointer'
              >
                <X className='size-3' aria-hidden='true' />
              </button>
            </span>
          ))}
          <button
            type='button'
            onClick={onClearFilters}
            className='focus-ring min-h-7 rounded-lg px-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer'
          >
            {t('workspace.studioHub.series.clearAllChips')}
          </button>
        </div>
      )}
    </div>
  );
};
