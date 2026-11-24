import { useTranslation } from '@/lib/i18n';

/** Định dạng số và VNĐ theo ngôn ngữ giao diện. */
export const useMoney = () => {
  const { t, lang } = useTranslation('publisher');
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const num = (n: number) => n.toLocaleString(locale);
  return { num, vnd: (n: number) => t('currency.vnd', { amount: num(n) }) };
};
