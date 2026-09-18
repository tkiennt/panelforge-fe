// src/services/element.service.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5044';

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
    if (data?.message) return data.message;
  } catch {
    // empty body
  }
  if (response.status === 409)
    return 'Xung đột phiên bản trang (409 Conflict). Vui lòng tải lại trang.';
  if (response.status === 404) return 'Không tìm thấy Page hoặc Element.';
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

export const MOCK_ELEMENTS: ElementSnapshotDto[] = [
  {
    elementId: '99999999-9999-9999-9999-999999999901',
    elementType: 'DialogueBalloon',
    zIndex: 1,
    x: 60,
    y: 80,
    width: 220,
    height: 100,
    content: 'Tôi sẽ không bao giờ bỏ cuộc!',
    isRemoved: false,
  },
  {
    elementId: '99999999-9999-9999-9999-999999999902',
    elementType: 'SoundEffect',
    zIndex: 2,
    x: 320,
    y: 200,
    width: 140,
    height: 80,
    content: 'DODODODO (ドドドド)',
    isRemoved: false,
  },
  {
    elementId: '99999999-9999-9999-9999-999999999903',
    elementType: 'NarrationBox',
    zIndex: 3,
    x: 50,
    y: 400,
    width: 280,
    height: 70,
    content: 'Năm 2084, khi ánh đèn neo-Tokyo bắt đầu lụi tàn...',
    isRemoved: false,
  },
];

export const elementService = {
  getPageSnapshot: async (
    pageId: string,
    includeRemoved = false,
    token?: string,
  ): Promise<PageSnapshotDto> => {
    const validPageId = toValidPageGuid(pageId);
    try {
      const response = await fetch(
        `${API_URL}/api/pages/${validPageId}/elements?includeRemoved=${includeRemoved}`,
        {
          method: 'GET',
          headers: getAuthHeaders(token),
        },
      );
      if (!response.ok) {
        throw new Error(
          await parseErrorResponse(response, 'Không thể tải snapshot elements của trang.'),
        );
      }
      return await response.json();
    } catch (err: any) {
      console.warn('elementService.getPageSnapshot fallback:', err.message);
      return {
        pageId: validPageId,
        version: 1,
        pageNumber: 1,
        elements: MOCK_ELEMENTS,
      };
    }
  },

  addElement: async (pageId: string, request: AddElementRequest, token?: string): Promise<any> => {
    const validPageId = toValidPageGuid(pageId);
    const response = await fetch(`${API_URL}/api/pages/${validPageId}/elements`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });
    if (!response.ok && response.status !== 202) {
      throw new Error(await parseErrorResponse(response, 'Thêm Element thất bại.'));
    }
    return await response.json();
  },

  moveElement: async (
    pageId: string,
    elementId: string,
    request: MoveElementRequest,
    token?: string,
  ): Promise<{ message: string }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    const response = await fetch(`${API_URL}/api/pages/${validPageId}/elements/${validElemId}/position`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });
    if (!response.ok && response.status !== 202) {
      throw new Error(await parseErrorResponse(response, 'Di chuyển Element thất bại.'));
    }
    return await response.json();
  },

  removeElement: async (
    pageId: string,
    elementId: string,
    reason = 'USER_DELETE',
    token?: string,
  ): Promise<{ message: string; elementId: string; canRestore: boolean }> => {
    const validPageId = toValidPageGuid(pageId);
    const validElemId = toValidElementGuid(elementId);
    const response = await fetch(
      `${API_URL}/api/pages/${validPageId}/elements/${validElemId}?reason=${encodeURIComponent(reason)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      },
    );
    if (!response.ok && response.status !== 202) {
      throw new Error(await parseErrorResponse(response, 'Xóa Element thất bại.'));
    }
    return await response.json();
  },
};
