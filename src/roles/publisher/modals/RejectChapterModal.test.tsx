import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectChapterModal } from './RejectChapterModal';
import { chapterService } from '@/services/chapter.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    reopenChapter: vi.fn(),
  },
}));

describe('RejectChapterModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('nút Từ Chối bị vô hiệu hoá (disabled) khi ô lý do rỗng hoặc chỉ có khoảng trắng', async () => {
    const user = userEvent.setup();
    render(
      <RejectChapterModal
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        chapterNumber={1}
        chapterTitle='Khởi Nguyên'
        onSuccess={vi.fn()}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Từ Chối & Mở Lại Sản Xuất/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Nhập chi tiết các điểm cần hoàn thiện/i);

    // Nhập toàn khoảng trắng -> vẫn disabled
    await user.type(textarea, '     ');
    expect(submitBtn).toBeDisabled();

    // Nhập lý do hợp lệ -> enabled
    await user.type(textarea, 'Lỗi màu sắc trang 4');
    expect(submitBtn).not.toBeDisabled();

    // Xoá trắng -> lại disabled
    await user.clear(textarea);
    expect(submitBtn).toBeDisabled();
  });

  it('gửi lý do từ chối và gọi onSuccess khi người dùng submit', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const onShowToast = vi.fn();

    vi.mocked(chapterService.reopenChapter).mockResolvedValueOnce({
      id: 'rev-1',
      chapterId: 'chap-1',
      action: 'PublisherRejected',
      actorUserId: 'pub-1',
      comment: 'Cần vẽ lại bìa chương',
      scheduledAt: null,
      chapterVersion: 2,
      createdAt: '2026-10-07T12:00:00Z',
    });

    render(
      <RejectChapterModal
        isOpen={true}
        onClose={onClose}
        chapterId='chap-1'
        chapterNumber={1}
        chapterTitle='Khởi Nguyên'
        onSuccess={onSuccess}
        onShowToast={onShowToast}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Nhập chi tiết các điểm cần hoàn thiện/i);
    await user.type(textarea, 'Cần vẽ lại bìa chương');

    const submitBtn = screen.getByRole('button', { name: /Từ Chối & Mở Lại Sản Xuất/i });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    expect(chapterService.reopenChapter).toHaveBeenCalledWith('chap-1', 'Cần vẽ lại bìa chương');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith(
      'Đã từ chối xuất bản',
      expect.stringContaining('Chương 1'),
    );
  });
});
