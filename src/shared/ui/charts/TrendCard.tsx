import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Alert, Card, CardBody, CardHeader, Tabs } from '@/shared/ui';
import type { TimeseriesGranularity } from '@/services/workspace.service';
import { StatLineChart, type StatLinePoint } from './StatLineChart';
import { TIMESERIES_PRESETS, type TimeseriesPreset } from './timeseriesRange';

/** Một hàng chọn kỳ (7/30/90 ngày, 12 tháng) đặt phía trên các thẻ xu hướng. */
export const TimeseriesPresetTabs: React.FC<{
  value: TimeseriesPreset;
  onChange: (preset: TimeseriesPreset) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation('payments');
  return (
    <Tabs
      aria-label={t('charts.period')}
      value={value}
      onChange={(id) => onChange(id as TimeseriesPreset)}
      items={TIMESERIES_PRESETS.map((p) => ({ id: p, label: t(`charts.preset.${p}`) }))}
    />
  );
};

/** Thẻ biểu đồ đường cho một số đo theo thời gian; kỳ không có số liệu nào thì hiện dòng trống thay cho đường 0. */
export const TrendCard: React.FC<{
  title: string;
  points: StatLinePoint[];
  granularity: TimeseriesGranularity;
  valueLabel: string;
  formatValue: (n: number) => string;
  loading: boolean;
  error: string | null;
}> = ({ title, points, granularity, valueLabel, formatValue, loading, error }) => {
  const { t, lang } = useTranslation('payments');
  const hasData = points.some((p) => p.value > 0);
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {loading ? (
          <div className='h-60 rounded-lg bg-stone-100 animate-pulse' />
        ) : error ? (
          <Alert tone='danger'>{error}</Alert>
        ) : hasData ? (
          <StatLineChart
            data={points}
            granularity={granularity}
            locale={lang}
            valueLabel={valueLabel}
            formatValue={formatValue}
            ariaLabel={t('charts.lineAriaLabel', { title })}
          />
        ) : (
          <p className='py-10 text-center text-sm text-stone-500'>{t('charts.trendEmpty')}</p>
        )}
      </CardBody>
    </Card>
  );
};
