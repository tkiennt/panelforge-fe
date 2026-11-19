import React from 'react';
import {
  MoreVertical,
  Sliders,
  ListOrdered,
  ImagePlus,
  ImageOff,
  Edit2,
  Trash2,
  Users,
  ArrowRight,
} from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { formatGenre, formatReadingDirection } from './formatters';

export interface SeriesCardItemProps {
  series: SeriesDto;
  isProducerOrAdmin: boolean;
  isOpenMenu: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onOpenSeries: (seriesId: string) => void;
  onOpenPipeline: (series: { id: string; title: string }) => void;
  onOpenPresets: (series: { id: string; title: string }) => void;
  onOpenMembers?: (series: { id: string; title: string }) => void;
  onPickCover: (series: { id: string; title: string }) => void;
  onClearCover: (seriesId: string) => void;
  onEditSeries: (series: SeriesDto) => void;
  onDeleteSeries: (series: SeriesDto) => void;
  /** Nhãn mở theo vai trò (DESIGN_RULES 5.1); mặc định "Mở bộ truyện". */
  openLabel?: string;
}

/** Thẻ bộ truyện tối giản: bấm ảnh bìa để mở, bên dưới chỉ có thể loại, tên và số chương. */
export const SeriesCardItem: React.FC<SeriesCardItemProps> = ({
  series: s,
  isProducerOrAdmin,
  isOpenMenu,
  onToggleMenu,
  onOpenSeries,
  onOpenPipeline,
  onOpenPresets,
  onOpenMembers,
  onPickCover,
  onClearCover,
  onEditSeries,
  onDeleteSeries,
  openLabel = 'Mở bộ truyện',
}) => {
  const displayCoverUrl = s.coverUrl || s.avatarUrl;
  const initial = (
    <span className='absolute inset-0 flex items-center justify-center font-serif text-5xl font-bold text-stone-400/70 group-hover:text-orange-500/70 transition-colors select-none'>
      {s.title.trim().charAt(0).toUpperCase()}
    </span>
  );

  return (
    <article className='group relative min-w-0'>
      <div className='relative'>
        <button
          type='button'
          onClick={() => onOpenSeries(s.id)}
          aria-label={`${openLabel}: ${s.title}`}
          title={`${openLabel}: ${s.title}`}
          className='focus-ring relative block w-full aspect-[3/4] overflow-hidden rounded-xl border border-stone-200/80 bg-gradient-to-br from-stone-100 via-[#FCFBF8] to-stone-200/80 shadow-soft-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-orange-300 group-hover:shadow-soft-md cursor-pointer'
        >
          {displayCoverUrl ? (
            <AuthenticatedImage
              src={displayCoverUrl}
              alt=''
              loading='lazy'
              className='absolute inset-0 w-full h-full object-cover'
              fallback={initial}
            />
          ) : (
            initial
          )}
        </button>
        <div className='absolute top-2 right-2'>
          {/* Accessible 3-dots Menu for Producer / Admin */}
          {isProducerOrAdmin && (
            <div className='relative shrink-0' data-series-options-menu>
              <button
                type='button'
                onClick={onToggleMenu}
                className='p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center'
                aria-label={`Tùy chọn cho bộ truyện ${s.title}`}
                aria-haspopup='menu'
                aria-expanded={isOpenMenu}
              >
                <MoreVertical className='w-4 h-4' />
              </button>

              {isOpenMenu && (
                <div
                  role='menu'
                  aria-label={`Tùy chọn ${s.title}`}
                  className='absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-stone-200 z-20 py-1 overflow-hidden'
                >
                  <button
                    type='button'
                    role='menuitem'
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPipeline({ id: s.id, title: s.title });
                    }}
                    className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                  >
                    <Sliders className='w-3.5 h-3.5 text-blue-500' />
                    <span>Cấu hình Pipeline</span>
                  </button>
                  <button
                    type='button'
                    role='menuitem'
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPresets({ id: s.id, title: s.title });
                    }}
                    className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                  >
                    <ListOrdered className='w-3.5 h-3.5 text-purple-500' />
                    <span>Typography Presets</span>
                  </button>
                  {onOpenMembers && (
                    <button
                      type='button'
                      role='menuitem'
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMembers({ id: s.id, title: s.title });
                      }}
                      className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                    >
                      <Users className='w-3.5 h-3.5 text-emerald-600' />
                      <span>Đội ngũ Series</span>
                    </button>
                  )}
                  <div className='border-t border-stone-100 my-1' />
                  <button
                    type='button'
                    role='menuitem'
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickCover({ id: s.id, title: s.title });
                    }}
                    className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                  >
                    <ImagePlus className='w-3.5 h-3.5 text-orange-500' />
                    <span>{s.coverUrl ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}</span>
                  </button>
                  {s.coverUrl && (
                    <button
                      type='button'
                      role='menuitem'
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearCover(s.id);
                      }}
                      className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                    >
                      <ImageOff className='w-3.5 h-3.5 text-stone-500' />
                      <span>Xoá ảnh bìa</span>
                    </button>
                  )}
                  <button
                    type='button'
                    role='menuitem'
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSeries(s);
                    }}
                    className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                  >
                    <Edit2 className='w-3.5 h-3.5 text-stone-600' />
                    <span>Chỉnh sửa thông tin</span>
                  </button>
                  <button
                    type='button'
                    role='menuitem'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSeries(s);
                    }}
                    className='w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    <span>Xóa bộ truyện</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className='mt-2.5 text-xs font-medium text-orange-700 truncate'>
        {formatGenre(s.genre || s.format)}
      </p>
      <h3
        className='mt-0.5 font-serif text-base font-bold leading-snug text-stone-900 line-clamp-2 break-words'
        title={s.title}
      >
        {s.title}
      </h3>
      <p className='mt-1 text-xs text-stone-500 truncate'>
        <span className='font-mono tabular-nums text-stone-700'>{s.chaptersCount ?? 0}</span> chương
        · {formatReadingDirection(s.readingDirection).label}
      </p>

      <button
        type='button'
        onClick={() => onOpenSeries(s.id)}
        aria-label={`Không gian làm việc: ${s.title}`}
        className='mt-3.5 w-full btn-cta-primary focus-ring min-h-9 py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer'
        data-testid={`open-series-btn-${s.id}`}
      >
        <span>Mở không gian truyện</span>
        <ArrowRight className='w-3.5 h-3.5' />
      </button>
    </article>
  );
};
