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
  - `ProducerChapterManagementView.tsx` (`/series/:seriesId/chapters`): Trung tâm điều hành Tổng quan chương: stepper Vòng đời chương nhỏ gọn, Điều kiện sản xuất (tự thu gọn khi đang sản xuất), KPI tách biệt Công việc / Trang / Khung tranh có chặn chia 0, Việc cần xử lý và Hoạt động gần đây (dùng `Card`/`CardHeader`/`ProgressBar`/`StatusBadge`).
  - `ExportView.tsx` (`/series/:seriesId/export`): Kiểm duyệt & Bàn giao xuất bản gồm 2 tab nội bộ (Bàn giao & Xuất file, Kiểm duyệt & Đọc thử); khi chưa có chương duyệt vẫn hiển thị danh sách chương đang xử lý kèm liên kết tới Tổng quan / Bảng sản xuất.
  - `SeriesRevenueView.tsx` (`/series/:seriesId/revenue`): Màn hình cấp bộ truyện (`ProducerSharedHeader mode="series"`), lọc theo trạng thái chương, phân tách rõ số liệu lượt đọc thật và trạng thái chưa kết nối dữ liệu thanh toán.
  - `ProducerReaderStatsView.tsx` (`/workspaces/:workspaceId/reader-stats`): Thống kê lượt đọc độc giả trực tuyến theo bộ truyện và chương (tái sử dụng `ReaderStatsView` với `PageHeader` và `Card`).
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
