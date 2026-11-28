# Role: Reader (External Role / Độc giả xem trước & công khai)

## 1. Mô tả

Độc giả (Reader) bao gồm khách hàng xem thử bản thảo qua liên kết xem thử an toàn có hình mờ bảo vệ bản quyền (Watermarked Preview), và độc giả duyệt tìm đọc danh mục các bộ truyện phát hành công khai (Public Catalog).

## 2. Route & Màn hình

- **Route mặc định**: `/catalog` (`/reader` chuyển hướng về đây); link xem thử: `/review/invite/:token` (link cũ `/preview/:token` tự chuyển hướng; cùng định dạng route với app Mobile)
- **Độc giả là ai** (quyết định 2026-11-28): User không thuộc Studio nào và không được tạo Studio, tức `landing-context = PublicCatalog` (`app/readerAccount.ts`). Không có vai trò `READER` ở backend.
- **Khu độc giả**: mọi trang dưới `/catalog` dùng `layout/ReaderLayout.tsx` (header marketplace: Truyện, Thông báo kèm số lời mời Studio đang chờ, Hồ sơ, Đăng xuất). `/catalog/profile` dùng `UserProfileView variant='reader'`; `/catalog/notifications` là `views/ReaderNotificationsView.tsx` (lời mời vào Studio + thông báo). Nhận lời mời thì tài khoản thành thành viên Studio và chuyển sang `/workspaces`.
- **Ví, mở khóa, Thư viện**: `/catalog/wallet` (`views/ReaderWalletView.tsx`: số dư, nạp VietQR, lịch sử), mở khóa ấn bản bằng Ví ở `components/UnlockEditionModal.tsx` (gửi `expectedPriceVnd`, 409 thì tải lại giá), `/catalog/library` (`views/ReaderLibraryView.tsx`: Theo dõi, Đọc sau, Yêu thích, Lịch sử đọc).
- **Gói mở Studio** (spec D11): `/catalog/open-studio` (`views/ReaderOpenStudioView.tsx`) cho khách và độc giả. Giá lấy từ `GET /api/catalog/studio-package`; mua bằng Ví qua `POST /api/wallet/studio-package {expectedPriceVnd}` (thiếu tiền thì sang Ví nạp đúng số còn thiếu). Mua xong `App.tsx` bật `canCreateStudio`, tải lại landing-context rồi mở `/workspaces` để tạo Studio. Admin đặt giá ở tab Người dùng & quyền (`admin/views/components/StudioPackagePriceCard.tsx`).
- **Chặn route Studio**: `ReaderGate` (`app/routes.tsx`) chuyển độc giả từ `/workspaces`, `/my-work`, `/workspaces/*`, `/profile`, `/notifications`, `/admin`, `/publisher` sang trang tương ứng trong `/catalog`.
- **Màn hình chính**:
  - `PublicPreviewView.tsx`: đọc bản xem thử qua link có hạn, có watermark email người nhận, gửi phản hồi (tên người nhận xét không bắt buộc, gửi qua trường `reviewerName` của `POST /api/preview/feedback`, Producer thấy tên này trong danh sách phản hồi; chọn trang; danh sách góp ý đã gửi trong phiên). Xem Từng trang / Cuộn dọc, watermark trên mọi trang (BR-16). Nút "Mở trên App / Quét QR" mở `ReviewHandoffModal` để chuyển sang Mobile vẽ tay.
  - `PublicCatalogView.tsx`: Trang chủ độc giả (độc giả đăng nhập mà không thuộc Studio nào được `landing-context = PublicCatalog` đưa thẳng vào đây). 4 tab: **Trang chủ** (truyện đọc nhiều tuần, Top tuần, chương mới cập nhật, truyện theo từng Studio), **Mới cập nhật** (nhóm theo ngày ra chương), **Xếp hạng** (lượt đọc thật Ngày/Tuần/Tháng), **Tất cả truyện** (tìm kiếm, lọc thể loại, phân trang). Chi tiết truyện ở `components/SeriesDetailModal.tsx` (bìa, trạng thái, chỉ ngôn ngữ đã phát hành theo BR-34, Free / Đã mở khóa / giá VNĐ từng chương); gom nhóm và xếp hạng ở `components/catalogSections.ts`.
