// src/shared/utils/panelLayout.ts
// Logic thuần (không phụ thuộc React) cho việc chỉnh bố cục khung panel: kéo/đổi cỡ có "hít" (snap),
// chia lưới đều, căn chỉnh, phân bố đều và phát hiện lệch. Mọi toạ độ là phần trăm trang (0–100).

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guide {
  axis: 'x' | 'y';
  /** Vị trí đường dóng (%) */
  pos: number;
}

export interface GapLabel {
  axis: 'x' | 'y';
  /** Đoạn nối hai khung: [from, to] theo trục chính, và vị trí `at` trên trục còn lại */
  from: number;
  to: number;
  at: number;
  value: number;
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type DragMode = 'move' | ResizeHandle;

export const MIN_PANEL_SIZE = 5;
export const DEFAULT_MARGIN = 3;
export const DEFAULT_GAP = 2;
export const SNAP_THRESHOLD = 1.2;

export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const roundRect = (r: Rect): Rect => ({
  x: round1(r.x),
  y: round1(r.y),
  w: round1(r.w),
  h: round1(r.h),
});

export function clampRect(r: Rect, minSize = MIN_PANEL_SIZE): Rect {
  const w = Math.min(100, Math.max(minSize, r.w));
  const h = Math.min(100, Math.max(minSize, r.h));
  const x = Math.min(100 - w, Math.max(0, r.x));
  const y = Math.min(100 - h, Math.max(0, r.y));
  return { x, y, w, h };
}

/** Dịch chuyển khung (giữ nguyên kích thước). */
export function moveRect(start: Rect, dx: number, dy: number): Rect {
  return clampRect({ ...start, x: start.x + dx, y: start.y + dy });
}

/** Đổi kích thước theo tay nắm; cạnh đối diện đứng yên. */
export function resizeRect(
  start: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  minSize = MIN_PANEL_SIZE,
): Rect {
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  if (handle.includes('w')) left = Math.min(right - minSize, Math.max(0, left + dx));
  if (handle.includes('e')) right = Math.max(left + minSize, Math.min(100, right + dx));
  if (handle.includes('n')) top = Math.min(bottom - minSize, Math.max(0, top + dy));
  if (handle.includes('s')) bottom = Math.max(top + minSize, Math.min(100, bottom + dy));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

const right = (r: Rect) => r.x + r.w;
const bottom = (r: Rect) => r.y + r.h;

/** Khoảng cách phổ biến nhất giữa các khung xếp cạnh nhau theo một trục (để gợi ý "cách đều"). */
export function commonGap(rects: Rect[], axis: 'x' | 'y'): number | null {
  const gaps: number[] = [];
  const sorted = [...rects].sort((a, b) => (axis === 'y' ? a.y - b.y : a.x - b.x));
  for (let i = 0; i < sorted.length - 1; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      const overlap =
        axis === 'y'
          ? Math.min(right(a), right(b)) - Math.max(a.x, b.x)
          : Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
      if (overlap <= 0) continue;
      const gap = axis === 'y' ? b.y - bottom(a) : b.x - right(a);
      if (gap > 0.2 && gap < 30) gaps.push(round1(gap));
      break;
    }
  }
  if (gaps.length === 0) return null;
  const counts = new Map<number, number>();
  gaps.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

interface SnapAxisResult {
  delta: number;
  target: number | null;
}

function bestSnap(edges: number[], targets: number[], threshold: number): SnapAxisResult {
  let best: SnapAxisResult = { delta: 0, target: null };
  let bestAbs = threshold + 1e-9;
  for (const e of edges) {
    for (const t of targets) {
      const d = t - e;
      if (Math.abs(d) < bestAbs) {
        bestAbs = Math.abs(d);
        best = { delta: d, target: t };
      }
    }
  }
  return best;
}

export interface SnapOptions {
  margin?: number;
  threshold?: number;
}

export interface SnapResult {
  rect: Rect;
  guides: Guide[];
  gaps: GapLabel[];
}

/**
 * "Hít" khung đang kéo vào: lề an toàn, giữa trang, cạnh/giữa của khung khác, và khoảng cách đều
 * với các khung xung quanh. Với đổi kích thước chỉ cạnh đang di chuyển mới hít.
 */
export function snapRect(
  rect: Rect,
  mode: DragMode,
  others: Rect[],
  opts: SnapOptions = {},
): SnapResult {
  const margin = opts.margin ?? DEFAULT_MARGIN;
  const threshold = opts.threshold ?? SNAP_THRESHOLD;

  const xTargets: number[] = [margin, 100 - margin, 50];
  const yTargets: number[] = [margin, 100 - margin, 50];
  const xGapTargets: number[] = [];
  const yGapTargets: number[] = [];
  const gapX = commonGap(others, 'x');
  const gapY = commonGap(others, 'y');
  for (const o of others) {
    xTargets.push(o.x, right(o), o.x + o.w / 2);
    yTargets.push(o.y, bottom(o), o.y + o.h / 2);
    if (gapX !== null) xGapTargets.push(right(o) + gapX, o.x - gapX);
    if (gapY !== null) yGapTargets.push(bottom(o) + gapY, o.y - gapY);
  }

  const moveAll = mode === 'move';
  const movesLeft = moveAll || mode.includes('w');
  const movesRight = moveAll || mode.includes('e');
  const movesTop = moveAll || mode.includes('n');
  const movesBottom = moveAll || mode.includes('s');

  const xEdges: Array<{ v: number; side: 'l' | 'r' | 'c' }> = [];
  if (movesLeft) xEdges.push({ v: rect.x, side: 'l' });
  if (movesRight) xEdges.push({ v: right(rect), side: 'r' });
  if (moveAll) xEdges.push({ v: rect.x + rect.w / 2, side: 'c' });
  const yEdges: Array<{ v: number; side: 't' | 'b' | 'c' }> = [];
  if (movesTop) yEdges.push({ v: rect.y, side: 't' });
  if (movesBottom) yEdges.push({ v: bottom(rect), side: 'b' });
  if (moveAll) yEdges.push({ v: rect.y + rect.h / 2, side: 'c' });

  // Ưu tiên khoảng cách đều (gap) rồi đến cạnh/lề: nếu gap hít được thì dùng gap.
  const pick = (
    edges: Array<{ v: number }>,
    targets: number[],
    gapTargets: number[],
  ): SnapAxisResult & { viaGap: boolean } => {
    const vs = edges.map((e) => e.v);
    const g = bestSnap(vs, gapTargets, threshold);
    if (g.target !== null) return { ...g, viaGap: true };
    return { ...bestSnap(vs, targets, threshold), viaGap: false };
  };

  const sx = pick(xEdges, xTargets, xGapTargets);
  const sy = pick(yEdges, yTargets, yGapTargets);

  let next = { ...rect };
  if (moveAll) {
    next = { ...next, x: rect.x + sx.delta, y: rect.y + sy.delta };
  } else {
    // Đổi kích thước: điều chỉnh đúng cạnh đang di chuyển.
    const l = mode.includes('w') ? rect.x + sx.delta : rect.x;
    const r = mode.includes('e') ? right(rect) + sx.delta : right(rect);
    const t = mode.includes('n') ? rect.y + sy.delta : rect.y;
    const b = mode.includes('s') ? bottom(rect) + sy.delta : bottom(rect);
    next = { x: l, y: t, w: r - l, h: b - t };
  }
  next = clampRect(next);

  const guides: Guide[] = [];
  if (sx.target !== null) guides.push({ axis: 'x', pos: sx.target });
  if (sy.target !== null) guides.push({ axis: 'y', pos: sy.target });

  // Nhãn khoảng cách tới khung kề (chỉ khi hít theo gap hoặc gần kề).
  const gaps: GapLabel[] = [];
  for (const o of others) {
    const overlapX = Math.min(right(next), right(o)) - Math.max(next.x, o.x);
    const overlapY = Math.min(bottom(next), bottom(o)) - Math.max(next.y, o.y);
    if (overlapX > 0) {
      const g1 = next.y - bottom(o);
      const g2 = o.y - bottom(next);
      if (g1 > 0.1 && g1 < 15) {
        gaps.push({
          axis: 'y',
          from: bottom(o),
          to: next.y,
          at: Math.max(next.x, o.x) + overlapX / 2,
          value: round1(g1),
        });
      } else if (g2 > 0.1 && g2 < 15) {
        gaps.push({
          axis: 'y',
          from: bottom(next),
          to: o.y,
          at: Math.max(next.x, o.x) + overlapX / 2,
          value: round1(g2),
        });
      }
    }
    if (overlapY > 0) {
      const g1 = next.x - right(o);
      const g2 = o.x - right(next);
      if (g1 > 0.1 && g1 < 15) {
        gaps.push({
          axis: 'x',
          from: right(o),
          to: next.x,
          at: Math.max(next.y, o.y) + overlapY / 2,
          value: round1(g1),
        });
      } else if (g2 > 0.1 && g2 < 15) {
        gaps.push({
          axis: 'x',
          from: right(next),
          to: o.x,
          at: Math.max(next.y, o.y) + overlapY / 2,
          value: round1(g2),
        });
      }
    }
  }

  return { rect: next, guides, gaps };
}

// ───────────────────────────── Chia lưới ─────────────────────────────

export type SplitPreset = 'vertical' | 'horizontal' | 'grid';

/** `rows[i]` = số ô ở hàng i. Chiều cao hàng chia đều; chiều rộng ô trong hàng chia đều. */
export function buildGrid(rows: number[], margin = DEFAULT_MARGIN, gap = DEFAULT_GAP): Rect[] {
  const cleanRows = rows.filter((n) => n > 0);
  if (cleanRows.length === 0) return [];
  const innerW = 100 - margin * 2;
  const innerH = 100 - margin * 2;
  const rowH = (innerH - gap * (cleanRows.length - 1)) / cleanRows.length;
  const out: Rect[] = [];
  cleanRows.forEach((cols, rIdx) => {
    const cellW = (innerW - gap * (cols - 1)) / cols;
    for (let c = 0; c < cols; c += 1) {
      out.push(
        roundRect({
          x: margin + c * (cellW + gap),
          y: margin + rIdx * (rowH + gap),
          w: cellW,
          h: rowH,
        }),
      );
    }
  });
  return out;
}

/** Số hàng cho từng kiểu chia N khung. `grid` = 2 cột (hàng cuối có thể lẻ → ô cuối giãn). */
export function rowsForPreset(preset: SplitPreset, n: number): number[] {
  if (n <= 0) return [];
  if (preset === 'vertical') return Array.from({ length: n }, () => 1);
  if (preset === 'horizontal') return [n];
  // grid: 2 khung/hàng; nếu N lẻ, hàng đầu ít hơn (vd 5 → 2/3 thay vì 2/2/1)
  if (n <= 2) return [n];
  if (n === 3) return [1, 2];
  const first = Math.floor(n / 2);
  return [first, n - first];
}

export function splitEvenly(
  preset: SplitPreset,
  n: number,
  margin = DEFAULT_MARGIN,
  gap = DEFAULT_GAP,
): Rect[] {
  return buildGrid(rowsForPreset(preset, n), margin, gap);
}

// ───────────────────────────── Căn chỉnh / Phân bố ─────────────────────────────

export type AlignMode = 'left' | 'right' | 'centerX' | 'top' | 'bottom' | 'centerY';

/** Căn nhiều khung theo cạnh ngoài cùng (hoặc giữa) của cả nhóm. */
export function alignRects(rects: Rect[], mode: AlignMode): Rect[] {
  if (rects.length < 2) return rects;
  const minX = Math.min(...rects.map((r) => r.x));
  const maxX = Math.max(...rects.map(right));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxY = Math.max(...rects.map(bottom));
  return rects.map((r) => {
    switch (mode) {
      case 'left':
        return roundRect({ ...r, x: minX });
      case 'right':
        return roundRect({ ...r, x: maxX - r.w });
      case 'centerX':
        return roundRect({ ...r, x: (minX + maxX) / 2 - r.w / 2 });
      case 'top':
        return roundRect({ ...r, y: minY });
      case 'bottom':
        return roundRect({ ...r, y: maxY - r.h });
      case 'centerY':
        return roundRect({ ...r, y: (minY + maxY) / 2 - r.h / 2 });
    }
  });
}

/** Phân bố đều khoảng cách giữa các khung (khung đầu & cuối đứng yên). Trả về theo thứ tự đầu vào. */
export function distributeRects(rects: Rect[], axis: 'x' | 'y'): Rect[] {
  if (rects.length < 3) return rects;
  const idx = rects
    .map((_, i) => i)
    .sort((a, b) => (axis === 'x' ? rects[a].x - rects[b].x : rects[a].y - rects[b].y));
  const first = rects[idx[0]];
  const last = rects[idx[idx.length - 1]];
  const span = axis === 'x' ? right(last) - first.x : bottom(last) - first.y;
  const total = idx.reduce((s, i) => s + (axis === 'x' ? rects[i].w : rects[i].h), 0);
  const gap = (span - total) / (idx.length - 1);
  const out = rects.map((r) => ({ ...r }));
  let cursor = axis === 'x' ? first.x : first.y;
  idx.forEach((i) => {
    if (axis === 'x') {
      out[i] = roundRect({ ...rects[i], x: cursor });
      cursor += rects[i].w + gap;
    } else {
      out[i] = roundRect({ ...rects[i], y: cursor });
      cursor += rects[i].h + gap;
    }
  });
  return out;
}

// ───────────────────────────── Phát hiện lệch ─────────────────────────────

export interface LayoutIssue {
  /** Id của các khung liên quan (chỉ số theo mảng đầu vào) */
  indexes: number[];
  message: string;
}

/**
 * Phát hiện lệch: (1) cạnh gần thẳng hàng nhưng lệch nhẹ (0.1–1.5%); (2) khoảng cách giữa các khung xếp
 * cạnh nhau không đều. Dùng để cảnh báo trước khi nộp và gợi ý nút "Căn lại".
 */
export function detectLayoutIssues(rects: Rect[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) > 0.1 && Math.abs(a - b) <= 1.5;

  const edgeDefs: Array<{ label: string; get: (r: Rect) => number }> = [
    { label: 'cạnh trái', get: (r) => r.x },
    { label: 'cạnh phải', get: (r) => right(r) },
    { label: 'cạnh trên', get: (r) => r.y },
    { label: 'cạnh dưới', get: (r) => bottom(r) },
  ];
  for (const def of edgeDefs) {
    const flagged = new Set<number>();
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        if (near(def.get(rects[i]), def.get(rects[j]))) {
          flagged.add(i);
          flagged.add(j);
        }
      }
    }
    if (flagged.size > 0) {
      issues.push({
        indexes: [...flagged],
        message: `${flagged.size} khung lệch nhẹ ${def.label} (nên thẳng hàng).`,
      });
    }
  }

  for (const axis of ['y', 'x'] as const) {
    const gaps: number[] = [];
    const idx = rects
      .map((_, i) => i)
      .sort((a, b) => (axis === 'y' ? rects[a].y - rects[b].y : rects[a].x - rects[b].x));
    const involved = new Set<number>();
    for (let k = 0; k < idx.length - 1; k += 1) {
      const a = rects[idx[k]];
      const b = rects[idx[k + 1]];
      const overlap =
        axis === 'y'
          ? Math.min(right(a), right(b)) - Math.max(a.x, b.x)
          : Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
      if (overlap <= 0) continue;
      const g = axis === 'y' ? b.y - bottom(a) : b.x - right(a);
      if (g >= 0) {
        gaps.push(g);
        involved.add(idx[k]);
        involved.add(idx[k + 1]);
      }
    }
    if (gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) > 0.5) {
      issues.push({
        indexes: [...involved],
        message: `Khoảng cách ${axis === 'y' ? 'dọc' : 'ngang'} giữa các khung không đều (${round1(
          Math.min(...gaps),
        )}%–${round1(Math.max(...gaps))}%).`,
      });
    }
  }

  const overlaps = new Set<number>();
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const ox = Math.min(right(rects[i]), right(rects[j])) - Math.max(rects[i].x, rects[j].x);
      const oy = Math.min(bottom(rects[i]), bottom(rects[j])) - Math.max(rects[i].y, rects[j].y);
      if (ox > 0.5 && oy > 0.5) {
        overlaps.add(i);
        overlaps.add(j);
      }
    }
  }
  if (overlaps.size > 0) {
    issues.push({ indexes: [...overlaps], message: `${overlaps.size} khung đang chồng lên nhau.` });
  }
  return issues;
}

/**
 * Gom các cạnh lệch nhẹ (≤ 1.5%) về cùng một đường (trung bình cụm, làm tròn 0.5%),
 * kèm làm tròn mọi cạnh về bội của 0.5% để tọa độ gọn, đối xứng.
 */
export function straightenRects(rects: Rect[], tolerance = 1.5): Rect[] {
  if (rects.length === 0) return rects;
  const edges = rects.map((r) => ({ l: r.x, r: right(r), t: r.y, b: bottom(r) }));
  const snapKey = (key: 'l' | 'r' | 't' | 'b') => {
    const order = edges.map((_, i) => i).sort((a, b) => edges[a][key] - edges[b][key]);
    let cluster: number[] = [];
    const flush = () => {
      if (cluster.length === 0) return;
      const mean = cluster.reduce((s, i) => s + edges[i][key], 0) / cluster.length;
      const v = Math.round(mean * 2) / 2;
      cluster.forEach((i) => {
        edges[i][key] = v;
      });
      cluster = [];
    };
    order.forEach((i) => {
      if (
        cluster.length > 0 &&
        edges[i][key] - edges[cluster[cluster.length - 1]][key] > tolerance
      ) {
        flush();
      }
      cluster.push(i);
    });
    flush();
  };
  (['l', 'r', 't', 'b'] as const).forEach(snapKey);
  return edges.map((e) =>
    clampRect({
      x: e.l,
      y: e.t,
      w: Math.max(MIN_PANEL_SIZE, e.r - e.l),
      h: Math.max(MIN_PANEL_SIZE, e.b - e.t),
    }),
  );
}

// ───────────────────────────── Chia đôi một khung ─────────────────────────────

/** Khe giữa hai nửa khi chia đôi (khớp `FrameTemplate.cs` của BE: 0.02 chuẩn hoá = 2%). */
export const SPLIT_GAP = 2;
/** Mỗi nửa phải rộng/cao tối thiểu 8% trang. */
export const MIN_SPLIT_SIZE = 8;

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type SplitAxis = 'vertical' | 'horizontal';

export type SplitResult = { first: Rect; second: Rect } | { error: string };

/**
 * Chia đôi một khung: `vertical` = 2 cột (trái/phải), `horizontal` = 2 hàng (trên/dưới).
 * Khung gốc giữ vị trí đầu, khung mới nằm ở nửa còn lại; làm tròn 4 chữ số của toạ độ chuẩn hoá 0–1.
 */
export function splitPanelRect(rect: Rect, axis: SplitAxis): SplitResult {
  if (axis === 'vertical') {
    const w = (rect.w - SPLIT_GAP) / 2;
    if (w < MIN_SPLIT_SIZE)
      return { error: 'Khung quá hẹp để chia dọc (mỗi nửa tối thiểu 8% trang).' };
    return {
      first: { x: rect.x, y: rect.y, w: round2(w), h: rect.h },
      second: { x: round2(rect.x + w + SPLIT_GAP), y: rect.y, w: round2(w), h: rect.h },
    };
  }
  const h = (rect.h - SPLIT_GAP) / 2;
  if (h < MIN_SPLIT_SIZE)
    return { error: 'Khung quá thấp để chia ngang (mỗi nửa tối thiểu 8% trang).' };
  return {
    first: { x: rect.x, y: rect.y, w: rect.w, h: round2(h) },
    second: { x: rect.x, y: round2(rect.y + h + SPLIT_GAP), w: rect.w, h: round2(h) },
  };
}
