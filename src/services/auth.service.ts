// src/services/auth.service.ts
const API_URL = import.meta.env.VITE_APP_URL;

export interface VerifyTwoFactorPayload {
  code: string;
  email?: string;
  rememberDevice?: boolean;
  deviceName?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
  emailOtp: string;
  otpCode?: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    if (typeof response.json === 'function') {
      const data = await response.json();
      if (data && typeof data === 'object' && data.message) {
        return data.message;
      }
    }
  } catch {
    // Khong the parse JSON
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
  login: async (email: string, password: string, rememberDeviceToken?: string) => {
    const tokenToSend =
      rememberDeviceToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('pf_remember_device') || undefined
        : undefined);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tokenToSend) {
      headers['X-Remember-Device-Token'] = tokenToSend;
    }

    const response = await fetch(`${API_URL}/api/Auth/login`, {
      method: 'POST',
      credentials: 'include', // Bắt buộc để trình duyệt gửi & lưu HTTP-Only Cookie
      headers,
      body: JSON.stringify({ email, password, rememberDeviceToken: tokenToSend }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Đăng nhập thất bại'));
    }

    return response.json();
  },

  externalLogin: async (idToken: string) => {
    const response = await fetch(`${API_URL}/api/Auth/external-login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
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
      credentials: 'include',
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

  verifyTwoFactor: async (data: VerifyTwoFactorPayload, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/Auth/verify-2fa`, {
      method: 'POST',
      credentials: 'include', // Bắt buộc để trình duyệt nhận Set-Cookie pf_remember_device
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

  forgetDevice: async () => {
    const response = await fetch(`${API_URL}/api/Auth/forget-device`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể xóa thiết bị tin cậy'));
    }

    return response.json();
  },

  sendChangePasswordOtp: async (token: string) => {
    const response = await fetch(`${API_URL}/api/Auth/send-change-password-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Gửi mã xác thực OTP thất bại'));
    }

    return response.json();
  },

  changePassword: async (data: ChangePasswordPayload, token: string) => {
    const response = await fetch(`${API_URL}/api/Auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Failed to change password'));
    }

    return response.json();
  },

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_URL}/api/Auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Yêu cầu đặt lại mật khẩu thất bại'));
    }

    return response.json();
  },

  resetPassword: async (data: ResetPasswordPayload) => {
    const response = await fetch(`${API_URL}/api/Auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Đặt lại mật khẩu thất bại'));
    }

    return response.json();
  },
};
