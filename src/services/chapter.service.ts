// src/services/chapter.service.ts
import axiosClient from '../api/axiosClient';

export type ChapterStatus = 'InProduction' | 'Approved' | 'Locked' | 'Published';

export interface ChapterDto {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title?: string | null;
  targetReleaseDate?: string | null; // ISO Date "YYYY-MM-DD"
  versionVector: number;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  scenesCount: number;
  pagesCount: number;
  status?: ChapterStatus;
  publishedAt?: string | null;
  outline?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateChapterRequest {
  chapterNumber: number;
  title?: string | null;
  targetReleaseDate?: string | null; // YYYY-MM-DD
  outline?: string | null;
}

export interface UpdateChapterRequest {
  title?: string | null;
  targetReleaseDate?: string | null; // YYYY-MM-DD
  incrementVersion?: boolean;
  outline?: string | null;
}

export type ChapterReviewAction =
  'ProducerApproved' | 'ProducerReopened' | 'PublisherRejected' | 'PublisherPublished';

export interface ChapterReviewDto {
  id: string;
  chapterId: string;
  action: ChapterReviewAction;
  actorUserId: string;
  comment?: string | null;
  scheduledAt?: string | null;
  chapterVersion: number;
  createdAt: string;
}

export interface ReopenChapterRequest {
  comment: string;
}

export interface PublishChapterRequest {
  publishAt?: string | null;
}

function extractError(error: any, defaultMsg: string): string {
  return error.response?.data?.error || error.response?.data?.message || defaultMsg;
}

export const chapterService = {
  /**
   * Lấy danh sách chương của Series (Release Calendar) phân trang (GET /api/series/{seriesId}/chapters)
   */
  getChaptersBySeries: async (
    seriesId: string,
    pageIndex = 1,
    pageSize = 20,
  ): Promise<PagedResult<ChapterDto>> => {
    try {
      const response = await axiosClient.get(`/series/${seriesId}/chapters`, {
        params: { pageIndex, pageSize },
      });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải danh sách chương của Series.'));
    }
  },

  /**
   * Tạo chương mới kèm lịch phát hành mục tiêu (POST /api/series/{seriesId}/chapters) (UC-03)
   */
  createChapter: async (seriesId: string, data: CreateChapterRequest): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/series/${seriesId}/chapters`, data);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tạo chương mới.'));
    }
  },

  /**
   * Lấy chi tiết chương (GET /api/chapters/{chapterId})
   */
  getChapterById: async (chapterId: string): Promise<any> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể lấy thông tin chi tiết chương.'));
    }
  },

  /**
   * Cập nhật thông tin chương & lịch phát hành TargetReleaseDate (PUT /api/chapters/{chapterId})
   */
  updateChapter: async (chapterId: string, data: UpdateChapterRequest): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.put(`/chapters/${chapterId}`, data);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể cập nhật chương.'));
    }
  },

  /**
   * Xóa mềm chương (DELETE /api/chapters/{chapterId})
   */
  deleteChapter: async (chapterId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/chapters/${chapterId}`);
    } catch (error) {
      throw new Error(extractError(error, 'Không thể xóa chương.'));
    }
  },

  /**
   * Producer duyệt chương hoàn tất sản xuất (POST /api/chapters/{chapterId}/approve)
   * Chuyển trạng thái từ InProduction -> Approved
   */
  approveChapter: async (chapterId: string): Promise<ChapterReviewDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/approve`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể duyệt chương.'));
    }
  },

  /**
   * Producer hoặc Publisher mở lại/từ chối chương kèm lý do (POST /api/chapters/{chapterId}/reopen)
   * Chuyển trạng thái từ Approved -> InProduction
   */
  reopenChapter: async (chapterId: string, comment: string): Promise<ChapterReviewDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/reopen`, { comment });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể mở lại/từ chối chương.'));
    }
  },

  /**
   * Publisher xuất bản hoặc lên lịch xuất bản chương (POST /api/chapters/{chapterId}/publish)
   * Chuyển trạng thái từ Approved -> Published
   */
  publishChapter: async (
    chapterId: string,
    publishAt?: string | null,
  ): Promise<ChapterReviewDto> => {
    try {
      const payload: PublishChapterRequest = {};
      if (publishAt) {
        payload.publishAt = publishAt;
      }
      const response = await axiosClient.post(`/chapters/${chapterId}/publish`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể xuất bản chương.'));
    }
  },

  /**
   * Lấy lịch sử các mốc phê duyệt/xuất bản của chương (GET /api/chapters/{chapterId}/reviews)
   */
  getChapterReviews: async (chapterId: string): Promise<ChapterReviewDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/reviews`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể lấy lịch sử phê duyệt của chương.'));
    }
  },

  /**
   * Cập nhật đề cương chương (PUT /api/chapters/{chapterId}/outline)
   * Quyền: Producer hoặc Writer. Chương Approved/Published -> 409
   */
  updateOutline: async (
    chapterId: string,
    outline: string | null,
  ): Promise<{ value: string | null }> => {
    try {
      const response = await axiosClient.put(`/chapters/${chapterId}/outline`, { outline });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể cập nhật đề cương chương.'));
    }
  },
};
