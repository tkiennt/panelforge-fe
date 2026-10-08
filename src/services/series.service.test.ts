import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { seriesService } from './series.service';
import type { SeriesProgressDto } from './series.service';

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

describe('seriesService - Progress & Series APIs (UC-16)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getSeriesProgress', () => {
    it('gọi GET /series/{seriesId}/progress và trả về SeriesProgressDto chuẩn', async () => {
      const mockProgress: SeriesProgressDto = {
        seriesId: 'series-001',
        generatedAt: '2026-10-07T12:00:00Z',
        chapters: [
          {
            chapterId: 'chap-1',
            chapterNumber: 1,
            title: 'Khởi đầu',
            status: 'InProduction',
            targetReleaseDate: '2026-11-01',
            pageCount: 20,
            panelCount: 80,
            percentComplete: 62.5,
            stages: [
              {
                stageId: 'st-1',
                name: 'Thumbnail',
                stageOrder: 1,
                notStarted: 0,
                inProgress: 10,
                submitted: 5,
                inReview: 5,
                changesRequested: 0,
                approved: 60,
              },
            ],
            assignmentsByStatus: { InProgress: 2, Submitted: 1 },
            overdueAssignments: 1,
          },
        ],
        workload: [
          {
            userId: 'user-artist-1',
            fullName: 'Nguyen Van Artist',
            role: 'Artist',
            open: 3,
            overdue: 1,
            waitingReview: 1,
            done: 10,
          },
        ],
        overdue: [
          {
            assignmentId: 'asg-99',
            chapterId: 'chap-1',
            assigneeUserId: 'user-artist-1',
            assigneeName: 'Nguyen Van Artist',
            status: 'InProgress',
            dueDate: '2026-10-05T23:59:59Z',
            brief: 'Vẽ nét chi tiết trang 3',
          },
        ],
        burndown: [
          { date: '2026-10-01', remaining: 15 },
          { date: '2026-10-07', remaining: 4 },
        ],
      };

      get.mockResolvedValueOnce({ data: mockProgress });

      const res = await seriesService.getSeriesProgress('series-001');

      expect(get).toHaveBeenCalledWith('/series/series-001/progress');
      expect(res.seriesId).toBe('series-001');
      expect(res.chapters).toHaveLength(1);
      expect(res.chapters[0].percentComplete).toBe(62.5);
      expect(res.workload).toHaveLength(1);
      expect(res.overdue).toHaveLength(1);
      expect(res.burndown).toHaveLength(2);
    });

    it('bắt lỗi và ném thông báo tiếng Việt khi API progress thất bại (404/403/500)', async () => {
      get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'Series không tồn tại.' },
        },
      });

      await expect(seriesService.getSeriesProgress('series-999')).rejects.toThrow(
        'Series không tồn tại.',
      );
    });
  });

  describe('getSeriesById', () => {
    it('gọi GET /series/{id} và trả về thông tin chi tiết', async () => {
      const mockDetail = {
        id: 'series-001',
        workspaceId: 'ws-1',
        title: 'Cyber Ronin',
        readingDirection: 'RightToLeft',
        genre: 'Action',
        format: 'Manga',
        chaptersCount: 3,
        createdAt: '2026-09-01T00:00:00Z',
        chapters: [],
      };
      get.mockResolvedValueOnce({ data: mockDetail });

      const res = await seriesService.getSeriesById('series-001');
      expect(get).toHaveBeenCalledWith('/series/series-001');
      expect(res.title).toBe('Cyber Ronin');
    });
  });

  describe('updateStoryArc', () => {
    it('gọi PUT /series/{seriesId}/story-arc và trả về giá trị đã lưu', async () => {
      const put = vi.mocked(axiosClient.put);
      put.mockResolvedValueOnce({ data: { value: 'Story arc mới' } });

      const res = await seriesService.updateStoryArc('series-001', 'Story arc mới');
      expect(put).toHaveBeenCalledWith('/series/series-001/story-arc', {
        storyArc: 'Story arc mới',
      });
      expect(res.value).toBe('Story arc mới');
    });
  });
});
