export const formatGb = (bytes?: number | null) => {
  if (!bytes) return '0.0';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
};

export const formatBytes = (bytes?: number | null) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 3 ? 2 : 1)) + ' ' + sizes[i];
};

export const formatTokens = (tokens?: number | null) => {
  if (!tokens) return '0';
  return Number(tokens).toLocaleString('vi-VN');
};

export const formatGenre = (genre: string | undefined | null) => {
  if (!genre || !genre.trim() || genre.trim().toUpperCase() === 'GENERAL') {
    return 'Tổng hợp';
  }
  return genre.trim();
};

export const formatReadingDirection = (direction: number | string | undefined) => {
  if (direction === 'Vertical' || direction === 2 || direction === '2') {
    return { label: 'Cuộn dọc', shortLabel: 'Dọc', type: 'vertical' as const };
  }
  if (direction === 'LeftToRight' || direction === 0 || direction === '0') {
    return { label: 'Đọc trái → phải', shortLabel: 'LTR', type: 'ltr' as const };
  }
  return { label: 'Đọc phải → trái', shortLabel: 'RTL', type: 'rtl' as const };
};

export const formatSeriesDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};
