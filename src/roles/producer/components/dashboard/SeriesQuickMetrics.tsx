import React from 'react';
import { useTranslation } from '@/lib/i18n';
import type { ChapterProgressDto } from '@/services/series.service';
import type { SeriesDashboardKpis } from '../../hooks/useSeriesDashboard';
import { clampPercent, formatViDate } from './dashboardFormat';

const CARD =
  'bg-white border border-stone-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4';
const CHIP = 'px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-medium';

const LifecycleCell: React.FC<{ value: number; label: string; hint: string; tone: string }> = ({
  value,
  label,
  hint,
  tone,
}) => (
  <div className='p-2 bg-stone-50 rounded-lg border border-stone-200 flex flex-col justify-center'>
    <div className={`text-lg font-bold font-mono leading-tight ${tone}`}>{value}</div>
    <div className='text-xs font-bold text-stone-800 mt-0.5'>{label}</div>
    <div className='text-xs text-stone-500'>{hint}</div>
  </div>
);

interface SeriesQuickMetricsProps {
  loading: boolean;
  kpis: SeriesDashboardKpis;
  focusChapter?: ChapterProgressDto;
}

export const SeriesQuickMetrics: React.FC<SeriesQuickMetricsProps> = ({
  loading,
  kpis,
  focusChapter,
}) => {
  const { t, lang } = useTranslation('production');

  return (
    <section
      aria-label={t('dashboard.kpi.sectionAria')}
      className='grid grid-cols-1 lg:grid-cols-12 gap-4'
    >
      <div className={`lg:col-span-4 ${CARD}`}>
        <div>
          <span className='text-sm font-semibold text-stone-800'>
            {t('dashboard.kpi.overallTitle')}
          </span>
          <div className='flex items-baseline gap-2 mt-2'>
            <span className='text-4xl font-extrabold font-mono tabular-nums text-stone-900'>
              {loading ? '…' : `${kpis.overallPercent}%`}
            </span>
            <span className='text-xs text-stone-500 font-medium'>
              {t('dashboard.kpi.averageDesc')}
            </span>
          </div>
        </div>

        <div className='pt-3 border-t border-stone-100 space-y-2'>
          <div className='w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200/80'>
            <div
              className='bg-studio-accent h-full rounded-full'
              style={{ width: `${clampPercent(kpis.overallPercent)}%` }}
            />
          </div>
          <div className='text-xs text-stone-600 flex items-center justify-between'>
            <span>
              <strong className='text-stone-900 font-semibold'>{kpis.totalApprovedPanels}</strong>{' '}
              {t('dashboard.kpi.approvedPanelsUnit')}
            </span>
            <span>{t('dashboard.kpi.totalPanels', { count: kpis.totalPanels })}</span>
          </div>
        </div>
      </div>

      <div className={`lg:col-span-8 ${CARD}`}>
        <div>
          <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-semibold text-stone-800'>
                {t('dashboard.kpi.inProdTitle')}
              </span>
              <span className='text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold'>
                {t('dashboard.kpi.inProdBadge', { count: kpis.inProdChapters })}
              </span>
            </div>
            <span className='text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full text-xs font-semibold'>
              {t('dashboard.kpi.totalChaptersBadge', { count: kpis.totalChapters })}
            </span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-12 gap-3'>
            <div className='sm:col-span-7 p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2.5'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold text-stone-600'>
                  {t('dashboard.kpi.focusProgress')}
                </span>
                {focusChapter && (
                  <span className='text-xs font-mono font-bold text-stone-900 tabular-nums'>
                    {focusChapter.percentComplete}%
                  </span>
                )}
              </div>

              {focusChapter ? (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-10 h-10 rounded-lg bg-stone-900 text-white flex flex-col items-center justify-center shrink-0 leading-none'>
                      <span className='text-xs opacity-80'>{t('dashboard.kpi.episodeShort')}</span>
                      <span className='text-xs font-bold font-mono mt-0.5'>
                        {String(focusChapter.chapterNumber).padStart(2, '0')}
                      </span>
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='text-sm font-bold text-stone-900 truncate'>
                        {focusChapter.title
                          ? t('dashboard.kpi.chapterFocusTitle', { title: focusChapter.title })
                          : t('dashboard.kpi.chapterFocusFallback', {
                              number: focusChapter.chapterNumber,
                            })}
                      </div>
                      <div className='text-xs text-stone-600 flex flex-wrap items-center gap-2 mt-1'>
                        <span className={CHIP}>
                          {t('dashboard.kpi.focusPages', { count: focusChapter.pageCount })}
                        </span>
                        <span className={CHIP}>
                          {t('dashboard.kpi.focusPanels', { count: focusChapter.panelCount })}
                        </span>
                        {focusChapter.targetReleaseDate && (
                          <span className='px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium'>
                            {t('dashboard.kpi.focusDue', {
                              date: formatViDate(focusChapter.targetReleaseDate, lang) ?? '',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='w-full bg-stone-200/80 h-1.5 rounded-full overflow-hidden'>
                    <div
                      className='bg-studio-accent h-full rounded-full'
                      style={{ width: `${clampPercent(focusChapter.percentComplete)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className='text-xs text-stone-500 py-2'>{t('dashboard.kpi.noChapters')}</p>
              )}
            </div>

            <div className='sm:col-span-5 grid grid-cols-3 gap-2 text-center'>
              <LifecycleCell
                value={kpis.inProdChapters}
                label={t('dashboard.kpi.inProdStage')}
                hint={t('dashboard.kpi.inProdSub')}
                tone='text-blue-700'
              />
              <LifecycleCell
                value={kpis.approvedChapters}
                label={t('dashboard.kpi.approvedStage')}
                hint={t('dashboard.kpi.approvedSub')}
                tone='text-emerald-700'
              />
              <LifecycleCell
                value={kpis.publishedChapters}
                label={t('dashboard.kpi.publishedStage')}
                hint={t('dashboard.kpi.publishedSub')}
                tone='text-stone-700'
              />
            </div>
          </div>
        </div>

        <div className='pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs'>
          <div className='flex items-center gap-1.5'>
            <span className='text-stone-600'>{t('dashboard.kpi.gateTitle')}</span>
            <strong className='font-mono text-amber-800 font-bold px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200'>
              {kpis.waitingReviewTotal} <span>{t('dashboard.kpi.gateSubmissions')}</span>
            </strong>
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='text-stone-600'>{t('dashboard.kpi.riskTitle')}</span>
            <strong
              className={`font-mono font-bold px-1.5 py-0.5 rounded border ${
                kpis.overdueTotal > 0
                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}
            >
              {t('dashboard.kpi.riskItems', { count: kpis.overdueTotal })}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
};
