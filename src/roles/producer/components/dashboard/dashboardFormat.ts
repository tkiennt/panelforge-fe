import { getInitialLanguage, type SupportedLanguage } from '@/lib/i18n';

export const CHAPTER_STATUS_STYLE: Record<string, { labelKey: string; className: string }> = {
  PreProduction: {
    labelKey: 'dashboard.chapterStatus.PreProduction',
    className: 'bg-stone-50 text-stone-700 border-stone-200',
  },
  InProduction: {
    labelKey: 'dashboard.chapterStatus.InProduction',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  ChapterApproved: {
    labelKey: 'dashboard.chapterStatus.ChapterApproved',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  HandedOffAndPublished: {
    labelKey: 'dashboard.chapterStatus.HandedOffAndPublished',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export const NEUTRAL_BADGE = 'bg-stone-100 text-stone-700 border-stone-200';

export const formatViDate = (dateStr?: string | null, lang?: SupportedLanguage): string | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const locale = (lang ?? getInitialLanguage()) === 'en' ? 'en-US' : 'vi-VN';
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const clampPercent = (value: number | undefined | null): number =>
  Math.min(100, Math.max(0, value || 0));
