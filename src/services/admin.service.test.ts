import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { adminService } from './admin.service';

// Giả lập các method HTTP của axiosClient (Authorization do request interceptor gắn, được kiểm thử ở axiosClient.test.ts)
vi.mock('../api/axiosClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/axiosClient')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);
const put = vi.mocked(axiosClient.put);

describe('adminService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('gọi GET /Admin/users với page và pageSize', async () => {
    const mockResponse = {
      total: 1,
      page: 1,
      pageSize: 10,
      items: [
        {
          id: '1',
          email: 'user@panelforge.com',
          fullName: 'Test User',
          phoneNumber: null,
          role: 'Producer',
          isActive: true,
          isEmailConfirmed: true,
          twoFactorEnabled: false,
          createdAt: '2026-03-01T00:00:00Z',
        },
      ],
    };
    get.mockResolvedValue({ data: mockResponse });

    const result = await adminService.getAllUsers(1, 10);

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/Admin/users', { params: { page: 1, pageSize: 10 } });
    expect(result).toEqual(mockResponse);
  });

  it('không gọi API khi vai trò hiện tại không phải Administrator', async () => {
    localStorage.setItem('userRole', 'PRODUCER');

    const result = await adminService.getAllUsers(1, 10);

    expect(get).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it('gọi POST /Admin/assign-role và trả về kết quả thành công', async () => {
    const mockResponse = {
      message: 'Đã cập nhật vai trò thành công',
      userId: 'user-guid-xyz',
      newRole: 'Editor',
    };
    post.mockResolvedValue({ data: mockResponse });

    const result = await adminService.assignRole({ userId: 'user-guid-xyz', newRole: 'Editor' });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/Admin/assign-role', {
      userId: 'user-guid-xyz',
      newRole: 'Editor',
    });
    expect(result).toEqual(mockResponse);
  });

  it('gọi GET /Admin/system-stats và trả về thống kê hệ thống', async () => {
    const mockStats = {
      totalUsers: 100,
      admins: 2,
      registeredUsers: 98,
      totalWorkspaces: 8,
      totalWorkspaceMembers: 32,
      serverTimeUtc: '2026-09-18T05:00:00Z',
    };
    get.mockResolvedValue({ data: mockStats });

    const result = await adminService.getSystemStats();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/Admin/system-stats');
    expect(result).toEqual(mockStats);
  });

  it('fallback an toàn khi server trả về lỗi hoặc offline', async () => {
    localStorage.setItem('userRole', 'ADMINISTRATOR');
    get.mockRejectedValue(new Error('Network error'));

    const usersResult = await adminService.getAllUsers(1, 20);
    expect(usersResult.items).toEqual([]);

    const statsResult = await adminService.getSystemStats();
    expect(statsResult.totalUsers).toBe(0);
  });

  describe('Workspace Session Policy (V1.2)', () => {
    const workspaceId = 'ws-test-123';

    it('gọi GET /Admin/workspaces/{workspaceId}/session-policy và trả về dữ liệu chính sách', async () => {
      const mockPolicy = {
        workspaceId,
        sessionLifetimeMinutes: 1440,
        idleTimeoutMinutes: 60,
        maxConcurrentSessions: 3,
      };
      get.mockResolvedValueOnce({ data: mockPolicy });

      const result = await adminService.getWorkspaceSessionPolicy(workspaceId);

      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(`/Admin/workspaces/${workspaceId}/session-policy`);
      expect(result).toEqual(mockPolicy);
    });

    it('gọi PUT /Admin/workspaces/{workspaceId}/session-policy và luôn gửi đủ 3 field (kể cả null)', async () => {
      const mockUpdated = {
        workspaceId,
        sessionLifetimeMinutes: 480,
        idleTimeoutMinutes: null,
        maxConcurrentSessions: 2,
      };
      put.mockResolvedValueOnce({ data: mockUpdated });

      const result = await adminService.updateWorkspaceSessionPolicy(workspaceId, {
        sessionLifetimeMinutes: 480,
        idleTimeoutMinutes: null,
        maxConcurrentSessions: 2,
      });

      expect(put).toHaveBeenCalledTimes(1);
      expect(put).toHaveBeenCalledWith(`/Admin/workspaces/${workspaceId}/session-policy`, {
        sessionLifetimeMinutes: 480,
        idleTimeoutMinutes: null,
        maxConcurrentSessions: 2,
      });
      expect(result).toEqual(mockUpdated);
    });

    it('ném lỗi có thông điệp tiếng Việt khi PUT thất bại', async () => {
      put.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Thời gian sống phiên phải từ 5 đến 43200 phút.' },
        },
      });

      await expect(
        adminService.updateWorkspaceSessionPolicy(workspaceId, {
          sessionLifetimeMinutes: 2,
          idleTimeoutMinutes: null,
          maxConcurrentSessions: null,
        }),
      ).rejects.toThrow('Thời gian sống phiên phải từ 5 đến 43200 phút.');
    });
  });

  describe('Workspace AI Config & Image Quota', () => {
    const workspaceId = 'ws-test-456';

    it('lấy cấu hình AI của Workspace bao gồm monthlyImageQuota', async () => {
      const mockConfig = {
        id: 'cfg-1',
        workspaceId,
        provider: 'Google Gemini',
        hasApiKey: true,
        isEnabled: true,
        monthlyTokenQuota: 500000,
        usedTokensCurrentMonth: 12000,
        allowedModels: ['gemini-1.5-pro'],
        monthlyImageQuota: 100,
        usedImagesCurrentMonth: 5,
        createdAt: '2026-10-01T00:00:00Z',
      };
      get.mockResolvedValueOnce({ data: mockConfig });

      const result = await adminService.getWorkspaceAiConfig(workspaceId);

      expect(get).toHaveBeenCalledWith(`/Admin/workspaces/${workspaceId}/ai-config`);
      expect(result).toEqual(mockConfig);
      expect(result.monthlyImageQuota).toBe(100);
      expect(result.usedImagesCurrentMonth).toBe(5);
    });

    it('cập nhật cấu hình AI của Workspace có monthlyImageQuota', async () => {
      const mockUpdated = {
        id: 'cfg-1',
        workspaceId,
        provider: 'Google Gemini',
        hasApiKey: true,
        isEnabled: true,
        monthlyTokenQuota: 800000,
        usedTokensCurrentMonth: 12000,
        allowedModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        monthlyImageQuota: 250,
        usedImagesCurrentMonth: 5,
        createdAt: '2026-10-01T00:00:00Z',
      };
      put.mockResolvedValueOnce({ data: mockUpdated });

      const payload = {
        provider: 'Google Gemini',
        isEnabled: true,
        monthlyTokenQuota: 800000,
        monthlyImageQuota: 250,
        allowedModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
      };

      const result = await adminService.updateWorkspaceAiConfig(workspaceId, payload);

      expect(put).toHaveBeenCalledWith(`/Admin/workspaces/${workspaceId}/ai-config`, payload);
      expect(result.monthlyImageQuota).toBe(250);
    });
  });
});
