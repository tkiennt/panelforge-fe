# Role: Artist (WorkspaceRole / TaskRole)

## 1. Mô tả
Họa sĩ (Artist) chịu trách nhiệm phác thảo bố cục (Thumbnail/Storyboard), vẽ chì (Pencil), đi nét (Ink), phối màu (Color), thiết kế khung tranh (Panel Layout) và đối chiếu với hình ảnh/phong cách chuẩn trong Series Bible.

## 2. Route & Màn hình
- **Route mặc định**: `/workspaces/:workspaceId/series/:seriesId/artist`
- **Màn hình chính**:
  - `ArtistDeskView.tsx`: Bàn làm việc Họa sĩ (quản lý hàng đợi công việc, danh sách trang truyện theo chương, xem và tải lên bản vẽ).
  - `ArtistWorkspace.tsx`: Bàn làm việc nhanh của họa sĩ tích hợp trong Spread Workbench.

## 3. Thành phần (Components)
- `ArtworkCanvas.tsx`: Trình hiển thị và kéo thả bản vẽ trong Task Editor đa vai trò.
- `PanelLayoutControls.tsx`: Bộ điều khiển bố cục khung tranh tương tác (thanh công cụ phân tách, căn chỉnh lề, lưới gióng guides và handles co giãn).

## 4. Modals nghiệp vụ
- `FrameTemplateModal.tsx`: Hộp thoại áp dụng mẫu khung tranh tiêu chuẩn (4-Koma, Shonen, Shoujo...).
- `NewPageCardModal.tsx`: Khởi tạo thẻ trang vẽ mới trong quy trình.
- `PageDetailModal.tsx`: Xem chi tiết thông tin trang và các thuộc tính giai đoạn.
*(Lưu ý: `SpreadWorkbenchModal.tsx` được đặt tại `src/shared/modals/` do là bàn làm việc trang đôi dùng chung chuyển đổi linh hoạt giữa Writer, Editor và Artist).*

