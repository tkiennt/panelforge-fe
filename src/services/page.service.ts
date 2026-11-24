// src/services/page.service.ts
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';
import { PageVisualContinuityDto } from '../types/pipeline';

export interface CreatePageRequestBody {
  pageNumber?: number;
  layoutFormat?: string;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
  sceneId?: string;
}

export interface UpdateCanvasRequestBody {
  widthPx: number;
  heightPx: number;
  dpi: number;
  layoutFormat: string;
}

export interface PageDto {
  id: string;
  chapterId: string;
  sceneId?: string | null;
  pageNumber: number;
  layoutFormat: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
  elementsCount: number;
  isContentReady?: boolean;
  contentReadyAt?: string | null;
  contentReadyById?: string | null;
}

export interface ReorderPageRequest {
  newPageNumber: number;
}

export interface AutoAssignScriptLinesRequest {
  sceneId: string;
  dryRun?: boolean;
}

export interface PanelLineGroup {
  panelId: string;
  scriptLineIds: string[];
}

export interface AutoAssignScriptLinesResult {
  assignments: PanelLineGroup[];
  unassignedLineIds: string[];
  missingPanels: number;
  applied: boolean;
}
export interface PageDetailDto {
  id: string;
  chapterId: string;
  sceneId?: string | null;
  pageNumber: number;
  layoutFormat: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
  version: number;
  activeElementsCount: number;
  isContentReady?: boolean;
  contentReadyAt?: string | null;
  contentReadyById?: string | null;
}

async function parseErrorResponse(error: any, defaultMsg: string): Promise<string> {
  const data = error.response?.data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (error.response?.status === 404) return translate('errors.services.page.notFound');
  return defaultMsg;
}

/** Giữ lại status HTTP và mã lỗi BE (CONFLICT, CHAPTER_READ_ONLY) để màn hình xử lý riêng từng trường hợp. */
async function toPageError(error: any, defaultMsg: string): Promise<Error> {
  const err: any = new Error(await parseErrorResponse(error, defaultMsg));
  err.status = error.response?.status;
  err.code =
    error.response?.data?.code || (error.response?.status === 409 ? 'CONFLICT' : undefined);
  return err;
}

// Canonical seeded UUIDs matching PostgreSQL panelforge_dev database
export const DEFAULT_CHAPTER_ID = 'cccccccc-3333-3333-3333-333333333333';

export const isGuid = (val?: string): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const toValidChapterGuid = (id?: string): string => {
  if (id && isGuid(id)) return id;
  return DEFAULT_CHAPTER_ID;
};

export const toValidPageGuid = (id?: string): string => {
  if (id && isGuid(id)) return id;
  return id || '';
};

// Fallback mock pages (empty)
export const MOCK_PAGES: PageDto[] = [];

export const pageService = {
  createPage: async (chapterId: string, body: CreatePageRequestBody): Promise<PageDto> => {
    const validChapterId = toValidChapterGuid(chapterId);
    try {
      const response = await axiosClient.post(`/chapters/${validChapterId}/pages`, body);
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.createFailed'));
    }
  },

  getPagesByChapter: async (chapterId: string): Promise<PageDto[]> => {
    const validChapterId = toValidChapterGuid(chapterId);
    try {
      const response = await axiosClient.get(`/chapters/${validChapterId}/pages`);
      return response.data;
    } catch (error: any) {
      console.warn('pageService.getPagesByChapter fallback:', error.message);
      return MOCK_PAGES;
    }
  },

  getPageById: async (pageId: string): Promise<PageDetailDto> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.get(`/pages/${validPageId}`);
      return response.data;
    } catch (error: any) {
      console.warn('pageService.getPageById fallback:', error.message);
      return {
        id: validPageId,
        chapterId: DEFAULT_CHAPTER_ID,
        pageNumber: 1,
        layoutFormat: 'StandardPage',
        widthPx: 1200,
        heightPx: 1800,
        dpi: 600,
        version: 1,
        activeElementsCount: 0,
      };
    }
  },

  updateCanvasSettings: async (
    pageId: string,
    body: UpdateCanvasRequestBody,
  ): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.put(`/pages/${validPageId}/canvas-settings`, body);
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.updateCanvasFailed'));
    }
  },

  deletePage: async (pageId: string): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.delete(`/pages/${validPageId}`);
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.deleteFailed'));
    }
  },

  splitArtwork: async (pageId: string, file: File, rightToLeft = false) => {
    const { panelService } = await import('./panel.service');
    return panelService.splitArtwork(pageId, file, rightToLeft);
  },

  /** CF4 4.3: event của stream canvas, mới nhất trước (tối đa 100/trang). */
  getPageHistory: async (pageId: string, page = 1, pageSize = 50): Promise<PageHistoryDto> => {
    try {
      const response = await axiosClient.get(`/pages/${pageId}/history`, {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.getHistoryFailed'));
    }
  },

  /** CF4 4.3: so sánh canvas giữa hai version theo elementId. */
  comparePageVersions: async (
    pageId: string,
    left: number,
    right: number,
  ): Promise<PageVersionCompareDto> => {
    try {
      const response = await axiosClient.get(`/pages/${pageId}/compare`, {
        params: { left, right },
      });
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.compareVersionsFailed'));
    }
  },

  /** CF4 4.3 / US-12: khôi phục canvas về version cũ (thêm event mới). 409 CONFLICT khi trang vừa bị người khác sửa. */
  restorePageVersion: async (
    pageId: string,
    version: number,
    expectedPageVersion: number,
  ): Promise<RestorePageVersionResult> => {
    try {
      const response = await axiosClient.post(`/pages/${pageId}/versions/${version}/restore`, {
        expectedPageVersion,
      });
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.restoreVersionFailed'));
    }
  },

  /** V2.5: Bật/tắt trạng thái phân trang sẵn sàng (POST /api/chapters/{chapterId}/pages/{pageId}/content-ready) */
  toggleContentReady: async (chapterId: string, pageId: string): Promise<PageDto> => {
    try {
      const response = await axiosClient.post(
        `/chapters/${chapterId}/pages/${pageId}/content-ready`,
      );
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.toggleContentReadyFailed'));
    }
  },

  /**
   * Tự động phân bổ kịch bản vào Panel của trang (BE 2026-11-03).
   * POST /api/pages/{pageId}/script-lines/auto-assign
   */
  autoAssignScriptLines: async (
    pageId: string,
    body: AutoAssignScriptLinesRequest,
  ): Promise<AutoAssignScriptLinesResult> => {
    try {
      const response = await axiosClient.post(
        `/pages/${toValidPageGuid(pageId)}/script-lines/auto-assign`,
        body,
      );
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.autoAssignScriptLinesFailed'));
    }
  },
  reorderPage: async (pageId: string, newPageNumber: number): Promise<PageDto> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.put(`/pages/${validPageId}/reorder`, {
        newPageNumber,
      });
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.reorderFailed'));
    }
  },

  /**
   * Editor Visual Continuity (kế hoạch AI đa vai trò, Tuần 2):
   * So sánh ảnh từng panel của trang với character sheet đã khoá (BR-15).
   * POST /api/pages/{pageId}/visual-continuity
   */
  checkVisualContinuity: async (pageId: string): Promise<PageVisualContinuityDto> => {
    try {
      const response = await axiosClient.post(`/pages/${pageId}/visual-continuity`);
      return response.data;
    } catch (error) {
      throw await toPageError(error, translate('errors.services.page.checkVisualContinuityFailed'));
    }
  },

  /** GET /api/pages/{pageId}/keep-out-zones — lấy danh sách vùng cấm chữ (toạ độ 0..1) và version. */
  getKeepOutZones: async (pageId: string): Promise<PageKeepOutZonesDto> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.get(`/pages/${validPageId}/keep-out-zones`);
      return response.data;
    } catch (error) {
      throw await toPageError(error, 'Không tải được vùng cấm chữ của trang.');
    }
  },

  /** PUT /api/pages/{pageId}/keep-out-zones — ghi đè toàn bộ vùng cấm chữ (optimistic concurrency via expectedVersion). */
  replaceKeepOutZones: async (
    pageId: string,
    body: ReplaceKeepOutZonesRequest,
  ): Promise<PageKeepOutZonesDto> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.put(`/pages/${validPageId}/keep-out-zones`, body);
      return response.data;
    } catch (error) {
      throw await toPageError(error, 'Lưu vùng cấm chữ thất bại.');
    }
  },
};

// ── Vùng cấm chữ trên trang (Keep-out zones, toạ độ chuẩn hoá 0..1) ──────────

export interface KeepOutZoneDto {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string | null;
  panelId?: string | null;
}

export interface PageKeepOutZonesDto {
  pageId: string;
  zones: KeepOutZoneDto[];
  /** Gửi lại làm expectedVersion khi PUT (0 = chưa từng lưu). */
  version: number;
  updatedAt?: string | null;
}

export interface ReplaceKeepOutZonesRequest {
  zones: KeepOutZoneDto[];
  expectedVersion?: number | null;
}

// ── CF4 4.3: lịch sử canvas Page ─────────────────────────────────────────────

export interface PageHistoryEntryDto {
  version: number;
  /** ElementAdded, ElementMoved, ElementRemoved, ElementRestored, PageCreated, ... */
  eventType: string;
  elementId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  occurredAtUtc: string;
  summary: string;
}

export interface PageHistoryDto {
  pageId: string;
  currentVersion: number;
  page: number;
  pageSize: number;
  totalCount: number;
  items: PageHistoryEntryDto[];
}

export interface PageElementStateDto {
  elementId: string;
  elementType: string;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string | null;
  renderedText?: string | null;
}

export interface PageElementDiffDto {
  elementId: string;
  elementType: string;
  change: 'Added' | 'Removed' | 'Modified';
  changedFields: string[];
  left?: PageElementStateDto | null;
  right?: PageElementStateDto | null;
}

export interface PageVersionCompareDto {
  pageId: string;
  left: number;
  right: number;
  canvasChanged: boolean;
  added: number;
  removed: number;
  modified: number;
  elements: PageElementDiffDto[];
}

export interface RestorePageVersionResult {
  pageId: string;
  restoredFromVersion: number;
  newVersion: number;
  changes: number;
}
