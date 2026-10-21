/**
 * Ảnh mẫu cho avatar/banner Series. ID khớp Backend `SeriesImagePresets` — khi chọn, Backend tự đọc file mẫu
 * của nó và lưu lên kho asset (R2); thumbnail ở đây chỉ để xem trước trên Frontend.
 */
import { PROFILE_COVER_PRESETS } from './profileCovers';

export interface SeriesImagePreset {
  id: string;
  name: string;
  /** Ảnh xem trước (static FE). */
  preview: string;
  thumb: string;
  position: string;
}

export const SERIES_AVATAR_PRESETS: SeriesImagePreset[] = Array.from({ length: 6 }, (_, i) => ({
  id: `series-avatar-a${i + 1}`,
  name: `Avatar ${i + 1}`,
  preview: `/presets/avatars/avatar-A${i + 1}.png`,
  thumb: `/presets/avatars/avatar-A${i + 1}.png`,
  position: '50% 50%',
}));

export const SERIES_BANNER_PRESETS: SeriesImagePreset[] = PROFILE_COVER_PRESETS.map((p) => ({
  id: p.id.replace('profile-cover-', 'series-banner-'),
  name: p.name,
  preview: p.src,
  thumb: p.thumb,
  position: p.position,
}));

/** Chủ thể của bộ banner mẫu nằm bên trái; ảnh tự tải lên dùng vị trí này để giữ phần trái khi cắt. */
export const SERIES_BANNER_POSITION = '25% 35%';

export const SERIES_IMAGE_RULES = {
  accept: 'image/png,image/jpeg,image/webp',
  maxBytes: 5 * 1024 * 1024,
  label: 'PNG, JPEG hoặc WebP · tối đa 5 MB',
} as const;
