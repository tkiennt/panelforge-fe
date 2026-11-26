// src/services/bible.service.ts
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

export type BibleCategory =
  'Character' | 'Location' | 'Prop' | 'Terminology' | 'StyleRule' | 'PlotFact' | number;

export type BiblePriority = 'Low' | 'Standard' | 'StrictCheck' | 'High' | 'CanonCritical' | number;

export type BibleRevisionEventType =
  | 'Created'
  | 'ConceptSubmitted'
  | 'ReworkRequested'
  | 'Endorsed'
  | 'Locked'
  | 'Superseded'
  /** BE 2026-11-17: Writer định nghĩa lại bản nháp v1 tạo từ stub (không phải bước duyệt). */
  | 'DraftOverwritten';

export interface BibleRevisionEventDto {
  id: string;
  type: BibleRevisionEventType;
  actorId: string | null;
  comment: string | null;
  imageUrl: string | null;
  eventHash: string;
  createdAt: string;
  conceptVersionNumber?: number | null;
  assetSha256?: string | null;
}

export type BibleReviewStatus = 'Draft' | 'ConceptSubmitted' | 'ReworkRequired' | 'CanonLocked';

export interface WriterEndorsementDto {
  endorsed: boolean;
  endorsedByName?: string | null;
  endorsedAt?: string | null;
  conceptVersion?: number | null;
}

export interface BibleEntryRevisionDto {
  id: string;
  bibleEntryId: string;
  versionNumber: number;
  summary: string;
  snapshotJson: string;
  contentHash: string;
  authorId?: string | null;
  artistUserId?: string | null;
  reviewStatus?: BibleReviewStatus;
  reworkFeedback?: string | null;
  associatedChapterId?: string | null;
  isInitialVersion: boolean;
  createdAt: string;
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedById?: string | null;
  stageName?: string | null;
  age?: string | null;
  artistNotes?: string | null;
  referenceImageUrl?: string | null;
  conceptImageUrl?: string | null;
  events?: BibleRevisionEventDto[] | null;
  supersedesRevisionId?: string | null;
  currentConceptEventId?: string | null;
  currentConceptVersionNumber?: number | null;
  writerEndorsement?: WriterEndorsementDto | null;
}

export interface BibleEntryDto {
  id: string;
  seriesBibleId: string;
  category: BibleCategory;
  code: string;
  name: string;
  subtitle?: string | null;
  description: string;
  detailsJson: string;
  age?: string | null;
  artistNotes?: string | null;
  referenceImageUrl?: string | null;
  priority?: BiblePriority;
  strictCheck?: boolean;
  isActive?: boolean;
  effectiveRevision?: BibleEntryRevisionDto | null;
  pendingReviewRevision?: BibleEntryRevisionDto | null;
  createdAt: string;
  updatedAt?: string | null;
  isStub?: boolean;
  isCrowd?: boolean;
  aliases?: string[];
  latestDraftVersionNumber?: number | null;
}

export interface SeriesBibleDto {
  id: string;
  seriesId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  version: number;
  entries: BibleEntryDto[];
}

export interface CreateBibleEntryRequest {
  category: BibleCategory;
  name: string;
  description: string;
  code?: string;
  subtitle?: string;
  detailsJson?: string;
  referenceImageUrl?: string;
  priority?: BiblePriority;
  strictCheck?: boolean;
  variantLabel?: string;
  stageName?: string;
  isCrowd?: boolean;
  age?: string;
  artistNotes?: string;
}

export interface DefineBibleEntryRequest {
  name: string;
  description: string;
  subtitle?: string;
  detailsJson?: string;
  referenceImageUrl?: string;
  priority?: BiblePriority;
  strictCheck?: boolean;
  code?: string;
  age?: string;
  artistNotes?: string;
}

export interface ConfirmBibleRevisionRequest {
  conceptEventId?: string;
}

export interface BibleConceptCommentDto {
  id: string;
  revisionId: string;
  conceptEventId: string;
  parentCommentId?: string | null;
  authorId: string;
  body: string;
  region?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  replies: BibleConceptCommentDto[];
}

export interface CreateConceptCommentRequest {
  body: string;
  conceptEventId?: string;
  region?: string;
}

export interface ReplyConceptCommentRequest {
  body: string;
}

export interface BibleReferenceImageDto {
  url: string;
  sha256: string;
  contentType: string;
  sizeBytes: number;
}

export interface AddBibleEntryRevisionRequest {
  expectedVersionNumber?: number;
  summary: string;
  name: string;
  description: string;
  subtitle?: string;
  detailsJson?: string;
  referenceImageUrl?: string;
  priority?: BiblePriority;
  strictCheck?: boolean;
  variantLabel?: string;
  stageName?: string;
  age?: string;
  artistNotes?: string;
  /** Phiên bản gốc đang sửa (BE dùng để giữ đúng biến thể khi mục có nhiều biến thể). */
  targetRevisionId?: string;
}

/** Producer thay thế bản đã khoá: nội dung mới + lý do; chương hiệu lực lấy theo bản bị thay. */
export type SupersedeBibleEntryRevisionRequest = Omit<
  AddBibleEntryRevisionRequest,
  'summary' | 'variantLabel' | 'stageName'
> & { reason: string };

function extractError(error: any, defaultMsg: string): any {
  const message = error.response?.data?.error || error.response?.data?.message || defaultMsg;
  const err: any = new Error(message);
  err.code =
    error.response?.data?.code || (error.response?.status === 409 ? 'CONFLICT' : undefined);
  err.status = error.response?.status;
  return err;
}

export const bibleService = {
  async getSeriesBible(seriesId: string): Promise<SeriesBibleDto> {
    try {
      const response = await axiosClient.get(`/series/${seriesId}/bible`);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.getFailed'));
    }
  },

  async deleteRevision(seriesId: string, entryId: string, revisionId: string): Promise<void> {
    try {
      await axiosClient.delete(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}`,
      );
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.deleteRevisionFailed'));
    }
  },

  /**
   * Producer tải ảnh reference sheet lên kho (POST /api/series/{seriesId}/bible/assets).
   * Trả về URL để gán vào referenceImageUrl của entry/revision.
   */
  async uploadReferenceImage(seriesId: string, file: File): Promise<BibleReferenceImageDto> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosClient.post(`/series/${seriesId}/bible/assets`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.uploadReferenceImageFailed'));
    }
  },

  /**
   * GET /api/panels/{panelId}/bible — mục Bible của các nhân vật nói trong Panel, bản canon đã khoá.
   * Dùng cho drawer tham chiếu trong task của Artist (UC-07 bước 1, BR-15).
   */
  async getPanelBible(panelId: string): Promise<BibleEntryDto[]> {
    try {
      const response = await axiosClient.get(`/panels/${panelId}/bible`);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.getPanelBibleFailed'));
    }
  },

  async createBibleEntry(seriesId: string, data: CreateBibleEntryRequest): Promise<BibleEntryDto> {
    try {
      const response = await axiosClient.post(`/series/${seriesId}/bible/entries`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.createEntryFailed'));
    }
  },

  async addRevision(
    seriesId: string,
    entryId: string,
    data: AddBibleEntryRevisionRequest,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.addRevisionFailed'));
    }
  },

  /** Các chương có kịch bản dùng mục này (người nói hoặc @Tag) và đã đạt điều kiện Canon của Gate 1 chưa. */
  async getEntryUsages(seriesId: string, entryId: string): Promise<BibleEntryUsageDto[]> {
    try {
      const response = await axiosClient.get(`/series/${seriesId}/bible/entries/${entryId}/usages`);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.getEntryUsagesFailed'));
    }
  },

  async getEntryHistory(seriesId: string, entryId: string): Promise<BibleEntryRevisionDto[]> {
    try {
      const response = await axiosClient.get(
        `/series/${seriesId}/bible/entries/${entryId}/history`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.getEntryHistoryFailed'));
    }
  },

  /**
   * Producer thay thế một bản đã khoá (POST .../revisions/{revisionId}/supersede): tạo bản mới cùng chương, khoá luôn.
   * Bản cũ giữ nguyên trong lịch sử, không có thao tác mở khoá (V1.2).
   */
  async supersedeRevision(
    seriesId: string,
    entryId: string,
    revisionId: string,
    data: SupersedeBibleEntryRevisionRequest,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/supersede`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.supersedeRevisionFailed'));
    }
  },

  /**
   * Lấy hàng đợi thiết kế Series Bible cho Artist (các mục Draft hoặc ReworkRequired)
   */
  async getBibleDesignQueue(seriesId: string): Promise<BibleDesignQueueItemDto[]> {
    try {
      const response = await axiosClient.get(`/series/${seriesId}/bible/design-queue`);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.getDesignQueueFailed'));
    }
  },

  /**
   * Artist nộp bản vẽ Concept Art/Model Sheet
   */
  async submitConceptArt(
    seriesId: string,
    entryId: string,
    data: SubmitConceptArtRequest,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/concept`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.submitConceptArtFailed'));
    }
  },

  /**
   * V2.6 (Q20): Editor xác nhận bản vẽ Concept = khoá Canon (chỉ Editor; Editor khác Artist đã nộp).
   */
  async confirmRevision(
    seriesId: string,
    entryId: string,
    revisionId: string,
    data?: ConfirmBibleRevisionRequest,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/confirm`,
        data || {},
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.confirmRevisionFailed'));
    }
  },

  /**
   * Writer xác nhận tạo hình (soft endorsement, non-blocking) trên bản ConceptSubmitted.
   */
  async endorseRevision(
    seriesId: string,
    revisionId: string,
    endorse = true,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/revisions/${revisionId}/endorse`,
        { endorse },
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.endorseRevisionFailed'));
    }
  },

  /**
   * Tạo biến thể song song (New Variant) cho mục Bible mà không làm thay đổi bản CanonLocked hiện tại.
   */
  async createVariant(
    seriesId: string,
    entryId: string,
    data: AddBibleEntryRevisionRequest,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/variants`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.createVariantFailed'));
    }
  },

  /**
   * Writer huỷ bản nháp thay thế (supersede) chưa khoá.
   */
  async cancelReplacement(seriesId: string, revisionId: string): Promise<void> {
    try {
      await axiosClient.delete(
        `/series/${seriesId}/bible/revisions/${revisionId}/cancel-replacement`,
      );
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.cancelReplacementFailed'));
    }
  },

  /**
   * Writer bật/tắt cờ Quần chúng cho mục Bible (BIB-13, 7A, Q19).
   */
  async setBibleEntryCrowd(
    seriesId: string,
    entryId: string,
    isCrowd: boolean,
  ): Promise<BibleEntryDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/crowd`,
        { isCrowd },
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.setCrowdFailed'));
    }
  },

  /**
   * Writer viết định nghĩa cho mục nháp (IsStub) (BIB-13, 4A, Q19).
   */
  async defineBibleEntry(
    seriesId: string,
    entryId: string,
    data: DefineBibleEntryRequest,
  ): Promise<BibleEntryDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/define`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.defineEntryFailed'));
    }
  },

  /**
   * Lấy danh sách góp ý và thảo luận của một revision (BIB-10).
   */
  async getConceptComments(
    seriesId: string,
    entryId: string,
    revisionId: string,
  ): Promise<BibleConceptCommentDto[]> {
    try {
      const response = await axiosClient.get(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/comments`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.getConceptCommentsFailed'));
    }
  },

  /**
   * Thêm góp ý gốc cho một phiên bản ConceptArt (chỉ Writer và Editor).
   */
  async createConceptComment(
    seriesId: string,
    entryId: string,
    revisionId: string,
    data: CreateConceptCommentRequest,
  ): Promise<BibleConceptCommentDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/comments`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.createConceptCommentFailed'));
    }
  },

  /**
   * Trả lời góp ý (chỉ Writer, Editor, Artist).
   */
  async replyConceptComment(
    seriesId: string,
    entryId: string,
    revisionId: string,
    commentId: string,
    data: ReplyConceptCommentRequest,
  ): Promise<BibleConceptCommentDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/comments/${commentId}/replies`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.replyConceptCommentFailed'));
    }
  },

  /**
   * Đánh dấu góp ý đã được xử lý (chỉ Writer và Editor).
   */
  async resolveConceptComment(
    seriesId: string,
    entryId: string,
    revisionId: string,
    commentId: string,
    resolve: boolean = true,
  ): Promise<BibleConceptCommentDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/comments/${commentId}/resolve?resolve=${resolve}`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.resolveConceptCommentFailed'));
    }
  },

  /**
   * Writer/Editor yêu cầu sửa đổi thiết kế (Rework)
   */
  async requestReworkRevision(
    seriesId: string,
    entryId: string,
    revisionId: string,
    data: RequestReworkBibleRevisionRequest,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const payload = {
        reason: data.reason || data.reworkReason || '',
        reworkReason: data.reworkReason || data.reason || '',
      };
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/request-rework`,
        payload,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.bible.requestReworkFailed'));
    }
  },
};

/** BE: BibleEntryUsageDto (GetBibleEntryUsagesQuery). */
export interface BibleEntryUsageDto {
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  lineCount: number;
  isScriptFrozen: boolean;
  isCanonSatisfied: boolean;
}

export interface BibleDesignQueueItemDto {
  entryId: string;
  seriesId?: string;
  code: string;
  name: string;
  category: BibleCategory;
  revisionId: string;
  reviewStatus: BibleReviewStatus;
  reworkFeedback?: string | null;
  artistUserId?: string | null;
  referenceImageUrl?: string | null;
  variantLabel?: string | null;
  stageName?: string | null;
  versionNumber?: number;
  createdAt?: string;
  updatedAt: string;
  isStub?: boolean;
  isPriorityRework?: boolean;
  waitingChapterNumbers?: number[] | null;
}

export interface SubmitConceptArtRequest {
  imageAssetUrl?: string;
  referenceImageUrl?: string;
  imageSha256?: string;
  assetSha256?: string;
  variantLabel?: string;
  note?: string;
  summary?: string;
  name?: string;
  description?: string;
  subtitle?: string;
  detailsJson?: string;
  expectedVersionNumber?: number;
  revisionId?: string;
}

export interface RequestReworkBibleRevisionRequest {
  reason?: string;
  reworkReason?: string;
}
