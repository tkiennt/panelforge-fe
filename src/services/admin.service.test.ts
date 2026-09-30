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
});
