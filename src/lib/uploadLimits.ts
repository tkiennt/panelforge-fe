import type { UploadLimitsDto } from '@/services/uploadLimit.service';

export type UploadKind = 'artwork' | 'referenceImage' | 'coverImage';

export const MIB = 1024 * 1024;

/**
 * Mặc định của Backend (`UploadLimitPolicy.Default*`) khi Admin chưa lưu giới hạn. Chỉ dùng cho lần vẽ đầu trước khi
 * `GET /api/assets/upload-limits` trả về; Backend luôn kiểm lại theo giới hạn thật.
 */
export const DEFAULT_UPLOAD_LIMITS: UploadLimitsDto = {
  artworkMaxBytes: 25 * MIB,
  referenceImageMaxBytes: 10 * MIB,
  coverImageMaxBytes: 5 * MIB,
  artworkCeilingBytes: 50 * MIB,
  imageCeilingBytes: 20 * MIB,
  isDefault: true,
  updatedAt: null,
  updatedByName: null,
};

export const uploadMaxBytes = (limits: UploadLimitsDto, kind: UploadKind): number =>
  kind === 'artwork'
    ? limits.artworkMaxBytes
    : kind === 'referenceImage'
      ? limits.referenceImageMaxBytes
      : limits.coverImageMaxBytes;

/** Số MB gọn (tối đa 1 chữ số thập phân) theo locale, để ghép vào chuỗi i18n `{max}`. */
export const formatMb = (bytes: number, locale?: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / MIB);
