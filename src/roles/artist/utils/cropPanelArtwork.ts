/**
 * Cắt một vùng ảnh [x, y, w, h] từ tệp ảnh gốc sang File ảnh mới để tải lên cho từng ô khung tranh (Panel).
 */
export async function cropPanelArtwork(
  source: File | HTMLImageElement | string,
  bbox: [number, number, number, number],
  fileName = 'panel-artwork.png',
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
