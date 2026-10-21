/**
 * Bộ ảnh có sẵn của hệ thống (public/presets) để người dùng chọn thay vì tải ảnh từ máy.
 * Đường dẫn tương đối theo origin của Frontend nên dùng được ở mọi môi trường.
 */
export interface SystemImage {
  id: string;
  name: string;
  url: string;
}

const numbers = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

export const SYSTEM_AVATARS: SystemImage[] = numbers(6).map((n) => ({
  id: `avatar-A${n}`,
  name: `Avatar ${n}`,
  url: `/presets/avatars/avatar-A${n}.png`,
}));

export const SYSTEM_COVERS: SystemImage[] = numbers(4).map((n) => ({
  id: `cover-B${n}`,
  name: `Bìa ${n}`,
  url: `/presets/covers/cover-B${n}.png`,
}));

export const isSystemAvatarUrl = (url: string) => SYSTEM_AVATARS.some((a) => a.url === url);

/** Tải ảnh hệ thống về thành File để gửi qua API upload sẵn có (giữ nguyên kiểm tra phía Backend). */
export const systemImageToFile = async (img: SystemImage): Promise<File> => {
  const res = await fetch(img.url);
  if (!res.ok) throw new Error('Không tải được ảnh có sẵn của hệ thống.');
  const blob = await res.blob();
  return new File([blob], `${img.id}.png`, { type: blob.type || 'image/png' });
};
