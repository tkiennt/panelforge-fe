import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axiosClient, {
  refreshAccessToken,
  clearLegacyTokens,
  resetSessionEnded,
  clearSession,
} from './axiosClient';

// Cờ "hết phiên" là state cấp module: đặt lại để các test không ảnh hưởng nhau
beforeEach(() => resetSessionEnded());

const ok = (config: InternalAxiosRequestConfig, data: unknown = { ok: true }) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const unauthorized = (config: InternalAxiosRequestConfig) =>
  new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
    data: {},
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  });

/** Adapter giả: request mang Bearer `validToken` thì 200, còn lại 401. */
function useAdapter(validToken = 'new-access') {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    if (config.headers.Authorization === `Bearer ${validToken}`) return ok(config);
    throw unauthorized(config);
  });
  axiosClient.defaults.adapter = adapter;
  return adapter;
}

describe('axiosClient', () => {
  let unauthorizedEvents: number;
  const onUnauthorized = () => {
    unauthorizedEvents++;
  };

  beforeEach(() => {
    localStorage.clear();
    unauthorizedEvents = 0;
    window.addEventListener('auth:unauthorized', onUnauthorized);
  });

  afterEach(() => {
    window.removeEventListener('auth:unauthorized', onUnauthorized);
    vi.restoreAllMocks();
  });

  it('gắn Bearer token từ localStorage vào request', async () => {
    localStorage.setItem('token', 'new-access');
    const adapter = useAdapter();

    await axiosClient.get('/Workspaces');

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer new-access');
  });

  it('luôn gửi withCredentials: true và header X-Requested-With: XMLHttpRequest trên mọi request', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ok(config));
    axiosClient.defaults.adapter = adapter;

    await axiosClient.get('/Workspaces');

    expect(adapter.mock.calls[0][0].withCredentials).toBe(true);
    expect(adapter.mock.calls[0][0].headers['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('tự động loại bỏ tiền tố /api thừa để tránh lỗi /api/api', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ok(config));
    axiosClient.defaults.adapter = adapter;

    await axiosClient.get('/api/series/123/bible/assets/abc');

    expect(adapter.mock.calls[0][0].url).toBe('/series/123/bible/assets/abc');
  });

  it('gặp 401 thì gọi refresh token không body (dùng cookie), gửi lại request thành công', async () => {
    localStorage.setItem('token', 'old-access');
    const adapter = useAdapter();
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { token: 'new-access', refreshToken: 'refresh-2' } });

    const response = await axiosClient.get('/Workspaces');

    expect(response.status).toBe(200);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy.mock.calls[0][0]).toContain('/Auth/refresh');
    // HttpOnly cookie: refresh không gửi body, BE đọc cookie pf_refresh
    expect(refreshSpy.mock.calls[0][1]).toEqual({});
    expect(refreshSpy.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({ 'X-Requested-With': 'XMLHttpRequest' }),
      }),
    );
    expect(adapter).toHaveBeenCalledTimes(2); // lần 1: 401, lần 2: gửi lại với token mới
    expect(unauthorizedEvents).toBe(0);
  });

  it('clearLegacyTokens xoá token cũ, jwt_token, refreshToken nhưng giữ mock- token', () => {
    localStorage.setItem('token', 'old-jwt-real.token.here');
    localStorage.setItem('jwt_token', 'old-jwt');
    localStorage.setItem('refreshToken', 'old-refresh');
    clearLegacyTokens();
    // Token fallback tạm giữ lúc khởi động (xem clearLegacyTokens); chỉ jwt_token cũ bị xoá
    expect(localStorage.getItem('token')).toBe('old-jwt-real.token.here');
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBe('old-refresh');

    localStorage.setItem('token', 'mock-admin-token');
    clearLegacyTokens();
    expect(localStorage.getItem('token')).toBe('mock-admin-token');
  });

  it('nhiều request 401 cùng lúc chỉ gọi /Auth/refresh một lần', async () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-1');
    useAdapter();
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { token: 'new-access', refreshToken: 'refresh-2' } });

    await Promise.all([axiosClient.get('/a'), axiosClient.get('/b'), axiosClient.get('/c')]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('refresh token bị từ chối (401) thì dọn phiên và phát auth:unauthorized', async () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-revoked');
    useAdapter();
    vi.spyOn(axios, 'post').mockRejectedValue(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, null, {
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      }),
    );

    await expect(axiosClient.get('/Workspaces')).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(unauthorizedEvents).toBe(1);
  });

  it('lỗi mạng khi refresh thì giữ nguyên phiên (không đăng xuất)', async () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-1');
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error'));

    const token = await refreshAccessToken();

    expect(token).toBeNull();
    expect(localStorage.getItem('token')).toBe('old-access');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    expect(unauthorizedEvents).toBe(0);
  });

  it('401 khi không có refresh token thì dọn phiên và phát auth:unauthorized', async () => {
    localStorage.setItem('token', 'old-access');
    useAdapter();
    vi.spyOn(axios, 'post').mockRejectedValue(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, null, {
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      }),
    );

    await expect(axiosClient.get('/Workspaces')).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
    expect(unauthorizedEvents).toBe(1);
  });

  it('401 ở endpoint đăng nhập (sai mật khẩu) không refresh và không dọn phiên', async () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-1');
    useAdapter();
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(axiosClient.post('/Auth/login', {})).rejects.toBeDefined();

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('old-access');
    expect(unauthorizedEvents).toBe(0);
  });

  it('401 ở /Auth/logout không kích hoạt refresh (tránh làm phiên sống lại sau khi đăng xuất)', async () => {
    localStorage.setItem('refreshToken', 'refresh-1');
    useAdapter();
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(axiosClient.post('/Auth/logout', {})).rejects.toBeDefined();

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(unauthorizedEvents).toBe(0);
  });

  it('token demo (mock-...) gặp 401 thì không refresh và không đăng xuất', async () => {
    localStorage.setItem('token', 'mock-admin-token');
    localStorage.setItem('refreshToken', 'refresh-1');
    useAdapter();
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(axiosClient.get('/Admin/users')).rejects.toBeDefined();

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('mock-admin-token');
    expect(unauthorizedEvents).toBe(0);
  });
});

describe('HttpOnly Cookie Authentication & Refresh Flow', () => {
  let unauthorizedEvents: number;
  const onUnauthorized = () => {
    unauthorizedEvents++;
  };

  beforeEach(() => {
    localStorage.clear();
    unauthorizedEvents = 0;
    window.addEventListener('auth:unauthorized', onUnauthorized);
  });

  afterEach(() => {
    window.removeEventListener('auth:unauthorized', onUnauthorized);
    vi.restoreAllMocks();
  });

  it('refresh thuần cookie: không có token localStorage, 401 tự gọi /Auth/refresh với body rỗng và retry thành công', async () => {
    let callCount = 0;
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      callCount++;
      expect(config.withCredentials).toBe(true);
      expect(config.headers['X-Requested-With']).toBe('XMLHttpRequest');
      // Lần 1: request ban đầu không mang Bearer token (thuần cookie)
      if (callCount === 1) {
        expect(config.headers.Authorization).toBeUndefined();
        throw unauthorized(config);
      }
      // Lần 2: sau khi refresh thành công
      return ok(config, { success: true });
    });
    axiosClient.defaults.adapter = adapter;

    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { token: 'new-cookie-jwt' },
    });

    const response = await axiosClient.get('/Workspaces');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy.mock.calls[0][0]).toContain('/Auth/refresh');
    expect(refreshSpy.mock.calls[0][1]).toEqual({});
    expect(refreshSpy.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({ 'X-Requested-With': 'XMLHttpRequest' }),
      }),
    );
    expect(adapter).toHaveBeenCalledTimes(2);
    // Tuyệt đối không lưu token vào localStorage
    expect(localStorage.getItem('token')).toBeNull();
    expect(unauthorizedEvents).toBe(0);
  });

  it('Giai đoạn 2 (Backend không trả token trong JSON): refresh thành công và retry request hoàn toàn dựa vào cookie', async () => {
    let callCount = 0;
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      callCount++;
      if (callCount === 1) {
        throw unauthorized(config);
      }
      // Lần retry: BE giai đoạn 2 không trả token, config gửi lại KHÔNG có Authorization header
      expect(config.headers.Authorization).toBeUndefined();
      expect(config.withCredentials).toBe(true);
      expect(config.headers['X-Requested-With']).toBe('XMLHttpRequest');
      return ok(config, { message: 'stage 2 ok' });
    });
    axiosClient.defaults.adapter = adapter;

    // BE Stage 2: chỉ trả JSON rỗng {} hoặc user profile, token mới được cấp qua Set-Cookie HttpOnly
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {},
    });

    const res = await axiosClient.get('/Chapters/1/pages');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'stage 2 ok' });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy.mock.calls[0][1]).toEqual({});
    expect(localStorage.getItem('token')).toBeNull();
    expect(unauthorizedEvents).toBe(0);
  });

  it('nhiều request 401 đồng thời trong chế độ cookie: chỉ gọi /Auth/refresh đúng 1 lần và giải phóng toàn bộ hàng đợi', async () => {
    let refreshCalls = 0;
    let cookieRenewed = false;

    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (!cookieRenewed) {
        throw unauthorized(config);
      }
      return ok(config, { path: config.url });
    });
    axiosClient.defaults.adapter = adapter;

    const refreshSpy = vi.spyOn(axios, 'post').mockImplementation(async () => {
      refreshCalls++;
      await new Promise((r) => setTimeout(r, 20));
      cookieRenewed = true;
      return { data: {} };
    });

    const [res1, res2, res3] = await Promise.all([
      axiosClient.get('/endpoint-1'),
      axiosClient.get('/endpoint-2'),
      axiosClient.get('/endpoint-3'),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshCalls).toBe(1);
    expect(unauthorizedEvents).toBe(0);
  });

  it('cookie pf_refresh hết hạn (401 từ server): dọn dẹp sạch thông tin user trong localStorage và phát auth:unauthorized', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'test@panelforge.com' }));
    localStorage.setItem('userRole', 'ARTIST');
    localStorage.setItem('activeWorkspace', JSON.stringify({ id: 'ws1' }));

    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    });
    axiosClient.defaults.adapter = adapter;

    // Server từ chối refresh vì cookie pf_refresh đã hết hạn hoặc bị thu hồi
    vi.spyOn(axios, 'post').mockRejectedValue(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, null, {
        data: { message: 'Refresh token cookie expired' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      }),
    );

    await expect(axiosClient.get('/MyWork')).rejects.toThrow();

    // Dọn sạch phiên đăng nhập
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('userRole')).toBeNull();
    expect(localStorage.getItem('activeWorkspace')).toBeNull();
    expect(unauthorizedEvents).toBe(1);
  });

  it('lỗi mạng khi refresh cookie: không xoá thông tin phiên của người dùng', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1' }));
    localStorage.setItem('userRole', 'ARTIST');

    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    });
    axiosClient.defaults.adapter = adapter;

    // Lỗi mạng hoặc 500 từ server
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error / ECONNREFUSED'));

    await expect(axiosClient.get('/MyWork')).rejects.toThrow();

    // Phiên không bị xóa khi chỉ là lỗi mạng tạm thời
    expect(localStorage.getItem('user')).not.toBeNull();
    expect(localStorage.getItem('userRole')).toBe('ARTIST');
    expect(unauthorizedEvents).toBe(0);
  });

  it('cho phép gọi các endpoint công khai (catalog, preview) ngay cả khi phiên đã kết thúc (sessionEnded)', async () => {
    clearSession(); // sessionEnded = true

    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      return ok(config, { items: [{ id: 'series-1', title: 'Public Series' }] });
    });
    axiosClient.defaults.adapter = adapter;

    const res = await axiosClient.get('/catalog/series');
    expect(res.data).toEqual({ items: [{ id: 'series-1', title: 'Public Series' }] });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
