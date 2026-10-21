/**
 * Tập trung toàn bộ URL endpoints của hệ thống PanelForge.
 * Tránh việc hardcode các chuỗi URL rải rác trong các services.
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/Auth/login',
    REGISTER: '/Auth/register',
    REFRESH: '/Auth/refresh',
    LOGOUT: '/Auth/logout',
    VERIFY_EMAIL: '/Auth/verify-email',
    RESEND_VERIFICATION: '/Auth/resend-verification',
    FORGOT_PASSWORD: '/Auth/forgot-password',
    RESET_PASSWORD: '/Auth/reset-password',
    SETUP_2FA: '/Auth/2fa/setup',
    VERIFY_2FA: '/Auth/2fa/verify',
    DISABLE_2FA: '/Auth/2fa/disable',
    EXTERNAL_LOGIN: '/Auth/external-login',
  },
  WORKSPACES: {
    BASE: '/Workspaces',
    MY_WORKSPACES: '/Workspaces/my-workspaces',
    BY_ID: (id: string) => `/Workspaces/${id}`,
    MEMBERS: (id: string) => `/Workspaces/${id}/members`,
    MEMBER_ROLE: (id: string, userId: string) => `/Workspaces/${id}/members/${userId}/role`,
    USAGE: (id: string) => `/Workspaces/${id}/usage`,
    AUDIT_LOGS: (id: string) => `/Workspaces/${id}/audit-logs`,
    SESSIONS: (id: string) => `/Workspaces/${id}/sessions`,
    REVOKE_SESSION: (id: string, sessionId: string) => `/Workspaces/${id}/sessions/${sessionId}`,
    INVITE: (id: string) => `/Workspaces/${id}/invitations`,
  },
  SERIES: {
    BASE: '/Series',
    BY_WORKSPACE: (workspaceId: string) => `/Workspaces/${workspaceId}/series`,
    BY_ID: (id: string) => `/Series/${id}`,
    COVER: (id: string) => `/Series/${id}/cover`,
    PIPELINE: (id: string) => `/Series/${id}/pipeline`,
    PRESETS: (id: string) => `/Series/${id}/presets`,
  },
  CHAPTERS: {
    BY_SERIES: (seriesId: string) => `/Series/${seriesId}/chapters`,
    BY_ID: (id: string) => `/Chapters/${id}`,
    PAGES: (id: string) => `/Chapters/${id}/pages`,
    PUBLISH: (id: string) => `/Chapters/${id}/publish`,
  },
  PIPELINE: {
    TEMPLATES: '/pipeline-templates',
    ACTIVE_TEMPLATES: '/pipeline-templates/active',
  },
  ADMIN: {
    USERS: '/Admin/users',
    STATS: '/Admin/stats',
    SYSTEM_CONFIG: '/Admin/config',
  },
} as const;
