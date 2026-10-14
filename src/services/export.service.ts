// src/services/export.service.ts
import axiosClient from '../api/axiosClient';

/** UC-12 / UC-14: xuất chương đã duyệt, chạy nền ở Backend. */
export type ExportJobStatus = 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';

/** Mã ExportPreset Backend hỗ trợ dựng file. */
export type ExportPresetCode = 'CBZ' | 'PDF' | 'PAGE_IMAGES' | 'WEBTOON';

export interface ExportJobDto {
  id: string;
  chapterId: string;
  format: string;
  status: ExportJobStatus;
  requestedByUserId: string;
  chapterVersion: number;
  pageCount: number;
  fileName?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  downloadCount: number;
}

function extractError(error: any, defaultMsg: string): Error {
  return new Error(error?.response?.data?.error || error?.response?.data?.message || defaultMsg);
}

export const exportService = {
  /** POST /api/chapters/{chapterId}/exports — xếp hàng một bản xuất (Producer, chương Approved/Published). */
  async createExport(chapterId: string, presetCode: ExportPresetCode): Promise<ExportJobDto> {
    try {
      const res = await axiosClient.post<ExportJobDto>(`/chapters/${chapterId}/exports`, {
        presetCode,
      });
      return res.data;
    } catch (error) {
      throw extractError(error, `Không thể xuất ${presetCode}.`);
    }
  },

  /** GET /api/chapters/{chapterId}/exports — mới nhất trước. */
  async getExports(chapterId: string): Promise<ExportJobDto[]> {
    try {
      const res = await axiosClient.get<ExportJobDto[]>(`/chapters/${chapterId}/exports`);
      return res.data || [];
    } catch (error) {
      throw extractError(error, 'Không thể tải danh sách bản xuất.');
    }
  },

  /** POST /api/chapters/{chapterId}/exports/{jobId}/cancel — chỉ bản còn Queued. */
  async cancelExport(chapterId: string, jobId: string): Promise<ExportJobDto> {
    try {
      const res = await axiosClient.post<ExportJobDto>(
        `/chapters/${chapterId}/exports/${jobId}/cancel`,
      );
      return res.data;
    } catch (error) {
      throw extractError(error, 'Không thể huỷ bản xuất.');
    }
  },

  /** GET /api/chapters/{chapterId}/exports/{jobId}/file — tải file qua API có kiểm quyền rồi lưu về máy. */
  async downloadExport(chapterId: string, job: ExportJobDto): Promise<void> {
    try {
      const res = await axiosClient.get<Blob>(`/chapters/${chapterId}/exports/${job.id}/file`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = job.fileName || `export-${job.id}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      throw extractError(error, 'Không thể tải file xuất.');
    }
  },
};
