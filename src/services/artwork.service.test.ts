import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  artworkService,
  clearArtworkAccessLinkCache,
  computeFileSha256,
  toThumbnailUrl,
} from './artwork.service';
import axiosClient from '../api/axiosClient';

vi.mock('../api/axiosClient');

describe('artworkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearArtworkAccessLinkCache();
  });

  it('uploadArtwork gửi FormData multipart với file, stageId, sha256', async () => {
    const mockFile = new File(['image content'], 'page1.png', { type: 'image/png' });
    const mockRes = {
      id: 'ref-1',
      fileName: 'page1.png',
      sha256: 'abc123sha256',
      reused: false,
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockRes });

    const result = await artworkService.uploadArtwork(
      'chap-1',
      'page-1',
      mockFile,
      'stage-pencil',
      'abc123sha256',
      'ARTWORK_LAYER',
    );

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/chapters/chap-1/pages/page-1/artwork',
      expect.any(FormData),
      expect.objectContaining({
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    );
    expect(result).toEqual(mockRes);
  });

  it('uploadArtwork gửi kèm panelId khi tải ảnh cho Panel', async () => {
    const mockFile = new File(['panel content'], 'panel1.png', { type: 'image/png' });
    const mockRes = {
      id: 'ref-panel-1',
      fileName: 'panel1.png',
      panelId: 'panel-999',
      reused: false,
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockRes });

    const result = await artworkService.uploadArtwork(
      'chap-1',
      'page-1',
      mockFile,
      'stage-pencil',
      'abc123sha256',
      undefined,
      'panel-999',
    );

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/chapters/chap-1/pages/page-1/artwork',
      expect.any(FormData),
      expect.anything(),
    );
    expect(result).toEqual(mockRes);
  });

  it('getArtworks gọi GET /artwork kèm stageId nếu có', async () => {
    const mockArtworks = [{ id: 'ref-1', versionNumber: 1 }];
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockArtworks });

    const result = await artworkService.getArtworks('chap-1', 'page-1', 'stage-pencil');
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-1/pages/page-1/artwork', {
      params: { stageId: 'stage-pencil' },
    });
    expect(result).toEqual(mockArtworks);
  });

  it('getArtworkAccessLink gọi POST /access-link và trả về URL ngắn hạn', async () => {
    const mockLink = {
      url: '/api/assets/download?token=xyz123',
      expiresAtUtc: '2026-10-06T20:10:00Z',
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockLink });

    const result = await artworkService.getArtworkAccessLink('chap-1', 'ref-1');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/artwork/ref-1/access-link');
    expect(result).toEqual(mockLink);
  });

  it('computeFileSha256 tính toán chuỗi hash sha-256 chính xác từ File', async () => {
    const mockFile = new File(['test string'], 'test.txt', { type: 'text/plain' });
    const hash = await computeFileSha256(mockFile);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
  });

  it('getArtworkAccessLink dùng lại link còn hạn để trình duyệt cache được ảnh', async () => {
    const link = {
      url: '/api/assets/download?token=a',
      expiresAtUtc: new Date(Date.now() + 4 * 60_000).toISOString(),
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: link });

    const first = await artworkService.getArtworkAccessLink('chap-1', 'ref-9');
    const second = await artworkService.getArtworkAccessLink('chap-1', 'ref-9');

    expect(second).toBe(first);
    expect(axiosClient.post).toHaveBeenCalledTimes(1);
  });

  it('getArtworkAccessLink xin link mới khi link cũ sắp hết hạn', async () => {
    vi.mocked(axiosClient.post)
      .mockResolvedValueOnce({
        data: { url: '/x?token=old', expiresAtUtc: new Date(Date.now() + 30_000).toISOString() },
      })
      .mockResolvedValueOnce({
        data: { url: '/x?token=new', expiresAtUtc: new Date(Date.now() + 300_000).toISOString() },
      });

    await artworkService.getArtworkAccessLink('chap-1', 'ref-8');
    const fresh = await artworkService.getArtworkAccessLink('chap-1', 'ref-8');

    expect(fresh.url).toBe('/x?token=new');
    expect(axiosClient.post).toHaveBeenCalledTimes(2);
  });

  it('toThumbnailUrl thêm size=thumb', () => {
    expect(toThumbnailUrl('http://h/api/assets/download?token=a')).toBe(
      'http://h/api/assets/download?token=a&size=thumb',
    );
  });
});
