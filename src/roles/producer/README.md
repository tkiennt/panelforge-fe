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
  - `ProducerPaymentsView.tsx` (`/workspaces/:workspaceId/payments`): Thanh toán & Doanh thu VietQR — 4 KPI, lọc theo trạng thái/bộ truyện/tìm kiếm, duyệt hoặc từ chối (kèm lý do) giao dịch `Pending`, cấu hình tài khoản ngân hàng nhận tiền (xem trước mã VietQR). API: `payment.service.ts` → `WorkspacePaymentsController`. **Theo spec V2.6 (Q13, task RDR-12):** tiền nạp chuyển vào tài khoản của nền tảng, Admin duyệt giao dịch nạp; màn này của Producer chỉ còn xem doanh thu VNĐ theo ấn bản (RDR-06).

## 3. Modals nghiệp vụ
- `CreateWorkspaceModal.tsx`: Tạo Studio Workspace mới.
- `InviteMemberModal.tsx`: Mời nhân sự vào Studio qua Email và kích hoạt OTP.
- `CreateProjectModal.tsx`: Khởi tạo Series mới kèm mẫu Pipeline quy chuẩn.
- `SeriesChaptersModal.tsx`: Quản lý danh sách chương, số trang, đề cương và đếm ngược phát hành; cấu hình chương trả phí (`isLocked` + `priceVnd`, chọn nhanh 5k/10k/15k/20k) và badge `Miễn phí` / `🔒 {giá}đ`. **Theo spec V2.6 (Q7, Q10, task RDR-07):** giá chuyển sang Publisher đặt theo từng ấn bản ngôn ngữ; Producer chỉ xem.
- `SeriesPipelineModal.tsx`: Cấu hình các giai đoạn sản xuất (stages), cổng kiểm duyệt (approval gates) và luồng chuyển đổi (transitions).
- `SeriesPresetsModal.tsx`: Thiết lập quy chuẩn font chữ (Typography Presets) và luật nhất quán.
