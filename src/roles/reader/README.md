# Role: Reader (External Role / Độc giả xem trước & công khai)

## 1. Mô tả
Độc giả (Reader) bao gồm khách hàng xem thử bản thảo qua liên kết xem thử an toàn có hình mờ bảo vệ bản quyền (Watermarked Preview), và độc giả duyệt tìm đọc danh mục các bộ truyện phát hành công khai (Public Catalog).

## 2. Route & Màn hình
- **Route mặc định**: `/catalog` (`/reader` chuyển hướng về đây); link xem thử: `/preview/:token`
- **Màn hình chính**:
  - `PublicPreviewView.tsx`: đọc bản xem thử qua link có hạn, có watermark email người nhận, gửi phản hồi.
  - `PublicCatalogView.tsx`: Danh mục khám phá các bộ truyện công khai, chi tiết tác phẩm và các chương đã phát hành.
