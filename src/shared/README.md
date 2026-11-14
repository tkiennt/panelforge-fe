# Thư mục Shared (`src/shared/`)

## 1. Mô tả
Thư mục `src/shared/` chứa toàn bộ các màn hình (views), tính năng phức hợp (features), thành phần giao diện cơ bản (components/ui), và các hộp thoại (modals) được sử dụng chung bởi nhiều role hoặc thuộc phạm vi toàn bộ người dùng đã đăng nhập trong PanelForge.

## 2. Cấu trúc thư mục

### 2.1 Views chung (`src/shared/views/`)
- `WorkspaceListView.tsx` (+ test): Danh sách các Studio Workspace người dùng tham gia hoặc sở hữu. Header dạng hero card (pill Studio Hub, tiêu đề serif, KPI thật: tổng studio, bạn sở hữu, việc chờ bạn, bài chờ duyệt), lọc Tất cả / Bạn sở hữu / Được mời khi có cả hai loại, card Level 1 trắng; token theo DESIGN_RULES (`workspaceShelf.css`). Dưới header: khối Lời mời đang chờ (chấp nhận/từ chối), dải "Việc của bạn" (việc chưa xong trên mọi studio, gần hạn trước; `WorkspaceShelfSections.tsx`, `workspaceShelfTasks.ts`); card hiện số series + ảnh bìa nhỏ, thanh dung lượng (Owner/Producer), "Cập nhật ... trước" từ `lastActivityAt`; tìm kiếm & sắp xếp khi có từ 6 studio.
- `NotificationCenterView.tsx`: Trung tâm thông báo hệ thống và tác vụ.
- `UserProfileView.tsx`: Trang thông tin cá nhân người dùng, cài đặt bảo mật và đăng xuất. Banner: ảnh bìa mẫu phủ toàn chiều ngang + lớp phủ kem (ngang trên desktop, dọc trên mobile), avatar trái, thông tin thật bên phải; nút "Đổi ảnh bìa" mở `features/profile/ProfileCoverPickerDialog` (chọn = xem trước, "Áp dụng" lưu qua `PUT /api/users/me/profile-cover`, "Hủy" trả bìa cũ). Danh mục mẫu: `utils/profileCovers.ts` (ID khớp Backend). Chuyển động: chỉ lớp ảnh (crossfade khi đổi + parallax ±6px theo chuột), tắt khi reduced-motion/cảm ứng.

### 2.2 Features phức hợp (`src/shared/features/`)
- **`series-bible/`**: Series Bible (`SeriesBibleView.tsx`): header dạng hero card kèm KPI (Chờ duyệt / Cần vẽ lại / Đã khoá Canon), sidebar trái gồm danh mục và quy trình khoá Canon (spec V2.6 §5.2), nội dung bên phải. Modal: `AddEntityModal.tsx`, `AddRevisionModal.tsx`, `ReworkModal.tsx`, `BibleEntityDetailModal.tsx`; danh mục dùng chung ở `bibleCategory.tsx`. Workbench một mục (`BibleEntityDetailModal`, toàn trang): sidebar gồm mục cùng danh mục, giai đoạn và "Xuất hiện trong kịch bản" (API `/bible/entries/{id}/usages`); vùng chính gồm dải trạng thái vòng đời (ai đang chờ, "Đến lượt bạn"), hai cột Đặc tả | Bản vẽ (ẩn bản vẽ với mục chỉ văn bản), rồi Phiên bản & nhật ký. Trường đặc tả theo danh mục khai báo một nơi ở `bibleSpec.ts` (lưu `detailsJson.attributes`); Artist xem đặc tả chỉ đọc khi nộp Concept.
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
- `PreviewLinksModal.tsx`: Producer tạo / thu hồi link xem thử; link sao chép dạng `{origin}/review/invite/{token}`.
- `ReviewHandoffModal.tsx`: Cầu nối Web → Mobile cho trang review công khai: QR chứa `/review/invite/{token}` (app Mobile tự bóc token ở cuối URL), mã token kèm nút Copy và hướng dẫn.
- `SpreadWorkbenchModal.tsx`: Bàn làm việc trang đôi đa năng chuyển đổi giữa Writer, Editor và Artist.

