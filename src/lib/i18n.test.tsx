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
    expect(translate('bible.canonLock.badge', undefined, 'vi')).toBe(
      'Đã khoá chuẩn (Canon Locked)',
    );
    expect(translate('production.canvas.title', undefined, 'vi')).toBe(
      'Bố Cục Khung Tranh (Panels)',
    );
  });

  it('dịch chuỗi tiếng Anh chính xác', () => {
    expect(translate('common.actions.save', undefined, 'en')).toBe('Save');
    expect(translate('common.actions.cancel', undefined, 'en')).toBe('Cancel');
    expect(translate('bible.canonLock.badge', undefined, 'en')).toBe('Canon Locked');
    expect(translate('production.canvas.title', undefined, 'en')).toBe('Panel Layout');
  });

  it('thay thế tham số nội suy (interpolation) chính xác', () => {
    expect(translate('production.canvas.dropzonePrompt', { number: 3 }, 'vi')).toBe(
      'Thả ảnh vào Khung #3',
    );
    expect(translate('production.canvas.dropzonePrompt', { number: 3 }, 'en')).toBe(
      'Drop image into Panel #3',
    );
    expect(
      translate('production.canvas.pageInfo', { width: 1200, height: 1800, dpi: 600 }, 'vi'),
    ).toBe('Khổ: 1200 x 1800 px (600 DPI)');
  });

  it('tra cứu namespace errors chính xác cho cả VI và EN', () => {
    expect(translate('errors.ERR_NOT_FOUND', undefined, 'vi')).toBe(
      'Không tìm thấy dữ liệu. Bản ghi không tồn tại hoặc đã bị xóa.',
    );
    expect(translate('errors.ERR_NOT_FOUND', undefined, 'en')).toBe(
      'Resource not found. Record does not exist or has been deleted.',
    );
    expect(translate('errors.ERR_SERIES_NOT_FOUND', undefined, 'vi')).toBe(
      'Không tìm thấy truyện. Bộ truyện không tồn tại hoặc đã gỡ bỏ.',
    );
    expect(translate('errors.ERR_SERIES_NOT_FOUND', undefined, 'en')).toBe(
      'Series not found. Target series does not exist or was removed.',
    );
    expect(translate('errors.ERR_CHAPTER_READ_ONLY', undefined, 'vi')).toBe(
      'Chương đã đóng băng. Nội dung đã duyệt xuất bản, chỉ cho phép đọc.',
    );
  });

  it('xử lý quy ước số nhiều nhẹ (Pluralization) với params.count', () => {
    // Tiếng Anh: count = 1 ưu tiên _one, count > 1 hoặc 0 ưu tiên _other
    expect(translate('common.time.daysAgo', { count: 1 }, 'en')).toBe('1 day ago');
    expect(translate('common.time.daysAgo', { count: 3 }, 'en')).toBe('3 days ago');
    expect(translate('common.time.daysAgo', { count: 0 }, 'en')).toBe('0 days ago');

    // Tiếng Việt: cả _one và _other đều trả về "{count} ngày trước"
    expect(translate('common.time.daysAgo', { count: 1 }, 'vi')).toBe('1 ngày trước');
    expect(translate('common.time.daysAgo', { count: 5 }, 'vi')).toBe('5 ngày trước');

    // Nếu key không có hậu tố phân nhánh _one/_other, tự động fallback về chính key gốc
    expect(translate('common.actions.save', { count: 1 }, 'vi')).toBe('Lưu');
  });

  it('safe fallback về explicit fallback text và tham số khi key không tồn tại', () => {
    expect(translate('nonexistent.path.key', undefined, 'vi')).toBe('nonexistent.path.key');
    expect(translate('nonexistent.path.key', 'Dự phòng', 'vi')).toBe('Dự phòng');
    expect(
      translate('nonexistent.path.key', { name: 'PanelForge' }, 'vi', 'Chào mừng {name}'),
    ).toBe('Chào mừng PanelForge');
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
