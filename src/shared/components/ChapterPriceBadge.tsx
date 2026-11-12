import React from 'react';
import { useTranslation } from '@/lib/i18n';

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

/** Badge phân biệt chương Miễn phí / chương trả phí 🔒 {priceVnd}đ. */
export const ChapterPriceBadge: React.FC<{ isLocked?: boolean; priceVnd?: number }> = ({
  isLocked,
  priceVnd,
}) => {
  const { t } = useTranslation();
  if (!isLocked) {
    return (
      <span
        className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200'
        title={t('payments.chapterPricing.freeTitle')}
      >
        {t('payments.chapterPricing.free')}
      </span>
    );
  }
  const price = priceVnd ?? 0;
  return (
    <span
      className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200'
      title={t('payments.chapterPricing.paidTitle', { price: formatVnd(price) })}
    >
      🔒 {formatVnd(price)}
    </span>
  );
};
