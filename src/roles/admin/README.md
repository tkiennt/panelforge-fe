# Role: Administrator (SystemRole)

## 1. Mô tả
Quản trị viên toàn hệ thống PanelForge. Chịu trách nhiệm cấu hình hạ tầng, hạn ngạch tài nguyên, chính sách bảo mật và tài khoản người dùng trên toàn bộ nền tảng.
*Tuân thủ BR-07: Administrator không trực tiếp tham gia hay thao tác dữ liệu bên trong các Studio Workspace.*

## 2. Route & Màn hình
- **Route mặc định**: `/admin`
- **Màn hình chính**:
  - `AdminDashboard.tsx`: Khung điều hướng Admin Portal (sidebar tabbed interface).
  - `AdminDashboardView.tsx`: Tab Tổng quan sức khỏe hệ thống & thông số hoạt động (Overview & Health).
  - `AdminUserManagementView.tsx`: Tab Quản lý người dùng, phân quyền Producer/SystemRole.
  - `modules/MasterDataSettings.tsx`: Tab Master Data & Presets quy trình pipeline.
  - `modules/AIConfigurationView.tsx`: Tab Cấu hình AI Provider Credentials, Model Quotas, Token Usage Report & Audit Call Records (UC-15).
  - `modules/StorageBackupSettings.tsx`: Tab Cấu hình sao lưu & lưu trữ.
  - `modules/SessionPolicySettings.tsx`: Tab Chính sách phiên làm việc (Session Policy) theo Workspace (CF1 V1.2).
  - `AdminAuditLogView.tsx`: Tab Lịch sử kiểm toán toàn hệ thống (Audit Logs, UC-15).

## 3. Cấu trúc thư mục
- `views/`: Chứa các màn hình và module giao diện quản trị.
- `components/`: Các bảng biểu và component con phục vụ màn quản trị.
- `modals/`: Các modal nghiệp vụ (tạo/sửa/xóa user, gán quyền).
