import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileCoverPickerDialog } from './ProfileCoverPickerDialog';
import { resolveProfileCover, DEFAULT_PROFILE_COVER } from '@/shared/utils/profileCovers';

const setup = (over: Partial<React.ComponentProps<typeof ProfileCoverPickerDialog>> = {}) => {
  const props = {
    savedId: null as string | null,
    onPreview: vi.fn(),
    onApply: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...over,
  };
  render(<ProfileCoverPickerDialog {...props} />);
  return props;
};

const pick = (id: string) =>
  fireEvent.click(screen.getByTestId(`profile-cover-option-${id}`).querySelector('input')!);

describe('ProfileCoverPickerDialog', () => {
  it('chọn mẫu chỉ xem trước; Hủy trả bìa đã lưu, không gọi lưu', () => {
    const p = setup({ savedId: 'profile-cover-green-workspace' });
    expect(
      screen.getByTestId('profile-cover-option-profile-cover-green-workspace'),
    ).toHaveTextContent('Đang dùng');
    pick('profile-cover-robot-studio');
    expect(p.onPreview).toHaveBeenLastCalledWith('profile-cover-robot-studio');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(p.onPreview).toHaveBeenLastCalledWith('profile-cover-green-workspace');
    expect(p.onApply).not.toHaveBeenCalled();
    expect(p.onClose).toHaveBeenCalled();
  });

  it('Áp dụng lưu đúng ID, kể cả trở về mặc định (null)', async () => {
    const p = setup({ savedId: 'profile-cover-robot-studio' });
    pick('default');
    fireEvent.click(screen.getByTestId('profile-cover-apply'));
    await waitFor(() => expect(p.onApply).toHaveBeenCalledWith(null));
    await waitFor(() => expect(p.onClose).toHaveBeenCalled());
  });

  it('lỗi lưu: giữ dialog mở và báo lỗi', async () => {
    const p = setup({ onApply: vi.fn().mockRejectedValue(new Error('Mất kết nối.')) });
    pick('profile-cover-manga-studio');
    fireEvent.click(screen.getByTestId('profile-cover-apply'));
    expect(await screen.findByTestId('profile-cover-error')).toHaveTextContent('Mất kết nối.');
    expect(p.onClose).not.toHaveBeenCalled();
  });

  it('Escape = Hủy', () => {
    const p = setup();
    fireEvent.keyDown(screen.getByTestId('profile-cover-dialog'), { key: 'Escape' });
    expect(p.onClose).toHaveBeenCalled();
  });

  it('ID lạ hoặc thiếu → bìa mặc định', () => {
    expect(resolveProfileCover(undefined)).toBe(DEFAULT_PROFILE_COVER);
    expect(resolveProfileCover('khong-ton-tai')).toBe(DEFAULT_PROFILE_COVER);
    expect(resolveProfileCover('profile-cover-robot-studio').id).toBe('profile-cover-robot-studio');
  });
});
