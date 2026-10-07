# Role: Reader (External Role / Độc giả xem trước & công khai)

## 1. Mô tả
Độc giả (Reader) bao gồm khách hàng xem thử bản thảo qua liên kết xem thử an toàn có hình mờ bảo vệ bản quyền (Watermarked Preview), và độc giả duyệt tìm đọc danh mục các bộ truyện phát hành công khai (Public Catalog).

## 2. Route & Màn hình
- **Route mặc định**: `reader` (tại `/workspaces/:workspaceId/reader`) hoặc `/catalog`
- **Màn hình chính**:
  - `ReaderPortalView.tsx`: Trình đọc bản thảo truyện tranh hai trang/trang đơn toàn màn hình với lớp bảo vệ bản quyền và hình mờ watermark.
  - `ReaderWorkspace.tsx`: Môi trường kiểm thử phiên đọc an toàn mô phỏng client / test readers.
  - `PublicCatalogView.tsx`: Danh mục khám phá các bộ truyện công khai, chi tiết tác phẩm và các chương đã phát hành.
