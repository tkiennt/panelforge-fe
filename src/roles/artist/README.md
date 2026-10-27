# Role: Artist (WorkspaceRole / TaskRole)

## 1. Mô tả
Họa sĩ (Artist) chịu trách nhiệm phác thảo bố cục (Thumbnail/Storyboard), vẽ chì (Pencil), đi nét (Ink), phối màu (Color), thiết kế khung tranh (Panel Layout) và đối chiếu với hình ảnh/phong cách chuẩn trong Series Bible.

## 2. Route & Màn hình
- **Route mặc định**: `/workspaces/:workspaceId/series/:seriesId/artist`
- **Màn hình chính**:
  - `ArtistDeskView.tsx`: Bàn làm việc Họa sĩ, ưu tiên trang truyện (laptop 1366×768):
    - **Toolbar chính (1 hàng)**: thu gọn cột trái · Chương / Trang · trạng thái việc thật (Được giao / Đang làm / Cần sửa / Chờ duyệt · Đã duyệt có khoá "Chỉ xem") · **Ảnh hiển thị** (dropdown công đoạn, chỉ đổi ảnh xem, không đổi công đoạn công việc) · **Sửa bố cục** (bật/tắt) · **Tải ảnh ▾** (Từng khung / Cả trang) · 1 CTA chính theo ngữ cảnh (Bắt đầu việc / Tải ảnh khung; xám kèm lý do khi khoá; ẩn ở chế độ Cả trang vì thanh `PageArtworkWorkflow` đã có nút tải) · **Chi tiết** · **Trang ⋯** (Làm mới, Tham chiếu Bible, Tạo trang, Cài đặt trang, Xoá trang) · Zoom / Vừa khung.
    - **Sửa bố cục** (mặc định tắt): chỉ khi bật mới kéo/đổi cỡ/nhích phím khung, hiện tay nắm, nhãn kỹ thuật và thanh phụ `PanelLayoutToolbar` (Áp dụng mẫu khung, Thêm panel, Chia lại N khung, chọn tất cả, căn/giãn, cân đối bố cục, chia/xoá khung đang chọn). Thay đổi vẫn lưu khi thả chuột như cũ (không autosave mới).
    - **Cột trái** (188px, thu gọn được; drawer dưới 1024px): tab Trang (thumbnail đúng tỷ lệ, trạng thái, tạo trang, Nhiệm vụ chương) và Kịch bản (Bible theo khung, phân cảnh, dòng kịch bản).
    - **Cột Chi tiết** (mặc định đóng; inline từ 1280px, drawer có focus + Esc khi hẹp hơn): tab Khung (tải ảnh khung/Bắt đầu việc, thông số `PanelReadout`, toạ độ & thứ tự đọc, chia/xoá, phân cảnh, kiểm tra nhất quán AI), Phiên bản (nhóm theo công đoạn "Ink v1", đánh dấu bản đang xem, bấm để xem lớn — không đổi bản hiện hành), Phản hồi, Lớp.
    - Canvas tự "Vừa khung" khi đổi trang/đóng mở cột; không còn toolbar nổi hay nút đè lên tranh; thanh trạng thái mỏng phía dưới (ảnh đang xem, Chỉ xem, Lịch sử).
  - `ArtistWorkspace.tsx`: Bàn làm việc nhanh của họa sĩ tích hợp trong Spread Workbench.

## 3. Thành phần (Components)
- `ArtworkCanvas.tsx`: Trình hiển thị và kéo thả bản vẽ trong Task Editor đa vai trò.
- `PanelLayoutControls.tsx`: Bộ điều khiển bố cục khung tranh tương tác (thanh công cụ bố cục chỉ hiện khi "Sửa bố cục" với slot `leading`/`trailing`, căn chỉnh lề, lưới gióng guides, handles co giãn) và `PanelReadout` (vị trí/kích thước/lề khung, hiện trong Chi tiết → Khung).
- `PageArtworkWorkflow.tsx`: Luồng "Tải cả trang" 3 bước (Tải ảnh → Rà soát vùng → Xác nhận). Chọn / kéo thả / dán ảnh chỉ tạo bản xem trước; bấm "Tải lên" mới gọi upload artwork (SHA-256, điều kiện assignment giữ nguyên). Khi đã có artwork: "Tải phiên bản mới" và "Nhận diện panel & bóng thoại" (`POST /pages/{id}/split-artwork`, chỉ gợi ý). Dialog rà soát: chọn hướng đọc (mặc định theo Series), zoom/vừa khung/pan, kéo & đổi cỡ, thêm/xoá vùng, đổi thứ tự panel, gắn bóng ↔ panel, ẩn/hiện lớp gợi ý. Bản nháp tính theo pixel ảnh gốc (`utils/splitDraft.ts`); chỉ khi bấm "Xác nhận & lưu" mới tạo Panel mới (đánh số tiếp theo, không xoá panel cũ) và element `SPEECH_BALLOON` trống cho Letterer qua API sẵn có.

## 4. Modals nghiệp vụ
- `FrameTemplateModal.tsx`: Hộp thoại áp dụng mẫu khung tranh tiêu chuẩn (4-Koma, Shonen, Shoujo...).
- `NewPageCardModal.tsx`: Khởi tạo thẻ trang vẽ mới trong quy trình.
- `PageDetailModal.tsx`: Xem chi tiết thông tin trang và các thuộc tính giai đoạn.
*(Lưu ý: `SpreadWorkbenchModal.tsx` được đặt tại `src/shared/modals/` do là bàn làm việc trang đôi dùng chung chuyển đổi linh hoạt giữa Writer, Editor và Artist).*

