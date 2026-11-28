import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, Metric } from '@/shared/ui';
import type { ReviewTotals } from './reviewStats';

interface ReviewKpiStripProps {
  totals: ReviewTotals;
  avgReviewHours?: number | null;
}

/** Một dải số liệu gọn cho Tổng quan duyệt (cấp Series và cấp chương). */
export const ReviewKpiStrip: React.FC<ReviewKpiStripProps> = ({ totals, avgReviewHours }) => {
  const { t, lang } = useTranslation('review');
  const n = new Intl.NumberFormat(lang);
  const alert = 'text-rose-700';

  return (
    <Card as='section' aria-label={t('dashboard.kpi.ariaLabel')}>
      <div className='grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-stone-200/80'>
        <Metric
          className='px-4 py-3'
          label={t('dashboard.kpi.queue')}
          value={n.format(totals.queue)}
          hint={t('dashboard.kpi.queueHint', { count: totals.inReview })}
          data-testid='editor-dash-kpi-queue'
        />
        <Metric
          className='px-4 py-3'
          label={t('dashboard.kpi.toVerify')}
          value={n.format(totals.resolvedChangeRequests)}
          data-testid='editor-dash-kpi-verify'
        />
        <Metric
          className='px-4 py-3'
          label={t('dashboard.kpi.openRequests')}
          value={n.format(totals.openChangeRequests)}
          hint={
            totals.overdueChangeRequests > 0 ? (
              <span className={alert}>
                {t('dashboard.kpi.overdueHint', { count: totals.overdueChangeRequests })}
              </span>
            ) : undefined
          }
          data-testid='editor-dash-kpi-open'
        />
        <Metric
          className='px-4 py-3'
          label={t('dashboard.kpi.findings')}
          value={n.format(totals.openFindings)}
          hint={
            totals.blockingFindings > 0 ? (
              <span className={alert}>
                {t('dashboard.kpi.blockingHint', { count: totals.blockingFindings })}
              </span>
            ) : undefined
          }
          data-testid='editor-dash-kpi-findings'
        />
        <Metric
          className='px-4 py-3'
          label={t('dashboard.kpi.firstPass')}
          value={totals.firstPassRate == null ? '—' : `${totals.firstPassRate}%`}
          hint={
            avgReviewHours != null
              ? t('dashboard.kpi.avgHours', {
                  value: new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(
                    avgReviewHours,
                  ),
                })
              : undefined
          }
          data-testid='editor-dash-kpi-firstpass'
        />
      </div>
    </Card>
  );
};
