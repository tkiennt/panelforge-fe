/** Mã khôi phục 2FA do BE cấp: 10 ký tự chữ/số, hiển thị dạng "ABCDE-FGHJK". */

/** Chuẩn hoá khi gõ: viết hoa, chỉ giữ chữ/số/gạch nối, tối đa 11 ký tự (kể cả gạch nối). */
export const normalizeRecoveryInput = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 11);

/** Đủ 10 ký tự chữ/số (gạch nối tuỳ ý) thì gửi được; BE kiểm tra mã thật. */
export const isRecoveryCode = (value: string) => /^[A-Z0-9]{10}$/i.test(value.replace(/-/g, ''));

/** Chỉ giữ chữ số, tối đa 6 (dán "123 456" hay "123-456" vẫn được). */
export const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 6);
