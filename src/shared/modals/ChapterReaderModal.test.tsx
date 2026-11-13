import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterReaderModal } from './ChapterReaderModal';
import { catalogService } from '@/services/catalog.service';

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    getPublicChapter: vi.fn(),
  },
  resolveCatalogImageUrl: (url: string) => url,
}));

describe('ChapterReaderModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('không hiển thị khi isOpen là false', () => {
    const { container } = render(
      <ChapterReaderModal isOpen={false} onClose={vi.fn()} chapterId='chap-1' />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('tải và hiển thị ảnh trang với hỗ trợ Zoom & Pan khi mở', async () => {
    vi.mocked(catalogService.getPublicChapter).mockResolvedValueOnce({
      id: 'chap-1',
      seriesId: 'series-1',
      seriesTitle: 'Đốm Lửa Bất Diệt',
      readingDirection: 'LeftToRight',
      chapterNumber: 1,
      title: 'Khởi đầu',
      pages: [
        { id: 'page-1', pageNumber: 1, imageUrl: 'https://cdn.example.com/page1.jpg' },
      ],
    });

    render(
      <ChapterReaderModal
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        chapterNumber={1}
        chapterTitle='Khởi đầu'
      />,
    );

    // Shows loading state initially
    expect(screen.getByText(/Đang nạp dữ liệu chương/i)).toBeInTheDocument();

    // Waits for page image to load
    await waitFor(() => {
      expect(screen.getByAltText('Trang 1')).toBeInTheDocument();
    });

    // Image is rendered inside zoom-pan-pinch container
    const img = screen.getByAltText('Trang 1');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/page1.jpg');
    expect(document.querySelector('.react-transform-wrapper')).toBeInTheDocument();
  });
});
