import { describe, it, expect } from 'vitest';
import { nudgeDelta, snapBox } from './lettererView';

const box = { x: 103, y: 50, width: 100, height: 40 };

describe('snapBox', () => {
  it('hút cạnh trái vào đường dọc trong ngưỡng', () => {
    const r = snapBox(box, { xs: [100], ys: [] }, 8);
    expect(r.x).toBe(100);
    expect(r.guideX).toBe(100);
    expect(r.y).toBe(50);
    expect(r.guideY).toBeNull();
  });

  it('không hút khi ngoài ngưỡng', () => {
    const r = snapBox(box, { xs: [80], ys: [10] }, 8);
    expect(r).toEqual({ x: 103, y: 50, guideX: null, guideY: null });
  });

  it('hút tâm và cạnh dưới theo từng trục độc lập', () => {
    const r = snapBox(box, { xs: [150], ys: [95] }, 8);
    expect(r.x).toBe(100); // tâm 153 -> 150
    expect(r.y).toBe(55); // đáy 90 -> 95
    expect(r.guideX).toBe(150);
    expect(r.guideY).toBe(95);
  });
});

describe('nudgeDelta', () => {
  it('trả bước 1px, Shift 10px', () => {
    expect(nudgeDelta('ArrowLeft', false)).toEqual({ x: -1, y: 0 });
    expect(nudgeDelta('ArrowDown', true)).toEqual({ x: 0, y: 10 });
    expect(nudgeDelta('a', false)).toBeNull();
  });
});
