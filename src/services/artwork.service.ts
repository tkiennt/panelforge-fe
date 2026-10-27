// src/services/artwork.service.ts
import axiosClient from '../api/axiosClient';
import { AssetReferenceDto, ArtworkAccessLinkDto } from '@/types';

export async function computeFileSha256(file: File): Promise<string> {
  const raw = await file.arrayBuffer();
  // Sao chép sang ArrayBuffer của realm hiện tại để đảm bảo tương thích tuyệt đối trong cả trình duyệt và JSDOM/Node worker threads
  const bytes = new Uint8Array(raw.byteLength);
  bytes.set(new Uint8Array(raw));

  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Link tải Backend trả về là đường dẫn tương đối của API (vd "/api/assets/download?token=…"); đổi thành URL tuyệt đối để
 * dùng trong thẻ <img>. Không lưu URL này lâu: link chỉ sống 5 phút (BR-16).
 */
export function resolveArtworkUrl(relativeUrl: string): string {
  const base = axiosClient.defaults.baseURL ?? '';
  const origin = /^https?:\/\//i.test(base) ? base : window.location.origin;
  return new URL(relativeUrl, origin).toString();
}

/**
 * Link còn hạn được dùng lại để URL giữ nguyên, nhờ đó trình duyệt lấy ảnh từ cache (Backend trả private, max-age=300).
 * Bỏ link khi còn dưới 60 giây để thẻ <img> không nhận link sắp hết hạn.
 */
const accessLinkCache = new Map<string, Promise<ArtworkAccessLinkDto>>();
const LINK_REUSE_MARGIN_MS = 60_000;

/** Chỉ dùng trong test: xoá link đã nhớ. */
export function clearArtworkAccessLinkCache(): void {
  accessLinkCache.clear();
}

/** Thêm size=thumb vào link tải để nhận bản WebP rộng tối đa 400px (dùng cho lưới/thumbnail). */
export function toThumbnailUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}size=thumb`;
}

export const artworkService = {
  /**
   * Tải lên artwork cho Page (POST /api/chapters/{chapterId}/pages/{pageId}/artwork)
   * Yêu cầu multipart/form-data: file, stageId, clientSha256, layerType tuỳ chọn
   */
  uploadArtwork: async (
    chapterId: string,
    pageId: string,
    file: File,
    stageId: string,
    clientSha256: string,
    layerType?: string,
    panelId?: string,
  ): Promise<AssetReferenceDto> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stageId', stageId);
    formData.append('clientSha256', clientSha256);
    if (layerType) {
      formData.append('layerType', layerType);
    }
    if (panelId) {
      formData.append('panelId', panelId);
    }

    const res = await axiosClient.post<AssetReferenceDto>(
      `/chapters/${chapterId}/pages/${pageId}/artwork`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return res.data;
  },

  /**
   * Lấy danh sách artwork của một Page (GET /api/chapters/{chapterId}/pages/{pageId}/artwork?stageId=)
   */
  getArtworks: async (
    chapterId: string,
    pageId: string,
    stageId?: string,
  ): Promise<AssetReferenceDto[]> => {
    try {
      const res = await axiosClient.get<AssetReferenceDto[]>(
        `/chapters/${chapterId}/pages/${pageId}/artwork`,
        {
          params: stageId ? { stageId } : undefined,
        },
      );
      return res.data || [];
    } catch (err) {
      console.error('Không thể nạp danh sách artwork:', err);
      return [];
    }
  },

  /**
   * Xin link tải artwork ngắn hạn (POST /api/chapters/{chapterId}/artwork/{assetReferenceId}/access-link)
   * Link có hiệu lực 5 phút, dùng thẳng trong thẻ <img> không cần Bearer header
   */
  getArtworkAccessLink: async (
    chapterId: string,
    assetReferenceId: string,
  ): Promise<ArtworkAccessLinkDto> => {
    const cached = accessLinkCache.get(assetReferenceId);
    if (cached) {
      const link = await cached.catch(() => null);
      if (link && Date.parse(link.expiresAtUtc) - Date.now() > LINK_REUSE_MARGIN_MS) return link;
      if (accessLinkCache.get(assetReferenceId) === cached)
        accessLinkCache.delete(assetReferenceId);
    }
    const request = axiosClient
      .post<ArtworkAccessLinkDto>(`/chapters/${chapterId}/artwork/${assetReferenceId}/access-link`)
      .then((res) => res.data);
    accessLinkCache.set(assetReferenceId, request);
    request.catch(() => {
      if (accessLinkCache.get(assetReferenceId) === request)
        accessLinkCache.delete(assetReferenceId);
    });
    return request;
  },
};
