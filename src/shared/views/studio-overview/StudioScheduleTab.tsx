import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, CalendarX, ChevronLeft, ChevronRight } from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { chapterService, type ChapterDto } from '@/services/chapter.service';
import { useTranslation } from '@/lib/i18n';

export interface StudioScheduleTabProps {
  seriesList: SeriesDto[];
  workspaceId?: string;
  isProducer: boolean;
}

interface ScheduledChapter {
  chapter: ChapterDto;
  series: SeriesDto;
  /** Ngày dự kiến (giờ địa phương, 00:00) hoặc null nếu chưa đặt lịch. */
  date: Date | null;
}

const WEEKS_SHOWN = 4;
const DAY_MS = 86_400_000;

const STATUS_STYLE: Record<string, string> = {
  PreProduction: 'bg-amber-50 text-amber-800 border-amber-200',
  InProduction: 'bg-blue-50 text-blue-700 border-blue-200',
  ChapterApproved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  HandedOffAndPublished: 'bg-stone-100 text-stone-600 border-stone-200',
};

/** "YYYY-MM-DD" → Date theo giờ địa phương (tránh lệch ngày do UTC). */
const parseLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Tuần bắt đầu từ thứ Hai. */
const startOfWeek = (d: Date) => {
  const day = startOfDay(d);
  const offset = (day.getDay() + 6) % 7;
  return new Date(day.getTime() - offset * DAY_MS);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const StudioScheduleTab: React.FC<StudioScheduleTabProps> = ({
  seriesList,
  workspaceId,
}) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = React.useState<ScheduledChapter[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failedSeries, setFailedSeries] = React.useState<string[]>([]);
  const [seriesFilter, setSeriesFilter] = React.useState('ALL');
  // Mốc "hôm nay" cố định cho một lần mount, để render thuần.
  const [today] = React.useState(() => startOfDay(new Date()));
  const [anchor, setAnchor] = React.useState(() => startOfWeek(new Date()));

  const seriesKey = seriesList.map((s) => s.id).join(',');
  React.useEffect(() => {
    if (seriesList.length === 0) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled(
      seriesList.map((s) => chapterService.getChaptersBySeries(s.id, 1, 200)),
    ).then((results) => {
      if (cancelled) return;
      const next: ScheduledChapter[] = [];
      const failed: string[] = [];
      results.forEach((res, i) => {
        const series = seriesList[i];
        if (res.status === 'fulfilled') {
          for (const chapter of res.value?.items ?? []) {
            next.push({ chapter, series, date: parseLocalDate(chapter.targetReleaseDate) });
          }
        } else {
          failed.push(series.title);
        }
      });
      setItems(next);
      setFailedSeries(failed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey]);

  const visible = React.useMemo(
    () => (seriesFilter === 'ALL' ? items : items.filter((i) => i.series.id === seriesFilter)),
    [items, seriesFilter],
  );

  const isReleased = (c: ChapterDto) => c.status === 'HandedOffAndPublished';
  const overdue = visible.filter((i) => i.date && i.date < today && !isReleased(i.chapter));
  const unscheduled = visible.filter((i) => !i.date);
  const thisWeekStart = startOfWeek(today);
  const thisWeekCount = visible.filter(
    (i) => i.date && i.date >= thisWeekStart && i.date < addDays(thisWeekStart, 7),
  ).length;

  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, w) => {
    const from = addDays(anchor, w * 7);
    const to = addDays(from, 6);
    const chapters = visible
      .filter((i) => i.date && i.date >= from && i.date <= to)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());
    return { from, to, chapters, isCurrent: from.getTime() === thisWeekStart.getTime() };
  });

  const dayMonth = (d: Date) =>
    new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(d);
  const weekdayDay = (d: Date) =>
    new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'numeric' }).format(d);
  const rangeEnd = addDays(anchor, WEEKS_SHOWN * 7 - 1);

  const openChapter = (i: ScheduledChapter) => {
    if (!workspaceId) return;
    navigate(`/workspaces/${workspaceId}/series/${i.series.id}/chapters?chapterId=${i.chapter.id}`);
  };

  const renderChapter = (item: ScheduledChapter, showDate = true) => {
    const { chapter, series, date } = item;
    const late = !!date && date < today && !isReleased(chapter);
    const status = chapter.status ?? 'PreProduction';
    return (
      <button
        key={chapter.id}
        type='button'
        onClick={() => openChapter(item)}
        aria-label={t('members.schedule.openChapterAria', {
          series: series.title,
          number: chapter.chapterNumber,
        })}
        className={`focus-ring w-full rounded-lg border p-2.5 text-left transition-studio cursor-pointer hover:shadow-xs ${
          late
            ? 'border-rose-200 bg-rose-50/60 hover:border-rose-300'
            : 'border-stone-200/80 bg-white hover:border-head-line'
        }`}
      >
        <div className='flex items-center justify-between gap-2'>
          <span className='truncate text-xs font-semibold text-[#C2410C]'>{series.title}</span>
          {showDate && date && (
            <span
              className={`shrink-0 text-xs tabular-nums ${late ? 'font-semibold text-rose-700' : 'text-stone-500'}`}
            >
              {weekdayDay(date)}
            </span>
          )}
        </div>
        <div className='mt-0.5 line-clamp-2 text-sm font-semibold text-stone-900'>
          {t('members.schedule.chapterLabel', { number: chapter.chapterNumber })}
          {chapter.title ? `: ${chapter.title}` : ''}
        </div>
        <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE.PreProduction}`}
          >
            {t(`members.schedule.status.${status}`, status)}
          </span>
          {late && (
            <span className='inline-flex items-center gap-1 text-xs font-semibold text-rose-700'>
              <AlertTriangle className='size-3' aria-hidden='true' />
              {t('members.schedule.overdue')}
            </span>
          )}
        </div>
      </button>
    );
  };

  if (seriesList.length === 0) {
    return (
      <div className='bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-3'>
        <div className='w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center'>
          <Calendar className='w-6 h-6' aria-hidden='true' />
        </div>
        <h3 className='font-serif text-lg font-bold text-stone-900'>
          {t('members.schedule.empty')}
        </h3>
        <p className='text-xs text-stone-600 max-w-md mx-auto'>{t('members.schedule.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div
      role='tabpanel'
      id='tabpanel-schedule'
      aria-labelledby='tab-schedule'
      className='flex flex-col gap-4 animate-in fade-in duration-200'
    >
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h2 className='font-serif text-2xl font-bold text-stone-900'>
            {t('members.schedule.title')}
          </h2>
          <p className='mt-1 text-sm text-stone-600'>{t('members.schedule.subtitle')}</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {seriesList.length > 1 && (
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              aria-label={t('members.schedule.seriesFilterLabel')}
              className='focus-ring min-h-9 cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs'
            >
              <option value='ALL'>{t('members.schedule.allSeries')}</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          <div className='inline-flex items-center rounded-lg border border-stone-200 bg-white shadow-2xs'>
            <button
              type='button'
              onClick={() => setAnchor((a) => addDays(a, -7 * WEEKS_SHOWN))}
              aria-label={t('members.schedule.prevWeeks')}
              title={t('members.schedule.prevWeeks')}
              className='focus-ring grid size-9 place-items-center rounded-l-lg text-stone-600 hover:bg-stone-50 cursor-pointer'
            >
              <ChevronLeft className='size-4' aria-hidden='true' />
            </button>
            <span className='border-x border-stone-200 px-3 text-xs font-semibold tabular-nums text-stone-700'>
              {dayMonth(anchor)} – {dayMonth(rangeEnd)}
            </span>
            <button
              type='button'
              onClick={() => setAnchor((a) => addDays(a, 7 * WEEKS_SHOWN))}
              aria-label={t('members.schedule.nextWeeks')}
              title={t('members.schedule.nextWeeks')}
              className='focus-ring grid size-9 place-items-center rounded-r-lg text-stone-600 hover:bg-stone-50 cursor-pointer'
            >
              <ChevronRight className='size-4' aria-hidden='true' />
            </button>
          </div>
          <button
            type='button'
            onClick={() => setAnchor(startOfWeek(today))}
            disabled={anchor.getTime() === thisWeekStart.getTime()}
            className='focus-ring min-h-9 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 disabled:opacity-50 cursor-pointer'
          >
            {t('members.schedule.todayBtn')}
          </button>
        </div>
      </div>

      {!loading && (
        <div className='flex flex-wrap items-center gap-2 text-xs'>
          {overdue.length > 0 && (
            <span className='inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700'>
              <AlertTriangle className='size-3.5' aria-hidden='true' />
              {t('members.schedule.summaryOverdue', { count: overdue.length })}
            </span>
          )}
          <span className='rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600'>
            {t('members.schedule.summaryThisWeek', { count: thisWeekCount })}
          </span>
          <span className='rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600'>
            {t('members.schedule.summaryUnscheduled', { count: unscheduled.length })}
          </span>
        </div>
      )}

      {failedSeries.length > 0 && (
        <div
          role='alert'
          className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'
        >
          {failedSeries.map((name) => (
            <div key={name}>{t('members.schedule.loadError', { series: name })}</div>
          ))}
        </div>
      )}

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4' aria-busy={loading}>
        {weeks.map((week) => (
          <section
            key={week.from.toISOString()}
            aria-label={`${dayMonth(week.from)} – ${dayMonth(week.to)}`}
            className={`flex min-h-48 flex-col rounded-xl border bg-white shadow-2xs ${
              week.isCurrent ? 'border-orange-300 ring-1 ring-orange-200' : 'border-stone-200/80'
            }`}
          >
            <header
              className={`flex items-center justify-between gap-2 rounded-t-xl border-b px-3 py-2.5 ${
                week.isCurrent
                  ? 'border-orange-100 bg-accent-soft'
                  : 'border-stone-100 bg-stone-50/70'
              }`}
            >
              <span
                className={`text-xs font-semibold tabular-nums ${week.isCurrent ? 'text-accent-dark' : 'text-stone-700'}`}
              >
                {dayMonth(week.from)} – {dayMonth(week.to)}
              </span>
              {week.isCurrent && (
                <span className='rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white'>
                  {t('members.schedule.thisWeek')}
                </span>
              )}
            </header>
            <div className='flex flex-1 flex-col gap-2 p-3'>
              {loading ? (
                <>
                  <span className='h-16 animate-pulse rounded-lg bg-stone-100' />
                  <span className='sr-only'>{t('members.schedule.loading')}</span>
                </>
              ) : week.chapters.length === 0 ? (
                <p className='m-auto text-xs text-stone-400'>
                  {t('members.schedule.noChaptersInWeek')}
                </p>
              ) : (
                week.chapters.map((item) => renderChapter(item))
              )}
            </div>
          </section>
        ))}
      </div>

      {!loading && unscheduled.length > 0 && (
        <section className='rounded-xl border border-dashed border-stone-300 bg-white/60 p-4'>
          <div className='flex items-start gap-2.5'>
            <CalendarX className='mt-0.5 size-4 shrink-0 text-stone-500' aria-hidden='true' />
            <div>
              <h3 className='text-sm font-semibold text-stone-900'>
                {t('members.schedule.unscheduled')}{' '}
                <span className='font-normal text-stone-500'>({unscheduled.length})</span>
              </h3>
              <p className='mt-0.5 text-xs text-stone-500'>
                {t('members.schedule.unscheduledHint')}
              </p>
            </div>
          </div>
          <div className='mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {unscheduled
              .slice()
              .sort(
                (a, b) =>
                  a.series.title.localeCompare(b.series.title) ||
                  a.chapter.chapterNumber - b.chapter.chapterNumber,
              )
              .map((item) => renderChapter(item, false))}
          </div>
        </section>
      )}
    </div>
  );
};
