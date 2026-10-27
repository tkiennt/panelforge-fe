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
  evaluateTextConstraints,
  splitTextIntoTwoBalloons,
  rectsOverlap,
  findKeepOutCollision,
  suggestBalloonPosition,
  calculatePanelTextDensity,
  sortBalloonsReadingOrder,
  checkReadingOrderMismatch,
  hasTimeMarker,
  createSpeechBalloonPath,
  createThoughtBalloonPath,
  createThoughtTailDots,
  createShoutBalloonPath,
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

describe('lettererView – Giới hạn chữ & tách bóng (P2)', () => {
  it('đếm đúng số từ và phát hiện câu quá dài (>30 từ)', () => {
    const shortText = 'Đây là câu ngắn.';
    const evalShort = evaluateTextConstraints(shortText, 280, 160);
    expect(evalShort.wordCount).toBe(4);
    expect(evalShort.isTooLong).toBe(false);

    const longWords = Array(35).fill('từ').join(' ');
    const evalLong = evaluateTextConstraints(longWords, 280, 300);
    expect(evalLong.wordCount).toBe(35);
    expect(evalLong.isTooLong).toBe(true);
    expect(evalLong.reason).toContain('Quá dài (>30 từ)');
  });

  it('phát hiện chữ tràn khung khi chiều cao chữ vượt quá khung', () => {
    const text = 'Một câu thoại rất dài bị ép vào một khung bóng quá bé sẽ bị tràn khung.';
    // Hộp rất thấp (50px) chắc chắn bị tràn
    const evalOverflow = evaluateTextConstraints(text, 200, 50);
    expect(evalOverflow.isOverflowing).toBe(true);
    expect(evalOverflow.reason).toBeDefined();
  });

  it('tách bóng đôi thông minh tại dấu câu hoặc từ gần giữa', () => {
    const sentence = 'Tôi đã cố gắng rất nhiều! Nhưng mọi thứ vẫn không như mong đợi.';
    const split = splitTextIntoTwoBalloons(sentence);
    expect(split.part1).toBe('Tôi đã cố gắng rất nhiều!');
    expect(split.part2).toBe('Nhưng mọi thứ vẫn không như mong đợi.');

    const noPunct = 'Một hai ba bốn năm sáu bảy tám chín mười';
    const splitWords = splitTextIntoTwoBalloons(noPunct);
    expect(splitWords.part1.length).toBeGreaterThan(0);
    expect(splitWords.part2.length).toBeGreaterThan(0);
  });
});

describe('lettererView – Vùng cấm chữ & Gợi ý vị trí (P3)', () => {
  it('phát hiện va chạm giữa bóng thoại và vùng cấm (rectsOverlap, findKeepOutCollision)', () => {
    const keepOut = [
      {
        id: 'face-minh',
        panelId: 'p1',
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        label: 'Mặt Minh',
      },
    ];
    // Bóng đè lên vùng cấm
    const collidingBalloon = { x: 150, y: 120, width: 200, height: 100 };
    expect(findKeepOutCollision(collidingBalloon, keepOut)).toEqual(keepOut[0]);

    // Bóng ở vị trí khác an toàn
    const safeBalloon = { x: 300, y: 300, width: 200, height: 100 };
    expect(findKeepOutCollision(safeBalloon, keepOut)).toBeNull();
  });

  it('gợi ý vị trí không chạm vùng cấm và ưu tiên góc trên-phải trong manga RTL', () => {
    const panel = { x: 0, y: 0, width: 800, height: 600 };
    const keepOut = [
      { id: 'face-hoa', panelId: 'p1', x: 500, y: 20, width: 250, height: 250, label: 'Mặt Hoà' },
    ];
    const balloonSize = { width: 200, height: 120 };

    const suggested = suggestBalloonPosition(balloonSize, panel, keepOut, true);
    // Gợi ý không được đè lên vùng cấm
    const suggestedRect = { ...suggested, ...balloonSize };
    expect(findKeepOutCollision(suggestedRect, keepOut)).toBeNull();
    // Nằm trong biên panel
    expect(suggested.x).toBeGreaterThanOrEqual(panel.x);
    expect(suggested.x + balloonSize.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(suggested.y).toBeGreaterThanOrEqual(panel.y);
  });
});

describe('lettererView – Mật độ chữ trên Panel (P2)', () => {
  it('tính tỷ lệ mật độ diện tích và phân loại mức độ xanh / vàng / đỏ', () => {
    const panel = { x: 0, y: 0, width: 1000, height: 1000 }; // Diện tích = 1,000,000 px

    // 1 bóng nhỏ (200x200 = 40,000 px = 4%) -> Thoáng (xanh)
    const lowDensity = calculatePanelTextDensity(panel, [
      { x: 100, y: 100, width: 200, height: 200 },
    ]);
    expect(lowDensity.level).toBe('low');
    expect(lowDensity.color).toBe('#10B981');

    // Các bóng chiếm ~20% -> Vừa phải (vàng)
    const medDensity = calculatePanelTextDensity(panel, [
      { x: 100, y: 100, width: 400, height: 250 }, // 100,000
      { x: 100, y: 400, width: 400, height: 250 }, // 100,000 => tổng 20%
    ]);
    expect(medDensity.level).toBe('medium');
    expect(medDensity.color).toBe('#F59E0B');

    // Các bóng chiếm >25% -> Quá dày (đỏ)
    const highDensity = calculatePanelTextDensity(panel, [
      { x: 0, y: 0, width: 600, height: 600 }, // 360,000 = 36%
    ]);
    expect(highDensity.level).toBe('high');
    expect(highDensity.color).toBe('#EF4444');
  });
});

describe('lettererView – Thứ tự đọc manga RTL & Cảnh báo lệch kịch bản (P5)', () => {
  it('sắp xếp bóng thoại phải→trái, trên→dưới', () => {
    const b1 = { id: 'top-right', x: 600, y: 100, width: 150, height: 80 }; // Đọc 1
    const b2 = { id: 'top-left', x: 100, y: 110, width: 150, height: 80 }; // Đọc 2 (cùng dải ngang)
    const b3 = { id: 'bottom', x: 400, y: 500, width: 150, height: 80 }; // Đọc 3

    const orderRTL = sortBalloonsReadingOrder([b2, b3, b1], true);
    expect(orderRTL).toEqual(['top-right', 'top-left', 'bottom']);

    const orderLTR = sortBalloonsReadingOrder([b1, b3, b2], false);
    expect(orderLTR).toEqual(['top-left', 'top-right', 'bottom']);
  });

  it('phát hiện vị trí bóng ngược với thứ tự dòng trong kịch bản', () => {
    const balloons = [
      { id: 'b-later-script', x: 700, y: 100, width: 150, height: 80, scriptLineOrder: 5 }, // Ở vị trí đọc trước nhưng dòng kịch bản #5
      { id: 'b-first-script', x: 200, y: 100, width: 150, height: 80, scriptLineOrder: 1 }, // Ở vị trí đọc sau nhưng dòng kịch bản #1
    ];

    const mismatches = checkReadingOrderMismatch(balloons, true);
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches[0].elementId).toBe('b-later-script');
    expect(mismatches[0].message).toContain('dòng #5 đứng trước dòng #1');
  });
});

describe('lettererView – Hồi tưởng & SVG Paths (P1, P4)', () => {
  it('nhận diện mốc thời gian trong lời thoại hồi tưởng (hasTimeMarker)', () => {
    expect(hasTimeMarker('Ba năm trước, chúng tôi từng hứa...')).toBe(true);
    expect(hasTimeMarker('[Mùa hè năm 2018] Trời mưa tầm tã.')).toBe(true);
    expect(hasTimeMarker('Hồi đó tôi còn chưa biết vẽ manga.')).toBe(true);
    expect(hasTimeMarker('Hôm nay trời đẹp quá.')).toBe(false);
  });
});
