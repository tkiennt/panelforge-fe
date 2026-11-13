import React from 'react';
import { Eye, ShoppingBag, Star, CreditCard } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useMoney } from './useMoney';
import {
  CONTENT_LANGUAGES,
  type ContentLanguage,
  type InsightStatsDto,
} from '@/services/payment.service';

export const LanguageFilter: React.FC<{
  value: ContentLanguage | '';
  onChange: (v: ContentLanguage | '') => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation('payments');
  return (
    <div
      role='radiogroup'
      aria-label={t('insights.filterLabel')}
      className='inline-flex rounded-xl border border-[#E7E7E7] bg-white p-0.5'
    >
      {(['', ...CONTENT_LANGUAGES] as const).map((l) => (
        <button
          key={l || 'all'}
          type='button'
          role='radio'
          aria-checked={value === l}
          onClick={() => onChange(l)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            value === l ? 'bg-[#F97316] text-white' : 'text-[#555555] hover:bg-[#FAF8F4]'
          }`}
        >
          {l ? t(`lang.${l}`) : t('lang.all')}
        </button>
      ))}
    </div>
  );
};

export const StatCards: React.FC<{ stats: InsightStatsDto; showRating?: boolean }> = ({
  stats,
  showRating = true,
}) => {
  const { t } = useTranslation('payments');
  const { num, vnd } = useMoney();
  const cards = [
    {
      icon: <Eye className='w-4 h-4' />,
      label: t('insights.views'),
      value: num(stats.views),
      sub: t('insights.viewsSub', { readers: num(stats.uniqueReaders) }),
    },
    {
      icon: <ShoppingBag className='w-4 h-4' />,
      label: t('insights.purchases'),
      value: num(stats.purchases),
      sub: t('insights.purchasesSub', { chapters: num(stats.chapterPurchases) }),
    },
    ...(showRating
      ? [
          {
            icon: <Star className='w-4 h-4' />,
            label: t('insights.rating'),
            value: stats.ratingCount ? `${stats.ratingAverage.toFixed(1)}★` : '—',
            sub: t('insights.ratingSub', { count: num(stats.ratingCount) }),
          },
        ]
      : []),
    {
      icon: <CreditCard className='w-4 h-4' />,
      label: t('insights.revenue'),
      value: vnd(stats.revenueVnd),
      sub: t('insights.revenueSub'),
    },
  ];
  return (
    <div className={`grid grid-cols-2 ${showRating ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
      {cards.map((c) => (
        <div key={c.label} className='rounded-2xl border border-[#E7E7E7] bg-white p-4'>
          <div className='flex items-center gap-1.5 text-xs text-[#737373]'>
            {c.icon}
            {c.label}
          </div>
          <div className='text-2xl font-bold text-[#171717] mt-1 tabular-nums'>{c.value}</div>
          <div className='text-[11px] text-[#737373] mt-0.5'>{c.sub}</div>
        </div>
      ))}
    </div>
  );
};
