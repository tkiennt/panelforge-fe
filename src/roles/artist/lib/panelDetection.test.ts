import { describe, expect, it } from 'vitest';
import { detectPanelsFromLuminance } from './panelDetection';

type Rect = { x: number; y: number; w: number; h: number };

/** Trang giấy tổng hợp: nền `paper`, mỗi khung là viền dày `border` màu `ink` + một nét bên trong. */
function makePage(
  width: number,
  height: number,
  frames: Rect[],
  opts: { paper?: number; ink?: number; border?: number; extras?: Rect[] } = {},
) {
  const { paper = 245, ink = 40, border = 2, extras = [] } = opts;
  const lum = new Uint8Array(width * height).fill(paper);
  const fill = (r: Rect) => {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) lum[y * width + x] = ink;
  };
  for (const f of frames) {
    fill({ x: f.x, y: f.y, w: f.w, h: border });
    fill({ x: f.x, y: f.y + f.h - border, w: f.w, h: border });
    fill({ x: f.x, y: f.y, w: border, h: f.h });
    fill({ x: f.x + f.w - border, y: f.y, w: border, h: f.h });
    // Nét vẽ thưa bên trong: chừa nhiều hàng/cột trống để thử rãnh giả.
    fill({ x: f.x + Math.round(f.w / 3), y: f.y + Math.round(f.h / 3), w: 6, h: 6 });
  }
  extras.forEach(fill);
  return lum;
}

const W = 600;
const H = 850;

/** Khung chuẩn hoá → pixel, để so sánh gần đúng. */
const px = (b: { x: number; y: number; w: number; h: number }) => ({
  x: Math.round(b.x * W),
  y: Math.round(b.y * H),
  w: Math.round(b.w * W),
  h: Math.round(b.h * H),
});

describe('detectPanelsFromLuminance', () => {
  it('detects four tiers on a page with wide white margins', () => {
    const frames = [0, 1, 2, 3].map((i) => ({ x: 50, y: 60 + i * 185, w: 500, h: 170 }));
    const boxes = detectPanelsFromLuminance(makePage(W, H, frames), W, H);
    expect(boxes).toHaveLength(4);
    boxes.forEach((b, i) => {
      const p = px(b);
      expect(Math.abs(p.y - frames[i].y)).toBeLessThanOrEqual(2);
      expect(Math.abs(p.x - 50)).toBeLessThanOrEqual(2);
      expect(Math.abs(p.w - 500)).toBeLessThanOrEqual(3);
    });
  });

  it('splits three columns and off-centre columns, ordered right-to-left', () => {
    const frames = [
      // Tầng 1: 3 cột
      { x: 40, y: 40, w: 160, h: 300 },
      { x: 215, y: 40, w: 160, h: 300 },
      { x: 390, y: 40, w: 170, h: 300 },
      // Tầng 2: chia lệch 30/70
      { x: 40, y: 360, w: 150, h: 440 },
      { x: 205, y: 360, w: 355, h: 440 },
    ];
    const boxes = detectPanelsFromLuminance(makePage(W, H, frames), W, H).map(px);
    expect(boxes).toHaveLength(5);
    expect(boxes.map((b) => b.x)).toEqual([389, 214, 39, 204, 39]);
  });

  it('orders left-to-right when requested', () => {
    const frames = [
      { x: 40, y: 40, w: 250, h: 770 },
      { x: 310, y: 40, w: 250, h: 770 },
    ];
    const ltr = detectPanelsFromLuminance(makePage(W, H, frames), W, H, {
      readingDirection: 'ltr',
    }).map(px);
    expect(ltr.map((b) => b.x)).toEqual([39, 309]);
  });

  it('splits a page that only has a vertical gutter', () => {
    const frames = [
      { x: 40, y: 40, w: 250, h: 770 },
      { x: 310, y: 40, w: 250, h: 770 },
    ];
    expect(detectPanelsFromLuminance(makePage(W, H, frames), W, H)).toHaveLength(2);
  });

  it('handles light pencil on off-white paper', () => {
    const frames = [
      { x: 40, y: 40, w: 520, h: 370 },
      { x: 40, y: 440, w: 520, h: 370 },
    ];
    const lum = makePage(W, H, frames, { paper: 228, ink: 190 });
    expect(detectPanelsFromLuminance(lum, W, H)).toHaveLength(2);
  });

  it('does not split an empty-looking panel interior and ignores a page number and dust', () => {
    const frames = [
      { x: 40, y: 40, w: 520, h: 370 },
      { x: 40, y: 440, w: 520, h: 370 },
    ];
    const extras = [
      { x: 295, y: 830, w: 10, h: 8 }, // số trang ở lề dưới
      { x: 300, y: 425, w: 1, h: 1 }, // hạt bụi trong rãnh
    ];
    const boxes = detectPanelsFromLuminance(makePage(W, H, frames, { extras }), W, H).map(px);
    expect(boxes).toHaveLength(2);
    expect(boxes[1].y + boxes[1].h).toBeLessThanOrEqual(812);
  });

  it('straightens a page scanned 2° off before looking for gutters', () => {
    const frames = [
      { x: 40, y: 40, w: 255, h: 370 },
      { x: 310, y: 40, w: 255, h: 370 },
      { x: 40, y: 430, w: 255, h: 380 },
      { x: 310, y: 430, w: 255, h: 380 },
    ];
    const flat = makePage(W, H, frames);
    // Xoay 2°: độ chéo của rãnh (~18px trên 520px) lớn hơn bề rộng rãnh (15–20px).
    const a = (2 * Math.PI) / 180;
    const rotated = new Uint8Array(W * H).fill(245);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sx = Math.round(W / 2 + (x - W / 2) * Math.cos(a) + (y - H / 2) * Math.sin(a));
        const sy = Math.round(H / 2 - (x - W / 2) * Math.sin(a) + (y - H / 2) * Math.cos(a));
        if (sx >= 0 && sx < W && sy >= 0 && sy < H) rotated[y * W + x] = flat[sy * W + sx];
      }
    }
    const boxes = detectPanelsFromLuminance(rotated, W, H).map(px);
    expect(boxes).toHaveLength(4);
    // Thứ tự RTL: trên-phải, trên-trái, dưới-phải, dưới-trái.
    expect(boxes[0].x).toBeGreaterThan(boxes[1].x);
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
    expect(boxes[2].x).toBeGreaterThan(boxes[3].x);
  });

  it('returns nothing for a blank or dark image', () => {
    expect(detectPanelsFromLuminance(new Uint8Array(W * H).fill(250), W, H)).toEqual([]);
    expect(detectPanelsFromLuminance(new Uint8Array(W * H).fill(10), W, H)).toEqual([]);
  });
});
