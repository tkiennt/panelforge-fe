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
  coverUrl?: string | null;
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

export interface PublicPageReadDto {
  id: string;
  pageNumber: number;
  imageUrl?: string | null;
}

export interface PublicChapterReadDto {
  id: string;
  seriesId: string;
  seriesTitle: string;
  readingDirection: 'RightToLeft' | 'LeftToRight' | 'Vertical';
  chapterNumber: number;
  title?: string | null;
  publishedAt?: string | null;
  pages: PublicPageReadDto[];
  coverUrl?: string | null;
}

export interface PublicCatalogPagedResult {
  items: PublicSeriesDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Đổi đường dẫn ảnh tương đối trả về từ BE (vd "/api/catalog/chapters/.../pages/.../image") thành URL tuyệt đối
 */
export function resolveCatalogImageUrl(relativeUrl: string): string {
  if (!relativeUrl) return '';
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  const base = axiosClient.defaults.baseURL ?? '';
  const origin = /^https?:\/\//i.test(base) ? base : window.location.origin;
  return new URL(relativeUrl, origin).toString();
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

  /**
   * Đọc nội dung chương truyện công khai (AllowAnonymous)
   * GET /api/catalog/chapters/{chapterId}
   */
  /**
   * Lấy URL ảnh bìa chương công khai (AllowAnonymous)
   * GET /api/catalog/chapters/{chapterId}/cover
   */
  getPublicChapterCoverUrl: (chapterId: string, versionHash?: string | null): string => {
    const vParam = versionHash ? `?v=${encodeURIComponent(versionHash)}` : '';
    return resolveCatalogImageUrl(`/api/catalog/chapters/${chapterId}/cover${vParam}`);
  },

  getPublicChapter: async (chapterId: string): Promise<PublicChapterReadDto> => {
    try {
      const response = await axiosClient.get(`/catalog/chapters/${chapterId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(
          error,
          'Không thể tải nội dung chương truyện. Chương có thể chưa được xuất bản hoặc chưa tới giờ phát hành.',
        ),
      );
    }
  },

  /**
   * Tạo URL tải ảnh trang chương truyện
   */
  getPublicPageImageUrl: (chapterId: string, pageId: string): string => {
    const relativeUrl = `/catalog/chapters/${chapterId}/pages/${pageId}/image`;
    const base = axiosClient.defaults.baseURL ?? '';
    const origin = /^https?:\/\//i.test(base) ? base : window.location.origin;
    // Nếu baseURL có đuôi /api, nối chính xác
    const cleanBase = origin.replace(/\/+$/, '');
    const cleanRel = relativeUrl.replace(/^\/+/, '');
    return `${cleanBase}/${cleanRel}`;
  },
};
