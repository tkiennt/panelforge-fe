// src/services/catalog.service.ts
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

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

export interface PublicChapterLanguageDto {
  language: string;
  priceVnd: number;
  unlocked: boolean;
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
  availableLanguages?: PublicChapterLanguageDto[];
  currentLanguage?: string;
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
      throw new Error(
        extractError(error, translate('errors.services.catalog.getPublicSeriesFailed')),
      );
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
        extractError(error, translate('errors.services.catalog.getPublicSeriesDetailFailed')),
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

  getPublicChapter: async (chapterId: string, lang?: string): Promise<PublicChapterReadDto> => {
    try {
      const response = await axiosClient.get(`/catalog/chapters/${chapterId}`, {
        params: lang ? { lang } : undefined,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        extractError(error, translate('errors.services.catalog.getPublicChapterFailed')),
      );
    }
  },

  /**
   * Tạo URL tải ảnh trang chương truyện
   */
  getPublicPageImageUrl: (chapterId: string, pageId: string, lang?: string): string => {
    const langQuery = lang ? `?lang=${encodeURIComponent(lang)}` : '';
    const relativeUrl = `/catalog/chapters/${chapterId}/pages/${pageId}/image${langQuery}`;
    const base = axiosClient.defaults.baseURL ?? '';
    const origin = /^https?:\/\//i.test(base) ? base : window.location.origin;
    // Nếu baseURL có đuôi /api, nối chính xác
    const cleanBase = origin.replace(/\/+$/, '');
    const cleanRel = relativeUrl.replace(/^\/+/, '');
    return `${cleanBase}/${cleanRel}`;
  },
};
