import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '@/api/axiosClient';
import { exportService } from './export.service';

vi.mock('@/api/axiosClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe('exportService (UC-12)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createExport gửi presetCode tới endpoint exports của chương', async () => {
    (axiosClient.post as any).mockResolvedValue({ data: { id: 'j-1', status: 'Queued' } });

    const res = await exportService.createExport('chap-1', 'CBZ');

    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/exports', {
      presetCode: 'CBZ',
    });
    expect(res.status).toBe('Queued');
  });

  it('lỗi từ Backend (409 chương chưa duyệt) giữ nguyên thông báo', async () => {
    (axiosClient.post as any).mockRejectedValue({
      response: {
        status: 409,
        data: { error: 'Chỉ xuất được chương đã duyệt (Approved) hoặc đã phát hành.' },
      },
    });

    await expect(exportService.createExport('chap-1', 'PDF')).rejects.toThrow(
      'Chỉ xuất được chương đã duyệt (Approved) hoặc đã phát hành.',
    );
  });

  it('downloadExport tải blob qua API có kiểm quyền rồi lưu theo tên file', async () => {
    const blob = new Blob(['%PDF']);
    (axiosClient.get as any).mockResolvedValue({ data: blob });
    const createUrl = vi.fn(() => 'blob:x');
    const revokeUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportService.downloadExport('chap-1', { id: 'j-1', fileName: 'Chuong 1.pdf' } as any);

    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-1/exports/j-1/file', {
      responseType: 'blob',
    });
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith('blob:x');
  });
});
