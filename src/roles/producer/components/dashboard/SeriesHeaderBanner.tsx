import React, { useState } from 'react';
import { ArrowRight, BookOpen, Camera, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { IdentityBanner } from '@/shared/components/IdentityBanner';
import { SeriesImagePickerDialog } from '@/shared/features/series-identity/SeriesImagePickerDialog';
import {
  SeriesAvatarFallback,
  SeriesBannerFallback,
} from '@/shared/features/series-identity/SeriesImageFallbacks';
import { SERIES_BANNER_POSITION } from '@/shared/utils/seriesImagePresets';
import type { SeriesDetailDto, SeriesImageKind } from '@/services/series.service';
import type { MangaProject } from '@/types';

// Ink-bleed title filter and brush underline are the series page's identity motif (manuscript ink on paper).
const INK_STYLES = `
  .pf-ink-bleed-title { filter: url(#pf-manuscript-ink-bleed); color: #1c1917; }
  @supports not (filter: url(#pf-manuscript-ink-bleed)) { .pf-ink-bleed-title { filter: none; } }
  @keyframes pfBrushWipe {
    0% { clip-path: inset(0 100% 0 0); opacity: 0; }
    100% { clip-path: inset(0 0 0 0); opacity: 0.85; }
  }
  .pf-brush-wipe { animation: pfBrushWipe 600ms cubic-bezier(0.16, 1, 0.3, 1) 180ms both; }
  @media (prefers-reduced-motion: reduce) { .pf-brush-wipe { animation: none; } }
`;

const SECONDARY_BTN =
  'focus-ring h-9 px-3 rounded-lg bg-white border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 disabled:opacity-50 disabled:cursor-not-allowed';

const TAG = 'px-2 py-0.5 rounded-md bg-white text-stone-800 border border-stone-200 break-words';

const cleanSynopsis = (raw: unknown): string | null => {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text || ['n/a', 'null', 'undefined'].includes(text.toLowerCase())) return null;
  return text;
};

interface SeriesHeaderBannerProps {
  seriesId?: string;
  seriesTitle: string;
  seriesDetail: SeriesDetailDto | null;
  activeProject?: MangaProject;
  workspaceName: string;
  chapterCount: number;
  loading: boolean;
  generatedAt?: string | null;
  canManageImages: boolean;
  onImageApplied: (kind: SeriesImageKind, url: string) => void;
  onOpenChapters: () => void;
  onRefresh: () => void;
  onOpenPipeline?: () => void;
}

export const SeriesHeaderBanner: React.FC<SeriesHeaderBannerProps> = ({
  seriesId,
  seriesTitle,
  seriesDetail,
  activeProject,
  workspaceName,
  chapterCount,
  loading,
  generatedAt,
  canManageImages,
  onImageApplied,
  onOpenChapters,
  onRefresh,
  onOpenPipeline,
}) => {
  const [imageDialogKind, setImageDialogKind] = useState<SeriesImageKind | null>(null);
  const showImageControls = canManageImages && !!seriesId;
  const format = seriesDetail?.format || activeProject?.format;
  const genre = seriesDetail?.genre || activeProject?.genres?.[0];
  const synopsis = cleanSynopsis(seriesDetail?.synopsis || activeProject?.subtitle);

  return (
    <>
      <style>{INK_STYLES}</style>
      <svg
        width='0'
        height='0'
        className='absolute pointer-events-none'
        aria-hidden='true'
        focusable='false'
      >
        <defs>
          <filter id='pf-manuscript-ink-bleed' x='-10%' y='-10%' width='120%' height='120%'>
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.065 0.065'
              numOctaves='2'
              seed='23'
              result='grain'
            />
            <feDisplacementMap
              in='SourceGraphic'
              in2='grain'
              scale='1.2'
              xChannelSelector='R'
              yChannelSelector='G'
            />
          </filter>
        </defs>
      </svg>

      <IdentityBanner
        size='compact'
        ariaLabel='Nhận diện bộ truyện và điều phối'
        testId='series-banner'
        background={
          seriesDetail?.bannerUrl ? (
            <AuthenticatedImage
              key={seriesDetail.bannerUrl}
              src={seriesDetail.bannerUrl}
              alt=''
              data-testid='series-banner-img'
              className='w-full h-full object-cover'
              style={{ objectPosition: SERIES_BANNER_POSITION }}
              fallback={<SeriesBannerFallback />}
            />
          ) : (
            <SeriesBannerFallback />
          )
        }
        topLeft={
          showImageControls ? (
            <button
              type='button'
              onClick={() => setImageDialogKind('banner')}
              data-testid='change-series-banner-btn'
              className='focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/90 hover:bg-white border border-stone-200 px-3 text-xs font-semibold text-stone-900 shadow-xs cursor-pointer'
            >
              <ImageIcon className='w-3.5 h-3.5 text-orange-700' aria-hidden='true' />
              Đổi banner Series
            </button>
          ) : undefined
        }
        avatar={
          <div className='relative'>
            <div className='w-24 sm:w-28 lg:w-32 aspect-[3/4] rounded-xl sm:rounded-2xl border-[3px] border-[#FCFBF8] bg-white p-0.5 shadow-md overflow-hidden shrink-0'>
              {seriesDetail?.avatarUrl ? (
                <AuthenticatedImage
                  key={seriesDetail.avatarUrl}
                  src={seriesDetail.avatarUrl}
                  alt={`Avatar ${seriesTitle}`}
                  data-testid='series-avatar-img'
                  className='w-full h-full rounded-[13px] object-cover'
                  fallback={<SeriesAvatarFallback title={seriesTitle} />}
                />
              ) : (
                <SeriesAvatarFallback title={seriesTitle} />
              )}
            </div>
            {showImageControls && (
              <button
                type='button'
                onClick={() => setImageDialogKind('avatar')}
                aria-label='Đổi avatar Series'
                title='Đổi avatar Series'
                data-testid='change-series-avatar-btn'
                className='focus-ring absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-white border-2 border-stone-200 text-stone-800 hover:border-orange-400 hover:text-orange-700 flex items-center justify-center shadow-md cursor-pointer'
              >
                <Camera className='w-4 h-4' aria-hidden='true' />
              </button>
            )}
          </div>
        }
      >
        <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600'>
          <div className='flex items-center gap-1.5 min-w-0'>
            <span className='px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-800 font-semibold'>
              Bản thảo Studio
            </span>
            <span className='text-stone-400' aria-hidden='true'>
              /
            </span>
            <span className='font-medium text-stone-700 truncate'>{workspaceName}</span>
          </div>
          {loading ? (
            <span className='inline-flex items-center gap-1.5 text-orange-700'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
              Đang nạp…
            </span>
          ) : generatedAt ? (
            <span className='inline-flex items-center gap-1.5'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true' />
              Đồng bộ: {new Date(generatedAt).toLocaleTimeString('vi-VN')}
            </span>
          ) : null}
        </div>

        <div className='relative inline-block max-w-full'>
          <h1
            className='pf-ink-bleed-title relative z-10 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight break-words [overflow-wrap:anywhere]'
            data-testid='series-title'
          >
            <span className='sr-only'>Tổng quan bộ truyện: </span>
            {seriesTitle}
          </h1>
          <svg
            className='pf-brush-wipe absolute -bottom-1.5 left-0 w-full max-w-[320px] h-[14px] pointer-events-none z-0 overflow-visible'
            viewBox='0 0 340 18'
            fill='none'
            aria-hidden='true'
          >
            <path
              d='M 2 11 C 18 6.5, 48 9.0, 92 7.5 C 146 5.8, 218 10.0, 276 7.2 C 308 5.8, 328 7.6, 338 6.2 C 334 9.5, 304 12.0, 268 11.4 C 208 10.8, 142 14.0, 88 12.2 C 48 11.0, 16 13.0, 2 11 Z'
              fill='#F97316'
              opacity='0.85'
            />
          </svg>
        </div>

        <div className='flex flex-wrap items-center gap-1.5 text-xs font-semibold font-mono text-stone-700'>
          {seriesDetail?.storyArc && <span className={TAG}>{seriesDetail.storyArc}</span>}
          {format && (
            <span className='px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 font-bold'>
              {format}
            </span>
          )}
          {genre && <span className={TAG}>{genre}</span>}
          {seriesDetail?.readingDirection && (
            <span className={TAG}>
              {seriesDetail.readingDirection === 'Vertical' ? 'Cuộn dọc' : 'Phải sang trái'}
            </span>
          )}
          <span className={TAG}>{chapterCount} Chương</span>
        </div>

        {synopsis && (
          <p className='text-sm text-stone-700 leading-relaxed max-w-2xl break-words line-clamp-2'>
            {synopsis}
          </p>
        )}

        <div className='flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-stone-200/70'>
          <div className='flex flex-wrap items-center gap-2'>
            {seriesId && (
              <button
                type='button'
                onClick={onOpenChapters}
                className={SECONDARY_BTN}
                title='Quản lý danh sách chương, kiểm duyệt và điều phối tập truyện'
              >
                <BookOpen className='w-3.5 h-3.5 text-orange-600' aria-hidden='true' />
                <span>Quản Lý Chương (Duyệt)</span>
              </button>
            )}
            <button
              type='button'
              onClick={onRefresh}
              disabled={loading}
              className={SECONDARY_BTN}
              title='Làm mới dữ liệu tiến độ từ máy chủ'
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden='true'
              />
              <span className='sr-only sm:not-sr-only'>Làm mới</span>
            </button>
          </div>

          {onOpenPipeline && (
            <button
              type='button'
              onClick={onOpenPipeline}
              className='btn-cta-primary focus-ring h-9 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-[0.98]'
            >
              <span>Mở Quy trình sản xuất</span>
              <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
            </button>
          )}
        </div>
      </IdentityBanner>

      {imageDialogKind && seriesId && (
        <SeriesImagePickerDialog
          seriesId={seriesId}
          kind={imageDialogKind}
          currentUrl={
            (imageDialogKind === 'avatar' ? seriesDetail?.avatarUrl : seriesDetail?.bannerUrl) ??
            null
          }
          onClose={() => setImageDialogKind(null)}
          onApplied={(url) => onImageApplied(imageDialogKind, url)}
        />
      )}
    </>
  );
};
