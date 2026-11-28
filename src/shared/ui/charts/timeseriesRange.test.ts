import { describe, expect, it } from 'vitest';
import { rangeForPreset } from './timeseriesRange';

describe('rangeForPreset', () => {
  const now = new Date('2026-11-28T15:30:00Z');

  it('7d covers the last 7 UTC days including today', () => {
    expect(rangeForPreset('7d', now)).toEqual({
      from: '2026-11-22T00:00:00.000Z',
      to: '2026-11-29T00:00:00.000Z',
      granularity: 'Day',
    });
  });

  it('30d and 90d span exactly that many days', () => {
    const d30 = rangeForPreset('30d', now);
    const d90 = rangeForPreset('90d', now);
    const days = (r: { from: string; to: string }) =>
      (Date.parse(r.to) - Date.parse(r.from)) / 86_400_000;
    expect(days(d30)).toBe(30);
    expect(days(d90)).toBe(90);
    expect(d90.from).toBe('2026-08-31T00:00:00.000Z');
  });

  it('12m covers 12 whole months including the current one, by month', () => {
    expect(rangeForPreset('12m', now)).toEqual({
      from: '2025-12-01T00:00:00.000Z',
      to: '2026-12-01T00:00:00.000Z',
      granularity: 'Month',
    });
  });

  it('12m crosses the year boundary in January', () => {
    expect(rangeForPreset('12m', new Date('2027-01-03T00:00:00Z'))).toMatchObject({
      from: '2026-02-01T00:00:00.000Z',
      to: '2027-02-01T00:00:00.000Z',
    });
  });

  it('uses the UTC date even when local time is already the next day', () => {
    // 23:30 UTC ngày 28 = 06:30 ngày 29 ở UTC+7: vẫn tính theo ngày UTC 28.
    expect(rangeForPreset('7d', new Date('2026-11-28T23:30:00Z')).to).toBe(
      '2026-11-29T00:00:00.000Z',
    );
  });
});
