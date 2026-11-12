/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// Dictionaries
import viCommon from '@/locales/vi/common.json';
import enCommon from '@/locales/en/common.json';
import viNavigation from '@/locales/vi/navigation.json';
import enNavigation from '@/locales/en/navigation.json';
import viBible from '@/locales/vi/bible.json';
import enBible from '@/locales/en/bible.json';
import viProduction from '@/locales/vi/production.json';
import enProduction from '@/locales/en/production.json';
import viReview from '@/locales/vi/review.json';
import enReview from '@/locales/en/review.json';
import viPipeline from '@/locales/vi/pipeline.json';
import enPipeline from '@/locales/en/pipeline.json';
import viWorkspace from '@/locales/vi/workspace.json';
import enWorkspace from '@/locales/en/workspace.json';
import viCollaboration from '@/locales/vi/collaboration.json';
import enCollaboration from '@/locales/en/collaboration.json';
import viNotifications from '@/locales/vi/notifications.json';
import enNotifications from '@/locales/en/notifications.json';
import viProfile from '@/locales/vi/profile.json';
import enProfile from '@/locales/en/profile.json';
import viPublisher from '@/locales/vi/publisher.json';
import enPublisher from '@/locales/en/publisher.json';
import viAdmin from '@/locales/vi/admin.json';
import enAdmin from '@/locales/en/admin.json';
import viLanding from '@/locales/vi/landing.json';
import enLanding from '@/locales/en/landing.json';
import viMembers from '@/locales/vi/members.json';
import enMembers from '@/locales/en/members.json';
import viErrors from '@/locales/vi/errors.json';
import enErrors from '@/locales/en/errors.json';
import viPayments from '@/locales/vi/payments.json';
import enPayments from '@/locales/en/payments.json';

export type SupportedLanguage = 'vi' | 'en';

export const DICTIONARIES = {
  vi: {
    common: viCommon,
    navigation: viNavigation,
    bible: viBible,
    production: viProduction,
    review: viReview,
    pipeline: viPipeline,
    workspace: viWorkspace,
    collaboration: viCollaboration,
    notifications: viNotifications,
    profile: viProfile,
    publisher: viPublisher,
    admin: viAdmin,
    landing: viLanding,
    members: viMembers,
    errors: viErrors,
    payments: viPayments,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    bible: enBible,
    production: enProduction,
    review: enReview,
    pipeline: enPipeline,
    workspace: enWorkspace,
    collaboration: enCollaboration,
    notifications: enNotifications,
    profile: enProfile,
    publisher: enPublisher,
    admin: enAdmin,
    landing: enLanding,
    members: enMembers,
    errors: enErrors,
    payments: enPayments,
  },
} as const;

export type TranslationNamespace = keyof typeof DICTIONARIES.vi;

const STORAGE_KEY = 'panelforge_lang';

export function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'vi';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    // Ignore localStorage access error
  }
  return 'vi';
}

/**
 * Hàm biên dịch chuỗi theo key và ngôn ngữ chỉ định.
 * Key có cú pháp: "namespace.path.to.key", ví dụ: "common.actions.save" hay "production.canvas.title"
 * Hỗ trợ tham số nội suy {param}, quy ước số nhiều nhẹ qua params.count (_one, _other),
 * và safe fallback qua thứ tự: Current Lang -> EN -> VI -> explicitFallback -> key.
 */
export function translate(
  key: string,
  paramsOrFallback?: Record<string, string | number> | string,
  targetLang?: SupportedLanguage,
  explicitFallback?: string,
): string {
  const isStringParam = typeof paramsOrFallback === 'string';
  const params =
    typeof paramsOrFallback === 'object' && paramsOrFallback !== null
      ? paramsOrFallback
      : undefined;
  const fallback = isStringParam ? paramsOrFallback : explicitFallback;

  const currentLang = targetLang || getInitialLanguage();
  const parts = key.split('.');
  if (parts.length < 2) return fallback || key;

  const namespace = parts[0] as TranslationNamespace;
  const path = parts.slice(1);

  const getNested = (obj: any, keys: string[]): any => {
    let curr = obj;
    for (const k of keys) {
      if (curr && typeof curr === 'object' && k in curr) {
        curr = curr[k];
      } else {
        return undefined;
      }
    }
    return typeof curr === 'string' && curr.trim() !== '' ? curr : undefined;
  };

  // Thứ tự tra cứu ngôn ngữ an toàn: Current Lang -> EN -> VI
  const lookupOrder: SupportedLanguage[] = [currentLang];
  if (currentLang !== 'en') lookupOrder.push('en');
  if (currentLang !== 'vi') lookupOrder.push('vi');

  // Xác định danh sách path ứng viên (ưu tiên số nhiều nếu params có count là số)
  const candidatePaths: string[][] = [];
  if (params && typeof params.count === 'number') {
    const pluralSuffix = params.count === 1 ? '_one' : '_other';
    const lastPart = path[path.length - 1];
    candidatePaths.push([...path.slice(0, -1), `${lastPart}${pluralSuffix}`]);
  }
  candidatePaths.push(path);

  let result: string | undefined;

  // Tra cứu theo thứ tự ngôn ngữ và path ứng viên
  for (const lang of lookupOrder) {
    const nsDict = (DICTIONARIES[lang] as any)?.[namespace];
    if (!nsDict) continue;

    for (const candPath of candidatePaths) {
      const found = getNested(nsDict, candPath);
      if (typeof found === 'string') {
        result = found;
        break;
      }
    }
    if (result) break;
  }

  // Safe fallback nếu không tìm thấy ở bất kỳ ngôn ngữ nào
  if (!result || typeof result !== 'string' || result.trim() === '') {
    let finalFallback = fallback || key;
    if (params && finalFallback !== key) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        finalFallback = finalFallback.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal ?? ''));
      });
    }
    return finalFallback;
  }

  // Thay thế tham số {param}
  if (params) {
    Object.entries(params).forEach(([pKey, pVal]) => {
      result = (result as string).replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal ?? ''));
    });
  }

  return result;
}

interface I18nContextValue {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (
    key: string,
    paramsOrFallback?: Record<string, string | number> | string,
    fallback?: string,
  ) => string;
  isVietnamese: boolean;
  isEnglish: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(getInitialLanguage);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = newLang;
        }
        window.dispatchEvent(
          new CustomEvent('panelforge:lang_changed', { detail: { lang: newLang } }),
        );
      } catch {
        // Ignore
      }
    }
  }, []);

  const t = useCallback(
    (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) =>
      translate(key, paramsOrFallback, lang, fallback),
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t,
      isVietnamese: lang === 'vi',
      isEnglish: lang === 'en',
    }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation(defaultNamespace?: TranslationNamespace) {
  const ctx = useContext(I18nContext);
  const currentLang = ctx ? ctx.lang : getInitialLanguage();

  const t = useCallback(
    (
      key: string,
      paramsOrFallback?: Record<string, string | number> | string,
      fallback?: string,
    ) => {
      let fullKey = key;
      const parts = key.split('.');
      const firstPart = parts[0] as TranslationNamespace;
      const isKnownNamespace = firstPart in DICTIONARIES.vi;

      if (!isKnownNamespace && defaultNamespace) {
        fullKey = `${defaultNamespace}.${key}`;
      }

      if (ctx) {
        return ctx.t(fullKey, paramsOrFallback, fallback);
      }
      return translate(fullKey, paramsOrFallback, currentLang, fallback);
    },
    [ctx, currentLang, defaultNamespace],
  );

  return {
    lang: currentLang,
    setLang: ctx ? ctx.setLang : () => {},
    t,
    isVietnamese: currentLang === 'vi',
    isEnglish: currentLang === 'en',
  };
}

/**
 * Component Language Switcher dạng Pill thanh lịch, chuẩn phong cách Editorial AI Studio
 */
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang } = useTranslation();

  return (
    <div
      className={`inline-flex items-center p-0.5 bg-stone-100 rounded-full border border-stone-200 shadow-2xs ${className}`}
      data-testid='language-switcher'
    >
      <button
        type='button'
        onClick={() => setLang('vi')}
        data-testid='lang-btn-vi'
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          lang === 'vi'
            ? 'bg-stone-900 text-white shadow-soft-sm font-bold'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        title='Tiếng Việt'
      >
        VI
      </button>
      <button
        type='button'
        onClick={() => setLang('en')}
        data-testid='lang-btn-en'
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-stone-900 text-white shadow-soft-sm font-bold'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        title='English'
      >
        EN
      </button>
    </div>
  );
};
