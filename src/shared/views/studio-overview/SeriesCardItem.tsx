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
  PenTool,
  BookOpen,
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

/** Thẻ bộ truyện Stitch phong cách Manga Studio Editorial */
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
    <span className='font-serif text-5xl font-bold text-stone-400 select-none'>
      {s.title.trim().charAt(0).toUpperCase()}
    </span>
  );

  const isCompleted = s.isCompleted;
  const isPreProd = !isCompleted && (s.chaptersCount ?? 0) === 0;
  const isInProd = !isCompleted && (s.chaptersCount ?? 0) > 0;

  const pct = isCompleted
    ? 100
    : isPreProd
      ? 15
      : Math.min(95, Math.max(30, (s.chaptersCount ?? 1) * 16));

  const progressColor = isCompleted
    ? 'bg-emerald-600'
    : isPreProd
      ? 'bg-amber-500'
      : 'bg-orange-600';

  const statusBadgeColor = isCompleted
    ? 'bg-stone-700 text-white'
    : isPreProd
      ? 'bg-amber-500 text-white'
      : 'bg-emerald-600 text-white';

  const seriesCode = (s as any).code || s.id.substring(0, 6).toUpperCase();

  return (
    <article className='series-card group relative bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow min-w-0'>
      <div>
        {/* Cover Header Banner */}
        <div className='relative w-full h-48 bg-stone-100 overflow-hidden'>
          <button
            type='button'
            onClick={() => onOpenSeries(s.id)}
            aria-label={`${openLabel}: ${s.title}`}
            title={`${openLabel}: ${s.title}`}
            className='focus-ring block w-full h-full relative cursor-pointer text-left'
          >
            {displayCoverUrl ? (
              <AuthenticatedImage
                src={displayCoverUrl}
                alt=''
                loading='lazy'
                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                fallback={
                  <div className='w-full h-full bg-gradient-to-br from-stone-200 via-stone-100 to-orange-50 flex items-center justify-center'>
                    {initial}
                  </div>
                }
              />
            ) : (
              <div className='w-full h-full bg-gradient-to-br from-stone-200 via-stone-100 to-orange-50 flex items-center justify-center'>
                {initial}
              </div>
            )}
            <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none' />

            {/* Bottom Title & Subtitle Over Cover */}
            <div className='absolute bottom-3 left-3 right-3 pointer-events-none'>
              <h3 className='text-xl text-white font-bold drop-shadow-sm line-clamp-1'>
                {s.title}
              </h3>
              <span className='text-[11px] text-stone-200 line-clamp-1 mt-0.5'>
                {s.synopsis || 'Dự án sản xuất truyện tranh'} • Mã: {seriesCode}
              </span>
            </div>
          </button>

          {/* Top Left Badges */}
          <div className='absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none'>
            <span className='px-2 py-0.5 rounded-md bg-white/95 backdrop-blur text-[11px] font-semibold text-stone-800 shadow-xs'>
              {formatGenre(s.genre || s.format)}
            </span>
            <span className='px-2 py-0.5 rounded-md bg-white/95 backdrop-blur text-[11px] font-medium text-stone-600 shadow-xs'>
              {formatReadingDirection(s.readingDirection).label}
            </span>
          </div>

          {/* Top Right Status Badge & Menu */}
          <div className='absolute top-3 right-3 flex items-center gap-1.5 z-10'>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold shadow-xs flex items-center gap-1 ${statusBadgeColor}`}
            >
              {isCompleted ? 'Hoàn thành' : isPreProd ? 'Tiền kỳ' : 'Đang sản xuất'}
            </span>

            {/* Accessible 3-dots Menu for Producer / Admin */}
            {isProducerOrAdmin && (
              <div className='relative shrink-0' data-series-options-menu>
                <button
                  type='button'
                  onClick={onToggleMenu}
                  className='p-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 shadow-xs transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center'
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
                    className='absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-stone-200 z-30 py-1 overflow-hidden animate-in fade-in-50 zoom-in-95'
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

        {/* Card Body */}
        <div className='p-4 flex flex-col gap-3.5'>
          {/* Progress Block */}
          <div className='flex flex-col gap-1.5'>
            <div className='flex items-center justify-between text-xs'>
              <span className='font-semibold text-stone-800 flex items-center gap-1'>
                <PenTool className='w-3.5 h-3.5 text-orange-600' />
                Tiến độ: {pct}%
              </span>
              <span className='text-stone-500'>
                {s.chaptersCount ? `${s.chaptersCount} Chương` : 'Bản thảo Name'}
              </span>
            </div>
            <div className='w-full bg-stone-100 h-2 rounded-full overflow-hidden'>
              <div
                className={`${progressColor} h-full rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className='flex items-center justify-between text-[11px] text-stone-500'>
              <span className='text-stone-700 font-medium truncate'>
                {isCompleted
                  ? 'Xuất bản ấn phẩm giấy & chuyển ngữ'
                  : isPreProd
                    ? 'Chương 1 đang viết kịch bản & vẽ tạo hình'
                    : `Chương ${s.chaptersCount ?? 1} đang sản xuất`}
              </span>
            </div>
          </div>

          {/* Metadata Box */}
          <div className='flex items-center justify-between bg-[#FAF9F5] px-3 py-2 rounded-lg border border-stone-200 text-xs'>
            <div className='flex items-center gap-1.5 text-stone-700 font-medium truncate'>
              <BookOpen className='w-3.5 h-3.5 text-sky-600 shrink-0' />
              <span className='truncate'>{s.format || 'Tiêu chuẩn'} • {formatGenre(s.genre)}</span>
            </div>
            <span className='text-[11px] text-stone-600 font-medium shrink-0'>
              {s.chaptersCount} chương · {formatReadingDirection(s.readingDirection).label}
            </span>
          </div>

          {/* Status Details Row */}
          <div className='flex items-center justify-between text-xs text-stone-600'>
            <span>Tiến độ chương:</span>
            <span className='font-semibold text-stone-900'>
              {s.chaptersCount ? `${s.chaptersCount} Chương đã tạo` : 'Khởi tạo bản thảo'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Bottom CTA */}
      <div className='p-4 pt-0'>
        <button
          type='button'
          onClick={() => onOpenSeries(s.id)}
          aria-label={`Không gian làm việc: ${s.title}`}
          className='w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer'
          data-testid={`open-series-btn-${s.id}`}
        >
          <span>Mở không gian truyện</span>
          <ArrowRight className='w-4 h-4' />
        </button>
      </div>
    </article>
  );
};
