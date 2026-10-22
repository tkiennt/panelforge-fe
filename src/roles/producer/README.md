# Role: Producer (WorkspaceRole)

## 1. Mô tả
Giám đốc Sản xuất (Producer) chịu trách nhiệm vận hành Studio Workspace, quản lý danh mục bộ truyện (Series), thiết lập quy trình Pipeline, quản lý thành viên và kiểm soát tài nguyên toàn studio.

## 2. Route & Màn hình
- **Route mặc định**: `/workspaces/:workspaceId/overview` hoặc `/workspaces/:workspaceId/series/:seriesId/dashboard`
- **Màn hình chính**:
  - `ProducerWorkspaceView.tsx`: Bàn làm việc tổng quan Studio Workspace (quản lý Series, thành viên, thước đo Storage, AI Token và Quota sinh ảnh).
  - `DashboardView.tsx`: Màn hình tổng quan bộ truyện (Series Dashboard).
  - `MembersRolesView.tsx`: Quản lý thành viên và phân quyền trong Studio Workspace.
  - `SeriesMembersView.tsx`: Phân bổ nhân sự thực hiện từng bộ truyện cụ thể.
  - `ExportView.tsx`: Quản lý tác vụ xuất bản, đóng gói file giao nộp (PDF, CBZ, ảnh trang, webtoon, JSON kèm nguồn gốc `OPEN_JSON` có SHA-256 để kiểm chứng).

## 3. Modals nghiệp vụ
- `CreateWorkspaceModal.tsx`: Tạo Studio Workspace mới.
- `InviteMemberModal.tsx`: Mời nhân sự vào Studio qua Email và kích hoạt OTP.
- `CreateProjectModal.tsx`: Khởi tạo Series mới kèm mẫu Pipeline quy chuẩn.
- `SeriesChaptersModal.tsx`: Quản lý danh sách chương, số trang, đề cương và đếm ngược phát hành.
- `SeriesPipelineModal.tsx`: Cấu hình các giai đoạn sản xuất (stages), cổng kiểm duyệt (approval gates) và luồng chuyển đổi (transitions).
- `SeriesPresetsModal.tsx`: Thiết lập quy chuẩn font chữ (Typography Presets) và luật nhất quán.
