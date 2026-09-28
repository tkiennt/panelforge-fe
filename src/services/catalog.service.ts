// src/services/catalog.service.ts
import { API_URL } from '../config/env';

export interface PublicSeriesDto {
  id: string;
  title: string;
  synopsis?: string | null;
  genre: string;
  format: string;
  readingDirection: 'RightToLeft' | 'LeftToRight' | 'Vertical';
  studioName: string;
  publishedChapterCount: number;
  latestPublishedAt?: string | null;
}

export interface PublicChapterDto {
  id: string;
  chapterNumber: number;
  title?: string | null;
  publishedAt?: string | null;
}

export interface PublicSeriesDetailDto {
  id: string;
  title: string;
  synopsis?: string | null;
  genre: string;
  format: string;
  readingDirection: 'RightToLeft' | 'LeftToRight' | 'Vertical';
  studioName: string;
  chapters: PublicChapterDto[];
}

export interface PublicCatalogPagedResult {
  items: PublicSeriesDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export const catalogService = {
  /**
   * Lấy danh sách truyện đã xuất bản công khai (AllowAnonymous) (BR-23 / BR-24)
   * GET /api/catalog/series
   */
  getPublicSeries: async (params?: {
    search?: string;
    genre?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<PublicCatalogPagedResult> => {
    const url = new URL(`${API_URL}/api/catalog/series`);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.genre) url.searchParams.set('genre', params.genre);
    if (params?.pageIndex) url.searchParams.set('pageIndex', params.pageIndex.toString());
    if (params?.pageSize) url.searchParams.set('pageSize', params.pageSize.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Không thể tải danh mục truyện công khai.');
    }

    return await response.json();
  },

  /**
   * Xem chi tiết truyện và danh sách các chương đã xuất bản (AllowAnonymous)
   * GET /api/catalog/series/{seriesId}
   */
  getPublicSeriesDetail: async (seriesId: string): Promise<PublicSeriesDetailDto> => {
    const response = await fetch(`${API_URL}/api/catalog/series/${seriesId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.error || err.message || 'Không tìm thấy bộ truyện hoặc chưa có chương phát hành.',
      );
    }

    return await response.json();
  },
};
