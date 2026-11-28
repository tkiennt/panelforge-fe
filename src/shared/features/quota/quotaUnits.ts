// Đổi giữa giá trị hạn mức của API (byte / token / ảnh) và ô nhập trên form (GB / số).
import type { QuotaResourceType } from '@/services/quota.service';

const BYTES_PER_GB = 1024 * 1024 * 1024;

export const QUOTA_RESOURCE_TYPES: QuotaResourceType[] = [
  'Storage',
  'AiTokens',
  'AiImages',
  'AiRequests',
];

/** Giá trị đưa vào ô nhập: GB (1 chữ số thập phân) cho dung lượng, số nguyên cho token/ảnh. */
export const toQuotaInput = (type: QuotaResourceType, value: number): string =>
  type === 'Storage' ? String(Number((value / BYTES_PER_GB).toFixed(1))) : String(value);

/** null khi ô nhập không phải số ≥ 0. */
export const fromQuotaInput = (type: QuotaResourceType, input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return type === 'Storage' ? Math.round(n * BYTES_PER_GB) : Math.round(n);
};

export const formatQuotaValue = (
  type: QuotaResourceType,
  value: number,
  locale: string,
): string => {
  if (type === 'Storage') {
    const gb = value / BYTES_PER_GB;
    return `${gb.toLocaleString(locale, { maximumFractionDigits: gb < 10 ? 2 : 1 })} GB`;
  }
  return value.toLocaleString(locale);
};
