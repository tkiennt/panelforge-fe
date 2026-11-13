/**
 * Cắt một vùng ảnh [x, y, w, h] từ tệp ảnh gốc sang File ảnh mới để tải lên cho từng ô khung tranh (Panel).
 */
export async function cropPanelArtwork(
  source: File | HTMLImageElement | string,
  bbox: [number, number, number, number],
  fileName = 'panel-artwork.png',
  /** Khung cắt chéo: đỉnh 0–1 trong bbox; phần ngoài đa giác để trong suốt. */
  corners?: { x: number; y: number }[],
): Promise<File> {
  const [x, y, w, h] = bbox;
  const safeW = Math.max(1, Math.round(w));
  const safeH = Math.max(1, Math.round(h));

  const loadImage = (): Promise<{ img: HTMLImageElement; cleanup: () => void }> => {
    if (source instanceof HTMLImageElement) {
      if (source.complete && source.naturalWidth > 0) {
        return Promise.resolve({ img: source, cleanup: () => {} });
      }
      return new Promise((resolve, reject) => {
        source.onload = () => resolve({ img: source, cleanup: () => {} });
        source.onerror = () => reject(new Error('Không thể tải ảnh nguồn để cắt.'));
      });
    }

    const img = new Image();
    // URL khác origin (vd ảnh từ API 5044): xin CORS để canvas không bị "tainted" khi toBlob
    img.crossOrigin = 'anonymous';
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;
    return new Promise((resolve, reject) => {
      img.onload = () => {
        resolve({
          img,
          cleanup: () => {
            if (isFile) URL.revokeObjectURL(url);
          },
        });
      };
      img.onerror = () => {
        if (isFile) URL.revokeObjectURL(url);
        reject(new Error('Không thể tải ảnh nguồn để cắt.'));
      };
      img.src = url;
    });
  };

  const { img, cleanup } = await loadImage();
  try {
    const canvas = document.createElement('canvas');
    canvas.width = safeW;
    canvas.height = safeH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context không khả dụng.');
    }

    if (corners && corners.length >= 3) {
      ctx.beginPath();
      corners.forEach((c, i) =>
        i === 0 ? ctx.moveTo(c.x * safeW, c.y * safeH) : ctx.lineTo(c.x * safeW, c.y * safeH),
      );
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(img, x, y, w, h, 0, 0, safeW, safeH);

    return await new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Không thể tạo blob ảnh cắt từ canvas.'));
          return;
        }
        const file = new File([blob], fileName, { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    });
  } finally {
    cleanup();
  }
}
