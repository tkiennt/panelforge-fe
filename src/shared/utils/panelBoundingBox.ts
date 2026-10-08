// src/shared/utils/panelBoundingBox.ts

export interface ParsedBoundingBox {
  percentX: number;
  percentY: number;
  percentW: number;
  percentH: number;
  pixelX: number;
  pixelY: number;
  pixelW: number;
  pixelH: number;
  corners?: Array<{ x: number; y: number }>;
  borderless?: boolean;
}

export function parseBoundingBox(
  boundingBox?: string | null,
  pageWidth = 1200,
  pageHeight = 1800,
): ParsedBoundingBox {
  const fallback: ParsedBoundingBox = {
    percentX: 10,
    percentY: 10,
    percentW: 80,
    percentH: 35,
    pixelX: Math.round(0.1 * pageWidth),
    pixelY: Math.round(0.1 * pageHeight),
    pixelW: Math.round(0.8 * pageWidth),
    pixelH: Math.round(0.35 * pageHeight),
  };
  if (!boundingBox) return fallback;
  try {
    const p = typeof boundingBox === 'string' ? JSON.parse(boundingBox) : boundingBox;
    const corners = Array.isArray(p.corners) ? p.corners : undefined;
    const borderless = Boolean(p.borderless);

    // Ưu tiên 1: normalized { x, y, w, h } từ Frame Template hoặc layout AI
    if (p.normalized && typeof p.normalized.x === 'number') {
      const norm = p.normalized;
      const isRatio = norm.x <= 1 && norm.w <= 1;
      const norm01X = isRatio ? norm.x : norm.x / 100;
      const norm01Y = isRatio ? norm.y : norm.y / 100;
      const norm01W = isRatio ? norm.w : norm.w / 100;
      const norm01H = isRatio ? norm.h : norm.h / 100;

      const pW = p.pageWidthPx || pageWidth;
      const pH = p.pageHeightPx || pageHeight;

      return {
        percentX: norm01X * 100,
        percentY: norm01Y * 100,
        percentW: norm01W * 100,
        percentH: norm01H * 100,
        pixelX: typeof p.x === 'number' ? p.x : Math.round(norm01X * pW),
        pixelY: typeof p.y === 'number' ? p.y : Math.round(norm01Y * pH),
        pixelW: typeof p.width === 'number' ? p.width : Math.round(norm01W * pW),
        pixelH: typeof p.height === 'number' ? p.height : Math.round(norm01H * pH),
        corners,
        borderless,
      };
    }

    // Ưu tiên 2: unit === 'px' hoặc toạ độ rõ ràng dạng px (> 100 hoặc có pageWidthPx)
    const pW = p.pageWidthPx || pageWidth;
    const pH = p.pageHeightPx || pageHeight;
    const rawX = typeof p.x === 'number' ? p.x : 0;
    const rawY = typeof p.y === 'number' ? p.y : 0;
    const rawW = typeof p.width === 'number' ? p.width : typeof p.w === 'number' ? p.w : pW * 0.8;
    const rawH =
      typeof p.height === 'number' ? p.height : typeof p.h === 'number' ? p.h : pH * 0.35;

    // Ưu tiên 2: coordinateSpace === 'page-normalized' hoặc toạ độ chuẩn hoá 0–1 (tất cả giá trị <= 1)
    const isNormalized01 =
      p.coordinateSpace === 'page-normalized' ||
      (rawX <= 1 && rawY <= 1 && rawW <= 1 && rawH <= 1 && (rawW > 0 || rawH > 0));

    if (isNormalized01) {
      return {
        percentX: rawX * 100,
        percentY: rawY * 100,
        percentW: rawW * 100,
        percentH: rawH * 100,
        pixelX: Math.round(rawX * pW),
        pixelY: Math.round(rawY * pH),
        pixelW: Math.round(rawW * pW),
        pixelH: Math.round(rawH * pH),
        corners,
        borderless,
      };
    }

    // Ưu tiên 3: unit === 'px' hoặc toạ độ rõ ràng dạng px (> 100 hoặc có pageWidthPx)
    if (p.unit === 'px' || rawW > 100 || rawH > 100 || p.pageWidthPx) {
      return {
        percentX: (rawX / pW) * 100,
        percentY: (rawY / pH) * 100,
        percentW: (rawW / pW) * 100,
        percentH: (rawH / pH) * 100,
        pixelX: Math.round(rawX),
        pixelY: Math.round(rawY),
        pixelW: Math.round(rawW),
        pixelH: Math.round(rawH),
        corners,
        borderless,
      };
    }

    // Ưu tiên 4: Định dạng % (0..100)
    return {
      percentX: rawX,
      percentY: rawY,
      percentW: rawW,
      percentH: rawH,
      pixelX: Math.round((rawX / 100) * pW),
      pixelY: Math.round((rawY / 100) * pH),
      pixelW: Math.round((rawW / 100) * pW),
      pixelH: Math.round((rawH / 100) * pH),
      corners,
      borderless,
    };
  } catch {
    return fallback;
  }
}

export function buildBoundingBoxJson(
  percentX: number,
  percentY: number,
  percentW: number,
  percentH: number,
  pageWidth = 1200,
  pageHeight = 1800,
  extra?: { corners?: Array<{ x: number; y: number }>; borderless?: boolean },
): string {
  const normX = Number((percentX / 100).toFixed(4));
  const normY = Number((percentY / 100).toFixed(4));
  const normW = Number((percentW / 100).toFixed(4));
  const normH = Number((percentH / 100).toFixed(4));
  const pixelX = Math.round(normX * pageWidth);
  const pixelY = Math.round(normY * pageHeight);
  const pixelW = Math.round(normW * pageWidth);
  const pixelH = Math.round(normH * pageHeight);

  return JSON.stringify({
    x: pixelX,
    y: pixelY,
    width: pixelW,
    height: pixelH,
    unit: 'px',
    pageWidthPx: pageWidth,
    pageHeightPx: pageHeight,
    normalized: {
      x: normX,
      y: normY,
      w: normW,
      h: normH,
      coordinateSpace: 'page',
    },
    corners: extra?.corners,
    borderless: extra?.borderless,
  });
}
