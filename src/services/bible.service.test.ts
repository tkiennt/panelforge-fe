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

  describe('getSeriesBibleAtChapter', () => {
    it('gọi GET /series/{seriesId}/bible/at-chapter/{chapterNumber}', async () => {
      const mockEntries = [{ id: 'entry-1', name: 'Hero', category: 0 }] as any[];
      get.mockResolvedValueOnce({ data: mockEntries });

      const result = await bibleService.getSeriesBibleAtChapter(seriesId, 5);

      expect(get).toHaveBeenCalledWith(`/series/${seriesId}/bible/at-chapter/5`);
      expect(result).toEqual({ entries: mockEntries });
    });
  });

  describe('lockRevision (Việc 5 - Producer khoá Character Sheet)', () => {
    it('gọi POST /series/{seriesId}/bible/entries/{entryId}/revisions/{revisionId}/lock và trả về revision đã khoá', async () => {
      const mockLockedRev = {
        id: revisionId,
        bibleEntryId: entryId,
        versionNumber: 2,
        summary: 'Canon Lock revision',
        snapshotJson: '{}',
        contentHash: 'hash-abc',
        effectiveFromChapterNumber: 3,
        isInitialVersion: false,
        createdAt: '2026-10-06T10:00:00Z',
        isLocked: true,
        lockedAt: '2026-10-06T10:05:00Z',
        lockedById: 'user-producer-1',
      };
      post.mockResolvedValueOnce({ data: mockLockedRev });

      const result = await bibleService.lockRevision(seriesId, entryId, revisionId);

      expect(post).toHaveBeenCalledWith(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/lock`,
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

      await expect(bibleService.lockRevision(seriesId, entryId, revisionId)).rejects.toThrow(
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
        effectiveFromChapterNumber: 10,
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
});
