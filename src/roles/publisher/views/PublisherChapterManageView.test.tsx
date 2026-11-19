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
      setEditionMonetization: vi.fn(),
      publishLanguageEdition: vi.fn(),
    },
  };
});

/**
 * Chương 3 trang. BR-33: mỗi ấn bản có loại/giá/N riêng.
 * vi: đã phát hành, Trả phí 10.000đ, 1 trang đầu xem trước. en: đã nghiệm thu nhưng chưa đặt giá (D4).
 */
const manage: ChapterManageDto = {
  chapterId: 'chap-1',
  seriesId: 'series-1',
  chapterNumber: 3,
  title: 'Cao trào',
  isPublished: true,
  minPriceVnd: 1000,
  maxPriceVnd: 1000000,
  languages: [
    {
      language: 'vi',
      translatedPages: 3,
      isAvailable: true,
      editionStatus: 'Published',
      isMonetizationConfigured: true,
      isPaid: true,
      priceVnd: 10000,
      freePreviewPages: 1,
    },
    {
      language: 'en',
      translatedPages: 3,
      isAvailable: false,
      editionStatus: 'Approved',
      isMonetizationConfigured: false,
      isPaid: false,
      priceVnd: 0,
      freePreviewPages: 0,
    },
  ],
  pages: [
    { pageId: 'p1', pageNumber: 1, imageUrls: {} },
    { pageId: 'p2', pageNumber: 2, imageUrls: {} },
    { pageId: 'p3', pageNumber: 3, imageUrls: {} },
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

const openEditions = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: /Ấn bản & giá/i }));

describe('PublisherChapterManageView — ấn bản & giá (BR-33 / D4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(monetizationService.getChapterManage).mockResolvedValue(manage);
    vi.mocked(monetizationService.setEditionMonetization).mockResolvedValue(manage);
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
    });
  });

  it('xem trước là N trang đầu: bấm trang 2 → xem trước trang 1–2, lưu N = 2 cho đúng ấn bản', async () => {
    const user = userEvent.setup();
    renderView();
    await openEditions(user);

    expect(screen.getByText('1 trang đầu xem trước · 2 trang khóa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Trang 2' }));
    expect(screen.getByText('2 trang đầu xem trước · 1 trang khóa')).toBeInTheDocument();

    // Bấm trang cuối (3) vẫn chừa ít nhất một trang khóa.
    await user.click(screen.getByRole('button', { name: 'Trang 3' }));
    expect(screen.getByText('2 trang đầu xem trước · 1 trang khóa')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));
    await waitFor(() =>
      expect(monetizationService.setEditionMonetization).toHaveBeenCalledWith('chap-1', 'vi', {
        isPaid: true,
        priceVnd: 10000,
        freePreviewPages: 2,
        reason: undefined,
      }),
    );
  });

  it('ấn bản đã phát hành: đổi giá bắt buộc nhập lý do', async () => {
    const user = userEvent.setup();
    renderView();
    await openEditions(user);

    await user.click(screen.getByRole('button', { name: '15.000đ' }));
    const save = screen.getByRole('button', { name: 'Lưu cấu hình' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/Lý do thay đổi/i), 'Tăng giá theo thị trường');
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() =>
      expect(monetizationService.setEditionMonetization).toHaveBeenCalledWith('chap-1', 'vi', {
        isPaid: true,
        priceVnd: 15000,
        freePreviewPages: 1,
        reason: 'Tăng giá theo thị trường',
      }),
    );
  });

  it('D4: ấn bản chưa đặt giá không chọn sẵn Free, chặn phát hành tới khi Publisher chọn loại', async () => {
    const user = userEvent.setup();
    renderView();
    await openEditions(user);
    await user.click(screen.getByRole('tab', { name: /English/ }));

    expect(screen.getByRole('radio', { name: 'Free' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Trả phí' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Lưu cấu hình' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Phát hành bản EN/i })).toBeDisabled();
    expect(screen.getByText('Cần đặt giá trước khi phát hành.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Free' }));
    await user.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));

    await waitFor(() =>
      expect(monetizationService.setEditionMonetization).toHaveBeenCalledWith('chap-1', 'en', {
        isPaid: false,
        priceVnd: 0,
        freePreviewPages: 0,
        reason: undefined,
      }),
    );
  });

  it('ấn bản Free: mọi trang mở, không chọn được trang xem trước', async () => {
    vi.mocked(monetizationService.getChapterManage).mockResolvedValue({
      ...manage,
      languages: manage.languages.map((l) =>
        l.language === 'en' ? { ...l, editionStatus: 'Draft', isMonetizationConfigured: true } : l,
      ),
    });
    const user = userEvent.setup();
    renderView();
    await openEditions(user);
    await user.click(screen.getByRole('tab', { name: /English/ }));

    expect(screen.getByRole('radio', { name: 'Free' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Trang 1' })).toBeDisabled();
    expect(screen.queryByLabelText(/Số trang đầu xem trước/i)).not.toBeInTheDocument();
  });

  it('giá ngoài khoảng cho phép thì không lưu được', async () => {
    const user = userEvent.setup();
    renderView();
    await openEditions(user);

    const price = screen.getByLabelText(/Giá mở khóa/i);
    await user.clear(price);
    await user.type(price, '500');

    expect(screen.getByText(/Giá phải là số nguyên từ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu cấu hình' })).toBeDisabled();
  });
});
