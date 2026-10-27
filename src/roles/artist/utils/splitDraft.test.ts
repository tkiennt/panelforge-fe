import { describe, expect, it } from 'vitest';
import {
  clampRegion,
  draftFromSplitResult,
  imageRectToPage,
  newRegion,
  panelAt,
} from './splitDraft';

const result = {
  width: 1200,
  height: 1800,
  panels: [
    { order: 2, bbox: [40, 660, 551, 561] as [number, number, number, number] },
    { order: 1, bbox: [40, 40, 1121, 601] as [number, number, number, number] },
  ],
  bubbles: [
    { panelOrder: 2, bbox: [179, 704, 323, 113] as [number, number, number, number], polygon: [] },
    { panelOrder: 9, bbox: [10, 10, 20, 20] as [number, number, number, number], polygon: [] },
  ],
};

describe('splitDraft', () => {
  it('sắp panel theo order và gắn bóng vào đúng panel', () => {
    const d = draftFromSplitResult(result);
    expect(d.panels.map((p) => p.y)).toEqual([40, 660]);
    expect(d.bubbles[0].panelId).toBe(d.panels[1].id);
    expect(d.bubbles[1].panelId).toBeNull();
  });

  it('không cho vùng vượt ảnh hoặc quá nhỏ', () => {
    const r = clampRegion({ id: 'a', kind: 'panel', x: -50, y: 1790, w: 2, h: 4000 }, 1200, 1800);
    expect(r).toMatchObject({ x: 0, y: 0, w: 8, h: 1800 });
    const r2 = clampRegion({ id: 'b', kind: 'panel', x: 1195, y: 10, w: 100, h: 100 }, 1200, 1800);
    expect(r2.x + r2.w).toBe(1200);
  });

  it('đổi toạ độ ảnh sang trang có tính viền trống object-fit: contain', () => {
    // Ảnh ngang 2000x1000 trong trang dọc 1000x1500: scale 0.5, lề trên 500
    expect(imageRectToPage({ x: 0, y: 0, w: 2000, h: 1000 }, 2000, 1000, 1000, 1500)).toEqual({
      x: 0,
      y: 500,
      w: 1000,
      h: 500,
    });
    // Cùng tỉ lệ: chỉ nhân hệ số
    expect(imageRectToPage({ x: 100, y: 200, w: 300, h: 400 }, 600, 900, 1200, 1800)).toEqual({
      x: 200,
      y: 400,
      w: 600,
      h: 800,
    });
  });

  it('vùng mới nằm trong ảnh; panelAt theo tâm vùng', () => {
    const n = newRegion('bubble', 1200, 1800);
    expect(n.x).toBeGreaterThanOrEqual(0);
    expect(n.x + n.w).toBeLessThanOrEqual(1200);
    const d = draftFromSplitResult(result);
    expect(panelAt(d.panels, d.bubbles[0])).toBe(d.panels[1].id);
  });
});
