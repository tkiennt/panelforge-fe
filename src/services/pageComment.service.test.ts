import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosClient from '../api/axiosClient';
import { pageCommentService } from './pageComment.service';

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('pageCommentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listBySeries calls GET /series/{seriesId}/page-comments with optional query params', async () => {
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: [] });

    await pageCommentService.listBySeries('series-1', {
      chapterId: 'chap-1',
      status: 'Open',
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/series/series-1/page-comments', {
      params: { chapterId: 'chap-1', status: 'Open' },
    });
  });

  it('create calls POST /chapters/{chapterId}/page-comments with full payload', async () => {
    const payload = {
      pageId: 'page-1',
      panelId: 'panel-1',
      assetReferenceId: 'asset-1',
      pinX: 0.42,
      pinY: 0.75,
      message: 'Fix line weight',
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({
      data: { id: 'c-1', ...payload, status: 'Open' },
    });

    const result = await pageCommentService.create('chap-1', payload);

    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/page-comments', payload);
    expect(result.id).toBe('c-1');
  });

  it('resolve calls POST /chapters/{chapterId}/page-comments/{commentId}/resolve', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { id: 'c-1', status: 'Resolved' } });

    await pageCommentService.resolve('chap-1', 'c-1', { note: 'Fixed' });

    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/page-comments/c-1/resolve', {
      note: 'Fixed',
    });
  });

  it('reopen calls POST /chapters/{chapterId}/page-comments/{commentId}/reopen', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { id: 'c-1', status: 'Open' } });

    await pageCommentService.reopen('chap-1', 'c-1');

    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/page-comments/c-1/reopen');
  });

  it('convertToRework calls POST /chapters/{chapterId}/page-comments/{commentId}/rework and preserves 409 error message', async () => {
    vi.mocked(axiosClient.post).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: 'Chương phải được mở lại trước.', code: 'CONFLICT' },
      },
    });

    await expect(
      pageCommentService.convertToRework('chap-1', 'c-1', {
        stageTaskId: 'task-1',
        reason: 'Redraw background',
      }),
    ).rejects.toThrow('Chương phải được mở lại trước.');

    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/page-comments/c-1/rework', {
      stageTaskId: 'task-1',
      reason: 'Redraw background',
    });
  });
});
