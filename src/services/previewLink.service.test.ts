import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '@/api/axiosClient';
import {
  previewLinkService,
  anonymousPreviewClient,
  resolvePreviewImageUrl,
} from './previewLink.service';

vi.mock('@/api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost:5044/api' },
  },
}));

describe('previewLinkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Studio Operations (Authenticated)', () => {
    it('createPreviewLink gửi đúng payload và endpoint', async () => {
      const mockResult = {
        id: 'link-1',
        recipientEmail: 'reviewer@external.com',
        expiresAt: '2026-10-15T00:00:00Z',
        token: 'secret-token-xyz',
      };
      (axiosClient.post as any).mockResolvedValue({ data: mockResult });

      const res = await previewLinkService.createPreviewLink('chap-123', {
        recipientEmail: 'reviewer@external.com',
        expiresInHours: 48,
      });

      expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-123/preview-links', {
        recipientEmail: 'reviewer@external.com',
        expiresInHours: 48,
      });
      expect(res).toEqual(mockResult);
    });

    it('getPreviewLinks lấy danh sách link của chapter', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          chapterId: 'chap-123',
          recipientEmail: 'reviewer@external.com',
          status: 'Active',
          pageCount: 10,
          accessCount: 3,
        },
      ];
      (axiosClient.get as any).mockResolvedValue({ data: mockLinks });

      const res = await previewLinkService.getPreviewLinks('chap-123');

      expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-123/preview-links');
      expect(res).toEqual(mockLinks);
    });

    it('revokePreviewLink gọi endpoint thu hồi', async () => {
      (axiosClient.post as any).mockResolvedValue({ data: null });

      await previewLinkService.revokePreviewLink('chap-123', 'link-1');

      expect(axiosClient.post).toHaveBeenCalledWith(
        '/chapters/chap-123/preview-links/link-1/revoke',
      );
    });

    it('getPreviewFeedback hỗ trợ lọc theo status hoặc lấy tất cả', async () => {
      const mockFeedback = [
        { id: 'fb-1', status: 'New', message: 'Tốt lắm' },
        { id: 'fb-2', status: 'NeedsChange', message: 'Trang 2 lệch' },
      ];
      (axiosClient.get as any).mockResolvedValue({ data: mockFeedback });

      const resAll = await previewLinkService.getPreviewFeedback('chap-123');
      expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-123/preview-feedback');
      expect(resAll).toHaveLength(2);

      await previewLinkService.getPreviewFeedback('chap-123', 'NeedsChange');
      expect(axiosClient.get).toHaveBeenCalledWith(
        '/chapters/chap-123/preview-feedback?status=NeedsChange',
      );
    });

    it('triagePreviewFeedback gửi quyết định triage với note', async () => {
      const mockUpdated = { id: 'fb-2', status: 'NeedsChange', triageNote: 'Cần vẽ lại' };
      (axiosClient.post as any).mockResolvedValue({ data: mockUpdated });

      const res = await previewLinkService.triagePreviewFeedback('chap-123', 'fb-2', {
        decision: 'NeedsChange',
        note: 'Cần vẽ lại',
      });

      expect(axiosClient.post).toHaveBeenCalledWith(
        '/chapters/chap-123/preview-feedback/fb-2/triage',
        { decision: 'NeedsChange', note: 'Cần vẽ lại' },
      );
      expect(res).toEqual(mockUpdated);
    });
  });

  describe('Anonymous Reader Operations (AllowAnonymous, NO Bearer)', () => {
    it('openPreview gọi anonymousPreviewClient với token trong body', async () => {
      const postSpy = vi.spyOn(anonymousPreviewClient, 'post').mockResolvedValue({
        data: {
          chapterId: 'chap-123',
          seriesTitle: 'Test Manga',
          chapterNumber: 1,
          watermarkText: 'CONFIDENTIAL PREVIEW',
          readingDirection: 'RightToLeft',
          pages: [],
        },
      } as any);

      const res = await previewLinkService.openPreview('sample-token-abc');

      expect(postSpy).toHaveBeenCalledWith('/preview/open', { token: 'sample-token-abc' });
      expect(res.seriesTitle).toBe('Test Manga');
      expect(res.watermarkText).toBe('CONFIDENTIAL PREVIEW');
    });

    it('submitFeedback gửi phản hồi qua anonymousPreviewClient', async () => {
      const postSpy = vi.spyOn(anonymousPreviewClient, 'post').mockResolvedValue({
        data: {
          id: 'fb-99',
          message: 'Khung này đẹp',
        },
      } as any);

      const res = await previewLinkService.submitFeedback({
        token: 'sample-token-abc',
        message: 'Khung này đẹp',
        pageId: 'page-1',
        panelId: 'panel-2',
      });

      expect(postSpy).toHaveBeenCalledWith('/preview/feedback', {
        token: 'sample-token-abc',
        message: 'Khung này đẹp',
        pageId: 'page-1',
        panelId: 'panel-2',
      });
      expect(res.id).toBe('fb-99');
    });
  });

  describe('resolvePreviewImageUrl', () => {
    it('giữ nguyên URL tuyệt đối http/https', () => {
      expect(resolvePreviewImageUrl('https://cdn.panelforge.com/image.png')).toBe(
        'https://cdn.panelforge.com/image.png',
      );
    });

    it('nối relative URL với base domain chính xác', () => {
      const url = resolvePreviewImageUrl('/api/preview/images?token=123');
      expect(url).toContain('/api/preview/images?token=123');
      expect(url.startsWith('http')).toBe(true);
    });

    it('trả về chuỗi rỗng khi không có URL', () => {
      expect(resolvePreviewImageUrl('')).toBe('');
    });
  });
});
