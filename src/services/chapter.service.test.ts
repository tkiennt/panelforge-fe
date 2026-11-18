// src/services/chapter.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { chapterService } from './chapter.service';
import type { ChapterScriptBody } from '@/roles/writer/components/script/flow/scriptFlowAdapter';

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('chapterService - saveChapterScript & submitChapterScript (SCR-14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const dummyBody: ChapterScriptBody = {
    expectedRevisionId: 'rev-1',
    pages: [
      {
        id: 'p-1',
        number: 1,
        panels: [
          {
            id: 'pan-1',
            number: 1,
            direction: 'Toàn cảnh',
            castRevisions: null,
            lines: [],
          },
        ],
      },
    ],
  };

  describe('saveChapterScript', () => {
    it('gọi PUT /chapters/{id}/script với body và message', async () => {
      const mockResult = {
        revisionId: 'rev-2',
        versionNumber: 2,
        created: true,
        warnings: ['Trang 2 đã có artwork nên được giữ lại dù không còn trong kịch bản.'],
      };
      vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: mockResult });

      const res = await chapterService.saveChapterScript('chap-1', dummyBody, 'Lưu kịch bản');
      expect(axiosClient.put).toHaveBeenCalledWith('/chapters/chap-1/script', dummyBody, {
        params: { message: 'Lưu kịch bản' },
      });
      expect(res).toEqual(mockResult);
    });

    it('bắt lỗi 409 CONFLICT và gán status 409, code CONFLICT', async () => {
      const axiosErr = {
        response: {
          status: 409,
          data: {
            message: 'Kịch bản đã có phiên bản khác do người khác lưu trước đó.',
            code: 'CONFLICT',
          },
        },
      };
      vi.mocked(axiosClient.put).mockRejectedValueOnce(axiosErr);

      await expect(chapterService.saveChapterScript('chap-1', dummyBody)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });
    });
  });

  describe('submitChapterScript', () => {
    it('gọi POST /chapters/{id}/script/submit với body và message', async () => {
      const mockResult = {
        revisionId: 'rev-3',
        versionNumber: 3,
        created: true,
        warnings: [],
        chapter: { id: 'chap-1', scriptStatus: 'InReview' },
      };
      vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockResult });

      const res = await chapterService.submitChapterScript('chap-1', dummyBody, 'Gửi duyệt');
      expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/script/submit', dummyBody, {
        params: { message: 'Gửi duyệt' },
      });
      expect(res).toEqual(mockResult);
    });

    it('bắt lỗi 409 CONFLICT và gán status 409, code CONFLICT', async () => {
      const axiosErr = {
        response: {
          status: 409,
          data: {
            message: 'Kịch bản đã bị sửa bởi người khác, vui lòng tải lại.',
          },
        },
      };
      vi.mocked(axiosClient.post).mockRejectedValueOnce(axiosErr);

      await expect(chapterService.submitChapterScript('chap-1', dummyBody)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });
    });
  });

  describe('startProduction (Gate 1)', () => {
    it('gọi POST /chapters/{id}/start-production với payload giao trang', async () => {
      const payload = {
        pageAssignments: [{ artistId: 'artist-1', pageFrom: 1, pageTo: 5 }],
        lettererAssignments: [{ artistId: 'letterer-1', pageFrom: 1, pageTo: 5 }],
      };
      const mockResult = {
        chapter: { id: 'chap-1', status: 'InProduction' } as any,
        assignments: [],
        lots: [{ id: 'lot-1', chapterId: 'chap-1', taskIds: ['task-1'] } as any],
      };
      vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockResult });

      const res = await chapterService.startProduction('chap-1', payload);
      expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/start-production', payload);
      expect(res).toEqual(mockResult);
    });

    it('bắt lỗi 409 CONFLICT kèm message và danh sách blockers', async () => {
      const axiosErr = {
        response: {
          status: 409,
          data: {
            error: 'Không thể bắt đầu sản xuất do Series Bible chưa sẵn sàng.',
            code: 'CONFLICT',
            blockers: [
              {
                bibleEntryId: 'entry-1',
                entryName: 'Nhân vật A',
                revisionId: null,
                reason: 'Canon chưa khóa',
              },
            ],
          },
        },
      };
      vi.mocked(axiosClient.post).mockRejectedValueOnce(axiosErr);

      await expect(
        chapterService.startProduction('chap-1', {
          pageAssignments: [{ artistId: 'artist-1', pageFrom: 1, pageTo: 5 }],
        }),
      ).rejects.toMatchObject({
        message: 'Không thể bắt đầu sản xuất do Series Bible chưa sẵn sàng.',
        status: 409,
        code: 'CONFLICT',
        blockers: expect.arrayContaining([
          expect.objectContaining({ entryName: 'Nhân vật A', reason: 'Canon chưa khóa' }),
        ]),
      });
    });
  });
});
