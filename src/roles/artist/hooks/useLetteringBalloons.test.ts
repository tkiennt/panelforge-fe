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
});
