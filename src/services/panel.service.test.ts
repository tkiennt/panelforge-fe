import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { panelService } from './panel.service';
import { PanelDto, PanelDetailDto } from '../types/pipeline';

vi.mock('../api/axiosClient');

describe('panelService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPanel: PanelDto = {
    id: 'panel-1',
    pageId: 'page-101',
    panelNumber: 1,
    boundingBox: '{"x": 10, "y": 10, "width": 80, "height": 40}',
    readingOrder: 1,
    currentStageId: null,
    createdAt: '2026-10-08T00:00:00Z',
    updatedAt: null,
    createdBy: 'user-1',
    sceneId: 'scene-99',
  };

  const mockPanelDetail: PanelDetailDto = {
    ...mockPanel,
    scriptLineIds: ['line-1', 'line-2'],
  };

  it('createPanel gọi đúng POST /api/pages/{pageId}/panels và trả về PanelDto', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockPanel });

    const result = await panelService.createPanel('page-101', {
      panelNumber: 1,
      readingOrder: 1,
      boundingBox: '{"x": 10, "y": 10, "width": 80, "height": 40}',
    });

    expect(axiosClient.post).toHaveBeenCalledWith('/pages/page-101/panels', {
      panelNumber: 1,
      readingOrder: 1,
      boundingBox: '{"x": 10, "y": 10, "width": 80, "height": 40}',
    });
    expect(result).toEqual(mockPanel);
  });

  it('getPanelsByPage gọi đúng GET /api/pages/{pageId}/panels và trả về danh sách PanelDto', async () => {
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: [mockPanel] });

    const result = await panelService.getPanelsByPage('page-101');

    expect(axiosClient.get).toHaveBeenCalledWith('/pages/page-101/panels');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('panel-1');
  });

  it('getPanelById gọi đúng GET /api/panels/{panelId} và trả về PanelDetailDto', async () => {
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockPanelDetail });

    const result = await panelService.getPanelById('panel-1');

    expect(axiosClient.get).toHaveBeenCalledWith('/panels/panel-1');
    expect(result.id).toBe('panel-1');
    expect(result.scriptLineIds).toEqual(['line-1', 'line-2']);
  });

  it('updatePanelCoordinates gọi đúng PUT /api/panels/{panelId}/coordinates', async () => {
    const updated = { ...mockPanel, readingOrder: 2 };
    vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: updated });

    const result = await panelService.updatePanelCoordinates('panel-1', {
      boundingBox: '{"x": 20, "y": 20, "width": 60, "height": 50}',
      readingOrder: 2,
    });

    expect(axiosClient.put).toHaveBeenCalledWith('/panels/panel-1/coordinates', {
      boundingBox: '{"x": 20, "y": 20, "width": 60, "height": 50}',
      readingOrder: 2,
    });
    expect(result.readingOrder).toBe(2);
  });

  it('assignPanelScene gọi đúng PUT /api/panels/{panelId}/scene', async () => {
    const assigned = { ...mockPanel, sceneId: 'scene-new' };
    vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: assigned });

    const result = await panelService.assignPanelScene('panel-1', 'scene-new');

    expect(axiosClient.put).toHaveBeenCalledWith('/panels/panel-1/scene', {
      sceneId: 'scene-new',
    });
    expect(result.sceneId).toBe('scene-new');
  });

  it('assignPanelScriptLines gọi đúng PUT /api/panels/{panelId}/script-lines', async () => {
    vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: ['line-a', 'line-b'] });

    const result = await panelService.assignPanelScriptLines('panel-1', ['line-a', 'line-b']);

    expect(axiosClient.put).toHaveBeenCalledWith('/panels/panel-1/script-lines', {
      scriptLineIds: ['line-a', 'line-b'],
    });
    expect(result).toEqual(['line-a', 'line-b']);
  });

  it('deletePanel gọi đúng DELETE /api/panels/{panelId}', async () => {
    vi.mocked(axiosClient.delete).mockResolvedValueOnce({
      data: { message: 'Panel panel-1 đã được xóa thành công.' },
    });

    const result = await panelService.deletePanel('panel-1');

    expect(axiosClient.delete).toHaveBeenCalledWith('/panels/panel-1');
    expect(result.message).toContain('Panel panel-1 đã được xóa');
  });

  it('checkImageConsistency gọi đúng POST /api/panels/{panelId}/check-image-consistency với params và trả về ImageConsistencyResultDto', async () => {
    const mockResult = {
      panelId: 'panel-1',
      characterId: 'char-10',
      characterSheetUrl: 'https://example.com/sheet.png',
      score: 0.88,
      threshold: 0.75,
      passed: true,
      summaryReason: 'Khuôn mặt và trang phục khớp.',
      deviations: [],
      checkedAt: '2026-10-14T20:00:00Z',
    };
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: mockResult });

    const result = await panelService.checkImageConsistency('panel-1', {
      revisionRef: 'rev-1',
      threshold: 0.8,
    });

    expect(axiosClient.post).toHaveBeenCalledWith('/panels/panel-1/check-image-consistency', null, {
      params: { revisionRef: 'rev-1', threshold: 0.8 },
    });
    expect(result).toEqual(mockResult);
    expect(result.passed).toBe(true);
  });

  it('ném lỗi có cấu trúc khi API thất bại', async () => {
    vi.mocked(axiosClient.post).mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: 'Tọa độ không hợp lệ' },
      },
    });

    await expect(
      panelService.createPanel('page-101', {
        boundingBox: 'invalid',
      }),
    ).rejects.toThrow('Tọa độ không hợp lệ');
  });
});
