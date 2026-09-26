// src/services/chapter.service.ts
import { API_URL } from '../config/env';

export type ChapterStatus = 'InProduction' | 'Approved' | 'Locked' | 'Published';

export interface ChapterDto {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title?: string | null;
  targetReleaseDate?: string | null; // ISO Date "YYYY-MM-DD"
  versionVector: number;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  scenesCount: number;
  pagesCount: number;
  status?: ChapterStatus;
  publishedAt?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateChapterRequest {
  chapterNumber: number;
  title?: string | null;
  targetReleaseDate?: string | null; // YYYY-MM-DD
}

export interface UpdateChapterRequest {
  title?: string | null;
  targetReleaseDate?: string | null; // YYYY-MM-DD
  incrementVersion?: boolean;
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

export const chapterService = {
  /**
   * Lấy danh sách chương của Series (Release Calendar) phân trang (GET /api/series/{seriesId}/chapters)
   */
  getChaptersBySeries: async (
    seriesId: string,
    pageIndex = 1,
    pageSize = 20,
    token?: string,
  ): Promise<PagedResult<ChapterDto>> => {
    const url = new URL(`${API_URL}/api/series/${seriesId}/chapters`);
    url.searchParams.set('pageIndex', pageIndex.toString());
    url.searchParams.set('pageSize', pageSize.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tải danh sách chương của Series.');
    }

    return await response.json();
  },

  /**
   * Tạo chương mới kèm lịch phát hành mục tiêu (POST /api/series/{seriesId}/chapters) (UC-03)
   */
  createChapter: async (
    seriesId: string,
    data: CreateChapterRequest,
    token?: string,
  ): Promise<ChapterDto> => {
    const response = await fetch(`${API_URL}/api/series/${seriesId}/chapters`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tạo chương mới.');
    }

    return await response.json();
  },

  /**
   * Lấy chi tiết chương (GET /api/chapters/{chapterId})
   */
  getChapterById: async (chapterId: string, token?: string): Promise<any> => {
    const response = await fetch(`${API_URL}/api/chapters/${chapterId}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể lấy thông tin chi tiết chương.');
    }

    return await response.json();
  },

  /**
   * Cập nhật thông tin chương & lịch phát hành TargetReleaseDate (PUT /api/chapters/{chapterId})
   */
  updateChapter: async (
    chapterId: string,
    data: UpdateChapterRequest,
    token?: string,
  ): Promise<ChapterDto> => {
    const response = await fetch(`${API_URL}/api/chapters/${chapterId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể cập nhật chương.');
    }

    return await response.json();
  },

  /**
   * Xóa mềm chương (DELETE /api/chapters/{chapterId})
   */
  deleteChapter: async (chapterId: string, token?: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/chapters/${chapterId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể xóa chương.');
    }
  },
};
