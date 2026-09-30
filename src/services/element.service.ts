// src/services/element.service.ts
import axiosClient from '../api/axiosClient';

export interface ElementSnapshotDto {
  elementId: string;
  elementType: string; // 'DialogueBalloon' | 'NarrationBox' | 'SoundEffect' | 'CharacterInstance' | 'ArtworkLayer'
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string | null;
  assetId?: string | null;
  isRemoved: boolean;
}

export interface PageSnapshotDto {
  pageId: string;
  version: number;
  pageNumber: number;
  elements: ElementSnapshotDto[];
}

export interface AddElementRequest {
  elementType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content?: string;
  assetId?: string;
}

export interface MoveElementRequest {
  newX: number;
  newY: number;
  newWidth: number;
  newHeight: number;
  expectedPageVersion: number;
}

function extractError(error: any, defaultMsg: string): string {
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (error.response?.status === 409)
    return 'Xung đột phiên bản trang (409 Conflict). Vui lòng tải lại trang.';
  if (error.response?.status === 404) return 'Không tìm thấy Page hoặc Element.';
  return defaultMsg;
}

export const DEFAULT_PAGE_ID = '813ad7b2-3570-4def-8321-c6603a11c450';
export const DEFAULT_ELEMENT_ID = '99999999-9999-9999-9999-999999999901';

export const isGuid = (val?: string): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const toValidPageGuid = (id?: string): string => {
  if (id && isGuid(id)) return id;
  return DEFAULT_PAGE_ID;
};

export const toValidElementGuid = (id?: string): string => {
  if (id && isGuid(id)) return id;
  return '99999999-9999-9999-9999-' + Math.floor(Math.random() * 899999999999 + 100000000000);
};

export const MOCK_ELEMENTS: ElementSnapshotDto[] = [];

export const elementService = {
  getPageSnapshot: async (pageId: string, includeRemoved = false): Promise<PageSnapshotDto> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.get(`/pages/${validPageId}/elements`, {
        params: { includeRemoved },
      });
      return response.data;
    } catch (error: any) {
      console.warn('elementService.getPageSnapshot fallback:', error.message);
      return {
        pageId: validPageId,
        version: 1,
        pageNumber: 1,
        elements: MOCK_ELEMENTS,
      };
    }
  },

  addElement: async (pageId: string, request: AddElementRequest): Promise<any> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.post(`/pages/${validPageId}/elements`, request);
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Thêm Element thất bại.'));
    }
  },

  moveElement: async (
    pageId: string,
    elementId: string,
    request: MoveElementRequest,
  ): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    try {
      const response = await axiosClient.put(
        `/pages/${validPageId}/elements/${validElemId}/position`,
        request,
      );
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Di chuyển Element thất bại.'));
    }
  },

  removeElement: async (
    pageId: string,
    elementId: string,
    reason = 'USER_DELETE',
  ): Promise<{ message: string; elementId: string; canRestore: boolean }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    try {
      const response = await axiosClient.delete(`/pages/${validPageId}/elements/${validElemId}`, {
        params: { reason },
      });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error, 'Xóa Element thất bại.'));
    }
  },
};
