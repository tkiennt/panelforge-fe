// Balloon outlines are shared by the letterer workspace and the artist desk preview.
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
