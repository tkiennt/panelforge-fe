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

export type SupportedLanguage = 'vi' | 'en';

export const DICTIONARIES = {
  vi: {
    common: viCommon,
    navigation: viNavigation,
    bible: viBible,
    production: viProduction,
    review: viReview,
    pipeline: viPipeline,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    bible: enBible,
    production: enProduction,
    review: enReview,
    pipeline: enPipeline,
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
 */
export function translate(
  key: string,
  params?: Record<string, string | number> | string,
  targetLang?: SupportedLanguage,
): string {
  const lang = targetLang || getInitialLanguage();
  const defaultFallback = typeof params === 'string' ? params : key;
  const parts = key.split('.');
  if (parts.length < 2) return defaultFallback;

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
    return typeof curr === 'string' ? curr : undefined;
  };

  // Tra cứu theo ngôn ngữ yêu cầu
  let result = getNested((DICTIONARIES[lang] as any)?.[namespace], path);

  // Fallback sang tiếng Việt nếu tiếng Anh chưa có key này
  if (!result && lang !== 'vi') {
    result = getNested((DICTIONARIES.vi as any)?.[namespace], path);
  }

  if (!result) return defaultFallback;

  // Thay thế tham số {param}
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([pKey, pVal]) => {
      result = (result as string).replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    });
  }

  return result;
}

interface I18nContextValue {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number> | string) => string;
  isVietnamese: boolean;
  isEnglish: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLang = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        window.dispatchEvent(new CustomEvent('panelforge:lang_changed', { detail: { lang: newLang } }));
      } catch {
        // Ignore
      }
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number> | string) => translate(key, params, lang),
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

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback nếu component được render bên ngoài I18nProvider (ví dụ trong unit tests cô lập)
    const currentLang = getInitialLanguage();
    return {
      lang: currentLang,
      setLang: () => {},
      t: (key: string, params?: Record<string, string | number>) =>
        translate(key, params, currentLang),
      isVietnamese: currentLang === 'vi',
      isEnglish: currentLang === 'en',
    };
  }
  return ctx;
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
