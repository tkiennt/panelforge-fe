// src/services/pipeline.service.ts
import { API_URL } from '../config/env';

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

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null) || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && !token.startsWith('mock-')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handlePipelineResponse(response: Response, defaultError: string): Promise<SeriesPipelineDto> {
  if (response.ok) {
    return await response.json();
  }

  let errorData: any = {};
  try {
    errorData = await response.json();
  } catch {
    // Response not JSON
  }

  const message = errorData.error || errorData.message || defaultError;
  const error: any = new Error(message);
  if (response.status === 409 || errorData.code === 'CONFLICT') {
    error.code = 'CONFLICT';
  }
  error.status = response.status;
  throw error;
}

export const pipelineService = {
  /**
   * Lấy cấu hình Pipeline của Series (GET /api/series/{seriesId}/pipeline)
   */
  getSeriesPipeline: async (seriesId: string, token?: string): Promise<SeriesPipelineDto> => {
    const response = await fetch(`${API_URL}/api/series/${seriesId}/pipeline`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    return await handlePipelineResponse(response, 'Không thể tải cấu hình Pipeline của Series.');
  },

  /**
   * Thêm stage mới vào Pipeline (POST /api/series/{seriesId}/pipeline/stages)
   */
  addStage: async (
    seriesId: string,
    data: AddPipelineStageRequest,
    token?: string,
  ): Promise<SeriesPipelineDto> => {
    const response = await fetch(`${API_URL}/api/series/${seriesId}/pipeline/stages`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return await handlePipelineResponse(response, 'Không thể thêm công đoạn mới vào Pipeline.');
  },

  /**
   * Cập nhật stage (PUT /api/series/{seriesId}/pipeline/stages/{stageId})
   */
  updateStage: async (
    seriesId: string,
    stageId: string,
    data: UpdatePipelineStageRequest,
    token?: string,
  ): Promise<SeriesPipelineDto> => {
    const response = await fetch(`${API_URL}/api/series/${seriesId}/pipeline/stages/${stageId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return await handlePipelineResponse(response, 'Không thể cập nhật công đoạn Pipeline.');
  },

  /**
   * Đổi thứ tự các stage trong Pipeline (PUT /api/series/{seriesId}/pipeline/stages/order)
   */
  reorderStages: async (
    seriesId: string,
    stageIds: string[],
    token?: string,
  ): Promise<SeriesPipelineDto> => {
    const response = await fetch(`${API_URL}/api/series/${seriesId}/pipeline/stages/order`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ stageIds }),
    });
    return await handlePipelineResponse(response, 'Không thể sắp xếp lại thứ tự công đoạn Pipeline.');
  },

  /**
   * Xóa stage khỏi Pipeline (DELETE /api/series/{seriesId}/pipeline/stages/{stageId})
   * Chú ý: Trả 409 CONFLICT nếu stage đang có Page/Panel hoặc Assignment chưa Approved
   */
  deleteStage: async (
    seriesId: string,
    stageId: string,
    token?: string,
  ): Promise<SeriesPipelineDto> => {
    const response = await fetch(`${API_URL}/api/series/${seriesId}/pipeline/stages/${stageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    return await handlePipelineResponse(response, 'Không thể xóa công đoạn Pipeline.');
  },

  /**
   * Lấy danh sách PipelineTemplate đang hoạt động cho Producer (GET /api/pipeline-templates) (B1 / UC-03)
   */
  getActivePipelineTemplates: async (token?: string): Promise<PipelineTemplateDto[]> => {
    const response = await fetch(`${API_URL}/api/pipeline-templates`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể tải danh sách mẫu quy trình Pipeline.'));
    }
    return await response.json();
  },
};
