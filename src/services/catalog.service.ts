// src/services/catalog.service.ts
import axiosClient from '../api/axiosClient';

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

function extractError(error: any, defaultMsg: string): string {
  return error.response?.data?.error || error.response?.data?.message || defaultMsg;
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
    try {
      const response = await axiosClient.get('/catalog/series', { params });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Không thể tải danh mục truyện công khai.'));
    }
  },

  /**
   * Xem chi tiết truyện và danh sách các chương đã xuất bản (AllowAnonymous)
   * GET /api/catalog/series/{seriesId}
   */
  getPublicSeriesDetail: async (seriesId: string): Promise<PublicSeriesDetailDto> => {
    try {
      const response = await axiosClient.get(`/catalog/series/${seriesId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, 'Không tìm thấy bộ truyện hoặc chưa có chương phát hành.'),
      );
    }
  },
};
