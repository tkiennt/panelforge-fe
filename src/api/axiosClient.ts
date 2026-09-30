import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const REFRESH_TOKEN_KEY = 'refreshToken';

const axiosClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5044/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 401 ở các endpoint này là lỗi nghiệp vụ (sai mật khẩu, sai mã...), không phải hết phiên → không refresh / không đăng xuất
const AUTH_ENDPOINTS =
  /\/Auth\/(login|register|verify-email|verify-2fa|external-login|forgot-password|reset-password|resend-verification|refresh|logout)/i;

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('jwt_token');
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event('auth:unauthorized'));
}

/** Lưu refresh token từ AuthResponse của BE (login / verify-email / verify-2fa / external-login / refresh). */
export function storeRefreshToken(data: { refreshToken?: string | null } | null | undefined) {
  if (data?.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  }
}

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    // Dùng axios trần (không interceptor) để tránh vòng lặp refresh
    const { data } = await axios.post(`${axiosClient.defaults.baseURL}/Auth/refresh`, {
      refreshToken,
    });
    localStorage.setItem('token', data.token);
    storeRefreshToken(data);
    return data.token as string;
  } catch (error) {
    // Refresh token bị từ chối (hết hạn / đã thu hồi) → hết phiên. Lỗi mạng / 5xx thì giữ nguyên phiên.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status && status < 500) clearSession();
    return null;
  }
}

/** Đổi refresh token lấy access token mới. Nhiều request 401 cùng lúc chỉ gọi /Auth/refresh một lần. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// Interceptor để tự động gắn JWT Token vào mọi request
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (hoặc state management của bạn)
    const token = localStorage.getItem('token') || localStorage.getItem('jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (error.response?.status !== 401 || !original || AUTH_ENDPOINTS.test(original.url ?? '')) {
      return Promise.reject(error);
    }

    // Chế độ demo dùng token giả ('mock-...'): 401 không có nghĩa là hết phiên
    if (localStorage.getItem('token')?.startsWith('mock-')) {
      return Promise.reject(error);
    }

    // Access token (30 phút) hết hạn: thử đổi refresh token một lần rồi gửi lại request
    if (!original._retry && localStorage.getItem(REFRESH_TOKEN_KEY)) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(original);
      }
      return Promise.reject(error); // refreshAccessToken đã dọn phiên nếu refresh bị từ chối
    }

    // Không có / đã dùng refresh token mà vẫn 401 → hết phiên
    clearSession();
    return Promise.reject(error);
  },
);

export default axiosClient;
