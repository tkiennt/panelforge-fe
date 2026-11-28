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
- **Lời mời vào Studio** (`components/StudioInvitationList.tsx`): ở `/catalog/notifications`, mỗi lời mời hiện vai trò (Producer/Writer/Artist/Letterer/Editor, mô tả ở `components/studioRoles.tsx`) và việc của vai trò; "Xem chi tiết" mở Modal liệt kê công việc. Nhận lời mời → `/catalog/welcome/:workspaceId` (`views/StudioWelcomeView.tsx`, nhận `location.state`) với 3 bước đầu theo vai trò, rồi "Vào Studio".
- **Trang chủ độc giả**: băng truyện nổi bật tự chuyển (`components/CatalogHero.tsx`, top lượt đọc tuần, tôn trọng giảm chuyển động), "Đọc tiếp" từ lịch sử đọc (`components/ContinueReadingRow.tsx`), chip thể loại mở tab Tất cả truyện.

## 3. Dữ liệu mẫu (test UI không cần BE)

- Bật: mở bất kỳ trang nào với `?mock=1` (nhớ trong localStorage) hoặc đặt `VITE_READER_MOCK=true`. Tắt: `?mock=0` hoặc nút "Tắt dữ liệu mẫu" trên dải vàng đầu trang.
- `src/mocks/reader/mockReaderAdapter.ts` là axios adapter giả lập đúng đường dẫn + DTO của BE cho catalog, Ví (nạp VietQR tự duyệt sau ~6 giây, mở khóa ấn bản, gói mở Studio 199.000 ₫), Thư viện, thông báo, lời mời Studio và đăng nhập (email/mật khẩu bất kỳ). Request khác vẫn đi tới BE thật, nên view không có nhánh mock riêng.
- Dữ liệu: 12 bộ truyện, 4 Studio, chương VI/EN, miễn phí và trả phí (`mockReaderData.ts`); ảnh bìa và trang là SVG sinh bằng code (`mockArt.ts`). Trạng thái độc giả lưu ở localStorage `pf_reader_mock_state`; "Đặt lại dữ liệu" đưa về ban đầu.
- Khu Studio tối thiểu (`mockStudioData.ts`): sau khi nhận lời mời, `/workspaces`, tổng quan Studio, `/my-work` và trang Việc của tôi theo bộ truyện chạy bằng dữ liệu mẫu theo vai trò (Writer, Artist, Letterer, Editor). Màn soạn kịch bản, canvas vẽ và nộp bài vẫn cần BE thật.
- Module mock chỉ được nạp động khi bật cờ (`src/main.tsx`), bản build thường không kéo theo.
