// Giới hạn kích thước một file tải lên (Admin đặt cho toàn nền tảng). Backend kiểm lại ở mọi luồng nhận file.
import axiosClient from '../api/axiosClient';
import { getApiErrorMessage } from '@/lib/api-error';

export interface UploadLimitsDto {
  /** Artwork trang/panel và ảnh trang gửi đi nhận diện panel. */
  artworkMaxBytes: number;
  /** Ảnh tham chiếu Bible. */
  referenceImageMaxBytes: number;
  /** Bìa Series/Chương/Studio, avatar và banner Series. */
  coverImageMaxBytes: number;
  /** Mức tối đa Admin được đặt cho artwork (giới hạn request của server). */
  artworkCeilingBytes: number;
  /** Mức tối đa Admin được đặt cho ảnh tham chiếu và ảnh bìa. */
  imageCeilingBytes: number;
  /** true khi Admin chưa lưu: đang dùng mặc định của server. */
  isDefault: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface UpdateUploadLimitsRequest {
  artworkMaxBytes: number;
  referenceImageMaxBytes: number;
  coverImageMaxBytes: number;
}

export const uploadLimitService = {
  async get(): Promise<UploadLimitsDto> {
    try {
      return (await axiosClient.get<UploadLimitsDto>('/assets/upload-limits')).data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'errors.services.uploadLimits.loadFailed'));
    }
  },
  async update(body: UpdateUploadLimitsRequest): Promise<UploadLimitsDto> {
    try {
      return (await axiosClient.put<UploadLimitsDto>('/Admin/upload-limits', body)).data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'errors.services.uploadLimits.saveFailed'));
    }
  },
};
