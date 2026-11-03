import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { chapterService, ChapterLockGateDto } from './chapter.service';
import { catalogService, resolveCatalogImageUrl } from './catalog.service';

vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: { baseURL: 'http://localhost:5044/api' },
    },
  };
});

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);

describe('Chapter Publishing & Review Services', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('chapterService - Review & Publish flow', () => {
    it('gọi getChapterLockGate kiểm tra checklist điều kiện duyệt chương', async () => {
      const mockGate: ChapterLockGateDto = {
        chapterId: 'chap-100',
        status: 'InProduction',
        canApprove: false,
        items: [
          {
            code: 'NO_PAGES',
            blocking: true,
            count: 0,
            message: 'Chapter chưa có Page nào, chưa thể duyệt.',
          },
          {
            code: 'PENDING_AI_SUGGESTIONS',
            blocking: false,
            count: 1,
            message: 'Còn 1 đề xuất AI chờ quyết định.',
          },
        ],
      };
      get.mockResolvedValue({ data: mockGate });

      const res = await chapterService.getChapterLockGate('chap-100');

      expect(get).toHaveBeenCalledWith('/chapters/chap-100/lock-gate');
      expect(res.canApprove).toBe(false);
      expect(res.items).toHaveLength(2);
      expect(res.items[0].code).toBe('NO_PAGES');
    });

    it('gọi approveChapter thành công chuyển trạng thái sang Approved', async () => {
      const mockReview = {
        id: 'rev-1',
        chapterId: 'chap-100',
        action: 'ProducerApproved',
        actorUserId: 'user-producer',
        comment: null,
        scheduledAt: null,
        chapterVersion: 2,
        createdAt: '2026-10-07T10:00:00Z',
      };
      post.mockResolvedValue({ data: mockReview });

      const res = await chapterService.approveChapter('chap-100');

      expect(post).toHaveBeenCalledWith('/chapters/chap-100/approve');
      expect(res.action).toBe('ProducerApproved');
      expect(res.chapterId).toBe('chap-100');
    });

    it('gọi reopenChapter với lý do bắt buộc', async () => {
      const mockReview = {
        id: 'rev-2',
        chapterId: 'chap-100',
        action: 'PublisherRejected',
        actorUserId: 'user-publisher',
        comment: 'Cần sửa lại nét vẽ trang 3',
        scheduledAt: null,
        chapterVersion: 2,
        createdAt: '2026-10-07T10:15:00Z',
      };
      post.mockResolvedValue({ data: mockReview });

      const res = await chapterService.reopenChapter('chap-100', 'Cần sửa lại nét vẽ trang 3');

      expect(post).toHaveBeenCalledWith('/chapters/chap-100/reopen', {
        comment: 'Cần sửa lại nét vẽ trang 3',
      });
      expect(res.action).toBe('PublisherRejected');
      expect(res.comment).toBe('Cần sửa lại nét vẽ trang 3');
    });

    it('gọi publishChapter không kèm ngày để phát hành ngay', async () => {
      const mockReview = {
        id: 'rev-3',
        chapterId: 'chap-100',
        action: 'PublisherPublished',
        actorUserId: 'user-publisher',
        comment: null,
        scheduledAt: null,
        chapterVersion: 3,
        createdAt: '2026-10-07T10:30:00Z',
      };
      post.mockResolvedValue({ data: mockReview });

      const res = await chapterService.publishChapter('chap-100');

      expect(post).toHaveBeenCalledWith('/chapters/chap-100/publish', {});
      expect(res.action).toBe('PublisherPublished');
    });

    it('gọi publishChapter kèm ngày tương lai để lên lịch phát hành', async () => {
      const futureDate = '2026-10-15T00:00:00Z';
      const mockReview = {
        id: 'rev-4',
        chapterId: 'chap-100',
        action: 'PublisherPublished',
        actorUserId: 'user-publisher',
        comment: null,
        scheduledAt: futureDate,
        chapterVersion: 3,
        createdAt: '2026-10-07T10:30:00Z',
      };
      post.mockResolvedValue({ data: mockReview });

      const res = await chapterService.publishChapter('chap-100', futureDate);

      expect(post).toHaveBeenCalledWith('/chapters/chap-100/publish', {
        publishAt: futureDate,
      });
      expect(res.scheduledAt).toBe(futureDate);
    });

    it('tải lên ảnh bìa chương qua PUT /chapters/{id}/cover', async () => {
      const put = vi.mocked(axiosClient.put);
      put.mockResolvedValueOnce({ data: { value: '/api/chapters/chap-100/cover?v=abcdef123456' } });

      const dummyFile = new File(['dummy content'], 'cover.png', { type: 'image/png' });
      const coverUrl = await chapterService.uploadChapterCover('chap-100', dummyFile);

      expect(put).toHaveBeenCalledWith(
        '/chapters/chap-100/cover',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      );
      expect(coverUrl).toBe('/api/chapters/chap-100/cover?v=abcdef123456');
    });

    it('xoá ảnh bìa chương qua DELETE /chapters/{id}/cover', async () => {
      const del = vi.mocked(axiosClient.delete);
      del.mockResolvedValueOnce({ data: { value: null } });

      await chapterService.deleteChapterCover('chap-100');

      expect(del).toHaveBeenCalledWith('/chapters/chap-100/cover');
    });

    it('gọi updateOutline qua PUT /chapters/{id}/outline', async () => {
      const put = vi.mocked(axiosClient.put);
      put.mockResolvedValueOnce({ data: { value: 'Đề cương chương 1' } });

      const res = await chapterService.updateOutline('chap-100', 'Đề cương chương 1');
      expect(put).toHaveBeenCalledWith('/chapters/chap-100/outline', {
        outline: 'Đề cương chương 1',
      });
      expect(res.value).toBe('Đề cương chương 1');
    });

    it('lấy danh sách lịch sử phê duyệt của chương qua getChapterReviews', async () => {
      const mockReviews = [
        {
          id: 'rev-1',
          chapterId: 'chap-100',
          action: 'ProducerApproved',
          actorUserId: 'u-1',
          createdAt: '2026-10-07T08:00:00Z',
          chapterVersion: 1,
        },
        {
          id: 'rev-2',
          chapterId: 'chap-100',
          action: 'PublisherPublished',
          actorUserId: 'u-2',
          createdAt: '2026-10-07T09:00:00Z',
          chapterVersion: 2,
        },
      ];
      get.mockResolvedValue({ data: mockReviews });

      const res = await chapterService.getChapterReviews('chap-100');

      expect(get).toHaveBeenCalledWith('/chapters/chap-100/reviews');
      expect(res.length).toBe(2);
      expect(res[0].action).toBe('ProducerApproved');
      expect(res[1].action).toBe('PublisherPublished');
    });
  });

  describe('catalogService - Public Reader', () => {
    it('nạp thông tin chương truyện công khai qua getPublicChapter', async () => {
      const mockPublicChapter = {
        id: 'chap-100',
        seriesId: 'series-99',
        seriesTitle: 'Manga Test',
        readingDirection: 'RightToLeft',
        chapterNumber: 1,
        title: 'Khởi đầu',
        publishedAt: '2026-10-07T00:00:00Z',
        pages: [
          {
            id: 'page-1',
            pageNumber: 1,
            imageUrl: '/api/catalog/chapters/chap-100/pages/page-1/image',
          },
          {
            id: 'page-2',
            pageNumber: 2,
            imageUrl: '/api/catalog/chapters/chap-100/pages/page-2/image',
          },
        ],
      };
      get.mockResolvedValue({ data: mockPublicChapter });

      const res = await catalogService.getPublicChapter('chap-100');

      expect(get).toHaveBeenCalledWith('/catalog/chapters/chap-100');
      expect(res.readingDirection).toBe('RightToLeft');
      expect(res.pages.length).toBe(2);
    });

    it('tạo URL tải ảnh bìa chương công khai qua getPublicChapterCoverUrl', () => {
      const url = catalogService.getPublicChapterCoverUrl('chap-100', 'hash123');
      expect(url).toBe('http://localhost:5044/api/catalog/chapters/chap-100/cover?v=hash123');
    });

    it('tạo URL tải ảnh trang chương truyện đúng định dạng', () => {
      const url = catalogService.getPublicPageImageUrl('chap-100', 'page-1');
      expect(url).toBe('http://localhost:5044/api/catalog/chapters/chap-100/pages/page-1/image');
    });

    it('chuyển đổi relative URL thành absolute URL với resolveCatalogImageUrl', () => {
      const absUrl = resolveCatalogImageUrl('/api/catalog/chapters/123/pages/456/image');
      expect(absUrl).toBe('http://localhost:5044/api/catalog/chapters/123/pages/456/image');

      const alreadyAbs = resolveCatalogImageUrl('https://cdn.panelforge.com/img.png');
      expect(alreadyAbs).toBe('https://cdn.panelforge.com/img.png');
    });
  });
});
