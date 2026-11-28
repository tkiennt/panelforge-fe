import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadLimitsPanel } from './UploadLimitsPanel';
import { uploadLimitService, type UploadLimitsDto } from '@/services/uploadLimit.service';

vi.mock('@/services/uploadLimit.service', () => ({
  uploadLimitService: { get: vi.fn(), update: vi.fn() },
}));

const MIB = 1024 * 1024;
const limits: UploadLimitsDto = {
  artworkMaxBytes: 25 * MIB,
  referenceImageMaxBytes: 10 * MIB,
  coverImageMaxBytes: 5 * MIB,
  artworkCeilingBytes: 50 * MIB,
  imageCeilingBytes: 20 * MIB,
  isDefault: true,
  updatedAt: null,
  updatedByName: null,
};

describe('UploadLimitsPanel (Admin → Tài nguyên → Chính sách mặc định)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadLimitService.get).mockResolvedValue(limits);
  });

  it('chặn mức vượt trần của server và không gọi API', async () => {
    render(<UploadLimitsPanel onSaved={vi.fn()} />);
    const cover = await screen.findByLabelText(/Ảnh bìa, avatar, banner/);

    fireEvent.change(cover, { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu/ }));

    expect(await screen.findByText('Nhập số MB lớn hơn 0 và không quá 20 MB.')).toBeInTheDocument();
    expect(uploadLimitService.update).not.toHaveBeenCalled();
  });

  it('lưu giới hạn theo byte rồi báo đã lưu', async () => {
    const onSaved = vi.fn();
    vi.mocked(uploadLimitService.update).mockResolvedValue({
      ...limits,
      artworkMaxBytes: 40 * MIB,
      isDefault: false,
      updatedAt: '2026-11-28T07:00:00Z',
      updatedByName: 'Admin',
    });
    render(<UploadLimitsPanel onSaved={onSaved} />);

    fireEvent.change(await screen.findByLabelText(/Artwork trang \/ panel/), {
      target: { value: '40' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu/ }));

    await waitFor(() =>
      expect(uploadLimitService.update).toHaveBeenCalledWith({
        artworkMaxBytes: 40 * MIB,
        referenceImageMaxBytes: 10 * MIB,
        coverImageMaxBytes: 5 * MIB,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith('Đã lưu giới hạn kích thước file.');
  });
});
