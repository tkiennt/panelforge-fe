import { describe, it, expect } from 'vitest';
import {
  alignRects,
  buildGrid,
  clampRect,
  commonGap,
  detectLayoutIssues,
  distributeRects,
  moveRect,
  resizeRect,
  rowsForPreset,
  snapRect,
  splitEvenly,
  straightenRects,
} from './panelLayout';

describe('panelLayout', () => {
  it('chia 5 khung dạng lưới 2/3 đều nhau và không chồng', () => {
    const rects = splitEvenly('grid', 5, 3, 2);
    expect(rowsForPreset('grid', 5)).toEqual([2, 3]);
    expect(rects).toHaveLength(5);
    expect(detectLayoutIssues(rects).filter((i) => i.message.includes('chồng'))).toHaveLength(0);
    // Hàng 1 hai ô bằng nhau, hàng 2 ba ô bằng nhau
    expect(rects[0].w).toBeCloseTo(rects[1].w, 1);
    expect(rects[2].w).toBeCloseTo(rects[3].w, 1);
    expect(rects[3].w).toBeCloseTo(rects[4].w, 1);
    // Lề trái/phải đối xứng
    expect(rects[2].x).toBeCloseTo(100 - (rects[4].x + rects[4].w), 0);
  });

  it('chia 5 khung xếp dọc: cao bằng nhau, khoảng cách đều', () => {
    const rects = splitEvenly('vertical', 5, 3, 2);
    const heights = new Set(rects.map((r) => r.h));
    expect(heights.size).toBe(1);
    expect(commonGap(rects, 'y')).toBeCloseTo(2, 1);
  });

  it('buildGrid trả mảng rỗng khi không có hàng hợp lệ', () => {
    expect(buildGrid([])).toEqual([]);
    expect(buildGrid([0, 0])).toEqual([]);
  });

  it('moveRect và clampRect giữ khung trong trang', () => {
    const moved = moveRect({ x: 90, y: 90, w: 10, h: 10 }, 20, 20);
    expect(moved).toEqual({ x: 90, y: 90, w: 10, h: 10 });
    expect(clampRect({ x: -5, y: -5, w: 200, h: 1 })).toEqual({ x: 0, y: 0, w: 100, h: 5 });
  });

  it('resizeRect: kéo cạnh phải giữ nguyên cạnh trái, tôn trọng kích thước tối thiểu', () => {
    const start = { x: 10, y: 10, w: 30, h: 20 };
    expect(resizeRect(start, 'e', 10, 0)).toEqual({ x: 10, y: 10, w: 40, h: 20 });
    const tiny = resizeRect(start, 'e', -100, 0);
    expect(tiny.x).toBe(10);
    expect(tiny.w).toBe(5);
    const nw = resizeRect(start, 'nw', 5, 5);
    expect(nw).toEqual({ x: 15, y: 15, w: 25, h: 15 });
  });

  it('snapRect hít vào lề trang', () => {
    const { rect, guides } = snapRect({ x: 3.8, y: 20, w: 30, h: 20 }, 'move', []);
    expect(rect.x).toBeCloseTo(3, 5);
    expect(guides.some((g) => g.axis === 'x' && g.pos === 3)).toBe(true);
  });

  it('snapRect hít cạnh trên vào khoảng cách đều với khung kề', () => {
    const others = [
      { x: 3, y: 3, w: 94, h: 20 },
      { x: 3, y: 25, w: 94, h: 20 },
    ];
    // Khoảng cách chung = 2; khung mới nên đặt y = 45 + 2 = 47
    const { rect } = snapRect({ x: 3, y: 47.7, w: 94, h: 20 }, 'move', others);
    expect(rect.y).toBeCloseTo(47, 5);
  });

  it('snapRect khi đổi kích thước chỉ hít cạnh đang kéo', () => {
    const others = [{ x: 3, y: 3, w: 40, h: 20 }];
    const { rect } = snapRect({ x: 50, y: 3, w: 30.5, h: 20 }, 'e', others, { margin: 3 });
    // Cạnh phải 80.5 không có mục tiêu gần (97, 50, 43...) → giữ nguyên, cạnh trái không đổi
    expect(rect.x).toBe(50);
  });

  it('snapRect không hít khi ngoài ngưỡng', () => {
    const { rect, guides } = snapRect({ x: 20, y: 20, w: 20, h: 10 }, 'move', []);
    expect(rect).toEqual({ x: 20, y: 20, w: 20, h: 10 });
    expect(guides).toHaveLength(0);
  });

  it('alignRects căn trái và căn giữa theo nhóm', () => {
    const rects = [
      { x: 10, y: 5, w: 20, h: 10 },
      { x: 14, y: 20, w: 30, h: 10 },
    ];
    expect(alignRects(rects, 'left').map((r) => r.x)).toEqual([10, 10]);
    const centered = alignRects(rects, 'centerX');
    expect(centered[0].x + centered[0].w / 2).toBeCloseTo(centered[1].x + centered[1].w / 2, 1);
  });

  it('distributeRects phân bố đều theo chiều dọc, giữ khung đầu và cuối', () => {
    const rects = [
      { x: 3, y: 3, w: 94, h: 20 },
      { x: 3, y: 30, w: 94, h: 20 },
      { x: 3, y: 77, w: 94, h: 20 },
    ];
    const out = distributeRects(rects, 'y');
    expect(out[0].y).toBe(3);
    expect(out[2].y).toBe(77);
    expect(out[1].y - (out[0].y + out[0].h)).toBeCloseTo(out[2].y - (out[1].y + out[1].h), 1);
  });

  it('distributeRects không làm gì khi ít hơn 3 khung', () => {
    const rects = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 0, w: 10, h: 10 },
    ];
    expect(distributeRects(rects, 'x')).toEqual(rects);
  });

  it('detectLayoutIssues phát hiện lệch nhẹ, gap không đều và chồng lấn', () => {
    const uneven = [
      { x: 3, y: 3, w: 94, h: 20 },
      { x: 3.8, y: 25, w: 94, h: 20 },
      { x: 3, y: 50, w: 94, h: 20 },
    ];
    const msgs = detectLayoutIssues(uneven).map((i) => i.message);
    expect(msgs.some((m) => m.includes('lệch nhẹ'))).toBe(true);
    expect(msgs.some((m) => m.includes('không đều'))).toBe(true);

    const overlapping = [
      { x: 3, y: 3, w: 50, h: 30 },
      { x: 20, y: 10, w: 50, h: 30 },
    ];
    expect(detectLayoutIssues(overlapping).some((i) => i.message.includes('chồng'))).toBe(true);
  });

  it('bố cục đều hoàn hảo không có cảnh báo', () => {
    expect(detectLayoutIssues(splitEvenly('vertical', 5))).toEqual([]);
  });

  it('straightenRects gom cạnh lệch nhẹ về một đường và hết cảnh báo lệch', () => {
    const rects = [
      { x: 3, y: 3, w: 94, h: 20 },
      { x: 3.8, y: 25, w: 93.4, h: 20 },
      { x: 3.2, y: 47, w: 94, h: 20 },
    ];
    const out = straightenRects(rects);
    expect(new Set(out.map((r) => r.x)).size).toBe(1);
    expect(detectLayoutIssues(out).some((i) => i.message.includes('lệch nhẹ'))).toBe(false);
  });
});
