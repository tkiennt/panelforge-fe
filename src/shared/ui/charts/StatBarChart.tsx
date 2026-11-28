import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

export interface StatBarDatum {
  /** Khóa ổn định (id thực thể) để màu/thứ tự không đổi khi lọc. */
  key: string;
  label: string;
  value: number;
}

export interface StatBarChartProps {
  data: StatBarDatum[];
  /** Tên số đo, hiện trong tooltip (vd "Lượt xem"). */
  valueLabel: string;
  formatValue: (n: number) => string;
  /**
   * `ranked`: thanh ngang, xếp theo giá trị (nhãn dài như tên bộ truyện).
   * `sequence`: cột dọc giữ nguyên thứ tự truyền vào (chương 1, 2, 3…).
   */
  variant?: 'ranked' | 'sequence';
  /** Chiều cao cố định cho `sequence`; `ranked` tự tính theo số thanh. */
  height?: number;
  ariaLabel: string;
}

const AXIS_TICK = { fill: 'var(--studio-ink-subtle)', fontSize: 12 };
const BAR_FILL = 'var(--studio-accent-hover)';
const RANKED_ROW_PX = 32;

/** Rút gọn nhãn trục để không đè nhau; nhãn đầy đủ vẫn có trong tooltip và bảng bên dưới. */
const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * Biểu đồ cột một chuỗi số liệu cho dashboard (BR-32). Một màu duy nhất (cam Studio, đạt 3:1 trên nền giấy),
 * không legend vì tiêu đề thẻ đã gọi tên số đo; tooltip theo từng cột. Luôn đặt kèm bảng số liệu để có bản đọc
 * không phụ thuộc màu/hình.
 */
export const StatBarChart: React.FC<StatBarChartProps> = ({
  data,
  valueLabel,
  formatValue,
  variant = 'sequence',
  height = 240,
  ariaLabel,
}) => {
  const ranked = variant === 'ranked';
  const chartHeight = ranked ? Math.max(120, data.length * RANKED_ROW_PX + 32) : height;

  const renderTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const datum = payload[0].payload as StatBarDatum;
    return (
      <div className='rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm'>
        <div className='font-semibold text-stone-900'>{datum.label}</div>
        <div className='mt-0.5 text-stone-600'>
          {valueLabel}:{' '}
          <span className='font-mono tabular-nums text-stone-900'>{formatValue(datum.value)}</span>
        </div>
      </div>
    );
  };

  return (
    <div role='img' aria-label={ariaLabel} style={{ height: chartHeight }} className='w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={data}
          layout={ranked ? 'vertical' : 'horizontal'}
          margin={{ top: 4, right: 16, bottom: 4, left: ranked ? 8 : 0 }}
          barCategoryGap={ranked ? 6 : '20%'}
        >
          <CartesianGrid stroke='var(--studio-line-soft)' vertical={ranked} horizontal={!ranked} />
          {ranked ? (
            <>
              <XAxis
                type='number'
                tick={AXIS_TICK}
                tickFormatter={formatValue}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type='category'
                dataKey='label'
                width={140}
                tick={AXIS_TICK}
                tickFormatter={(v: string) => truncate(v, 20)}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey='label'
                tick={AXIS_TICK}
                tickFormatter={(v: string) => truncate(v, 10)}
                axisLine={{ stroke: 'var(--studio-line)' }}
                tickLine={false}
                interval='preserveStartEnd'
              />
              <YAxis
                tick={AXIS_TICK}
                tickFormatter={formatValue}
                axisLine={false}
                tickLine={false}
                width={56}
                allowDecimals={false}
              />
            </>
          )}
          <Tooltip
            content={renderTooltip}
            cursor={{ fill: 'var(--studio-accent-soft)' }}
            isAnimationActive={false}
          />
          <Bar
            dataKey='value'
            name={valueLabel}
            fill={BAR_FILL}
            maxBarSize={ranked ? 20 : 32}
            radius={ranked ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
