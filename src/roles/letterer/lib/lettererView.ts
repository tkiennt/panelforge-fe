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
