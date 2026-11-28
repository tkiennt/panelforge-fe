import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';
import { Alert, Card, CardBody, CardHeader, EmptyState, PageHeader } from '@/shared/ui';
import { StatBarChart, type StatBarDatum } from '@/shared/ui/charts/StatBarChart';
import { hasAnyValue, rankWithOther } from '@/shared/ui/charts/chartData';
import { monetizationService, type WorkspaceReaderStatsDto } from '@/services/payment.service';

const TOP_SERIES = 8;

/**
 * Thống kê lượt đọc / người đọc bộ truyện của Studio (dùng chung cho Producer và Admin).
 * Không hiển thị doanh thu — doanh thu do Publisher quản lý (/publisher/revenue).
 */
export const ReaderStatsView: React.FC = () => {
  const { t, lang } = useTranslation('payments');
  const { workspaceId: paramWorkspaceId, seriesId } = useParams();
  const activeWsId = (() => {
    try {
      const saved = localStorage.getItem('activeWorkspace');
      if (saved) return JSON.parse(saved)?.id;
    } catch {
      // ignore
    }
    return undefined;
  })();
  const workspaceId = paramWorkspaceId || activeWsId;

  const [data, setData] = useState<WorkspaceReaderStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    seriesId ? { [seriesId]: true } : {},
  );
  const fmt = (n: number) => n.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    monetizationService
      .getReaderStats(workspaceId)
      .then((res) => mounted && setData(res))
      .catch((err) => mounted && setError(getApiErrorMessage(err) || t('readerStats.loadError')))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [workspaceId, t]);

  const series = (data?.series ?? []).filter((s) => !seriesId || s.seriesId === seriesId);

  // Một bộ truyện → cột theo chương (giữ thứ tự chương); nhiều bộ → xếp hạng bộ truyện, gộp đuôi vào "Khác".
  const singleSeries = series.length === 1 ? series[0] : null;
  const chartData: StatBarDatum[] = singleSeries
    ? [...singleSeries.chapters]
        .sort((a, b) => a.chapterNumber - b.chapterNumber)
        .map((c) => ({
          key: c.chapterId,
          label: t('charts.chapterTick', { number: c.chapterNumber }),
          value: c.views,
        }))
    : rankWithOther(
        series.map((s) => ({ key: s.seriesId, label: s.title, value: s.views })),
        TOP_SERIES,
        t('charts.other'),
      );
  const chartTitle = singleSeries
    ? t('charts.viewsByChapterOf', { title: singleSeries.title })
    : t('charts.viewsBySeries');

  return (
    <div className='p-6 max-w-6xl mx-auto space-y-6'>
      <PageHeader
        icon={<Eye className='w-5 h-5' aria-hidden='true' />}
        title={t('readerStats.title')}
        description={t('readerStats.subtitle')}
      />

      {loading && (
        <div className='space-y-4 animate-pulse'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='h-24 rounded-xl bg-stone-200/70' />
            <div className='h-24 rounded-xl bg-stone-200/70' />
          </div>
          <div className='h-56 rounded-xl bg-stone-200/70' />
        </div>
      )}
      {error && <Alert tone='danger'>{error}</Alert>}

      {!workspaceId && !loading && !error && (
        <EmptyState
          icon={<Eye className='w-8 h-8' />}
          title={t('readerStats.noWorkspace', 'Chọn Studio để xem thống kê lượt đọc.')}
        />
      )}

      {data && !loading && (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch'>
            <Kpi
              icon={<Eye className='w-4 h-4 text-emerald-600' />}
              label={t('readerStats.totalViews')}
              value={fmt(data.totalViews)}
            />
            <Kpi
              icon={<Users className='w-4 h-4 text-accent-dark' />}
              label={t('readerStats.uniqueReaders')}
              value={fmt(data.totalUniqueReaders)}
            />
          </div>

          {hasAnyValue(chartData) && (
            <Card>
              <CardHeader
                title={chartTitle}
                subtitle={
                  !singleSeries && series.length > TOP_SERIES
                    ? t('charts.topNote', { count: TOP_SERIES })
                    : undefined
                }
              />
              <CardBody>
                <StatBarChart
                  data={chartData}
                  variant={singleSeries ? 'sequence' : 'ranked'}
                  valueLabel={t('readerStats.views')}
                  formatValue={fmt}
                  ariaLabel={t('charts.ariaLabel', { title: chartTitle })}
                />
              </CardBody>
            </Card>
          )}

          {series.length === 0 ? (
            <EmptyState icon={<Eye className='w-8 h-8' />} title={t('readerStats.empty')} />
          ) : (
            <Card>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-head-wash border-b border-head-line text-xs text-kraft-ink uppercase tracking-wide font-semibold'>
                    <tr>
                      <th className='text-left px-4 py-3'>{t('readerStats.series')}</th>
                      <th className='text-right px-4 py-3'>{t('readerStats.views')}</th>
                      <th className='text-right px-4 py-3'>{t('readerStats.uniqueReaders')}</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-stone-200'>
                    {series.map((s) => {
                      const open = !!expanded[s.seriesId];
                      return (
                        <React.Fragment key={s.seriesId}>
                          <tr className='hover:bg-stone-50/70'>
                            <td className='px-4 py-2.5'>
                              <button
                                type='button'
                                onClick={() => setExpanded((e) => ({ ...e, [s.seriesId]: !open }))}
                                aria-expanded={open}
                                className='flex items-center gap-1.5 font-semibold text-stone-900 cursor-pointer'
                              >
                                {open ? (
                                  <ChevronDown className='w-4 h-4' />
                                ) : (
                                  <ChevronRight className='w-4 h-4' />
                                )}
                                {s.title}
                              </button>
                            </td>
                            <td className='px-4 py-2.5 text-right font-mono tabular-nums'>
                              {fmt(s.views)}
                            </td>
                            <td className='px-4 py-2.5 text-right font-mono tabular-nums'>
                              {fmt(s.uniqueReaders)}
                            </td>
                          </tr>
                          {open &&
                            s.chapters.map((c) => (
                              <tr
                                key={c.chapterId}
                                className='bg-[#FAF9F5]/60 text-xs text-stone-600'
                              >
                                <td className='pl-10 pr-4 py-2'>
                                  <span className='font-medium text-stone-900'>
                                    {t('readerStats.chapterLabel', { number: c.chapterNumber })}
                                  </span>
                                  {c.title && <span> · {c.title}</span>}
                                  {!c.isPublished && (
                                    <span className='ml-2 px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200'>
                                      {t('readerStats.unpublished')}
                                    </span>
                                  )}
                                </td>
                                <td className='px-4 py-2 text-right font-mono tabular-nums'>
                                  {fmt(c.views)}
                                </td>
                                <td className='px-4 py-2 text-right font-mono tabular-nums'>
                                  {fmt(c.uniqueReaders)}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className='rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs'>
    <div className='flex items-center gap-1.5 text-xs font-medium text-stone-500'>
      {icon}
      {label}
    </div>
    <div className='text-2xl font-mono font-bold text-stone-900 mt-1 tabular-nums'>{value}</div>
  </div>
);

export default ReaderStatsView;
