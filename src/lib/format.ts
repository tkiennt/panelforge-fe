/**
 * PanelForge Studio Formatting Utilities · Google Modern Web Guidance Compliant
 * Centralized, high-performance locale formatting for dates, numbers, relative times, and currency.
 *
 * Implements LRU/Map caching for Intl instances to avoid high instantiation costs.
 */

import { getInitialLanguage, type SupportedLanguage } from './i18n';

/** Map supported app languages to standard BCP 47 locale tags */
export const LOCALE_MAP: Record<SupportedLanguage, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};

export function resolveLocale(customLocale?: string): string {
  if (customLocale) return customLocale;
  const currentLang = getInitialLanguage();
  return LOCALE_MAP[currentLang] || 'vi-VN';
}

// Caches for Intl formatters keyed by locale + serialized options
const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

function getDateTimeFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = dateTimeFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatCache.set(key, formatter);
  }
  return formatter;
}

function getNumberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

function getRelativeTimeFormatter(
  locale: string,
  options: Intl.RelativeTimeFormatOptions = { numeric: 'auto' },
): Intl.RelativeTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = relativeTimeFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, options);
    relativeTimeFormatCache.set(key, formatter);
  }
  return formatter;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date according to current or specified locale.
 * Defaults to: dateStyle 'medium' (e.g. "17 thg 11, 2026" or "Nov 17, 2026")
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  customLocale?: string,
): string {
  const d = toDate(value);
  if (!d) return '';
  const locale = resolveLocale(customLocale);
  return getDateTimeFormatter(locale, options).format(d);
}

/**
 * Formats a date with time according to current or specified locale.
 * Defaults to: dateStyle 'short', timeStyle: 'short'
 */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' },
  customLocale?: string,
): string {
  const d = toDate(value);
  if (!d) return '';
  const locale = resolveLocale(customLocale);
  return getDateTimeFormatter(locale, options).format(d);
}

/**
 * Formats a relative time description (e.g. "5 phút trước" / "5 minutes ago", "hôm qua" / "yesterday")
 */
export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  baseDate: Date = new Date(),
  customLocale?: string,
): string {
  const d = toDate(value);
  if (!d) return '';

  const diffMs = d.getTime() - baseDate.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const locale = resolveLocale(customLocale);
  const rtf = getRelativeTimeFormatter(locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  }
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  }
  if (Math.abs(diffDay) < 30) {
    return rtf.format(diffDay, 'day');
  }
  if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, 'month');
  }
  return rtf.format(diffYear, 'year');
}

/**
 * Formats a number with locale grouping and decimal separators.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  customLocale?: string,
): string {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  const locale = resolveLocale(customLocale);
  return getNumberFormatter(locale, options).format(value);
}

/**
 * Formats a currency amount according to locale and currency code.
 * VNĐ defaults to 0 decimal places; other currencies default to 2 decimal places.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'VND',
  customLocale?: string,
): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0';
  const locale = resolveLocale(customLocale);
  const defaultFractionDigits = currency.toUpperCase() === 'VND' ? 0 : 2;
  return getNumberFormatter(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: defaultFractionDigits,
  }).format(amount);
}
