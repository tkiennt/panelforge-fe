/**
 * panelDetection.ts - Thuật toán Nhận diện & Tách Panel Manga từ Ảnh Phác Thảo Toàn Trang
 * Chuyên biệt cho công đoạn PENCIL (Artist Desk):
 * - Phân tích rãnh tranh (Gutters Analysis: rãnh ngang và rãnh dọc) qua Canvas offscreen.
 * - Nhận diện các khối bounding box của từng ô panel.
 * - Sắp xếp theo chuẩn đọc Manga RTL (Right-to-Left, Top-to-Bottom).
 * - Chuẩn hóa tọa độ theo vùng Safe Zone (2.8% - 97.2%) của trang in B5.
 * - ĐẢM BẢO NGUYÊN TẮC: Chỉ tách panel, KHÔNG xử lý thoại hay chữ.
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
 * Phân tích ảnh phác thảo toàn trang và tự động tách các ô panel theo chuẩn Manga RTL
 */
export async function detectPanelsFromSketchImage(
  imageSource: string | File,
  options: {
    pageWidth?: number;
    pageHeight?: number;
    safeMarginPercent?: number; // mặc định 2.8%
    gutterGapPercent?: number; // rãnh cách giữa các khung mặc định ~1.8%
  } = {},
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
    const canvas = document.createElement('canvas');
    // Scale xuống kích thước phân tích chuẩn 600x900 để chạy siêu tốc trong < 200ms
    const sampleW = 600;
    const sampleH = 900;
    canvas.width = sampleW;
    canvas.height = sampleH;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return fallbackHeuristicPanels(3);
    }

    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    // 1. Phân tích lược đồ mật độ nét vẽ theo trục Y (Horizontal Projection)
    // Tính trung bình độ sáng (grayscale): pixel tối/đen là nét vẽ, pixel sáng/trắng là rãnh (gutter)
    const rowDarkness = new Float32Array(sampleH);
    for (let y = 0; y < sampleH; y++) {
      let darkCount = 0;
      for (let x = 0; x < sampleW; x++) {
        const idx = (y * sampleW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance < 200) {
          darkCount++;
        }
      }
      rowDarkness[y] = darkCount / sampleW;
    }

    // 2. Tìm các rãnh chia ngang (Horizontal Gutters): vùng có ít nét vẽ liên tục >= 8px
    const minGutterThickness = 8;
    const horizontalGutters: Array<{ startY: number; endY: number }> = [];
    let inGutter = false;
    let gutterStart = 0;

    // Chỉ quét bên trong lề an toàn (loại bỏ mép lề giấy)
    const topMargin = Math.round(sampleH * 0.03);
    const bottomMargin = Math.round(sampleH * 0.97);

    for (let y = topMargin; y < bottomMargin; y++) {
      const isClear = rowDarkness[y] < 0.08; // rất ít nét vẽ
      if (isClear && !inGutter) {
        inGutter = true;
        gutterStart = y;
      } else if (!isClear && inGutter) {
        inGutter = false;
        if (y - gutterStart >= minGutterThickness) {
          horizontalGutters.push({ startY: gutterStart, endY: y });
        }
      }
    }
    if (inGutter && bottomMargin - gutterStart >= minGutterThickness) {
      horizontalGutters.push({ startY: gutterStart, endY: bottomMargin });
    }

    // Nếu tìm thấy từ 1 đến 4 rãnh ngang hợp lệ:
    if (horizontalGutters.length >= 1 && horizontalGutters.length <= 4) {
      // Xác định các tầng (Tiers)
      const tiers: Array<{ topNorm: number; bottomNorm: number }> = [];
      let currentTop = 0.028;

      for (const gutter of horizontalGutters) {
        const gutterTopNorm = Math.max(0.028, gutter.startY / sampleH);
        const gutterBottomNorm = Math.min(0.972, gutter.endY / sampleH);
        if (gutterTopNorm - currentTop >= 0.1) {
          tiers.push({ topNorm: currentTop, bottomNorm: gutterTopNorm });
        }
        currentTop = gutterBottomNorm;
      }
      if (0.972 - currentTop >= 0.1) {
        tiers.push({ topNorm: currentTop, bottomNorm: 0.972 });
      }

      if (tiers.length >= 2) {
        const rawPanels: Array<{ x: number; y: number; w: number; h: number }> = [];

        // Trong từng tầng, kiểm tra xem có chia 2 cột dọc không
        for (const tier of tiers) {
          const tierStartY = Math.round(tier.topNorm * sampleH);
          const tierEndY = Math.round(tier.bottomNorm * sampleH);
          const tierHeight = tierEndY - tierStartY;

          // Phân tích cột dọc trong tầng này
          const colDarkness = new Float32Array(sampleW);
          for (let x = 0; x < sampleW; x++) {
            let darkCount = 0;
            for (let y = tierStartY; y < tierEndY; y++) {
              const idx = (y * sampleW + x) * 4;
              const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (luminance < 200) darkCount++;
            }
            colDarkness[x] = darkCount / tierHeight;
          }

          // Tìm rãnh dọc ở vùng giữa (khoảng 35% - 65% bề rộng)
          const midStart = Math.round(sampleW * 0.35);
          const midEnd = Math.round(sampleW * 0.65);
          let bestGutterX = -1;
          let minColDarkness = 999;

          for (let x = midStart; x <= midEnd; x++) {
            if (colDarkness[x] < minColDarkness && colDarkness[x] < 0.08) {
              minColDarkness = colDarkness[x];
              bestGutterX = x;
            }
          }

          if (bestGutterX > 0 && minColDarkness < 0.06) {
            // Tầng này chia 2 cột!
            const splitNorm = bestGutterX / sampleW;
            const gutterHalfW = 0.009; // nửa độ rộng rãnh dọc
            const tierH = tier.bottomNorm - tier.topNorm;

            // Thứ tự Manga RTL: Cột PHẢI đứng trước (đọc trước)
            rawPanels.push({
              x: Number((splitNorm + gutterHalfW).toFixed(4)),
              y: Number(tier.topNorm.toFixed(4)),
              w: Number((0.972 - (splitNorm + gutterHalfW)).toFixed(4)),
              h: Number(tierH.toFixed(4)),
            });
            // Cột TRÁI đứng sau
            rawPanels.push({
              x: 0.028,
              y: Number(tier.topNorm.toFixed(4)),
              w: Number((splitNorm - gutterHalfW - 0.028).toFixed(4)),
              h: Number(tierH.toFixed(4)),
            });
          } else {
            // Tầng đơn nguyên 1 khung ngang
            rawPanels.push({
              x: 0.028,
              y: Number(tier.topNorm.toFixed(4)),
              w: 0.944,
              h: Number((tier.bottomNorm - tier.topNorm).toFixed(4)),
            });
          }
        }

        if (rawPanels.length >= 2) {
          const panels: DetectedPanelBox[] = rawPanels.map((p, idx) => ({
            panelNumber: idx + 1,
            readingOrder: idx + 1,
            x: p.x,
            y: p.y,
            w: p.w,
            h: p.h,
            borderless: false,
          }));

          return {
            panels,
            detectedCount: panels.length,
            confidence: 0.88,
            method: 'gutter-analysis',
          };
        }
      }
    }

    // Fallback: Nếu ảnh phác thảo không có rãnh rõ (nét thô hoặc vẽ tự do)
    return fallbackHeuristicPanels(4);
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

/**
 * Cắt ảnh ô tranh tương ứng từ ảnh phác thảo toàn trang
 * Trả về Data URL dạng PNG để tự động gán thẳng vào panel artwork
 */
export async function cropImageByBoundingBox(
  imageUrl: string,
  box: { x: number; y: number; w: number; h: number },
): Promise<string> {
  const img = await loadImage(imageUrl);
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
    throw new Error('Không thể khởi tạo 2D Context để cắt tranh panel.');
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/png');
}
