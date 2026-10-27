import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { authService } from './auth.service';

// Giữ nguyên các hàm tiện ích thật (storeRefreshToken, REFRESH_TOKEN_KEY), chỉ giả lập các method HTTP
vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const post = vi.mocked(axiosClient.post);
const get = vi.mocked(axiosClient.get);

describe('authService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('gọi getMe thành công trả về thông tin người dùng từ /Auth/me', async () => {
    const mockUser = {
      id: 'u-1',
      email: 'artist@panelforge.studio',
      fullName: 'Artist Name',
      role: 'User',
      canCreateStudio: true,
    };
    get.mockResolvedValue({ data: mockUser });

    const result = await authService.getMe();

    expect(get).toHaveBeenCalledWith('/Auth/me');
    expect(result).toEqual(mockUser);
  });

  it('gửi thông tin đăng nhập đúng format và trả về dữ liệu khi thành công', async () => {
    const mockUserResponse = {
      token: 'mock-jwt-token-xyz',
      user: { id: '1', email: 'artist@panelforge.studio', name: 'Kien Nguyen' },
    };
    post.mockResolvedValue({ data: mockUserResponse });

    const result = await authService.login('artist@panelforge.studio', 'password123');

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/Auth/login',
      {
        email: 'artist@panelforge.studio',
        password: 'password123',
        rememberDeviceToken: undefined,
      },
      expect.objectContaining({ withCredentials: true }),
    );
    expect(result).toEqual(mockUserResponse);
  });

  it('không lưu refreshToken vào localStorage khi đăng nhập (chuyển sang HttpOnly cookie)', async () => {
    post.mockResolvedValue({ data: { token: 'jwt', refreshToken: 'refresh-abc', user: {} } });

    await authService.login('artist@panelforge.studio', 'password123');

    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('không ghi đè refreshToken khi response không có refreshToken (vd: cần 2FA)', async () => {
    localStorage.setItem('refreshToken', 'cu');
    post.mockResolvedValue({ data: { requiresTwoFactor: true, twoFactorEmail: 'a@b.c' } });

    await authService.login('a@b.c', 'pw');

    expect(localStorage.getItem('refreshToken')).toBe('cu');
  });

  it('ném ngoại lệ với message từ server khi đăng nhập thất bại', async () => {
    post.mockRejectedValue({
      response: { status: 401, data: { message: 'Tài khoản hoặc mật khẩu không chính xác' } },
    });

    await expect(authService.login('wrong@panelforge.studio', 'wrongpass')).rejects.toThrow(
      'Tài khoản hoặc mật khẩu không chính xác',
    );
  });

  it('ném thông báo mặc định khi server lỗi không có message', async () => {
    post.mockRejectedValue({ response: { status: 500, data: {} } });

    await expect(authService.login('test@test.com', 'pass')).rejects.toThrow('Đăng nhập thất bại');
  });

  it('xử lý an toàn khi server trả về 401 rỗng body mà không ném lỗi cú pháp JSON', async () => {
    post.mockRejectedValue({ response: { status: 401, data: '' } });

    await expect(authService.enableTwoFactor('invalid-token')).rejects.toThrow(
      'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ (401 Unauthorized). Vui lòng đăng nhập lại.',
    );
  });

  it('gọi enableTwoFactor với Bearer token và trả về thông tin QR code', async () => {
    const mock2FAResponse = {
      sharedKey: 'JBSWY3DPEHPK3PXP',
      authenticatorUri: 'otpauth://totp/PanelForge:test?secret=JBSWY3DPEHPK3PXP',
      formattedKey: 'JBSW Y3DP EHPK 3PXP',
    };
    post.mockResolvedValue({ data: mock2FAResponse });

    const result = await authService.enableTwoFactor('sample-bearer-token');

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/Auth/enable-2fa',
      {},
      expect.objectContaining({ headers: { Authorization: 'Bearer sample-bearer-token' } }),
    );
    expect(result).toEqual(mock2FAResponse);
  });

  it('gọi verifyTwoFactor gửi mã code và trả về kết quả thành công', async () => {
    const mockVerifyResponse = {
      token: 'new-jwt-token',
      user: { email: 'artist@panelforge.studio' },
    };
    post.mockResolvedValue({ data: mockVerifyResponse });

    const result = await authService.verifyTwoFactor({
      code: '123456',
      email: 'artist@panelforge.studio',
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/Auth/verify-2fa',
      { code: '123456', email: 'artist@panelforge.studio' },
      expect.objectContaining({ withCredentials: true }),
    );
    expect(result).toEqual(mockVerifyResponse);
  });

  it('gọi verifyTwoFactor kèm cờ rememberDevice và withCredentials', async () => {
    const mockVerifyResponse = {
      token: 'jwt-with-remember-device',
      user: { email: 'artist@panelforge.studio' },
    };
    post.mockResolvedValue({ data: mockVerifyResponse });

    const result = await authService.verifyTwoFactor({
      code: '654321',
      email: 'artist@panelforge.studio',
      rememberDevice: true,
    });

    expect(post).toHaveBeenCalledWith(
      '/Auth/verify-2fa',
      { code: '654321', email: 'artist@panelforge.studio', rememberDevice: true },
      expect.objectContaining({ withCredentials: true }),
    );
    expect(result).toEqual(mockVerifyResponse);
  });

  it('logout gọi POST /Auth/logout không body (cookie được BE xóa tự động)', async () => {
    post.mockResolvedValue({ data: {} });

    await authService.logout();

    expect(post).toHaveBeenCalledWith('/Auth/logout', {});
  });

  it('changePassword không cần gửi currentRefreshToken (BE đọc từ cookie pf_refresh)', async () => {
    post.mockResolvedValue({ data: { message: 'ok' } });

    await authService.changePassword(
      { currentPassword: 'Old1!', newPassword: 'New1!aa', emailOtp: '123456' },
      'access-1',
    );

    expect(post).toHaveBeenCalledWith(
      '/Auth/change-password',
      { currentPassword: 'Old1!', newPassword: 'New1!aa', emailOtp: '123456' },
      { headers: { Authorization: 'Bearer access-1' } },
    );
  });

  it('logout nuốt lỗi mạng để không chặn việc đăng xuất phía FE', async () => {
    post.mockRejectedValue(new Error('Network Error'));

    await expect(authService.logout()).resolves.toBeUndefined();
  });
});
