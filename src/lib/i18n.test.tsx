import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { I18nProvider, useTranslation, translate, LanguageSwitcher } from './i18n';

describe('i18n core engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('dịch chuỗi tiếng Việt mặc định chính xác', () => {
    expect(translate('common.actions.save', undefined, 'vi')).toBe('Lưu');
    expect(translate('common.actions.cancel', undefined, 'vi')).toBe('Hủy');
    expect(translate('bible.canonLock.badge', undefined, 'vi')).toBe('Đã khoá chuẩn (Canon Locked)');
    expect(translate('production.canvas.title', undefined, 'vi')).toBe('Bố Cục Khung Tranh (Panels)');
  });

  it('dịch chuỗi tiếng Anh chính xác', () => {
    expect(translate('common.actions.save', undefined, 'en')).toBe('Save');
    expect(translate('common.actions.cancel', undefined, 'en')).toBe('Cancel');
    expect(translate('bible.canonLock.badge', undefined, 'en')).toBe('Canon Locked');
    expect(translate('production.canvas.title', undefined, 'en')).toBe('Panel Layout');
  });

  it('thay thế tham số nội suy (interpolation) chính xác', () => {
    expect(translate('production.canvas.dropzonePrompt', { number: 3 }, 'vi')).toBe('Thả ảnh vào Khung #3');
    expect(translate('production.canvas.dropzonePrompt', { number: 3 }, 'en')).toBe('Drop image into Panel #3');
    expect(
      translate('production.canvas.pageInfo', { width: 1200, height: 1800, dpi: 600 }, 'vi'),
    ).toBe('Khổ: 1200 x 1800 px (600 DPI)');
  });

  it('fallback về chính key nếu key không tồn tại', () => {
    expect(translate('nonexistent.path.key', undefined, 'vi')).toBe('nonexistent.path.key');
  });

  it('chuyển đổi ngôn ngữ qua useTranslation và lưu vào localStorage', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    });

    expect(result.current.lang).toBe('vi');
    expect(result.current.t('common.actions.save')).toBe('Lưu');

    act(() => {
      result.current.setLang('en');
    });

    expect(result.current.lang).toBe('en');
    expect(result.current.t('common.actions.save')).toBe('Save');
    expect(localStorage.getItem('panelforge_lang')).toBe('en');
  });

  it('LanguageSwitcher hiển thị nút bấm và chuyển đổi ngôn ngữ khi click', () => {
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    );

    const viBtn = screen.getByTestId('lang-btn-vi');
    const enBtn = screen.getByTestId('lang-btn-en');

    expect(viBtn).toBeInTheDocument();
    expect(enBtn).toBeInTheDocument();

    // Mặc định VI đang active (bg-stone-900)
    expect(viBtn.className).toContain('bg-stone-900');

    // Click EN
    fireEvent.click(enBtn);
    expect(enBtn.className).toContain('bg-stone-900');
    expect(localStorage.getItem('panelforge_lang')).toBe('en');
  });
});
