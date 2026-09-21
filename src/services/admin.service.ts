// src/services/admin.service.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5044';

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  isEmailConfirmed: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  projectRoles?: { projectId: string; roles: string[] }[];
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  pageSize: number;
  items: AdminUserItem[];
}

export interface AssignRoleRequest {
  userId: string;
  newRole: string | number;
}

export interface AssignRoleResponse {
  message: string;
  userId: string;
  newRole: string;
}

export interface SystemStatsResponse {
  totalUsers: number;
  admins: number;
  moderators: number;
  standardUsers: number;
  serverTimeUtc: string;
}

async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    if (typeof response.json === 'function') {
      const data = await response.json();
      if (data && typeof data === 'object' && data.message) {
        return data.message;
      }
    }
  } catch {
    // response body empty or non-JSON
  }

  if (response.status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập (401 Unauthorized).';
  }
  if (response.status === 403) {
    return 'Bạn không có quyền quản trị viên để thực hiện thao tác này (403 Forbidden).';
  }
  return defaultMessage;
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

// Fallback Mock Users when offline or demo
export const MOCK_ADMIN_USERS: AdminUserItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@panelforge.com',
    fullName: 'System Super Admin',
    phoneNumber: '+84 901 000 001',
    role: 'Admin',
    isActive: true,
    isEmailConfirmed: true,
    twoFactorEnabled: true,
    createdAt: '2026-01-01T08:00:00Z',
    projectRoles: [{ projectId: 'proj-1', roles: ['ADMINISTRATOR'] }],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'producer@panelforge.com',
    fullName: 'Tatsuki Fujimoto',
    phoneNumber: '+84 901 000 002',
    role: 'Producer',
    isActive: true,
    isEmailConfirmed: true,
    twoFactorEnabled: true,
    createdAt: '2026-01-15T09:30:00Z',
    projectRoles: [{ projectId: 'proj-1', roles: ['PRODUCER'] }],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'writer@panelforge.com',
    fullName: 'Gen Urobuchi',
    phoneNumber: '+84 901 000 003',
    role: 'Writer',
    isActive: true,
    isEmailConfirmed: true,
    twoFactorEnabled: false,
    createdAt: '2026-02-01T10:15:00Z',
    projectRoles: [{ projectId: 'proj-1', roles: ['WRITER'] }],
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'artist@panelforge.com',
    fullName: 'Yusuke Murata',
    phoneNumber: '+84 901 000 004',
    role: 'Artist',
    isActive: true,
    isEmailConfirmed: true,
    twoFactorEnabled: true,
    createdAt: '2026-02-10T14:20:00Z',
    projectRoles: [{ projectId: 'proj-1', roles: ['ARTIST'] }],
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'letterer@panelforge.com',
    fullName: 'Stan Sakai',
    phoneNumber: '+84 901 000 005',
    role: 'Letterer',
    isActive: true,
    isEmailConfirmed: true,
    twoFactorEnabled: false,
    createdAt: '2026-02-20T11:00:00Z',
    projectRoles: [{ projectId: 'proj-1', roles: ['LETTERER'] }],
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    email: 'editor@panelforge.com',
    fullName: 'Kazuhiko Torishima',
    phoneNumber: '+84 901 000 006',
    role: 'Editor',
    isActive: true,
    isEmailConfirmed: true,
    twoFactorEnabled: true,
    createdAt: '2026-03-01T08:45:00Z',
    projectRoles: [{ projectId: 'proj-1', roles: ['EDITOR'] }],
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'reader@panelforge.com',
    fullName: 'Early Access Fan Reader',
    phoneNumber: '+84 901 000 007',
    role: 'Reader',
    isActive: true,
    isEmailConfirmed: true,
    twoFactorEnabled: false,
    createdAt: '2026-03-10T16:30:00Z',
    projectRoles: [{ projectId: 'proj-1', roles: ['READER'] }],
  },
];

export const adminService = {
  /**
   * Lấy danh sách toàn bộ người dùng có phân trang (GET /api/Admin/users?page=&pageSize=)
   */
  getAllUsers: async (page = 1, pageSize = 20, token?: string): Promise<AdminUsersResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/Admin/users?page=${page}&pageSize=${pageSize}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể tải danh sách người dùng.'));
      }

      return await response.json();
    } catch (err: any) {
      // Nếu là lỗi phân quyền hoặc network offline trong môi trường dev/demo, cho phép fallback
      console.warn('adminService.getAllUsers error, using mock fallback:', err.message);
      return {
        total: MOCK_ADMIN_USERS.length,
        page,
        pageSize,
        items: MOCK_ADMIN_USERS,
      };
    }
  },

  /**
   * Phân quyền vai trò mới cho người dùng (POST /api/Admin/assign-role)
   */
  assignRole: async (request: AssignRoleRequest, token?: string): Promise<AssignRoleResponse> => {
    const response = await fetch(`${API_URL}/api/Admin/assign-role`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, 'Không thể phân quyền cho người dùng.'));
    }

    return await response.json();
  },

  /**
   * Lấy thống kê tổng quan hệ thống (GET /api/Admin/system-stats)
   */
  getSystemStats: async (token?: string): Promise<SystemStatsResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/Admin/system-stats`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Không thể tải thống kê hệ thống.'));
      }

      return await response.json();
    } catch (err: any) {
      console.warn('adminService.getSystemStats error, using mock fallback:', err.message);
      return {
        totalUsers: 148,
        admins: 3,
        moderators: 8,
        standardUsers: 137,
        serverTimeUtc: new Date().toISOString(),
      };
    }
  },
};
