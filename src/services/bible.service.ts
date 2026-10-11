// src/services/bible.service.ts
import axiosClient from '../api/axiosClient';

export type BibleCategory =
  'Character' | 'Location' | 'Prop' | 'Terminology' | 'StyleRule' | 'PlotFact' | number;

export type BiblePriority = 'Low' | 'Standard' | 'StrictCheck' | 'High' | 'CanonCritical' | number;

export interface BibleEntryRevisionDto {
  id: string;
  bibleEntryId: string;
  versionNumber: number;
  summary: string;
  snapshotJson: string;
  contentHash: string;
  authorId?: string | null;
  associatedChapterId?: string | null;
  effectiveFromChapterNumber: number;
  isInitialVersion: boolean;
  createdAt: string;
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedById?: string | null;
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
  referenceImageUrl?: string | null;
  priority: BiblePriority;
  strictCheck: boolean;
  isActive: boolean;
  effectiveRevision?: BibleEntryRevisionDto | null;
  createdAt: string;
  updatedAt?: string | null;
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
  code: string;
  name: string;
  description: string;
  subtitle?: string;
  detailsJson?: string;
  referenceImageUrl?: string;
  priority?: BiblePriority;
  strictCheck?: boolean;
  effectiveFromChapterNumber?: number;
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
  effectiveFromChapterNumber?: number;
}

/** Producer thay thế bản đã khoá: nội dung mới + lý do; chương hiệu lực lấy theo bản bị thay. */
export type SupersedeBibleEntryRevisionRequest = Omit<
  AddBibleEntryRevisionRequest,
  'summary' | 'effectiveFromChapterNumber'
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
      throw extractError(error, 'Không thể tải Series Bible.');
    }
  },

  async getBibleEntriesAtChapter(
    seriesId: string,
    chapterNumber: number,
  ): Promise<BibleEntryDto[]> {
    try {
      const response = await axiosClient.get(
        `/series/${seriesId}/bible/at-chapter/${chapterNumber}`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, `Không thể tải Bible cho Chapter ${chapterNumber}.`);
    }
  },

  async getSeriesBibleAtChapter(
    seriesId: string,
    chapterNumber: number,
  ): Promise<{ entries: BibleEntryDto[] }> {
    const entries = await this.getBibleEntriesAtChapter(seriesId, chapterNumber);
    return { entries };
  },

  async createBibleEntry(seriesId: string, data: CreateBibleEntryRequest): Promise<BibleEntryDto> {
    try {
      const response = await axiosClient.post(`/series/${seriesId}/bible/entries`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tạo mục Series Bible.');
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
      throw extractError(error, 'Không thể tạo phiên bản mới cho mục Bible.');
    }
  },

  async getEntryHistory(seriesId: string, entryId: string): Promise<BibleEntryRevisionDto[]> {
    try {
      const response = await axiosClient.get(
        `/series/${seriesId}/bible/entries/${entryId}/history`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tải lịch sử phiên bản của mục.');
    }
  },

  /**
   * Producer duyệt và khoá một revision của mục Nhân vật (POST /api/series/{seriesId}/bible/entries/{entryId}/revisions/{revisionId}/lock)
   */
  async lockRevision(
    seriesId: string,
    entryId: string,
    revisionId: string,
  ): Promise<BibleEntryRevisionDto> {
    try {
      const response = await axiosClient.post(
        `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/lock`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể khoá phiên bản mục Bible.');
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
      throw extractError(error, 'Không thể thay thế bản đã khoá.');
    }
  },
};
