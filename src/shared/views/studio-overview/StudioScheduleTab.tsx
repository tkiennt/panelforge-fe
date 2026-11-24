import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';
import { formatGenre, formatReadingDirection } from './formatters';

export interface StudioScheduleTabProps {
  seriesList: SeriesDto[];
  workspaceId?: string;
  isProducer: boolean;
}

export const StudioScheduleTab: React.FC<StudioScheduleTabProps> = ({
  seriesList,
  workspaceId,
  isProducer,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalChapters = React.useMemo(() => {
    return seriesList.reduce((acc, s) => acc + (s.chaptersCount ?? 0), 0);
  }, [seriesList]);

  const activeSeries = React.useMemo(() => {
    return seriesList.filter((s) => !s.isCompleted);
  }, [seriesList]);

  const completedSeries = React.useMemo(() => {
    return seriesList.filter((s) => s.isCompleted);
  }, [seriesList]);

  if (seriesList.length === 0) {
    return (
      <div className='bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-3'>
        <div className='w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center'>
          <Calendar className='w-6 h-6' />
        </div>
        <h3 className='font-serif text-lg font-bold text-stone-900'>
          {t('workspace.scheduleTab.emptyTitle')}
        </h3>
        <p className='text-xs sm:text-sm text-stone-600 max-w-md mx-auto'>
          {t('workspace.scheduleTab.emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6 animate-in fade-in duration-200'>
      {/* Stitch Weekly Schedule Header */}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold text-stone-900'>{t('workspace.scheduleTab.title')}</h2>
          <p className='text-xs text-stone-500 mt-0.5'>{t('workspace.scheduleTab.subtitle')}</p>
        </div>
        <button
          type='button'
          className='px-3.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs text-stone-800 shadow-2xs font-semibold cursor-pointer transition-colors'
        >
          {t('common.time.today')}
        </button>
      </div>

      {/* Dynamic 4-Column Weekly Sprint Cards from Real Series */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Tuần 1: Hoàn tất phát hành */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>
              {t('workspace.scheduleTab.week1')}
            </span>
            <span className='text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold'>
              {t('workspace.scheduleTab.badgePublished')}
            </span>
          </div>
          {completedSeries[0] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-600 line-clamp-1'>
                {(completedSeries[0] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                {(completedSeries[0] || seriesList[0]).chaptersCount
                  ? t('workspace.scheduleTab.chapterPublished', {
                      count: (completedSeries[0] || seriesList[0]).chaptersCount ?? 0,
                    })
                  : t('workspace.scheduleTab.nameDraft')}
              </span>
              <span className='text-[11px] text-stone-500 line-clamp-1'>
                {t('workspace.scheduleTab.formatLabel', {
                  format: (completedSeries[0] || seriesList[0]).format || 'Manga/Webtoon',
                })}
              </span>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>
              {t('workspace.scheduleTab.noSchedule')}
            </div>
          )}
        </div>

        {/* Tuần 2: Kỳ gần nhất */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>
              {t('workspace.scheduleTab.week2')}
            </span>
            <span className='text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold'>
              {t('workspace.scheduleTab.badgeDone')}
            </span>
          </div>
          {seriesList[1] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-700 line-clamp-1'>
                {(seriesList[1] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                {(seriesList[1] || seriesList[0]).chaptersCount
                  ? t('workspace.scheduleTab.chapterProofread', {
                      count: (seriesList[1] || seriesList[0]).chaptersCount ?? 0,
                    })
                  : t('workspace.scheduleTab.preProdStoryboard')}
              </span>
              <span className='text-[11px] text-stone-500 line-clamp-1'>
                {t('workspace.scheduleTab.genreLabel', {
                  genre: formatGenre((seriesList[1] || seriesList[0]).genre),
                })}
              </span>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>
              {t('workspace.scheduleTab.noSchedule')}
            </div>
          )}
        </div>

        {/* Tuần 3: TUẦN HIỆN TẠI (Đang sản xuất) */}
        <div className='bg-white border-2 border-orange-600 rounded-xl p-4 flex flex-col gap-3 shadow-sm relative'>
          <div className='absolute -top-2.5 right-3 px-2 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded-full shadow-2xs'>
            {t('workspace.scheduleTab.currentWeekBadge')}
          </div>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-bold text-orange-600 text-xs'>
              {t('workspace.scheduleTab.week3')}
            </span>
          </div>
          {activeSeries[0] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-orange-50/50 border border-orange-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-700 line-clamp-1'>
                {(activeSeries[0] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                {t('workspace.scheduleTab.chapterInProd', {
                  count: ((activeSeries[0] || seriesList[0]).chaptersCount ?? 0) + 1,
                })}
              </span>
              <div className='flex items-center justify-between text-[11px] text-amber-600 font-semibold mt-1'>
                <span>{t('workspace.scheduleTab.drawingStoryboard')}</span>
                <span>{t('workspace.scheduleTab.realProgress')}</span>
              </div>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>
              {t('workspace.scheduleTab.noActiveProject')}
            </div>
          )}
        </div>

        {/* Tuần 4: Sắp diễn ra */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>
              {t('workspace.scheduleTab.week4')}
            </span>
            <span className='text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-bold'>
              {t('workspace.scheduleTab.badgeUpcoming')}
            </span>
          </div>
          {seriesList[2] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-600 line-clamp-1'>
                {(seriesList[2] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                {t('workspace.scheduleTab.chapterNextPlan', {
                  count: ((seriesList[2] || seriesList[0]).chaptersCount ?? 0) + 1,
                })}
              </span>
              <span className='text-[11px] text-stone-500 line-clamp-1'>
                {t('workspace.scheduleTab.lineartLetteringDue')}
              </span>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>
              {t('workspace.scheduleTab.noSchedule')}
            </div>
          )}
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5'>
          <div className='flex items-center justify-between text-xs font-semibold text-stone-500'>
            <span>{t('workspace.scheduleTab.kpiActiveSeries')}</span>
            <BookOpen className='w-4 h-4 text-orange-600' />
          </div>
          <div className='text-2xl font-mono font-bold text-stone-900'>
            {activeSeries.length}{' '}
            <span className='text-xs text-stone-500 font-sans font-normal'>
              {t('workspace.scheduleTab.kpiTotalSeriesUnit', { count: seriesList.length })}
            </span>
          </div>
          <div className='text-[11px] text-emerald-700 font-medium flex items-center gap-1'>
            <CheckCircle2 className='w-3 h-3' />
            <span>{t('workspace.scheduleTab.kpiOnTrack')}</span>
          </div>
        </div>

        <div className='bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5'>
          <div className='flex items-center justify-between text-xs font-semibold text-stone-500'>
            <span>{t('workspace.scheduleTab.kpiTotalChapters')}</span>
            <Clock className='w-4 h-4 text-sky-600' />
          </div>
          <div className='text-2xl font-mono font-bold text-stone-900'>
            {totalChapters}{' '}
            <span className='text-xs text-stone-500 font-sans font-normal'>
              {t('workspace.scheduleTab.kpiChaptersUnit')}
            </span>
          </div>
          <div className='text-[11px] text-stone-600 font-medium'>
            {t('workspace.scheduleTab.kpiIncludesDrafts')}
          </div>
        </div>

        <div className='bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5'>
          <div className='flex items-center justify-between text-xs font-semibold text-stone-500'>
            <span>{t('workspace.scheduleTab.kpiCompletedSeries')}</span>
            <Sparkles className='w-4 h-4 text-emerald-600' />
          </div>
          <div className='text-2xl font-mono font-bold text-stone-900'>
            {completedSeries.length}{' '}
            <span className='text-xs text-stone-500 font-sans font-normal'>
              {t('workspace.scheduleTab.kpiWorksUnit')}
            </span>
          </div>
          <div className='text-[11px] text-stone-600 font-medium'>
            {t('workspace.scheduleTab.kpiArchived')}
          </div>
        </div>
      </div>

      {/* Schedule Table / List */}
      <div className='bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden'>
        <div className='p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div>
            <h3 className='font-serif text-base font-bold text-stone-900'>
              {t('workspace.scheduleTab.title')}
            </h3>
            <p className='text-xs text-stone-500 mt-0.5'>
              {t('workspace.scheduleTab.tableSubtitle')}
            </p>
          </div>
          <span className='text-xs font-mono px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-semibold self-start sm:self-auto'>
            {t('workspace.scheduleTab.projectsCount', { count: seriesList.length })}
          </span>
        </div>

        <div className='divide-y divide-stone-100'>
          {seriesList.map((s) => {
            const displayCoverUrl = s.coverUrl || s.avatarUrl;
            const isDone = s.isCompleted;

            return (
              <div
                key={s.id}
                className='p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors'
              >
                <div className='flex items-center gap-4 min-w-0'>
                  {/* Thumbnail */}
                  <div className='w-14 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 relative flex items-center justify-center'>
                    {displayCoverUrl ? (
                      <AuthenticatedImage
                        src={displayCoverUrl}
                        alt={s.title}
                        className='w-full h-full object-cover'
                        fallback={
                          <span className='font-serif font-bold text-stone-400 text-lg'>
                            {s.title.charAt(0).toUpperCase()}
                          </span>
                        }
                      />
                    ) : (
                      <span className='font-serif font-bold text-stone-400 text-lg'>
                        {s.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h4 className='text-sm font-bold text-stone-900 truncate'>{s.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isDone
                            ? 'bg-stone-100 text-stone-700 border border-stone-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isDone
                          ? t('workspace.scheduleTab.statusCompleted')
                          : t('workspace.scheduleTab.statusPublishing')}
                      </span>
                    </div>
                    <div className='flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap'>
                      <span>{formatGenre(s.genre || s.format)}</span>
                      <span>•</span>
                      <span>{formatReadingDirection(s.readingDirection).label}</span>
                      <span>•</span>
                      <span className='font-mono font-semibold text-stone-700'>
                        {t('workspace.scheduleTab.chaptersCreated', {
                          count: s.chaptersCount ?? 0,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex items-center gap-2.5 shrink-0 self-end md:self-auto'>
                  <button
                    type='button'
                    onClick={() => {
                      if (workspaceId) {
                        navigate(`/workspaces/${workspaceId}/series/${s.id}/dashboard`);
                      }
                    }}
                    className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer rounded-xl'
                  >
                    <span>{t('workspace.scheduleTab.openDesk')}</span>
                    <ArrowRight className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
