// src/services/element.service.ts
import axiosClient from '../api/axiosClient';

export const IMAGE_LAYER_TYPES = [
  'BACKGROUND',
  'CHARACTER_INSTANCE',
  'PROP',
  'EFFECT',
  'ARTWORK_LAYER',
] as const;

export type ImageLayerType = (typeof IMAGE_LAYER_TYPES)[number];

export const LAYER_LABELS: Record<string, string> = {
  BACKGROUND: 'Bối cảnh (Background)',
  CHARACTER_INSTANCE: 'Nhân vật (Character)',
  PROP: 'Đạo cụ (Prop)',
  EFFECT: 'Hiệu ứng (Effect)',
  ARTWORK_LAYER: 'Lớp nét/màu (Artwork Layer)',
  SPEECH_BALLOON: 'Bóng thoại (Speech)',
  THOUGHT_BALLOON: 'Bóng suy nghĩ (Thought)',
  NARRATION_BOX: 'Hộp dẫn chuyện (Narration)',
  SOUND_EFFECT: 'Hiệu ứng âm thanh (SFX)',
  KEY_ARTWORK_REGION: 'Vùng tranh chính (Key Art)',
};

export interface ElementWarningDto {
  elementId: string;
  code: string; // TEXT_OVERFLOW | READING_ORDER_MISMATCH | OVERLAPS_KEY_ARTWORK_REGION
  message: string;
  relatedElementId?: string | null;
  acknowledged?: boolean;
  acknowledgedReason?: string | null;
}

export interface ElementSnapshotDto {
  elementId: string;
  elementType: string; // 'SPEECH_BALLOON' | 'THOUGHT_BALLOON' | 'NARRATION_BOX' | 'SOUND_EFFECT' | 'KEY_ARTWORK_REGION' | 'CHARACTER_INSTANCE' | 'BACKGROUND' | 'PROP' | 'EFFECT' | 'ARTWORK_LAYER'
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string | null;
  assetId?: string | null;
  isRemoved: boolean;
  version?: number; // BR-11: version từng element (bắt đầu 1, tăng 1 mỗi thay đổi)
  scriptLineId?: string | null;
  speakerId?: string | null;
  renderedText?: string | null;
  currentLineText?: string | null;
  isStale?: boolean;
  readingOrder?: number | null;
  overflowAcknowledgedReason?: string | null;
  panelId?: string | null;
  rotation?: number;
  bibleEntryId?: string | null;
}

export interface PageSnapshotDto {
  pageId: string;
  version: number;
  pageNumber: number;
  elements: ElementSnapshotDto[];
  warnings?: ElementWarningDto[];
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
  scriptLineId?: string;
  clientElementId?: string | null;
  panelId?: string | null;
  rotation?: number;
  bibleEntryId?: string | null;
}

export interface AddElementResponse {
  elementId: string;
  pageId: string;
  elementType: string;
  scriptLineId?: string | null;
  speakerId?: string | null;
  panelId?: string | null;
  rotation?: number;
  bibleEntryId?: string | null;
  assetId?: string | null;
  replayed?: boolean;
}

export interface MoveElementRequest {
  newX: number;
  newY: number;
  newWidth: number;
  newHeight: number;
  expectedPageVersion?: number | null;
  expectedElementVersion?: number | null; // BR-11: khuyến nghị gửi version của element
  newRotation?: number | null;
  newZIndex?: number | null;
}

export interface UpdateElementTextRequest {
  content?: string;
  scriptLineId?: string;
  expectedElementVersion?: number | null;
}

export interface SetReadingOrderRequest {
  readingOrder?: number | null;
  expectedElementVersion?: number | null;
}

export interface AcknowledgeOverflowRequest {
  reason: string;
}

export interface ElementConflictErrorData {
  message: string;
  code?: string;
  conflict?: string; // 'ELEMENT_VERSION_CONFLICT'
}

function extractError(error: any, defaultMsg: string): any {
  const data = error.response?.data;
  let msg = defaultMsg;
  if (data?.conflict === 'ELEMENT_VERSION_CONFLICT') {
    msg =
      'Xung đột phiên bản phần tử (ELEMENT_VERSION_CONFLICT). Phần tử đã được chỉnh sửa bởi thao tác khác.';
  } else if (data?.message) {
    msg = data.message;
  } else if (data?.error) {
    msg = data.error;
  } else if (error.response?.status === 409) {
    msg = 'Xung đột phiên bản (409 Conflict). Vui lòng tải lại dữ liệu.';
  } else if (error.response?.status === 404) {
    msg = 'Không tìm thấy Page hoặc Element.';
  }
  const err: any = new Error(msg);
  // BR-12: chương đã duyệt/phát hành chỉ đọc cũng là 409 nhưng không phải xung đột phiên bản
  const readOnly = data?.code === 'CHAPTER_READ_ONLY';
  err.conflict =
    data?.conflict ||
    (error.response?.status === 409 && !readOnly ? 'ELEMENT_VERSION_CONFLICT' : undefined);
  err.code = data?.code || (error.response?.status === 409 ? 'CONFLICT' : undefined);
  err.status = error.response?.status;
  return err;
}

export const DEFAULT_ELEMENT_ID = '99999999-9999-9999-9999-999999999901';

export const isGuid = (val?: string): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const toValidPageGuid = (id?: string): string => {
  if (id && isGuid(id)) return id;
  return id || '';
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

  addElement: async (pageId: string, request: AddElementRequest): Promise<AddElementResponse> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await axiosClient.post(`/pages/${validPageId}/elements`, request);
      return response.data;
    } catch (error) {
      throw extractError(error, 'Thêm Element thất bại.');
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
      throw extractError(error, 'Di chuyển Element thất bại.');
    }
  },

  updateElementText: async (
    pageId: string,
    elementId: string,
    request: UpdateElementTextRequest,
  ): Promise<{
    elementId: string;
    content?: string;
    scriptLineId?: string;
    speakerId?: string;
  }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    try {
      const response = await axiosClient.put(
        `/pages/${validPageId}/elements/${validElemId}/text`,
        request,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Cập nhật văn bản Element thất bại.');
    }
  },

  setReadingOrder: async (
    pageId: string,
    elementId: string,
    request: SetReadingOrderRequest,
  ): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    try {
      const response = await axiosClient.put(
        `/pages/${validPageId}/elements/${validElemId}/reading-order`,
        request,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Cập nhật thứ tự đọc Element thất bại.');
    }
  },

  acknowledgeOverflow: async (
    pageId: string,
    elementId: string,
    request: AcknowledgeOverflowRequest,
  ): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    try {
      const response = await axiosClient.post(
        `/pages/${validPageId}/elements/${validElemId}/overflow-ack`,
        request,
      );
      return response.data;
    } catch (error) {
      throw extractError(error, 'Xác nhận tràn chữ thất bại.');
    }
  },

  removeElement: async (
    pageId: string,
    elementId: string,
    expectedElementVersion?: number | null,
    reason = 'USER_DELETE',
  ): Promise<{ message: string; elementId: string; canRestore: boolean }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    try {
      const params: Record<string, any> = { reason };
      if (expectedElementVersion != null) {
        params.expectedElementVersion = expectedElementVersion;
      }
      const response = await axiosClient.delete(`/pages/${validPageId}/elements/${validElemId}`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw extractError(error, 'Xóa Element thất bại.');
    }
  },
};
