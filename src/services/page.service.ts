// src/services/page.service.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5044';

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

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || localStorage.getItem('token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseErrorResponse(response: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error) return data.error;
    if (data?.message) return data.message;
  } catch {
    // empty body
  }
  if (response.status === 404) return 'Không tìm thấy trang hoặc chapter yêu cầu.';
  return defaultMsg;
}

// Canonical seeded UUIDs matching PostgreSQL panelforge_dev database
export const DEFAULT_CHAPTER_ID = 'cccccccc-3333-3333-3333-333333333333';
export const DEFAULT_PAGE_ID = '813ad7b2-3570-4def-8321-c6603a11c450';

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
  return DEFAULT_PAGE_ID;
};

// Fallback mock pages
export const MOCK_PAGES: PageDto[] = [
  {
    id: DEFAULT_PAGE_ID,
    chapterId: DEFAULT_CHAPTER_ID,
    pageNumber: 1,
    layoutFormat: 'StandardPage',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 5,
  },
  {
    id: '813ad7b2-3570-4def-8321-c6603a11c451',
    chapterId: DEFAULT_CHAPTER_ID,
    pageNumber: 2,
    layoutFormat: 'SpreadLeft',
    widthPx: 2400,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 8,
  },
  {
    id: '813ad7b2-3570-4def-8321-c6603a11c452',
    chapterId: DEFAULT_CHAPTER_ID,
    pageNumber: 3,
    layoutFormat: 'StandardPage',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 4,
  },
];

export const pageService = {
  createPage: async (
    chapterId: string,
    body: CreatePageRequestBody,
    token?: string,
  ): Promise<PageDto> => {
    const validChapterId = toValidChapterGuid(chapterId);
    const response = await fetch(`${API_URL}/api/chapters/${validChapterId}/pages`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Tạo trang mới thất bại.'));
    }
    return await response.json();
  },

  getPagesByChapter: async (chapterId: string, token?: string): Promise<PageDto[]> => {
    const validChapterId = toValidChapterGuid(chapterId);
    try {
      const response = await fetch(`${API_URL}/api/chapters/${validChapterId}/pages`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể tải danh sách trang.'));
      }
      return await response.json();
    } catch (err: any) {
      console.warn('pageService.getPagesByChapter fallback:', err.message);
      return MOCK_PAGES;
    }
  },

  getPageById: async (pageId: string, token?: string): Promise<PageDetailDto> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await fetch(`${API_URL}/api/pages/${validPageId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể tải chi tiết trang.'));
      }
      return await response.json();
    } catch (err: any) {
      console.warn('pageService.getPageById fallback:', err.message);
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
    token?: string,
  ): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    const response = await fetch(`${API_URL}/api/pages/${validPageId}/canvas-settings`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Cập nhật canvas thất bại.'));
    }
    return await response.json();
  },

  deletePage: async (pageId: string, token?: string): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    const response = await fetch(`${API_URL}/api/pages/${validPageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Xóa trang thất bại.'));
    }
    return await response.json();
  },
};
