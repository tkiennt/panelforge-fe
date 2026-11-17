import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  resolveLocale,
} from './format';

describe('format utilities (Google Modern Web Guidance Compliant)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resolves locale based on app language setting', () => {
    localStorage.setItem('panelforge_lang', 'vi');
    expect(resolveLocale()).toBe('vi-VN');

    localStorage.setItem('panelforge_lang', 'en');
    expect(resolveLocale()).toBe('en-US');

    expect(resolveLocale('ja-JP')).toBe('ja-JP');
  });

  it('formats dates cleanly in Vietnamese and English', () => {
    const testDate = new Date('2026-11-17T12:00:00Z');

    const viDate = formatDate(testDate, { dateStyle: 'short' }, 'vi-VN');
    expect(viDate).toMatch(/17/);

    const enDate = formatDate(testDate, { dateStyle: 'short' }, 'en-US');
    expect(enDate).toMatch(/17/);
  });

  it('formats relative time correctly', () => {
    const now = new Date('2026-11-17T12:00:00Z');

    const past5Min = new Date('2026-11-17T11:55:00Z');
    const viRel = formatRelativeTime(past5Min, now, 'vi-VN');
    expect(viRel).toMatch(/5 phút trước/);

    const enRel = formatRelativeTime(past5Min, now, 'en-US');
    expect(enRel).toMatch(/5 minutes ago/);

    const yesterday = new Date('2026-11-16T12:00:00Z');
    const viYesterday = formatRelativeTime(yesterday, now, 'vi-VN');
    expect(viYesterday).toMatch(/hôm qua|1 ngày trước/i);
  });

  it('formats numbers with correct grouping separators', () => {
    expect(formatNumber(1250000, undefined, 'vi-VN')).toContain('1.250.000');
    expect(formatNumber(1250000, undefined, 'en-US')).toContain('1,250,000');
  });

  it('formats currency correctly for VND and other currencies', () => {
    const vndFormatted = formatCurrency(500000, 'VND', 'vi-VN');
    expect(vndFormatted).toMatch(/500\.000/);

    const usdFormatted = formatCurrency(25.5, 'USD', 'en-US');
    expect(usdFormatted).toMatch(/\$25\.50/);
  });
});
