import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LanguageSelector } from './LanguageSelector';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, paramsOrDefault?: any, maybeDefault?: string) => {
      if (typeof paramsOrDefault === 'string') return paramsOrDefault;
      if (typeof maybeDefault === 'string') return maybeDefault;
      return _key;
    },
  }),
}));

describe('LanguageSelector', () => {
  it('renders languages and marks active language', () => {
    const handleChange = vi.fn();
    render(
      <LanguageSelector
        languages={['vi', 'en']}
        activeLang='en'
        onChange={handleChange}
        originalLang='vi'
      />,
    );

    expect(screen.getByTestId('lettering-language-selector')).toBeInTheDocument();
    expect(screen.getByText('VI (Gốc)')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.queryByText('JA')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('VI (Gốc)'));
    expect(handleChange).toHaveBeenCalledWith('vi');
  });

  it('displays counts for untranslated balloons', () => {
    render(
      <LanguageSelector
        languages={['vi', 'en']}
        activeLang='vi'
        onChange={() => {}}
        originalLang='vi'
        counts={{ en: 5 }}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
