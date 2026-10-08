// src/services/scriptLine.service.ts
import axiosClient from '../api/axiosClient';

export interface SceneDto {
  id: string;
  chapterId: string;
  sceneNumber: number;
  heading?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  scriptLinesCount: number;
  pagesCount: number;
}

export interface SceneScriptLineSummaryDto {
  id: string;
  lineOrder: number;
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  panelId?: string | null;
}

export interface SceneDetailDto {
  id: string;
  chapterId: string;
  sceneNumber: number;
  heading?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  scriptLines: SceneScriptLineSummaryDto[];
}

export interface ScriptLineDto {
  id: string;
  sceneId: string;
  lineOrder: number;
  speakerCharacterId?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  panelId?: string | null;
  chapterVersion: number;
  revisionId: string;
}

export interface CreateSceneRequest {
  sceneNumber?: number | null;
  heading?: string | null;
  summary?: string | null;
}

export interface UpdateSceneRequest {
  heading?: string | null;
  summary?: string | null;
}

export interface ReorderSceneItem {
  sceneId: string;
  newSceneNumber: number;
}

export interface CreateScriptLineRequest {
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  lineOrder?: number | null;
  expectedChapterVersion?: number | null;
}

export interface UpdateScriptLineRequest {
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  expectedChapterVersion?: number | null;
}

export interface DeleteScriptLineResult {
  chapterVersion: number;
  revisionId: string;
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
};
