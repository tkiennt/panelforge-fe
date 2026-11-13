import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, AlertTriangle, Search, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';
import { monetizationService, type PublisherRevenueDto } from '@/services/payment.service';
import { publisherService } from '@/services/publisher.service';

interface WorkspaceOption {
  id: string;
  name: string;
}

/**
 * Publisher quản lý doanh thu theo bộ truyện (mở khóa chương + trang trả phí) kèm lượt đọc.
 * Bấm một bộ truyện → màn giao dịch của Studio (duyệt VietQR, cấu hình ngân hàng), lọc sẵn bộ truyện.
 */
export const PublisherRevenueView: React.FC = () => {
  const { t, lang } = useTranslation('payments');
  const navigate = useNavigate();
  const [data, setData] = useState<PublisherRevenueDto | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fmt = (n: number) => n.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
  const vnd = (n: number) => `${fmt(n)}đ`;

  useEffect(() => {
    publisherService
      .getWorkspaces()
      .then((ws) => setWorkspaces((ws ?? []).map((w) => ({ id: w.id, name: w.name }))))
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    const h = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(h);
  }, [searchInput]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    monetizationService
      .getPublisherRevenue({ workspaceId: workspaceId || undefined, search: search || undefined })
      .then((res) => mounted && setData(res))
      .catch((err) => mounted && setError(getApiErrorMessage(err) || t('revenue.loadError')))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [workspaceId, search, t]);

  const s = data?.summary;

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      <div className='flex items-center gap-2.5 pb-5 border-b border-[#E7E7E7]'>
        <div className='p-2 rounded-xl bg-[#F97316]/10 text-[#F97316]'>
          <CreditCard className='w-6 h-6' />
        </div>
        <div>
          <h1 className='text-xl font-bold text-[#171717] tracking-tight'>{t('revenue.title')}</h1>
          <p className='text-xs text-[#737373] mt-0.5'>{t('revenue.subtitle')}</p>
        </div>
      </div>

      {s && (
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <Kpi label={t('revenue.total')} value={vnd(s.totalRevenueVnd)} highlight />
          <Kpi label={t('revenue.chapterRevenue')} value={vnd(s.chapterRevenueVnd)} />
          <Kpi label={t('revenue.pending')} value={fmt(s.pendingCount)} />
          <Kpi label={t('revenue.views')} value={fmt(s.totalViews)} />
        </div>
      )}

      <div className='flex flex-wrap gap-2.5'>
        <label className='relative flex-1 min-w-[200px]'>
          <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]' />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('revenue.searchPlaceholder')}
            aria-label={t('revenue.searchPlaceholder')}
            className='w-full pl-9 pr-3 py-2 rounded-xl border border-[#E7E7E7] text-sm focus:outline-none focus:border-[#F97316]'
          />
        </label>
        <select
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          aria-label={t('revenue.studio')}
          className='px-3 py-2 rounded-xl border border-[#E7E7E7] text-sm bg-white'
        >
          <option value=''>{t('revenue.allStudios')}</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className='flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm'>
          <AlertTriangle className='w-4 h-4' />
          {error}
        </div>
      )}

      {loading ? (
        <div className='flex justify-center py-16 text-[#737373]'>
          <Loader2 className='w-5 h-5 animate-spin' />
        </div>
      ) : data && data.series.length === 0 ? (
        <p className='text-center text-sm text-[#737373] py-10'>{t('revenue.empty')}</p>
      ) : (
        data && (
          <div className='rounded-2xl border border-[#E7E7E7] bg-white overflow-x-auto'>
            <table className='w-full text-sm min-w-[760px]'>
              <thead className='bg-[#FAF8F4] text-xs text-[#737373]'>
                <tr>
                  <th className='text-left font-medium px-4 py-2.5'>{t('revenue.series')}</th>
                  <th className='text-left font-medium px-4 py-2.5'>{t('revenue.studio')}</th>
                  <th className='text-right font-medium px-4 py-2.5'>{t('revenue.total')}</th>
                  <th className='text-right font-medium px-4 py-2.5'>{t('revenue.unlocks')}</th>
                  <th className='text-right font-medium px-4 py-2.5'>{t('revenue.pending')}</th>
                  <th className='text-right font-medium px-4 py-2.5'>{t('revenue.views')}</th>
                  <th className='text-right font-medium px-4 py-2.5'>{t('revenue.readers')}</th>
                  <th className='px-4 py-2.5' />
                </tr>
              </thead>
              <tbody>
                {data.series.map((r) => (
                  <tr key={r.seriesId} className='border-t border-[#F0F0F0] hover:bg-[#FAF8F4]'>
                    <td className='px-4 py-2.5 font-semibold text-[#171717]'>
                      <button
                        type='button'
                        onClick={() => navigate(`/publisher/revenue/series/${r.seriesId}`)}
                        className='text-left hover:text-[#F97316] hover:underline cursor-pointer'
                      >
                        {r.seriesTitle}
                      </button>
                    </td>
                    <td className='px-4 py-2.5 text-[#555555]'>{r.workspaceName}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-semibold'>
                      {vnd(r.totalRevenueVnd)}
                    </td>
                    <td className='px-4 py-2.5 text-right text-xs text-[#555555]'>
                      {t('revenue.chapterUnlocksCount', { count: r.chapterUnlocks })}
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>
                      {r.pendingCount > 0 ? (
                        <span className='px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold'>
                          {r.pendingCount}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{fmt(r.totalViews)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{fmt(r.uniqueReaders)}</td>
                    <td className='px-4 py-2.5 text-right'>
                      <button
                        type='button'
                        onClick={() =>
                          navigate(
                            `/publisher/revenue/workspaces/${r.workspaceId}?seriesId=${r.seriesId}`,
                          )
                        }
                        className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E7E7E7] text-xs font-medium hover:bg-white cursor-pointer'
                      >
                        {t('revenue.manage')}
                        <ChevronRight className='w-3.5 h-3.5' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div
    className={`rounded-2xl border p-4 ${highlight ? 'border-[#F97316]/40 bg-[#F97316]/5' : 'border-[#E7E7E7] bg-white'}`}
  >
    <div className='text-xs text-[#737373]'>{label}</div>
    <div className='text-xl font-bold text-[#171717] mt-1 tabular-nums'>{value}</div>
  </div>
);

export default PublisherRevenueView;
