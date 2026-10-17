import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicPreviewView } from './PublicPreviewView';
import { previewLinkService, PreviewChapterDto } from '@/services/previewLink.service';

vi.mock('@/services/previewLink.service', () => ({
  previewLinkService: {
    openPreview: vi.fn(),
    submitFeedback: vi.fn(),
  },
  resolvePreviewImageUrl: (url: string) => `http://localhost:5044${url}`,
}));

describe('PublicPreviewView', () => {
  const mockChapterRTL: PreviewChapterDto = {
    chapterId: 'chap-101',
    seriesTitle: 'Lantern of the Tide',
    chapterNumber: 1,
    chapterTitle: 'The Letter in the Foam',
    readingDirection: 'RightToLeft',
    recipientEmail: 'reviewer@editor.com',
    watermarkText: 'CONFIDENTIAL FOR REVIEWER',
    expiresAt: '2026-10-15T00:00:00Z',
    chapterVersion: 2,
    pages: [
      {
        pageId: 'page-1',
        pageNumber: 1,
        assetReferenceId: 'asset-1',
        versionNumber: 1,
        imageUrl: '/api/preview/images?token=tok-img-1',
        panels: [
          {
            panelId: 'panel-1',
            panelNumber: 1,
            boundingBox: JSON.stringify({
              normalized: { x: 0.1, y: 0.1, w: 0.8, h: 0.4 },
              unit: 'px',
            }),
          },
        ],
      },
      {
        pageId: 'page-2',
        pageNumber: 2,
        assetReferenceId: 'asset-2',
        versionNumber: 1,
        imageUrl: '/api/preview/images?token=tok-img-2',
        panels: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithToken = (token = 'valid-preview-token') => {
    return render(
      <MemoryRouter initialEntries={[`/preview/${token}`]}>
        <Routes>
          <Route path='/preview/:token' element={<PublicPreviewView />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('hiển thị màn hình lỗi khi link xem thử bị 403 (hết hạn / bị thu hồi)', async () => {
    (previewLinkService.openPreview as any).mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: 'Link xem thử không hợp lệ, đã hết hạn hoặc đã bị thu hồi.' },
      },
    });

    renderWithToken('expired-token');

    await waitFor(() => {
      expect(screen.getByTestId('preview-error-screen')).toBeInTheDocument();
    });

    expect(screen.getByText('Liên Kết Không Khả Dụng')).toBeInTheDocument();
    expect(
      screen.getByText('Link xem thử không hợp lệ, đã hết hạn hoặc đã bị thu hồi.'),
    ).toBeInTheDocument();
  });

  it('hiển thị thông tin chương, watermark đè chéo và badge hướng đọc Manga RTL', async () => {
    (previewLinkService.openPreview as any).mockResolvedValueOnce(mockChapterRTL);

    renderWithToken();

    await waitFor(() => {
      expect(screen.getByTestId('public-preview-view')).toBeInTheDocument();
    });

    expect(screen.getByText('Lantern of the Tide')).toBeInTheDocument();
    expect(screen.getByText(/reviewer@editor.com/)).toBeInTheDocument();
    expect(screen.getByText(/Manga \(RTL: Phải qua Trái\)/)).toBeInTheDocument();

    // Watermark overlay phủ trên trang
    const watermark = screen.getByTestId('watermark-overlay');
    expect(watermark).toBeInTheDocument();
    expect(watermark).toHaveStyle({ pointerEvents: 'none' });
  });

  it('hỗ trợ điều hướng trang theo chuẩn RTL (ArrowLeft lật trang tiếp)', async () => {
    (previewLinkService.openPreview as any).mockResolvedValueOnce(mockChapterRTL);

    renderWithToken();

    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    // Nhấn phím ArrowLeft trong chế độ RTL -> chuyển sang trang 2
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });

    // Nhấn phím ArrowRight trong chế độ RTL -> lùi về trang 1
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  it('gọi lại /open đúng MỘT lần khi ảnh bị lỗi (403 image retry)', async () => {
    (previewLinkService.openPreview as any)
      .mockResolvedValueOnce(mockChapterRTL)
      .mockResolvedValueOnce({
        ...mockChapterRTL,
        pages: [
          {
            ...mockChapterRTL.pages[0],
            imageUrl: '/api/preview/images?token=refreshed-tok-1',
          },
          mockChapterRTL.pages[1],
        ],
      });

    renderWithToken();

    await waitFor(() => {
      expect(screen.getByTestId('preview-page-image')).toBeInTheDocument();
    });

    // Lần 1: Giả lập ảnh bị lỗi 403 hết hạn token ảnh
    const img = screen.getByTestId('preview-page-image');
    fireEvent.error(img);

    await waitFor(() => {
      // openPreview được gọi lại lần thứ 2 để làm mới URL ảnh
      expect(previewLinkService.openPreview).toHaveBeenCalledTimes(2);
    });

    // Lần 2: Giả lập ảnh lại lỗi tiếp -> KHÔNG được gọi lại lần 3 (chỉ gọi đúng một lần)
    fireEvent.error(img);
    expect(previewLinkService.openPreview).toHaveBeenCalledTimes(2);
  });

  it('chọn khung tranh trên trang và gửi phản hồi cấp panel thành công', async () => {
    (previewLinkService.openPreview as any).mockResolvedValueOnce(mockChapterRTL);
    (previewLinkService.submitFeedback as any).mockResolvedValueOnce({
      id: 'feedback-123',
      message: 'Nét vẽ khung 1 rất ấn tượng',
    });

    renderWithToken();

    await waitFor(() => {
      expect(screen.getByTestId('preview-panel-box-panel-1')).toBeInTheDocument();
    });

    // Nhấp vào Khung 1 trên canvas ảnh
    fireEvent.click(screen.getByTestId('preview-panel-box-panel-1'));

    // Drawer phản hồi tự động mở
    await waitFor(() => {
      expect(screen.getByTestId('feedback-drawer')).toBeInTheDocument();
    });

    expect(screen.getByText(/Gắn phản hồi vào/)).toBeInTheDocument();
    expect(screen.getByTestId('scope-panel-btn')).toHaveTextContent('Khung #1');

    // Nhập nội dung
    const textarea = screen.getByTestId('feedback-message-input');
    fireEvent.change(textarea, { target: { value: 'Nét vẽ khung 1 rất ấn tượng' } });

    // Bấm nút gửi
    const submitBtn = screen.getByTestId('submit-feedback-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(previewLinkService.submitFeedback).toHaveBeenCalledWith({
        token: 'valid-preview-token',
        message: 'Nét vẽ khung 1 rất ấn tượng',
        pageId: 'page-1',
        panelId: 'panel-1',
      });
      expect(screen.getByTestId('feedback-success-banner')).toBeInTheDocument();
    });
  });
});
