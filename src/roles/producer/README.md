# Role: Producer (WorkspaceRole)

## 1. Mô tả
Giám đốc Sản xuất (Producer) chịu trách nhiệm vận hành Studio Workspace, quản lý danh mục bộ truyện (Series), thiết lập quy trình Pipeline, quản lý ê-kíp sản xuất và kiểm soát tiến độ bàn giao toàn studio theo chuẩn thiết kế Stitch PanelForge.

## 2. Route & Màn hình (Chuẩn thiết kế Stitch)
- **Route mặc định**: `/workspaces/:workspaceId/overview` (cấp Studio) hoặc `/workspaces/:workspaceId/series/:seriesId/workspace` (cấp Series).
- **Màn hình chính theo view Stitch**:
  - `WorkspaceView.tsx` (`/series/:seriesId/workspace`): Bàn làm việc sản xuất và ma trận tiến độ (Task Grid 2D). Sub-tab bar chuẩn đúng 5 mục:
    1. **Ma trận trang** (`view-progress`): Trạng thái kịch bản, Series Bible readiness, tiến độ trang và lưới phân công 2D.
    2. **Tổng quan chương** (`view-chapters`): KPI tiến độ toàn bộ các chương, tiến độ trang hoàn tất và hạn bàn giao.
    3. **Kịch bản** (`view-script`): Điều hướng đến cổng soát duyệt kịch bản chương.
    4. **Đọc thử & Soát trang** (`view-reader`): Điều hướng đến giao diện đọc soát tranh.
    5. **Bàn giao** (`view-handoff`): Điều hướng đến đóng gói & xuất bản.
    - View **Đội ngũ** (`view-crew`): Quản lý phân bổ nhân sự ê-kíp, mở trực tiếp từ menu điều hướng sidebar.
  - `ProducerChapterManagementView.tsx` (`/series/:seriesId/chapters`): Quản lý chi tiết từng chương, khóa duyệt Gate 1-3, kiểm tra phân vai (cast blockers), quản lý ấn bản chương và kịch bản đã chốt (thay thế cho `DashboardView.tsx` cũ).
  - `ExportView.tsx` (`/series/:seriesId/export`): Đóng gói & Bàn giao xuất bản (PDF, CBZ, ảnh trang, webtoon, JSON kèm nguồn gốc `OPEN_JSON` có mã băm SHA-256).
  - `ProducerReaderStatsView.tsx` (`/workspaces/:workspaceId/reader-stats`): Thống kê doanh thu theo bộ truyện/ấn bản và số liệu lượt đọc độc giả trực tuyến (thay thế cho `ProducerPaymentsView.tsx` cũ).
  - `ScriptReviewView.tsx` (`/series/:seriesId/chapters/:chapterId/script/review`): Cổng duyệt kịch bản, kiểm tra tính nhất quán lời thoại và đối chiếu Series Bible.
  - `ReviewView.tsx` (`/series/:seriesId/chapters/:chapterId/review/:taskId`): Cổng đọc duyệt bản thảo và soát khung tranh.
  - `SeriesBibleView.tsx` (`/series/:seriesId/bible`): Thư viện thiết kế, hồ sơ nhân vật và quy tắc lore của Series.

## 3. Modals nghiệp vụ
- `CreateWorkspaceModal.tsx`: Tạo Studio Workspace mới.
- `InviteMemberModal.tsx` & `InviteResultModal.tsx`: Mời nhân sự vào Studio qua Email và phân vai trò.
- `SeriesMembersModal.tsx`: Quản lý nhân sự và phân quyền thực hiện theo từng Series.
- `SeriesPipelineModal.tsx`: Cấu hình các giai đoạn sản xuất (stages), cổng kiểm duyệt (approval gates) và luồng chuyển tiếp.
- `SeriesPresetsModal.tsx`: Thiết lập quy chuẩn font chữ (Typography Presets) và thông số kỹ thuật.
- `ChapterAssignmentsModal.tsx`: Quản lý và phân bổ nhiệm vụ thực hiện theo từng chương.
- `ChapterEditionsModal.tsx`: Quản lý danh sách ấn bản phát hành của chương.
- `PreviewLinksModal.tsx`: Tạo và quản lý liên kết xem trước bảo mật cho bản thảo chương.
