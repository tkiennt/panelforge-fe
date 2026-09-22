/**
 * PanelForge Admin Module
 * Quản lý toàn bộ tính năng và màn hình liên quan đến Role Administrator (RBAC)
 * Kết nối trực tiếp với Backend PanelForge.API.Controllers.AdminController
 */

// Services & DTOs
export {
  adminService,
  type AdminUserItem,
  type AdminUsersResponse,
  type AssignRoleRequest,
  type AssignRoleResponse,
  type SystemStatsResponse,
  MOCK_ADMIN_USERS,
} from '../services/admin.service';

// Admin Views
export {
  AdminDashboardView,
  AdminUserManagementView,
  AdminSystemSettingsView,
  AdminAuditLogView,
} from '../views/admin';
