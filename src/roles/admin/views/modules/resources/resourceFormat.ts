import { useTranslation } from '@/lib/i18n';
import { formatBytes, ResourceType } from '@/services/resource.service';

export const useLocale = () => {
  const { lang } = useTranslation();
  return lang === 'en' ? 'en-US' : 'vi-VN';
};

/** Định dạng một giới hạn/mức dùng theo loại tài nguyên (byte cho Storage, số đếm cho AI). */
export function formatAmount(type: ResourceType, value: number, locale: string): string {
  return type === 'Storage' ? formatBytes(value, locale) : value.toLocaleString(locale);
}
