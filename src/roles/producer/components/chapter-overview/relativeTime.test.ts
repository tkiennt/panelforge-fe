import { describe, expect, it } from 'vitest';
import { formatFullDateTime, formatRelativeTime } from './relativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-11-28T12:00:00.000Z');

  it('formats less than 1 minute as "vừa xong" (vi) and "just now" (en)', () => {
    const twentySecondsAgo = new Date('2026-11-28T11:59:40.000Z');
    expect(formatRelativeTime(twentySecondsAgo, now, 'vi')).toBe('vừa xong');
    expect(formatRelativeTime(twentySecondsAgo, now, 'en')).toBe('just now');

    // Right now (0ms diff)
    expect(formatRelativeTime(now, now, 'vi')).toBe('vừa xong');
    expect(formatRelativeTime(now, now, 'en')).toBe('just now');
  });

  it('formats 5 minutes ago using Intl.RelativeTimeFormat (minute)', () => {
    const fiveMinutesAgo = new Date('2026-11-28T11:55:00.000Z');
    expect(formatRelativeTime(fiveMinutesAgo, now, 'vi')).toBe('5 phút trước');
    expect(formatRelativeTime(fiveMinutesAgo, now, 'en')).toBe('5 minutes ago');
  });

  it('formats 3 hours ago using Intl.RelativeTimeFormat (hour)', () => {
    const threeHoursAgo = new Date('2026-11-28T09:00:00.000Z');
    expect(formatRelativeTime(threeHoursAgo, now, 'vi')).toBe('3 giờ trước');
    expect(formatRelativeTime(threeHoursAgo, now, 'en')).toBe('3 hours ago');
  });

  it('formats 2 days ago using Intl.RelativeTimeFormat (day)', () => {
    const twoDaysAgo = new Date('2026-11-26T12:00:00.000Z');
    // In Vietnamese with numeric: 'auto', -2 days formats to 'Hôm kia'
    expect(formatRelativeTime(twoDaysAgo, now, 'vi')).toBe('Hôm kia');
    // In English with numeric: 'auto', -2 days formats to '2 days ago'
    expect(formatRelativeTime(twoDaysAgo, now, 'en')).toBe('2 days ago');
  });

  it('formats 3 days ago properly', () => {
    const threeDaysAgo = new Date('2026-11-25T12:00:00.000Z');
    expect(formatRelativeTime(threeDaysAgo, now, 'vi')).toBe('3 ngày trước');
    expect(formatRelativeTime(threeDaysAgo, now, 'en')).toBe('3 days ago');
  });

  it('handles string timestamps and null/undefined values gracefully', () => {
    const isoString = '2026-11-28T11:55:00.000Z';
    expect(formatRelativeTime(isoString, now, 'vi')).toBe('5 phút trước');
    expect(formatRelativeTime(null, now, 'vi')).toBe('');
    expect(formatRelativeTime(undefined, now, 'vi')).toBe('');
    expect(formatRelativeTime('invalid-date', now, 'vi')).toBe('');
  });
});

describe('formatFullDateTime', () => {
  it('formats full date and time for tooltips with Intl.DateTimeFormat', () => {
    const date = new Date('2026-11-28T12:30:00.000Z');
    const formattedVi = formatFullDateTime(date, 'vi');
    const formattedEn = formatFullDateTime(date, 'en');

    expect(formattedVi).toBeTruthy();
    expect(formattedEn).toBeTruthy();
    expect(formattedVi).toContain('2026');
    expect(formattedEn).toContain('2026');

    expect(formatFullDateTime(null, 'vi')).toBe('');
    expect(formatFullDateTime('invalid', 'vi')).toBe('');
  });
});
