// src/services/panel.service.ts
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';
import {
  PanelDto,
  PanelDetailDto,
  CreatePanelRequest,
  UpdatePanelCoordinatesRequest,
  AssignPanelSceneRequest,
  AssignPanelScriptLinesRequest,
  ImageConsistencyResultDto,
  PanelSplitResult,
  PageLayoutDto,
} from '../types/pipeline';

function extractError(error: any, defaultMsg: string): any {
  const data = error.response?.data;
  const serverMsg = (data?.error || data?.message || '').trim();
  const isForbidden = error.response?.status === 403 || data?.code === 'FORBIDDEN';
  const message =
    serverMsg || (isForbidden ? translate('errors.services.panel.forbidden') : defaultMsg);
  const err: any = new Error(message);
  err.code =
    data?.code ||
    (error.response?.status === 403
      ? 'FORBIDDEN'
      : error.response?.status === 409
        ? 'CONFLICT'
        : undefined);
  err.status = error.response?.status;
  return err;
}

export const panelService = {
  /**
   * Tạo một Panel (khung tranh) trên trang với tọa độ Polygon/BoundingBox
   * POST /api/pages/{pageId}/panels
   */
  async createPanel(pageId: string, data: CreatePanelRequest): Promise<PanelDto> {
    try {
      const response = await axiosClient.post(`/pages/${pageId}/panels`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.createFailed'));
    }
  },

  /** Replace every panel on a page atomically and carry artwork by reading order. */
  async replacePageLayout(pageId: string, panels: CreatePanelRequest[]): Promise<PageLayoutDto> {
    try {
      const response = await axiosClient.put(`/pages/${pageId}/panels/layout`, panels);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.replaceLayoutFailed'));
    }
  },

  /**
   * Lấy danh sách các Panel trên trang theo thứ tự đọc (ReadingOrder)
   * GET /api/pages/{pageId}/panels
   */
  async getPanelsByPage(pageId: string): Promise<PanelDto[]> {
    try {
      const response = await axiosClient.get(`/pages/${pageId}/panels`);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.getByPageFailed'));
    }
  },

  /**
   * Lấy thông tin chi tiết của một Panel kèm các phần tử Elements bên trong & script lines neo vào panel
   * GET /api/panels/{panelId}
   */
  async getPanelById(panelId: string): Promise<PanelDetailDto> {
    try {
      const response = await axiosClient.get(`/panels/${panelId}`);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.getByIdFailed'));
    }
  },

  /**
   * Cập nhật kéo thả tọa độ Polygon/BoundingBox và thứ tự đọc của Panel
   * PUT /api/panels/{panelId}/coordinates
   */
  async updatePanelCoordinates(
    panelId: string,
    data: UpdatePanelCoordinatesRequest,
  ): Promise<PanelDto> {
    try {
      const response = await axiosClient.put(`/panels/${panelId}/coordinates`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.updateCoordinatesFailed'));
    }
  },

  /**
   * Gán Panel vào Scene (V1.2); sceneId = null để bỏ gán
   * PUT /api/panels/{panelId}/scene
   */
  async assignPanelScene(panelId: string, sceneId: string | null): Promise<PanelDto> {
    try {
      const request: AssignPanelSceneRequest = { sceneId };
      const response = await axiosClient.put(`/panels/${panelId}/scene`, request);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.assignSceneFailed'));
    }
  },

  /**
   * Đặt tập ScriptLine neo vào Panel (thay thế tập cũ)
   * PUT /api/panels/{panelId}/script-lines
   */
  async assignPanelScriptLines(panelId: string, scriptLineIds: string[]): Promise<string[]> {
    try {
      const request: AssignPanelScriptLinesRequest = { scriptLineIds };
      const response = await axiosClient.put(`/panels/${panelId}/script-lines`, request);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.assignScriptLinesFailed'));
    }
  },

  /**
   * Xóa mềm một Panel khỏi trang (Soft-delete)
   * DELETE /api/panels/{panelId}
   */
  async deletePanel(panelId: string): Promise<{ message: string }> {
    try {
      const response = await axiosClient.delete(`/panels/${panelId}`);
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.deleteFailed'));
    }
  },

  /**
   * CF3 (V1.2): Chạy kiểm tra nhất quán hình ảnh AI (Bước A5) giữa Artwork của Panel và Character Sheet đã khóa
   * POST /api/panels/{panelId}/check-image-consistency?revisionRef={string?}&threshold={decimal?}
   */
  async checkImageConsistency(
    panelId: string,
    params?: { revisionRef?: string; threshold?: number },
  ): Promise<ImageConsistencyResultDto> {
    try {
      const response = await axiosClient.post(`/panels/${panelId}/check-image-consistency`, null, {
        params,
      });
      return response.data;
    } catch (error) {
      throw extractError(error, translate('errors.services.panel.checkImageConsistencyFailed'));
    }
  },

  /**
   * Gợi ý tách panel + bóng thoại từ ảnh cả trang. Backend chỉ trả toạ độ (pixel ảnh gốc), không lưu gì.
   * POST /api/pages/{pageId}/split-artwork (multipart/form-data: file, rightToLeft)
   */
  async splitArtwork(pageId: string, file: File, rightToLeft = false): Promise<PanelSplitResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (rightToLeft) {
      formData.append('rightToLeft', 'true');
    }
    try {
      const response = await axiosClient.post(`/pages/${pageId}/split-artwork`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      if (
        error.response?.data?.code === 'PANEL_SPLITTER_UNAVAILABLE' ||
        error.response?.status === 503
      ) {
        const err: any = new Error(translate('errors.services.panel.splitterUnavailable'));
        err.code = 'PANEL_SPLITTER_UNAVAILABLE';
        err.status = 503;
        throw err;
      }
      throw extractError(error, translate('errors.services.panel.splitArtworkFailed'));
    }
  },
};
export default panelService;
