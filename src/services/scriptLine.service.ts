// src/services/scriptLine.service.ts
import axiosClient from '../api/axiosClient';

export type NarrationMode =
  'Present' | 'Flashback' | 'Dream' | 'Imagination' | 'Lie' | 'Rumor' | 'UnreliableNarrator';

export enum ScriptLineKind {
  Action = 1,
  Dialogue = 2,
  Thought = 3,
  Narration = 4,
  Sfx = 5,
}

export interface SceneDto {
  id: string;
  chapterId: string;
  sceneNumber: number;
  heading?: string | null;
  summary?: string | null;
  sceneName?: string | null;
  slugline?: string | null;
  location?: string | null;
  timeOfDay?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  scriptLinesCount: number;
  pagesCount: number;
  defaultNarrationMode?: NarrationMode;
  /** BR-11 / CF4 4.2: gửi lại làm expectedVersion khi sửa scene (thiếu ở BE cũ). */
  version?: number;
}

export interface SceneScriptLineSummaryDto {
  id: string;
  lineOrder: number;
  kind?: ScriptLineKind | number | string;
  speakerLabel?: string | null;
  text?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  panelId?: string | null;
  bibleEntryIds?: string[];
  narrationMode?: NarrationMode;
}

export interface SceneDetailDto {
  id: string;
  chapterId: string;
  sceneNumber: number;
  heading?: string | null;
  summary?: string | null;
  sceneName?: string | null;
  slugline?: string | null;
  location?: string | null;
  timeOfDay?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  scriptLines: SceneScriptLineSummaryDto[];
  defaultNarrationMode?: NarrationMode;
  /** BR-11 / CF4 4.2: gửi lại làm expectedVersion khi sửa scene. */
  version?: number;
}

export interface ScriptLineDto {
  id: string;
  sceneId: string;
  lineOrder: number;
  kind?: ScriptLineKind | number | string;
  speakerLabel?: string | null;
  text?: string | null;
  speakerCharacterId?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  panelId?: string | null;
  chapterVersion: number;
  revisionId: string;
  bibleEntryIds?: string[];
  replayed?: boolean;
  narrationMode?: NarrationMode;
}

export interface CreateSceneRequest {
  sceneNumber?: number | null;
  heading?: string | null;
  summary?: string | null;
  defaultNarrationMode?: NarrationMode | null;
}

export interface UpdateSceneRequest {
  heading?: string | null;
  summary?: string | null;
  defaultNarrationMode?: NarrationMode | null;
  /** Version scene lúc mở form (BR-11). Lệch → 409 CONFLICT. */
  expectedVersion?: number;
}

export interface ReorderSceneItem {
  sceneId: string;
  newSceneNumber: number;
}

export interface CreateScriptLineRequest {
  kind?: ScriptLineKind | number;
  speakerLabel?: string | null;
  text?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  lineOrder?: number | null;
  expectedChapterVersion?: number | null;
  bibleEntryIds?: string[] | null;
  clientLineId?: string | null;
  narrationMode?: NarrationMode | null;
}

export interface UpdateScriptLineRequest {
  kind?: ScriptLineKind | number;
  speakerLabel?: string | null;
  text?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  expectedChapterVersion?: number | null;
  bibleEntryIds?: string[] | null;
  narrationMode?: NarrationMode | null;
}

export interface DeleteScriptLineResult {
  chapterVersion: number;
  revisionId: string;
}

export interface BatchScriptLineItem {
  id?: string | null;
  lineOrder: number;
  kind?: ScriptLineKind | number;
  speakerLabel?: string | null;
  text?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  bibleEntryIds?: string[] | null;
  narrationMode?: NarrationMode | null;
  clientLineId?: string | null;
  panelId?: string | null;
}

export interface BatchSaveScriptLinesRequest {
  lines: BatchScriptLineItem[];
  expectedChapterVersion?: number | null;
  summary?: string | null;
  rawText?: string | null;
}

export interface BatchSaveScriptLinesResult {
  chapterVersion: number;
  revisionId: string;
  lines: ScriptLineDto[];
}

/** Một dòng trong nội dung revision script (GET .../script-revisions/{revisionId}), đã sắp theo lineOrder. */
export interface ScriptRevisionLineDto {
  lineId: string;
  lineOrder: number;
  speakerCharacterId?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
}

export interface ScriptRevisionDetailDto {
  id: string;
  sceneId: string;
  versionNumber: number;
  summary: string;
  previousRevisionId?: string | null;
  /** null = sửa tay / baseline / khôi phục. */
  sourceSuggestionId?: string | null;
  /** true = bản mới nhất, không khôi phục được. */
  isCurrent: boolean;
  createdAt: string;
  createdBy?: string | null;
  lines: ScriptRevisionLineDto[];
}

export interface RestoreScriptRevisionRequest {
  expectedChapterVersion?: number | null;
}

export interface RestoreScriptRevisionResult {
  /** Version SAU khôi phục, dùng cho lần sửa kế. */
  chapterVersion: number;
  /** Revision MỚI vừa tạo. */
  revisionId: string;
  versionNumber: number;
  restoredFromRevisionId: string;
  restoredFromVersionNumber: number;
}

function extractError(error: any, defaultMsg: string): any {
  const message = error.response?.data?.error || error.response?.data?.message || defaultMsg;
  const err: any = new Error(message);
  err.code =
    error.response?.data?.code || (error.response?.status === 409 ? 'CONFLICT' : undefined);
  err.status = error.response?.status;
  return err;
}

export const scriptLineService = {
  /**
   * Lấy danh sách phân cảnh của Chapter (GET /api/chapters/{chapterId}/scenes)
   */
  async getScenesByChapter(chapterId: string): Promise<SceneDto[]> {
    try {
      const response = await axiosClient.get(`/chapters/${chapterId}/scenes`);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tải danh sách phân cảnh.');
    }
  },

  /**
   * Lấy chi tiết phân cảnh kèm danh sách dòng kịch bản (GET /api/scenes/{sceneId})
   */
  async getSceneById(sceneId: string): Promise<SceneDetailDto> {
    try {
      const response = await axiosClient.get(`/scenes/${sceneId}`);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tải thông tin chi tiết phân cảnh.');
    }
  },

  /**
   * Tạo phân cảnh mới (POST /api/chapters/{chapterId}/scenes) - Quyền: Producer, Writer
   */
  async createScene(chapterId: string, data: CreateSceneRequest): Promise<SceneDto> {
    try {
      const response = await axiosClient.post(`/chapters/${chapterId}/scenes`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tạo phân cảnh mới.');
    }
  },

  /**
   * Cập nhật tiêu đề / tóm tắt phân cảnh (PUT /api/scenes/{sceneId}) - Quyền: Producer, Writer
   */
  async updateScene(sceneId: string, data: UpdateSceneRequest): Promise<SceneDto> {
    try {
      const response = await axiosClient.put(`/scenes/${sceneId}`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể cập nhật phân cảnh.');
    }
  },

  /**
   * Xoá mềm phân cảnh (DELETE /api/scenes/{sceneId}) - Quyền: Producer, Writer
   */
  async deleteScene(sceneId: string): Promise<{ message: string }> {
    try {
      const response = await axiosClient.delete(`/scenes/${sceneId}`);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể xoá phân cảnh.');
    }
  },

  /**
   * Cập nhật thứ tự phân cảnh (PUT /api/chapters/{chapterId}/scenes/reorder) - Quyền: Producer, Writer
   */
  async reorderScenes(chapterId: string, scenes: ReorderSceneItem[]): Promise<{ message: string }> {
    try {
      const response = await axiosClient.put(`/chapters/${chapterId}/scenes/reorder`, { scenes });
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể sắp xếp lại phân cảnh.');
    }
  },

  /**
   * Thêm dòng kịch bản thủ công (POST /api/chapters/{chapterId}/scenes/{sceneId}/script-lines) (UC-06) - Quyền: Producer, Writer
   */
  async createScriptLine(
    chapterId: string,
    sceneId: string,
    data: CreateScriptLineRequest,
  ): Promise<ScriptLineDto> {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/scenes/${sceneId}/script-lines`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể thêm dòng kịch bản.');
    }
  },

  /**
   * Sửa dòng kịch bản (PUT /api/chapters/{chapterId}/script-lines/{lineId}) (UC-06) - Quyền: Producer, Writer
   */
  async updateScriptLine(
    chapterId: string,
    lineId: string,
    data: UpdateScriptLineRequest,
  ): Promise<ScriptLineDto> {
    try {
      const response = await axiosClient.put(`/chapters/${chapterId}/script-lines/${lineId}`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể cập nhật dòng kịch bản.');
    }
  },

  /**
   * Xoá mềm dòng kịch bản (DELETE /api/chapters/{chapterId}/script-lines/{lineId}?expectedChapterVersion=) (UC-06) - Quyền: Producer, Writer
   */
  async deleteScriptLine(
    chapterId: string,
    lineId: string,
    expectedChapterVersion?: number | null,
  ): Promise<DeleteScriptLineResult> {
    try {
      const params =
        expectedChapterVersion !== undefined && expectedChapterVersion !== null
          ? { expectedChapterVersion }
          : undefined;
      const response = await axiosClient.delete(`/chapters/${chapterId}/script-lines/${lineId}`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể xoá dòng kịch bản.');
    }
  },

  /**
   * Cập nhật thứ tự các dòng kịch bản trong phân cảnh (PUT /api/chapters/{chapterId}/scenes/{sceneId}/script-lines/reorder)
   */
  async reorderScriptLines(
    chapterId: string,
    sceneId: string,
    lines: { lineId: string; newOrder: number }[],
    expectedChapterVersion?: number | null,
  ): Promise<{ message: string }> {
    try {
      const response = await axiosClient.put(
        `/chapters/${chapterId}/scenes/${sceneId}/script-lines/reorder`,
        { lines, expectedChapterVersion },
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể sắp xếp lại dòng kịch bản.');
    }
  },

  /**
   * Lưu đồng bộ hàng loạt các dòng kịch bản trong 1 giao dịch duy nhất (POST /api/chapters/{chapterId}/scenes/{sceneId}/script-lines/batch)
   */
  async batchSaveScriptLines(
    chapterId: string,
    sceneId: string,
    data: BatchSaveScriptLinesRequest,
  ): Promise<BatchSaveScriptLinesResult> {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/scenes/${sceneId}/script-lines/batch`,
        data,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể lưu đồng bộ dòng kịch bản.');
    }
  },

  /**
   * Xem nội dung một revision script (GET /api/chapters/{chapterId}/scenes/{sceneId}/script-revisions/{revisionId}).
   * Quyền: mọi thành viên Workspace. Danh sách revision lấy từ aiAgentsService.getSceneRevisions (kind = Script).
   */
  async getScriptRevision(
    chapterId: string,
    sceneId: string,
    revisionId: string,
  ): Promise<ScriptRevisionDetailDto> {
    try {
      const response = await axiosClient.get(
        `/chapters/${chapterId}/scenes/${sceneId}/script-revisions/${revisionId}`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tải nội dung phiên bản kịch bản.');
    }
  },

  /**
   * Khôi phục script về một revision cũ (BR-08): BE tạo revision MỚI ở đầu lịch sử, không xoá revision nào.
   * Quyền: Producer/Writer. Luôn gửi body JSON (tối thiểu {}). 409 = lệch version (BR-11) hoặc chương không còn InProduction (BR-12).
   */
  async restoreScriptRevision(
    chapterId: string,
    sceneId: string,
    revisionId: string,
    request: RestoreScriptRevisionRequest = {},
  ): Promise<RestoreScriptRevisionResult> {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/scenes/${sceneId}/script-revisions/${revisionId}/restore`,
        request,
        { headers: { 'Content-Type': 'application/json' } },
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể khôi phục phiên bản kịch bản.');
    }
  },

  /**
   * V2.5: Gắn liên kết @-mentions từ kịch bản vào Series Bible (POST /api/chapters/{chapterId}/script-lines/{lineId}/bible-links)
   */
  async linkBibleEntries(
    chapterId: string,
    lineId: string,
    mentions: ScriptMentionItemDto[],
  ): Promise<ScriptLineBibleLinkDto[]> {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/script-lines/${lineId}/bible-links`,
        { mentions },
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể liên kết thực thể Bible với dòng kịch bản.');
    }
  },
};

export interface ScriptMentionItemDto {
  bibleEntryId?: string | null;
  rawText?: string | null;
  categoryHint?: string | null;
  resolvedRevisionId?: string | null;
}

export interface ScriptLineBibleLinkDto {
  id: string;
  scriptLineId: string;
  bibleEntryId: string;
  rawMentionText?: string | null;
  resolvedRevisionId?: string | null;
  entryName: string;
  category: string;
  isStub: boolean;
  stageName?: string | null;
  referenceImageUrl?: string | null;
  createdAt: string;
}
