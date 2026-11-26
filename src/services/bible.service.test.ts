import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { bibleService } from './bible.service';

vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);
const put = vi.mocked(axiosClient.put);
const del = vi.mocked(axiosClient.delete);

describe('bibleService', () => {
  const seriesId = 'series-123';
  const entryId = 'entry-456';
  const revisionId = 'rev-789';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getSeriesBible', () => {
    it('gọi GET /series/{seriesId}/bible và trả về dữ liệu Bible', async () => {
      const mockData = { id: 'bible-1', seriesId, entries: [] };
      get.mockResolvedValueOnce({ data: mockData });

      const result = await bibleService.getSeriesBible(seriesId);

      expect(get).toHaveBeenCalledWith(`/series/${seriesId}/bible`);
      expect(result).toEqual(mockData);
    });
  });

  describe('uploadReferenceImage', () => {
    it('gọi POST /series/{seriesId}/bible/assets với FormData', async () => {
      const mockRes = {
        url: '/api/series/series-123/bible/assets/sha-abc',
        sha256: 'sha-abc',
        contentType: 'image/png',
        sizeBytes: 1024,
      };
      post.mockResolvedValueOnce({ data: mockRes });

      const file = new File(['dummy'], 'char.png', { type: 'image/png' });
      const result = await bibleService.uploadReferenceImage(seriesId, file);

      expect(post).toHaveBeenCalledWith(`/series/${seriesId}/bible/assets`, expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual(mockRes);
    });
  });

  describe('getPanelBible', () => {
    it('gọi GET /panels/{panelId}/bible và trả về danh sách nhân vật canon', async () => {
      const mockEntries = [{ id: 'entry-hero', name: 'Hero', category: 'Character' }] as any[];
      get.mockResolvedValueOnce({ data: mockEntries });

      const result = await bibleService.getPanelBible('panel-456');

      expect(get).toHaveBeenCalledWith('/panels/panel-456/bible');
      expect(result).toEqual(mockEntries);
    });
  });

  describe('confirmRevision (V2.6 Q20 - Editor xác nhận & khoá Canon)', () => {
    it('gọi POST /series/{seriesId}/bible/entries/{entryId}/revisions/{revisionId}/confirm và trả về revision đã khoá', async () => {
      const mockLockedRev = {
        id: revisionId,
        bibleEntryId: entryId,
        versionNumber: 2,
        summary: 'Canon Lock revision',
        snapshotJson: '{}',
        contentHash: 'hash-abc',
        variantLabel: 'Mặc định',
        isInitialVersion: false,
        createdAt: '2026-10-06T10:00:00Z',
        isLocked: true,
        lockedAt: '2026-10-06T10:05:00Z',
        lockedById: 'user-producer-1',
      };
      post.mockResolvedValueOnce({ data: mockLockedRev });

      const result = await bibleService.confirmRevision(seriesId, entryId, revisionId);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/confirm`,
        {},
      );
      expect(result.isLocked).toBe(true);
      expect(result.lockedAt).toBe('2026-10-06T10:05:00Z');
      expect(result.lockedById).toBe('user-producer-1');
    });

    it('bắt và ném lỗi có message khi API khoá thất bại (409 CONFLICT hoặc 400 Bad Request)', async () => {
      post.mockRejectedValueOnce({
        response: {
          status: 409,
          data: { message: 'Phiên bản này đã được khoá trước đó.' },
        },
      });

      await expect(bibleService.confirmRevision(seriesId, entryId, revisionId)).rejects.toThrow(
        'Phiên bản này đã được khoá trước đó.',
      );
    });
  });

  describe('addRevision', () => {
    it('gọi POST /series/{seriesId}/bible/entries/{entryId}/revisions với đúng payload', async () => {
      const payload = {
        summary: 'Bản nâng cấp Arc 2',
        name: 'Kenji Neo',
        description: 'Chi tiết nhân vật Kenji bản Arc 2',
        variantLabel: 'Arc 2',
        expectedVersionNumber: 1,
      };
      const mockCreated = {
        id: 'new-rev-1',
        bibleEntryId: entryId,
        versionNumber: 2,
        ...payload,
        isLocked: false,
        lockedAt: null,
      };
      post.mockResolvedValueOnce({ data: mockCreated });

      const result = await bibleService.addRevision(seriesId, entryId, payload);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/entries/${entryId}/revisions`,
        payload,
      );
      expect(result).toEqual(mockCreated);
    });
  });

  describe('supersedeRevision (V1.2 - Producer thay thế bản đã khoá, không mở khoá)', () => {
    it('gọi POST .../revisions/{revisionId}/supersede với lý do và nội dung mới', async () => {
      const payload = {
        reason: 'Sai màu tóc trong bản khoá',
        name: 'Kenji',
        description: 'Tóc đen, không phải nâu',
        expectedVersionNumber: 2,
      };
      post.mockResolvedValueOnce({ data: { id: 'rev-3', versionNumber: 3, isLocked: true } });

      const result = await bibleService.supersedeRevision(seriesId, entryId, revisionId, payload);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/supersede`,
        payload,
      );
      expect(result.isLocked).toBe(true);
    });

    it('ném lỗi có message khi thiếu lý do (400)', async () => {
      post.mockRejectedValueOnce({
        response: { status: 400, data: { error: 'Phải nhập lý do thay thế bản đã khoá.' } },
      });

      await expect(
        bibleService.supersedeRevision(seriesId, entryId, revisionId, {
          reason: ' ',
          name: 'Kenji',
          description: 'x',
        }),
      ).rejects.toThrow('Phải nhập lý do thay thế bản đã khoá.');
    });
  });

  describe('getEntryHistory', () => {
    it('gọi GET /series/{seriesId}/bible/entries/{entryId}/history và trả về danh sách revisions kèm trạng thái khoá', async () => {
      const mockHistory = [
        {
          id: 'rev-1',
          bibleEntryId: entryId,
          versionNumber: 1,
          summary: 'Khởi tạo',
          isLocked: true,
          lockedAt: '2026-10-06T09:00:00Z',
        },
        {
          id: 'rev-2',
          bibleEntryId: entryId,
          versionNumber: 2,
          summary: 'Bản sửa đổi',
          isLocked: false,
          lockedAt: null,
        },
      ];
      get.mockResolvedValueOnce({ data: mockHistory });

      const result = await bibleService.getEntryHistory(seriesId, entryId);

      expect(get).toHaveBeenCalledWith(`/series/${seriesId}/bible/entries/${entryId}/history`);
      expect(result).toEqual(mockHistory);
      expect(result[0].isLocked).toBe(true);
      expect(result[1].isLocked).toBe(false);
    });
  });
  describe('submitConceptArt (Series Bible: tách phiên bản khỏi trạng thái duyệt)', () => {
    it('gọi POST /series/{seriesId}/bible/entries/{entryId}/concept và trả về revision kèm conceptImageUrl và events', async () => {
      const payload = {
        referenceImageUrl: 'https://example.com/concept-v1.png',
        summary: 'Nộp bản vẽ turnaround',
      };
      const mockResult = {
        id: 'rev-1',
        bibleEntryId: entryId,
        versionNumber: 1,
        reviewStatus: 'ConceptSubmitted',
        conceptImageUrl: 'https://example.com/concept-v1.png',
        events: [
          {
            id: 'evt-1',
            type: 'Created',
            actorId: null,
            comment: null,
            imageUrl: null,
            eventHash: 'hash-create',
            createdAt: '2026-11-02T10:00:00Z',
          },
          {
            id: 'evt-2',
            type: 'ConceptSubmitted',
            actorId: 'artist-id',
            comment: 'Nộp bản vẽ turnaround',
            imageUrl: 'https://example.com/concept-v1.png',
            eventHash: 'hash-submit',
            createdAt: '2026-11-02T10:30:00Z',
          },
        ],
      };
      post.mockResolvedValueOnce({ data: mockResult });

      const result = await bibleService.submitConceptArt(seriesId, entryId, payload);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/entries/${entryId}/concept`,
        payload,
      );
      expect(result.reviewStatus).toBe('ConceptSubmitted');
      expect(result.conceptImageUrl).toBe('https://example.com/concept-v1.png');
      expect(result.events).toHaveLength(2);
      expect(result.events![1].type).toBe('ConceptSubmitted');
    });

    it('bắt và ném lỗi 409 khi nộp Concept vào phiên bản đã khoá Canon', async () => {
      post.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            code: 'CONFLICT',
            message:
              'Phiên bản hiện tại đã khoá Canon. Cần Producer sử dụng thao tác Thay thế (Supersede) để cập nhật.',
          },
        },
      });

      await expect(
        bibleService.submitConceptArt(seriesId, entryId, {
          referenceImageUrl: 'https://example.com/art.png',
        }),
      ).rejects.toThrow(
        'Phiên bản hiện tại đã khoá Canon. Cần Producer sử dụng thao tác Thay thế (Supersede) để cập nhật.',
      );
    });
  });

  describe('defineBibleEntry (POST /series/{seriesId}/bible/entries/{entryId}/define)', () => {
    it('gọi POST .../define với payload chuẩn và trả về BibleEntryDto đã bỏ cờ stub', async () => {
      const payload = {
        name: 'Hắc Y Nhân',
        description: 'Sát thủ mặc áo choàng đen',
        subtitle: 'Sát thủ bí ẩn',
      };
      const mockPromoted = {
        id: entryId,
        seriesBibleId: 'bible-1',
        category: 'Character',
        code: 'CHR_HACYNHAN',
        name: 'Hắc Y Nhân',
        subtitle: 'Sát thủ bí ẩn',
        description: 'Sát thủ mặc áo choàng đen',
        detailsJson: '{}',
        priority: 'Standard',
        strictCheck: true,
        isActive: true,
        isStub: false,
        createdAt: '2026-11-19T00:00:00Z',
      };
      post.mockResolvedValueOnce({ data: mockPromoted });

      const result = await bibleService.defineBibleEntry(seriesId, entryId, payload);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/entries/${entryId}/define`,
        payload,
      );
      expect(result.isStub).toBe(false);
      expect(result.code).toBe('CHR_HACYNHAN');
    });

    it('giữ nguyên lỗi 409 CONFLICT khi mục đã được định nghĩa trước đó', async () => {
      post.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            code: 'CONFLICT',
            error: 'Mục này đã được định nghĩa trước đó, không phải mục nháp (IsStub = false).',
          },
        },
      });

      await expect(
        bibleService.defineBibleEntry(seriesId, entryId, {
          name: 'Hắc Y Nhân',
          description: 'Mô tả mới',
        }),
      ).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
        message: 'Mục này đã được định nghĩa trước đó, không phải mục nháp (IsStub = false).',
      });
    });
  });

  describe('workflow safeguards (endorse, variants, cancel-replacement, aliases)', () => {
    it('gọi POST .../endorse với cờ endorse cho Writer soft endorsement', async () => {
      post.mockResolvedValueOnce({
        data: {
          id: revisionId,
          reviewStatus: 'ConceptSubmitted',
          writerEndorsement: { endorsed: true, conceptVersion: 1 },
        },
      });

      const res = await bibleService.endorseRevision(seriesId, revisionId, true);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/revisions/${revisionId}/endorse`,
        { endorse: true },
      );
      expect(res.writerEndorsement?.endorsed).toBe(true);
    });

    it('gọi POST .../variants khi tạo biến thể song song (tách khỏi /supersede)', async () => {
      const payload = {
        name: 'Tần Mục',
        description: 'Trang phục chiến đấu',
        summary: 'Thêm biến thể mới',
        variantLabel: 'Trang phục chiến đấu',
      };
      post.mockResolvedValueOnce({ data: { id: 'rev-var', variantLabel: 'Trang phục chiến đấu' } });

      const res = await bibleService.createVariant(seriesId, entryId, payload);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/entries/${entryId}/variants`,
        payload,
      );
      expect(res.variantLabel).toBe('Trang phục chiến đấu');
    });

    it('gọi DELETE .../cancel-replacement khi Writer huỷ bản nháp thay thế', async () => {
      del.mockResolvedValueOnce({});

      await bibleService.cancelReplacement(seriesId, revisionId);

      expect(del).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/revisions/${revisionId}/cancel-replacement`,
      );
    });

    it('gọi PUT .../aliases để cập nhật biệt danh nhân vật', async () => {
      put.mockResolvedValueOnce({ data: { id: entryId, aliases: ['Mục Nhi', 'Tiểu Tần'] } });

      const res = await bibleService.updateEntryAliases(seriesId, entryId, ['Mục Nhi', 'Tiểu Tần']);

      expect(put).toHaveBeenCalledWith(`/series/${seriesId}/bible/entries/${entryId}/aliases`, {
        aliases: ['Mục Nhi', 'Tiểu Tần'],
      });
      expect(res.aliases).toEqual(['Mục Nhi', 'Tiểu Tần']);
    });
  });
});
