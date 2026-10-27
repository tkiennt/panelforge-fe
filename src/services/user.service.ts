// src/services/user.service.ts
import axiosClient from '../api/axiosClient';

export interface UserProfileDto {
  id: string;
  firebaseUid?: string | null;
  username: string;
  email: string;
  avatar?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  /** ID bìa hồ sơ mẫu (null/thiếu = bìa mặc định). Đổi qua PUT /api/users/me/profile-cover. */
  profileCoverPresetId?: string | null;
}

export interface UpdateUserProfileRequest {
  username: string;
  avatar?: string | null;
  phoneNumber?: string | null;
}

async function parseErrorResponse(error: any, defaultMsg: string): Promise<string> {
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && Array.isArray(data.errors[firstKey])) {
        return data.errors[firstKey][0];
      }
    }
  }
  return defaultMsg;
}

export const userService = {
  /**
   * Lấy thông tin hồ sơ của chính người dùng đang đăng nhập (GET /api/users/me)
   */
  getMyProfile: async (): Promise<UserProfileDto> => {
    try {
      const response = await axiosClient.get<UserProfileDto>('/Users/me');
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Không thể tải thông tin hồ sơ người dùng.'));
    }
  },

  /**
   * Đặt bìa hồ sơ của chính mình từ bộ mẫu hệ thống (PUT /api/users/me/profile-cover).
   * presetId = null → về bìa mặc định. ID không hợp lệ → 400.
   */
  setMyProfileCover: async (presetId: string | null): Promise<UserProfileDto> => {
    try {
      const response = await axiosClient.put<UserProfileDto>('/Users/me/profile-cover', {
        presetId,
      });
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Không thể lưu ảnh bìa hồ sơ.'));
    }
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân theo PostgreSQL User ID (PUT /api/users/{id})
   */
  updateProfile: async (id: string, request: UpdateUserProfileRequest): Promise<UserProfileDto> => {
    try {
      const response = await axiosClient.put<UserProfileDto>(`/Users/${id}`, request);
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Cập nhật hồ sơ người dùng thất bại.'));
    }
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân theo Firebase UID (PUT /api/users/firebase/{firebaseUid})
   */
  updateProfileByFirebaseUid: async (
    firebaseUid: string,
    request: UpdateUserProfileRequest,
  ): Promise<UserProfileDto> => {
    try {
      const response = await axiosClient.put<UserProfileDto>(
        `/Users/firebase/${firebaseUid}`,
        request,
      );
      return response.data;
    } catch (error) {
      throw new Error(await parseErrorResponse(error, 'Cập nhật hồ sơ qua Firebase UID thất bại.'));
    }
  },
};
