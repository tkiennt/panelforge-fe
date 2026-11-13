import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, Users, Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';
import { monetizationService, type WorkspaceReaderStatsDto } from '@/services/payment.service';

/**
 * Producer xem bộ truyện của Studio có bao nhiêu lượt đọc / người đọc.
 * Không hiển thị doanh thu — doanh thu do Publisher quản lý (/publisher/revenue).
 */
export const ProducerReaderStatsView: React.FC = () => {
  const { t, lang } = useTranslation('payments');
  const { workspaceId, seriesId } = useParams();
  const [data, setData] = useState<WorkspaceReaderStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    seriesId ? { [seriesId]: true } : {},
  );
  const fmt = (n: number) => n.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');

  useEffect(() => {
    if (!workspaceId) return;
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

  return (
    <div className='p-6 max-w-6xl mx-auto space-y-6'>
      <div className='flex items-center gap-2.5 pb-5 border-b border-[#E7E7E7]'>
        <div className='p-2 rounded-xl bg-[#F97316]/10 text-[#F97316]'>
          <Eye className='w-6 h-6' />
        </div>
        <div>
          <h1 className='text-xl font-bold text-[#171717] tracking-tight'>
            {t('readerStats.title')}
          </h1>
          <p className='text-xs text-[#737373] mt-0.5'>{t('readerStats.subtitle')}</p>
        </div>
      </div>

      {loading && (
        <div className='flex justify-center py-16 text-[#737373]'>
          <Loader2 className='w-5 h-5 animate-spin' />
        </div>
      )}
      {error && (
        <div className='flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm'>
          <AlertTriangle className='w-4 h-4' />
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <Kpi
              icon={<Eye className='w-4 h-4' />}
              label={t('readerStats.totalViews')}
              value={fmt(data.totalViews)}
            />
            <Kpi
              icon={<Users className='w-4 h-4' />}
              label={t('readerStats.uniqueReaders')}
              value={fmt(data.totalUniqueReaders)}
            />
          </div>

          {series.length === 0 ? (
            <p className='text-center text-sm text-[#737373] py-10'>{t('readerStats.empty')}</p>
          ) : (
            <div className='rounded-2xl border border-[#E7E7E7] bg-white overflow-hidden'>
              <table className='w-full text-sm'>
                <thead className='bg-[#FAF8F4] text-xs text-[#737373]'>
                  <tr>
                    <th className='text-left font-medium px-4 py-2.5'>{t('readerStats.series')}</th>
                    <th className='text-right font-medium px-4 py-2.5'>{t('readerStats.views')}</th>
                    <th className='text-right font-medium px-4 py-2.5'>
                      {t('readerStats.uniqueReaders')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => {
                    const open = !!expanded[s.seriesId];
                    return (
                      <React.Fragment key={s.seriesId}>
                        <tr className='border-t border-[#F0F0F0] hover:bg-[#FAF8F4]'>
                          <td className='px-4 py-2.5'>
                            <button
                              type='button'
                              onClick={() => setExpanded((e) => ({ ...e, [s.seriesId]: !open }))}
                              aria-expanded={open}
                              className='flex items-center gap-1.5 font-semibold text-[#171717] cursor-pointer'
                            >
                              {open ? (
                                <ChevronDown className='w-4 h-4' />
                              ) : (
                                <ChevronRight className='w-4 h-4' />
                              )}
                              {s.title}
                            </button>
                          </td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>{fmt(s.views)}</td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>
                            {fmt(s.uniqueReaders)}
                          </td>
                        </tr>
                        {open &&
                          s.chapters.map((c) => (
                            <tr
                              key={c.chapterId}
                              className='border-t border-[#F5F5F5] text-xs text-[#555555]'
                            >
                              <td className='pl-10 pr-4 py-2'>
                                <span className='font-medium text-[#171717]'>
                                  {t('readerStats.chapterLabel', { number: c.chapterNumber })}
                                </span>
                                {c.title && <span> · {c.title}</span>}
                                {!c.isPublished && (
                                  <span className='ml-2 px-1.5 py-0.5 rounded bg-stone-100 text-stone-500'>
                                    {t('readerStats.unpublished')}
                                  </span>
                                )}
                              </td>
                              <td className='px-4 py-2 text-right tabular-nums'>{fmt(c.views)}</td>
                              <td className='px-4 py-2 text-right tabular-nums'>
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
  <div className='rounded-2xl border border-[#E7E7E7] bg-white p-4'>
    <div className='flex items-center gap-1.5 text-xs text-[#737373]'>
      {icon}
      {label}
    </div>
    <div className='text-2xl font-bold text-[#171717] mt-1 tabular-nums'>{value}</div>
  </div>
);

export default ProducerReaderStatsView;
