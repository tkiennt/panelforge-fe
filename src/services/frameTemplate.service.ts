// src/services/frameTemplate.service.ts
import axiosClient from '../api/axiosClient';
import { PanelDto } from '../types/pipeline';

export interface FrameSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  corners?: { x: number; y: number }[] | null;
  borderless: boolean;
}

export interface FrameTemplateDto {
  id: string;
  workspaceId?: string | null;
  name: string;
  layoutFormat: 'StandardPage' | 'SpreadDouble' | 'WebtoonLongstrip' | string;
  isBuiltIn: boolean;
  panelCount: number;
  slots: FrameSlot[];
  createdAt: string;
  createdBy?: string | null;
  category?: 'narrative' | 'action' | 'cinematic' | 'webtoon' | string;
  code?: string;
  description?: string;
}

export interface CreateFrameTemplateRequest {
  name: string;
  layoutFormat?: 'StandardPage' | 'SpreadDouble' | 'WebtoonLongstrip' | string;
  slots: FrameSlot[];
  category?: 'narrative' | 'action' | 'cinematic' | 'webtoon' | string;
  code?: string;
  description?: string;
}

function extractError(error: any, defaultMsg: string): any {
  const message = error.response?.data?.error || error.response?.data?.message || defaultMsg;
  const err: any = new Error(message);
  err.code =
    error.response?.data?.code || (error.response?.status === 409 ? 'CONFLICT' : undefined);
  err.status = error.response?.status;
  return err;
}

export const frameTemplateService = {
  /**
   * Lấy danh sách Frame Templates của Workspace (bao gồm cả các template có sẵn isBuiltIn = true)
   * GET /api/workspaces/{workspaceId}/frame-templates
   */
  async getFrameTemplates(workspaceId: string): Promise<FrameTemplateDto[]> {
    try {
      const response = await axiosClient.get(`/workspaces/${workspaceId}/frame-templates`);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tải danh sách mẫu khung (Frame Templates).');
    }
  },

  /**
   * Tạo Frame Template tuỳ chỉnh trong Workspace (Producer, Artist)
   * POST /api/workspaces/{workspaceId}/frame-templates
   */
  async createFrameTemplate(
    workspaceId: string,
    data: CreateFrameTemplateRequest,
  ): Promise<FrameTemplateDto> {
    try {
      const response = await axiosClient.post(`/workspaces/${workspaceId}/frame-templates`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể tạo mẫu khung mới.');
    }
  },

  /**
   * Xoá mềm Frame Template tuỳ chỉnh (Producer)
   * DELETE /api/workspaces/{workspaceId}/frame-templates/{templateId}
   */
  async deleteFrameTemplate(workspaceId: string, templateId: string): Promise<{ message: string }> {
    try {
      const response = await axiosClient.delete(
        `/workspaces/${workspaceId}/frame-templates/${templateId}`,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể xoá mẫu khung.');
    }
  },

  /**
   * Áp dụng Frame Template vào Page (Producer, Artist) -> Trả về danh sách PanelDto đã tạo theo thứ tự đọc
   * POST /api/pages/{pageId}/frame-template
   */
  async applyFrameTemplate(pageId: string, templateId: string): Promise<PanelDto[]> {
    try {
      const response = await axiosClient.post(`/pages/${pageId}/frame-template`, { templateId });
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể áp dụng mẫu khung vào trang.');
    }
  },
};
