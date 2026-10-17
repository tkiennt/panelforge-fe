import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Xóa sạch token cũ trong localStorage khi khởi động (chuyển sang cookie HttpOnly pf_access và pf_refresh).
 * Không xoá token giả dùng cho chế độ demo / mock trong test ('mock-...').
 */
export function clearLegacyTokens() {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    // Tạm thời KHÔNG xoá token trong localStorage vì nếu cookie bị lỗi (CORS, SameSite),
    // chúng ta vẫn cần token làm fallback để tránh bị văng đăng nhập khi tải lại trang.
    // const token = localStorage.getItem('token');
    // if (token && !token.startsWith('mock-')) {
    //   localStorage.removeItem('token');
    // }
    localStorage.removeItem('jwt_token');
    // localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

// Chạy dọn dẹp token legacy ngay khi module được nạp
clearLegacyTokens();

const axiosClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5044/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// 401 ở các endpoint này là lỗi nghiệp vụ (sai mật khẩu, sai mã...), không phải hết phiên → không refresh / không đăng xuất
const AUTH_ENDPOINTS =
  /\/Auth\/(login|register|verify-email|verify-2fa|disable-2fa|external-login|forgot-password|reset-password|resend-verification|refresh|logout)/i;

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Đã hết phiên (refresh bị từ chối): chặn các request khác để không lần lượt báo 401, chỉ phát sự kiện một lần.
// Đăng nhập / refresh thành công sẽ mở lại.
let sessionEnded = false;
const SESSION_RESTORE_ENDPOINTS = /\/Auth\/(login|refresh|verify-2fa|external-login)/i;

export function resetSessionEnded() {
  sessionEnded = false;
}

export function clearSession() {
  const alreadyEnded = sessionEnded;
  sessionEnded = true;
  clearLegacyTokens();
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    // Phiên đã kết thúc: bỏ cả token fallback trong localStorage (trừ token demo 'mock-...')
    const token = localStorage.getItem('token');
    if (token && !token.startsWith('mock-')) {
      localStorage.removeItem('token');
    }
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('activeWorkspace');
    if (!alreadyEnded) window.dispatchEvent(new Event('auth:unauthorized'));
  }
}

/**
 * storeRefreshToken được giữ cho tương thích ngược nhưng không lưu vào localStorage
 * (refresh token được lưu an toàn trong cookie HttpOnly pf_refresh do BE cấp).
 */
export function storeRefreshToken(_data?: { refreshToken?: string | null } | null | undefined) {
  // Không lưu refreshToken vào localStorage nữa
}

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    // Dùng axios trần (không interceptor) để tránh vòng lặp refresh
    // Không gửi body, BE đọc cookie HttpOnly pf_refresh (bắt buộc header X-Requested-With và withCredentials)
    const { data } = await axios.post(
      `${axiosClient.defaults.baseURL}/Auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    );
    sessionEnded = false;
    return (data?.token as string) ?? 'ok';
  } catch (error) {
    // Refresh cookie bị từ chối (hết hạn / đã thu hồi) → hết phiên. Lỗi mạng / 5xx thì giữ nguyên phiên.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status && status < 500) clearSession();
    return null;
  }
}

/** Đổi refresh token lấy access token mới qua cookie HttpOnly. Nhiều request 401 cùng lúc chỉ gọi /Auth/refresh một lần. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// Interceptor để tự động gắn header X-Requested-With và withCredentials
axiosClient.interceptors.request.use(
  (config) => {
    // Hết phiên rồi thì huỷ các request cần đăng nhập (tránh chuỗi 401 notifications, workspace...)
    if (
      sessionEnded &&
      !AUTH_ENDPOINTS.test(config.url ?? '') &&
      !localStorage.getItem('token')?.startsWith('mock-')
    ) {
      return Promise.reject(new axios.CanceledError('Phiên đăng nhập đã kết thúc'));
    }
    config.withCredentials = true;
    if (config.headers) {
      if (!config.headers['X-Requested-With']) {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
      }
      // Hỗ trợ chế độ mock dev / demo token hoặc token set thủ công nếu có trong localStorage
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosClient.interceptors.response.use(
  (response) => {
    if (SESSION_RESTORE_ENDPOINTS.test(response.config?.url ?? '')) sessionEnded = false;
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (error.response?.status !== 401 || !original || AUTH_ENDPOINTS.test(original.url ?? '')) {
      return Promise.reject(error);
    }

    // Phiên đã kết thúc: không thử refresh lại cho từng request đang bay
    if (sessionEnded) {
      return Promise.reject(error);
    }

    // Chế độ demo dùng token giả ('mock-...'): 401 không có nghĩa là hết phiên
    if (localStorage.getItem('token')?.startsWith('mock-')) {
      return Promise.reject(error);
    }

    // Access token (30 phút) hết hạn: thử đổi refresh token qua cookie HttpOnly một lần rồi gửi lại request
    if (!original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.withCredentials = true;
        if (original.headers) {
          original.headers['X-Requested-With'] = 'XMLHttpRequest';
          if (newToken !== 'ok') {
            original.headers.Authorization = `Bearer ${newToken}`;
          }
        }
        return axiosClient(original);
      }
      return Promise.reject(error); // refreshAccessToken đã dọn phiên nếu refresh bị từ chối
    }

    // Đã thử refresh mà vẫn 401 → hết phiên
    clearSession();
    return Promise.reject(error);
  },
);

export default axiosClient;
