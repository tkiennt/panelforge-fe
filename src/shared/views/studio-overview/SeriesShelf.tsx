import React from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { SeriesDto } from '@/services/series.service';
import { BlankPageSketch } from '@/shared/components/BlankPageSketch';
import { SeriesCardItem, type SeriesCardItemProps } from './SeriesCardItem';

type CardActions = Omit<
  SeriesCardItemProps,
  'series' | 'isProducerOrAdmin' | 'isOpenMenu' | 'onToggleMenu'
>;

interface SeriesShelfProps extends CardActions {
  loading: boolean;
  totalCount: number;
  series: SeriesDto[];
  canCreate: boolean;
  openMenuSeriesId: string | null;
  onToggleMenu: (seriesId: string) => void;
  onCreateSeries: () => void;
  onClearFilters: () => void;
}

const SHELF_GRID =
  'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-stretch';

const ShelfSkeleton: React.FC = () => (
  <div className={SHELF_GRID} aria-busy='true' aria-label='Đang tải danh sách bộ truyện'>
    {[1, 2, 3].map((n) => (
      <div
        key={n}
        className='rounded-xl bg-white border border-stone-200/80 p-4 flex gap-3.5 animate-pulse'
      >
        <div className='w-20 aspect-[3/4] bg-stone-200/70 rounded-md shrink-0' />
        <div className='flex-1 space-y-2.5 pt-1'>
          <div className='h-3 bg-stone-200/70 rounded-md w-1/3' />
          <div className='h-4 bg-stone-200/70 rounded-md w-3/4' />
          <div className='h-3 bg-stone-100 rounded-md w-full' />
          <div className='h-9 bg-stone-100 rounded-md w-full mt-4' />
        </div>
      </div>
    ))}
  </div>
);

export const SeriesShelf: React.FC<SeriesShelfProps> = ({
  loading,
  totalCount,
  series,
  canCreate,
  openMenuSeriesId,
  onToggleMenu,
  onCreateSeries,
  onClearFilters,
  ...cardActions
}) => {
  if (loading) return <ShelfSkeleton />;

  if (totalCount === 0) {
    return (
      <div className='border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left'>
        <BlankPageSketch />
        <div className='flex-1 space-y-1.5'>
          <h3 className='font-serif text-lg font-bold text-stone-900'>
            Chưa có bộ truyện nào trong Studio này
          </h3>
          <p className='text-sm text-stone-600 leading-relaxed max-w-xl'>
            Tạo bộ truyện đầu tiên để chọn thể loại, chiều đọc và mẫu quy trình sản xuất, rồi mời
            Writer, Artist vào từng bộ.
          </p>
          {!canCreate && (
            <p className='text-xs text-stone-500'>
              Chỉ Producer của Studio mới tạo được bộ truyện.
            </p>
          )}
        </div>
        {canCreate && (
          <button
            type='button'
            onClick={onCreateSeries}
            className='btn-cta-primary focus-ring min-h-10 px-5 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shrink-0'
          >
            <Plus className='w-4 h-4' aria-hidden='true' />
            <span>Tạo bộ truyện ngay</span>
          </button>
        )}
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className='bg-white border border-stone-200/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4'>
        <div className='bg-stone-100 text-stone-500 p-3 rounded-xl self-start' aria-hidden='true'>
          <Search className='w-5 h-5' />
        </div>
        <div className='flex-1'>
          <h3 className='text-sm font-bold text-stone-900'>Không tìm thấy bộ truyện phù hợp</h3>
          <p className='text-xs text-stone-600 leading-relaxed'>
            Không có bộ truyện nào khớp với từ khóa tìm kiếm hoặc bộ lọc đã chọn.
          </p>
        </div>
        <button
          type='button'
          onClick={onClearFilters}
          className='focus-ring min-h-9 inline-flex items-center gap-1.5 px-4 text-xs font-semibold text-orange-800 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-full transition-colors cursor-pointer self-start sm:self-auto'
        >
          <X className='w-3.5 h-3.5' aria-hidden='true' />
          <span>Xóa tất cả bộ lọc</span>
        </button>
      </div>
    );
  }

  return (
    <div className={SHELF_GRID}>
      {series.map((s) => (
        <SeriesCardItem
          key={s.id}
          series={s}
          isProducerOrAdmin={canCreate}
          isOpenMenu={openMenuSeriesId === s.id}
          onToggleMenu={(e) => {
            e.stopPropagation();
            onToggleMenu(s.id);
          }}
          {...cardActions}
        />
      ))}
    </div>
  );
};
