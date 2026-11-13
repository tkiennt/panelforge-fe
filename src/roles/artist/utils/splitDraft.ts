// src/roles/artist/utils/splitDraft.ts
// Bản nháp rà soát kết quả POST /api/pages/{pageId}/split-artwork.
// Mọi toạ độ trong bản nháp là PIXEL ẢNH GỐC (đúng đơn vị Backend trả về); chỉ đổi sang toạ độ trang khi lưu.
import type { PanelSplitResult } from '@/types/pipeline';

export type DraftKind = 'panel' | 'bubble';

export interface DraftRegion {
  id: string;
  kind: DraftKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Chỉ cho bubble: id vùng panel chứa nó (null = không gắn panel nào). */
  panelId?: string | null;
  /** Cho bubble: true nếu là khung dẫn chuyện / caption chữ nhật (từ BE polygon / tỷ lệ contour). */
  isCaption?: boolean;
  /**
   * Chỉ cho panel cắt chéo: các đỉnh 0–1 trong hộp (x, y, w, h), cùng quy ước `corners` của boundingBox Panel.
   * Tương đối theo hộp nên kéo / co giãn hộp vẫn giữ đúng hình. undefined = khung chữ nhật.
   */
  corners?: { x: number; y: number }[];
}

/** Đa giác pixel ảnh → corners 0–1 trong bbox; trả undefined nếu đa giác thực chất là hình chữ nhật của bbox. */
export function polygonToCorners(
  poly: [number, number][] | null | undefined,
  [bx, by, bw, bh]: [number, number, number, number],
): { x: number; y: number }[] | undefined {
  if (!poly || poly.length < 3 || bw <= 0 || bh <= 0) return undefined;
  const corners = poly.map(([px, py]) => ({
    x: Math.min(1, Math.max(0, Number(((px - bx) / bw).toFixed(4)))),
    y: Math.min(1, Math.max(0, Number(((py - by) / bh).toFixed(4)))),
  }));
  // Mọi đỉnh sát một góc hộp (lệch ≤ 3%) → khung chữ nhật, không cần corners
  const nearBoxCorner = (c: { x: number; y: number }) =>
    (c.x <= 0.03 || c.x >= 0.97) && (c.y <= 0.03 || c.y >= 0.97);
  return corners.length === 4 && corners.every(nearBoxCorner) ? undefined : corners;
}

export interface SplitDraft {
  imageWidth: number;
  imageHeight: number;
  /** Panel theo thứ tự đọc (vị trí trong mảng = thứ tự). */
  panels: DraftRegion[];
  bubbles: DraftRegion[];
}

export const MIN_REGION_PX = 8;

let seq = 0;
const nextId = (kind: DraftKind) => `${kind}-${++seq}`;

/**
 * Nhận diện khung dẫn chuyện / caption chữ nhật dựa vào polygon và bounding box.
 * OpenCV splitter ở BE: caption chữ nhật là contour dạng khối đặc có tỷ lệ diện tích / bounding box >= 0.85
 * và xấp xỉ đa giác 4-6 đỉnh.
 */
export function isCaptionPolygon(
  poly?: [number, number][],
  bbox?: [number, number, number, number],
): boolean {
  if (!poly || poly.length < 3) return false;
  const w = bbox ? bbox[2] : 0;
  const h = bbox ? bbox[3] : 0;
  const boxArea = w * h;
  if (boxArea <= 0) return false;

  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i][0] * poly[j][1];
    area -= poly[j][0] * poly[i][1];
  }
  area = Math.abs(area) / 2;

  const ratio = area / boxArea;
  return ratio >= 0.85 && (poly.length <= 6 || Math.abs(ratio - 1) < 0.1);
}

export function draftFromSplitResult(result: PanelSplitResult): SplitDraft {
  const W = result.width;
  const H = result.height;
  const sorted = [...result.panels].sort((a, b) => a.order - b.order);
  const panels = sorted.map((p) =>
    clampRegion(
      {
        id: nextId('panel'),
        kind: 'panel' as const,
        ...bboxToRect(p.bbox),
        corners: polygonToCorners(p.polygon, p.bbox),
      },
      W,
      H,
    ),
  );
  const byOrder = new Map(sorted.map((p, i) => [p.order, panels[i].id]));
  const bubbles = result.bubbles.map((b) =>
    clampRegion(
      {
        id: nextId('bubble'),
        kind: 'bubble' as const,
        ...bboxToRect(b.bbox),
        panelId: byOrder.get(b.panelOrder) ?? null,
        isCaption: isCaptionPolygon(b.polygon, b.bbox),
      },
      W,
      H,
    ),
  );
  return { imageWidth: W, imageHeight: H, panels, bubbles };
}

const bboxToRect = ([x, y, w, h]: [number, number, number, number]) => ({ x, y, w, h });

/** Giữ vùng nằm trong ảnh và không nhỏ hơn MIN_REGION_PX. */
export function clampRegion<T extends DraftRegion>(
  r: T,
  imageWidth: number,
  imageHeight: number,
): T {
  const w = Math.min(Math.max(MIN_REGION_PX, Math.round(r.w)), imageWidth);
  const h = Math.min(Math.max(MIN_REGION_PX, Math.round(r.h)), imageHeight);
  const x = Math.min(Math.max(0, Math.round(r.x)), imageWidth - w);
  const y = Math.min(Math.max(0, Math.round(r.y)), imageHeight - h);
  return { ...r, x, y, w, h };
}

/** Vùng mới (bị bỏ sót) đặt giữa ảnh. */
export function newRegion(
  kind: DraftKind,
  imageWidth: number,
  imageHeight: number,
  isCaption = false,
): DraftRegion {
  const w = Math.round(imageWidth * (kind === 'panel' ? 0.3 : 0.2));
  const h = Math.round(imageHeight * (kind === 'panel' ? 0.2 : 0.08));
  return clampRegion(
    {
      id: nextId(kind),
      kind,
      x: (imageWidth - w) / 2,
      y: (imageHeight - h) / 2,
      w,
      h,
      panelId: null,
      isCaption: kind === 'bubble' ? isCaption : undefined,
    },
    imageWidth,
    imageHeight,
  );
}

/** Panel chứa tâm vùng (dùng để gợi ý liên kết bóng ↔ panel). */
export function panelAt(panels: DraftRegion[], r: DraftRegion): string | null {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return (
    panels.find((p) => cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h)?.id ?? null
  );
}

/**
 * Ảnh trang hiển thị `object-fit: contain` trong khung trang (pageWidth x pageHeight).
 * Đổi rect pixel ảnh → pixel trang, có tính phần viền trống khi tỉ lệ ảnh khác tỉ lệ trang.
 */
export function imageRectToPage(
  r: { x: number; y: number; w: number; h: number },
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
) {
  const s = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const offX = (pageWidth - imageWidth * s) / 2;
  const offY = (pageHeight - imageHeight * s) / 2;
  return { x: offX + r.x * s, y: offY + r.y * s, w: r.w * s, h: r.h * s };
}
