// src/services/panel.service.ts
import axiosClient from '../api/axiosClient';
import {
  PanelDto,
  PanelDetailDto,
  CreatePanelRequest,
  UpdatePanelCoordinatesRequest,
  UpdatePanelDirectionRequest,
  AssignPanelSceneRequest,
  AssignPanelScriptLinesRequest,
  ImageConsistencyResultDto,
  PanelSplitResult,
} from '../types/pipeline';

function extractError(error: any, defaultMsg: string): any {
  let message = error.response?.data?.error || error.response?.data?.message || defaultMsg;
  if (error.response?.status === 403 || error.response?.data?.code === 'FORBIDDEN') {
    message = 'Phần này thuộc việc của người khác / đang chờ duyệt';
  }
  const err: any = new Error(message);
  err.code =
    error.response?.data?.code ||
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
      throw extractError(error, 'Không thể tạo panel mới trên trang.');
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
      throw extractError(error, 'Không thể nạp danh sách panel của trang.');
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
      throw extractError(error, 'Không thể lấy thông tin chi tiết panel.');
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
      throw extractError(error, 'Không thể cập nhật tọa độ panel.');
    }
  },

  /**
   * Cập nhật mô tả hướng vẽ / chỉ dẫn hình ảnh của Panel (V1.2 / SCR-07)
   * PUT /api/panels/{panelId}/direction
   */
  async updatePanelDirection(
    panelId: string,
    data: UpdatePanelDirectionRequest,
  ): Promise<PanelDto> {
    try {
      const response = await axiosClient.put(`/panels/${panelId}/direction`, data);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Không thể cập nhật chỉ dẫn hình ảnh panel.');
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
      throw extractError(error, 'Không thể gán phân cảnh (Scene) cho panel.');
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
      throw extractError(error, 'Không thể neo các dòng kịch bản vào panel.');
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
      throw extractError(error, 'Không thể xóa panel.');
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
      throw extractError(error, 'Không thể kiểm tra tính nhất quán hình ảnh cho panel.');
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
        const err: any = new Error(
          'Dịch vụ nhận diện tạm thời chưa khả dụng. Bạn vẫn có thể tải bản vẽ và thử nhận diện lại sau.',
        );
        err.code = 'PANEL_SPLITTER_UNAVAILABLE';
        err.status = 503;
        throw err;
      }
      throw extractError(error, 'Không thể tách panel và bong bóng thoại từ ảnh trang.');
    }
  },
};
export default panelService;
