/**
 * Danh mục bìa hồ sơ mẫu (public/presets/profile-covers). ID phải khớp Backend
 * `ProfileCoverPresets.Ids`. Ảnh sạch (không chữ/gradient), tỷ lệ 3:1.
 */
export interface ProfileCoverPreset {
  id: string;
  name: string;
  src: string;
  thumb: string;
  /** object-position giữ nhân vật (bên trái) trong khung khi cắt cover. */
  position: string;
}

const preset = (id: string, name: string, position: string): ProfileCoverPreset => ({
  id,
  name,
  src: `/presets/profile-covers/${id}.webp`,
  thumb: `/presets/profile-covers/${id}-thumb.webp`,
  position,
});

export const PROFILE_COVER_PRESETS: ProfileCoverPreset[] = [
  preset('profile-cover-manga-studio', 'Xưởng manga tím', '22% 32%'),
  preset('profile-cover-green-workspace', 'Góc vẽ xanh', '20% 30%'),
  preset('profile-cover-robot-studio', 'Studio robot', '24% 30%'),
  preset('profile-cover-sunny-loft', 'Góc vẽ nắng vàng', '28% 30%'),
  preset('profile-cover-sketch-desk', 'Bàn phác thảo xanh', '30% 25%'),
  preset('profile-cover-cozy-orange', 'Studio cam ấm', '26% 28%'),
];

/** Bìa mặc định khi người dùng chưa chọn (hoặc ID cũ không còn trong danh mục). */
export const DEFAULT_PROFILE_COVER = PROFILE_COVER_PRESETS[0];

export const resolveProfileCover = (presetId?: string | null): ProfileCoverPreset =>
  PROFILE_COVER_PRESETS.find((p) => p.id === presetId) ?? DEFAULT_PROFILE_COVER;
