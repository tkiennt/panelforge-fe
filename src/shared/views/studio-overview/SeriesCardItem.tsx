import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  MoreVertical,
  Sliders,
  ListOrdered,
  ImagePlus,
  ImageOff,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  Eye,
} from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import {
  SeriesAvatarFallback,
  SeriesBannerFallback,
} from '@/shared/features/series-identity/SeriesImageFallbacks';
import { Card } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { formatGenre, formatReadingDirection } from './formatters';
import {
  hasNativeInvoker,
  invokerAttrs,
  positionPopoverFallback,
  safeHidePopover,
  safeShowPopover,
} from './popoverMenu';

export type SeriesCardVariant = 'list' | 'grid';

export interface SeriesCardItemProps {
  series: SeriesDto;
  isProducerOrAdmin: boolean;
  isOpenMenu?: boolean;
  onToggleMenu?: (e: React.MouseEvent) => void;
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
  /** Lượt xem của bộ truyện (chỉ Producer có dữ liệu thống kê); hiển thị khi > 0. */
  views?: number;
  /** 'list' = thẻ ngang (mặc định); 'grid' = thẻ bìa dọc. */
  variant?: SeriesCardVariant;
}

const SeriesCoverFallback: React.FC<{ title: string }> = ({ title }) => (
  <div className='relative w-full h-full flex items-center justify-center'>
    <SeriesBannerFallback />
    <div className='relative z-10 w-20 h-28 shadow-xs transition-studio-transform group-hover/cover:scale-[1.03]'>
      <SeriesAvatarFallback title={title} />
    </div>
  </div>
);

/** "3 ngày trước" / "hôm qua" theo ngôn ngữ i18n hiện hành (Intl, không ghi cứng locale). */
const formatRelativeUpdated = (raw: string | null | undefined, lang: string): string | null => {
  if (!raw) return null;
  const time = new Date(raw).getTime();
  if (Number.isNaN(time)) return null;
  const diffSec = Math.round((time - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSec) >= seconds) return rtf.format(Math.round(diffSec / seconds), unit);
  }
  return rtf.format(0, 'minute');
};

interface SeriesOptionsMenuProps {
  series: SeriesDto;
  onOpenPipeline: SeriesCardItemProps['onOpenPipeline'];
  onOpenPresets: SeriesCardItemProps['onOpenPresets'];
  onOpenMembers?: SeriesCardItemProps['onOpenMembers'];
  onPickCover: SeriesCardItemProps['onPickCover'];
  onClearCover: SeriesCardItemProps['onClearCover'];
  onEditSeries: SeriesCardItemProps['onEditSeries'];
  onDeleteSeries: SeriesCardItemProps['onDeleteSeries'];
}

/** Nút ⋮ (luôn hiển thị) + menu Popover API; hành động giữ nguyên như trước. */
const SeriesOptionsMenu: React.FC<SeriesOptionsMenuProps> = ({
  series: s,
  onOpenPipeline,
  onOpenPresets,
  onOpenMembers,
  onPickCover,
  onClearCover,
  onEditSeries,
  onDeleteSeries,
}) => {
  const { t } = useTranslation();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const onToggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === 'open';
      setMenuOpen(open);
      if (open) {
        positionPopoverFallback(triggerRef.current, menu);
      }
    };
    menu.addEventListener('toggle', onToggle);
    return () => menu.removeEventListener('toggle', onToggle);
  }, []);

  const handleToggleMenuClick = () => {
    if (hasNativeInvoker()) return;
    const menu = menuRef.current;
    const nextOpen = !menuOpen;
    if (nextOpen) {
      positionPopoverFallback(triggerRef.current, menu);
      safeShowPopover(menu, triggerRef.current);
      setMenuOpen(true);
    } else {
      safeHidePopover(menu);
      setMenuOpen(false);
    }
  };

  const runMenuAction = (action: () => void) => {
    safeHidePopover(menuRef.current);
    setMenuOpen(false);
    action();
  };

  return (
    <div className='shrink-0' data-series-options-menu>
      <button
        ref={triggerRef}
        type='button'
        data-testid={`series-options-btn-${s.id}`}
        aria-label={t('workspace.seriesCard.optionsForSeries', { title: s.title })}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        {...invokerAttrs(menuId)}
        onClick={handleToggleMenuClick}
        className='focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-studio hover:bg-head-wash hover:text-stone-900 cursor-pointer'
      >
        <MoreVertical className='size-4' aria-hidden='true' />
      </button>

      <div
        ref={menuRef}
        id={menuId}
        popover='auto'
        data-placement='bottom-end'
        data-testid={`series-options-menu-${s.id}`}
        aria-label={t('workspace.seriesCard.optionsMenuAria', { title: s.title })}
        className={`pf-sb-popover-menu w-52 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 text-stone-900 ${
          !hasNativeInvoker() && !menuOpen ? 'hidden' : ''
        }`}
      >
        <button
          type='button'
          onClick={() => runMenuAction(() => onOpenPipeline({ id: s.id, title: s.title }))}
          className='focus-ring w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-head-wash hover:text-stone-900 flex items-center gap-2 transition-studio cursor-pointer'
        >
          <Sliders className='w-3.5 h-3.5 text-blue-600 shrink-0' aria-hidden='true' />
          <span>{t('workspace.studioHub.series.menuPipeline')}</span>
        </button>
        <button
          type='button'
          onClick={() => runMenuAction(() => onOpenPresets({ id: s.id, title: s.title }))}
          className='focus-ring w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-head-wash hover:text-stone-900 flex items-center gap-2 transition-studio cursor-pointer'
        >
          <ListOrdered className='w-3.5 h-3.5 text-stone-600 shrink-0' aria-hidden='true' />
          <span>{t('workspace.studioHub.series.menuTypography')}</span>
        </button>
        {onOpenMembers && (
          <button
            type='button'
            onClick={() => runMenuAction(() => onOpenMembers({ id: s.id, title: s.title }))}
            className='focus-ring w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-head-wash hover:text-stone-900 flex items-center gap-2 transition-studio cursor-pointer'
          >
            <Users className='w-3.5 h-3.5 text-emerald-600 shrink-0' aria-hidden='true' />
            <span>{t('workspace.studioHub.series.menuCrew')}</span>
          </button>
        )}
        <hr className='border-stone-100 my-1' />
        <button
          type='button'
          onClick={() => runMenuAction(() => onPickCover({ id: s.id, title: s.title }))}
          className='focus-ring w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-head-wash hover:text-stone-900 flex items-center gap-2 transition-studio cursor-pointer'
        >
          <ImagePlus className='w-3.5 h-3.5 text-accent-dark shrink-0' aria-hidden='true' />
          <span>
            {s.coverUrl
              ? t('workspace.studioHub.series.menuChangeCover')
              : t('workspace.studioHub.series.menuAddCover')}
          </span>
        </button>
        {s.coverUrl && (
          <button
            type='button'
            onClick={() => runMenuAction(() => onClearCover(s.id))}
            className='focus-ring w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-head-wash hover:text-stone-900 flex items-center gap-2 transition-studio cursor-pointer'
          >
            <ImageOff className='w-3.5 h-3.5 text-stone-500 shrink-0' aria-hidden='true' />
            <span>{t('workspace.studioHub.series.menuClearCover')}</span>
          </button>
        )}
        <button
          type='button'
          onClick={() => runMenuAction(() => onEditSeries(s))}
          className='focus-ring w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-head-wash hover:text-stone-900 flex items-center gap-2 transition-studio cursor-pointer'
        >
          <Edit2 className='w-3.5 h-3.5 text-stone-600 shrink-0' aria-hidden='true' />
          <span>{t('workspace.studioHub.series.menuEdit')}</span>
        </button>
        <button
          type='button'
          onClick={() => runMenuAction(() => onDeleteSeries(s))}
          className='focus-ring w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-studio cursor-pointer'
        >
          <Trash2 className='w-3.5 h-3.5 shrink-0' aria-hidden='true' />
          <span>{t('workspace.studioHub.series.menuDelete')}</span>
        </button>
      </div>
    </div>
  );
};

/** Thẻ bộ truyện (DESIGN_RULES §4.8 Surface primitives): thẻ ngang mặc định, hoặc thẻ bìa dọc. */
export const SeriesCardItem: React.FC<SeriesCardItemProps> = ({
  series: s,
  isProducerOrAdmin,
  onOpenSeries,
  onOpenPipeline,
  onOpenPresets,
  onOpenMembers,
  onPickCover,
  onClearCover,
  onEditSeries,
  onDeleteSeries,
  openLabel,
  views,
  variant = 'list',
}) => {
  const { t, lang } = useTranslation();
  const resolvedOpenLabel = openLabel ?? t('workspace.library.open.default');
  const displayCoverUrl = s.coverUrl || s.avatarUrl;
  const isGrid = variant === 'grid';

  const isCompleted = Boolean(s.isCompleted);
  const isPreProd = !isCompleted && (s.chaptersCount ?? 0) === 0;
  const readingDir = formatReadingDirection(s.readingDirection);

  const seriesStatus = isCompleted
    ? {
        label: t('workspace.studioHub.series.statusCompleted'),
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' aria-hidden='true' />,
      }
    : isPreProd
      ? {
          label: t('workspace.studioHub.series.statusPreProd'),
          badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
          icon: <Clock className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />,
        }
      : {
          label: t('workspace.studioHub.series.statusInProd'),
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Layers className='w-3.5 h-3.5 text-blue-600' aria-hidden='true' />,
        };

  const formattedUpdated = useMemo(
    () => formatRelativeUpdated(s.updatedAt || s.createdAt, lang),
    [s.updatedAt, s.createdAt, lang],
  );

  // Chỉ hiện lượt xem khi > 0 (không hiện "0 lượt xem").
  const viewsText = useMemo(
    () => (views !== undefined && views > 0 ? new Intl.NumberFormat(lang).format(views) : null),
    [views, lang],
  );

  const chaptersText = t('workspace.portal.chapterCount', { count: s.chaptersCount ?? 0 });
  const updatedText = formattedUpdated
    ? t('workspace.shelf.updated', { days: formattedUpdated })
    : null;
  const genreText = `${formatGenre(s.genre || s.format)} · ${readingDir.label}`;
  const languagesText = (s.releaseLanguages ?? []).map((l) => l.toUpperCase()).join(' · ');
  const synopsis = s.synopsis?.trim();

  const coverButton = (
    <button
      type='button'
      onClick={() => onOpenSeries(s.id)}
      aria-label={`${resolvedOpenLabel}: ${s.title}`}
      title={`${resolvedOpenLabel}: ${s.title}`}
      data-testid={`open-series-btn-${s.id}`}
      className={`focus-ring group/cover block shrink-0 overflow-hidden bg-head-wash text-left cursor-pointer ring-1 ring-inset ring-black/10 ${
        isGrid ? 'w-full aspect-[4/5]' : 'w-32 sm:w-36 aspect-[3/4]'
      }`}
    >
      {displayCoverUrl ? (
        <AuthenticatedImage
          src={displayCoverUrl}
          alt=''
          width={480}
          height={640}
          loading='lazy'
          className='w-full h-full object-cover transition-studio-transform group-hover/cover:scale-[1.03]'
          fallback={<SeriesCoverFallback title={s.title} />}
        />
      ) : (
        <SeriesCoverFallback title={s.title} />
      )}
    </button>
  );

  const titleButton = (
    <button
      type='button'
      onClick={() => onOpenSeries(s.id)}
      data-testid={`series-title-btn-${s.id}`}
      className={`focus-ring block w-full text-left font-serif font-bold leading-snug text-balance text-stone-900 line-clamp-2 hover:text-accent-dark transition-studio cursor-pointer ${
        isGrid ? 'text-base' : 'text-lg'
      }`}
    >
      {s.title}
    </button>
  );

  const statusBadge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${seriesStatus.badgeClass}`}
    >
      {seriesStatus.icon}
      <span>{seriesStatus.label}</span>
    </span>
  );

  const languagesChip = languagesText ? (
    <span className='inline-flex items-center rounded-full bg-kraft px-2 py-0.5 text-xs font-medium text-kraft-ink whitespace-nowrap tabular-nums'>
      {languagesText}
    </span>
  ) : null;

  const viewsEl =
    viewsText !== null && isProducerOrAdmin ? (
      <span
        className='inline-flex items-center gap-1 whitespace-nowrap text-xs text-stone-600 tabular-nums'
        data-testid={`series-views-${s.id}`}
      >
        <Eye className='w-3.5 h-3.5 text-stone-400 shrink-0' aria-hidden='true' />
        <span>{t('workspace.studioHub.series.viewsCount', { views: viewsText })}</span>
      </span>
    ) : null;

  const optionsMenu = isProducerOrAdmin ? (
    <SeriesOptionsMenu
      series={s}
      onOpenPipeline={onOpenPipeline}
      onOpenPresets={onOpenPresets}
      onOpenMembers={onOpenMembers}
      onPickCover={onPickCover}
      onClearCover={onClearCover}
      onEditSeries={onEditSeries}
      onDeleteSeries={onDeleteSeries}
    />
  ) : null;

  const cardDataAttrs = {
    'data-status': isCompleted ? 'completed' : isPreProd ? 'pre-prod' : 'in-prod',
    'data-title': s.title.toLowerCase(),
    'data-variant': variant,
  };

  if (isGrid) {
    return (
      <Card
        as='article'
        className='series-card group flex h-full min-w-0 flex-col transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0'
        {...cardDataAttrs}
      >
        {coverButton}
        <div className='flex flex-1 flex-col gap-2 p-3.5'>
          <div className='flex items-start gap-2'>
            <h3 className='min-w-0 flex-1'>{titleButton}</h3>
            {optionsMenu}
          </div>
          <div className='flex flex-wrap items-center gap-1.5'>
            {statusBadge}
            {languagesChip}
          </div>
          <p className='truncate text-xs text-stone-500'>{genreText}</p>
          {viewsEl}
          <div className='mt-auto flex items-center justify-between gap-3 border-t border-stone-100 pt-2.5 text-xs text-stone-500 tabular-nums'>
            <span className='whitespace-nowrap'>{chaptersText}</span>
            {updatedText && <span className='whitespace-nowrap'>{updatedText}</span>}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      as='article'
      className='series-card group flex h-full min-w-0 gap-4 p-3.5 sm:p-4 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none'
      {...cardDataAttrs}
    >
      {coverButton}
      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <div className='flex items-start gap-2'>
          <h3 className='min-w-0 flex-1'>{titleButton}</h3>
          {optionsMenu}
        </div>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-stone-500'>
          {statusBadge}
          {languagesChip}
          <span className='min-w-0 truncate'>{genreText}</span>
          {viewsEl}
        </div>
        {synopsis && (
          <p className='line-clamp-2 text-sm leading-relaxed text-stone-600'>{synopsis}</p>
        )}
        <div className='mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-stone-100 pt-2.5'>
          <p className='flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-stone-500 tabular-nums'>
            <span className='whitespace-nowrap'>{chaptersText}</span>
            {updatedText && (
              <>
                <span aria-hidden='true'>·</span>
                <span className='whitespace-nowrap'>{updatedText}</span>
              </>
            )}
          </p>
          <div className='flex items-center gap-1.5'>
            {isProducerOrAdmin && onOpenMembers && (
              <button
                type='button'
                onClick={() => onOpenMembers({ id: s.id, title: s.title })}
                className='focus-ring inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 transition-studio hover:bg-head-wash hover:text-stone-900 cursor-pointer'
              >
                <Users className='w-3.5 h-3.5 text-emerald-600 shrink-0' aria-hidden='true' />
                <span>{t('workspace.studioHub.series.crewQuick')}</span>
              </button>
            )}
            {isProducerOrAdmin && (
              <button
                type='button'
                onClick={() => onOpenPipeline({ id: s.id, title: s.title })}
                className='focus-ring inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 transition-studio hover:bg-head-wash hover:text-stone-900 cursor-pointer'
              >
                <Sliders className='w-3.5 h-3.5 text-blue-600 shrink-0' aria-hidden='true' />
                <span>{t('workspace.studioHub.series.pipelineQuick')}</span>
              </button>
            )}
            <button
              type='button'
              onClick={() => onOpenSeries(s.id)}
              className='focus-ring inline-flex min-h-9 items-center whitespace-nowrap rounded-lg bg-orange-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-studio hover:bg-orange-700 active:scale-[0.98] cursor-pointer'
            >
              {t('workspace.studioHub.series.openQuick')}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
