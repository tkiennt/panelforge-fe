// src/services/chapter.service.ts
import axiosClient from '../api/axiosClient';
import type { ScriptLineKind, ScriptLineRefInput } from './scriptLine.service';
import type { AssignmentDto } from './assignment.service';
import type { ChapterCastBlockerDto } from './chapterCast.service';

export interface ScriptTreeCast {
  entryId: string;
  revisionId: string;
}

export interface ScriptTreeLine {
  id?: string | null;
  kind: ScriptLineKind;
  speakerLabel?: string | null;
  text?: string | null;
  refs?: ScriptLineRefInput[] | null;
}

export interface ScriptTreePanel {
  id?: string | null;
  number: number;
  direction?: string | null;
  castRevisions?: ScriptTreeCast[] | null;
  lines?: ScriptTreeLine[] | null;
}

export interface ScriptTreePage {
  id?: string | null;
  number: number;
  panels?: ScriptTreePanel[] | null;
}

export interface ChapterScriptBody {
  expectedRevisionId?: string | null;
  pages?: ScriptTreePage[] | null;
}

export interface SaveChapterScriptResult {
  revisionId: string;
  versionNumber: number;
  created: boolean;
  warnings: string[];
}

export interface SubmitChapterScriptResult {
  revisionId: string;
  versionNumber: number;
  created: boolean;
  warnings: string[];
  chapter: ChapterDto;
}

export type ChapterStatus =
  'PreProduction' | 'InProduction' | 'ChapterApproved' | 'HandedOffAndPublished';

export interface ProductionPageAssignmentRequest {
  artistId: string;
  pageFrom: number;
  pageTo: number;
}

export interface StartChapterProductionRequest {
  pageAssignments: ProductionPageAssignmentRequest[];
  lettererAssignments?: ProductionPageAssignmentRequest[] | null;
}

export interface StartChapterProductionResultDto {
  chapter: ChapterDto;
  assignments: AssignmentDto[];
}

/** D12: vòng đời kịch bản Draft ↔ InReview → Frozen. */
export type ScriptStatus = 'Draft' | 'InReview' | 'Frozen';

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
  isLocked?: boolean;
  priceVnd?: number;
  scriptStatus?: ScriptStatus;
  scriptSubmittedAt?: string | null;
  /** Phiên bản đã gửi duyệt (push) gần nhất và lần trước — để so sánh từng dòng. */
  lastSubmittedVersionId?: string | null;
  previousSubmittedVersionId?: string | null;
}

/** Một hàng kịch bản theo thứ tự đọc; `key` ổn định giữa các phiên bản. */
export interface ScriptVersionRow {
  key: string;
  /** page · panel · Action · Dialogue · Thought · Narration · Sfx */
  type: string;
  page: number;
  panel: number;
  label?: string | null;
  text: string;
}

/** Lưu = commit, gửi duyệt = push (`submittedAt`). */
export interface ScriptVersionSummaryDto {
  id: string;
  versionNumber: number;
  message: string;
  authorUserId: string;
  authorName?: string | null;
  createdAt: string;
  lineCount: number;
  contentHash: string;
  submittedAt?: string | null;
}

export interface ScriptVersionDetailDto {
  version: ScriptVersionSummaryDto;
  rows: ScriptVersionRow[];
}

export interface ScriptWorkingCopyDto {
  contentHash: string;
  lineCount: number;
  rows: ScriptVersionRow[];
}

/** D12: góp ý theo dòng trên kịch bản (Editor / Producer), không đổi trạng thái kịch bản. */
export interface ScriptCommentDto {
  id: string;
  chapterId: string;
  sceneId?: string | null;
  scriptLineId?: string | null;
  quotedText?: string | null;
  body: string;
  authorUserId: string;
  authorName?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedById?: string | null;
}

export interface AddScriptCommentRequest {
  sceneId?: string | null;
  scriptLineId?: string | null;
  quotedText?: string | null;
  body: string;
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
  isLocked?: boolean;
  priceVnd?: number;
}

export interface UpdateChapterRequest {
  title?: string | null;
  targetReleaseDate?: string | null; // YYYY-MM-DD
  incrementVersion?: boolean;
  outline?: string | null;
  isLocked?: boolean;
  priceVnd?: number;
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
  | 'TASK_GRID_NOT_APPROVED'
  | 'OPEN_CHANGE_REQUESTS'
  | 'BLOCKING_FINDINGS'
  | 'IMPACT_FLAGS'
  | 'PAGES_WITHOUT_WORK'
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
  /**
   * Nộp toàn bộ bản thảo chương sang hàng đợi thẩm định của Editor/Producer (POST /api/chapters/{chapterId}/submit-manuscript)
   * Độc lập, không bắt buộc phải có phân công việc (Assign) trước đó.
   */
  submitManuscript: async (chapterId: string, stageId?: string): Promise<any> => {
    try {
      const url = stageId
        ? `/chapters/${chapterId}/submit-manuscript?stageId=${encodeURIComponent(stageId)}`
        : `/chapters/${chapterId}/submit-manuscript`;
      const response = await axiosClient.post(url);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể nộp bản thảo chương.'));
    }
  },

  approveChapter: async (chapterId: string): Promise<ChapterReviewDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/approve`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể duyệt chương.'));
    }
  },

  /**
   * Producer bàn giao chương đã duyệt cho Publisher phát hành (POST /api/chapters/{chapterId}/hand-off)
   * Chuyển trạng thái ChapterApproved -> HandedOff
   */
  handOffChapter: async (chapterId: string): Promise<ChapterReviewDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/hand-off`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể bàn giao chương cho Publisher.'));
    }
  },

  /**
   * Producer mở lại chương đã duyệt để sản xuất lại (POST /api/chapters/{chapterId}/reopen)
   * Chuyển trạng thái từ Approved -> InProduction
   */
  reopenChapter: async (chapterId: string, comment: string): Promise<ChapterReviewDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/reopen`, { comment });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể mở lại chương.'));
    }
  },

  /**
   * Publisher xuất bản / lên lịch ấn bản sau khi Producer bàn giao (POST /api/chapters/{chapterId}/publish)
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

  /** D12: góp ý theo dòng của chương. */
  getScriptComments: async (chapterId: string): Promise<ScriptCommentDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/script-comments`);
      return response.data ?? [];
    } catch (error) {
      throw new Error(extractError(error, 'Không tải được góp ý kịch bản.'));
    }
  },

  addScriptComment: async (
    chapterId: string,
    data: AddScriptCommentRequest,
  ): Promise<ScriptCommentDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/script-comments`, data);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không gửi được góp ý.'));
    }
  },

  resolveScriptComment: async (chapterId: string, commentId: string): Promise<ScriptCommentDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/script-comments/${commentId}/resolve`,
      );
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không đánh dấu được góp ý.'));
    }
  },

  /** Phiên bản kịch bản, mới nhất trước. */
  getScriptVersions: async (chapterId: string): Promise<ScriptVersionSummaryDto[]> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/script-versions`);
      return response.data ?? [];
    } catch (error) {
      throw new Error(extractError(error, 'Không tải được danh sách phiên bản.'));
    }
  },

  getScriptVersion: async (
    chapterId: string,
    versionId: string,
  ): Promise<ScriptVersionDetailDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/script-versions/${versionId}`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không tải được phiên bản.'));
    }
  },

  /** Kịch bản hiện tại (chưa commit). */
  getScriptWorkingCopy: async (chapterId: string): Promise<ScriptWorkingCopyDto> => {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/script-versions/working-copy`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không tải được kịch bản hiện tại.'));
    }
  },

  /**
   * SCR-14: PUT /api/chapters/{chapterId}/script — lưu cả cây Trang → Panel → dòng của chương trong một request
   */
  saveChapterScript: async (
    chapterId: string,
    body: ChapterScriptBody,
    message?: string,
  ): Promise<SaveChapterScriptResult> => {
    try {
      const response = await axiosClient.put(`/chapters/${chapterId}/script`, body, {
        params: message ? { message } : undefined,
      });
      return response.data;
    } catch (error: any) {
      const err: any = new Error(extractError(error, 'Không thể lưu kịch bản.'));
      err.status = error.response?.status;
      err.code =
        error.response?.data?.code || (error.response?.status === 409 ? 'CONFLICT' : undefined);
      err.response = error.response;
      throw err;
    }
  },

  /**
   * SCR-14: POST /api/chapters/{chapterId}/script/submit — lưu cả kịch bản rồi gửi duyệt trong cùng một transaction
   */
  submitChapterScript: async (
    chapterId: string,
    body: ChapterScriptBody,
    message?: string,
  ): Promise<SubmitChapterScriptResult> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/script/submit`, body, {
        params: message ? { message } : undefined,
      });
      return response.data;
    } catch (error: any) {
      const err: any = new Error(extractError(error, 'Không thể gửi duyệt kịch bản.'));
      err.status = error.response?.status;
      err.code =
        error.response?.data?.code || (error.response?.status === 409 ? 'CONFLICT' : undefined);
      err.response = error.response;
      throw err;
    }
  },

  /** D12: chỉ Writer rút kịch bản về sửa (InReview → Draft). */
  recallScript: async (chapterId: string): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/recall-script`);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể rút kịch bản về sửa.'));
    }
  },

  /**
   * Gate 1 — Producer duyệt kịch bản và bắt đầu sản xuất (InReview / PreProduction → InProduction)
   * POST /api/chapters/{chapterId}/start-production
   */
  startProduction: async (
    chapterId: string,
    body: StartChapterProductionRequest,
  ): Promise<StartChapterProductionResultDto> => {
    try {
      const response = await axiosClient.post<StartChapterProductionResultDto>(
        `/chapters/${chapterId}/start-production`,
        body,
      );
      return response.data;
    } catch (error: any) {
      const msg = extractError(error, 'Không thể bắt đầu sản xuất chương.');
      const err: any = new Error(msg);
      err.status = error.response?.status;
      err.code = error.response?.data?.code;
      err.blockers = error.response?.data?.blockers;
      err.response = error.response;
      throw err;
    }
  },

  /**
   * Producer mở lại kịch bản (Unfreeze Script)
   */
  unfreezeScript: async (chapterId: string, reason: string): Promise<ChapterDto> => {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/unfreeze-script`, { reason });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể mở lại kịch bản.'));
    }
  },
};
