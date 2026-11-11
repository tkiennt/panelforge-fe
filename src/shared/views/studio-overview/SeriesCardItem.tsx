import React from 'react';
import {
  MoreVertical,
  Sliders,
  ListOrdered,
  ImagePlus,
  ImageOff,
  Edit2,
  Trash2,
  Compass,
  History,
  BookOpen,
  ArrowRight,
  Users,
} from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { SeriesAvatarFallback } from '@/shared/features/series-identity/SeriesImageFallbacks';
import { formatGenre, formatReadingDirection, formatSeriesDate } from './formatters';

export interface SeriesCardItemProps {
  series: SeriesDto;
  isProducerOrAdmin: boolean;
  isOpenMenu: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onOpenSeries: (seriesId: string) => void;
  onOpenChapters: (series: { id: string; title: string }) => void;
  onOpenPipeline: (series: { id: string; title: string }) => void;
  onOpenPresets: (series: { id: string; title: string }) => void;
  onOpenMembers?: (series: { id: string; title: string }) => void;
  onPickCover: (series: { id: string; title: string }) => void;
  onClearCover: (seriesId: string) => void;
  onEditSeries: (series: SeriesDto) => void;
  onDeleteSeries: (series: SeriesDto) => void;
  /** Nhãn nút mở theo vai trò (DESIGN_RULES 5.1); mặc định "Mở bộ truyện". */
  openLabel?: string;
}

export const SeriesCardItem: React.FC<SeriesCardItemProps> = ({
  series: s,
  isProducerOrAdmin,
  isOpenMenu,
  onToggleMenu,
  onOpenSeries,
  onOpenChapters,
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

  return (
    <article className='group relative flex flex-col justify-between rounded-2xl bg-[#FCFBF8] border border-stone-200/80 hover:border-orange-400/80 hover:shadow-soft-md shadow-soft-xs transition-all duration-200 p-4 sm:p-5'>
      {/* Top Section: Left Thumbnail + Right Metadata */}
      <div>
        <div className='flex items-start gap-3.5'>
          {/* Manga Style Thumbnail Fallback */}
          <div
            onClick={() => onOpenSeries(s.id)}
            className='w-20 sm:w-24 shrink-0 aspect-[3/4] rounded-xl overflow-hidden relative border border-stone-200/70 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/80 flex flex-col justify-between p-2 shadow-2xs group-hover:border-orange-200 transition-colors cursor-pointer'
            title={`Mở ${s.title}`}
          >
            {displayCoverUrl && (
              <AuthenticatedImage
                src={displayCoverUrl}
                alt={`Bìa ${s.title}`}
                className='absolute inset-0 w-full h-full object-cover'
                fallback={null}
              />
            )}
            {/* Top indicator: Chapter badge */}
            <span className='relative text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/90 text-stone-700 shadow-2xs self-start backdrop-blur-xs border border-stone-200/50'>
              #{s.chaptersCount ?? 0}
            </span>

            {/* Center: Serif Initial */}
            <div className='flex-1 flex items-center justify-center'>
              {!displayCoverUrl && (
                <span className='text-3xl sm:text-4xl font-serif font-bold text-stone-400/60 group-hover:text-orange-500/70 transition-colors select-none'>
                  {s.title.trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Bottom tag: Direction badge */}
            <div className='relative text-[9px] font-medium text-stone-500 text-center truncate bg-white/80 rounded px-1 py-0.5 border border-stone-200/40'>
              {formatReadingDirection(s.readingDirection).shortLabel}
            </div>
          </div>

          {/* Title & Info */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between gap-2'>
              <span className='inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium border border-stone-200/70 truncate'>
                {formatGenre(s.genre || s.format)}
              </span>

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

            {/* Series Title + avatar vuông nhận diện (bìa dọc giữ nguyên bên trái) */}
            <div className='flex items-start gap-2 mt-1.5 min-w-0'>
              <span
                className='w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-[#D8D2C5] bg-[#FFF2E6] text-[14px]'
                data-testid={`series-card-avatar-${s.id}`}
              >
                {s.avatarUrl ? (
                  <AuthenticatedImage
                    src={s.avatarUrl}
                    alt=''
                    className='w-full h-full object-cover'
                    fallback={<SeriesAvatarFallback title={s.title} className='rounded-none' />}
                  />
                ) : (
                  <SeriesAvatarFallback title={s.title} className='rounded-none' />
                )}
              </span>
              <h3
                onClick={() => onOpenSeries(s.id)}
                className='min-w-0 text-base sm:text-lg font-serif font-bold text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug cursor-pointer break-words'
                title={s.title}
              >
                {s.title}
              </h3>
            </div>

            {/* Synopsis */}
            {s.synopsis ? (
              <p
                className='text-xs text-stone-600 line-clamp-2 leading-relaxed mt-1.5'
                title={s.synopsis}
              >
                {s.synopsis}
              </p>
            ) : (
              <p className='text-xs text-stone-400 italic mt-1.5'>Chưa có phần tóm tắt nội dung</p>
            )}

            {/* Story Arc */}
            {s.storyArc && (
              <div className='mt-2 px-2 py-1 bg-amber-50/80 border border-amber-200/60 rounded-md text-[11px] text-amber-900 line-clamp-1'>
                <span className='font-semibold text-amber-700 mr-1'>Arc:</span>
                {s.storyArc}
              </div>
            )}
          </div>
        </div>

        {/* Middle Metadata: Direction and Update/Creation Date */}
        <div className='mt-3.5 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500'>
          <div className='flex items-center gap-1.5'>
            <Compass className='w-3.5 h-3.5 text-stone-400' />
            <span className='text-stone-600 font-medium'>
              {formatReadingDirection(s.readingDirection).label}
            </span>
          </div>

          {(s.updatedAt || s.createdAt) && (
            <div
              className='flex items-center gap-1 text-[11px] text-stone-400'
              title={`Cập nhật: ${formatSeriesDate(s.updatedAt || s.createdAt)}`}
            >
              <History className='w-3 h-3 text-stone-400' />
              <span>{formatSeriesDate(s.updatedAt || s.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions Footer: Primary Open Button + Secondary Chapters Button */}
      <div className='mt-4 pt-3.5 border-t border-stone-100 flex items-center gap-2'>
        {/* Main Action: Open Series (Route to user's role workspace) */}
        <button
          type='button'
          onClick={() => onOpenSeries(s.id)}
          className='flex-1 h-11 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-soft-xs hover:shadow-soft-sm active:scale-98 cursor-pointer'
          title={`Mở không gian làm việc của bộ truyện ${s.title}`}
        >
          <span>{openLabel}</span>
          <ArrowRight className='w-3.5 h-3.5 text-orange-400' />
        </button>

        {/* Manage Series Team Members */}
        {isProducerOrAdmin && onOpenMembers && (
          <button
            type='button'
            onClick={() => onOpenMembers({ id: s.id, title: s.title })}
            className='h-11 px-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0'
            title={`Quản lý đội ngũ nhân sự và phân quyền của ${s.title}`}
          >
            <Users className='w-3.5 h-3.5 text-emerald-600' />
            <span>Đội ngũ</span>
          </button>
        )}

        {/* Secondary Action: Manage Chapters Modal */}
        <button
          type='button'
          onClick={() => onOpenChapters({ id: s.id, title: s.title })}
          className='h-11 px-3 bg-stone-100 hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 border border-stone-200/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0'
          title={`Xem danh sách các chương của ${s.title}`}
        >
          <BookOpen className='w-3.5 h-3.5 text-orange-500' />
          <span>Chương ({s.chaptersCount ?? 0})</span>
        </button>
      </div>
    </article>
  );
};
