import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface LanguageSelectorProps {
  languages: string[];
  activeLang: string;
  onChange: (lang: string) => void;
  originalLang?: string;
  counts?: Record<string, number>;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  activeLang,
  onChange,
  originalLang,
  counts,
  disabled = false,
  className = '',
  size = 'sm',
}) => {
  const { t } = useTranslation();

  const getLanguageLabel = (code: string) => {
    const upper = code.toUpperCase();
    const isOriginal = originalLang && code.toLowerCase() === originalLang.toLowerCase();
    if (isOriginal) {
      return `${upper} (${t('production.lettering.originalBadge', 'Gốc')})`;
    }
    return upper;
  };

  const isSmall = size === 'sm';

  return (
    <div
      data-testid='lettering-language-selector'
      className={`inline-flex items-center gap-1 bg-[#F3F0E9] p-1 rounded-xl border border-[#D8D2C5] ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      } ${className}`}
    >
      <div className='flex items-center gap-1 px-1.5 text-stone-600'>
        <Globe className='w-3.5 h-3.5 text-orange-600 shrink-0' />
        <span className='text-xs font-medium font-mono text-stone-500 hidden sm:inline'>
          {t('production.lettering.languageLabel', 'Ngôn ngữ')}:
        </span>
      </div>

      <div className='flex items-center gap-0.5'>
        {languages.map((lang) => {
          const isActive = activeLang.toLowerCase() === lang.toLowerCase();
          const count = counts?.[lang];
          const hasMissing = count !== undefined && count > 0;
          const fullName = LANGUAGE_DISPLAY_NAMES[lang.toLowerCase()] || lang.toUpperCase();

          return (
            <button
              key={lang}
              type='button'
              disabled={disabled}
              onClick={() => onChange(lang)}
              title={`${fullName} (${lang.toUpperCase()})`}
              className={`relative flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : 'text-stone-700 hover:bg-[#E7E2D7] hover:text-stone-900'
              } ${isSmall ? 'text-xs' : 'text-sm'}`}
            >
              <span>{getLanguageLabel(lang)}</span>
              {hasMissing && (
                <span
                  title={t(
                    'production.lettering.missingCountTooltip',
                    { count },
                    '{count} bóng thoại chưa dịch',
                  )}
                  className={`inline-flex items-center justify-center px-1 py-0.2 rounded-full text-xs font-bold leading-none ${
                    isActive ? 'bg-amber-400 text-stone-950' : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
