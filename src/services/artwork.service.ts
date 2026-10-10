// src/services/artwork.service.ts
import axiosClient from '../api/axiosClient';
import { AssetReferenceDto, ArtworkAccessLinkDto } from '@/types';

export async function computeFileSha256(file: File): Promise<string> {
  const raw = await file.arrayBuffer();
  // Sao chép sang ArrayBuffer của realm hiện tại để đảm bảo tương thích tuyệt đối trong cả trình duyệt và JSDOM/Node worker threads
  const buffer = new ArrayBuffer(raw.byteLength);
  new Uint8Array(buffer).set(new Uint8Array(raw));

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
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
    const res = await axiosClient.post<ArtworkAccessLinkDto>(
      `/chapters/${chapterId}/artwork/${assetReferenceId}/access-link`,
    );
    return res.data;
  },
};
