import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axiosClient, { refreshAccessToken } from './axiosClient';

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

  it('gặp 401 thì đổi refresh token, lưu token mới và gửi lại request thành công', async () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-1');
    const adapter = useAdapter();
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { token: 'new-access', refreshToken: 'refresh-2' } });

    const response = await axiosClient.get('/Workspaces');

    expect(response.status).toBe(200);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy.mock.calls[0][0]).toContain('/Auth/refresh');
    expect(refreshSpy.mock.calls[0][1]).toEqual({ refreshToken: 'refresh-1' });
    expect(localStorage.getItem('token')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-2');
    expect(adapter).toHaveBeenCalledTimes(2); // lần 1: 401, lần 2: gửi lại với token mới
    expect(unauthorizedEvents).toBe(0);
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
