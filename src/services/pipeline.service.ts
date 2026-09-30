// src/services/pipeline.service.ts
import axiosClient from '../api/axiosClient';

export type PipelineRole = 'Producer' | 'Writer' | 'Artist' | 'Letterer' | 'Editor';

export interface PipelineStageDto {
  id: string;
  name: string;
  slug: string;
  stageOrder: number; // 1..n
  colorCode?: string | null;
  allowedRole?: PipelineRole | null;
  isApprovalGate: boolean;
  isInitial: boolean;
  isTerminal: boolean;
  estimatedDurationDays?: number | null;
}

export interface StageTransitionDto {
  id: string;
  fromStageId: string;
  toStageId: string;
  transitionName: string;
  requiredRole?: PipelineRole | null;
  requiresComment: boolean;
  isBackwardTransition: boolean;
}

export interface SeriesPipelineDto {
  id: string;
  seriesId: string;
  name: string;
  description?: string | null;
  stages: PipelineStageDto[];
  transitions: StageTransitionDto[];
}

export interface PipelineTemplateStageDto {
  id: string;
  code: string;
  name: string;
  order: number;
  requiredRole?: string | null;
  gateType?: string | null;
  isRequired: boolean;
  configurationJson?: string | null;
}

export interface PipelineTemplateDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  stages?: PipelineTemplateStageDto[];
  createdAt?: string;
  updatedAt?: string | null;
}

export interface AddPipelineStageRequest {
  name: string;
  slug?: string;
  position?: number | null; // 1-based, null = cuối
  colorCode?: string;
  allowedRole?: PipelineRole | null;
  isApprovalGate: boolean;
  estimatedDurationDays?: number | null;
}

export interface UpdatePipelineStageRequest {
  name: string;
  colorCode?: string | null;
  allowedRole?: PipelineRole | null;
  isApprovalGate: boolean;
  estimatedDurationDays?: number | null;
}

export interface ReorderPipelineStagesRequest {
  stageIds: string[];
}

function handlePipelineError(error: any, defaultError: string): never {
  const message = error.response?.data?.error || error.response?.data?.message || defaultError;
  const err: any = new Error(message);
  if (error.response?.status === 409 || error.response?.data?.code === 'CONFLICT') {
    err.code = 'CONFLICT';
  }
  err.status = error.response?.status;
  throw err;
}

export const pipelineService = {
  /**
   * Lấy cấu hình Pipeline của Series (GET /api/series/{seriesId}/pipeline)
   */
  getSeriesPipeline: async (seriesId: string): Promise<SeriesPipelineDto> => {
    try {
      const response = await axiosClient.get(`/series/${seriesId}/pipeline`);
      return response.data;
    } catch (error) {
      handlePipelineError(error, 'Không thể tải cấu hình Pipeline của Series.');
    }
  },

  /**
   * Thêm stage mới vào Pipeline (POST /api/series/{seriesId}/pipeline/stages)
   */
  addStage: async (seriesId: string, data: AddPipelineStageRequest): Promise<SeriesPipelineDto> => {
    try {
      const response = await axiosClient.post(`/series/${seriesId}/pipeline/stages`, data);
      return response.data;
    } catch (error) {
      handlePipelineError(error, 'Không thể thêm công đoạn mới vào Pipeline.');
    }
  },

  /**
   * Cập nhật stage (PUT /api/series/{seriesId}/pipeline/stages/{stageId})
   */
  updateStage: async (
    seriesId: string,
    stageId: string,
    data: UpdatePipelineStageRequest,
  ): Promise<SeriesPipelineDto> => {
    try {
      const response = await axiosClient.put(
        `/series/${seriesId}/pipeline/stages/${stageId}`,
        data,
      );
      return response.data;
    } catch (error) {
      handlePipelineError(error, 'Không thể cập nhật công đoạn Pipeline.');
    }
  },

  /**
   * Đổi thứ tự các stage trong Pipeline (PUT /api/series/{seriesId}/pipeline/stages/order)
   */
  reorderStages: async (seriesId: string, stageIds: string[]): Promise<SeriesPipelineDto> => {
    try {
      const response = await axiosClient.put(`/series/${seriesId}/pipeline/stages/order`, {
        stageIds,
      });
      return response.data;
    } catch (error) {
      handlePipelineError(error, 'Không thể sắp xếp lại thứ tự công đoạn Pipeline.');
    }
  },

  /**
   * Xóa stage khỏi Pipeline (DELETE /api/series/{seriesId}/pipeline/stages/{stageId})
   * Chú ý: Trả 409 CONFLICT nếu stage đang có Page/Panel hoặc Assignment chưa Approved
   */
  deleteStage: async (seriesId: string, stageId: string): Promise<SeriesPipelineDto> => {
    try {
      const response = await axiosClient.delete(`/series/${seriesId}/pipeline/stages/${stageId}`);
      return response.data;
    } catch (error) {
      handlePipelineError(error, 'Không thể xóa công đoạn Pipeline.');
    }
  },

  /**
   * Lấy danh sách PipelineTemplate đang hoạt động cho Producer (GET /api/pipeline-templates) (B1 / UC-03)
   */
  getActivePipelineTemplates: async (): Promise<PipelineTemplateDto[]> => {
    try {
      const response = await axiosClient.get(`/pipeline-templates`);
      return response.data;
    } catch (error) {
      handlePipelineError(error, 'Không thể tải danh sách mẫu quy trình Pipeline.');
    }
  },
};
