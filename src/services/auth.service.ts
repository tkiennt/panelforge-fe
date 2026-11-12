// src/services/auth.service.ts
import axiosClient, { REFRESH_TOKEN_KEY, storeRefreshToken } from '../api/axiosClient';

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

export interface CurrentUserDto {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  canCreateStudio: boolean;
  avatar?: string | null;
  avatarUrl?: string | null;
}

export interface LandingWorkspaceDto {
  workspaceId: string;
  name: string;
  role: string;
}

export interface LandingContextDto {
  userId: string;
  systemRole: string;
  canCreateStudio: boolean;
  workspaces: LandingWorkspaceDto[];
  suggestedLanding:
    'AdminDashboard' | 'PublisherPortal' | 'YourWorkspaces' | 'StudioCreation' | 'PublicCatalog';
}

async function parseErrorResponse(error: any, defaultMessage: string): Promise<string> {
  if (error.response) {
    const { data, status } = error.response;
    if (data && typeof data === 'object' && data.message) {
      return data.message;
    }
    if (status === 401) {
      return 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ (401 Unauthorized). Vui lòng đăng nhập lại.';
    }
    if (status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này (403 Forbidden).';
    }
  }
  return defaultMessage;
}

export const authService = {
  /**
   * Lấy thông tin người dùng đang đăng nhập từ BE qua cookie HttpOnly pf_access.
   * Đây là Single Source of Truth để xác định trạng thái đăng nhập khi mở app.
   */
  getMe: async (): Promise<CurrentUserDto> => {
    try {
      const response = await axiosClient.get('/Auth/me');
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, 'Không thể lấy thông tin người dùng hiện tại'),
      );
    }
  },

  login: async (email: string, password: string, rememberDeviceToken?: string) => {
    const tokenToSend =
      rememberDeviceToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('pf_remember_device') || undefined
        : undefined);

    const headers: Record<string, string> = {};
    if (tokenToSend) {
      headers['X-Remember-Device-Token'] = tokenToSend;
    }

    try {
      const response = await axiosClient.post(
        '/Auth/login',
        { email, password, rememberDeviceToken: tokenToSend },
        {
          withCredentials: true,
          headers,
        },
      );
      storeRefreshToken(response.data);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Đăng nhập thất bại'));
    }
  },

  externalLogin: async (idToken: string) => {
    try {
      const response = await axiosClient.post(
        '/Auth/external-login',
        { idToken },
        {
          withCredentials: true,
        },
      );
      storeRefreshToken(response.data);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Đăng nhập bằng mạng xã hội thất bại'));
    }
  },

  register: async (email: string, password: string, fullName: string, phoneNumber?: string) => {
    try {
      const response = await axiosClient.post('/Auth/register', {
        email,
        password,
        fullName,
        phoneNumber,
      });
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Đăng ký thất bại'));
    }
  },

  verifyEmail: async (email: string, token: string) => {
    try {
      const response = await axiosClient.post('/Auth/verify-email', { email, token });
      storeRefreshToken(response.data);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Xác thực mã PIN thất bại'));
    }
  },

  resendVerification: async (email: string) => {
    try {
      const response = await axiosClient.post('/Auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Gửi lại mã xác thực thất bại'));
    }
  },

  enableTwoFactor: async (token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      const response = await axiosClient.post(
        '/Auth/enable-2fa',
        {},
        {
          withCredentials: true,
          headers,
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Không thể tạo mã kích hoạt 2FA'));
    }
  },

  verifyTwoFactor: async (data: VerifyTwoFactorPayload, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await axiosClient.post('/Auth/verify-2fa', data, {
        withCredentials: true,
        headers,
      });
      storeRefreshToken(response.data);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, 'Mã xác thực 2FA không chính xác hoặc đã hết hạn'),
      );
    }
  },

  /** Đăng xuất: gọi POST /Auth/logout không body để BE thu hồi refresh token và xóa 2 cookie pf_access, pf_refresh */
  logout: async () => {
    try {
      await axiosClient.post('/Auth/logout', {});
    } catch {
      // bỏ qua: lỗi mạng không chặn việc dọn dẹp phiên phía FE
    }
  },

  /** Tắt 2FA: POST /Auth/disable-2fa { code, currentPassword? } (currentPassword bắt buộc nếu tài khoản có mật khẩu) */
  disableTwoFactor: async (data: { code: string; currentPassword?: string }) => {
    try {
      const response = await axiosClient.post('/Auth/disable-2fa', data, {
        withCredentials: true,
      });
      return response.data as { message: string };
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Không thể tắt 2FA'));
    }
  },

  forgetDevice: async () => {
    try {
      const response = await axiosClient.post(
        '/Auth/forget-device',
        {},
        {
          withCredentials: true,
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Không thể xóa thiết bị tin cậy'));
    }
  },

  sendChangePasswordOtp: async (token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      const response = await axiosClient.post(
        '/Auth/send-change-password-otp',
        {},
        {
          headers,
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Gửi mã xác thực OTP thất bại'));
    }
  },

  changePassword: async (data: ChangePasswordPayload, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      // BE đọc refresh token từ cookie pf_refresh để giữ lại phiên này, không cần gửi currentRefreshToken trong body
      const response = await axiosClient.post('/Auth/change-password', data, {
        headers,
      });
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Failed to change password'));
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const response = await axiosClient.post('/Auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Yêu cầu đặt lại mật khẩu thất bại'));
    }
  },

  resetPassword: async (data: ResetPasswordPayload) => {
    try {
      const response = await axiosClient.post('/Auth/reset-password', data);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Đặt lại mật khẩu thất bại'));
    }
  },

  getLandingContext: async (customToken?: string): Promise<LandingContextDto> => {
    const headers: Record<string, string> = {};
    if (customToken) {
      headers.Authorization = `Bearer ${customToken}`;
    }

    try {
      const response = await axiosClient.get('/Auth/me/landing-context', {
        headers,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, 'Không thể lấy ngữ cảnh điều hướng landing.'),
      );
    }
  },
};
