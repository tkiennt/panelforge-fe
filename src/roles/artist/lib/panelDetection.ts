import { translate } from '@/lib/i18n';

/**
 * panelDetection.ts - Nhận diện & tách panel manga từ ảnh phác thảo toàn trang (công đoạn PENCIL).
 *
 * Thuật toán XY-cut đệ quy:
 * 1. Chuyển ảnh sang độ sáng, lấy mẫu giữ nguyên tỉ lệ (cạnh dài tối đa MAX_SAMPLE_SIDE).
 * 2. Ngưỡng mực cục bộ: điểm tối hơn nền giấy xung quanh là "mực", nhờ vậy nét chì nhạt,
 *    giấy ngả màu, giấy tối dần ở mép và nền xám quanh trang vẫn xử lý được.
 * 3. Bỏ hạt bụi đơn lẻ, rồi với mỗi vùng: cắt sát vùng có mực (lề trang không bao giờ là rãnh),
 *    tìm rãnh đủ dày (sạch hẳn, hoặc có ít nét vắt qua nhưng hai đầu không chạm viền khung)
 *    theo chiều ngang trước, chiều dọc sau, chia vùng
 *    thành bao nhiêu mảnh cũng được và đệ quy vào từng mảnh.
 *    Vùng không có rãnh mà là một khung bao nhiều khung con thì bóc viền rồi tách bên trong.
 *    Trước đó ước lượng góc nghiêng (ảnh scan/chụp lệch tới ±4°) và xoay thẳng mặt nạ.
 * 4. Thứ tự đọc theo cây cắt: trên → dưới; trong một hàng thì phải → trái (RTL) hoặc trái → phải.
 *
 * ĐẢM BẢO NGUYÊN TẮC: chỉ tách panel, KHÔNG xử lý thoại hay chữ.
 */

export interface DetectedPanelBox {
  panelNumber: number;
  readingOrder: number;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  w: number; // normalized 0..1
  h: number; // normalized 0..1
  borderless?: boolean;
}

export interface PanelDetectionResult {
  panels: DetectedPanelBox[];
  detectedCount: number;
  confidence: number;
  method: 'gutter-analysis' | 'adaptive-heuristic';
  /** Kích thước thật của ảnh nguồn (px), khi tải được ảnh. */
  imageWidth?: number;
  imageHeight?: number;
}

export type ReadingDirection = 'rtl' | 'ltr';

export interface PanelDetectionOptions {
  /** Hướng đọc trong một hàng panel. Mặc định 'rtl' (manga). */
  readingDirection?: ReadingDirection;
  /** @deprecated Không còn dùng: toạ độ được chuẩn hoá theo chính ảnh. */
  pageWidth?: number;
  /** @deprecated Không còn dùng: toạ độ được chuẩn hoá theo chính ảnh. */
  pageHeight?: number;
  /** @deprecated Không còn dùng: lề được xác định từ vùng có mực. */
  safeMarginPercent?: number;
  /** @deprecated Không còn dùng: rãnh tối thiểu tính theo kích thước ảnh. */
  gutterGapPercent?: number;
}

/** Cạnh dài tối đa của ảnh mẫu dùng để phân tích. */
const MAX_SAMPLE_SIDE = 1200;
/** Rãnh phải dày ít nhất tỉ lệ này của cạnh ngắn (≈5px ở ảnh mẫu 1200×850). */
const MIN_GUTTER_RATIO = 0.006;
/** Mảnh nhỏ hơn tỉ lệ này của trang (theo chiều cắt) coi là nhiễu: số trang, chữ ký, vết bẩn. */
const MIN_PANEL_RATIO = 0.05;
/** Rãnh "sạch": số điểm mực mỗi hàng ≤ tỉ lệ này của chiều dài hàng. */
const STRICT_GUTTER_NOISE = 0.0015;
/** Rãnh có nét vắt qua: cho phép tới tỉ lệ này, miễn hai đầu hàng không chạm viền khung. */
const LOOSE_GUTTER_NOISE = 0.03;
/** Dải ở hai đầu hàng/cột dùng để kiểm tra viền khung dọc/ngang. */
const EDGE_BAND_RATIO = 0.02;
/** Một cạnh vùng là viền khung khi hàng/cột ở cạnh đó phủ mực ≥ tỉ lệ này. */
const BOX_LINE_RATIO = 0.75;
/** Viền bao có thể nằm lùi vào trong mép vùng (bóng đổ, mép giấy) tối đa tỉ lệ này. */
const BOX_SEARCH_RATIO = 0.06;
/** Cửa sổ ước lượng nền giấy cục bộ (tỉ lệ cạnh dài) và độ tương phản tối thiểu để là mực. */
const LOCAL_WINDOW_RATIO = 1 / 40;
const LOCAL_CONTRAST = 0.15;
/** Điểm tối hơn mức này luôn là mực (mảng đen đặc như bầu trời đêm). */
const ABSOLUTE_INK = 96;
const MAX_DEPTH = 8;
/** Chỉnh nghiêng: thử các góc trong ±MAX_SKEW_DEG, bước SKEW_STEP_DEG; bỏ qua góc rất nhỏ. */
const MAX_SKEW_DEG = 4;
const SKEW_STEP_DEG = 0.25;
const MIN_SKEW_DEG = 0.3;

interface Region {
  x0: number;
  y0: number;
  x1: number; // exclusive
  y1: number; // exclusive
}

type Axis = 'rows' | 'cols';

/** Chuyển RGBA sang độ sáng 0..255. */
export function rgbaToLuminance(rgba: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const lum = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    lum[i] = Math.round(0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2]);
  }
  return lum;
}

/**
 * Mặt nạ mực (1 = mực). Ngưỡng cục bộ: điểm tối hơn nền xung quanh ≥ LOCAL_CONTRAST là mực,
 * nên giấy tối dần ở mép, giấy ngả màu, nền xám quanh trang và nét chì nhạt đều xử lý được.
 * Bỏ các điểm mực đứng riêng lẻ (bụi scan).
 */
function buildInkMask(lum: Uint8Array, width: number, height: number): Uint8Array {
  const iw = width + 1;
  const integral = new Float64Array(iw * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += lum[y * width + x];
      integral[(y + 1) * iw + x + 1] = integral[y * iw + x + 1] + rowSum;
    }
  }
  const half = Math.max(4, Math.round(Math.max(width, height) * LOCAL_WINDOW_RATIO));
  const raw = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const ya = Math.max(0, y - half);
    const yb = Math.min(height, y + half + 1);
    for (let x = 0; x < width; x++) {
      const v = lum[y * width + x];
      if (v < ABSOLUTE_INK) {
        raw[y * width + x] = 1;
        continue;
      }
      const xa = Math.max(0, x - half);
      const xb = Math.min(width, x + half + 1);
      const sum =
        integral[yb * iw + xb] -
        integral[ya * iw + xb] -
        integral[yb * iw + xa] +
        integral[ya * iw + xa];
      const mean = sum / ((yb - ya) * (xb - xa));
      if (v < mean * (1 - LOCAL_CONTRAST)) raw[y * width + x] = 1;
    }
  }
  const mask = new Uint8Array(raw.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!raw[i]) continue;
      search: for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue;
          if (raw[ny * width + nx]) {
            mask[i] = 1;
            break search;
          }
        }
      }
    }
  }
  return mask;
}

/** Số điểm mực trên từng hàng (axis 'rows') hoặc từng cột ('cols') của vùng. */
function project(mask: Uint8Array, width: number, r: Region, axis: Axis): Uint32Array {
  const out = new Uint32Array(axis === 'rows' ? r.y1 - r.y0 : r.x1 - r.x0);
  for (let y = r.y0; y < r.y1; y++) {
    const row = y * width;
    for (let x = r.x0; x < r.x1; x++) {
      if (!mask[row + x]) continue;
      out[axis === 'rows' ? y - r.y0 : x - r.x0]++;
    }
  }
  return out;
}

/**
 * Hàng/cột có mực ở cả hai đầu (trong dải EDGE_BAND_RATIO): nằm bên trong một khung có viền,
 * không thể là rãnh dù gần như trống.
 */
function framedEnds(mask: Uint8Array, width: number, r: Region, axis: Axis): Uint8Array {
  const len = axis === 'rows' ? r.y1 - r.y0 : r.x1 - r.x0;
  const cross = axis === 'rows' ? r.x1 - r.x0 : r.y1 - r.y0;
  const band = Math.max(2, Math.round(cross * EDGE_BAND_RATIO));
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    let start = 0;
    let end = 0;
    for (let k = 0; k < band; k++) {
      const a = axis === 'rows' ? (r.y0 + i) * width + r.x0 + k : (r.y0 + k) * width + r.x0 + i;
      const b =
        axis === 'rows' ? (r.y0 + i) * width + r.x1 - 1 - k : (r.y1 - 1 - k) * width + r.x0 + i;
      start |= mask[a];
      end |= mask[b];
    }
    out[i] = start & end;
  }
  return out;
}

/**
 * Vùng là một khung có viền bao quanh: trả về phần bên trong viền (đã bỏ nét viền),
 * hoặc null nếu một trong bốn cạnh không phải nét viền.
 */
function innerOfBox(mask: Uint8Array, width: number, r: Region): Region | null {
  const rows = project(mask, width, r, 'rows');
  const cols = project(mask, width, r, 'cols');
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  const reach = Math.max(3, Math.round(Math.min(w, h) * BOX_SEARCH_RATIO));
  const lineRows = (i: number) => rows[i] >= w * BOX_LINE_RATIO;
  const lineCols = (i: number) => cols[i] >= h * BOX_LINE_RATIO;
  const firstLine = (n: number, isLine: (i: number) => boolean, fromEnd: boolean) => {
    for (let k = 0; k < Math.min(reach, n); k++) if (isLine(fromEnd ? n - 1 - k : k)) return k;
    return -1;
  };
  const skipLine = (n: number, isLine: (i: number) => boolean, fromEnd: boolean, k: number) => {
    while (k < n && isLine(fromEnd ? n - 1 - k : k)) k++;
    return k;
  };
  const t = firstLine(h, lineRows, false);
  const b = firstLine(h, lineRows, true);
  const l = firstLine(w, lineCols, false);
  const rr = firstLine(w, lineCols, true);
  if (t < 0 || b < 0 || l < 0 || rr < 0) return null;
  const inner = {
    x0: r.x0 + skipLine(w, lineCols, false, l),
    y0: r.y0 + skipLine(h, lineRows, false, t),
    x1: r.x1 - skipLine(w, lineCols, true, rr),
    y1: r.y1 - skipLine(h, lineRows, true, b),
  };
  return inner.x1 > inner.x0 && inner.y1 > inner.y0 ? inner : null;
}

/** Thu vùng về sát phần có mực; null nếu vùng trống. */
function trimRegion(mask: Uint8Array, width: number, r: Region): Region | null {
  const rows = project(mask, width, r, 'rows');
  const cols = project(mask, width, r, 'cols');
  let top = 0;
  while (top < rows.length && rows[top] === 0) top++;
  if (top === rows.length) return null;
  let bottom = rows.length - 1;
  while (rows[bottom] === 0) bottom--;
  let left = 0;
  while (cols[left] === 0) left++;
  let right = cols.length - 1;
  while (cols[right] === 0) right--;
  return { x0: r.x0 + left, y0: r.y0 + top, x1: r.x0 + right + 1, y1: r.y0 + bottom + 1 };
}

/**
 * Chia vùng theo một trục thành các đoạn có mực, ngăn cách bởi rãnh đủ dày. Một hàng thuộc
 * rãnh khi gần như sạch, hoặc chỉ có ít nét vắt qua mà hai đầu không chạm viền khung (để phần
 * trống bên trong một khung không bị coi là rãnh). Đoạn quá ngắn (nhiễu) bị bỏ.
 * Trả về toạ độ tương đối [start, end).
 */
function findSegments(
  mask: Uint8Array,
  width: number,
  r: Region,
  axis: Axis,
  minGutter: number,
  minSegment: number,
): Array<[number, number]> {
  const counts = project(mask, width, r, axis);
  const framed = framedEnds(mask, width, r, axis);
  const len = counts.length;
  const cross = axis === 'rows' ? r.x1 - r.x0 : r.y1 - r.y0;
  const strictTol = Math.floor(cross * STRICT_GUTTER_NOISE);
  const looseTol = Math.max(1, Math.floor(cross * LOOSE_GUTTER_NOISE));
  const isClear = (i: number) => counts[i] <= strictTol || (counts[i] <= looseTol && !framed[i]);
  const segments: Array<[number, number]> = [];
  let segStart = 0;
  let i = 0;
  while (i < len) {
    if (!isClear(i)) {
      i++;
      continue;
    }
    let j = i;
    while (j < len && isClear(j)) j++;
    if (i === 0) {
      segStart = j; // dải gần như trống ở đầu vùng: bỏ
    } else if (j === len) {
      segments.push([segStart, i]); // dải gần như trống ở cuối vùng: bỏ
      segStart = len;
    } else if (j - i >= minGutter && i > segStart) {
      segments.push([segStart, i]);
      segStart = j;
    }
    i = j;
  }
  if (segStart < len) segments.push([segStart, len]);
  return segments.filter(([s, e]) => e - s >= minSegment);
}

/**
 * Ước lượng góc nghiêng (radian) của trang: góc làm biểu đồ chiếu theo hàng "sắc" nhất
 * (tổng bình phương lớn nhất), tức các viền ngang và rãnh nằm thẳng hàng. 0 nếu gần như thẳng.
 */
function estimateSkew(mask: Uint8Array, width: number, height: number, inkCount: number): number {
  const cx = width / 2;
  const cy = height / 2;
  const step = Math.max(1, Math.floor(inkCount / 200000));
  const xs: number[] = [];
  const ys: number[] = [];
  let seen = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen++ % step) continue;
    xs.push((i % width) - cx);
    ys.push(Math.floor(i / width) - cy);
  }
  const diag = Math.ceil(Math.hypot(width, height));
  const hist = new Uint32Array(diag * 2 + 1);
  let bestDeg = 0;
  let bestScore = -1;
  for (let deg = -MAX_SKEW_DEG; deg <= MAX_SKEW_DEG + 1e-9; deg += SKEW_STEP_DEG) {
    const a = (deg * Math.PI) / 180;
    const s = Math.sin(a);
    const c = Math.cos(a);
    hist.fill(0);
    for (let k = 0; k < xs.length; k++) hist[Math.round(-xs[k] * s + ys[k] * c) + diag]++;
    let score = 0;
    for (let k = 0; k < hist.length; k++) score += hist[k] * hist[k];
    if (score > bestScore) {
      bestScore = score;
      bestDeg = deg;
    }
  }
  return Math.abs(bestDeg) < MIN_SKEW_DEG ? 0 : (bestDeg * Math.PI) / 180;
}

/** Điểm (x, y) trên ảnh đã xoay thẳng → toạ độ trên ảnh gốc. */
function toSource(x: number, y: number, width: number, height: number, angle: number) {
  const cx = width / 2;
  const cy = height / 2;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return { x: cx + (x - cx) * c - (y - cy) * s, y: cy + (x - cx) * s + (y - cy) * c };
}

/** Xoay mặt nạ cho thẳng (láng giềng gần nhất); phần ngoài ảnh gốc là giấy trắng. */
function rotateMask(mask: Uint8Array, width: number, height: number, angle: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = toSource(x, y, width, height, angle);
      const sx = Math.round(p.x);
      const sy = Math.round(p.y);
      if (sx >= 0 && sx < width && sy >= 0 && sy < height)
        out[y * width + x] = mask[sy * width + sx];
    }
  }
  return out;
}

/**
 * Lõi thuần (không cần canvas): nhận ảnh độ sáng, trả về các khung đã chuẩn hoá 0..1
 * theo thứ tự đọc. Trả về mảng rỗng nếu ảnh trống hoặc gần như toàn mực.
 */
export function detectPanelsFromLuminance(
  lum: Uint8Array,
  width: number,
  height: number,
  options: { readingDirection?: ReadingDirection } = {},
): Array<{ x: number; y: number; w: number; h: number }> {
  if (width <= 0 || height <= 0 || lum.length < width * height) return [];
  const rawMask = buildInkMask(lum, width, height);
  let inkCount = 0;
  for (let i = 0; i < rawMask.length; i++) inkCount += rawMask[i];
  if (inkCount === 0 || inkCount > rawMask.length * 0.85) return [];
  // Ảnh scan/chụp hơi nghiêng làm rãnh chéo đi: xoay thẳng trước khi tìm rãnh.
  const angle = estimateSkew(rawMask, width, height, inkCount);
  const mask = angle ? rotateMask(rawMask, width, height, angle) : rawMask;
  const rtl = (options.readingDirection ?? 'rtl') === 'rtl';
  const minGutter = Math.max(3, Math.round(Math.min(width, height) * MIN_GUTTER_RATIO));
  const minPanelW = Math.max(4, Math.round(width * MIN_PANEL_RATIO));
  const minPanelH = Math.max(4, Math.round(height * MIN_PANEL_RATIO));
  const leaves: Region[] = [];

  const visit = (region: Region, depth: number) => {
    const r = trimRegion(mask, width, region);
    if (!r) return;
    if (r.x1 - r.x0 < minPanelW || r.y1 - r.y0 < minPanelH) return; // mảnh nhiễu

    if (depth < MAX_DEPTH) {
      // Ưu tiên rãnh ngang (tầng), sau đó rãnh dọc (cột) trong tầng.
      const rowSegs = findSegments(mask, width, r, 'rows', minGutter, minPanelH);
      if (rowSegs.length >= 2 || (rowSegs.length === 1 && isShrunk(rowSegs[0], r.y1 - r.y0))) {
        for (const [s, e] of rowSegs) visit({ ...r, y0: r.y0 + s, y1: r.y0 + e }, depth + 1);
        return;
      }
      const colSegs = findSegments(mask, width, r, 'cols', minGutter, minPanelW);
      if (colSegs.length >= 2 || (colSegs.length === 1 && isShrunk(colSegs[0], r.x1 - r.x0))) {
        const ordered = rtl ? [...colSegs].reverse() : colSegs;
        for (const [s, e] of ordered) visit({ ...r, x0: r.x0 + s, x1: r.x0 + e }, depth + 1);
        return;
      }
    }
    // Không có rãnh: nếu đây là một khung viền bao nhiều khung con (viền trang, mép tờ giấy),
    // bóc viền và tách bên trong; chỉ nhận khi mọi khung con đều có viền riêng.
    if (depth < MAX_DEPTH) {
      const inner = innerOfBox(mask, width, r);
      if (inner) {
        const before = leaves.length;
        visit(inner, depth + 1);
        const children = leaves.slice(before);
        if (children.length >= 2 && children.every((c) => innerOfBox(mask, width, c))) return;
        leaves.length = before;
      }
    }
    leaves.push(r);
  };

  visit({ x0: 0, y0: 0, x1: width, y1: height }, 0);

  const round4 = (v: number) => Number(v.toFixed(4));
  return leaves.map((r) => {
    // Nới 1px để giữ trọn nét khung khi cắt; xoay 4 góc về ảnh gốc rồi lấy khung bao.
    const corners = [
      toSource(r.x0 - 1, r.y0 - 1, width, height, angle),
      toSource(r.x1 + 1, r.y0 - 1, width, height, angle),
      toSource(r.x0 - 1, r.y1 + 1, width, height, angle),
      toSource(r.x1 + 1, r.y1 + 1, width, height, angle),
    ];
    const x0 = Math.max(0, Math.min(...corners.map((p) => p.x)));
    const y0 = Math.max(0, Math.min(...corners.map((p) => p.y)));
    const x1 = Math.min(width, Math.max(...corners.map((p) => p.x)));
    const y1 = Math.min(height, Math.max(...corners.map((p) => p.y)));
    return {
      x: round4(x0 / width),
      y: round4(y0 / height),
      w: round4((x1 - x0) / width),
      h: round4((y1 - y0) / height),
    };
  });
}

/** Một đoạn duy nhất nhưng ngắn hơn vùng: đã bỏ được nhiễu, cần xét lại phần còn lại. */
function isShrunk([s, e]: [number, number], length: number): boolean {
  return s > 0 || e < length;
}

/**
 * Tải ảnh vào đối tượng HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Phân tích ảnh phác thảo toàn trang và tự động tách các ô panel.
 */
export async function detectPanelsFromSketchImage(
  imageSource: string | File,
  options: PanelDetectionOptions = {},
): Promise<PanelDetectionResult> {
  let objectUrl: string | null = null;
  let imageUrl = '';

  if (typeof imageSource === 'string') {
    imageUrl = imageSource;
  } else {
    objectUrl = URL.createObjectURL(imageSource);
    imageUrl = objectUrl;
  }

  try {
    const img = await loadImage(imageUrl);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) return fallbackHeuristicPanels(3);

    // Lấy mẫu giữ nguyên tỉ lệ ảnh, không phóng to ảnh nhỏ.
    const scale = Math.min(1, MAX_SAMPLE_SIDE / Math.max(naturalW, naturalH));
    const sampleW = Math.max(1, Math.round(naturalW * scale));
    const sampleH = Math.max(1, Math.round(naturalH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { ...fallbackHeuristicPanels(3), imageWidth: naturalW, imageHeight: naturalH };
    }

    // Nền trắng để vùng trong suốt của PNG không bị coi là mực đen.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sampleW, sampleH);
    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
    const lum = rgbaToLuminance(data, sampleW * sampleH);

    const boxes = detectPanelsFromLuminance(lum, sampleW, sampleH, {
      readingDirection: options.readingDirection,
    });

    if (boxes.length >= 2) {
      const panels: DetectedPanelBox[] = boxes.map((b, idx) => ({
        panelNumber: idx + 1,
        readingOrder: idx + 1,
        ...b,
        borderless: false,
      }));
      return {
        panels,
        detectedCount: panels.length,
        confidence: 0.88,
        method: 'gutter-analysis',
        imageWidth: naturalW,
        imageHeight: naturalH,
      };
    }

    // Fallback: ảnh không có rãnh rõ (nét thô, vẽ tự do hoặc chỉ một khung)
    return { ...fallbackHeuristicPanels(4), imageWidth: naturalW, imageHeight: naturalH };
  } catch (err) {
    console.warn('Lỗi khi phân tích rãnh ảnh phác thảo, chuyển sang mẫu tối ưu thích ứng:', err);
    return fallbackHeuristicPanels(3);
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/**
 * Mẫu khung thông minh thích ứng theo chuẩn Manga RTL khi ảnh nét thô
 */
function fallbackHeuristicPanels(panelCount: number = 4): PanelDetectionResult {
  if (panelCount === 3) {
    // 3 Tầng Manga kinh điển
    return {
      panels: [
        {
          panelNumber: 1,
          readingOrder: 1,
          x: 0.028,
          y: 0.028,
          w: 0.944,
          h: 0.28,
          borderless: false,
        },
        {
          panelNumber: 2,
          readingOrder: 2,
          x: 0.505,
          y: 0.33,
          w: 0.467,
          h: 0.32,
          borderless: false,
        },
        {
          panelNumber: 3,
          readingOrder: 3,
          x: 0.028,
          y: 0.33,
          w: 0.467,
          h: 0.32,
          borderless: false,
        },
      ],
      detectedCount: 3,
      confidence: 0.75,
      method: 'adaptive-heuristic',
    };
  }

  // 4 Khung Shonen kịch tính (Mở đầu + 2 dồn dập RTL + 1 kết)
  return {
    panels: [
      { panelNumber: 1, readingOrder: 1, x: 0.028, y: 0.028, w: 0.944, h: 0.28, borderless: false },
      { panelNumber: 2, readingOrder: 2, x: 0.505, y: 0.33, w: 0.467, h: 0.32, borderless: false },
      { panelNumber: 3, readingOrder: 3, x: 0.028, y: 0.33, w: 0.467, h: 0.32, borderless: false },
      { panelNumber: 4, readingOrder: 4, x: 0.028, y: 0.672, w: 0.944, h: 0.3, borderless: false },
    ],
    detectedCount: 4,
    confidence: 0.75,
    method: 'adaptive-heuristic',
  };
}

type NormalizedBox = { x: number; y: number; w: number; h: number };

/** Cắt một ô từ ảnh đã tải; trả về Blob PNG (nhẹ hơn chuỗi data URL, không chặn luồng chính). */
function cropLoadedImage(img: HTMLImageElement, box: NormalizedBox): Promise<Blob> {
  const canvas = document.createElement('canvas');

  // Tính tọa độ pixel thực tế trên ảnh gốc
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  const sx = Math.max(0, Math.floor(box.x * naturalW));
  const sy = Math.max(0, Math.floor(box.y * naturalH));
  const sw = Math.min(naturalW - sx, Math.max(1, Math.floor(box.w * naturalW)));
  const sh = Math.min(naturalH - sy, Math.max(1, Math.floor(box.h * naturalH)));

  canvas.width = sw;
  canvas.height = sh;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error(translate('artist.panelDetection.canvasContextError')));
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error(translate('artist.panelDetection.canvasContextError'))),
      'image/png',
    ),
  );
}

/**
 * Cắt nhiều ô tranh từ ảnh phác thảo toàn trang, chỉ tải ảnh một lần. Mỗi ô thành một ảnh
 * độc lập (object URL của Blob PNG). Phần tử là null nếu ô đó cắt lỗi.
 * Người gọi chịu trách nhiệm URL.revokeObjectURL khi bỏ ảnh.
 */
export async function cropImagesByBoundingBoxes(
  imageUrl: string,
  boxes: NormalizedBox[],
): Promise<Array<string | null>> {
  const img = await loadImage(imageUrl);
  return Promise.all(
    boxes.map(async (box) => {
      try {
        return URL.createObjectURL(await cropLoadedImage(img, box));
      } catch (err) {
        console.warn('Lỗi cắt tranh cho khung:', err);
        return null;
      }
    }),
  );
}
