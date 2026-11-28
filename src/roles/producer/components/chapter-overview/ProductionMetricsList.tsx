import React, { useMemo } from 'react';
import type { ChapterProductionProgressDto } from '@/services/chapter.service';
import { useTranslation } from '@/lib/i18n';
import { Badge, ProgressBar } from '@/shared/ui';

export interface ProductionMetricsListProps {
  production: ChapterProductionProgressDto | null;
}

export const ProductionMetricsList: React.FC<ProductionMetricsListProps> = ({ production }) => {
  const { t, lang } = useTranslation('production');

  const numberFormatter = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const formatNumber = (val: number) => numberFormatter.format(val);

  const totalTasks = production?.totalTasks ?? 0;
  const approvedTasks = production?.approvedTasks ?? 0;
  const taskPct = totalTasks > 0 ? (production?.taskProgressPercent ?? 0) : 0;
  const submittedTasks = production?.submittedTasks ?? 0;
  const inProgressTasks = production?.inProgressTasks ?? 0;
  const reworkTasks = production?.reworkTasks ?? 0;
  const overdueTasks = production?.overdueTasks ?? 0;

  const totalPages = production?.totalPages ?? 0;
  const completedPages = production?.completedPages ?? 0;
  const pagePct = totalPages > 0 ? (production?.pageProgressPercent ?? 0) : 0;

  const totalPanels = production?.totalPanels ?? 0;
  const approvedPanels = production?.approvedPanels ?? 0;
  const panelPct = totalPanels > 0 ? (production?.panelProgressPercent ?? 0) : 0;

  return (
    <div className='rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3.5 space-y-3'>
      {/* Hàng 1: Việc (Tasks) */}
      <div data-testid='metric-task-progress' className='space-y-1.5'>
        <div className='flex items-center gap-3 text-xs'>
          <span
            className='w-36 shrink-0 font-semibold text-stone-700 truncate'
            title={t('producer.chapterManagement.overview.approvedTasks')}
          >
            {t('producer.chapterManagement.overview.approvedTasks')}
          </span>
          <div className='flex-1 min-w-0'>
            <ProgressBar
              value={totalTasks > 0 ? approvedTasks : 0}
              max={totalTasks}
              tone={totalTasks > 0 ? 'brand' : 'neutral'}
              label={t('producer.chapterManagement.overview.approvedTasks')}
            />
          </div>
          <div className='shrink-0 text-right min-w-[5.5rem]'>
            {totalTasks > 0 ? (
              <span className='font-mono font-bold text-stone-900 tabular-nums'>
                {formatNumber(approvedTasks)}/{formatNumber(totalTasks)} ({taskPct}%)
              </span>
            ) : (
              <span className='font-medium text-stone-500'>
                {t('producer.chapterManagement.overview.emptyTasks')}
              </span>
            )}
          </div>
        </div>

        {totalTasks > 0 && (
          <div className='flex items-center gap-3'>
            <div className='w-36 shrink-0 hidden sm:block' aria-hidden='true' />
            <div className='flex flex-wrap items-center gap-1.5 flex-1 min-w-0'>
              <Badge tone='warning' className='tabular-nums text-xs font-normal'>
                {t('producer.chapterManagement.overview.pendingReviewCount', {
                  count: formatNumber(submittedTasks),
                })}
              </Badge>
              <Badge tone='info' className='tabular-nums text-xs font-normal'>
                {t('producer.chapterManagement.overview.inProgressCount', {
                  count: formatNumber(inProgressTasks),
                })}
              </Badge>
              {reworkTasks > 0 && (
                <Badge tone='danger' className='tabular-nums text-xs font-normal'>
                  {t('producer.chapterManagement.overview.reworkCount', {
                    count: formatNumber(reworkTasks),
                  })}
                </Badge>
              )}
              {overdueTasks > 0 && (
                <Badge tone='danger' className='tabular-nums text-xs font-normal'>
                  {t('producer.chapterManagement.overview.overdueCount', {
                    count: formatNumber(overdueTasks),
                  })}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hàng 2: Trang (Pages) */}
      <div data-testid='metric-page-progress' className='flex items-center gap-3 text-xs'>
        <span
          className='w-36 shrink-0 font-semibold text-stone-700 truncate cursor-help'
          title={t('producer.chapterManagement.overview.completedPagesHint')}
        >
          {t('producer.chapterManagement.overview.completedPages')}
        </span>
        <div className='flex-1 min-w-0'>
          <ProgressBar
            value={totalPages > 0 ? completedPages : 0}
            max={totalPages}
            tone={totalPages > 0 ? 'success' : 'neutral'}
            label={t('producer.chapterManagement.overview.completedPages')}
          />
        </div>
        <div className='shrink-0 text-right min-w-[5.5rem]'>
          {totalPages > 0 ? (
            <span className='font-mono font-bold text-stone-900 tabular-nums'>
              {formatNumber(completedPages)}/{formatNumber(totalPages)} ({pagePct}%)
            </span>
          ) : (
            <span className='font-medium text-stone-500'>
              {t('producer.chapterManagement.overview.emptyPages')}
            </span>
          )}
        </div>
      </div>

      {/* Hàng 3: Khung tranh (Panels) */}
      <div data-testid='metric-panel-progress' className='flex items-center gap-3 text-xs'>
        <span
          className='w-36 shrink-0 font-semibold text-stone-700 truncate cursor-help'
          title={t('producer.chapterManagement.overview.completedPanelsHint')}
        >
          {t('producer.chapterManagement.overview.completedPanels')}
        </span>
        <div className='flex-1 min-w-0'>
          <ProgressBar
            value={totalPanels > 0 ? approvedPanels : 0}
            max={totalPanels}
            tone={totalPanels > 0 ? 'info' : 'neutral'}
            label={t('producer.chapterManagement.overview.completedPanels')}
          />
        </div>
        <div className='shrink-0 text-right min-w-[5.5rem]'>
          {totalPanels > 0 ? (
            <span className='font-mono font-bold text-stone-900 tabular-nums'>
              {formatNumber(approvedPanels)}/{formatNumber(totalPanels)} ({panelPct}%)
            </span>
          ) : (
            <span className='font-medium text-stone-500'>
              {t('producer.chapterManagement.overview.emptyPanels')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
