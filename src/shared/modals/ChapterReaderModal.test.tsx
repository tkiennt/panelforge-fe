import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterReaderModal } from './ChapterReaderModal';
import { catalogService } from '@/services/catalog.service';
import { readerLibraryService } from '@/services/readerLibrary.service';

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    getPublicChapter: vi.fn(),
    recordChapterView: vi.fn(() => Promise.resolve()),
  },
  resolveCatalogImageUrl: (url: string) => url,
}));

vi.mock('@/services/readerLibrary.service', () => ({
  readerLibraryService: { saveProgress: vi.fn(() => Promise.resolve()) },
}));

const paidChapter = {
  id: 'chap-2',
  seriesId: 'series-1',
  seriesTitle: 'Đốm Lửa Bất Diệt',
  readingDirection: 'LeftToRight' as const,
  chapterNumber: 2,
  language: 'vi',
  isLocked: true,
  isUnlocked: false,
  priceVnd: 5000,
  pages: [
    { id: 'p1', pageNumber: 1, imageUrl: 'https://cdn.example.com/p1.jpg', isPreview: true },
    { id: 'p2', pageNumber: 2, imageUrl: null, isLocked: true, isUnlocked: false },
  ],
};

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
      pages: [{ id: 'page-1', pageNumber: 1, imageUrl: 'https://cdn.example.com/page1.jpg' }],
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

    // Image is rendered inside zoom-pan-pinch container with language query
    const img = screen.getByAltText('Trang 1');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/page1.jpg?lang=vi');
    expect(document.querySelector('.react-transform-wrapper')).toBeInTheDocument();
  });

  it('trang ngoài phần xem trước hiện nút mở khóa đúng ấn bản (BR-33)', async () => {
    vi.mocked(catalogService.getPublicChapter).mockResolvedValueOnce(paidChapter);
    const onUnlock = vi.fn();
    render(
      <ChapterReaderModal
        isOpen
        onClose={vi.fn()}
        chapterId='chap-2'
        onUnlock={onUnlock}
        trackReading
      />,
    );
    await waitFor(() => expect(screen.getByAltText('Trang 1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Tới trang 2/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Mở khóa/i }));
    expect(onUnlock).toHaveBeenCalledWith({ chapterId: 'chap-2', language: 'vi', priceVnd: 5000 });
    // Chưa mở khóa thì không ghi lượt đọc (server cũng trả 403).
    expect(catalogService.recordChapterView).not.toHaveBeenCalled();
  });

  it('ghi lượt đọc khi độc giả đọc được chương', async () => {
    vi.mocked(catalogService.getPublicChapter).mockResolvedValueOnce({
      ...paidChapter,
      isUnlocked: true,
    });
    render(<ChapterReaderModal isOpen onClose={vi.fn()} chapterId='chap-2' trackReading />);
    await waitFor(() =>
      expect(catalogService.recordChapterView).toHaveBeenCalledWith('chap-2', 'vi'),
    );
  });

  it('ghi lượt đọc một lần và giữ trang đang xem khi tải lại sau mở khóa', async () => {
    const unlocked = {
      ...paidChapter,
      isUnlocked: true,
      pages: [
        { id: 'p1', pageNumber: 1, imageUrl: 'https://cdn.example.com/p1.jpg' },
        { id: 'p2', pageNumber: 2, imageUrl: 'https://cdn.example.com/p2.jpg' },
      ],
    };
    vi.mocked(catalogService.getPublicChapter).mockResolvedValue(unlocked);
    const { rerender } = render(
      <ChapterReaderModal isOpen onClose={vi.fn()} chapterId='chap-2' trackReading reloadKey={0} />,
    );
    await waitFor(() => expect(screen.getByAltText('Trang 1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Tới trang 2/i }));
    await waitFor(() => expect(screen.getByAltText('Trang 2')).toBeInTheDocument());

    rerender(
      <ChapterReaderModal isOpen onClose={vi.fn()} chapterId='chap-2' trackReading reloadKey={1} />,
    );
    await waitFor(() => expect(catalogService.getPublicChapter).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByAltText('Trang 2')).toBeInTheDocument());
    expect(catalogService.recordChapterView).toHaveBeenCalledTimes(1);
  });

  it('lưu tiến độ theo trang đang xem', async () => {
    vi.mocked(catalogService.getPublicChapter).mockResolvedValueOnce({
      ...paidChapter,
      isUnlocked: true,
      pages: [
        { id: 'p1', pageNumber: 1, imageUrl: 'https://cdn.example.com/p1.jpg' },
        { id: 'p2', pageNumber: 2, imageUrl: 'https://cdn.example.com/p2.jpg' },
      ],
    });
    render(<ChapterReaderModal isOpen onClose={vi.fn()} chapterId='chap-2' saveProgress />);
    await waitFor(() => expect(screen.getByAltText('Trang 1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Tới trang 2/i }));

    await waitFor(
      () =>
        expect(readerLibraryService.saveProgress).toHaveBeenCalledWith(
          expect.objectContaining({ chapterId: 'chap-2', lastPageNumber: 2, totalPages: 2 }),
        ),
      { timeout: 3000 },
    );
    expect(readerLibraryService.saveProgress).not.toHaveBeenCalledWith(
      expect.objectContaining({ lastPageNumber: 1 }),
    );
  });
});
