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
- `components/page-layout-editor/`: Bộ công cụ biên tập bố cục khung tranh (Page Layout):
  - `CanvasEditor.tsx`: Canvas chỉnh sửa khung tranh tương tác.
  - `CanvasPanelItem.tsx`: Từng khung tranh trên trang (panel bounds, tỷ lệ, hình ảnh, lớp phủ overlay).
  - `PanelProperties.tsx`: Bảng thuộc tính khung tranh (kích thước, giai đoạn xử lý, ghi chú).
  - `BibleReferencePanel.tsx`: Bảng tra cứu tham chiếu nhanh thực thể Bible (nhân vật, bối cảnh, đạo cụ, phong cách).
  - `AILayoutModal.tsx`: Hộp thoại gợi ý và sinh bố cục khung tranh tự động từ AI.

## 4. Modals nghiệp vụ
- `NewPageCardModal.tsx`: Khởi tạo thẻ trang vẽ mới trong quy trình.
- `PageDetailModal.tsx`: Xem chi tiết thông tin trang và các thuộc tính giai đoạn.
*(Lưu ý: `SpreadWorkbenchModal.tsx` được đặt tại `src/shared/modals/` do là bàn làm việc trang đôi dùng chung chuyển đổi linh hoạt giữa Writer, Editor và Artist).*

