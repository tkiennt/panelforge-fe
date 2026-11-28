import type { TextStyleDto } from '@/services/element.service';
import { translate } from '@/lib/i18n';
import { createShoutBalloonPath, LETTERING_PADDING_PX } from './letteringPrimitives';
import { createSpeechBalloonPath, createThoughtBalloonPath } from '@/shared/utils/balloonPaths';
import { canvasFont, clampFontSize, MAX_TEXT_FONT_PX } from './textStyle';

/**
 * Quy tắc dựng bóng thoại + chữ dùng chung cho bàn Letterer (SVG/DOM), màn duyệt và bản xuất (Canvas).
 * Mọi số đo ở đây là toạ độ trang gốc (px trên khổ 1200×1800), không phụ thuộc mức zoom.
 */

/** Hình bóng hệ thống vẽ được. `none` = chỉ chữ (đặt vào bóng Artist đã vẽ sẵn trong tranh). */
export type BalloonShape = 'none' | 'oval' | 'cloud' | 'spiky' | 'box';

export const BALLOON_SHAPES: { value: BalloonShape; label: string }[] = [
  {
    value: 'none',
    get label() {
      return translate('shared.lettering.balloonShapes.none');
    },
  },
  {
    value: 'oval',
    get label() {
      return translate('shared.lettering.balloonShapes.oval');
    },
  },
  {
    value: 'cloud',
    get label() {
      return translate('shared.lettering.balloonShapes.cloud');
    },
  },
  {
    value: 'spiky',
    get label() {
      return translate('shared.lettering.balloonShapes.spiky');
    },
  },
  {
    value: 'box',
    get label() {
      return translate('shared.lettering.balloonShapes.box');
    },
  },
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

/** Bóng có viền cong: chữ xếp theo lòng elip (dòng giữa dài, dòng trên/dưới ngắn — "hình thoi"). */
const ELLIPTIC_SHAPES: readonly BalloonShape[] = ['oval', 'cloud', 'spiky'];

const hasManualBreak = (text: string) => /\r?\n/.test(text);

/** Bán trục vùng chữ bên trong viền cong: chừa lề cho nét viền, mây gợn và răng cưa. */
function innerEllipse(shape: BalloonShape, w: number, h: number) {
  const k = shape === 'spiky' ? 0.74 : 0.9;
  return { rx: Math.max(1, (w / 2) * k - 4), ry: Math.max(1, (h / 2) * k - 4) };
}

/** Bề rộng dùng được của từng dòng khi `n` dòng cao `lh` xếp giữa elip (rx, ry); 0 = dòng chạm mép trên/dưới. */
export function ellipseLineWidths(n: number, lh: number, rx: number, ry: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const edge = Math.abs((i - (n - 1) / 2) * lh) + lh / 2;
    return edge >= ry ? 0 : 2 * rx * Math.sqrt(1 - (edge / ry) ** 2);
  });
}

/** Ngắt dòng theo bề rộng riêng của từng dòng; null khi không vừa trong số dòng đó. */
function wrapToWidths(
  words: string[],
  widths: number[],
  measure: (s: string) => number,
): string[] | null {
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= widths[lines.length]) {
      line = candidate;
      continue;
    }
    if (!line) return null;
    lines.push(line);
    if (lines.length >= widths.length || measure(word) > widths[lines.length]) return null;
    line = word;
  }
  lines.push(line);
  return lines;
}

/** Ít dòng nhất mà câu vừa lòng elip (rx, ry), ngắt tham lam theo bề rộng từng dòng; null = không vừa. */
function wrapInEllipse(
  words: string[],
  lh: number,
  rx: number,
  ry: number,
  measure: (s: string) => number,
): string[] | null {
  const maxLines = Math.floor((2 * ry) / lh);
  for (let n = 1; n <= maxLines; n++) {
    const widths = ellipseLineWidths(n, lh, rx, ry);
    if (widths.some((x) => x <= 0)) break;
    const lines = wrapToWidths(words, widths, measure);
    if (lines) return lines;
  }
  return null;
}

/**
 * Ngắt dòng "hình thoi": tìm elip nhỏ nhất (cùng tỉ lệ với bóng) còn chứa được câu rồi ngắt theo elip đó,
 * nên câu ôm sát lòng bóng — dòng giữa dài, dòng trên/dưới ngắn — thay vì dòng nào cũng dài bằng nhau.
 * null = câu không vừa bóng ở cỡ chữ này.
 */
export function wrapDiamond(
  text: string,
  lh: number,
  rx: number,
  ry: number,
  measure: (s: string) => number,
): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  let best = wrapInEllipse(words, lh, rx, ry, measure);
  if (!best) return null;
  let lo = 0.2;
  let hi = 1;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    const tighter = wrapInEllipse(words, lh, rx * mid, ry * mid, measure);
    if (tighter) {
      best = tighter;
      hi = mid;
    } else lo = mid;
  }
  return best;
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
  const font = canvasFont(style, fontSize);
  const lineHeightPx = fontSize * (style.lineHeight ?? 1.25);
  const m = (s: string) => measure(s, font);

  // Bóng cong, không xuống dòng tay: xếp theo lòng elip (giữa bóng), rộng hơn hình chữ nhật nội tiếp
  if (ELLIPTIC_SHAPES.includes(shape) && !hasManualBreak(text)) {
    const { rx, ry } = innerEllipse(shape, w, h);
    const lines = wrapDiamond(text, lineHeightPx, rx, ry, m);
    const area = { x: w / 2 - rx, y: h / 2 - ry, w: rx * 2, h: ry * 2 };
    if (lines)
      return {
        font,
        fontSize,
        lineHeightPx,
        lines,
        area,
        textHeight: lines.length * lineHeightPx,
        overflow: false,
      };
    // Không vừa elip: vẫn ngắt theo bề ngang để hiển thị, báo tràn
    const fallback = wrapLines(text, area.w, m);
    return {
      font,
      fontSize,
      lineHeightPx,
      lines: fallback,
      area,
      textHeight: fallback.length * lineHeightPx,
      overflow: true,
    };
  }

  const area = textSafeArea(shape, w, h);
  const lines = wrapLines(text, area.w, m);
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

/**
 * Bố trí chữ để hiển thị/xuất: dùng cỡ chữ đã chọn; câu tràn (vd. bản dịch dài hơn bản gốc) thì tự thu nhỏ
 * tới cỡ lớn nhất còn vừa, không bao giờ to hơn cỡ đã chọn. Canvas Letterer và bản xuất cùng gọi hàm này.
 */
export function layoutBalloonText(
  text: string,
  style: TextStyleDto,
  shape: BalloonShape,
  w: number,
  h: number,
  measure: Measure = defaultMeasure,
): TextLayout {
  const layout = layoutText(text, style, shape, w, h, measure);
  if (!layout.overflow) return layout;
  const size = Math.min(style.fontSize, fitFontSize(text, style, shape, w, h, measure));
  return layoutText(text, style, shape, w, h, measure, size);
}

/** "Vừa bóng theo chữ": giữ cỡ chữ và bề rộng, tìm bề cao bóng nhỏ nhất (≤ maxH) chứa hết chữ. */
export function fitBoxHeight(
  text: string,
  style: TextStyleDto,
  shape: BalloonShape,
  w: number,
  measure: Measure = defaultMeasure,
  maxH = 4000,
): number {
  let lo = 20;
  let hi = maxH;
  if (layoutText(text, style, shape, w, hi, measure).overflow) return hi;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (layoutText(text, style, shape, w, mid, measure).overflow) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Kích thước bóng mới vừa câu ở cỡ chữ mặc định: bóng nằm ngang (cao ≤ 0.8 rộng), không nhỏ hơn mức tối thiểu,
 * không vượt khung. Câu quá dài so với khung thì lấy tối đa — khi hiển thị chữ sẽ tự thu nhỏ.
 */
export function fitBalloonSize(
  text: string,
  style: TextStyleDto,
  shape: BalloonShape,
  bounds: { minW: number; minH: number; maxW: number; maxH: number },
  measure: Measure = defaultMeasure,
): { w: number; h: number } {
  const maxW = Math.max(bounds.minW, Math.round(bounds.maxW));
  const maxH = Math.max(bounds.minH, Math.round(bounds.maxH));
  for (let w = bounds.minW; w <= maxW; w += 20) {
    const h = Math.max(bounds.minH, fitBoxHeight(text, style, shape, w, measure, maxH));
    if (h < maxH && h <= w * 0.8) return { w, h };
  }
  const h = fitBoxHeight(text, style, shape, maxW, measure, maxH);
  return { w: maxW, h: Math.max(bounds.minH, h) };
}

/** "Vừa bóng": nới bóng quanh tâm để chữ vừa ở cỡ đã chọn, không nhỏ hơn bóng cũ, không quá `max`. null = đã vừa. */
export function growBalloonToFit(
  text: string,
  style: TextStyleDto,
  shape: BalloonShape,
  box: Rect,
  max: { w: number; h: number },
  measure: Measure = defaultMeasure,
): Rect | null {
  if (!layoutText(text, style, shape, box.w, box.h, measure).overflow) return null;
  const maxW = Math.max(box.w, Math.round(max.w));
  const maxH = Math.max(box.h, Math.round(max.h));
  let size = { w: maxW, h: Math.max(box.h, fitBoxHeight(text, style, shape, maxW, measure, maxH)) };
  for (let w = box.w; w < maxW; w += 20) {
    const h = Math.max(box.h, fitBoxHeight(text, style, shape, w, measure, maxH));
    if (h < maxH && (h <= box.h || h <= w * 0.8)) {
      size = { w, h };
      break;
    }
  }
  if (size.w === box.w && size.h === box.h) return null;
  return {
    x: Math.round(box.x - (size.w - box.w) / 2),
    y: Math.round(box.y - (size.h - box.h) / 2),
    ...size,
  };
}

/**
 * Đuôi hướng về `target` (toạ độ trang — vd. tâm khung, nơi nhân vật thường đứng), thò ra khỏi viền tối đa `length` px.
 * `target` nằm trong bóng thì giữ đuôi mặc định. Kết quả theo toạ độ nội bộ của bóng như `tailX/tailY`.
 */
export function tailToward(box: Rect, target: { x: number; y: number }, length = 45): TailPoint {
  const dx = target.x - (box.x + box.w / 2);
  const dy = target.y - (box.y + box.h / 2);
  const d = Math.hypot(dx, dy);
  if (d < 1) return defaultTail(box.w, box.h);
  const ux = dx / d;
  const uy = dy / d;
  // Khoảng cách tâm → viền elip theo hướng (ux, uy)
  const r = 1 / Math.sqrt((ux / (box.w / 2)) ** 2 + (uy / (box.h / 2)) ** 2);
  if (d <= r) return defaultTail(box.w, box.h);
  const reach = r + Math.min(length, Math.max(20, d - r));
  return { x: Math.round(box.w / 2 + ux * reach), y: Math.round(box.h / 2 + uy * reach) };
}

/** Lettering truyện tranh tiếng Anh mặc định in hoa; ngôn ngữ khác giữ nguyên. */
export const letteringCase = (text: string, lang?: string | null): string =>
  lang && /^en(-|$)/i.test(lang) ? text.toLocaleUpperCase('en') : text;

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
