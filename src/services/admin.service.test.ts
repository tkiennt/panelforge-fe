import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService, MOCK_ADMIN_USERS } from './admin.service';

describe('adminService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('gọi GET /api/Admin/users với page và pageSize và kèm Authorization header', async () => {
    localStorage.setItem('token', 'admin-token-123');
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

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    globalThis.fetch = fetchMock;

    const result = await adminService.getAllUsers(1, 10);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/Admin/users?page=1&pageSize=10');
    expect(options.method).toBe('GET');
    expect(options.headers['Authorization']).toBe('Bearer admin-token-123');
    expect(result).toEqual(mockResponse);
  });

  it('gọi POST /api/Admin/assign-role và trả về kết quả thành công', async () => {
    localStorage.setItem('token', 'custom-token');
    const mockResponse = {
      message: 'Đã cập nhật vai trò thành công',
      userId: 'user-guid-xyz',
      newRole: 'Editor',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    globalThis.fetch = fetchMock;

    const result = await adminService.assignRole({ userId: 'user-guid-xyz', newRole: 'Editor' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/Admin/assign-role');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer custom-token');
    expect(JSON.parse(options.body)).toEqual({
      userId: 'user-guid-xyz',
      newRole: 'Editor',
    });
    expect(result).toEqual(mockResponse);
  });

  it('gọi GET /api/Admin/system-stats và trả về thống kê hệ thống', async () => {
    const mockStats = {
      totalUsers: 100,
      admins: 2,
      registeredUsers: 98,
      totalWorkspaces: 8,
      totalWorkspaceMembers: 32,
      serverTimeUtc: '2026-09-18T05:00:00Z',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStats),
    });
    globalThis.fetch = fetchMock;

    const result = await adminService.getSystemStats();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/Admin/system-stats');
    expect(options.method).toBe('GET');
    expect(result).toEqual(mockStats);
  });

  it('fallback an toàn khi server trả về lỗi hoặc offline', async () => {
    localStorage.setItem('userRole', 'ADMINISTRATOR');
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = fetchMock;

    const usersResult = await adminService.getAllUsers(1, 20);
    expect(usersResult.items).toEqual([]);

    const statsResult = await adminService.getSystemStats();
    expect(statsResult.totalUsers).toBe(0);
  });
});
