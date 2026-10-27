import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPreviousStageArtworks, pickPanelArtwork } from './stageArtworks';

describe('pickPanelArtwork (Bàn vẽ chọn ảnh khung theo công đoạn)', () => {
  const stages = [
    { id: 'pencil', stageOrder: 3, isEnabled: true },
    { id: 'ink', stageOrder: 4, isEnabled: true },
    { id: 'color', stageOrder: 5, isEnabled: false },
  ];
  const art = (id: string, stage: string, v: number, panelId = 'k1') =>
    ({ id, pipelineStageId: stage, versionNumber: v, panelId }) as AssetReferenceDto;
  // Thứ tự API trả về lộn xộn: trước đây .pop() lấy nhầm Pencil
  const arts = [art('ink1', 'ink', 1), art('color1', 'color', 1), art('pencil1', 'pencil', 1)];

  it('mặc định lấy công đoạn ĐANG BẬT cao nhất có ảnh (Color tắt → Ink), không phụ thuộc thứ tự API', () => {
    expect(pickPanelArtwork(arts, 'k1', stages)?.id).toBe('ink1');
  });

  it('bật lại Color thì mặc định là Color', () => {
    const on = stages.map((s) => ({ ...s, isEnabled: true }));
    expect(pickPanelArtwork(arts, 'k1', on)?.id).toBe('color1');
  });

  it('chọn công đoạn cụ thể thì lấy bản mới nhất của công đoạn đó, kể cả công đoạn đã tắt', () => {
    const more = [...arts, art('pencil2', 'pencil', 2)];
    expect(pickPanelArtwork(more, 'k1', stages, 'pencil')?.id).toBe('pencil2');
    expect(pickPanelArtwork(more, 'k1', stages, 'color')?.id).toBe('color1');
    expect(pickPanelArtwork(more, 'k2', stages, 'pencil')).toBeNull();
  });

  it('chỉ có ảnh ở công đoạn đã tắt thì vẫn hiện ảnh đó', () => {
    expect(pickPanelArtwork([art('c', 'color', 1)], 'k1', stages)?.id).toBe('c');
  });
});
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { artworkService } from '@/services/artwork.service';
import type { AssetReferenceDto } from '@/types';

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getSeriesPipeline: vi.fn(),
  },
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    getArtworks: vi.fn(),
  },
}));

describe('loadPreviousStageArtworks', () => {
  const mockStages: PipelineStageDto[] = [
    {
      id: 'stg-script',
      name: 'Script',
      slug: 'script',
      stageOrder: 1,
      isInitial: true,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-thumb',
      name: 'Thumbnail',
      slug: 'thumbnail',
      stageOrder: 2,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-pencil',
      name: 'Pencil',
      slug: 'pencil',
      stageOrder: 3,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-ink',
      name: 'Ink',
      slug: 'ink',
      stageOrder: 4,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-color',
      name: 'Color',
      slug: 'color',
      stageOrder: 5,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: false,
    }, // disabled
    {
      id: 'stg-letter',
      name: 'Letter',
      slug: 'letter',
      stageOrder: 6,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-review',
      name: 'Review',
      slug: 'review',
      stageOrder: 7,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-appr',
      name: 'Approved',
      slug: 'approved',
      stageOrder: 8,
      isInitial: false,
      isTerminal: true,
      isApprovalGate: false,
      isEnabled: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lấy artwork của stage đứng trước gần nhất có ảnh khi truyền stageId', async () => {
    vi.mocked(artworkService.getArtworks).mockImplementation(async (_chap, _page, stageId) => {
      if (stageId === 'stg-ink') {
        return [{ id: 'art-ink-1', pipelineStageId: 'stg-ink' } as AssetReferenceDto];
      }
      return [];
    });

    const result = await loadPreviousStageArtworks('c1', 's1', 'p1', 'stg-letter', {
      stages: mockStages,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('art-ink-1');
    // Color bị disabled nên không được gọi
    expect(artworkService.getArtworks).not.toHaveBeenCalledWith('c1', 'p1', 'stg-color');
    // Ink được gọi và có ảnh
    expect(artworkService.getArtworks).toHaveBeenCalledWith('c1', 'p1', 'stg-ink');
  });

  it('tự nạp pipeline từ server nếu không truyền options.stages', async () => {
    vi.mocked(pipelineService.getSeriesPipeline).mockResolvedValue({
      id: 'pipe-1',
      seriesId: 's1',
      name: 'Default',
      stages: mockStages,
      transitions: [],
    });

    vi.mocked(artworkService.getArtworks).mockImplementation(async (_chap, _page, stageId) => {
      if (stageId === 'stg-pencil') {
        return [{ id: 'art-pencil-1', pipelineStageId: 'stg-pencil' } as AssetReferenceDto];
      }
      return [];
    });

    const result = await loadPreviousStageArtworks('c1', 's1', 'p1', 'stg-ink');

    expect(pipelineService.getSeriesPipeline).toHaveBeenCalledWith('s1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('art-pencil-1');
  });

  it('trả về rỗng nếu không có stage nào trước đó có artwork', async () => {
    vi.mocked(artworkService.getArtworks).mockResolvedValue([]);

    const result = await loadPreviousStageArtworks('c1', 's1', 'p1', 'stg-letter', {
      stages: mockStages,
    });

    expect(result).toEqual([]);
  });

  it('nếu không truyền stageId, tự động tìm stage trước stage terminal', async () => {
    vi.mocked(artworkService.getArtworks).mockImplementation(async (_chap, _page, stageId) => {
      if (stageId === 'stg-ink') {
        return [{ id: 'art-ink-2', pipelineStageId: 'stg-ink' } as AssetReferenceDto];
      }
      return [];
    });

    const result = await loadPreviousStageArtworks('c1', 's1', 'p1', undefined, {
      stages: mockStages,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('art-ink-2');
  });
});
