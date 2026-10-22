# Thư mục Shared (`src/shared/`)

## 1. Mô tả
Thư mục `src/shared/` chứa toàn bộ các màn hình (views), tính năng phức hợp (features), thành phần giao diện cơ bản (components/ui), và các hộp thoại (modals) được sử dụng chung bởi nhiều role hoặc thuộc phạm vi toàn bộ người dùng đã đăng nhập trong PanelForge.

## 2. Cấu trúc thư mục

### 2.1 Views chung (`src/shared/views/`)
- `WorkspaceListView.tsx` (+ test): Danh sách các Studio Workspace người dùng tham gia hoặc sở hữu.
- `NotificationCenterView.tsx`: Trung tâm thông báo hệ thống và tác vụ.
- `UserProfileView.tsx`: Trang thông tin cá nhân người dùng, cài đặt bảo mật và đăng xuất.

### 2.2 Features phức hợp (`src/shared/features/`)
- **`series-bible/`**: Quản lý Kinh thánh bộ truyện (Series Bible), danh mục thực thể thế giới, nhân vật, đạo cụ và bản thảo sửa đổi (`SeriesBibleView.tsx`, `AddEntityModal.tsx`).
- **`pipeline-board/`**: Bảng điều phối tiến độ sản xuất dạng Kanban qua các giai đoạn kịch bản, nét vẽ, màu sắc, thoại và phê duyệt (`WorkflowBoardView.tsx`, `KanbanBoard.tsx`, `KanbanColumn.tsx`, `TaskCard.tsx`, `SideDrawer.tsx`).
- **`production-workspace/`**: Khung bàn làm việc sản xuất và trình biên tập tác vụ đa năng (`WorkspaceView.tsx`, `TaskEditorView.tsx`).
- **`account/`**: Quản lý tài khoản cá nhân, xác thực hai lớp và đổi mật khẩu (`ChangePasswordModal.tsx`, `TwoFactorSetupModal.tsx`).
- **`provenance/`** (CF4): Lịch sử & nguồn gốc chương: bản duyệt (snapshot), Provenance Report (Producer/Editor), lịch sử AI và lịch sử canvas từng trang có so sánh / khôi phục cho Producer, Artist (`ChapterProvenanceModal.tsx`, `PageHistoryPanel.tsx`, `provenanceRules.ts`).

### 2.3 UI Components (`src/shared/components/ui/`)
Các khối giao diện nguyên tử có kiểm soát quyền truy cập:
- `Badge.tsx`, `Button.tsx`, `Card.tsx`, `Input.tsx`
- `PermissionButton.tsx`, `PermissionField.tsx`, `PermissionGuard.tsx`

### 2.4 Modals dùng chung (`src/shared/modals/`)
- `AuditLogModal.tsx`: Xem nhật ký kiểm toán hành động trong hệ thống.
- `ProvenanceModals.tsx`: Xem lịch sử phiên bản (`VersionHistoryModal`) và nguồn gốc sáng tạo AI (`AIProvenanceModal`).
- `VectorStatusModal.tsx`: Trạng thái đồng bộ chỉ mục véc-tơ cho AI context.
- `CommandPaletteModal.tsx`: Hộp lệnh điều hướng nhanh (Ctrl+K).
- `SpreadWorkbenchModal.tsx`: Bàn làm việc trang đôi đa năng chuyển đổi giữa Writer, Editor và Artist.

