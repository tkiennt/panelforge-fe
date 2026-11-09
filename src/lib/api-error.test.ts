import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { getApiErrorMessage } from './api-error';

describe('getApiErrorMessage utility', () => {
  it('dịch mã lỗi chuẩn (code) từ Backend response sang tiếng Việt', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          code: 'ERR_SERIES_NOT_FOUND',
          error: 'Bộ truyện không tìm thấy trong hệ thống',
        },
      },
    };

    // Giả lập Axios error
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const message = getApiErrorMessage(error);
    expect(message).toBe('Không tìm thấy truyện. Bộ truyện không tồn tại hoặc đã gỡ bỏ.');
  });

  it('fallback về data.error của backend nếu code chưa có trong từ điển', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          code: 'ERR_CUSTOM_UNKNOWN_CODE',
          error: 'Lỗi đặc thù từ server',
        },
      },
    };

    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const message = getApiErrorMessage(error);
    expect(message).toBe('Lỗi đặc thù từ server');
  });

  it('lấy message trực tiếp nếu backend trả về error hoặc message', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          error: 'Dữ liệu không đúng định dạng',
        },
      },
    };

    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    expect(getApiErrorMessage(error)).toBe('Dữ liệu không đúng định dạng');

    const errorWithMessage = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          message: 'Lỗi kết nối CSDL',
        },
      },
    };

    expect(getApiErrorMessage(errorWithMessage)).toBe('Lỗi kết nối CSDL');
  });

  it('lấy Error.message từ JavaScript Error thông thường', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    const jsError = new Error('Lỗi mạng cục bộ');
    expect(getApiErrorMessage(jsError)).toBe('Lỗi mạng cục bộ');
  });

  it('fallback về key chỉ định hoặc errors.unknown nếu không có thông tin lỗi', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    const unknownError = null;
    expect(getApiErrorMessage(unknownError)).toBe(
      'Lỗi ngoài dự kiến. Không thể hoàn tất thao tác, hãy tải lại trang.',
    );

    expect(getApiErrorMessage(unknownError, 'errors.ERR_UNAUTHORIZED')).toBe(
      'Hết phiên đăng nhập. Mã xác thực đã hết hạn, hãy đăng nhập lại.',
    );
  });
});
