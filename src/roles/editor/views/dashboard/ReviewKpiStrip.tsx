import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { Card, Metric } from '@/shared/ui';
import { buildEditorDeskUrl, buildSeriesPath } from '@/app/routePaths';
import type { ReviewTotals } from './reviewStats';

export interface ReviewKpiStripProps {
  totals: ReviewTotals;
  bibleConcepts?: number;
  workspaceId?: string;
  seriesId?: string;
}

/** Một dải số liệu "Cần bạn xử lý" cho Tổng quan duyệt (cấp Series và cấp chương). */
export const ReviewKpiStrip: React.FC<ReviewKpiStripProps> = ({
  totals,
  bibleConcepts,
  workspaceId,
  seriesId,
}) => {
  const { t, lang } = useTranslation('review');
  const params = useParams();
  const ws = workspaceId ?? params.workspaceId ?? '';
  const sId = seriesId ?? params.seriesId ?? '';
  const n = new Intl.NumberFormat(lang);
  const showBible = bibleConcepts !== undefined;

  return (
    <Card as='section' aria-label={t('dashboard.kpi.ariaLabel')}>
      <div
        className={
          showBible
            ? 'grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-stone-200/80'
            : 'grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-stone-200/80'
        }
      >
        <Link
          to={buildEditorDeskUrl(ws, sId)}
          className='block hover:bg-stone-50 transition-colors focus-ring'
          data-testid='editor-dash-kpi-scripts'
        >
          <Metric
            className='px-4 py-3'
            label={t('dashboard.kpi.scriptsInReview')}
            value={n.format(totals.scriptsInReview)}
          />
        </Link>
        {showBible && (
          <Link
            to={buildSeriesPath(ws, sId, 'bible?tab=review')}
            className='block hover:bg-stone-50 transition-colors focus-ring'
            data-testid='editor-dash-kpi-bible'
          >
            <Metric
              className='px-4 py-3'
              label={t('dashboard.kpi.bibleConcepts')}
              value={n.format(bibleConcepts)}
            />
          </Link>
        )}
        <Link
          to={buildEditorDeskUrl(ws, sId)}
          className='block hover:bg-stone-50 transition-colors focus-ring'
          data-testid='editor-dash-kpi-queue'
        >
          <Metric
            className='px-4 py-3'
            label={t('dashboard.kpi.queue')}
            value={n.format(totals.queue)}
            hint={t('dashboard.kpi.queueHint', { count: totals.inReview })}
          />
        </Link>
        <Link
          to={buildEditorDeskUrl(ws, sId)}
          className='block hover:bg-stone-50 transition-colors focus-ring'
          data-testid='editor-dash-kpi-verify'
        >
          <Metric
            className='px-4 py-3'
            label={t('dashboard.kpi.toVerify')}
            value={n.format(totals.resolvedChangeRequests)}
          />
        </Link>
        <Metric
          className='px-4 py-3'
          label={t('dashboard.kpi.findings')}
          value={n.format(totals.openFindings)}
          hint={
            totals.blockingFindings > 0 ? (
              <span className='font-semibold text-rose-700'>
                {t('dashboard.kpi.blockingHint', { count: totals.blockingFindings })}
              </span>
            ) : undefined
          }
          data-testid='editor-dash-kpi-findings'
        />
      </div>
    </Card>
  );
};
