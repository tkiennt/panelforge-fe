import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { frameTemplateService, FrameTemplateDto } from './frameTemplate.service';

vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } };
});

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);
const del = vi.mocked(axiosClient.delete);

describe('frameTemplateService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockTemplates: FrameTemplateDto[] = [
    {
      id: 'tpl-1',
      name: 'Splash 1 Khung',
      layoutFormat: 'StandardPage',
      isBuiltIn: true,
      panelCount: 1,
      slots: [{ x: 0, y: 0, w: 1, h: 1, borderless: false, corners: null }],
      createdAt: '2026-10-08T00:00:00Z',
    },
    {
      id: 'tpl-2',
      workspaceId: 'ws-123',
      name: 'Lưới 4 khung tuỳ chỉnh',
      layoutFormat: 'StandardPage',
      isBuiltIn: false,
      panelCount: 4,
      slots: [
        { x: 0, y: 0, w: 0.5, h: 0.5, borderless: false },
        { x: 0.5, y: 0, w: 0.5, h: 0.5, borderless: false },
        { x: 0, y: 0.5, w: 0.5, h: 0.5, borderless: false },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5, borderless: false },
      ],
      createdAt: '2026-10-08T01:00:00Z',
    },
  ];

  it('lấy danh sách Frame Templates của Workspace thành công', async () => {
    get.mockResolvedValue({ data: mockTemplates });

    const result = await frameTemplateService.getFrameTemplates('ws-123');

    expect(result.length).toBe(2);
    expect(result[0].isBuiltIn).toBe(true);
    expect(get).toHaveBeenCalledWith('/workspaces/ws-123/frame-templates');
  });

  it('tạo Frame Template tuỳ chỉnh mới thành công (201)', async () => {
    const newTemplate: FrameTemplateDto = {
      id: 'tpl-new',
      workspaceId: 'ws-123',
      name: 'Khung nghiêng động',
      layoutFormat: 'StandardPage',
      isBuiltIn: false,
      panelCount: 2,
      slots: [
        { x: 0, y: 0, w: 1, h: 0.5, borderless: false },
        { x: 0, y: 0.5, w: 1, h: 0.5, borderless: true },
      ],
      createdAt: '2026-10-08T02:00:00Z',
    };
    post.mockResolvedValue({ status: 201, data: newTemplate });

    const result = await frameTemplateService.createFrameTemplate('ws-123', {
      name: 'Khung nghiêng động',
      slots: newTemplate.slots,
    });

    expect(result.id).toBe('tpl-new');
    expect(post).toHaveBeenCalledWith(
      '/workspaces/ws-123/frame-templates',
      expect.objectContaining({ name: 'Khung nghiêng động' }),
    );
  });

  it('xoá mềm Frame Template thành công', async () => {
    del.mockResolvedValue({ data: { message: 'Đã xoá mẫu khung' } });

    const result = await frameTemplateService.deleteFrameTemplate('ws-123', 'tpl-custom');

    expect(result.message).toBe('Đã xoá mẫu khung');
    expect(del).toHaveBeenCalledWith('/workspaces/ws-123/frame-templates/tpl-custom');
  });

  it('áp dụng Frame Template vào Page thành công (201)', async () => {
    const mockPanels = [
      {
        id: 'panel-1',
        pageId: 'page-1',
        panelNumber: 1,
        boundingBox: JSON.stringify({ x: 0, y: 0, width: 1200, height: 900 }),
        readingOrder: 1,
        createdAt: '2026-10-08T03:00:00Z',
      },
    ];
    post.mockResolvedValue({ status: 201, data: mockPanels });

    const result = await frameTemplateService.applyFrameTemplate('page-1', 'tpl-1');

    expect(result.length).toBe(1);
    expect(result[0].panelNumber).toBe(1);
    expect(post).toHaveBeenCalledWith('/pages/page-1/frame-template', { templateId: 'tpl-1' });
  });

  it('xử lý lỗi 409 Conflict khi Page đã có Panel hoặc chương không còn InProduction', async () => {
    post.mockRejectedValue({
      response: {
        status: 409,
        data: {
          code: 'CONFLICT',
          error: 'Trang đã có Panel. Vui lòng xoá các Panel hiện có trước khi áp dụng mẫu khung.',
        },
      },
    });

    await expect(frameTemplateService.applyFrameTemplate('page-1', 'tpl-1')).rejects.toThrow(
      'Trang đã có Panel',
    );
  });
});
