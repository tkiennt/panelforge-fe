// src/services/auth.service.ts
import axiosClient, { REFRESH_TOKEN_KEY, storeRefreshToken } from '../api/axiosClient';
import { translate } from '@/lib/i18n';

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
  /** GET /api/Auth/me: 2FA (TOTP) đang bật cho tài khoản. */
  twoFactorEnabled?: boolean;
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
      return translate('errors.services.auth.unauthorized');
    }
    if (status === 403) {
      return translate('errors.services.auth.forbidden');
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
        await parseErrorResponse(error, translate('errors.services.auth.getMeFailed')),
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
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.loginFailed')),
      );
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
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.externalLoginFailed')),
      );
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
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.registerFailed')),
      );
    }
  },

  verifyEmail: async (email: string, token: string) => {
    try {
      const response = await axiosClient.post('/Auth/verify-email', { email, token });
      storeRefreshToken(response.data);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.verifyEmailFailed')),
      );
    }
  },

  resendVerification: async (email: string) => {
    try {
      const response = await axiosClient.post('/Auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.resendVerificationFailed')),
      );
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
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.enableTwoFactorFailed')),
      );
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
        await parseErrorResponse(error, translate('errors.services.auth.verifyTwoFactorFailed')),
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
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.disableTwoFactorFailed')),
      );
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
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.forgetDeviceFailed')),
      );
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
      throw new Error(
        await parseErrorResponse(
          error,
          translate('errors.services.auth.sendChangePasswordOtpFailed'),
        ),
      );
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
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.forgotPasswordFailed')),
      );
    }
  },

  resetPassword: async (data: ResetPasswordPayload) => {
    try {
      const response = await axiosClient.post('/Auth/reset-password', data);
      return response.data;
    } catch (error) {
      throw new Error(
        await parseErrorResponse(error, translate('errors.services.auth.resetPasswordFailed')),
      );
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
        await parseErrorResponse(error, translate('errors.services.auth.getLandingContextFailed')),
      );
    }
  },
};
