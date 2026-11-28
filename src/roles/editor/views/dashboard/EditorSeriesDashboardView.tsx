import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Gauge } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from '@/shared/ui';
import { assignmentService } from '@/services/assignment.service';
import { seriesService, type SeriesDetailDto } from '@/services/series.service';
import { buildEditorDashboardUrl, buildEditorDeskUrl } from '@/app/routePaths';
import type { ChapterReviewStatsDto, SeriesReviewStatsDto } from '@/types';
import { StatBarChart, type StatBarDatum } from '@/shared/ui/charts/StatBarChart';
import { StatLineChart, type StatLinePoint } from '@/shared/ui/charts/StatLineChart';
import { hasAnyValue } from '@/shared/ui/charts/chartData';
import { ReviewKpiStrip } from './ReviewKpiStrip';
import { sumReviewStats } from './reviewStats';

const SCRIPT_TONE: Record<string, 'neutral' | 'warning' | 'success'> = {
  Draft: 'neutral',
  InReview: 'warning',
  Frozen: 'success',
};

/**
 * Tổng quan duyệt cấp Series cho Editor (CF3): hàng chờ, yêu cầu sửa, nhất quán theo từng chương.
 * Cấp dưới: Tổng quan duyệt của một chương (editor/dashboard/:chapterId).
 */
export const EditorSeriesDashboardView: React.FC = () => {
  const { t, lang } = useTranslation('review');
  const { workspaceId = '', seriesId = '' } = useParams();
  const [stats, setStats] = useState<SeriesReviewStatsDto | null>(null);
  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seriesId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      assignmentService.getSeriesReviewStats(seriesId),
      seriesService.getSeriesById(seriesId).catch(() => null),
    ])
      .then(([s, info]) => {
        if (!mounted) return;
        setStats(s);
        setSeries(info);
      })
      .catch((e: unknown) => mounted && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [seriesId]);

  const n = new Intl.NumberFormat(lang);
  const chapters: ChapterReviewStatsDto[] = [...(stats?.chapters ?? [])].sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );
  const totals = sumReviewStats(chapters);
  const queueByChapterData: StatBarDatum[] = chapters.map((c) => ({
    key: c.chapterId,
    label: t('dashboard.chart.chapterTick', { number: c.chapterNumber }),
    value: c.waitingReview + c.inReview,
  }));
  const decisionsData: StatLinePoint[] = (stats?.decisions ?? []).map((d) => ({
    periodStart: d.date,
    value: d.approved + d.rejected,
  }));
  const hasQueue = hasAnyValue(queueByChapterData);
  const hasDecisions = decisionsData.some((d) => d.value > 0);

  const scriptLabel = (status: string) => {
    const key = `dashboard.scriptStatus.${status}`;
    const label = t(key);
    return label === key ? status : label;
  };
  const muted = (value: number, alert = false) => (
    <span
      className={
        value === 0 ? 'text-stone-400' : alert ? 'font-semibold text-rose-700' : 'text-stone-800'
      }
    >
      {n.format(value)}
    </span>
  );

  return (
    <div className='p-6 max-w-[1440px] mx-auto space-y-5' data-testid='editor-series-dashboard'>
      <PageHeader
        icon={<Gauge className='w-5 h-5' aria-hidden='true' />}
        eyebrow={series?.title}
        title={t('dashboard.series.title')}
        actions={
          <Link
            to={buildEditorDeskUrl(workspaceId, seriesId)}
            className='focus-ring btn-cta-primary text-sm px-3 py-1.5 rounded-lg'
          >
            {t('dashboard.openDesk')}
          </Link>
        }
      />

      {loading && (
        <div className='space-y-4 animate-pulse' aria-busy='true'>
          <div className='h-20 rounded-xl bg-stone-200/70' />
          <div className='h-64 rounded-xl bg-stone-200/70' />
        </div>
      )}
      {error && <Alert tone='danger'>{error}</Alert>}

      {stats && !loading && (
        <>
          <ReviewKpiStrip totals={totals} avgReviewHours={stats.avgReviewHours} />

          {(hasQueue || hasDecisions) && (
            <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
              {hasQueue && (
                <Card>
                  <CardHeader title={t('dashboard.chart.queueByChapter')} />
                  <CardBody>
                    <StatBarChart
                      variant='sequence'
                      data={queueByChapterData}
                      valueLabel={t('dashboard.chart.queue')}
                      formatValue={n.format}
                      ariaLabel={t('dashboard.chart.queueByChapter')}
                    />
                  </CardBody>
                </Card>
              )}
              {hasDecisions && (
                <Card>
                  <CardHeader title={t('dashboard.chart.decisions30d')} />
                  <CardBody>
                    <StatLineChart
                      data={decisionsData}
                      granularity='Day'
                      locale={lang}
                      valueLabel={t('dashboard.chart.decisions')}
                      formatValue={n.format}
                      ariaLabel={t('dashboard.chart.decisions30d')}
                    />
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          <Card>
            <CardHeader
              icon={<BookOpen aria-hidden='true' />}
              title={t('dashboard.series.chaptersTitle')}
            />
            <CardBody className='p-0'>
              {chapters.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className='w-8 h-8' />}
                  title={t('dashboard.series.empty')}
                />
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead className='text-xs text-stone-500 text-left border-b border-stone-200'>
                      <tr>
                        <th scope='col' className='px-4 py-2.5 font-semibold'>
                          {t('dashboard.col.chapter')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold'>
                          {t('dashboard.col.script')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.queue')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.toVerify')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.openRequests')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.findings')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.decisions')}
                        </th>
                        <th scope='col' className='px-4 py-2.5'>
                          <span className='sr-only'>{t('dashboard.open')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-stone-100 tabular-nums'>
                      {chapters.map((c) => (
                        <tr key={c.chapterId} className='hover:bg-stone-50/70'>
                          <td className='px-4 py-2.5'>
                            <div className='font-semibold text-stone-900'>
                              {t('dashboard.chapterNumber', { number: c.chapterNumber })}
                            </div>
                            {c.title && (
                              <div className='text-xs text-stone-500 truncate max-w-[240px]'>
                                {c.title}
                              </div>
                            )}
                          </td>
                          <td className='px-4 py-2.5'>
                            <Badge tone={SCRIPT_TONE[c.scriptStatus] ?? 'neutral'}>
                              {scriptLabel(c.scriptStatus)}
                            </Badge>
                          </td>
                          <td className='px-4 py-2.5 text-right'>
                            {muted(c.waitingReview + c.inReview)}
                          </td>
                          <td className='px-4 py-2.5 text-right'>
                            {muted(c.resolvedChangeRequests)}
                          </td>
                          <td className='px-4 py-2.5 text-right'>
                            {muted(c.openChangeRequests, c.overdueChangeRequests > 0)}
                          </td>
                          <td className='px-4 py-2.5 text-right'>
                            {muted(c.openFindings, c.blockingFindings > 0)}
                          </td>
                          <td className='px-4 py-2.5 text-right text-xs text-stone-600 whitespace-nowrap'>
                            {t('dashboard.decisionsCell', {
                              approved: n.format(c.approved),
                              rejected: n.format(c.rejected),
                            })}
                          </td>
                          <td className='px-4 py-2.5 text-right'>
                            <Link
                              to={buildEditorDashboardUrl(workspaceId, seriesId, c.chapterId)}
                              className='focus-ring text-xs font-semibold text-orange-700 hover:text-orange-800 whitespace-nowrap'
                              data-testid={`editor-dash-open-chapter-${c.chapterId}`}
                            >
                              {t('dashboard.open')}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

export default EditorSeriesDashboardView;
