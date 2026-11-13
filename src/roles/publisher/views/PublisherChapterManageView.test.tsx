import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublisherChapterManageView } from './PublisherChapterManageView';
import { monetizationService, type ChapterManageDto } from '@/services/payment.service';

vi.mock('@/services/payment.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/payment.service')>();
  return {
    ...actual,
    monetizationService: {
      getChapterManage: vi.fn(),
      getSeriesInsights: vi.fn(),
      setPreviewPages: vi.fn(),
      resetPreviewPages: vi.fn(),
      setLanguagePrices: vi.fn(),
      uploadPageTranslation: vi.fn(),
      deletePageTranslation: vi.fn(),
      updateSeriesSettings: vi.fn(),
    },
  };
});

/** Chương trả phí 3 trang: mặc định bộ truyện 1 trang đầu xem trước. */
const manage: ChapterManageDto = {
  chapterId: 'chap-1',
  seriesId: 'series-1',
  chapterNumber: 3,
  title: 'Cao trào',
  isPublished: true,
  chapterIsLocked: true,
  basePriceVnd: 10000,
  previewPagesCustomized: false,
  seriesDefaultPreviewPageCount: 1,
  languagePrices: [
    { language: 'vi', priceVnd: 10000, isCustom: false },
    { language: 'en', priceVnd: 10000, isCustom: false },
    { language: 'ja', priceVnd: 10000, isCustom: false },
  ],
  languages: [
    { language: 'vi', translatedPages: 3, isAvailable: true },
    { language: 'en', translatedPages: 1, isAvailable: false },
    { language: 'ja', translatedPages: 0, isAvailable: false },
  ],
  pages: [
    { pageId: 'p1', pageNumber: 1, isPreview: true, imageUrls: {} },
    { pageId: 'p2', pageNumber: 2, isPreview: false, imageUrls: {} },
    { pageId: 'p3', pageNumber: 3, isPreview: false, imageUrls: {} },
  ],
};

const renderView = () =>
  render(
    <MemoryRouter initialEntries={['/publisher/revenue/series/series-1/chapters/chap-1']}>
      <Routes>
        <Route
          path='/publisher/revenue/series/:seriesId/chapters/:chapterId'
          element={<PublisherChapterManageView />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('PublisherChapterManageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(monetizationService.getChapterManage).mockResolvedValue(manage);
    vi.mocked(monetizationService.getSeriesInsights).mockResolvedValue({
      seriesId: 'series-1',
      title: 'Moon',
      workspaceId: 'ws',
      workspaceName: 'Studio',
      totals: {
        views: 10,
        uniqueReaders: 4,
        chapterPurchases: 3,
        purchases: 3,
        revenueVnd: 30000,
        ratingAverage: 4.5,
        ratingCount: 2,
      },
      byLanguage: [],
      chapters: [],
      defaultPreviewPageCount: 1,
    });
  });

  it('lưới trang: bấm thumbnail chọn thêm trang xem trước rồi lưu danh sách trang xem trước', async () => {
    const user = userEvent.setup();
    vi.mocked(monetizationService.setPreviewPages).mockResolvedValue({
      ...manage,
      previewPagesCustomized: true,
    });
    renderView();

    await user.click(await screen.findByRole('button', { name: /^Trang xem trước$/i }));
    expect(screen.getByText(/theo mặc định bộ truyện: 1 trang đầu xem trước/i)).toBeInTheDocument();
    expect(screen.getByText('1 trang xem trước · 2 trang khóa')).toBeInTheDocument();

    const page2 = screen.getByRole('button', { name: 'Trang 2' });
    expect(page2).toHaveAttribute('aria-pressed', 'false');
    await user.click(page2);
    expect(page2).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /Lưu trang xem trước/i }));

    await waitFor(() =>
      expect(monetizationService.setPreviewPages).toHaveBeenCalledWith('chap-1', ['p1', 'p2']),
    );
  });

  it('chương miễn phí: không chọn được trang xem trước', async () => {
    const user = userEvent.setup();
    vi.mocked(monetizationService.getChapterManage).mockResolvedValue({
      ...manage,
      chapterIsLocked: false,
    });
    renderView();

    await user.click(await screen.findByRole('button', { name: /^Trang xem trước$/i }));

    expect(screen.getByText(/Chương miễn phí: mọi trang mở/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang 1' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Lưu trang xem trước/i })).not.toBeInTheDocument();
  });

  it('bản dịch chưa đủ ảnh hiện tiến độ và nút upload theo ngôn ngữ', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: /^Trang xem trước$/i }));
    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByText('Chưa đủ ảnh (1/3 trang)')).toBeInTheDocument();
    expect(screen.getAllByText('Upload ảnh EN')).toHaveLength(3);
  });

  it('giá theo ngôn ngữ chỉ cho chương trả phí', async () => {
    const user = userEvent.setup();
    vi.mocked(monetizationService.getChapterManage).mockResolvedValue({
      ...manage,
      chapterIsLocked: false,
    });
    renderView();

    await user.click(await screen.findByRole('button', { name: /Giá theo ngôn ngữ/i }));

    expect(screen.getByText(/Chương miễn phí/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu giá/i })).not.toBeInTheDocument();
  });

  it('Settings lưu số trang đầu xem trước mặc định của bộ truyện', async () => {
    const user = userEvent.setup();
    vi.mocked(monetizationService.updateSeriesSettings).mockResolvedValue({
      seriesId: 'series-1',
      defaultPreviewPageCount: 3,
      maxDefaultPreviewPageCount: 50,
    });
    renderView();

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    const count = screen.getByLabelText(/Số trang đầu xem trước/i);
    await user.clear(count);
    await user.type(count, '3');
    await user.click(screen.getByRole('button', { name: /Lưu settings/i }));

    await waitFor(() =>
      expect(monetizationService.updateSeriesSettings).toHaveBeenCalledWith('series-1', {
        defaultPreviewPageCount: 3,
      }),
    );
  });
});
