import React from 'react';
import { Calendar } from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { useTranslation } from '@/lib/i18n';

export interface StudioScheduleTabProps {
  seriesList: SeriesDto[];
  workspaceId?: string;
  isProducer: boolean;
}

export const StudioScheduleTab: React.FC<StudioScheduleTabProps> = ({
  seriesList,
}) => {
  const { t } = useTranslation();

  const completedSeries = React.useMemo(() => {
    return seriesList.filter((s) => s.isCompleted);
  }, [seriesList]);

  const activeSeries = React.useMemo(() => {
    return seriesList.filter((s) => !s.isCompleted);
  }, [seriesList]);

  if (seriesList.length === 0) {
    return (
      <div className='bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-3'>
        <div className='w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center'>
          <Calendar className='w-6 h-6' />
        </div>
        <h3 className='font-serif text-lg font-bold text-stone-900'>{t('members.schedule.empty')}</h3>
        <p className='text-xs text-stone-600 max-w-md mx-auto'>
          {t('members.schedule.emptyDesc')}
        </p>
      </div>
    );
  }

  const s1 = completedSeries[0] || seriesList[0];
  const s2 = seriesList[1] || seriesList[0];
  const s3 = activeSeries[0] || seriesList[0];
  const s4 = seriesList[2] || seriesList[0];

  return (
    <div
      role='tabpanel'
      id='tabpanel-schedule'
      aria-labelledby='tab-schedule'
      className='flex flex-col gap-5 animate-in fade-in duration-200'
    >
      {/* Stitch Schedule Header */}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold text-stone-900'>{t('members.schedule.title')}</h2>
          <p className='text-xs text-stone-500 mt-0.5'>{t('members.schedule.subtitle')}</p>
        </div>
        <button
          type='button'
          className='px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs text-stone-800 shadow-2xs font-medium cursor-pointer transition-colors'
        >
          {t('members.schedule.todayBtn')}
        </button>
      </div>

      {/* Stitch 4-Column Weekly Sprint Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Tuần 1: ĐÃ PHÁT HÀNH */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>{t('members.schedule.week1')}</span>
            <span className='text-xs px-2 py-0.5 rounded bg-emerald-600 text-white font-bold'>
              {t('members.schedule.statusPublished')}
            </span>
          </div>
          <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
            <span className='text-xs font-bold text-orange-600 truncate'>
              {s1?.title || '—'}
            </span>
            <span className='font-semibold text-stone-900 text-xs truncate'>
              {s1?.chaptersCount
                ? `${t('members.schedule.chapterPrefix', { count: s1.chaptersCount })}: ${t('members.schedule.publishedLabel')}`
                : '—'}
            </span>
            <span className='text-xs text-stone-500 truncate'>
              {s1?.format || '—'}
            </span>
          </div>
        </div>

        {/* Tuần 2: HOÀN TẤT */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>{t('members.schedule.week2')}</span>
            <span className='text-xs px-2 py-0.5 rounded bg-emerald-600 text-white font-bold'>
              {t('members.schedule.statusCompleted')}
            </span>
          </div>
          <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
            <span className='text-xs font-bold text-orange-700 truncate'>
              {s2?.title || '—'}
            </span>
            <span className='font-semibold text-stone-900 text-xs truncate'>
              {s2?.chaptersCount
                ? `${t('members.schedule.chapterPrefix', { count: s2.chaptersCount })}: ${t('members.schedule.reviewLabel')}`
                : '—'}
            </span>
            <span className='text-xs text-stone-500 truncate'>
              {s2?.genre || s2?.format || '—'}
            </span>
          </div>
        </div>

        {/* Tuần 3: TUẦN HIỆN TẠI */}
        <div className='bg-white border-2 border-orange-600 rounded-xl p-4 flex flex-col gap-3 shadow-sm relative'>
          <div className='absolute -top-2.5 right-3 px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded-full'>
            {t('members.schedule.statusCurrent')}
          </div>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-bold text-orange-600 text-xs'>{t('members.schedule.week3')}</span>
          </div>
          <div className='p-2.5 rounded-lg bg-orange-50/50 border border-orange-200 flex flex-col gap-1'>
            <span className='text-xs font-bold text-orange-700 truncate'>
              {s3?.title || '—'}
            </span>
            <span className='font-semibold text-stone-900 text-xs truncate'>
              {s3
                ? `${t('members.schedule.chapterPrefix', { count: (s3.chaptersCount ?? 0) + 1 })}: ${t('members.schedule.inProductionLabel')}`
                : '—'}
            </span>
            <div className='flex items-center justify-between text-xs text-amber-600 font-semibold'>
              <span>{t('members.schedule.inProgressDesc')}</span>
              <span>—</span>
            </div>
          </div>
        </div>

        {/* Tuần 4: SẮP DIỄN RA */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>{t('members.schedule.week4')}</span>
            <span className='text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-bold'>
              {t('members.schedule.statusUpcoming')}
            </span>
          </div>
          <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
            <span className='text-xs font-bold text-orange-600 truncate'>
              {s4?.title || '—'}
            </span>
            <span className='font-semibold text-stone-900 text-xs truncate'>
              {s4
                ? `${t('members.schedule.chapterPrefix', { count: (s4.chaptersCount ?? 0) + 1 })}: ${t('members.schedule.upcomingLabel')}`
                : '—'}
            </span>
            <span className='text-xs text-stone-500 truncate'>
              {t('members.schedule.plannedDesc')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
