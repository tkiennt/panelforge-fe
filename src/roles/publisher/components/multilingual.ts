import type { ChapterLanguageStatusDto, ContentLanguage } from '@/services/payment.service';
import type { EditionStatus } from '@/services/chapter-edition.service';

export interface ContentLanguageMeta {
  code: string;
  labelVi: string;
  labelEn: string;
  nativeName: string;
  defaultCurrency: string;
}

const KNOWN_LANGUAGES: Record<string, ContentLanguageMeta> = {
  vi: {
    code: 'vi',
    labelVi: 'Tiếng Việt',
    labelEn: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    defaultCurrency: 'VND',
  },
  en: {
    code: 'en',
    labelVi: 'Tiếng Anh',
    labelEn: 'English',
    nativeName: 'English',
    defaultCurrency: 'VND',
  },
  ja: {
    code: 'ja',
    labelVi: 'Tiếng Nhật',
    labelEn: 'Japanese',
    nativeName: '日本語',
    defaultCurrency: 'VND',
  },
  ko: {
    code: 'ko',
    labelVi: 'Tiếng Hàn',
    labelEn: 'Korean',
    nativeName: '한국어',
    defaultCurrency: 'VND',
  },
};

export const getContentLanguageMeta = (code?: string | null): ContentLanguageMeta => {
  const normalized = (code || 'vi').toLowerCase();
  return (
    KNOWN_LANGUAGES[normalized] ?? {
      code: normalized,
      labelVi: normalized.toUpperCase(),
      labelEn: normalized.toUpperCase(),
      nativeName: normalized.toUpperCase(),
      defaultCurrency: 'VND',
    }
  );
};

/**
 * Always displays clear language name + code (never flags alone), independent of UI language.
 */
export const formatContentLanguageName = (code?: string | null, uiLang: string = 'vi'): string => {
  const meta = getContentLanguageMeta(code);
  const name = uiLang === 'en' ? meta.labelEn : meta.labelVi;
  return `${name} (${meta.code.toUpperCase()})`;
};

export interface EditionStatusDisplay {
  key: 'published' | 'approved' | 'in_review' | 'draft' | 'missing';
  label: string;
  badgeClass: string;
  dotClass: string;
}

/**
 * Maps real backend EditionStatus / ChapterLanguageStatusDto to standardized display labels
 * (no raw enum leakage like 'EditorApproved' or 'InReview').
 */
export const getEditionStatusDisplay = (
  ed?: Pick<ChapterLanguageStatusDto, 'editionStatus' | 'isAvailable'> | { status?: EditionStatus | string | null } | null,
  uiLang: string = 'vi',
): EditionStatusDisplay => {
  const isEn = uiLang === 'en';
  if (!ed) {
    return {
      key: 'missing',
      label: isEn ? 'Not prepared' : 'Chưa chuẩn bị',
      badgeClass: 'bg-stone-100 text-stone-500 border-stone-200',
      dotClass: 'bg-stone-400',
    };
  }

  const rawStatus = 'editionStatus' in ed ? ed.editionStatus : 'status' in ed ? ed.status : undefined;
  const isAvailable = 'isAvailable' in ed ? Boolean(ed.isAvailable) : rawStatus === 'Published';

  if (isAvailable || rawStatus === 'Published') {
    return {
      key: 'published',
      label: isEn ? 'Published' : 'Đã xuất bản',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }
  if (rawStatus === 'Approved') {
    return {
      key: 'approved',
      label: isEn ? 'Ready to publish' : 'Đã duyệt xuất bản',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      dotClass: 'bg-sky-500',
    };
  }
  if (rawStatus === 'EditorApproved') {
    return {
      key: 'in_review',
      label: isEn ? 'Translation reviewed' : 'Đã kiểm tra bản dịch',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotClass: 'bg-indigo-500',
    };
  }
  if (rawStatus === 'InReview') {
    return {
      key: 'in_review',
      label: isEn ? 'In translation review' : 'Chờ kiểm tra bản dịch',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
    };
  }
  if (rawStatus === 'Draft') {
    return {
      key: 'draft',
      label: isEn ? 'Translating' : 'Đang dịch',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      dotClass: 'bg-orange-500',
    };
  }

  return {
    key: 'missing',
    label: isEn ? 'Not prepared' : 'Chưa chuẩn bị',
    badgeClass: 'bg-stone-100 text-stone-500 border-stone-200',
    dotClass: 'bg-stone-400',
  };
};

/**
 * Formats integer VND pricing from existing backend contract without rounding or currency conversion.
 */
export const formatEditionPricingLabel = (
  ed?: Pick<ChapterLanguageStatusDto, 'isMonetizationConfigured' | 'isPaid' | 'priceVnd'> | null,
  uiLang: string = 'vi',
): { label: string; tone: 'unconfigured' | 'free' | 'paid' } => {
  const isEn = uiLang === 'en';
  if (!ed || !ed.isMonetizationConfigured) {
    return {
      label: isEn ? 'Price not set' : 'Chưa đặt giá',
      tone: 'unconfigured',
    };
  }
  if (!ed.isPaid || ed.priceVnd <= 0) {
    return {
      label: isEn ? 'Free' : 'Miễn phí',
      tone: 'free',
    };
  }
  const formatted = ed.priceVnd.toLocaleString(isEn ? 'en-US' : 'vi-VN');
  return {
    label: `${formatted} VND`,
    tone: 'paid',
  };
};

export const orderReleaseLanguages = (
  languages: string[],
  originalLanguage?: string | null,
): ContentLanguage[] => {
  const orig = (originalLanguage || 'vi').toLowerCase();
  const unique = Array.from(new Set(languages.map((l) => l.toLowerCase())));
  const ordered = [orig, ...unique.filter((l) => l !== orig)];
  return ordered.filter((l): l is ContentLanguage => l === 'vi' || l === 'en');
};
