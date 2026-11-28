import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, ClipboardCheck, Gauge, Layers } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatKpiCard,
} from '@/shared/ui';
import {
  seriesService,
  type ChapterProgressDto,
  type SeriesDetailDto,
  type SeriesProgressDto,
} from '@/services/series.service';
import { buildChapterManagementUrl } from '@/app/routePaths';

/**
 * Tổng quan cấp Series (UC-16, BR-32): tiến độ mọi chương của một bộ truyện.
 * Cấp trên là Studio (/workspaces/:id/series), cấp dưới là Tổng quan chương (/chapters?chapterId=).
 */
export const SeriesDashboardView: React.FC = () => {
  const { t, lang } = useTranslation('production');
  const { t: tp } = useTranslation('pipeline');
  const { workspaceId = '', seriesId = '' } = useParams();

  const [progress, setProgress] = useState<SeriesProgressDto | null>(null);
  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seriesId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([seriesService.getSeriesProgress(seriesId), seriesService.getSeriesById(seriesId)])
      .then(([p, s]) => {
        if (!mounted) return;
        setProgress(p);
        setSeries(s);
      })
      .catch((e: unknown) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [seriesId]);

  const numberFmt = new Intl.NumberFormat(lang);
  const dateFmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' });

  const chapters: ChapterProgressDto[] = [...(progress?.chapters ?? [])].sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );
  const inProduction = chapters.filter((c) => c.status === 'InProduction').length;
  const avgPercent = chapters.length
    ? Math.round(chapters.reduce((sum, c) => sum + c.percentComplete, 0) / chapters.length)
    : 0;
  const overdueCount =
    (progress?.overdue.length ?? 0) + (progress?.overdueChangeRequests?.length ?? 0);
  const waitingReview = (progress?.workload ?? []).reduce((sum, w) => sum + w.waitingReview, 0);

  const statusLabel = (status: string) => {
    const key = `workbench.chapterStatus.${status}`;
    const label = tp(key);
    return label === key ? status : label;
  };

  return (
    <div className='p-6 max-w-[1440px] mx-auto space-y-6' data-testid='series-dashboard'>
      <PageHeader
        icon={<Gauge className='w-5 h-5' aria-hidden='true' />}
        eyebrow={t('seriesDashboard.eyebrow', { title: series?.title ?? '' })}
        title={t('seriesDashboard.title')}
        description={t('seriesDashboard.subtitle')}
      />

      {loading && (
        <div className='space-y-4 animate-pulse' aria-busy='true'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className='h-32 rounded-xl bg-stone-200/70' />
            ))}
          </div>
          <div className='h-64 rounded-xl bg-stone-200/70' />
        </div>
      )}

      {error && <Alert tone='danger'>{error}</Alert>}

      {progress && !loading && (
        <>
          <section
            aria-label={t('seriesDashboard.kpi.ariaLabel')}
            className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch'
          >
            <StatKpiCard
              tone='brand'
              icon={<Layers aria-hidden='true' />}
              title={t('seriesDashboard.kpi.chapters')}
              value={numberFmt.format(chapters.length)}
              description={t('seriesDashboard.kpi.chaptersInProduction', { count: inProduction })}
            />
            <StatKpiCard
              tone='success'
              icon={<Gauge aria-hidden='true' />}
              title={t('seriesDashboard.kpi.avgProgress')}
              value={`${avgPercent}%`}
              description={t('seriesDashboard.kpi.avgProgressNote')}
            />
            <StatKpiCard
              tone={overdueCount > 0 ? 'danger' : 'neutral'}
              icon={<AlertTriangle aria-hidden='true' />}
              title={t('seriesDashboard.kpi.overdue')}
              value={numberFmt.format(overdueCount)}
              description={t('seriesDashboard.kpi.overdueNote')}
            />
            <StatKpiCard
              tone='warning'
              icon={<ClipboardCheck aria-hidden='true' />}
              title={t('seriesDashboard.kpi.waitingReview')}
              value={numberFmt.format(waitingReview)}
              description={t('seriesDashboard.kpi.waitingReviewNote')}
            />
          </section>

          {/* AG-5..AG-7 (agy): biểu đồ % theo chương, burndown, tải việc ê-kíp đặt ở đây. */}

          <Card>
            <CardHeader
              icon={<BookOpen aria-hidden='true' />}
              title={t('seriesDashboard.chapters.title')}
            />
            <CardBody className='p-0'>
              {chapters.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className='w-8 h-8' />}
                  title={t('seriesDashboard.chapters.empty')}
                />
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead className='text-xs text-stone-500 text-left border-b border-stone-200'>
                      <tr>
                        <th scope='col' className='px-4 py-2.5 font-semibold'>
                          {t('seriesDashboard.chapters.colChapter')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold'>
                          {t('seriesDashboard.chapters.colStatus')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold min-w-[180px]'>
                          {t('seriesDashboard.chapters.colProgress')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('seriesDashboard.chapters.colOverdue')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold'>
                          {t('seriesDashboard.chapters.colTarget')}
                        </th>
                        <th scope='col' className='px-4 py-2.5'>
                          <span className='sr-only'>{t('seriesDashboard.chapters.open')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-stone-100'>
                      {chapters.map((c) => {
                        const overdue = c.overdueAssignments + (c.overdueChangeRequests ?? 0);
                        return (
                          <tr key={c.chapterId} className='hover:bg-stone-50/70'>
                            <td className='px-4 py-3'>
                              <div className='font-semibold text-stone-900'>
                                {t('seriesDashboard.chapters.chapterNumber', {
                                  number: c.chapterNumber,
                                })}
                              </div>
                              {c.title && (
                                <div className='text-xs text-stone-500 truncate max-w-[240px]'>
                                  {c.title}
                                </div>
                              )}
                            </td>
                            <td className='px-4 py-3'>
                              <Badge tone={c.status === 'InProduction' ? 'info' : 'neutral'}>
                                {statusLabel(String(c.status))}
                              </Badge>
                            </td>
                            <td className='px-4 py-3'>
                              <div className='flex items-center gap-2.5'>
                                <ProgressBar
                                  value={c.percentComplete}
                                  max={100}
                                  tone='success'
                                  label={t('seriesDashboard.chapters.progressAria', {
                                    number: c.chapterNumber,
                                  })}
                                  className='flex-1'
                                />
                                <span className='font-mono tabular-nums text-xs text-stone-700 w-12 text-right'>
                                  {Math.round(c.percentComplete)}%
                                </span>
                              </div>
                            </td>
                            <td className='px-4 py-3 text-right tabular-nums'>
                              {overdue > 0 ? (
                                <span className='font-semibold text-rose-700'>{overdue}</span>
                              ) : (
                                <span className='text-stone-400'>0</span>
                              )}
                            </td>
                            <td className='px-4 py-3 text-xs text-stone-600 whitespace-nowrap'>
                              {c.targetReleaseDate
                                ? dateFmt.format(new Date(c.targetReleaseDate))
                                : '—'}
                            </td>
                            <td className='px-4 py-3 text-right'>
                              <Link
                                to={buildChapterManagementUrl(workspaceId, seriesId, c.chapterId)}
                                className='focus-ring text-xs font-semibold text-orange-700 hover:text-orange-800 whitespace-nowrap'
                                data-testid={`series-dashboard-open-chapter-${c.chapterId}`}
                              >
                                {t('seriesDashboard.chapters.open')}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
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

export default SeriesDashboardView;
