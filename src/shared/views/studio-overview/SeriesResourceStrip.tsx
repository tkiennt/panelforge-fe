import React from 'react';
import { Ban, Cpu, HardDrive, Infinity as InfinityIcon } from 'lucide-react';
import type { UsageMeterDto, WorkspaceUsageDto } from '@/services/workspace.service';
import { Badge, ProgressBar } from '@/shared/ui';
import type { SurfaceTone } from '@/shared/ui/Surface';
import { useTranslation } from '@/lib/i18n';
import { formatBytes, formatTokens } from './formatters';

export interface SeriesResourceStripProps {
  storageUsed: number;
  storageQuota: number;
  /** Chỉ đọc các trường có sẵn trong WorkspaceUsageDto (storage, aiTokens, aiEnabled). */
  usage: WorkspaceUsageDto | null;
}

/** Ngưỡng cảnh báo: ≥80% hổ phách, ≥95% đỏ. */
const WARN_PERCENT = 80;
const DANGER_PERCENT = 95;

const percentOf = (used: number, quota: number): number | null =>
  quota > 0 ? Math.min(100, (used / quota) * 100) : null;

/** Dưới 1% nhưng đã dùng thì ghi "<1%" thay vì "0%"; còn lại giữ 1 chữ số thập phân. */
const formatPercent = (percent: number): string =>
  percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent * 10) / 10}%`;

const toneFor = (percent: number | null, base: 'brand' | 'ai'): SurfaceTone => {
  if (percent === null) return base;
  if (percent >= DANGER_PERCENT) return 'danger';
  if (percent >= WARN_PERCENT) return 'warning';
  return base;
};

const ICON_TONE: Record<SurfaceTone, string> = {
  brand: 'border-orange-200/70 bg-accent-soft text-accent-dark',
  ai: 'border-violet-200/70 bg-violet-50 text-violet-700',
  warning: 'border-amber-200/70 bg-amber-50 text-amber-700',
  danger: 'border-rose-200/70 bg-rose-50 text-rose-700',
  success: 'border-emerald-200/70 bg-emerald-50 text-emerald-700',
  info: 'border-blue-200/70 bg-blue-50 text-blue-700',
  neutral: 'border-stone-200/80 bg-stone-100 text-stone-600',
};

const PERCENT_TONE: Record<SurfaceTone, string> = {
  brand: 'text-stone-600',
  ai: 'text-violet-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
  success: 'text-emerald-700',
  info: 'text-blue-700',
  neutral: 'text-stone-600',
};

const ResourceItem: React.FC<{
  icon: React.ReactNode;
  tone: 'brand' | 'ai';
  label: string;
  used: string;
  /** Phần hạn mức hiển thị nhỏ sau số đã dùng, ví dụ "/ 10 GB". null = không giới hạn. */
  quota: string | null;
  percent: number | null;
  unlimitedLabel: string;
  testId: string;
}> = ({ icon, tone, label, used, quota, percent, unlimitedLabel, testId }) => {
  const resolvedTone = toneFor(percent, tone);

  return (
    <div className='flex min-w-0 items-center gap-2.5 px-3.5 py-2' data-testid={testId}>
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-lg border ${ICON_TONE[resolvedTone]}`}
        aria-hidden='true'
      >
        {icon}
      </span>
      <div className='min-w-0 space-y-1'>
        <div className='flex items-baseline gap-1.5 whitespace-nowrap text-xs tabular-nums'>
          <span className='font-medium text-stone-500'>{label}</span>
          <span className='font-bold text-stone-900'>
            {used}
            {quota !== null && <span className='font-normal text-stone-500'>{` / ${quota}`}</span>}
          </span>
        </div>

        {percent !== null ? (
          <div className='flex items-center gap-2'>
            <ProgressBar
              value={percent}
              max={100}
              label={label}
              tone={resolvedTone}
              className='h-1.5 w-24 shrink-0'
            />
            <span
              className={`shrink-0 text-xs font-semibold leading-none tabular-nums ${PERCENT_TONE[resolvedTone]}`}
            >
              {formatPercent(percent)}
            </span>
          </div>
        ) : (
          <Badge
            tone={tone === 'ai' ? 'ai' : 'neutral'}
            icon={<InfinityIcon aria-hidden='true' />}
            className='py-0'
          >
            {unlimitedLabel}
          </Badge>
        )}
      </div>
    </div>
  );
};

export const SeriesResourceStrip: React.FC<SeriesResourceStripProps> = ({
  storageUsed,
  storageQuota,
  usage,
}) => {
  const { t } = useTranslation();
  const unlimited = t('workspace.studioHub.metrics.unlimited');

  const storageUnlimited = usage?.storage?.isUnlimited === true || storageQuota <= 0;
  const storagePercent = storageUnlimited
    ? null
    : (usage?.storage?.percentUsed ?? percentOf(storageUsed, storageQuota));

  const meterQuota = (meter: UsageMeterDto) =>
    meter.isUnlimited ? null : formatTokens(meter.quota);
  const meterPercent = (meter: UsageMeterDto) =>
    meter.isUnlimited ? null : (meter.percentUsed ?? percentOf(meter.used, meter.quota));

  return (
    <section
      aria-label={t('workspace.studioHub.series.resourceHeading')}
      data-testid='series-resource-strip'
      className='flex flex-wrap items-stretch divide-y divide-stone-200/80 rounded-xl border border-head-line bg-head-wash/65 sm:divide-x sm:divide-y-0'
    >
      <ResourceItem
        icon={<HardDrive className='size-4' />}
        tone='brand'
        label={t('workspace.studioHub.series.resourceStorage')}
        used={formatBytes(storageUsed)}
        quota={storageUnlimited ? null : formatBytes(storageQuota)}
        percent={storagePercent}
        unlimitedLabel={unlimited}
        testId='series-resource-storage'
      />

      {usage?.aiTokens && (
        <ResourceItem
          icon={<Cpu className='size-4' />}
          tone='ai'
          label={t('workspace.studioHub.series.resourceAiTokens')}
          used={formatTokens(usage.aiTokens.used)}
          quota={meterQuota(usage.aiTokens)}
          percent={meterPercent(usage.aiTokens)}
          unlimitedLabel={unlimited}
          testId='series-resource-ai-tokens'
        />
      )}

      {usage?.aiEnabled === false && (
        <div className='flex items-center gap-2 px-3.5 py-2 text-xs text-stone-600'>
          <span
            className='grid size-7 shrink-0 place-items-center rounded-lg border border-stone-200/80 bg-stone-100 text-stone-500'
            aria-hidden='true'
          >
            <Ban className='size-4' />
          </span>
          <span className='font-medium'>{t('workspace.studioHub.series.resourceAiDisabled')}</span>
        </div>
      )}
    </section>
  );
};
