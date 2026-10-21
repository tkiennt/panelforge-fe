// src/services/page.service.ts
import axiosClient from '../api/axiosClient';

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
}

async function parseErrorResponse(error: any, defaultMsg: string): Promise<string> {
  const data = error.response?.data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (error.response?.status === 404) return 'Không tìm thấy trang hoặc chapter yêu cầu.';
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
      throw await toPageError(error, 'Tạo trang mới thất bại.');
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
      throw await toPageError(error, 'Cập nhật canvas thất bại.');
    }
  },

  deletePage: async (pageId: string): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.delete(`/pages/${validPageId}`);
      return response.data;
    } catch (error) {
      throw await toPageError(error, 'Xóa trang thất bại.');
    }
  },

  splitArtwork: async (pageId: string, file: File, rightToLeft = false) => {
    const { panelService } = await import('./panel.service');
    return panelService.splitArtwork(pageId, file, rightToLeft);
  },
};
