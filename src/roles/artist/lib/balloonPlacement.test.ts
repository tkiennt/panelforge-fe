import { describe, expect, it } from 'vitest';
import { findFreeBalloonSlot } from './balloonPlacement';

const area = { minX: 0, minY: 0, maxX: 1200, maxY: 1800 };

describe('findFreeBalloonSlot', () => {
  it('đặt bóng đầu tiên ở tâm vùng', () => {
    expect(findFreeBalloonSlot(area, 260, 160, [])).toEqual({ x: 470, y: 820 });
  });

  it('bóng tạo liên tiếp không đè lên nhau', () => {
    const placed: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const p = findFreeBalloonSlot(area, 260, 160, placed);
      placed.push({ ...p, width: 260, height: 160 });
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const overlap =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it('vùng đã kín chỗ thì xếp bậc thang thay vì trùng hẳn vị trí tâm', () => {
    const small = { minX: 0, minY: 0, maxX: 300, maxY: 200 };
    const first = findFreeBalloonSlot(small, 260, 160, []);
    const second = findFreeBalloonSlot(small, 260, 160, [{ ...first, width: 260, height: 160 }]);
    expect(second).not.toEqual(first);
  });
});
