import axios from 'axios';
import { translate } from '@/lib/i18n';

interface ApiErrorResponse {
  code?: string;
  error?: string;
  message?: string;
  details?: unknown;
}

/**
 * Trích xuất và bản địa hóa thông báo lỗi từ API response hoặc generic error.
 * 1. Nếu có `code` từ Backend, ưu tiên tra cứu theo key `errors.${code}`.
 * 2. Nếu không có mã hoặc key chưa dịch, fallback về `error.response?.data?.error` hoặc `message`.
 * 3. Cuối cùng fallback về `translate(fallbackKey)`.
 */
export function getApiErrorMessage(error: unknown, fallbackKey = 'common.errors.unknown'): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as ApiErrorResponse;

    // 1. Kiểm tra mã lỗi máy đọc được (ví dụ ERR_SERIES_NOT_FOUND, NOT_FOUND)
    if (data.code && typeof data.code === 'string') {
      const errorKey = `errors.${data.code}`;
      const backendMessage =
        typeof data.error === 'string' && data.error.trim()
          ? data.error
          : typeof data.message === 'string' && data.message.trim()
            ? data.message
            : undefined;

      const translated = translate(errorKey, undefined, undefined, backendMessage);

      // Nếu translate tìm thấy bản dịch hợp lệ khác chính key
      if (translated && translated !== errorKey) {
        return translated;
      }
      if (backendMessage) {
        return backendMessage;
      }
    }

    // 2. Không có code hoặc code chưa đăng ký: lấy message trực tiếp từ backend nếu có
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  } else if (error instanceof Error && error.message) {
    return error.message;
  }

  // 3. Fallback cuối cùng theo key chỉ định (hoặc errors.unknown)
  const fallbackTranslation = translate(fallbackKey);
  if (fallbackTranslation && fallbackTranslation !== fallbackKey) {
    return fallbackTranslation;
  }

  return translate(
    'errors.unknown',
    undefined,
    undefined,
    'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.',
  );
}
