import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { TimeseriesGranularity } from '@/services/workspace.service';

export interface StatLinePoint {
  /** Đầu kỳ, ISO UTC. */
  periodStart: string;
  value: number;
}

export interface StatLineChartProps {
  data: StatLinePoint[];
  granularity: TimeseriesGranularity;
  /** Ngôn ngữ i18n hiện hành (vd 'vi', 'en') để định dạng ngày bằng Intl. */
  locale: string;
  /** Tên số đo, hiện trong tooltip. */
  valueLabel: string;
  formatValue: (n: number) => string;
  ariaLabel: string;
  height?: number;
}

const AXIS_TICK = { fill: 'var(--studio-ink-subtle)', fontSize: 12 };
const LINE_STROKE = 'var(--studio-accent-hover)';

/**
 * Biểu đồ đường một chuỗi theo thời gian cho dashboard BR-32. Kỳ trống đã được BE trả về 0 nên đường liên tục;
 * ngày hiển thị theo UTC để khớp cách BE gom kỳ.
 */
export const StatLineChart: React.FC<StatLineChartProps> = ({
  data,
  granularity,
  locale,
  valueLabel,
  formatValue,
  ariaLabel,
  height = 240,
}) => {
  const { tick, full } = useMemo(() => {
    const monthly = granularity === 'Month';
    return {
      tick: new Intl.DateTimeFormat(
        locale,
        monthly
          ? { timeZone: 'UTC', month: 'short', year: '2-digit' }
          : { timeZone: 'UTC', day: 'numeric', month: 'numeric' },
      ),
      full: new Intl.DateTimeFormat(
        locale,
        monthly
          ? { timeZone: 'UTC', month: 'long', year: 'numeric' }
          : { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' },
      ),
    };
  }, [granularity, locale]);

  const renderTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as StatLinePoint;
    return (
      <div className='rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm'>
        <div className='font-semibold text-stone-900'>
          {full.format(new Date(point.periodStart))}
        </div>
        <div className='mt-0.5 text-stone-600'>
          {valueLabel}:{' '}
          <span className='font-mono tabular-nums text-stone-900'>{formatValue(point.value)}</span>
        </div>
      </div>
    );
  };

  return (
    <div role='img' aria-label={ariaLabel} style={{ height }} className='w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke='var(--studio-line-soft)' vertical={false} />
          <XAxis
            dataKey='periodStart'
            tick={AXIS_TICK}
            tickFormatter={(v: string) => tick.format(new Date(v))}
            axisLine={{ stroke: 'var(--studio-line)' }}
            tickLine={false}
            interval='preserveStartEnd'
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_TICK}
            tickFormatter={formatValue}
            axisLine={false}
            tickLine={false}
            width={56}
            allowDecimals={false}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ stroke: 'var(--studio-line)', strokeDasharray: '3 3' }}
            isAnimationActive={false}
          />
          <Line
            type='monotone'
            dataKey='value'
            name={valueLabel}
            stroke={LINE_STROKE}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: LINE_STROKE }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
