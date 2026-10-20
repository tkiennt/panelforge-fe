# Role: Administrator (SystemRole)

## 1. Mô tả

Quản trị viên toàn hệ thống PanelForge. Chịu trách nhiệm cấu hình hạ tầng, hạn ngạch tài nguyên, chính sách bảo mật và tài khoản người dùng trên toàn bộ nền tảng.
_Tuân thủ BR-07: Administrator không trực tiếp tham gia hay thao tác dữ liệu bên trong các Studio Workspace._

## 2. Route & Màn hình

- **Route**: `/admin` (khung riêng, không dùng AppShell sản xuất). Điều hướng bằng tab trong `AdminDashboard.tsx`.
- **Màn hình** (nhãn trên menu):
  - Tổng quan — `AdminDashboardView.tsx`: số liệu từ `GET /Admin/system-stats` + lối tắt tác vụ.
  - Người dùng & quyền — `AdminUserManagementView.tsx`: cấp/thu hồi quyền tạo Studio (BR-07).
  - Cấu hình AI — `modules/AIConfigurationView.tsx`: cấu hình theo Studio (`GET/PUT /Admin/workspaces/{id}/ai-config`, API key để trống = giữ khóa cũ) và báo cáo sử dụng (UC-15).
  - Lưu trữ & quota — `modules/StorageBackupSettings.tsx`: hạn mức lưu trữ từng Studio (BR-16).
  - Chính sách phiên — `modules/SessionPolicySettings.tsx` (CF1 V1.2).
  - Nhật ký hệ thống — `AdminAuditLogView.tsx` (UC-15). Thời gian đọc từ `timestampUtc`.
- **Ẩn khỏi menu**: `modules/MasterDataSettings.tsx` (chỉ có dữ liệu mẫu trong FE, chưa nối API). `AdminSystemSettingsView.tsx` không được render.

## 3. Giao diện

- Dùng token `--color-admin-*` (`src/styles/index.css`) và primitive trong `views/components/AdminUi.tsx` + `adminUiStyles.ts` (button, field, card, stat, badge, bảng, phân trang, modal Portal, toast).
- Không dùng nền/nút đen; nút chính cam với chữ `admin-ink-strong`. Không dùng `ui/Button` (biến thể primary màu mực) trong khu admin.
- Không đưa tên policy/claim/route/mã UC lên giao diện.
