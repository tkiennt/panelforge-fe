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
  coverUrl?: string | null;
  isScriptFrozen?: boolean;
  scriptFrozenAt?: string | null;
  scriptFrozenById?: string | null;
  scriptReopenStatus?: 'None' | 'Requested' | 'Approved' | 'Rejected';
  scriptReopenReason?: string | null;
  scriptReopenRequestedById?: string | null;
  scriptReopenRequestedAt?: string | null;
  scriptContentHash?: string | null;
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

/** Điều kiện cổng kiểm soát Producer trước khi duyệt chương (tất định, không LLM). */
export type ChapterLockGateCode =
  | 'NOT_IN_PRODUCTION'
  | 'NO_PAGES'
  | 'ASSIGNMENTS_NOT_APPROVED'
  | 'OPEN_CHANGE_REQUESTS'
  | 'BLOCKING_FINDINGS'
  | 'SCRIPT_NOT_FROZEN'
  | 'PENDING_AI_SUGGESTIONS'
  | string;

export interface ChapterLockGateItem {
  code: ChapterLockGateCode;
  blocking: boolean;
  count: number;
  message: string;
}

export interface ChapterLockGateDto {
  chapterId: string;
  status: ChapterStatus;
  canApprove: boolean;
  items: ChapterLockGateItem[];
}

/** CF4 / 4.1: bản chụp bất biến của chương lúc Producer duyệt (append-only). */
export interface ChapterSnapshotDto {
  id: string;
  chapterId: string;
  snapshotNumber: number;
  chapterVersion: number;
  createdByUserId: string;
  createdByName?: string | null;
  manifestHash: string;
  /** Bản mới nhất = bản duyệt hiện hành (xem thử, xuất file, phát hành trỏ vào đây). */
  isLatest: boolean;
  createdAt: string;
}

export interface SnapshotPage {
  pageId: string;
  pageNumber: number;
  /** Version event stream canvas; -1 = trang chưa có event nào. */
  canvasStreamVersion: number;
  /** null = trang chưa có artwork cả trang lúc duyệt. */
  artworkReferenceId?: string | null;
  artworkSha256?: string | null;
}

export interface SnapshotManifest {
  chapterId: string;
  chapterVersion: number;
  pages: SnapshotPage[];
  scriptRevisionIds: string[];
  bibleRevisionIds: string[];
}

export interface ChapterSnapshotDetailDto {
  snapshot: ChapterSnapshotDto;
  manifest: SnapshotManifest;
  /** SHA-256 của manifest đang lưu vẫn khớp manifestHash (không bị sửa sau khi tạo). */
  hashVerified: boolean;
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
   * Producer kiểm tra checklist các điều kiện duyệt/khoá chương (GET /api/chapters/{chapterId}/lock-gate)
   */
  getChapterLockGate: async (chapterId: string): Promise<ChapterLockGateDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/lock-gate`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể kiểm tra điều kiện duyệt chương.'));
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
   * CF4 / 4.1: các bản chụp bất biến lúc Producer duyệt chương, mới nhất trước
   * (GET /api/chapters/{chapterId}/snapshots). Quyền: thành viên Workspace.
   */
  getSnapshots: async (chapterId: string): Promise<ChapterSnapshotDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/snapshots`);
      return response.data ?? [];
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải các bản duyệt của chương.'));
    }
  },

  /** Manifest của một snapshot kèm kết quả kiểm hash (GET /api/chapters/{chapterId}/snapshots/{snapshotId}). */
  getSnapshot: async (chapterId: string, snapshotId: string): Promise<ChapterSnapshotDetailDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/snapshots/${snapshotId}`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải chi tiết bản duyệt.'));
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

  /**
   * Kiểm tra rào chắn Series Bible theo Chương (Chapter-Scoped Bible Gate)
   */
  /**
   * Tải ảnh bìa riêng cho chương (PUT /api/chapters/{chapterId}/cover)
   * Multipart/form-data, field `file` (PNG/JPEG/WebP, <= 5 MB)
   * Trả về URL bìa mới: coverUrl
   */
  uploadChapterCover: async (chapterId: string, file: File): Promise<string | null> => {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await axiosClient.put(`/chapters/${chapterId}/cover`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data?.value ?? null;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải ảnh bìa chương.'));
    }
  },

  /** Alias setChapterCover tương tự seriesService.setCover */
  setChapterCover: async (chapterId: string, file: File): Promise<string | null> => {
    return chapterService.uploadChapterCover(chapterId, file);
  },

  /**
   * Xoá ảnh bìa riêng của chương (DELETE /api/chapters/{chapterId}/cover)
   */
  deleteChapterCover: async (chapterId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/chapters/${chapterId}/cover`);
    } catch (error) {
      throw new Error(extractError(error, 'Không thể xóa ảnh bìa chương.'));
    }
  },

  checkBibleGate: async (chapterId: string): Promise<ChapterBibleGateResultDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/bible-gate`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể kiểm tra Chapter Bible Gate.'));
    }
  },

  /**
   * Producer duyệt kịch bản và bắt đầu sản xuất hình ảnh (Freeze Script & Unlock Thumbnail)
   */
  freezeScript: async (chapterId: string): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/freeze-script`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể đóng băng kịch bản để bắt đầu sản xuất.'));
    }
  },

  /**
   * Producer mở lại kịch bản (Unfreeze Script)
   */
  unfreezeScript: async (chapterId: string, reason?: string): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/unfreeze-script`, { reason });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể mở lại kịch bản.'));
    }
  },

  /**
   * Writer gửi yêu cầu mở lại kịch bản kèm lý do (POST /api/chapters/{chapterId}/request-script-reopen)
   */
  requestScriptReopen: async (chapterId: string, reason: string): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/request-script-reopen`, { reason });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể gửi yêu cầu mở lại kịch bản.'));
    }
  },

  /**
   * Producer chấp thuận mở lại kịch bản (POST /api/chapters/{chapterId}/approve-script-reopen)
   */
  approveScriptReopen: async (chapterId: string): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/approve-script-reopen`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể phê duyệt mở lại kịch bản.'));
    }
  },

  /**
   * Producer từ chối yêu cầu mở lại kịch bản (POST /api/chapters/{chapterId}/reject-script-reopen)
   */
  rejectScriptReopen: async (chapterId: string): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/reject-script-reopen`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể từ chối mở lại kịch bản.'));
    }
  },
};

export interface ChapterBibleGateItemDto {
  bibleEntryId: string;
  code: string;
  name: string;
  category: string;
  isReferencedAsSpeaker: boolean;
  isReferencedInScriptLink: boolean;
  hasEffectiveRevision: boolean;
  isLocked: boolean;
  effectiveRevisionVersion?: number | null;
  effectiveFromChapterNumber?: number | null;
  warningCode?: string | null;
  warningMessage?: string | null;
}

export interface ChapterBibleGateResultDto {
  chapterId?: string;
  chapterNumber?: number;
  isPassed: boolean;
  totalReferenced?: number;
  totalReferencedEntries?: number;
  lockedCount: number;
  pendingCount: number;
  items: ChapterBibleGateItemDto[];
}
