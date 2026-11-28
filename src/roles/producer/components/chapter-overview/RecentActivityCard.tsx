import React from 'react';
import { Clock } from 'lucide-react';
import type { ChapterReviewDto } from '@/services/chapter.service';
import { useTranslation } from '@/lib/i18n';
import { Card, CardBody, CardHeader } from '@/shared/ui';
import { formatFullDateTime, formatRelativeTime, REVIEW_ACTION_LABEL_KEYS } from './relativeTime';

export interface RecentActivityCardProps {
  reviews: ChapterReviewDto[];
  maxItems?: number;
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  reviews,
  maxItems = 4,
}) => {
  const { t, lang } = useTranslation('production');
  const displayReviews = (reviews ?? []).slice(0, maxItems);

  return (
    <Card as='section' data-testid='overview-recent-activity'>
      <CardHeader
        icon={<Clock aria-hidden='true' />}
        title={t('producer.chapterManagement.overview.recentActivityTitle')}
      />
      <CardBody>
        {displayReviews.length === 0 ? (
          <p className='text-xs text-stone-500'>
            {t('producer.chapterManagement.overview.recentActivityEmpty')}
          </p>
        ) : (
          <ul className='divide-y divide-stone-100 text-xs'>
            {displayReviews.map((rev) => {
              const actionLabel = REVIEW_ACTION_LABEL_KEYS[rev.action]
                ? t(REVIEW_ACTION_LABEL_KEYS[rev.action])
                : rev.action;
              const relativeTime = formatRelativeTime(rev.createdAt, undefined, lang);
              const fullDateTime = formatFullDateTime(rev.createdAt, lang);

              return (
                <li key={rev.id} className='py-2 flex items-center justify-between gap-3 min-w-0'>
                  <div className='flex items-center gap-1.5 min-w-0 flex-1'>
                    <span className='font-semibold text-stone-900 shrink-0'>{actionLabel}</span>
                    {rev.comment && (
                      <>
                        <span className='text-stone-400 shrink-0 select-none' aria-hidden='true'>
                          ·
                        </span>
                        <span className='text-stone-600 truncate' title={rev.comment}>
                          {rev.comment}
                        </span>
                      </>
                    )}
                  </div>
                  <span
                    className='text-stone-500 font-mono tabular-nums whitespace-nowrap shrink-0 ml-auto'
                    title={fullDateTime}
                  >
                    {relativeTime}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
};
