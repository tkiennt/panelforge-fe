import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLetteringBalloons } from './useLetteringBalloons';
import { elementService, type ElementSnapshotDto } from '@/services/element.service';
import type { PageDto } from '@/services/page.service';

vi.mock('@/services/element.service', async (orig) => {
  const actual = await orig<typeof import('@/services/element.service')>();
  return {
    ...actual,
    elementService: {
      getPageSnapshot: vi.fn(),
      addElement: vi.fn().mockResolvedValue({}),
      updateElementText: vi.fn(),
      moveElement: vi.fn(),
      updateElementStyle: vi.fn(),
    },
  };
});

const page = (id: string, n: number) =>
  ({ id, chapterId: 'c', pageNumber: n, widthPx: 1200, heightPx: 1800 }) as PageDto;

const linkedOnPage2: ElementSnapshotDto = {
  elementId: 'el-p2',
  elementType: 'SPEECH_BALLOON',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  zIndex: 1,
  content: 'Đi thôi!',
  scriptLineId: 'l-1',
  isRemoved: false,
};

const toast = { success: vi.fn(), info: vi.fn() };
const line = {
  id: 'l-1',
  pageNumber: 2,
  panelNumber: 1,
  characterName: 'Kaito',
  dialogueText: 'Đi thôi!',
};

describe('useLetteringBalloons – đặt bóng từ script (BR-05)', () => {
  beforeEach(() => {
    vi.mocked(elementService.getPageSnapshot).mockImplementation(
      async (id: string) => ({ elements: id === 'p2' ? [linkedOnPage2] : [] }) as never,
    );
    vi.mocked(elementService.addElement).mockClear();
    toast.info.mockClear();
  });

  it('chặn đặt trùng dòng đã có bóng ở trang khác', async () => {
    const { result } = renderHook(() => useLetteringBalloons(page('p1', 1), [], 1, toast));
    await act(async () => {
      await result.current.prefetchPages(['p1', 'p2']);
    });
    await waitFor(() => expect(result.current.linkedByScriptLine.has('l-1')).toBe(true));

    await act(async () => {
      await result.current.addElement('SPEECH_BALLOON', line);
    });

    expect(elementService.addElement).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(
      'Dòng thoại đã có bóng',
      expect.stringContaining('trang khác'),
    );
  });

  it('thả lên trang: tạo bóng gắn scriptLineId, tâm bóng tại điểm thả', async () => {
    const { result } = renderHook(() => useLetteringBalloons(page('p1', 1), [], 1, toast));
    await waitFor(() => expect(elementService.getPageSnapshot).toHaveBeenCalled());

    await act(async () => {
      await result.current.addElement(
        'SPEECH_BALLOON',
        { ...line, id: 'l-new' },
        { at: { x: 600, y: 900 } },
      );
    });

    const req = vi.mocked(elementService.addElement).mock.calls[0][1];
    expect(req.scriptLineId).toBe('l-new');
    expect(req.x + req.width / 2).toBeCloseTo(600, 0);
    expect(req.y + req.height / 2).toBeCloseTo(900, 0);
  });

  it('bóng chờ server lưu được đánh dấu pending, lưu xong thì bỏ đánh dấu', async () => {
    let resolveAdd: (v: unknown) => void = () => {};
    vi.mocked(elementService.addElement).mockImplementationOnce(
      () => new Promise((r) => (resolveAdd = r)) as never,
    );
    const { result } = renderHook(() => useLetteringBalloons(page('p1', 1), [], 1, toast));
    await waitFor(() => expect(elementService.getPageSnapshot).toHaveBeenCalled());

    let pendingAdd: Promise<void> = Promise.resolve();
    act(() => {
      pendingAdd = result.current.addElement('SPEECH_BALLOON', { ...line, id: 'l-slow' });
    });
    const tempId = result.current.pageElements.find((e) => e.scriptLineId === 'l-slow')!.elementId;
    expect(result.current.pendingElementIds.has(tempId)).toBe(true);

    await act(async () => {
      resolveAdd({});
      await pendingAdd;
    });
    expect(result.current.pendingElementIds.size).toBe(0);
  });

  it('bóng tạo liên tiếp từ script không chồng cùng một vị trí', async () => {
    const { result } = renderHook(() => useLetteringBalloons(page('p1', 1), [], 1, toast));
    await waitFor(() => expect(elementService.getPageSnapshot).toHaveBeenCalled());

    await act(async () => {
      await result.current.addElement('SPEECH_BALLOON', { ...line, id: 'l-a' });
    });
    await act(async () => {
      await result.current.addElement('SPEECH_BALLOON', { ...line, id: 'l-b' });
    });

    const [a, b] = vi.mocked(elementService.addElement).mock.calls.map((c) => c[1]);
    expect({ x: a.x, y: a.y }).not.toEqual({ x: b.x, y: b.y });
  });
});

describe('useLetteringBalloons – nới bóng theo chữ', () => {
  const small: ElementSnapshotDto = {
    elementId: 'el-small',
    elementType: 'SPEECH_BALLOON',
    x: 500,
    y: 800,
    width: 160,
    height: 90,
    zIndex: 1,
    content: 'Hi',
    version: 3,
    isRemoved: false,
  };

  beforeEach(() => {
    vi.mocked(elementService.getPageSnapshot).mockResolvedValue({ elements: [small] } as never);
    vi.mocked(elementService.updateElementText).mockResolvedValue({ elementVersion: 4 } as never);
    vi.mocked(elementService.moveElement)
      .mockReset()
      .mockResolvedValue({ elementVersion: 5 } as never);
  });

  it('sửa chữ dài hơn bóng: nới bóng quanh tâm, gửi version mới nhất', async () => {
    const { result } = renderHook(() => useLetteringBalloons(page('p1', 1), [], 1, toast));
    await waitFor(() => expect(result.current.pageElements).toHaveLength(1));

    const long =
      'Tôi đã nói với cậu rồi, chúng ta không thể quay lại nơi đó thêm một lần nào nữa đâu!';
    await act(async () => {
      await result.current.updateElementText('el-small', long);
    });

    const req = vi.mocked(elementService.moveElement).mock.calls[0][2];
    expect(req.expectedElementVersion).toBe(4);
    expect(req.newWidth).toBeGreaterThan(160);
    expect(req.newX! + req.newWidth! / 2).toBeCloseTo(580, -1);
    expect(result.current.pageElements[0].version).toBe(5);
  });

  it('chữ vẫn vừa: không đổi kích thước bóng', async () => {
    const { result } = renderHook(() => useLetteringBalloons(page('p1', 1), [], 1, toast));
    await waitFor(() => expect(result.current.pageElements).toHaveLength(1));

    await act(async () => {
      await result.current.updateElementText('el-small', 'Ừ.');
    });

    expect(elementService.moveElement).not.toHaveBeenCalled();
  });

  it('nhấn Escape bỏ chọn bóng đang chọn (khi không gõ trong ô nhập)', async () => {
    const { result } = renderHook(() => useLetteringBalloons(page('p1', 1), [], 1, toast));
    await waitFor(() => expect(result.current.pageElements).toHaveLength(1));

    act(() => {
      result.current.setSelectedElementId('el-small');
    });
    expect(result.current.selectedElementId).toBe('el-small');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.selectedElementId).toBeNull();
  });
});
