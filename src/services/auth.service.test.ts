import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';

describe('authService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('gửi thông tin đăng nhập đúng format và trả về dữ liệu khi thành công', async () => {
    const mockUserResponse = {
      token: 'mock-jwt-token-xyz',
      user: { id: '1', email: 'artist@panelforge.studio', name: 'Kien Nguyen' },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUserResponse),
    });
    globalThis.fetch = fetchMock;

    const result = await authService.login('artist@panelforge.studio', 'password123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/Auth/login');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual({
      email: 'artist@panelforge.studio',
      password: 'password123',
    });
    expect(result).toEqual(mockUserResponse);
  });

  it('ném ngoại lệ với message từ server khi đăng nhập thất bại', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Tài khoản hoặc mật khẩu không chính xác' }),
    });
    globalThis.fetch = fetchMock;

    await expect(authService.login('wrong@panelforge.studio', 'wrongpass')).rejects.toThrow(
      'Tài khoản hoặc mật khẩu không chính xác',
    );
  });

  it('ném thông báo mặc định khi server lỗi không có message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    globalThis.fetch = fetchMock;

    await expect(authService.login('test@test.com', 'pass')).rejects.toThrow('Đăng nhập thất bại');
  });

  it('xử lý an toàn khi server trả về 401 rỗng body mà không ném lỗi cú pháp JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    });
    globalThis.fetch = fetchMock;

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

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mock2FAResponse),
    });
    globalThis.fetch = fetchMock;

    const result = await authService.enableTwoFactor('sample-bearer-token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/Auth/enable-2fa');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sample-bearer-token',
    });
    expect(result).toEqual(mock2FAResponse);
  });

  it('gọi verifyTwoFactor gửi mã code và trả về kết quả thành công', async () => {
    const mockVerifyResponse = {
      token: 'new-jwt-token',
      user: { email: 'artist@panelforge.studio' },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVerifyResponse),
    });
    globalThis.fetch = fetchMock;

    const result = await authService.verifyTwoFactor({
      code: '123456',
      email: 'artist@panelforge.studio',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/Auth/verify-2fa');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      code: '123456',
      email: 'artist@panelforge.studio',
    });
    expect(result).toEqual(mockVerifyResponse);
  });
});
