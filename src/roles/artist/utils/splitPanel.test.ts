import { describe, it, expect, vi } from 'vitest';
import { splitPanelWithRollback } from './splitPanel';
import { splitPanelRect, buildGrid } from '@/shared/utils/panelLayout';

const panel = { id: 'p1', readingOrder: 2, boundingBox: '{"orig":true}' };

describe('splitPanelRect', () => {
  it('chia dọc: hai nửa bằng nhau, cách nhau khe 2%', () => {
    const r = splitPanelRect({ x: 5, y: 35.67, w: 90, h: 28.67 }, 'vertical');
    if ('error' in r) throw new Error(r.error);
    expect(r.first).toEqual({ x: 5, y: 35.67, w: 44, h: 28.67 });
    expect(r.second).toEqual({ x: 51, y: 35.67, w: 44, h: 28.67 });
  });

  it('chia ngang: hai nửa bằng nhau, cách nhau khe 2%', () => {
    const r = splitPanelRect({ x: 5, y: 5, w: 90, h: 30 }, 'horizontal');
    if ('error' in r) throw new Error(r.error);
    expect(r.first.h).toBe(14);
    expect(r.second.y).toBe(21);
  });

  it('khớp bố cục mẫu 5 khung (1 + 2 + 2) khi chia dọc hai khung dưới', () => {
    const three = buildGrid([1, 1, 1], 5, 2);
    const second = splitPanelRect(three[1], 'vertical');
    if ('error' in second) throw new Error(second.error);
    expect(second.first.x).toBe(5);
    expect(second.second.x).toBeCloseTo(51, 1);
    expect(second.first.w).toBe(44);
  });

  it('từ chối khi mỗi nửa nhỏ hơn ngưỡng tối thiểu', () => {
    expect('error' in splitPanelRect({ x: 0, y: 0, w: 17, h: 50 }, 'vertical')).toBe(true);
    expect('error' in splitPanelRect({ x: 0, y: 0, w: 50, h: 17 }, 'horizontal')).toBe(true);
    expect('error' in splitPanelRect({ x: 0, y: 0, w: 18, h: 50 }, 'vertical')).toBe(false);
  });
});

describe('splitPanelWithRollback', () => {
  const args = {
    panel,
    pageId: 'page-1',
    firstBox: '{"first":true}',
    secondBox: '{"second":true}',
    newPanelNumber: 4,
    newReadingOrder: 4,
  };

  it('PUT khung gốc rồi POST khung mới, không hoàn tác khi thành công', async () => {
    const updateCoordinates = vi.fn().mockResolvedValue({ id: 'p1' });
    const createPanel = vi.fn().mockResolvedValue({ id: 'p4' });
    const out = await splitPanelWithRollback({ updateCoordinates, createPanel }, args);
    expect(out.created.id).toBe('p4');
    expect(updateCoordinates).toHaveBeenCalledTimes(1);
    expect(updateCoordinates).toHaveBeenCalledWith('p1', {
      boundingBox: '{"first":true}',
      readingOrder: 2,
    });
    expect(createPanel).toHaveBeenCalledWith('page-1', {
      panelNumber: 4,
      readingOrder: 4,
      boundingBox: '{"second":true}',
    });
  });

  it('POST lỗi thì PUT trả khung gốc về kích thước cũ và ném lỗi của BE', async () => {
    const updateCoordinates = vi.fn().mockResolvedValue({ id: 'p1' });
    const boom = new Error('Chương không còn ở trạng thái sản xuất');
    const createPanel = vi.fn().mockRejectedValue(boom);
    await expect(splitPanelWithRollback({ updateCoordinates, createPanel }, args)).rejects.toBe(
      boom,
    );
    expect(updateCoordinates).toHaveBeenCalledTimes(2);
    expect(updateCoordinates).toHaveBeenLastCalledWith('p1', {
      boundingBox: '{"orig":true}',
      readingOrder: 2,
    });
  });

  it('PUT đầu lỗi thì không tạo khung mới', async () => {
    const updateCoordinates = vi.fn().mockRejectedValue(new Error('409'));
    const createPanel = vi.fn();
    await expect(splitPanelWithRollback({ updateCoordinates, createPanel }, args)).rejects.toThrow(
      '409',
    );
    expect(createPanel).not.toHaveBeenCalled();
  });
});
