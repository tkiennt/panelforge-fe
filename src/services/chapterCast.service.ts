// src/services/chapterCast.service.ts
import axiosClient from '../api/axiosClient';

export type ChapterCastSource = 'Speaker' | 'Highlight';

export interface ChapterCastBoundRevisionDto {
  revisionId: string;
  versionNumber: number;
  variantLabel?: string | null;
  status: string;
  isCanonLocked: boolean;
  referenceImageUrl?: string | null;
  summary?: string | null;
}

export interface ChapterCastPanelRevisionDto {
  panelId: string;
  pageNumber: number;
  panelNumber: number;
  revisionId: string;
  versionNumber: number;
  variantLabel?: string | null;
  status: string;
  isCanonLocked: boolean;
}

export interface ChapterCastAvailableRevisionDto {
  revisionId: string;
  versionNumber: number;
  variantLabel?: string | null;
  status: string;
  isCanonLocked: boolean;
  referenceImageUrl?: string | null;
  summary?: string | null;
}

export interface ChapterCastMentionDto {
  lineId: string;
  lineOrder: number;
  panelId?: string | null;
  pageNumber?: number | null;
  panelNumber?: number | null;
  surfaceText: string;
  kind: number;
}

export interface ChapterCastBlockerDto {
  bibleEntryId: string;
  entryName: string;
  revisionId?: string | null;
  reason: string;
  sourceExplanation?: string | null;
}

export interface ChapterCastSubmitGateDto {
  canSubmit: boolean;
  blockers: ChapterCastBlockerDto[];
}

export interface ChapterCastStartGateDto {
  canStart: boolean;
  blockers: ChapterCastBlockerDto[];
}

export interface ChapterCastItemDto {
  bibleEntryId: string;
  code: string;
  name: string;
  category: number | string;
  isStub: boolean;
  isCrowd: boolean;
  source: ChapterCastSource;
  bibleStatus: string;
  boundRevision?: ChapterCastBoundRevisionDto | null;
  chosenByWriter: boolean;
  inheritedFromChapterNumber?: number | null;
  panelRevisions: ChapterCastPanelRevisionDto[];
  availableRevisions: ChapterCastAvailableRevisionDto[];
  mentions: ChapterCastMentionDto[];
}

export interface ChapterCastDto {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  entities: ChapterCastItemDto[];
  submitGate: ChapterCastSubmitGateDto;
  gate: ChapterCastStartGateDto;
}

export interface SetChapterCastRevisionResultDto {
  chapterId: string;
  bibleEntryId: string;
  boundRevisionId?: string | null;
  chosenByWriter: boolean;
  affectedChapterNumbers: number[];
  warnings: string[];
}

export interface DefineBibleEntryRequest {
  name: string;
  description: string;
  aliases?: string[];
  subtitle?: string | null;
  detailsJson?: string | null;
  referenceImageUrl?: string | null;
  priority?: number;
  strictCheck?: boolean;
  code?: string | null;
}

export const chapterCastService = {
  /**
   * GET /api/chapters/{chapterId}/cast
   * Lấy danh sách thực thể chương, bản gắn (kế thừa/chọn), các bản theo panel, gate blockers (BIB-12, BIB-16).
   */
  getChapterCast: async (chapterId: string): Promise<ChapterCastDto> => {
    const res = await axiosClient.get<ChapterCastDto>(`/chapters/${chapterId}/cast`);
    return res.data;
  },

  /**
   * POST /api/series/{seriesId}/bible/entries/{entryId}/crowd
   * Writer bật/tắt cờ Quần chúng cho mục Bible (BIB-13, 7A, Q19).
   */
  setBibleEntryCrowd: async (seriesId: string, entryId: string, isCrowd: boolean): Promise<any> => {
    const res = await axiosClient.post(`/series/${seriesId}/bible/entries/${entryId}/crowd`, {
      isCrowd,
    });
    return res.data;
  },

  /**
   * POST /api/chapters/{chapterId}/cast/{entryId}/revision
   * Writer đổi bản gắn cho chương hoặc trả về bản kế thừa (revisionId = null) (BIB-13, Q18, Q19, Q23, Q24).
   */
  setChapterCastRevision: async (
    chapterId: string,
    entryId: string,
    revisionId?: string | null,
  ): Promise<SetChapterCastRevisionResultDto> => {
    const res = await axiosClient.post<SetChapterCastRevisionResultDto>(
      `/chapters/${chapterId}/cast/${entryId}/revision`,
      { revisionId: revisionId ?? null },
    );
    return res.data;
  },

  /**
   * POST /api/series/{seriesId}/bible/entries/{entryId}/define
   * Writer định nghĩa cho mục nháp (IsStub) (BIB-13, 4A, Q19).
   */
  defineBibleEntry: async (
    seriesId: string,
    entryId: string,
    payload: DefineBibleEntryRequest,
  ): Promise<any> => {
    const res = await axiosClient.post(
      `/series/${seriesId}/bible/entries/${entryId}/define`,
      payload,
    );
    return res.data;
  },

  /**
   * POST /api/series/{seriesId}/bible/entries/{entryId}/revisions/{revisionId}/cancel-replacement
   * Writer huỷ bản thay thế chưa có sự kiện kiểm duyệt (BIB-09, BIB-13, Q23).
   */
  cancelReplacementRevision: async (
    seriesId: string,
    entryId: string,
    revisionId: string,
  ): Promise<{ success: boolean }> => {
    const res = await axiosClient.post<{ success: boolean }>(
      `/series/${seriesId}/bible/entries/${entryId}/revisions/${revisionId}/cancel-replacement`,
    );
    return res.data;
  },
};
