import { describe, it, expect } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  estimateBoxHeight,
  estimateTextLines,
  fitView,
  keepCenter,
  pageToScreen,
  screenToPage,
  wheelZoomFactor,
  zoomAt,
  zoomAtCenter,
  type ViewState,
} from './lettererView';

const PAGE = { width: 1200, height: 1800 };

describe('lettererView – chuyển toạ độ và zoom/pan', () => {
  it('screenToPage và pageToScreen là phép nghịch đảo ở mọi mức zoom/pan', () => {
    const views: ViewState[] = [
      { scale: 0.37, tx: 120, ty: 24 },
      { scale: 1, tx: -300, ty: -80 },
      { scale: 2.5, tx: -1500, ty: -2200 },
    ];
    for (const view of views) {
      const page = { x: 640, y: 910 };
      const back = screenToPage(pageToScreen(page, view), view);
      expect(back.x).toBeCloseTo(page.x, 6);
      expect(back.y).toBeCloseTo(page.y, 6);
    }
  });

  it('screenToPage không bao giờ trả NaN (viewport rỗng trong môi trường test)', () => {
    expect(screenToPage({ x: 0, y: 0 }, { scale: 0, tx: 0, ty: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('zoomAt giữ nguyên điểm dưới con trỏ (toạ độ trang không đổi)', () => {
    const view: ViewState = { scale: 0.4, tx: 80, ty: 30 };
    const anchor = { x: 300, y: 220 };
    const before = screenToPage(anchor, view);
    for (const next of [0.1, 0.4, 1, 2.2, 4]) {
      const z = zoomAt(view, next, anchor);
      const after = screenToPage(anchor, z);
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y, 6);
    }
  });

  it('thả cùng một điểm trang ở các mức zoom khác nhau cho cùng toạ độ trang', () => {
    const target = { x: 777, y: 1234 };
    for (const scale of [0.25, 0.5, 1, 1.75, 3]) {
      const view: ViewState = { scale, tx: -50 * scale, ty: 20 };
      const cursor = pageToScreen(target, view);
      const page = screenToPage(cursor, view);
      expect(Math.round(page.x)).toBe(target.x);
      expect(Math.round(page.y)).toBe(target.y);
    }
  });

  it('giới hạn zoom 10%–400%', () => {
    expect(clampZoom(0.001)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(zoomAt({ scale: 1, tx: 0, ty: 0 }, 50, { x: 10, y: 10 }).scale).toBe(MAX_ZOOM);
  });

  it('wheel: cuộn lên phóng to, cuộn xuống thu nhỏ, pinch trackpad (ctrl) nhạy hơn mỗi đơn vị delta', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(-5, 0, true)).toBeGreaterThan(wheelZoomFactor(-5, 0, false));
  });

  it('fitView: vừa trang thấy trọn trang và căn giữa; vừa chiều ngang kín bề ngang', () => {
    const viewport = { width: 1000, height: 600 };
    const fit = fitView(viewport, PAGE, 'page', 20);
    expect(PAGE.height * fit.scale).toBeLessThanOrEqual(viewport.height - 40 + 1e-6);
    expect(fit.tx).toBeCloseTo((viewport.width - PAGE.width * fit.scale) / 2, 6);
    expect(fit.ty).toBeCloseTo((viewport.height - PAGE.height * fit.scale) / 2, 6);

    const wide = fitView(viewport, PAGE, 'width', 20);
    expect(PAGE.width * wide.scale).toBeCloseTo(viewport.width - 40, 6);
    expect(wide.ty).toBe(20);
  });

  it('zoomAtCenter đưa về đúng mức zoom và giữ tâm viewport', () => {
    const viewport = { width: 800, height: 500 };
    const view = fitView(viewport, PAGE, 'page');
    const centerPage = screenToPage({ x: 400, y: 250 }, view);
    const z = zoomAtCenter(view, 1, viewport);
    expect(z.scale).toBe(1);
    const after = screenToPage({ x: 400, y: 250 }, z);
    expect(after.x).toBeCloseTo(centerPage.x, 6);
    expect(after.y).toBeCloseTo(centerPage.y, 6);
  });

  it('keepCenter: đổi cỡ viewport (thu/mở sidebar) không làm lệch điểm ở giữa', () => {
    const from = { width: 900, height: 600 };
    const to = { width: 1200, height: 640 };
    const view: ViewState = { scale: 0.6, tx: 100, ty: 40 };
    const centerBefore = screenToPage({ x: from.width / 2, y: from.height / 2 }, view);
    const moved = keepCenter(view, from, to);
    const centerAfter = screenToPage({ x: to.width / 2, y: to.height / 2 }, moved);
    expect(centerAfter.x).toBeCloseTo(centerBefore.x, 6);
    expect(centerAfter.y).toBeCloseTo(centerBefore.y, 6);
    expect(moved.scale).toBe(view.scale);
  });
});

describe('lettererView – ước lượng chữ khớp Backend (LetteringLimits)', () => {
  it('ngắt dòng theo bề rộng và tính từng đoạn xuống dòng riêng', () => {
    // 280px: (280 - 24) / (26 * 0.55) = 17 ký tự/dòng
    expect(estimateTextLines('a'.repeat(17), 280)).toBe(1);
    expect(estimateTextLines('a'.repeat(18), 280)).toBe(2);
    expect(estimateTextLines('abc\n\ndef', 280)).toBe(3);
    expect(estimateTextLines('', 280)).toBe(1);
  });

  it('estimateBoxHeight không nhỏ hơn chiều cao tối thiểu và đủ chứa chữ dài', () => {
    expect(estimateBoxHeight('Chào bạn!', 280, 160)).toBe(160);
    const long =
      'Giao diện bàn vẽ và các tab duyệt bài bên Frontend đã mượt mà 60 FPS rồi anh Tâm ơi!';
    const h = estimateBoxHeight(long, 280, 160);
    expect(h).toBeGreaterThan(160);
    expect(h % 10).toBe(0);
  });
});
