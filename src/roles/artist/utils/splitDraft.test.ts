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

  it('nhận diện khung dẫn chuyện / caption chữ nhật qua isCaptionPolygon', () => {
    // 1. Hình chữ nhật 4 đỉnh bao phủ gần như toàn bộ bounding box [100, 100, 200, 80]
    const rectPoly: [number, number][] = [
      [100, 100],
      [300, 100],
      [300, 180],
      [100, 180],
    ];
    const draftWithRect = draftFromSplitResult({
      width: 1200,
      height: 1800,
      panels: [{ order: 1, bbox: [0, 0, 1200, 1800] }],
      bubbles: [{ panelOrder: 1, bbox: [100, 100, 200, 80], polygon: rectPoly }],
    });
    expect(draftWithRect.bubbles[0].isCaption).toBe(true);

    // 2. Hình elip / đa giác nhiều đỉnh diện tích < 80% bounding box -> không phải caption
    const ellipsePoly: [number, number][] = [
      [200, 100],
      [270, 115],
      [300, 140],
      [270, 165],
      [200, 180],
      [130, 165],
      [100, 140],
      [130, 115],
    ];
    const draftWithEllipse = draftFromSplitResult({
      width: 1200,
      height: 1800,
      panels: [{ order: 1, bbox: [0, 0, 1200, 1800] }],
      bubbles: [{ panelOrder: 1, bbox: [100, 100, 200, 80], polygon: ellipsePoly }],
    });
    expect(draftWithEllipse.bubbles[0].isCaption).toBe(false);
  });
});

describe('panel cắt chéo (polygon từ BE)', () => {
  it('khung chữ nhật không sinh corners', () => {
    const draft = draftFromSplitResult({
      width: 900,
      height: 600,
      panels: [
        { order: 1, bbox: [20, 20, 400, 300], polygon: [[20, 20], [419, 20], [419, 319], [20, 319]] },
      ],
      bubbles: [],
    });
    expect(draft.panels[0].corners).toBeUndefined();
  });

  it('khung hình thang giữ corners 0–1 trong hộp', () => {
    const draft = draftFromSplitResult({
      width: 900,
      height: 600,
      panels: [
        { order: 1, bbox: [20, 20, 480, 560], polygon: [[20, 20], [500, 20], [380, 580], [20, 580]] },
      ],
      bubbles: [],
    });
    expect(draft.panels[0].corners).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.75, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it('BE cũ không gửi polygon → khung chữ nhật', () => {
    const draft = draftFromSplitResult({
      width: 900,
      height: 600,
      panels: [{ order: 1, bbox: [0, 0, 100, 100] }],
      bubbles: [],
    });
    expect(draft.panels[0].corners).toBeUndefined();
  });
});
