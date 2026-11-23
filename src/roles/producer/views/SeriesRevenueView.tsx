import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, Download, BookOpen, Monitor, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ProducerSharedHeader } from '@/shared/features/production-workspace/ProducerSharedHeader';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { monetizationService, type WorkspaceReaderStatsDto } from '@/services/payment.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';

export interface SeriesRevenueViewProps {
  onShowToast: (title: string, desc: string) => void;
}

export const SeriesRevenueView: React.FC<SeriesRevenueViewProps> = ({ onShowToast }) => {
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const { t, lang } = useTranslation('pipeline');

  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [readerStats, setReaderStats] = useState<WorkspaceReaderStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n);

  useEffect(() => {
    if (!seriesId || !workspaceId) return;
    let mounted = true;
    setLoading(true);

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
        if (chaptersRes?.items) setChapters(chaptersRes.items);
        if (statsRes) setReaderStats(statsRes);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err.message || 'Không thể tải thống kê');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, seriesId]);

  const currentSeriesStats = (readerStats?.series ?? []).find((s) => s.seriesId === seriesId);

  const totalViews = currentSeriesStats ? currentSeriesStats.views : null;
  const uniqueReaders = currentSeriesStats ? currentSeriesStats.uniqueReaders : null;

  const handleExportCsv = () => {
    onShowToast(
      t('revenueView.exportCsv', 'Xuất báo cáo (CSV)'),
      'Đang chuẩn bị file CSV dữ liệu doanh thu & lượt đọc...',
    );
  };

  return (
    <div className='w-full min-h-screen bg-[#FAF9F5] font-sans text-stone-900 flex flex-col'>
      <ProducerSharedHeader
        workspaceId={workspaceId}
        seriesId={seriesId}
        chapters={chapters}
        seriesTitle={series?.title}
        seriesFormat={series?.format}
        activeTab='revenue'
      />

      <div className='py-6 flex flex-col flex-1 overflow-y-auto max-w-[1640px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6'>
        {loading && (
          <div className='flex items-center justify-center py-20 text-stone-500'>
            <Loader2 className='w-6 h-6 animate-spin' />
          </div>
        )}

        {error && (
          <div className='flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs'>
            <AlertTriangle className='w-4 h-4 shrink-0' />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className='space-y-6' id='view-revenue'>
            {/* Top Overview Card */}
            <div className='p-5 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0'>
                  <TrendingUp className='w-5 h-5' />
                </div>
                <div>
                  <div className='flex items-center gap-2.5 flex-wrap'>
                    <h1 className='text-lg font-bold text-stone-900 leading-tight'>
                      {t('revenueView.title', 'Doanh thu & Thống kê độc giả')} —{' '}
                      {series?.title || 'Series'}
                    </h1>
                  </div>
                  <p className='text-xs text-stone-500 mt-0.5'>
                    {t(
                      'revenueView.subtitle',
                      'Dữ liệu hợp nhất từ nhà xuất bản in ấn và các nền tảng số Shonen Jump+, MangaPlus (VNĐ)',
                    )}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2.5'>
                <button
                  type='button'
                  onClick={handleExportCsv}
                  className='px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <Download className='w-3.5 h-3.5 text-stone-500' />
                  <span>{t('revenueView.exportCsv', 'Xuất báo cáo (CSV)')}</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
              {/* Card 1: Tổng doanh thu kỳ */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('revenueView.totalRevenue', 'Tổng doanh thu kỳ')}</span>
                  <TrendingUp className='w-4 h-4 text-orange-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900 font-mono'>—</span>
                </div>
                <div className='flex items-center justify-between text-xs pt-1 border-t border-stone-100 text-stone-500 font-mono'>
                  <span>—</span>
                  <span>—</span>
                </div>
              </div>

              {/* Card 2: Doanh thu bản in */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('revenueView.printRevenue', 'Doanh thu bản in (Tankōbon)')}</span>
                  <BookOpen className='w-4 h-4 text-orange-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-orange-700 font-mono'>—</span>
                  <span className='text-xs text-stone-500'>—</span>
                </div>
                <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                  <div className='bg-orange-600 h-full w-0' />
                </div>
                <div className='text-xs text-stone-500 pt-1'>—</div>
              </div>

              {/* Card 3: Doanh thu đọc số */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('revenueView.digitalRevenue', 'Doanh thu đọc số & bản quyền')}</span>
                  <Monitor className='w-4 h-4 text-blue-600' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-blue-700 font-mono'>—</span>
                  <span className='text-xs text-stone-500'>—</span>
                </div>
                <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                  <div className='bg-blue-600 h-full w-0' />
                </div>
                <div className='text-xs text-stone-500 pt-1'>—</div>
              </div>

              {/* Card 4: Lượt đọc trực tuyến toàn cầu (Dữ liệu thật từ monetizationService) */}
              <div className='p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-2'>
                <div className='flex items-center justify-between text-stone-500 text-xs uppercase tracking-wider font-medium'>
                  <span>{t('revenueView.globalReads', 'Lượt đọc trực tuyến toàn cầu')}</span>
                  <Eye className='w-4 h-4 text-emerald-500' />
                </div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-bold text-stone-900 font-mono'>
                    {totalViews !== null ? fmt(totalViews) : '—'}
                  </span>
                  <span className='text-xs text-stone-500'>lượt</span>
                </div>
                <div className='flex items-center justify-between text-xs pt-1 border-t border-stone-100'>
                  <span className='text-stone-500'>
                    {uniqueReaders !== null ? `${fmt(uniqueReaders)} độc giả riêng biệt` : '—'}
                  </span>
                  <span className='text-emerald-700 font-semibold font-mono'>—</span>
                </div>
              </div>
            </div>

            {/* Chapters Table */}
            <div className='bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden'>
              <div className='px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-bold text-stone-900 uppercase tracking-wider'>
                    {t(
                      'revenueView.chapterAnalysis',
                      'Bảng phân tích doanh thu & lượt đọc theo từng chương',
                    )}
                  </span>
                  <span className='text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono'>
                    {chapters.length} chương
                  </span>
                </div>
                <div className='flex items-center gap-2 text-xs text-stone-500'>
                  <span>{t('revenueView.currencyUnit', 'Đơn vị tiền tệ: VNĐ (₫)')}</span>
                </div>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-stone-50/70 border-b border-stone-200 text-stone-600 uppercase tracking-wider font-semibold'>
                    <tr>
                      <th className='py-3 px-4'>{t('revenueView.thChapter', 'Chương / Tựa đề')}</th>
                      <th className='py-3 px-4 text-center'>
                        {t('revenueView.thViews', 'Lượt xem tích lũy')}
                      </th>
                      <th className='py-3 px-4 text-center'>
                        {t('revenueView.thCompletion', 'Tỷ lệ đọc hết')}
                      </th>
                      <th className='py-3 px-4 text-right'>
                        {t('revenueView.thPrint', 'Doanh thu bản in')}
                      </th>
                      <th className='py-3 px-4 text-right'>
                        {t('revenueView.thDigital', 'Doanh thu đọc số')}
                      </th>
                      <th className='py-3 px-4 text-right'>
                        {t('revenueView.thTotal', 'Tổng doanh thu (VNĐ)')}
                      </th>
                      <th className='py-3 px-4 text-right'>
                        {t('revenueView.thStatus', 'Đánh giá & Tình trạng')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-stone-200 text-stone-800'>
                    {chapters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className='py-8 text-center text-xs text-stone-400'>
                          Chưa có chương nào trong series.
                        </td>
                      </tr>
                    ) : (
                      chapters.map((chap) => (
                        <tr key={chap.id} className='hover:bg-stone-50/60 transition-colors'>
                          <td className='py-3 px-4'>
                            <div className='font-bold text-stone-900'>
                              {formatChapterLabel(chap.chapterNumber, chap.title || 'Bản thảo')}
                            </div>
                            <div className='text-xs text-stone-500 font-mono'>
                              Chương {chap.chapterNumber} • {chap.status}
                            </div>
                          </td>
                          <td className='py-3 px-4 text-center font-mono text-stone-700'>—</td>
                          <td className='py-3 px-4 text-center font-mono text-stone-700'>—</td>
                          <td className='py-3 px-4 text-right font-mono text-stone-700'>—</td>
                          <td className='py-3 px-4 text-right font-mono text-stone-700'>—</td>
                          <td className='py-3 px-4 text-right font-mono font-bold text-stone-900'>
                            —
                          </td>
                          <td className='py-3 px-4 text-right'>
                            <span className='px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium'>
                              {chap.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className='p-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-500'>
                <span>
                  {t(
                    'revenueView.footerNotice',
                    'Dữ liệu doanh thu được tổng hợp định kỳ lúc 24:00 hàng ngày từ MangaPlus API và đơn hàng Tankōbon.',
                  )}
                </span>
                <div className='font-semibold text-stone-700'>
                  {t('revenueView.cumulativeTotal', 'Tổng tích lũy')} {chapters.length} chương:{' '}
                  <span className='text-orange-700 font-mono font-bold text-sm'>—</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
