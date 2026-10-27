import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { workspaceService } from './workspace.service';
import { pageService, MOCK_PAGES, DEFAULT_CHAPTER_ID } from './page.service';
import { elementService, MOCK_ELEMENTS } from './element.service';

const DEFAULT_PAGE_ID = '813ad7b2-3570-4def-8321-c6603a11c450';

// Giả lập các method HTTP của axiosClient
vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);
const put = vi.mocked(axiosClient.put);
const del = vi.mocked(axiosClient.delete);

describe('Workspaces, Pages, and Elements Services', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('workspaceService', () => {
    it('lấy danh sách Workspaces thành công từ API khi có token', async () => {
      localStorage.setItem('token', 'jwt');
      const sampleWorkspaces = [{ id: 'w-1', name: 'Alpha Studio', currentUserRole: 'PRODUCER' }];
      get.mockResolvedValue({ data: sampleWorkspaces });

      const result = await workspaceService.getMyWorkspaces();

      expect(result.length).toBe(1);
      expect(get).toHaveBeenCalledWith('/Workspaces');
    });

    it('trả về danh sách rỗng an toàn khi không có token mà không gọi API (tránh 401)', async () => {
      const result = await workspaceService.getMyWorkspaces();

      expect(result).toEqual([]);
      expect(get).not.toHaveBeenCalled();
    });

    it('tạo Workspace mới thành công', async () => {
      const newWs = { id: 'w-new', name: 'New Studio', isOwner: true };
      post.mockResolvedValue({ data: newWs });

      const result = await workspaceService.createWorkspace({ name: 'New Studio' });

      expect(result.name).toBe('New Studio');
      expect(post).toHaveBeenCalledWith('/Workspaces', { name: 'New Studio' });
    });

    it('lấy thông tin Workspace Usage bao gồm storage, aiTokens và images', async () => {
      const mockUsage = {
        workspaceId: 'ws-123',
        storage: { used: 1048576, quota: 10737418240, isUnlimited: false, percentUsed: 0.1 },
        aiTokens: { used: 5000, quota: 500000, isUnlimited: false, percentUsed: 1.0 },
        aiEnabled: true,
        images: { used: 10, quota: 100, isUnlimited: false, percentUsed: 10.0 },
      };
      get.mockResolvedValue({ data: mockUsage });

      const result = await workspaceService.getWorkspaceUsage('ws-123');

      expect(result).toEqual(mockUsage);
      expect(result.images?.used).toBe(10);
      expect(get).toHaveBeenCalledWith('/workspaces/ws-123/usage');
    });
  });

  describe('pageService', () => {
    it('lấy danh sách trang của một chapter thành công', async () => {
      get.mockResolvedValue({ data: MOCK_PAGES });

      const result = await pageService.getPagesByChapter(DEFAULT_CHAPTER_ID);

      expect(result.length).toBe(MOCK_PAGES.length);
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining(`/chapters/${DEFAULT_CHAPTER_ID}/pages`),
      );
    });

    it('cập nhật canvas settings thành công', async () => {
      put.mockResolvedValue({ data: { message: 'Success' } });

      const result = await pageService.updateCanvasSettings(DEFAULT_PAGE_ID, {
        widthPx: 1400,
        heightPx: 2000,
        dpi: 600,
        layoutFormat: 'SpreadLeft',
      });

      expect(result.message).toBe('Success');
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining(`/pages/${DEFAULT_PAGE_ID}/canvas-settings`),
        expect.objectContaining({ widthPx: 1400 }),
      );
    });
  });

  describe('elementService', () => {
    it('lấy snapshot các elements của page thành công', async () => {
      const mockSnapshot = {
        pageId: DEFAULT_PAGE_ID,
        version: 2,
        pageNumber: 1,
        elements: MOCK_ELEMENTS,
      };
      get.mockResolvedValue({ data: mockSnapshot });

      const result = await elementService.getPageSnapshot(DEFAULT_PAGE_ID);

      expect(result.elements.length).toBe(MOCK_ELEMENTS.length);
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining(`/pages/${DEFAULT_PAGE_ID}/elements`),
        expect.anything(),
      );
    });

    it('thêm Element mới vào Marten Event Stream thành công (202 Accepted)', async () => {
      post.mockResolvedValue({ status: 202, data: { elementId: 'elem-new', version: 3 } });

      const result = await elementService.addElement(DEFAULT_PAGE_ID, {
        elementType: 'DialogueBalloon',
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        zIndex: 1,
        content: 'Xin chào!',
      });

      expect(result.elementId).toBe('elem-new');
      expect(post).toHaveBeenCalledWith(
        expect.stringContaining(`/pages/${DEFAULT_PAGE_ID}/elements`),
        expect.objectContaining({ elementType: 'DialogueBalloon' }),
      );
    });

    it('thêm Element với clientElementId an toàn khi gửi lại (NFR-09)', async () => {
      const clientElementId = '12345678-1234-1234-1234-1234567890ab';
      post.mockResolvedValue({
        status: 202,
        data: {
          elementId: clientElementId,
          pageId: DEFAULT_PAGE_ID,
          elementType: 'DialogueBalloon',
          replayed: true,
        },
      });

      const result = await elementService.addElement(DEFAULT_PAGE_ID, {
        elementType: 'DialogueBalloon',
        x: 50,
        y: 60,
        width: 150,
        height: 80,
        zIndex: 2,
        clientElementId,
      });

      expect(result.elementId).toBe(clientElementId);
      expect(result.replayed).toBe(true);
      expect(post).toHaveBeenCalledWith(
        expect.stringContaining(`/pages/${DEFAULT_PAGE_ID}/elements`),
        expect.objectContaining({ clientElementId }),
      );
    });

    it('thêm Element ảnh với layer, rotation, bibleEntryId và panelId thành công', async () => {
      post.mockResolvedValue({
        status: 201,
        data: {
          elementId: 'elem-img-1',
          pageId: DEFAULT_PAGE_ID,
          elementType: 'CHARACTER_INSTANCE',
          panelId: 'p-1',
          rotation: 45,
          bibleEntryId: 'be-1',
          assetId: 'asset-1',
        },
      });

      const result = await elementService.addElement(DEFAULT_PAGE_ID, {
        elementType: 'CHARACTER_INSTANCE',
        x: 100,
        y: 150,
        width: 300,
        height: 400,
        zIndex: 3,
        panelId: 'p-1',
        rotation: 45,
        bibleEntryId: 'be-1',
        assetId: 'asset-1',
      });

      expect(result.elementId).toBe('elem-img-1');
      expect(result.elementType).toBe('CHARACTER_INSTANCE');
      expect(result.panelId).toBe('p-1');
      expect(result.rotation).toBe(45);
      expect(post).toHaveBeenCalledWith(
        expect.stringContaining(`/pages/${DEFAULT_PAGE_ID}/elements`),
        expect.objectContaining({
          elementType: 'CHARACTER_INSTANCE',
          panelId: 'p-1',
          rotation: 45,
          bibleEntryId: 'be-1',
          assetId: 'asset-1',
        }),
      );
    });

    it('di chuyển Element với expectedElementVersion, newRotation và newZIndex thành công', async () => {
      put.mockResolvedValue({ status: 200, data: { message: 'Element moved successfully' } });

      const result = await elementService.moveElement(DEFAULT_PAGE_ID, 'elem-1', {
        newX: 120,
        newY: 160,
        newWidth: 220,
        newHeight: 110,
        expectedElementVersion: 2,
        newRotation: 90,
        newZIndex: 5,
      });

      expect(result.message).toBe('Element moved successfully');
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining('/position'),
        expect.objectContaining({
          expectedElementVersion: 2,
          newRotation: 90,
          newZIndex: 5,
        }),
      );
    });

    it('cập nhật text của element và gán scriptLineId thành công', async () => {
      put.mockResolvedValue({
        status: 200,
        data: { elementId: 'elem-1', content: 'Thoại mới', scriptLineId: 'line-1' },
      });

      const result = await elementService.updateElementText(DEFAULT_PAGE_ID, 'elem-1', {
        content: 'Thoại mới',
        scriptLineId: 'line-1',
        expectedElementVersion: 2,
      });

      expect(result.content).toBe('Thoại mới');
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining('/text'),
        expect.objectContaining({ content: 'Thoại mới', scriptLineId: 'line-1' }),
      );
    });

    it('ghi đè thứ tự đọc của element thành công', async () => {
      put.mockResolvedValue({ status: 200, data: { message: 'Reading order updated' } });

      const result = await elementService.setReadingOrder(DEFAULT_PAGE_ID, 'elem-1', {
        readingOrder: 3,
        expectedElementVersion: 2,
      });

      expect(result.message).toBe('Reading order updated');
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining('/reading-order'),
        expect.objectContaining({ readingOrder: 3 }),
      );
    });

    it('xác nhận cảnh báo tràn chữ overflow-ack thành công', async () => {
      post.mockResolvedValue({ status: 202, data: { message: 'Overflow acknowledged' } });

      const result = await elementService.acknowledgeOverflow(DEFAULT_PAGE_ID, 'elem-1', {
        reason: 'Chữ cố tình để dài tạo hiệu ứng kịch tính',
      });

      expect(result.message).toBe('Overflow acknowledged');
      expect(post).toHaveBeenCalledWith(
        expect.stringContaining('/overflow-ack'),
        expect.objectContaining({ reason: 'Chữ cố tình để dài tạo hiệu ứng kịch tính' }),
      );
    });

    it('xóa element với expectedElementVersion truyền query param', async () => {
      del.mockResolvedValue({
        status: 200,
        data: { message: 'Element removed', elementId: 'elem-1', canRestore: true },
      });

      const result = await elementService.removeElement(DEFAULT_PAGE_ID, 'elem-1', 4);

      expect(result.canRestore).toBe(true);
      expect(del).toHaveBeenCalledWith(
        expect.stringContaining('/elements/'),
        expect.objectContaining({
          params: expect.objectContaining({ expectedElementVersion: 4 }),
        }),
      );
    });

    it('bắt lỗi ELEMENT_VERSION_CONFLICT và ném thông báo tiếng Việt chuẩn', async () => {
      put.mockRejectedValue({
        response: {
          status: 409,
          data: {
            code: 'CONFLICT',
            conflict: 'ELEMENT_VERSION_CONFLICT',
            message: 'Element version mismatch',
          },
        },
      });

      await expect(
        elementService.moveElement(DEFAULT_PAGE_ID, 'elem-1', {
          newX: 10,
          newY: 20,
          newWidth: 100,
          newHeight: 50,
          expectedElementVersion: 1,
        }),
      ).rejects.toThrow('ELEMENT_VERSION_CONFLICT');
    });
  });
});
