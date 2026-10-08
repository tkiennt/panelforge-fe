import { describe, it, expect } from 'vitest';
import { parseBoundingBox, buildBoundingBoxJson } from './panelBoundingBox';

describe('panelBoundingBox utility', () => {
  it('phân giải toạ độ chuẩn hoá 0–1 khi có coordinateSpace: "page-normalized"', () => {
    const json = JSON.stringify({
      x: 0.1,
      y: 0.2,
      w: 0.8,
      h: 0.35,
      coordinateSpace: 'page-normalized',
    });
    const parsed = parseBoundingBox(json, 1200, 1800);

    expect(parsed.percentX).toBeCloseTo(10);
    expect(parsed.percentY).toBeCloseTo(20);
    expect(parsed.percentW).toBeCloseTo(80);
    expect(parsed.percentH).toBeCloseTo(35);
    expect(parsed.pixelX).toBe(120);
    expect(parsed.pixelY).toBe(360);
    expect(parsed.pixelW).toBe(960);
    expect(parsed.pixelH).toBe(630);
  });

  it('phân giải toạ độ chuẩn hoá 0–1 khi mọi giá trị <= 1 dù không có coordinateSpace', () => {
    const json = JSON.stringify({
      x: 0.05,
      y: 0.1,
      w: 0.9,
      h: 0.4,
    });
    const parsed = parseBoundingBox(json, 1200, 1800);

    expect(parsed.percentX).toBeCloseTo(5);
    expect(parsed.percentY).toBeCloseTo(10);
    expect(parsed.percentW).toBeCloseTo(90);
    expect(parsed.percentH).toBeCloseTo(40);
    expect(parsed.pixelX).toBe(60);
    expect(parsed.pixelY).toBe(180);
    expect(parsed.pixelW).toBe(1080);
    expect(parsed.pixelH).toBe(720);
  });

  it('phân giải toạ độ pixel thực tế (unit: "px" hoặc width > 100)', () => {
    const json = JSON.stringify({
      x: 120,
      y: 180,
      width: 960,
      height: 630,
      unit: 'px',
    });
    const parsed = parseBoundingBox(json, 1200, 1800);

    expect(parsed.pixelX).toBe(120);
    expect(parsed.pixelY).toBe(180);
    expect(parsed.pixelW).toBe(960);
    expect(parsed.pixelH).toBe(630);
    expect(parsed.percentX).toBeCloseTo(10);
    expect(parsed.percentY).toBeCloseTo(10);
    expect(parsed.percentW).toBeCloseTo(80);
    expect(parsed.percentH).toBeCloseTo(35);
  });

  it('phân giải toạ độ phần trăm 0–100 kiểu cũ', () => {
    const json = JSON.stringify({
      x: 15,
      y: 25,
      w: 70,
      h: 50,
    });
    const parsed = parseBoundingBox(json, 1200, 1800);

    expect(parsed.percentX).toBe(15);
    expect(parsed.percentY).toBe(25);
    expect(parsed.percentW).toBe(70);
    expect(parsed.percentH).toBe(50);
    expect(parsed.pixelX).toBe(180);
    expect(parsed.pixelY).toBe(450);
    expect(parsed.pixelW).toBe(840);
    expect(parsed.pixelH).toBe(900);
  });

  it('xây dựng JSON bounding box với đầy đủ cả pixel và normalized', () => {
    const built = buildBoundingBoxJson(10, 20, 80, 35, 1200, 1800);
    const parsed = JSON.parse(built);

    expect(parsed.unit).toBe('px');
    expect(parsed.width).toBe(960);
    expect(parsed.height).toBe(630);
    expect(parsed.normalized.x).toBe(0.1);
    expect(parsed.normalized.w).toBe(0.8);
  });
});
