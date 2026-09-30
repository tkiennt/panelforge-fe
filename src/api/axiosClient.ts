import axios from 'axios';

const axiosClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5044/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  (error) => {
    if (error.response?.status === 401) {
      // Xử lý logic logout nếu token hết hạn
      localStorage.removeItem('token');
      localStorage.removeItem('jwt_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
