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

export function draftFromSplitResult(result: PanelSplitResult): SplitDraft {
  const W = result.width;
  const H = result.height;
  const sorted = [...result.panels].sort((a, b) => a.order - b.order);
  const panels = sorted.map((p) =>
    clampRegion({ id: nextId('panel'), kind: 'panel' as const, ...bboxToRect(p.bbox) }, W, H),
  );
  const byOrder = new Map(sorted.map((p, i) => [p.order, panels[i].id]));
  const bubbles = result.bubbles.map((b) =>
    clampRegion(
      {
        id: nextId('bubble'),
        kind: 'bubble' as const,
        ...bboxToRect(b.bbox),
        panelId: byOrder.get(b.panelOrder) ?? null,
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
export function newRegion(kind: DraftKind, imageWidth: number, imageHeight: number): DraftRegion {
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
