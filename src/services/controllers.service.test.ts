import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { workspaceService } from './workspace.service';
import { pageService, MOCK_PAGES, DEFAULT_CHAPTER_ID, DEFAULT_PAGE_ID } from './page.service';
import { elementService, MOCK_ELEMENTS } from './element.service';

// Giả lập các method HTTP của axiosClient
vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);
const put = vi.mocked(axiosClient.put);

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
  });
});
