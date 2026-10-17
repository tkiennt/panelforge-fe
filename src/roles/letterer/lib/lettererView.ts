// src/roles/letterer/lib/lettererView.ts
// Phép biến đổi zoom/pan và ước lượng hộp chữ của màn Letterer. Hàm thuần để kiểm thử được và để
// artwork + lớp lettering dùng CHUNG một hệ toạ độ trang (px trang gốc, vd 1200×1800).

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

/** Góc nhìn: toạ độ màn hình (so với góc trên-trái của viewport) = tx + x·scale, ty + y·scale. */
export interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type FitMode = 'page' | 'width';

export const clampZoom = (scale: number): number =>
  Number.isFinite(scale) ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale)) : 1;

/** Điểm theo màn hình (đã trừ gốc viewport) → toạ độ trang. Không bao giờ trả NaN. */
export function screenToPage(point: Point, view: ViewState): Point {
  const s = view.scale || 1;
  const x = (point.x - view.tx) / s;
  const y = (point.y - view.ty) / s;
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

export function pageToScreen(point: Point, view: ViewState): Point {
  return { x: view.tx + point.x * view.scale, y: view.ty + point.y * view.scale };
}

/** Đổi mức zoom nhưng giữ điểm `anchor` (toạ độ viewport) đứng yên trên tranh. */
export function zoomAt(view: ViewState, nextScale: number, anchor: Point): ViewState {
  const scale = clampZoom(nextScale);
  const ratio = scale / view.scale;
  return {
    scale,
    tx: anchor.x - (anchor.x - view.tx) * ratio,
    ty: anchor.y - (anchor.y - view.ty) * ratio,
  };
}

/** Hệ số nhân zoom từ một sự kiện wheel (chuột: bước đều; trackpad pinch gửi wheel + ctrlKey, delta nhỏ). */
export function wheelZoomFactor(deltaY: number, deltaMode = 0, ctrlKey = false): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  const sensitivity = ctrlKey ? 0.01 : 0.0015;
  const limited = Math.max(-120, Math.min(120, pixels));
  return Math.exp(-limited * sensitivity);
}

/** Vừa trang (thấy trọn trang) hoặc vừa chiều ngang (kín bề ngang, cuộn dọc bằng pan); căn giữa. */
export function fitView(viewport: Size, page: Size, mode: FitMode, padding = 24): ViewState {
  const availW = Math.max(1, viewport.width - padding * 2);
  const availH = Math.max(1, viewport.height - padding * 2);
  const scale = clampZoom(
    mode === 'width' ? availW / page.width : Math.min(availW / page.width, availH / page.height),
  );
  const tx = (viewport.width - page.width * scale) / 2;
  const ty = mode === 'width' ? padding : (viewport.height - page.height * scale) / 2;
  return { scale, tx, ty };
}

/** Zoom đúng `scale` quanh tâm viewport (nút +/−, 100%). */
export function zoomAtCenter(view: ViewState, scale: number, viewport: Size): ViewState {
  return zoomAt(view, scale, { x: viewport.width / 2, y: viewport.height / 2 });
}

/**
 * Viewport đổi kích thước (thu/mở sidebar, đổi cỡ cửa sổ): dời góc nhìn để điểm đang ở GIỮA viewport
 * vẫn nằm giữa, nên tranh không bị nhảy/lệch.
 */
export function keepCenter(view: ViewState, from: Size, to: Size): ViewState {
  return {
    ...view,
    tx: view.tx + (to.width - from.width) / 2,
    ty: view.ty + (to.height - from.height) / 2,
  };
}

// ── Chữ trong bóng: dùng cùng hằng số với Backend (LetteringLimits.cs) để cảnh báo khớp nhau ──
export const LETTERING_FONT_PX = 26;
export const LETTERING_CHAR_WIDTH_EM = 0.55;
export const LETTERING_LINE_HEIGHT_EM = 1.3;
export const LETTERING_PADDING_PX = 12;

/** Số dòng chữ ước lượng khi ngắt theo bề rộng hộp (mỗi đoạn xuống dòng tính riêng). */
export function estimateTextLines(text: string, boxWidth: number): number {
  const perLine = Math.max(
    1,
    Math.floor(
      (boxWidth - 2 * LETTERING_PADDING_PX) / (LETTERING_FONT_PX * LETTERING_CHAR_WIDTH_EM),
    ),
  );
  return (text || '')
    .split('\n')
    .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / perLine)), 0);
}

/** Ngắt dòng thật không cắt giữa từ nên tốn hơn ước lượng theo số ký tự: dự phòng thêm 15% số dòng. */
const WORD_WRAP_SLACK = 1.15;

/** Chiều cao hộp đủ chứa chữ (làm tròn lên 10px), không nhỏ hơn `minHeight`. */
export function estimateBoxHeight(text: string, boxWidth: number, minHeight: number): number {
  const lines = Math.ceil(estimateTextLines(text, boxWidth) * WORD_WRAP_SLACK);
  const needed = lines * LETTERING_FONT_PX * LETTERING_LINE_HEIGHT_EM + 2 * LETTERING_PADDING_PX;
  return Math.max(minHeight, Math.ceil(needed / 10) * 10);
}

// ── Căn chỉnh hút (snap) khi kéo bóng ──
export interface SnapTargets {
  /** Các đường dọc (toạ độ x, px trang) có thể hút vào. */
  xs: number[];
  /** Các đường ngang (toạ độ y, px trang). */
  ys: number[];
}

export interface SnapResult {
  x: number;
  y: number;
  /** Đường dóng đang hút (để vẽ), null nếu không hút theo trục đó. */
  guideX: number | null;
  guideY: number | null;
}

/** Ngưỡng hút tính theo px MÀN HÌNH (đổi sang px trang theo scale) để cảm giác giống nhau ở mọi mức zoom. */
export const SNAP_SCREEN_PX = 8;

function bestSnap(edges: number[], targets: number[], threshold: number) {
  let best: { delta: number; line: number } | null = null;
  for (const edge of edges) {
    for (const t of targets) {
      const d = t - edge;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) {
        best = { delta: d, line: t };
      }
    }
  }
  return best;
}

/**
 * Hút cạnh trái/giữa/phải (và trên/giữa/dưới) của hộp vào đường gần nhất trong ngưỡng.
 * Mỗi trục xử lý độc lập; không hút thì giữ nguyên toạ độ.
 */
export function snapBox(
  box: { x: number; y: number; width: number; height: number },
  targets: SnapTargets,
  threshold: number,
): SnapResult {
  const sx = bestSnap([box.x, box.x + box.width / 2, box.x + box.width], targets.xs, threshold);
  const sy = bestSnap([box.y, box.y + box.height / 2, box.y + box.height], targets.ys, threshold);
  return {
    x: sx ? box.x + sx.delta : box.x,
    y: sy ? box.y + sy.delta : box.y,
    guideX: sx ? sx.line : null,
    guideY: sy ? sy.line : null,
  };
}

/** Bước dời bằng phím mũi tên: 1px, giữ Shift = 10px. */
export function nudgeDelta(key: string, shift: boolean): Point | null {
  const step = shift ? 10 : 1;
  switch (key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 };
    case 'ArrowRight':
      return { x: step, y: 0 };
    case 'ArrowUp':
      return { x: 0, y: -step };
    case 'ArrowDown':
      return { x: 0, y: step };
    default:
      return null;
  }
}

// ── P1–P5: Tiện ích Manga Lettering (Bóng thoại, Vùng cấm, Thứ tự đọc, Hồi tưởng) ──

export const MIN_LETTERING_FONT_PX = 14;
export const MAX_WORDS_PER_BALLOON = 30;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KeepOutZone {
  id: string;
  panelId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface TailPoint {
  x: number;
  y: number;
}

/** Đếm số từ tiếng Việt / tiếng Anh. */
export function countWords(text: string): number {
  const trimmed = (text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export interface TextConstraintsResult {
  wordCount: number;
  isTooLong: boolean;
  isOverflowing: boolean;
  reason?: string;
}

/** Đánh giá giới hạn chữ (không vượt 30 từ, không tràn khung). */
export function evaluateTextConstraints(
  text: string,
  boxWidth: number,
  boxHeight: number,
  measuredTextHeight?: number,
): TextConstraintsResult {
  const wordCount = countWords(text);
  const isTooLong = wordCount > MAX_WORDS_PER_BALLOON;
  const estHeight = estimateBoxHeight(text, boxWidth, 50);
  const actualTextHeight = measuredTextHeight ?? Math.max(0, estHeight - 2 * LETTERING_PADDING_PX);
  const availHeight = Math.max(1, boxHeight - 2 * LETTERING_PADDING_PX);
  const isOverflowing = actualTextHeight > availHeight + 2;

  let reason: string | undefined;
  if (isTooLong && isOverflowing) {
    reason = 'Quá dài (>30 từ) & tràn khung';
  } else if (isTooLong) {
    reason = 'Quá dài (>30 từ)';
  } else if (isOverflowing) {
    reason = 'Chữ tràn khung';
  }

  return { wordCount, isTooLong, isOverflowing, reason };
}

/** Tách văn bản thành 2 bóng thoại khi quá dài (ưu tiên ngắt ở dấu câu gần giữa). */
export function splitTextIntoTwoBalloons(text: string): { part1: string; part2: string } {
  const trimmed = (text || '').trim();
  if (!trimmed) return { part1: '', part2: '' };

  const mid = Math.floor(trimmed.length / 2);
  const punctuationRegex = /([.?!,;:\n]+)\s+/g;
  let bestIndex = -1;
  let minDiff = Infinity;
  let match: RegExpExecArray | null;

  while ((match = punctuationRegex.exec(trimmed)) !== null) {
    const splitPos = match.index + match[1].length;
    const diff = Math.abs(splitPos - mid);
    if (diff < minDiff) {
      minDiff = diff;
      bestIndex = splitPos;
    }
  }

  if (bestIndex !== -1 && minDiff < trimmed.length * 0.35) {
    return {
      part1: trimmed.slice(0, bestIndex).trim(),
      part2: trimmed.slice(bestIndex).trim(),
    };
  }

  const words = trimmed.split(/\s+/);
  const half = Math.ceil(words.length / 2);
  return {
    part1: words.slice(0, half).join(' '),
    part2: words.slice(half).join(' '),
  };
}

/** Kiểm tra hai hình chữ nhật có giao nhau (chạm nhau) không. */
export function rectsOverlap(r1: Rect, r2: Rect): boolean {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

/** Tìm vùng cấm mà bóng thoại đang va chạm. */
export function findKeepOutCollision(
  balloonBox: Rect,
  keepOutZones: KeepOutZone[],
): KeepOutZone | null {
  for (const zone of keepOutZones) {
    if (rectsOverlap(balloonBox, zone)) {
      return zone;
    }
  }
  return null;
}

/**
 * Gợi ý vị trí đặt bóng: tìm khoảng trống trong panel không chạm vùng cấm,
 * ưu tiên góc trên theo thứ tự đọc (RTL: góc trên-phải).
 */
export function suggestBalloonPosition(
  balloonSize: { width: number; height: number },
  panel: Rect,
  keepOutZones: KeepOutZone[],
  isRTL = true,
): { x: number; y: number } {
  const padding = 16;
  const minX = panel.x + padding;
  const maxX = Math.max(minX, panel.x + panel.width - balloonSize.width - padding);
  const minY = panel.y + padding;
  const maxY = Math.max(minY, panel.y + panel.height - balloonSize.height - padding);

  const stepX = 24;
  const stepY = 24;
  let bestPos = { x: isRTL ? maxX : minX, y: minY };
  let minScore = Infinity;

  for (let y = minY; y <= maxY; y += stepY) {
    for (let x = isRTL ? maxX : minX; isRTL ? x >= minX : x <= maxX; x += isRTL ? -stepX : stepX) {
      const candidate: Rect = { x, y, width: balloonSize.width, height: balloonSize.height };
      let collisionScore = 0;

      for (const zone of keepOutZones) {
        if (rectsOverlap(candidate, zone)) {
          const overlapW =
            Math.min(candidate.x + candidate.width, zone.x + zone.width) -
            Math.max(candidate.x, zone.x);
          const overlapH =
            Math.min(candidate.y + candidate.height, zone.y + zone.height) -
            Math.max(candidate.y, zone.y);
          collisionScore += Math.max(1, overlapW * overlapH) * 500;
        } else {
          const dist = Math.hypot(
            candidate.x + candidate.width / 2 - (zone.x + zone.width / 2),
            candidate.y + candidate.height / 2 - (zone.y + zone.height / 2),
          );
          collisionScore += Math.max(0, 100 - dist);
        }
      }

      // Thứ tự đọc ưu tiên: y nhỏ hơn (trên), trong RTL x lớn hơn (phải)
      const yScore = (y - minY) * 1.5;
      const xScore = isRTL ? (maxX - x) * 1.0 : (x - minX) * 1.0;
      const totalScore = collisionScore + yScore + xScore;

      if (totalScore < minScore) {
        minScore = totalScore;
        bestPos = { x, y };
      }
    }
  }

  return bestPos;
}

export interface PanelTextDensity {
  ratio: number;
  percentage: number;
  level: 'low' | 'medium' | 'high';
  color: string;
  label: string;
}

/** Đo mật độ diện tích chữ trên diện tích panel: xanh (<15%) / vàng (15–25%) / đỏ (>25%). */
export function calculatePanelTextDensity(panel: Rect, balloons: Rect[]): PanelTextDensity {
  const panelArea = Math.max(1, panel.width * panel.height);
  let textTotalArea = 0;
  for (const b of balloons) {
    const ox = Math.max(panel.x, b.x);
    const oy = Math.max(panel.y, b.y);
    const ex = Math.min(panel.x + panel.width, b.x + b.width);
    const ey = Math.min(panel.y + panel.height, b.y + b.height);
    if (ex > ox && ey > oy) {
      textTotalArea += (ex - ox) * (ey - oy);
    }
  }
  const ratio = Math.min(1, textTotalArea / panelArea);
  const percentage = Math.round(ratio * 100);

  if (ratio <= 0.15) {
    return { ratio, percentage, level: 'low', color: '#10B981', label: 'Thoáng (Xanh)' };
  } else if (ratio <= 0.25) {
    return { ratio, percentage, level: 'medium', color: '#F59E0B', label: 'Vừa phải (Vàng)' };
  } else {
    return { ratio, percentage, level: 'high', color: '#EF4444', label: 'Quá dày (Đỏ)' };
  }
}

/**
 * Sắp xếp các bóng thoại theo thứ tự đọc (RTL manga: từ trên xuống dưới, từ phải qua trái).
 * Trong cùng dải ngang (chênh lệch y < 70px), bóng bên phải đọc trước.
 */
export function sortBalloonsReadingOrder<T extends Rect & { id: string }>(
  balloons: T[],
  isRTL = true,
): string[] {
  const sorted = [...balloons].sort((a, b) => {
    const bandSize = 70;
    const aCenterY = a.y + a.height / 2;
    const bCenterY = b.y + b.height / 2;
    if (Math.abs(aCenterY - bCenterY) > bandSize) {
      return aCenterY - bCenterY;
    }
    const aCenterX = a.x + a.width / 2;
    const bCenterX = b.x + b.width / 2;
    return isRTL ? bCenterX - aCenterX : aCenterX - bCenterX;
  });
  return sorted.map((b) => b.id);
}

export interface ReadingOrderMismatch {
  elementId: string;
  message: string;
}

/** Cảnh báo khi vị trí bóng trên trang ngược với thứ tự dòng trong kịch bản. */
export function checkReadingOrderMismatch<
  T extends Rect & { id: string; scriptLineOrder?: number | null },
>(placedBalloons: T[], isRTL = true): ReadingOrderMismatch[] {
  const withOrder = placedBalloons.filter((b) => b.scriptLineOrder != null);
  if (withOrder.length < 2) return [];

  const spatialOrderIds = sortBalloonsReadingOrder(withOrder, isRTL);
  const mismatches: ReadingOrderMismatch[] = [];

  for (let i = 0; i < spatialOrderIds.length; i++) {
    const b1 = withOrder.find((b) => b.id === spatialOrderIds[i])!;
    for (let j = i + 1; j < spatialOrderIds.length; j++) {
      const b2 = withOrder.find((b) => b.id === spatialOrderIds[j])!;
      if (b1.scriptLineOrder! > b2.scriptLineOrder!) {
        mismatches.push({
          elementId: b1.id,
          message: `Thứ tự đọc ngược kịch bản: dòng #${b1.scriptLineOrder} đứng trước dòng #${b2.scriptLineOrder}`,
        });
        break;
      }
    }
  }

  return mismatches;
}

/** Kiểm tra dòng đầu đoạn hồi tưởng có mốc thời gian không ("3 năm trước...", "[Năm 2020]...", "Hồi nhỏ..."). */
export function hasTimeMarker(text: string): boolean {
  if (!text) return false;
  const pattern =
    /(^\s*\[.+\])|(năm trước|tháng trước|ngày trước|hồi đó|lúc đó|thời đó|thuở ấy|lúc bé|năm xưa|năm \d{4}|khi xưa|hồi còn|sau đó|trước đây|ngày xưa|years ago|back then|in the past)/i;
  return pattern.test(text);
}

// ── SVG Path Generators cho Manga Balloons ──

/**
 * Sinh SVG path cho bóng thoại thông thường (oval / elip) kèm đuôi nhọn trơn tru chỉ về (tailX, tailY).
 * Coordinates hệ toạ độ nội bộ của bóng: gốc (0,0), bề rộng w, bề cao h.
 */
export function createSpeechBalloonPath(
  w: number,
  h: number,
  tailX: number,
  tailY: number,
): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;

  // Tính khoảng cách từ tâm đến chóp đuôi
  const dx = tailX - cx;
  const dy = tailY - cy;
  const dist = Math.hypot(dx, dy);

  // Nếu đuôi ở trong bóng thoại hoặc quá gần mép, vẽ elip hoàn chỉnh
  if (dist <= Math.min(rx, ry) * 0.95) {
    return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0 Z`;
  }

  const angle = Math.atan2(dy, dx);
  // Góc mở chân đuôi trên elip (~16–28 độ)
  const baseAngle = Math.min(0.35, Math.max(0.14, 20 / Math.max(rx, ry)));
  const a1 = angle + baseAngle;
  const a2 = angle - baseAngle;

  const p1x = cx + rx * Math.cos(a1);
  const p1y = cy + ry * Math.sin(a1);
  const p2x = cx + rx * Math.cos(a2);
  const p2y = cy + ry * Math.sin(a2);

  // Vẽ cung elip lớn từ P1 quanh phía đối diện tới P2, rồi nối tới chóp đuôi và về P1
  return `M ${p1x},${p1y} A ${rx},${ry} 0 1 1 ${p2x},${p2y} L ${tailX},${tailY} Z`;
}

/** Sinh SVG path cho bóng suy nghĩ hình đám mây (cloud) gồm các cung tròn lồi uốn lượn. */
export function createThoughtBalloonPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const lobes = 12;
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < lobes; i++) {
    const th = (i * 2 * Math.PI) / lobes;
    // Bán kính nhấp nhô nhẹ tạo viền mây
    const rLobeX = rx * (1 + 0.05 * Math.sin(th * lobes));
    const rLobeY = ry * (1 + 0.05 * Math.cos(th * lobes));
    points.push({
      x: cx + rLobeX * Math.cos(th),
      y: cy + rLobeY * Math.sin(th),
    });
  }

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < lobes; i++) {
    const next = points[(i + 1) % lobes];
    const thMid = ((i + 0.5) * 2 * Math.PI) / lobes;
    // Điểm phồng cung tròn ra ngoài
    const bumpX = cx + rx * 1.12 * Math.cos(thMid);
    const bumpY = cy + ry * 1.12 * Math.sin(thMid);
    d += ` Q ${bumpX},${bumpY} ${next.x},${next.y}`;
  }
  d += ' Z';
  return d;
}

/** Tọa độ 3 chấm tròn đuôi của bóng suy nghĩ hướng về (tailX, tailY). */
export function createThoughtTailDots(
  w: number,
  h: number,
  tailX: number,
  tailY: number,
): Array<{ cx: number; cy: number; r: number }> {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;

  const angle = Math.atan2(tailY - cy, tailX - cx);
  const startX = cx + rx * 0.95 * Math.cos(angle);
  const startY = cy + ry * 0.95 * Math.sin(angle);

  const dots = [
    { t: 0.3, r: 8 },
    { t: 0.65, r: 5 },
    { t: 0.95, r: 3.5 },
  ];

  return dots.map((d) => ({
    cx: startX + (tailX - startX) * d.t,
    cy: startY + (tailY - startY) * d.t,
    r: d.r,
  }));
}

/** Sinh SVG path cho bóng hét / SFX mạnh (spiky polygon / bóng răng cưa). */
export function createShoutBalloonPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const spikes = 18;
  let d = '';

  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes;
    const isOuter = i % 2 === 0;
    const factor = isOuter ? 1.05 : 0.82;
    const px = cx + rx * factor * Math.cos(angle);
    const py = cy + ry * factor * Math.sin(angle);
    if (i === 0) d += `M ${px},${py}`;
    else d += ` L ${px},${py}`;
  }
  d += ' Z';
  return d;
}
