/**
 * PanelForge Producer Chapter Overview - Relative Time Utility
 * Uses Intl.RelativeTimeFormat(lang, { numeric: 'auto' }) for minutes, hours, and days.
 * For diff < 1 minute (within 60 seconds), returns 'vừa xong' (vi) or 'just now' (en/others).
 */

export const REVIEW_ACTION_LABEL_KEYS: Record<string, string> = {
  ProducerApproved: 'producer.chapterManagement.reviewAction.ProducerApproved',
  ChapterApproved: 'producer.chapterManagement.reviewAction.ChapterApproved',
  ProducerHandedOff: 'producer.chapterManagement.reviewAction.ProducerHandedOff',
  ChapterHandedOff: 'producer.chapterManagement.reviewAction.ChapterHandedOff',
  ChapterPublished: 'producer.chapterManagement.reviewAction.ChapterPublished',
  ScriptFrozen: 'producer.chapterManagement.reviewAction.ScriptFrozen',
  ScriptUnfrozen: 'producer.chapterManagement.reviewAction.ScriptUnfrozen',
  ProductionStarted: 'producer.chapterManagement.reviewAction.ProductionStarted',
  ChangesRequested: 'producer.chapterManagement.reviewAction.ChangesRequested',
  ChapterReopened: 'producer.chapterManagement.reviewAction.ChapterReopened',
};

const rtfCache = new Map<string, Intl.RelativeTimeFormat>();
const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getRtf(lang: string): Intl.RelativeTimeFormat {
  let rtf = rtfCache.get(lang);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    rtfCache.set(lang, rtf);
  }
  return rtf;
}

function getDtf(lang: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${lang}:${JSON.stringify(options ?? {})}`;
  let dtf = dtfCache.get(key);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat(lang, options ?? { dateStyle: 'medium', timeStyle: 'short' });
    dtfCache.set(key, dtf);
  }
  return dtf;
}

export function formatRelativeTime(
  date: Date | string | number | null | undefined,
  now: Date | string | number = new Date(),
  lang: string = 'vi',
): string {
  if (date == null) return '';
  const targetDate = date instanceof Date ? date : new Date(date);
  if (isNaN(targetDate.getTime())) return '';

  const nowDate = now instanceof Date ? now : new Date(now);
  if (isNaN(nowDate.getTime())) return '';

  const diffMs = targetDate.getTime() - nowDate.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  // Events within 1 minute
  if (Math.abs(diffSec) < 60) {
    return lang.startsWith('vi') ? 'vừa xong' : 'just now';
  }

  const rtf = getRtf(lang);

  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }

  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  }

  return rtf.format(diffDay, 'day');
}

export function formatFullDateTime(
  date: Date | string | number | null | undefined,
  lang: string = 'vi',
  options?: Intl.DateTimeFormatOptions,
): string {
  if (date == null) return '';
  const targetDate = date instanceof Date ? date : new Date(date);
  if (isNaN(targetDate.getTime())) return '';

  return getDtf(lang, options).format(targetDate);
}
