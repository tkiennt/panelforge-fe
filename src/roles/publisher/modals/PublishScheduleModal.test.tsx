import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublishScheduleModal } from './PublishScheduleModal';
import { chapterService } from '@/services/chapter.service';
import { monetizationService } from '@/services/payment.service';
import { seriesService } from '@/services/series.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: { publishChapter: vi.fn() },
}));
vi.mock('@/services/payment.service', () => ({
  monetizationService: { getChapterManage: vi.fn(), setEditionMonetization: vi.fn() },
}));
vi.mock('@/services/series.service', () => ({
  seriesService: { getSeriesById: vi.fn() },
}));

const manage = (configured: boolean) => ({
  chapterId: 'chap-1',
  seriesId: 'ser-1',
  chapterNumber: 1,
  isPublished: false,
  minPriceVnd: 1000,
  maxPriceVnd: 100000,
  pages: [{ pageId: 'p1' }, { pageId: 'p2' }, { pageId: 'p3' }],
  languages: [
    {
      language: 'vi',
      translatedPages: 3,
      isAvailable: false,
      editionStatus: 'Approved',
      isMonetizationConfigured: configured,
      isPaid: false,
      priceVnd: 0,
      freePreviewPages: 0,
    },
  ],
});

const renderModal = () =>
  render(
    <PublishScheduleModal
      isOpen
      onClose={vi.fn()}
      chapterId='chap-1'
      chapterNumber={1}
      onSuccess={vi.fn()}
    />,
  );

describe('PublishScheduleModal – giá ấn bản gốc (D4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (seriesService.getSeriesById as any).mockResolvedValue({ id: 'ser-1', originalLanguage: 'vi' });
    (chapterService.publishChapter as any).mockResolvedValue({});
    (monetizationService.setEditionMonetization as any).mockResolvedValue(manage(true));
  });

  it('chưa đặt giá: phải chọn Free/Trả phí, lưu giá rồi mới phát hành chương', async () => {
    (monetizationService.getChapterManage as any).mockResolvedValue(manage(false));
    renderModal();

    await screen.findByTestId('publish-pricing-section');
    expect(screen.getByTestId('publish-submit')).toBeDisabled();

    fireEvent.click(screen.getByTestId('publish-pricing-paid'));
    fireEvent.change(screen.getByTestId('publish-pricing-price'), { target: { value: '15000' } });
    fireEvent.click(screen.getByTestId('publish-submit'));

    await waitFor(() => expect(chapterService.publishChapter).toHaveBeenCalledWith('chap-1', null));
    expect(monetizationService.setEditionMonetization).toHaveBeenCalledWith('chap-1', 'vi', {
      isPaid: true,
      priceVnd: 15000,
      freePreviewPages: 1,
    });
  });

  it('giá trả phí ngoài khoảng cho phép thì báo lỗi, không phát hành', async () => {
    (monetizationService.getChapterManage as any).mockResolvedValue(manage(false));
    renderModal();

    fireEvent.click(await screen.findByTestId('publish-pricing-paid'));
    fireEvent.change(screen.getByTestId('publish-pricing-price'), { target: { value: '10' } });
    // Bỏ qua kiểm tra min/max gốc của trình duyệt để kiểm tra lớp validate của component
    fireEvent.submit(screen.getByTestId('publish-submit').closest('form')!);

    expect(await screen.findByText(/Giá phải là số nguyên/)).toBeInTheDocument();
    expect(chapterService.publishChapter).not.toHaveBeenCalled();
    expect(monetizationService.setEditionMonetization).not.toHaveBeenCalled();
  });

  it('đã đặt giá: chỉ hiện tóm tắt và phát hành thẳng', async () => {
    (monetizationService.getChapterManage as any).mockResolvedValue(manage(true));
    renderModal();

    expect(await screen.findByTestId('publish-pricing-summary')).toHaveTextContent('Free');
    fireEvent.click(screen.getByTestId('publish-submit'));

    await waitFor(() => expect(chapterService.publishChapter).toHaveBeenCalled());
    expect(monetizationService.setEditionMonetization).not.toHaveBeenCalled();
  });
});
