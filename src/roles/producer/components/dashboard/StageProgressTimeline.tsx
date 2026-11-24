import React from 'react';
import { BookOpen, CheckCircle2, Palette, PenTool } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const STAGES = [
  { labelKey: 'dashboard.timeline.stageScript', short: 'Script', icon: BookOpen },
  { labelKey: 'dashboard.timeline.stageSketch', short: 'Sketch', icon: PenTool },
  { labelKey: 'dashboard.timeline.stageInkColor', short: 'Ink/Color', icon: Palette },
  { labelKey: 'dashboard.timeline.stageDone', short: 'Done', icon: CheckCircle2 },
];

// Backend only reports a chapter-level percent, so the four steps are thirds of that value.
const stageIndexFor = (percentComplete: number, isFinished: boolean): number => {
  if (isFinished) return 3;
  if (percentComplete >= 66) return 2;
  if (percentComplete >= 33) return 1;
  return 0;
};

export const StageProgressTimeline: React.FC<{ percentComplete: number; status?: string }> = ({
  percentComplete,
  status,
}) => {
  const { t } = useTranslation('production');
  const isFinished =
    status === 'ChapterApproved' || status === 'HandedOffAndPublished' || percentComplete >= 100;
  const currentIndex = stageIndexFor(percentComplete, isFinished);

  return (
    <div
      className='flex items-center gap-1 sm:gap-2 shrink-0 py-0.5'
      aria-label={t('dashboard.timeline.ariaLabel', { percent: percentComplete })}
    >
      {STAGES.map((stage, idx) => {
        const isReached = idx <= currentIndex;
        const isCurrent = !isFinished && idx === currentIndex;
        const Icon = stage.icon;
        const stageLabel = t(stage.labelKey);

        return (
          <React.Fragment key={stage.short}>
            {idx > 0 && (
              <div
                className={`h-[2px] w-4 sm:w-6 md:w-8 lg:w-10 rounded-full ${
                  isReached ? 'bg-studio-accent' : 'bg-stone-200'
                }`}
              />
            )}
            <div
              className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${
                isCurrent
                  ? 'bg-studio-accent text-white ring-2 ring-studio-accent/30'
                  : isReached
                    ? 'bg-studio-accent text-white'
                    : 'bg-stone-100 text-stone-500 border border-stone-200'
              }`}
              title={`${stageLabel} (${stage.short}): ${isReached ? t('dashboard.timeline.statusReached') : t('dashboard.timeline.statusNotStarted')}`}
            >
              <Icon className='w-3 h-3 sm:w-3.5 sm:h-3.5' aria-hidden='true' />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
