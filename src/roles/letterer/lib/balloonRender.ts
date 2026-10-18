import type { TextStyleDto } from '@/services/element.service';
import {
  createShoutBalloonPath,
  createSpeechBalloonPath,
  createThoughtBalloonPath,
  LETTERING_PADDING_PX,
} from './lettererView';
import { canvasFont, clampFontSize, MAX_TEXT_FONT_PX } from './textStyle';

/**
 * Quy tắc dựng bóng thoại + chữ dùng chung cho bàn Letterer (SVG/DOM), màn duyệt và bản xuất (Canvas).
 * Mọi số đo ở đây là toạ độ trang gốc (px trên khổ 1200×1800), không phụ thuộc mức zoom.
 */

/** Hình bóng hệ thống vẽ được. `none` = chỉ chữ (đặt vào bóng Artist đã vẽ sẵn trong tranh). */
export type BalloonShape = 'none' | 'oval' | 'cloud' | 'spiky' | 'box';

export const BALLOON_SHAPES: { value: BalloonShape; label: string }[] = [
  { value: 'none', label: 'Chỉ chữ (không bóng)' },
  { value: 'oval', label: 'Oval có đuôi' },
  { value: 'cloud', label: 'Mây (suy nghĩ)' },
  { value: 'spiky', label: 'Răng cưa (hét)' },
  { value: 'box', label: 'Hộp chữ nhật' },
];

export interface BalloonAppearance {
  shape: BalloonShape;
  fillColor: string;
  /** 0..1 — độ đục nền bóng thật (khác thanh "Nền" chỉ để nhìn tranh khi làm việc). */
  fillOpacity: number;
  borderColor: string;
  /** px trang; 0 = không viền. */
  borderWidth: number;
}

/**
 * Giao diện mặc định theo loại nội dung. Backend chưa lưu hình bóng/nền/viền (TextStyle chỉ có thuộc tính chữ),
 * nên đây là thứ duy nhất màn duyệt và bản xuất biết — Letterer xem "bản đã lưu" cũng dùng đúng hàm này.
 */
export function defaultAppearance(elementType: string): BalloonAppearance {
  const t = elementType.toUpperCase();
  if (t.includes('NARRATION') || t.includes('CAPTION'))
    return {
      shape: 'box',
      fillColor: '#FFFBEB',
      fillOpacity: 1,
      borderColor: '#171717',
      borderWidth: 2.5,
    };
  if (t.includes('SFX') || t.includes('SOUND'))
    return {
      shape: 'spiky',
      fillColor: '#FEF2F2',
      fillOpacity: 1,
      borderColor: '#DC2626',
      borderWidth: 2.5,
    };
  if (t.includes('THOUGHT'))
    return {
      shape: 'cloud',
      fillColor: '#FFFFFF',
      fillOpacity: 1,
      borderColor: '#171717',
      borderWidth: 2.5,
    };
  return {
    shape: 'oval',
    fillColor: '#FFFFFF',
    fillOpacity: 1,
    borderColor: '#171717',
    borderWidth: 2.5,
  };
}

export function resolveAppearance(
  elementType: string,
  override?: Partial<BalloonAppearance> | null,
): BalloonAppearance {
  return { ...defaultAppearance(elementType), ...(override ?? {}) };
}

export interface TailPoint {
  x: number;
  y: number;
}

/** Đuôi mặc định (dưới giữa bóng) — dùng khi chưa có toạ độ đuôi đã lưu. */
export const defaultTail = (w: number, h: number): TailPoint => ({
  x: Math.round(w / 2),
  y: Math.round(h + 35),
});

/** SVG path của hình bóng trong hệ toạ độ nội bộ (0,0)-(w,h); null khi không vẽ hình (chỉ chữ). */
export function balloonPath(
  shape: BalloonShape,
  w: number,
  h: number,
  tail: TailPoint = defaultTail(w, h),
): string | null {
  switch (shape) {
    case 'oval':
      return createSpeechBalloonPath(w, h, tail.x, tail.y);
    case 'cloud':
      return createThoughtBalloonPath(w, h);
    case 'spiky':
      return createShoutBalloonPath(w, h);
    case 'box':
      return `M 0,0 H ${w} V ${h} H 0 Z`;
    default:
      return null;
  }
}

/** Màu nền dạng rgba để SVG và Canvas hiểu như nhau. `scale` = thanh "Nền" của bàn làm việc (chỉ hiển thị). */
export function fillRgba(a: BalloonAppearance, scale = 1): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(a.fillColor)?.[1] ?? 'ffffff';
  const n = parseInt(hex, 16);
  const alpha = Math.max(0, Math.min(1, a.fillOpacity * scale));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const shapeInset = (shape: BalloonShape) =>
  shape === 'oval' || shape === 'cloud'
    ? Math.SQRT1_2
    : shape === 'spiky'
      ? 0.82 * Math.SQRT1_2
      : 1;
const shapePad = (shape: BalloonShape) => (shapeInset(shape) === 1 ? LETTERING_PADDING_PX : 4);

/**
 * Vùng chữ an toàn bên trong bóng. Oval/mây: hình chữ nhật nội tiếp elip (w/√2 × h/√2) để chữ không chạm đường cong;
 * răng cưa: nội tiếp elip bên trong (0.82); hộp/chỉ chữ: lề cố định.
 */
export function textSafeArea(shape: BalloonShape, w: number, h: number): Rect {
  const k = shapeInset(shape);
  const pad = shapePad(shape);
  const aw = Math.max(1, w * k - pad * 2);
  const ah = Math.max(1, h * k - pad * 2);
  return { x: (w - aw) / 2, y: (h - ah) / 2, w: aw, h: ah };
}

export type Measure = (text: string, font: string) => number;

let measureCtx: CanvasRenderingContext2D | null | undefined;
/** Đo bằng canvas (cùng engine cho DOM và Canvas); môi trường không có canvas thì ước lượng 0.55em/ký tự. */
export const defaultMeasure: Measure = (text, font) => {
  if (measureCtx === undefined) {
    try {
      measureCtx =
        typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    } catch {
      measureCtx = null;
    }
  }
  if (measureCtx) {
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 24);
  return text.length * px * 0.55;
};

/** Ngắt dòng: giữ xuống dòng thủ công, ngắt theo từ, từ quá dài thì cắt theo ký tự (như overflow-wrap:anywhere). */
export function wrapLines(text: string, maxW: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/[ \t]+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxW) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      if (measure(word) <= maxW) {
        line = word;
        continue;
      }
      for (const ch of Array.from(word)) {
        if (line && measure(line + ch) > maxW) {
          lines.push(line);
          line = ch;
        } else line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}

export interface TextLayout {
  font: string;
  fontSize: number;
  lineHeightPx: number;
  lines: string[];
  area: Rect;
  textHeight: number;
  overflow: boolean;
}

/** Bố trí chữ theo đúng cỡ đã chọn — không tự thu nhỏ; tràn thì báo `overflow`. */
export function layoutText(
  text: string,
  style: TextStyleDto,
  shape: BalloonShape,
  w: number,
  h: number,
  measure: Measure = defaultMeasure,
  fontSize = style.fontSize,
): TextLayout {
  const area = textSafeArea(shape, w, h);
  const font = canvasFont(style, fontSize);
  const lines = wrapLines(text, area.w, (s) => measure(s, font));
  const lineHeightPx = fontSize * (style.lineHeight ?? 1.25);
  const textHeight = lines.length * lineHeightPx;
  return {
    font,
    fontSize,
    lineHeightPx,
    lines,
    area,
    textHeight,
    overflow: textHeight > area.h + 1,
  };
}

/** "Vừa chữ trong bóng": giữ kích thước bóng, chọn cỡ chữ lớn nhất (14..160) còn vừa. */
export function fitFontSize(
  text: string,
  style: TextStyleDto,
  shape: BalloonShape,
  w: number,
  h: number,
  measure: Measure = defaultMeasure,
): number {
  let lo = clampFontSize(0);
  let hi = MAX_TEXT_FONT_PX;
  if (layoutText(text, style, shape, w, h, measure, lo).overflow) return lo;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (layoutText(text, style, shape, w, h, measure, mid).overflow) hi = mid - 1;
    else lo = mid;
  }
  return lo;
}

/** "Vừa bóng theo chữ": giữ cỡ chữ và bề rộng, tính bề cao bóng tối thiểu chứa hết chữ. */
export function fitBoxHeight(
  text: string,
  style: TextStyleDto,
  shape: BalloonShape,
  w: number,
  h: number,
  measure: Measure = defaultMeasure,
): number {
  const { textHeight } = layoutText(text, style, shape, w, h, measure);
  return Math.ceil((textHeight + shapePad(shape) * 2 + 2) / shapeInset(shape));
}

// ── Lưu giao diện bóng vào TextStyle của Backend (balloonShape, fillColor, fillOpacity, borderColor, borderWidth, tailX, tailY) ──

const BALLOON_KEYS = [
  'balloonShape',
  'fillColor',
  'fillOpacity',
  'borderColor',
  'borderWidth',
  'tailX',
  'tailY',
] as const;

/** Phần giao diện bóng đã lưu trong style (chỉ các trường có giá trị). */
export function appearanceFromStyle(style?: TextStyleDto | null): Partial<BalloonAppearance> {
  const out: Partial<BalloonAppearance> = {};
  if (style?.balloonShape) out.shape = style.balloonShape;
  if (style?.fillColor) out.fillColor = style.fillColor;
  if (style?.fillOpacity != null) out.fillOpacity = style.fillOpacity;
  if (style?.borderColor) out.borderColor = style.borderColor;
  if (style?.borderWidth != null) out.borderWidth = style.borderWidth;
  return out;
}

/** Đuôi bóng đã lưu; null khi chưa kéo (dùng `defaultTail`). */
export const tailFromStyle = (style?: TextStyleDto | null): TailPoint | null =>
  style?.tailX != null && style?.tailY != null ? { x: style.tailX, y: style.tailY } : null;

const pickBalloon = (style?: TextStyleDto | null): Partial<TextStyleDto> =>
  Object.fromEntries(BALLOON_KEYS.filter((k) => style?.[k] != null).map((k) => [k, style![k]]));

const hasBalloon = (style?: TextStyleDto | null) => BALLOON_KEYS.some((k) => style?.[k] != null);

/**
 * Thanh định dạng chữ chỉ biết thuộc tính chữ: giữ lại phần bóng đã lưu khi đổi kiểu chữ / chọn preset / về mặc định.
 * "Về mặc định" (null) mà bóng đang có chỉnh sửa thì gửi kiểu chữ mặc định kèm phần bóng (BE cần đủ font + cỡ).
 */
export function mergeTextStyle(
  next: TextStyleDto | null,
  current: TextStyleDto | null | undefined,
  defaults: TextStyleDto,
): TextStyleDto | null {
  if (!hasBalloon(current)) return next;
  return { ...(next ?? defaults), ...pickBalloon(current) };
}

/** Đổi phần bóng (hoặc về mặc định khi `patch` = null) trên style hiện tại; trả null nếu không còn gì khác mặc định. */
export function withAppearance(
  current: TextStyleDto | null | undefined,
  defaults: TextStyleDto,
  patch: (Partial<BalloonAppearance> & { tail?: TailPoint | null }) | null,
): TextStyleDto | null {
  const base: TextStyleDto = { ...(current ?? defaults) };
  if (!patch) for (const k of BALLOON_KEYS) delete base[k];
  else {
    if (patch.shape !== undefined) base.balloonShape = patch.shape;
    if (patch.fillColor !== undefined) base.fillColor = patch.fillColor;
    if (patch.fillOpacity !== undefined) base.fillOpacity = patch.fillOpacity;
    if (patch.borderColor !== undefined) base.borderColor = patch.borderColor;
    if (patch.borderWidth !== undefined) base.borderWidth = patch.borderWidth;
    if (patch.tail !== undefined) {
      base.tailX = patch.tail ? Math.round(patch.tail.x) : null;
      base.tailY = patch.tail ? Math.round(patch.tail.y) : null;
    }
  }
  // Không có kiểu chữ riêng và không còn phần bóng → về null (mặc định theo loại)
  return !current && !hasBalloon(base) ? null : base;
}

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Kéo một góc bóng `dx, dy` (px trang): góc đối diện đứng yên, giữ kích thước tối thiểu và không vượt khỏi trang.
 * Trả toạ độ đã làm tròn.
 */
export function resizeFromCorner(
  box: Rect,
  corner: ResizeCorner,
  dx: number,
  dy: number,
  min: { w: number; h: number },
  page: { width: number; height: number },
): Rect {
  let left = box.x;
  let top = box.y;
  let right = box.x + box.w;
  let bottom = box.y + box.h;
  if (corner.includes('w')) left = Math.max(0, Math.min(right - min.w, left + dx));
  else right = Math.min(page.width, Math.max(left + min.w, right + dx));
  if (corner.includes('n')) top = Math.max(0, Math.min(bottom - min.h, top + dy));
  else bottom = Math.min(page.height, Math.max(top + min.h, bottom + dy));
  const x = Math.round(left);
  const y = Math.round(top);
  return { x, y, w: Math.round(right) - x, h: Math.round(bottom) - y };
}
