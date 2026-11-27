import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, BookOpen, Monitor, Eye, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ProducerSharedHeader } from '@/shared/features/production-workspace/ProducerSharedHeader';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { monetizationService, type WorkspaceReaderStatsDto } from '@/services/payment.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { Alert, Badge, Card, CardBody, CardHeader, StatusBadge } from '@/shared/ui';

export interface SeriesRevenueViewProps {
  onShowToast: (title: string, desc: string) => void;
}

export const SeriesRevenueView: React.FC<SeriesRevenueViewProps> = () => {
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const { t, lang } = useTranslation('pipeline');

  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [readerStats, setReaderStats] = useState<WorkspaceReaderStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fmt = (n: number) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n);

  useEffect(() => {
    if (!seriesId || !workspaceId) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      seriesService.getSeriesById(seriesId).catch(() => null),
      chapterService
        .getChaptersBySeries(seriesId, 1, 100)
        .catch(() => ({ items: [] as ChapterDto[] })),
      monetizationService.getReaderStats(workspaceId).catch(() => null),
    ])
      .then(([seriesRes, chaptersRes, statsRes]) => {
        if (!mounted) return;
        if (seriesRes) setSeries(seriesRes);
        if (chaptersRes?.items) {
          setChapters([...chaptersRes.items].sort((a, b) => a.chapterNumber - b.chapterNumber));
        }
        if (statsRes) setReaderStats(statsRes);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err.message || t('revenueView.loadError'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, seriesId, t]);

  const currentSeriesStats = useMemo(
    () => (readerStats?.series ?? []).find((s) => s.seriesId === seriesId),
    [readerStats, seriesId],
  );

  const chapterStatsById = useMemo(() => {
    const map = new Map<string, { views: number; uniqueReaders: number; isPublished: boolean }>();
    for (const c of currentSeriesStats?.chapters ?? []) {
      map.set(c.chapterId, {
        views: c.views,
        uniqueReaders: c.uniqueReaders,
        isPublished: c.isPublished,
      });
    }
    return map;
  }, [currentSeriesStats]);

  const filteredChapters = useMemo(() => {
    if (statusFilter === 'all') return chapters;
    return chapters.filter((c) => String(c.status) === statusFilter);
  }, [chapters, statusFilter]);

  const totalViews = currentSeriesStats ? currentSeriesStats.views : null;
  const uniqueReaders = currentSeriesStats ? currentSeriesStats.uniqueReaders : null;

  return (
    <div className='w-full min-h-screen bg-[#FAF9F5] font-sans text-stone-900 flex flex-col min-w-0'>
      <ProducerSharedHeader
        mode='series'
        hideBackLink
        workspaceId={workspaceId}
        seriesId={seriesId}
        seriesTitle={series?.title}
        seriesFormat={series?.format}
        subtitle={t('revenueView.subtitle')}
        actionCta={
          <div className='flex items-center gap-2'>
            <label htmlFor='revenue-status-filter' className='sr-only'>
              {t('revenueView.filterStatusAll')}
            </label>
            <select
              id='revenue-status-filter'
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className='px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium focus:outline-none focus:border-accent cursor-pointer'
            >
              <option value='all'>{t('revenueView.filterStatusAll')}</option>
              <option value='PreProduction'>{t('workbench.chapterStatus.PreProduction')}</option>
              <option value='InProduction'>{t('workbench.chapterStatus.InProduction')}</option>
              <option value='ChapterApproved'>
                {t('workbench.chapterStatus.ChapterApproved')}
              </option>
              <option value='HandedOffAndPublished'>
                {t('workbench.chapterStatus.HandedOffAndPublished')}
              </option>
            </select>
          </div>
        }
      />

      <div className='py-6 flex flex-col flex-1 overflow-y-auto max-w-[1640px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-5'>
        {loading && (
          <div className='space-y-4 animate-pulse'>
            <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
              <div className='h-28 rounded-xl bg-stone-200/70' />
              <div className='h-28 rounded-xl bg-stone-200/70' />
              <div className='h-28 rounded-xl bg-stone-200/70' />
              <div className='h-28 rounded-xl bg-stone-200/70' />
            </div>
            <div className='h-64 rounded-xl bg-stone-200/70' />
          </div>
        )}

        {error && <Alert tone='danger'>{error}</Alert>}

        {!loading && !error && (
          <div className='space-y-5' id='view-revenue'>
            {/* 4 Equal-Height KPI Cards */}
            <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch'>
              {/* Card 1: Lượt đọc trực tuyến (dữ liệu thật) */}
              <div className='p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex flex-col justify-between gap-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs font-semibold'>
                  <span>{t('revenueView.globalReads')}</span>
                  <Eye className='w-4 h-4 text-emerald-600' aria-hidden='true' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900 font-mono tabular-nums'>
                    {totalViews !== null ? fmt(totalViews) : '—'}
                  </span>
                  {totalViews !== null && (
                    <span className='text-xs text-stone-500'>{t('revenueView.viewsUnit')}</span>
                  )}
                </div>
                <div className='text-xs pt-2 border-t border-stone-100 text-stone-500 flex items-center gap-1.5'>
                  <Users className='w-3.5 h-3.5 text-stone-400' aria-hidden='true' />
                  <span>
                    {uniqueReaders !== null
                      ? t('revenueView.uniqueReaders', { count: fmt(uniqueReaders) })
                      : t('revenueView.noDataYet')}
                  </span>
                </div>
              </div>

              {/* Card 2: Tổng doanh thu kỳ */}
              <div className='p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex flex-col justify-between gap-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs font-semibold'>
                  <span>{t('revenueView.totalRevenue')}</span>
                  <TrendingUp className='w-4 h-4 text-accent-dark' aria-hidden='true' />
                </div>
                <div className='text-2xl font-bold text-stone-900 font-mono'>—</div>
                <div className='text-xs pt-2 border-t border-stone-100 text-stone-500'>
                  {t('revenueView.paymentNotConnected')}
                </div>
              </div>

              {/* Card 3: Doanh thu bản in */}
              <div className='p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex flex-col justify-between gap-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs font-semibold'>
                  <span>{t('revenueView.printRevenue')}</span>
                  <BookOpen className='w-4 h-4 text-stone-500' aria-hidden='true' />
                </div>
                <div className='text-2xl font-bold text-stone-900 font-mono'>—</div>
                <div className='text-xs pt-2 border-t border-stone-100 text-stone-500'>
                  {t('revenueView.paymentNotConnected')}
                </div>
              </div>

              {/* Card 4: Doanh thu đọc số */}
              <div className='p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex flex-col justify-between gap-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs font-semibold'>
                  <span>{t('revenueView.digitalRevenue')}</span>
                  <Monitor className='w-4 h-4 text-blue-600' aria-hidden='true' />
                </div>
                <div className='text-2xl font-bold text-stone-900 font-mono'>—</div>
                <div className='text-xs pt-2 border-t border-stone-100 text-stone-500'>
                  {t('revenueView.paymentNotConnected')}
                </div>
              </div>
            </div>

            {/* Chapters Table */}
            <Card>
              <CardHeader
                icon={<TrendingUp aria-hidden='true' />}
                title={t('revenueView.chapterAnalysis')}
                actions={
                  <Badge tone='neutral'>
                    {t('revenueView.chapterCount', { count: filteredChapters.length })}
                  </Badge>
                }
              />

              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-head-wash border-b border-head-line text-kraft-ink uppercase tracking-wide font-semibold'>
                    <tr>
                      <th className='py-3 px-4'>{t('revenueView.thChapter')}</th>
                      <th className='py-3 px-4 text-right'>{t('revenueView.thViews')}</th>
                      <th className='py-3 px-4 text-right'>{t('revenueView.thPrint')}</th>
                      <th className='py-3 px-4 text-right'>{t('revenueView.thDigital')}</th>
                      <th className='py-3 px-4 text-right'>{t('revenueView.thStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-stone-200 text-stone-800'>
                    {filteredChapters.length === 0 ? (
                      <tr>
                        <td colSpan={5} className='py-8 text-center text-xs text-stone-500'>
                          {t('revenueView.emptyChapters')}
                        </td>
                      </tr>
                    ) : (
                      filteredChapters.map((chap) => {
                        const st = chapterStatsById.get(chap.id);
                        return (
                          <tr key={chap.id} className='hover:bg-stone-50/60 transition-colors'>
                            <td className='py-3 px-4'>
                              <div className='font-bold text-stone-900'>
                                {formatChapterLabel(
                                  chap.chapterNumber,
                                  chap.title || t('workbench.draftTitle'),
                                )}
                              </div>
                            </td>
                            <td className='py-3 px-4 text-right font-mono tabular-nums text-stone-800'>
                              {st ? (
                                <span>
                                  {fmt(st.views)}{' '}
                                  <span className='text-stone-500'>({fmt(st.uniqueReaders)})</span>
                                </span>
                              ) : (
                                <span className='text-stone-400'>—</span>
                              )}
                            </td>
                            <td className='py-3 px-4 text-right font-mono text-stone-500'>—</td>
                            <td className='py-3 px-4 text-right font-mono text-stone-500'>—</td>
                            <td className='py-3 px-4 text-right'>
                              <StatusBadge kind='chapter' status={chap.status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
