import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthenticatedImage } from './AuthenticatedImage';
import axiosClient from '@/api/axiosClient';

vi.mock('@/api/axiosClient', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('AuthenticatedImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-123');
  });

  it('render trực tiếp khi src là URL http(s) hoặc data-uri', () => {
    render(<AuthenticatedImage src='https://example.com/hero.png' alt='Hero' />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/hero.png');
    expect(img).toHaveAttribute('alt', 'Hero');
    expect(axiosClient.get).not.toHaveBeenCalled();
  });

  it('gọi axiosClient lấy blob khi src là đường dẫn API nội bộ', async () => {
    const mockBlob = new Blob(['image content'], { type: 'image/png' });
    (axiosClient.get as any).mockResolvedValueOnce({ data: mockBlob });

    render(
      <AuthenticatedImage
        src='/api/series/series-1/bible/assets/sha-256-abc'
        alt='Kenji Spec Sheet'
      />,
    );

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'blob:http://localhost/mock-blob-123');
      expect(img).toHaveAttribute('alt', 'Kenji Spec Sheet');
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/api/series/series-1/bible/assets/sha-256-abc', {
      responseType: 'blob',
    });
  });

  it('hiển thị fallback khi API lỗi hoặc src rỗng', async () => {
    (axiosClient.get as any).mockRejectedValueOnce(new Error('404'));

    render(
      <AuthenticatedImage
        src='/api/series/series-1/bible/assets/not-found'
        alt='Not Found'
        fallback={<span data-testid='custom-fallback'>Ảnh không tồn tại</span>}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });
});
