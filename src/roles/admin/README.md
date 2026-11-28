# Role: Administrator (SystemRole)

## 1. Mô tả

Quản trị viên toàn hệ thống PanelForge. Chịu trách nhiệm cấu hình hạ tầng, hạn ngạch tài nguyên, chính sách bảo mật và tài khoản người dùng trên toàn bộ nền tảng.
_Tuân thủ BR-07: Administrator không trực tiếp tham gia hay thao tác dữ liệu bên trong các Studio Workspace._

## 2. Route & Màn hình

- **Route**: `/admin`, nằm trong `AppShell` chung giống Publisher Portal (header "PanelForge // Cổng Quản Trị" + sidebar hệ thống). Menu quản trị khai báo ở `getRoleNavConfig().ADMINISTRATOR` trong `src/app/AppShell.tsx`, mỗi mục trỏ `/admin?tab=<tab>`; `AdminDashboard.tsx` chỉ render nội dung theo `?tab=`. Đăng xuất, hồ sơ, 2FA nằm ở menu người dùng trên header.
- **Màn hình** (nhãn trên menu):
  - Tổng quan — `AdminDashboardView.tsx`: số liệu từ `GET /Admin/system-stats` + lối tắt tác vụ.
  - Người dùng & quyền — `AdminUserManagementView.tsx`: cấp/thu hồi quyền tạo Studio (BR-07).
  - Cấu hình AI — `modules/AIConfigurationView.tsx`: cấu hình theo Studio (`GET/PUT /Admin/workspaces/{id}/ai-config`, API key để trống = giữ khóa cũ) và báo cáo sử dụng (UC-15).
  - Tài nguyên & hạn mức — `modules/AdminResourcesView.tsx` (OPS-20..23): chính sách hạn mức cho Studio mới (`GET/PUT /Admin/quota-policy`), hàng chờ yêu cầu tăng hạn mức của Producer (`/Admin/quota-requests`, duyệt/từ chối), mức dùng dung lượng/token/ảnh AI từng Studio và sửa nhanh (`GET /Admin/resources`, `PUT /Admin/workspaces/{id}/resources`, 0 = không giới hạn). Thẻ đối soát dung lượng `modules/StorageReconcileCard.tsx` (OPS-22, `POST /Admin/storage/reconcile?apply=`): quét kho, tính lại dung lượng từ file còn dùng, liệt kê file mồ côi; chỉ ghi số mới khi Admin xác nhận, không xoá file.
  - Chính sách phiên — `modules/SessionPolicySettings.tsx` (CF1 V1.2).
  - Nhật ký hệ thống — `AdminAuditLogView.tsx` (UC-15). Thời gian đọc từ `timestampUtc`.
- **Ẩn khỏi menu**: `modules/MasterDataSettings.tsx` (chỉ có dữ liệu mẫu trong FE, chưa nối API). `AdminSystemSettingsView.tsx` không được render.

## 3. Giao diện

- Dùng token `--color-admin-*` (`src/styles/index.css`) và primitive trong `views/components/AdminUi.tsx` + `adminUiStyles.ts` (button, field, card, stat, badge, bảng, phân trang, modal Portal, toast).
- Không dùng nền/nút đen; nút chính cam với chữ `admin-ink-strong`. Không dùng `ui/Button` (biến thể primary màu mực) trong khu admin.
- Không đưa tên policy/claim/route/mã UC lên giao diện.
