import { isGuid, type KeepOutZoneDto } from '@/services/page.service';

export const MAX_KEEP_OUT_ZONES = 50;
export const MAX_KEEP_OUT_LABEL_LENGTH = 100;

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

const MIN_NORM_SIZE = 1e-4;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Chuyển danh sách KeepOutZoneDto chuẩn hoá 0..1 từ BE sang toạ độ pixel trên trang. */
export function normalizedToPixelZones(
  zones: KeepOutZoneDto[],
  pageWidth: number,
  pageHeight: number,
): KeepOutZone[] {
  const safeW = pageWidth > 0 ? pageWidth : 1200;
  const safeH = pageHeight > 0 ? pageHeight : 1800;
  return (zones || []).map((z, idx) => ({
    id: `kz-${idx}-${Math.round(z.x * 1e4)}-${Math.round(z.y * 1e4)}`,
    x: Math.round(z.x * safeW),
    y: Math.round(z.y * safeH),
    width: Math.max(1, Math.round(z.width * safeW)),
    height: Math.max(1, Math.round(z.height * safeH)),
    label: z.label ?? undefined,
    panelId: z.panelId ?? null,
  }));
}

/** Chuyển vùng cấm pixel trang sang DTO chuẩn hoá 0..1 hợp lệ với BE (x+w <= 1, y+h <= 1, label <= 100). */
export function pixelToNormalizedZone(
  zone: KeepOutZone,
  pageWidth: number,
  pageHeight: number,
  validPanelIds?: ReadonlySet<string>,
): KeepOutZoneDto {
  const safeW = pageWidth > 0 ? pageWidth : 1200;
  const safeH = pageHeight > 0 ? pageHeight : 1800;

  const x = round6(Math.max(0, Math.min(1 - MIN_NORM_SIZE, zone.x / safeW)));
  const y = round6(Math.max(0, Math.min(1 - MIN_NORM_SIZE, zone.y / safeH)));
  const maxW = Math.max(MIN_NORM_SIZE, Math.floor((1 - x) * 1e6) / 1e6);
  const maxH = Math.max(MIN_NORM_SIZE, Math.floor((1 - y) * 1e6) / 1e6);
  const width = round6(Math.max(MIN_NORM_SIZE, Math.min(maxW, zone.width / safeW)));
  const height = round6(Math.max(MIN_NORM_SIZE, Math.min(maxH, zone.height / safeH)));

  const trimmedLabel = zone.label?.trim();
  const label = trimmedLabel ? trimmedLabel.slice(0, MAX_KEEP_OUT_LABEL_LENGTH) : null;
  const panelId =
    zone.panelId && isGuid(zone.panelId) && (!validPanelIds || validPanelIds.has(zone.panelId))
      ? zone.panelId
      : null;

  return { x, y, width, height, label, panelId };
}
