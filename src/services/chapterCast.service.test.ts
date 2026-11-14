import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '@/api/axiosClient';
import { chapterCastService } from './chapterCast.service';

vi.mock('@/api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('chapterCastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi getChapterCast đúng endpoint', async () => {
    const mockCast = {
      chapterId: 'chap-123',
      entries: [],
      submitGate: { isPassed: true, blockers: [] },
      gate: { isPassed: true, blockers: [] },
    };
    vi.mocked(axiosClient.get).mockResolvedValue({ data: mockCast });

    const result = await chapterCastService.getChapterCast('chap-123');
    expect(axiosClient.get).toHaveBeenCalledWith('/chapters/chap-123/cast');
    expect(result).toEqual(mockCast);
  });

  it('gọi setChapterCastRevision đúng endpoint và payload', async () => {
    const mockResult = {
      chapterId: 'chap-123',
      bibleEntryId: 'ent-1',
      chosenRevisionId: 'rev-2',
      isOverridden: true,
      submitGate: { isPassed: true, blockers: [] },
      gate: { isPassed: true, blockers: [] },
    };
    vi.mocked(axiosClient.post).mockResolvedValue({ data: mockResult });

    const result = await chapterCastService.setChapterCastRevision('chap-123', 'ent-1', 'rev-2');
    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-123/cast/ent-1/revision', {
      revisionId: 'rev-2',
    });
    expect(result).toEqual(mockResult);
  });

  it('gọi setBibleEntryCrowd đúng endpoint và payload', async () => {
    vi.mocked(axiosClient.post).mockResolvedValue({ data: undefined });

    await chapterCastService.setBibleEntryCrowd('ser-1', 'ent-1', true);
    expect(axiosClient.post).toHaveBeenCalledWith('/series/ser-1/bible/entries/ent-1/crowd', {
      isCrowd: true,
    });
  });

  it('gọi defineBibleEntry đúng endpoint và payload', async () => {
    const mockEntry = { id: 'ent-new', name: 'Nhân vật phụ', category: 0 };
    vi.mocked(axiosClient.post).mockResolvedValue({ data: mockEntry });

    const req = {
      name: 'Nhân vật phụ',
      description: 'Mô tả nhân vật phụ',
      subtitle: 'Áo xanh',
    };
    const result = await chapterCastService.defineBibleEntry('ser-1', 'ent-stub', req);
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/series/ser-1/bible/entries/ent-stub/define',
      req,
    );
    expect(result).toEqual(mockEntry);
  });

  it('gọi cancelReplacementRevision đúng endpoint', async () => {
    vi.mocked(axiosClient.post).mockResolvedValue({ data: undefined });

    await chapterCastService.cancelReplacementRevision('ser-1', 'ent-1', 'rev-rep-1');
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/series/ser-1/bible/entries/ent-1/revisions/rev-rep-1/cancel-replacement',
    );
  });
});
