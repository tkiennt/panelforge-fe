import type { TimeseriesGranularity } from '@/services/workspace.service';

/** Bộ lọc kỳ của biểu đồ xu hướng BR-32: 7/30/90 ngày (theo ngày) và 12 tháng (theo tháng). */
export type TimeseriesPreset = '7d' | '30d' | '90d' | '12m';

export const TIMESERIES_PRESETS: TimeseriesPreset[] = ['7d', '30d', '90d', '12m'];

export interface TimeseriesRange {
  /** ISO UTC, bao gồm. */
  from: string;
  /** ISO UTC, không bao gồm. */
  to: string;
  granularity: TimeseriesGranularity;
}

const DAYS: Record<Exclude<TimeseriesPreset, '12m'>, number> = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Khoảng [from, to) theo UTC (khớp cách BE gom kỳ). Preset ngày kết thúc ở đầu ngày mai để gồm cả hôm nay;
 * 12 tháng kết thúc ở đầu tháng sau để gồm tháng hiện tại.
 */
export function rangeForPreset(preset: TimeseriesPreset, now: Date = new Date()): TimeseriesRange {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (preset === '12m') {
    return {
      from: new Date(Date.UTC(y, m - 11, 1)).toISOString(),
      to: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
      granularity: 'Month',
    };
  }
  const end = Date.UTC(y, m, now.getUTCDate() + 1);
  return {
    from: new Date(end - DAYS[preset] * 86_400_000).toISOString(),
    to: new Date(end).toISOString(),
    granularity: 'Day',
  };
}
