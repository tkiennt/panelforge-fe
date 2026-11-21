import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKeepOutZones } from './useKeepOutZones';
import { pageService, type PageDto } from '@/services/page.service';
import type { PanelDto } from '@/types/pipeline';

vi.mock('@/services/page.service', async (orig) => {
  const actual = await orig<typeof import('@/services/page.service')>();
  return {
    ...actual,
    pageService: {
      ...actual.pageService,
      getKeepOutZones: vi.fn(),
      replaceKeepOutZones: vi.fn(),
    },
  };
});

const PAGE_ID = '813ad7b2-3570-4def-8321-c6603a11c450';
const PANEL_ID = '11111111-2222-3333-4444-555555555555';

const samplePage: PageDto = {
  id: PAGE_ID,
  chapterId: 'cccccccc-3333-3333-3333-333333333333',
  pageNumber: 1,
  layoutFormat: 'StandardPage',
  widthPx: 1200,
  heightPx: 1800,
  dpi: 600,
  elementsCount: 0,
};

const samplePanels: PanelDto[] = [
  {
    id: PANEL_ID,
    pageId: PAGE_ID,
    panelNumber: 1,
    readingOrder: 1,
    boundingBox: JSON.stringify({ x: 0, y: 0, width: 600, height: 900, unit: 'px' }),
  } as PanelDto,
];

const toast = {
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};

describe('useKeepOutZones (GET/PUT /api/pages/{pageId}/keep-out-zones)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('nạp vùng cấm từ GET API (không đọc/ghi localStorage) và quy đổi 0..1 sang px', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    vi.mocked(pageService.getKeepOutZones).mockResolvedValueOnce({
      pageId: PAGE_ID,
      version: 2,
      updatedAt: '2026-11-21T14:00:00Z',
      zones: [{ x: 0.1, y: 0.2, width: 0.25, height: 0.1, label: 'Mặt Minh', panelId: PANEL_ID }],
    });

    const { result } = renderHook(() => useKeepOutZones(samplePage, samplePanels, toast));

    await waitFor(() => expect(result.current.zones).toHaveLength(1));
    expect(pageService.getKeepOutZones).toHaveBeenCalledWith(PAGE_ID);
    expect(result.current.version).toBe(2);
    expect(result.current.zones[0]).toMatchObject({
      x: 120,
      y: 360,
      width: 300,
      height: 180,
      label: 'Mặt Minh',
      panelId: PANEL_ID,
    });
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('thêm và xoá vùng cấm gửi PUT với toạ độ 0..1, panelId hợp lệ và expectedVersion tăng dần', async () => {
    vi.mocked(pageService.getKeepOutZones).mockResolvedValueOnce({
      pageId: PAGE_ID,
      version: 0,
      zones: [],
    });
    vi.mocked(pageService.replaceKeepOutZones)
      .mockResolvedValueOnce({
        pageId: PAGE_ID,
        version: 1,
        zones: [
          { x: 0.1, y: 0.1, width: 0.2, height: 0.1, label: 'Vùng cấm 1', panelId: PANEL_ID },
        ],
      })
      .mockResolvedValueOnce({
        pageId: PAGE_ID,
        version: 2,
        zones: [],
      });

    const { result } = renderHook(() => useKeepOutZones(samplePage, samplePanels, toast));
    await waitFor(() => expect(pageService.getKeepOutZones).toHaveBeenCalled());

    await act(async () => {
      await result.current.addZone({ x: 120, y: 180, width: 240, height: 180 });
    });

    expect(pageService.replaceKeepOutZones).toHaveBeenNthCalledWith(1, PAGE_ID, {
      expectedVersion: 0,
      zones: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.1, label: 'Vùng cấm 1', panelId: PANEL_ID }],
    });
    expect(result.current.version).toBe(1);
    expect(result.current.zones).toHaveLength(1);

    const addedId = result.current.zones[0].id;
    await act(async () => {
      await result.current.deleteZone(addedId);
    });

    expect(pageService.replaceKeepOutZones).toHaveBeenNthCalledWith(2, PAGE_ID, {
      expectedVersion: 1,
      zones: [],
    });
    expect(result.current.version).toBe(2);
    expect(result.current.zones).toHaveLength(0);
  });

  it('xử lý 409 CONFLICT: hoàn tác state, báo tải lại và cho phép reload lấy version mới', async () => {
    vi.mocked(pageService.getKeepOutZones)
      .mockResolvedValueOnce({
        pageId: PAGE_ID,
        version: 2,
        zones: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.1, label: 'Cũ', panelId: null }],
      })
      .mockResolvedValueOnce({
        pageId: PAGE_ID,
        version: 5,
        zones: [
          { x: 0.5, y: 0.5, width: 0.2, height: 0.2, label: 'Mới từ đồng đội', panelId: null },
        ],
      });

    const conflictErr: any = new Error(
      'Vùng cấm chữ đã được người khác cập nhật. Tải lại rồi thử lại.',
    );
    conflictErr.status = 409;
    conflictErr.code = 'CONFLICT';
    vi.mocked(pageService.replaceKeepOutZones).mockRejectedValueOnce(conflictErr);

    const { result } = renderHook(() => useKeepOutZones(samplePage, samplePanels, toast));
    await waitFor(() => expect(result.current.version).toBe(2));

    await act(async () => {
      await result.current.addZone({ x: 300, y: 300, width: 120, height: 180 }, 'Vùng mới');
    });

    // Hoàn tác về 1 vùng cũ, hiển thị conflictMessage và toast nhắc tải lại
    expect(result.current.zones).toHaveLength(1);
    expect(result.current.zones[0].label).toBe('Cũ');
    expect(result.current.conflictMessage).toContain('Tải lại');
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('tải lại'),
      expect.stringContaining('Tải lại'),
    );

    // Reload lấy lại version 5 mới nhất và xoá cảnh báo xung đột
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.version).toBe(5);
    expect(result.current.zones[0].label).toBe('Mới từ đồng đội');
    expect(result.current.conflictMessage).toBeNull();
  });

  it('xử lý 409 CHAPTER_READ_ONLY và 400 BadRequest: hoàn tác và hiện nguyên văn lỗi BE', async () => {
    vi.mocked(pageService.getKeepOutZones).mockResolvedValueOnce({
      pageId: PAGE_ID,
      version: 1,
      zones: [],
    });

    const readOnlyErr: any = new Error('Chương đã duyệt, không thể chỉnh sửa.');
    readOnlyErr.status = 409;
    readOnlyErr.code = 'CHAPTER_READ_ONLY';

    const badReqErr: any = new Error('Có panelId không thuộc trang này.');
    badReqErr.status = 400;

    vi.mocked(pageService.replaceKeepOutZones)
      .mockRejectedValueOnce(readOnlyErr)
      .mockRejectedValueOnce(badReqErr);

    const { result } = renderHook(() => useKeepOutZones(samplePage, samplePanels, toast));
    await waitFor(() => expect(result.current.version).toBe(1));

    await act(async () => {
      await result.current.addZone({ x: 100, y: 100, width: 100, height: 100 });
    });
    expect(result.current.zones).toHaveLength(0);
    expect(result.current.conflictMessage).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'Chương đang ở chế độ chỉ đọc',
      'Chương đã duyệt, không thể chỉnh sửa.',
    );

    await act(async () => {
      await result.current.addZone({ x: 100, y: 100, width: 100, height: 100 });
    });
    expect(result.current.zones).toHaveLength(0);
    expect(toast.error).toHaveBeenCalledWith(
      'Không lưu được vùng cấm',
      'Có panelId không thuộc trang này.',
    );
  });
});
