import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, Gauge } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Drawer,
  EmptyState,
  PageHeader,
  ProgressBar,
} from '@/shared/ui';
import { assignmentService } from '@/services/assignment.service';
import { seriesService, type SeriesDetailDto } from '@/services/series.service';
import { buildEditorDeskUrl, buildScriptReviewUrl } from '@/app/routePaths';
import type { ChapterReviewStatsDto, SeriesReviewStatsDto } from '@/types';
import { StatBarChart, type StatBarDatum } from '@/shared/ui/charts/StatBarChart';
import { ReviewKpiStrip } from './ReviewKpiStrip';
import { sumReviewStats } from './reviewStats';
import { EditorChapterDetail } from './EditorChapterDetail';

const SCRIPT_TONE: Record<string, 'neutral' | 'warning' | 'success'> = {
  Draft: 'neutral',
  InReview: 'warning',
  Frozen: 'success',
};

/**
 * Tổng quan series cho Editor (CF3, AG-11): hàng chờ, tình hình series, tiến độ theo chương.
 * Cấp dưới: Tổng quan duyệt của một chương (editor/dashboard/:chapterId hoặc ?chapter=:id).
 */
export const EditorSeriesDashboardView: React.FC = () => {
  const { t, lang } = useTranslation('review');
  const { workspaceId = '', seriesId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const hasProductionTasks = chapters.some((c) => (c.tasksTotal ?? 0) > 0);
  const productionProgressData: StatBarDatum[] = chapters.map((c) => {
    const total = c.tasksTotal ?? 0;
    const approved = c.tasksApproved ?? 0;
    const pct = total > 0 ? Math.round((100 * approved) / total) : 0;
    return {
      key: c.chapterId,
      label: t('dashboard.chart.chapterTick', { number: c.chapterNumber }),
      value: pct,
    };
  });

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

  const handleSelectChapter = (chapterId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('chapter', chapterId);
      return next;
    });
  };

  const handleCloseDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('chapter');
      return next;
    });
  };

  const chapterParam = searchParams.get('chapter');
  const selectedChapter = chapterParam
    ? chapters.find((c) => c.chapterId === chapterParam)
    : undefined;

  const drawerTitle = selectedChapter
    ? selectedChapter.title
      ? `${t('dashboard.chapterNumber', { number: selectedChapter.chapterNumber })} - ${selectedChapter.title}`
      : t('dashboard.chapterNumber', { number: selectedChapter.chapterNumber })
    : '';

  const statusClusters: string[] = [];
  if (totals.productionPercent !== null) {
    statusClusters.push(
      t('dashboard.seriesStatus.production', {
        percent: totals.productionPercent,
        overdue: n.format(totals.tasksOverdue),
        rework: n.format(totals.tasksRework),
      }),
    );
  }
  if (stats?.bible && stats.bible.entries > 0) {
    statusClusters.push(
      t('dashboard.seriesStatus.bible', {
        locked: n.format(stats.bible.canonLocked),
        entries: n.format(stats.bible.entries),
      }),
    );
  }
  if (totals.firstPassRate != null && stats?.avgReviewHours != null) {
    statusClusters.push(
      t('dashboard.seriesStatus.reviewBoth', {
        rate: totals.firstPassRate,
        hours: new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(
          stats.avgReviewHours,
        ),
      }),
    );
  } else if (totals.firstPassRate != null) {
    statusClusters.push(t('dashboard.seriesStatus.firstPassOnly', { rate: totals.firstPassRate }));
  } else if (stats?.avgReviewHours != null) {
    statusClusters.push(
      t('dashboard.seriesStatus.avgHoursOnly', {
        hours: new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(
          stats.avgReviewHours,
        ),
      }),
    );
  }

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
          <div className='space-y-2'>
            <ReviewKpiStrip
              totals={totals}
              bibleConcepts={stats.bible?.conceptSubmitted ?? 0}
              workspaceId={workspaceId}
              seriesId={seriesId}
            />
            {statusClusters.length > 0 && (
              <p className='text-xs text-stone-600' data-testid='editor-dash-series-status'>
                {statusClusters.join(' · ')}
              </p>
            )}
          </div>

          {hasProductionTasks && (
            <Card>
              <CardHeader title={t('dashboard.chart.productionProgress')} />
              <CardBody>
                <StatBarChart
                  variant='sequence'
                  data={productionProgressData}
                  valueLabel={t('dashboard.chart.productionProgress')}
                  formatValue={(v) => `${n.format(v)}%`}
                  ariaLabel={t('dashboard.chart.productionProgress')}
                />
              </CardBody>
            </Card>
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
                        <th scope='col' className='px-4 py-2.5 font-semibold'>
                          {t('dashboard.col.production')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.queue')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.changeRequests')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 font-semibold text-right'>
                          {t('dashboard.col.findings')}
                        </th>
                        <th scope='col' className='px-4 py-2.5 text-right'>
                          <span className='sr-only'>{t('dashboard.details')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-stone-100 tabular-nums'>
                      {chapters.map((c) => {
                        const tasksTotal = c.tasksTotal ?? 0;
                        const tasksApproved = c.tasksApproved ?? 0;
                        const tasksOverdue = c.tasksOverdue ?? 0;
                        const prodPct =
                          tasksTotal > 0 ? Math.round((100 * tasksApproved) / tasksTotal) : null;

                        return (
                          <tr
                            key={c.chapterId}
                            onClick={() => handleSelectChapter(c.chapterId)}
                            className='hover:bg-stone-50/70 cursor-pointer transition-colors'
                          >
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
                            <td className='px-4 py-2.5'>
                              {prodPct == null ? (
                                <span className='text-stone-400'>—</span>
                              ) : (
                                <div className='min-w-[120px] max-w-[160px] space-y-1'>
                                  <div className='flex items-center gap-2'>
                                    <ProgressBar
                                      className='flex-1'
                                      value={tasksApproved}
                                      max={tasksTotal}
                                      label={t('dashboard.col.production')}
                                    />
                                    <span className='text-xs font-medium text-stone-700 w-9 text-right'>
                                      {prodPct}%
                                    </span>
                                  </div>
                                  {tasksOverdue > 0 && (
                                    <div className='text-xs text-rose-700 font-medium'>
                                      {t('dashboard.overdueTasks', { count: tasksOverdue })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className='px-4 py-2.5 text-right'>
                              {muted(c.waitingReview + c.inReview)}
                            </td>
                            <td className='px-4 py-2.5 text-right text-xs whitespace-nowrap'>
                              <span
                                className={
                                  c.openChangeRequests === 0
                                    ? 'text-stone-400'
                                    : c.overdueChangeRequests > 0
                                      ? 'font-semibold text-rose-700'
                                      : 'text-stone-800'
                                }
                              >
                                {n.format(c.openChangeRequests)}
                              </span>
                              <span className='text-stone-600'>
                                {' '}
                                {t('dashboard.requestsOpen')} ·{' '}
                              </span>
                              <span
                                className={
                                  c.resolvedChangeRequests === 0
                                    ? 'text-stone-400'
                                    : 'text-stone-800'
                                }
                              >
                                {n.format(c.resolvedChangeRequests)}
                              </span>
                              <span className='text-stone-600'>
                                {' '}
                                {t('dashboard.requestsVerify')}
                              </span>
                            </td>
                            <td className='px-4 py-2.5 text-right'>
                              {muted(c.openFindings, c.blockingFindings > 0)}
                            </td>
                            <td className='px-4 py-2.5 text-right'>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectChapter(c.chapterId);
                                }}
                                className='focus-ring text-xs font-semibold text-orange-700 hover:text-orange-800 whitespace-nowrap'
                                data-testid={`editor-dash-open-chapter-${c.chapterId}`}
                              >
                                {t('dashboard.details')}
                              </button>
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

      {selectedChapter && (
        <Drawer
          isOpen={Boolean(selectedChapter)}
          placement='right'
          size='lg'
          title={drawerTitle}
          closeLabel={t('dashboard.chapter.close')}
          onClose={handleCloseDrawer}
        >
          <div className='flex items-center justify-end gap-3 px-5 py-3 border-b border-stone-200/60 bg-stone-50/50'>
            {selectedChapter.scriptStatus === 'InReview' && (
              <Link
                to={buildScriptReviewUrl(workspaceId, seriesId, selectedChapter.chapterId)}
                className='focus-ring text-xs font-semibold text-orange-700 hover:text-orange-800 whitespace-nowrap'
              >
                {t('dashboard.chapter.reviewScript')}
              </Link>
            )}
            <Link
              to={buildEditorDeskUrl(workspaceId, seriesId, {
                chapterId: selectedChapter.chapterId,
              })}
              className='focus-ring btn-cta-primary text-xs px-3 py-1.5 rounded-lg'
            >
              {t('dashboard.chapter.openDeskChapter')}
            </Link>
          </div>
          <div className='p-5'>
            <EditorChapterDetail
              workspaceId={workspaceId}
              seriesId={seriesId}
              row={selectedChapter}
            />
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default EditorSeriesDashboardView;
