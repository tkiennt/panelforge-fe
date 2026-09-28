import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceService, MOCK_WORKSPACES } from './workspace.service';
import { pageService, MOCK_PAGES, DEFAULT_CHAPTER_ID, DEFAULT_PAGE_ID } from './page.service';
import { elementService, MOCK_ELEMENTS } from './element.service';

describe('Workspaces, Pages, and Elements Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('workspaceService', () => {
    it('lấy danh sách Workspaces thành công từ API khi có token', async () => {
      const sampleWorkspaces = [{ id: 'w-1', name: 'Alpha Studio', currentUserRole: 'PRODUCER' }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleWorkspaces),
      });
      globalThis.fetch = fetchMock;

      const result = await workspaceService.getMyWorkspaces('valid-jwt-token');
      expect(result.length).toBe(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/Workspaces'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('trả về danh sách rỗng an toàn khi không có token mà không gọi API (tránh 401)', async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock;

      const result = await workspaceService.getMyWorkspaces();
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('tạo Workspace mới thành công', async () => {
      const newWs = { id: 'w-new', name: 'New Studio', isOwner: true };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(newWs),
      });
      globalThis.fetch = fetchMock;

      const result = await workspaceService.createWorkspace({ name: 'New Studio' });
      expect(result.name).toBe('New Studio');
    });
  });

  describe('pageService', () => {
    it('lấy danh sách trang của một chapter thành công', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_PAGES),
      });
      globalThis.fetch = fetchMock;

      const result = await pageService.getPagesByChapter(DEFAULT_CHAPTER_ID);
      expect(result.length).toBe(MOCK_PAGES.length);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/chapters/${DEFAULT_CHAPTER_ID}/pages`),
        expect.anything(),
      );
    });

    it('cập nhật canvas settings thành công', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });
      globalThis.fetch = fetchMock;

      const result = await pageService.updateCanvasSettings(DEFAULT_PAGE_ID, {
        widthPx: 1400,
        heightPx: 2000,
        dpi: 600,
        layoutFormat: 'SpreadLeft',
      });
      expect(result.message).toBe('Success');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/pages/${DEFAULT_PAGE_ID}/canvas-settings`),
        expect.anything(),
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
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSnapshot),
      });
      globalThis.fetch = fetchMock;

      const result = await elementService.getPageSnapshot(DEFAULT_PAGE_ID);
      expect(result.elements.length).toBe(MOCK_ELEMENTS.length);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/pages/${DEFAULT_PAGE_ID}/elements`),
        expect.anything(),
      );
    });

    it('thêm Element mới vào Marten Event Stream thành công (202 Accepted)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => Promise.resolve({ elementId: 'elem-new', version: 3 }),
      });
      globalThis.fetch = fetchMock;

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
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/pages/${DEFAULT_PAGE_ID}/elements`),
        expect.anything(),
      );
    });
  });
});
