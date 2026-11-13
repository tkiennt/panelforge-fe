import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  monetizationService,
  type ContentLanguage,
  type SeriesInsightsDto,
} from '@/services/payment.service';
import { LanguageFilter, StatCards } from '../components/MonetizationWidgets';
import { useMoney } from '../components/useMoney';

/**
 * Publisher → General → chọn bộ truyện: dashboard tổng (lượt xem, lượt mua, đánh giá, doanh thu) lọc theo ngôn ngữ,
 * và danh sách chương; bấm một chương để vào màn chương có sidebar General / Manage.
 */
export const PublisherSeriesInsightsView: React.FC = () => {
  const { t } = useTranslation('payments');
  const { seriesId = '' } = useParams();
  const navigate = useNavigate();
  const { num, vnd } = useMoney();
  const [language, setLanguage] = useState<ContentLanguage | ''>('');
  const [data, setData] = useState<SeriesInsightsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    monetizationService
      .getSeriesInsights(seriesId, language || undefined)
      .then((res) => mounted && setData(res))
      .catch((err) => mounted && setError(getApiErrorMessage(err) || t('insights.loadError')))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [seriesId, language, t]);

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-[#E7E7E7]'>
        <div>
          <Link
            to='/publisher/revenue'
            className='inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#171717]'
          >
            <ArrowLeft className='w-3.5 h-3.5' />
            {t('insights.back')}
          </Link>
          <h1 className='text-xl font-bold text-[#171717] tracking-tight mt-1'>
            {data?.title ?? '…'}
          </h1>
          {data && <p className='text-xs text-[#737373]'>{data.workspaceName}</p>}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <LanguageFilter value={language} onChange={setLanguage} />
          {data && (
            <Link
              to={`/publisher/revenue/workspaces/${data.workspaceId}?seriesId=${data.seriesId}`}
              className='px-3 py-1.5 rounded-xl border border-[#E7E7E7] text-xs font-medium hover:bg-[#FAF8F4]'
            >
              {t('insights.transactions')}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className='flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm'>
          <AlertTriangle className='w-4 h-4' />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className='flex justify-center py-16 text-[#737373]'>
          <Loader2 className='w-5 h-5 animate-spin' />
        </div>
      ) : (
        data && (
          <>
            <StatCards stats={data.totals} />

            {!language && (
              <section>
                <h2 className='text-sm font-bold text-[#171717] mb-2'>
                  {t('insights.byLanguage')}
                </h2>
                <div className='rounded-2xl border border-[#E7E7E7] bg-white overflow-x-auto'>
                  <table className='w-full text-sm min-w-[560px]'>
                    <thead className='bg-[#FAF8F4] text-xs text-[#737373]'>
                      <tr>
                        <th className='text-left font-medium px-4 py-2'>
                          {t('insights.filterLabel')}
                        </th>
                        <th className='text-right font-medium px-4 py-2'>{t('insights.views')}</th>
                        <th className='text-right font-medium px-4 py-2'>
                          {t('insights.purchases')}
                        </th>
                        <th className='text-right font-medium px-4 py-2'>{t('insights.rating')}</th>
                        <th className='text-right font-medium px-4 py-2'>
                          {t('insights.revenue')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byLanguage.map((l) => (
                        <tr key={l.language} className='border-t border-[#F0F0F0]'>
                          <td className='px-4 py-2 font-medium'>{t(`lang.${l.language}`)}</td>
                          <td className='px-4 py-2 text-right tabular-nums'>
                            {num(l.stats.views)}
                          </td>
                          <td className='px-4 py-2 text-right tabular-nums'>
                            {num(l.stats.purchases)}
                          </td>
                          <td className='px-4 py-2 text-right tabular-nums'>
                            {l.stats.ratingCount
                              ? `${l.stats.ratingAverage.toFixed(1)}★ (${l.stats.ratingCount})`
                              : '—'}
                          </td>
                          <td className='px-4 py-2 text-right tabular-nums'>
                            {vnd(l.stats.revenueVnd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section>
              <h2 className='text-sm font-bold text-[#171717] mb-2'>{t('insights.chapterList')}</h2>
              {data.chapters.length === 0 ? (
                <p className='text-center text-sm text-[#737373] py-10'>{t('insights.empty')}</p>
              ) : (
                <div className='rounded-2xl border border-[#E7E7E7] bg-white overflow-x-auto'>
                  <table className='w-full text-sm min-w-[820px]'>
                    <thead className='bg-[#FAF8F4] text-xs text-[#737373]'>
                      <tr>
                        <th className='text-left font-medium px-4 py-2'>{t('insights.chapter')}</th>
                        <th className='text-left font-medium px-4 py-2'>
                          {t('insights.languages')}
                        </th>
                        <th className='text-right font-medium px-4 py-2'>
                          {t('insights.previewPages')}
                        </th>
                        <th className='text-right font-medium px-4 py-2'>{t('insights.views')}</th>
                        <th className='text-right font-medium px-4 py-2'>
                          {t('insights.purchases')}
                        </th>
                        <th className='text-right font-medium px-4 py-2'>
                          {t('insights.revenue')}
                        </th>
                        <th className='px-4 py-2' />
                      </tr>
                    </thead>
                    <tbody>
                      {data.chapters.map((c) => (
                        <tr
                          key={c.chapterId}
                          className='border-t border-[#F0F0F0] hover:bg-[#FAF8F4] cursor-pointer'
                          onClick={() =>
                            navigate(
                              `/publisher/revenue/series/${seriesId}/chapters/${c.chapterId}`,
                            )
                          }
                        >
                          <td className='px-4 py-2.5'>
                            <div className='font-semibold text-[#171717]'>
                              {t('insights.chapterLabel', { number: c.chapterNumber })}
                              {c.title && (
                                <span className='font-normal text-[#555555]'> · {c.title}</span>
                              )}
                            </div>
                            <div className='flex gap-1.5 mt-0.5 text-[10px]'>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  c.isLocked
                                    ? 'bg-orange-50 text-orange-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {c.isLocked
                                  ? `${t('insights.paid')} · ${vnd(c.priceVnd)}`
                                  : t('insights.free')}
                              </span>
                              {!c.isPublished && (
                                <span className='px-1.5 py-0.5 rounded bg-stone-100 text-stone-500'>
                                  {t('insights.unpublished')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className='px-4 py-2.5 text-xs uppercase tracking-wide text-[#555555]'>
                            {c.availableLanguages.join(' · ')}
                          </td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>
                            {c.isLocked ? (
                              <span className='inline-flex items-center gap-1'>
                                <Eye className='w-3 h-3 text-emerald-600' />
                                {c.previewPages}/{c.pageCount}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>
                            {num(c.stats.views)}
                          </td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>
                            {num(c.stats.purchases)}
                          </td>
                          <td className='px-4 py-2.5 text-right tabular-nums font-semibold'>
                            {vnd(c.stats.revenueVnd)}
                          </td>
                          <td className='px-4 py-2.5 text-right'>
                            <span className='inline-flex items-center gap-1 text-xs font-medium text-[#F97316]'>
                              {t('insights.manage')}
                              <ChevronRight className='w-3.5 h-3.5' />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
};

export default PublisherSeriesInsightsView;
