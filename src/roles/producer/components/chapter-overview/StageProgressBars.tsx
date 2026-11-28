import React, { useMemo } from 'react';
import type { StageProgressBreakdownDto } from '@/services/chapter.service';
import { useTranslation } from '@/lib/i18n';

export interface StageProgressBarsProps {
  stages: StageProgressBreakdownDto[];
}

export const StageProgressBars: React.FC<StageProgressBarsProps> = ({ stages }) => {
  const { t, lang } = useTranslation('production');

  const numberFormatter = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const formatNumber = (val: number) => numberFormatter.format(val);

  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
  }, [stages]);

  if (!stages || stages.length === 0) {
    return null;
  }

  const legendLabels = {
    approved: t('producer.chapterManagement.overview.stageLegend.approved'),
    submitted: t('producer.chapterManagement.overview.stageLegend.submitted'),
    inProgress: t('producer.chapterManagement.overview.stageLegend.inProgress'),
    rework: t('producer.chapterManagement.overview.stageLegend.rework'),
    unassigned: t('producer.chapterManagement.overview.stageLegend.unassigned'),
  };

  return (
    <div className='space-y-3 pt-2'>
      {/* Legend */}
      <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600'>
        <div className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-emerald-500 shrink-0' />
          <span>{legendLabels.approved}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-amber-400 shrink-0' />
          <span>{legendLabels.submitted}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-blue-400 shrink-0' />
          <span>{legendLabels.inProgress}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-rose-500 shrink-0' />
          <span>{legendLabels.rework}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-stone-300 shrink-0' />
          <span>{legendLabels.unassigned}</span>
        </div>
      </div>

      {/* Stage rows */}
      <div className='space-y-2'>
        {sortedStages.map((st) => {
          const hasTasks = st.totalTasks > 0;
          const segments = hasTasks
            ? [
                {
                  key: 'approved',
                  count: st.approvedTasks,
                  color: 'bg-emerald-500',
                  label: legendLabels.approved,
                },
                {
                  key: 'submitted',
                  count: st.submittedTasks,
                  color: 'bg-amber-400',
                  label: legendLabels.submitted,
                },
                {
                  key: 'inProgress',
                  count: st.inProgressTasks,
                  color: 'bg-blue-400',
                  label: legendLabels.inProgress,
                },
                {
                  key: 'rework',
                  count: st.reworkTasks,
                  color: 'bg-rose-500',
                  label: legendLabels.rework,
                },
                {
                  key: 'unassigned',
                  count: st.unassignedTasks,
                  color: 'bg-stone-300',
                  label: legendLabels.unassigned,
                },
              ].filter((seg) => seg.count > 0)
            : [];

          const ariaLabel = hasTasks
            ? `${st.stageName}: ${formatNumber(st.approvedTasks)}/${formatNumber(st.totalTasks)} (${legendLabels.approved}: ${formatNumber(st.approvedTasks)}, ${legendLabels.submitted}: ${formatNumber(st.submittedTasks)}, ${legendLabels.inProgress}: ${formatNumber(st.inProgressTasks)}, ${legendLabels.rework}: ${formatNumber(st.reworkTasks)}, ${legendLabels.unassigned}: ${formatNumber(st.unassignedTasks)})`
            : `${st.stageName}: ${t('producer.chapterManagement.overview.emptyTasks')}`;

          return (
            <div
              key={st.stageId}
              role='img'
              aria-label={ariaLabel}
              className='flex items-center gap-3 text-xs'
            >
              <span
                className='w-36 shrink-0 truncate font-medium text-stone-700'
                title={st.stageName}
              >
                {st.stageName}
              </span>
              {hasTasks ? (
                <>
                  <div className='relative flex h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100'>
                    {segments.map((seg) => {
                      const percent = (seg.count / st.totalTasks) * 100;
                      return (
                        <div
                          key={seg.key}
                          className={`h-full ${seg.color}`}
                          style={{ width: `${percent}%` }}
                          title={`${seg.label}: ${formatNumber(seg.count)}`}
                        />
                      );
                    })}
                  </div>
                  <span className='shrink-0 font-mono tabular-nums text-stone-600'>
                    {formatNumber(st.approvedTasks)}/{formatNumber(st.totalTasks)}
                  </span>
                </>
              ) : (
                <span className='flex-1 text-stone-500'>
                  {t('producer.chapterManagement.overview.emptyTasks')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
