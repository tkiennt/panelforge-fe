export type StudioRole = 'Lead Producer' | 'Artist' | 'Writer' | 'Editor' | 'Letterer';
export type RoleKey = 'producer' | 'artist' | 'writer' | 'editor' | 'letterer';

export type SystemRole = 'ADMINISTRATOR' | 'USER';

export type WorkspaceRole = 'PRODUCER' | 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR' | 'PUBLISHER';

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  roles: (WorkspaceRole | string)[];
}

export interface UserDto {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  canCreateStudio?: boolean;
  twoFactorEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
}

export interface AuthResponse {
  token?: string;
  refreshToken?: string;
  user?: UserDto;
  requiresTwoFactor?: boolean;
  twoFactorEmail?: string;
  message?: string;
}

/**
 * Chuẩn hóa SystemRole (chỉ có 2 giá trị toàn cục: ADMINISTRATOR hoặc USER).
 */
export function normalizeSystemRole(role: any): SystemRole {
  if (!role && role !== 0) return 'USER';
  const r = String(role).trim().toUpperCase();
  if (r === 'ADMIN' || r === 'ADMINISTRATOR' || r === '1') return 'ADMINISTRATOR';
  return 'USER';
}

/**
 * Kiểm tra chuỗi có đúng định dạng JWT (gồm 3 phần ngăn bởi 2 dấu chấm) và chưa hết hạn hay không.
 */
export function isValidJwt(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Giải mã claim role trực tiếp từ JWT token đã ký bởi backend (Single Source of Truth).
 * Tuyệt đối không tin cậy chuỗi userRole tự ghi trong localStorage.
 */
export function getRoleFromToken(customToken?: string | null): SystemRole | null {
  const token =
    customToken !== undefined
      ? customToken
      : typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null;

  if (!token) return null;

  // Hỗ trợ mock token phục vụ unit test / dev mode
  if (token === 'mock-admin-token') return 'ADMINISTRATOR';
  if (token.startsWith('mock-')) return 'USER';

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      // Kiểm tra hạn token nếu có exp claim
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }
      let roleClaim =
        payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      // JWT có thể chứa mảng role khi backend thêm nhiều claim cùng type
      if (Array.isArray(roleClaim)) {
        roleClaim = roleClaim[0];
      }
      if (roleClaim) {
        return normalizeSystemRole(roleClaim);
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Chuẩn hóa WorkspaceRole (6 role trong Workspace theo Entity E-11 & Core Flow).
 */
export function normalizeWorkspaceRole(role: any): WorkspaceRole | null {
  if (!role && role !== 0) return null;
  const r = String(role).trim().toUpperCase();
  if (r === 'PRODUCER' || r === '0') return 'PRODUCER';
  if (r === 'WRITER' || r === '1') return 'WRITER';
  if (r === 'ARTIST' || r === '2') return 'ARTIST';
  if (r === 'LETTERER' || r === '3') return 'LETTERER';
  if (r === 'EDITOR' || r === '4') return 'EDITOR';
  if (r === 'PUBLISHER' || r === '5') return 'PUBLISHER';
  return null;
}
