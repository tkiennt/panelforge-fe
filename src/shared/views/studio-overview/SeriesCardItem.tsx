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
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import {
  SeriesAvatarFallback,
  SeriesBannerFallback,
} from '@/shared/features/series-identity/SeriesImageFallbacks';
import { Card, CardBody, CardHeader } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from '@/shared/ui';
import { formatGenre, formatReadingDirection } from './formatters';

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
}

const hasNativeInvoker = () =>
  typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;

const supportsAnchorPos = () =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('position-area', 'block-end');

const invokerAttrs = (targetId: string) =>
  ({ commandfor: targetId, command: 'toggle-popover' }) as Record<string, string>;

const positionPopoverFallback = (trigger: HTMLElement | null, menu: HTMLElement | null) => {
  if (!trigger || !menu || supportsAnchorPos()) return;
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  const width = menu.offsetWidth || 208;
  const height = menu.offsetHeight || 260;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const left = Math.max(margin, Math.min(r.right - width, vw - width - margin));
  const top = Math.max(margin, Math.min(r.bottom + 6, vh - height - margin));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
};

const safeShowPopover = (menu: HTMLElement | null, source?: HTMLElement | null) => {
  if (!menu) return;
  try {
    const fn = (menu as HTMLElement & { showPopover?: (opts?: { source?: HTMLElement }) => void })
      .showPopover;
    if (typeof fn === 'function') {
      fn.call(menu, source ? { source } : undefined);
    }
  } catch {
    // ignore if unsupported in JSDOM
  }
};

const safeHidePopover = (menu: HTMLElement | null) => {
  if (!menu) return;
  try {
    if (typeof menu.hidePopover === 'function') {
      menu.hidePopover();
    }
  } catch {
    // ignore if unsupported in JSDOM
  }
};

const SeriesCoverFallback: React.FC<{ title: string }> = ({ title }) => (
  <div className='relative w-full h-full flex items-center justify-center'>
    <SeriesBannerFallback />
    <div className='relative z-10 w-20 h-28 shadow-xs transition-studio-transform group-hover/cover:scale-[1.03]'>
      <SeriesAvatarFallback title={title} />
    </div>
  </div>
);

/** Thẻ bộ truyện thống nhất với MemberSeriesPortal (DESIGN_RULES §4.8 Surface primitives). */
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
}) => {
  const { t, lang } = useTranslation();
  const resolvedOpenLabel = openLabel ?? t('workspace.library.open.default');
  const displayCoverUrl = s.coverUrl || s.avatarUrl;

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
          badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
          icon: <Clock className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />,
        }
      : {
          label: t('workspace.studioHub.series.statusInProd'),
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Layers className='w-3.5 h-3.5 text-blue-600' aria-hidden='true' />,
        };

  const formattedUpdated = useMemo(() => {
    const raw = s.updatedAt || s.createdAt;
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit' }).format(date);
  }, [s.updatedAt, s.createdAt, lang]);

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
    <Card
      as='article'
      className='series-card group flex flex-col h-full transition-shadow hover:shadow-md min-w-0'
      data-status={isCompleted ? 'completed' : isPreProd ? 'pre-prod' : 'in-prod'}
      data-title={s.title.toLowerCase()}
    >
      <CardHeader
        icon={<BookOpen className='w-4 h-4' aria-hidden='true' />}
        titleAs='h3'
        title={s.title}
        subtitle={`${formatGenre(s.genre || s.format)} · ${readingDir.label}`}
        actions={
          <div className='flex items-center gap-1.5'>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${seriesStatus.badgeClass}`}
            >
              {seriesStatus.icon}
              <span>{seriesStatus.label}</span>
            </span>

            {isProducerOrAdmin && (
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
                  className='focus-ring p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-white/80 transition-studio cursor-pointer min-w-8 min-h-8 flex items-center justify-center'
                >
                  <MoreVertical className='w-4 h-4' aria-hidden='true' />
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
                    onClick={() =>
                      runMenuAction(() => onOpenPipeline({ id: s.id, title: s.title }))
                    }
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
                    <ListOrdered
                      className='w-3.5 h-3.5 text-stone-600 shrink-0'
                      aria-hidden='true'
                    />
                    <span>{t('workspace.studioHub.series.menuTypography')}</span>
                  </button>
                  {onOpenMembers && (
                    <button
                      type='button'
                      onClick={() =>
                        runMenuAction(() => onOpenMembers({ id: s.id, title: s.title }))
                      }
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
                    <ImagePlus
                      className='w-3.5 h-3.5 text-accent-dark shrink-0'
                      aria-hidden='true'
                    />
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
                      <ImageOff
                        className='w-3.5 h-3.5 text-stone-500 shrink-0'
                        aria-hidden='true'
                      />
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
            )}
          </div>
        }
      />

      <CardBody className='flex-1 flex flex-col gap-4'>
        <button
          type='button'
          onClick={() => onOpenSeries(s.id)}
          aria-label={`${resolvedOpenLabel}: ${s.title}`}
          title={`${resolvedOpenLabel}: ${s.title}`}
          className='focus-ring group/cover relative overflow-hidden rounded-xl border border-head-line bg-head-wash text-left cursor-pointer w-full h-44 shrink-0'
        >
          {displayCoverUrl ? (
            <AuthenticatedImage
              src={displayCoverUrl}
              alt=''
              width={640}
              height={320}
              loading='lazy'
              className='w-full h-full object-cover transition-studio-transform group-hover/cover:scale-[1.03]'
              fallback={<SeriesCoverFallback title={s.title} />}
            />
          ) : (
            <SeriesCoverFallback title={s.title} />
          )}
        </button>

        <p className='text-sm text-stone-600 line-clamp-2 leading-relaxed text-pretty'>
          {s.synopsis?.trim() || t('workspace.studioHub.series.defaultSynopsis')}
        </p>

        <div className='mt-auto pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-xs text-stone-500 min-w-0'>
            <span className='rounded-full bg-kraft px-2.5 py-0.5 font-semibold text-kraft-ink tabular-nums whitespace-nowrap'>
              {s.chaptersCount
                ? t('workspace.portal.chapterCount', { count: s.chaptersCount })
                : t('workspace.studioHub.series.draftName')}
            </span>
            {formattedUpdated && (
              <span className='truncate tabular-nums text-stone-500'>
                {t('workspace.shelf.updated', { days: formattedUpdated })}
              </span>
            )}
          </div>

          <button
            type='button'
            onClick={() => onOpenSeries(s.id)}
            aria-label={`${resolvedOpenLabel}: ${s.title}`}
            className='focus-ring inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-800 border border-stone-200 hover:border-orange-300 px-3.5 py-2 text-xs font-semibold shadow-2xs transition-studio cursor-pointer shrink-0'
            data-testid={`open-series-btn-${s.id}`}
          >
            <span>{resolvedOpenLabel}</span>
            <ArrowRight className='w-4 h-4' aria-hidden='true' />
          </button>
        </div>
      </CardBody>
    </Card>
  );
};
