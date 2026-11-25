/**
 * Nhãn hiển thị cho định dạng series (Series.Format của BE: "MANGA" | "WEBTOON" | ...).
 * Không đoán định dạng khi series chưa nạp xong: trả về chuỗi rỗng để UI ẩn nhãn.
 */
export const formatSeriesFormat = (format?: string | null): string => {
  const f = (format ?? '').trim();
  if (!f) return '';
  switch (f.toUpperCase()) {
    case 'MANGA':
      return 'Manga B5';
    case 'WEBTOON':
      return 'Webtoon';
    case 'COMIC':
      return 'Comic';
    default:
      return f;
  }
};
