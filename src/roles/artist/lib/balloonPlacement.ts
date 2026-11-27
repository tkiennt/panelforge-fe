export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Area {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const GAP = 12;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Chọn vị trí cho bóng mới trong vùng (khung tranh hoặc trang) sao cho không đè bóng đã có.
 * Ưu tiên tâm vùng, sau đó quét lưới từ trên-trái theo thứ tự đọc; hết chỗ thì xếp bậc thang từ tâm.
 */
export const findFreeBalloonSlot = (
  area: Area,
  width: number,
  height: number,
  existing: Rect[],
): { x: number; y: number } => {
  const areaW = area.maxX - area.minX;
  const areaH = area.maxY - area.minY;
  const center = {
    x: area.minX + Math.max(0, Math.round((areaW - width) / 2)),
    y: area.minY + Math.max(0, Math.round((areaH - height) / 2)),
  };
  const isFree = (p: { x: number; y: number }) =>
    !existing.some((r) => overlaps({ ...p, width, height }, r));

  if (isFree(center)) return center;

  for (let y = area.minY + GAP; y + height <= area.maxY; y += height + GAP) {
    for (let x = area.minX + GAP; x + width <= area.maxX; x += width + GAP) {
      if (isFree({ x, y })) return { x, y };
    }
  }

  const step = 24 * (existing.length % 10);
  return { x: center.x + step, y: center.y + step };
};
