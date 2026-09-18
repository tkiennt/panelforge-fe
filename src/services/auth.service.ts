// src/services/auth.service.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5044';

async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    if (typeof response.json === 'function') {
      const data = await response.json();
      if (data && typeof data === 'object' && data.message) {
        return data.message;
      }
    }
  } catch {
    // Không thể parse JSON (ví dụ: HTTP 401/403 trả về body rỗng)
  }

  if (response.status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ (401 Unauthorized). Vui lòng đăng nhập lại.';
  }
  if (response.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này (403 Forbidden).';
  }
  return defaultMessage;
}

export const authService = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/Auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Đăng nhập thất bại'));
    }

    return response.json();
  },

  externalLogin: async (idToken: string) => {
    const response = await fetch(`${API_URL}/api/Auth/external-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Backend mong đợi object có field idToken như bạn đã định nghĩa ở DTO
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Đăng nhập bằng mạng xã hội thất bại'));
    }

    return response.json();
  },

  register: async (email: string, password: string, fullName: string, phoneNumber?: string) => {
    const response = await fetch(`${API_URL}/api/Auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName, phoneNumber }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Đăng ký thất bại'));
    }

    return response.json();
  },

  verifyEmail: async (email: string, token: string) => {
    const response = await fetch(`${API_URL}/api/Auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, token }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Xác thực mã PIN thất bại'));
    }

    return response.json();
  },

  resendVerification: async (email: string) => {
    const response = await fetch(`${API_URL}/api/Auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Gửi lại mã xác thực thất bại'));
    }

    return response.json();
  },

  enableTwoFactor: async (token: string) => {
    const response = await fetch(`${API_URL}/api/Auth/enable-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể tạo mã kích hoạt 2FA'));
    }

    return response.json();
  },

  verifyTwoFactor: async (data: { code: string; email?: string }, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/Auth/verify-2fa`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        await parseErrorResponse(response, 'Mã xác thực 2FA không chính xác hoặc đã hết hạn'),
      );
    }

    return response.json();
  },
};
