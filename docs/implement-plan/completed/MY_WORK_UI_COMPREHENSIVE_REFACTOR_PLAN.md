# Kế Hoạch Triển Khai: Tối Ưu Hóa & Refactor Toàn Diện Màn Hình "Công Việc Của Tôi" (My Work View)

> **Trạng thái:** ✅ **Đã hoàn thành (Completed)**  
> **Ngày hoàn tất:** 17/10/2026  
> **Phạm vi kiểm thử:** 89/89 Unit Tests Passed (100%), Build Production Passed (0 errors).

- **Mục tiêu:** Nâng cấp trải nghiệm người dùng (UX/UI) cho màn hình trung tâm **Công việc của tôi** (`/workspaces/:workspaceId/series/:seriesId/my-work`), phục vụ đồng bộ cho tất cả các vai trò tác nghiệp nội dung (**Writer**, **Artist**, **Letterer**, **Editor**, **Producer**).
- **Vấn đề giải quyết:**
  - Các chi tiết chữ, badge và thông tin kỹ thuật hiện tại còn vụn vặt, quá nhỏ (`< 12px`: `text-[9px]`, `text-[10px]`, `text-[11px]`) gây mỏi mắt và khó thao tác.
  - Cụm điều hướng & thanh lọc tab văn bản dài ("Việc của tôi – toàn Studio") chiếm diện tích, thiếu điểm nhấn phân cấp.
  - Danh sách Panel Artwork bày quá nhiều nút bấm trên cùng một hàng gây rối mắt khi duyệt số lượng lớn khung tranh.
  - Màu sắc trạng thái chưa có độ tương phản phân định rõ giữa "Đang duyệt" (UnderReview) và "Đã duyệt" (Approved); nhãn "Mới nhất" chưa thu hút thị giác vào phiên bản hiện hành.
  - Thao tác xem Bible theo từng Panel cần gắn kết trực quan dạng Drawer trượt cạnh phải để đối chiếu trực tiếp với artwork mà không che khuất ngữ cảnh làm việc.
  - Tên file artwork cần hiển thị trực diện chỉ số phiên bản `(v...)` để Artist/Editor kiểm soát revision chính xác cho Quality Control (CF3).
- **Nguyên tắc thiết kế (Editorial AI Studio & Artisan Ink Pigments):**
  - **Typography:** Triệt tiêu hoàn toàn các class font `< 12px`. Sử dụng chuẩn `text-xs` (12px), `text-sm` (14px), `text-base` (16px), tiêu đề `text-xl`/`text-2xl`. Các metadata kỹ thuật (phiên bản, kích thước, sha256) dùng `font-mono text-xs`.
  - **Màu sắc & Trạng thái phân định rõ nét:**
    - **Đang duyệt (Pending/Under Review):** Nền vàng nghệ ấm `bg-amber-100 text-amber-900 border-amber-300 font-semibold`.
    - **Đã duyệt (Approved):** Xanh lục bảo `bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold`.
    - **Bị trả về (Rework Required):** Đỏ gạch `bg-rose-100 text-rose-900 border-rose-300 font-semibold`.
    - **Phiên bản mới nhất:** Nhấn màu tím AI Violet `bg-violet-100 text-violet-900 border-violet-300` hoặc Tangerine `#EA580C`.
  - **Phân cấp Breadcrumbs & Toolbar:** Nâng độ tương phản, đường dẫn `Workspaces > Series > Chapter` đậm nét, rõ ràng, bấm quay về cấp cha tức thì.
  - **Bố cục hàng gọn gàng (Compact Row & Progressive Disclosure):** Nhóm các nút phụ thành menu ngữ cảnh/dropdown hoặc icon tinh gọn ở trạng thái nghỉ, hiển thị đầy đủ khi hover.

---

## 2. Các File Trọng Tâm Sẽ Thực Hiện

| STT | Đường dẫn file | Vai trò trong đợt Refactor |
| :--- | :--- | :--- |
| 1 | `src/shared/features/collaboration/MyWorkView.tsx` | Trang điều hướng chính: Breadcrumb cục bộ, toolbar chọn chương, hệ thống Tab lọc gọn gàng ("Của tôi", "Chờ duyệt", "Tất cả", "Toàn Studio"), Scene Rail/Grouping. |
| 2 | `src/shared/features/collaboration/ArtworkPanel.tsx` | Thiết kế lại hàng Panel Artwork dạng Compact Row, chuẩn hóa màu badge trạng thái, hiển thị `(v...)` cạnh tên file, tối ưu menu tác vụ khi hover. |
| 3 | `src/shared/features/collaboration/AssignmentWorkCard.tsx` | Tinh chỉnh thẻ công việc (Card), cân đối typography, liên kết mượt mà với Bible Drawer cạnh phải khi bấm nút Bible trên từng Panel. |
| 4 | `src/shared/features/collaboration/BibleReferenceDrawer.tsx` | Tối ưu hóa Drawer tra cứu Bible theo Panel trượt từ phải sang: typography `>= 12px`, tab lọc panel/chương, đối chiếu tham chiếu nhân vật/bối cảnh. |
| 5 | `src/app/AppShell.tsx` | Nâng độ đậm và độ tương phản của thanh Breadcrumb toàn cục (Studio Workspace > Active Series > Chapter). |

---

## 3. Lộ Trình Triển Khai Chi Tiết (5 Giai Đoạn)

### 📌 Giai Đoạn 1: Cải Thiện Hệ Thống Phân Cấp & Điều Hướng (Navigation & Breadcrumbs)
- [x] **1.1. Nâng cấp Breadcrumb:**
  - Tăng độ đậm (`font-semibold`), màu mực tương phản cao (`text-[#0c0a09]`, dấu phân cách `text-[#a8a29e]`) trên thanh tiêu đề [AppShell.tsx](file:///d:/FPT-STUDY/10_FALL-2026/SEP490/Github/panelforge-fe/src/app/AppShell.tsx).
  - Bổ sung breadcrumb ngữ cảnh tại đầu trang [MyWorkView.tsx](file:///d:/FPT-STUDY/10_FALL-2026/SEP490/Github/panelforge-fe/src/shared/features/collaboration/MyWorkView.tsx) giúp nhận biết ngay vị trí hiện tại (Studio > Series > Tên chương).
- [x] **1.2. Thu gọn và Tối ưu Tab lọc nhanh:**
  - Rút gọn nhãn các tab trong [MyWorkView.tsx](file:///d:/FPT-STUDY/10_FALL-2026/SEP490/Github/panelforge-fe/src/shared/features/collaboration/MyWorkView.tsx):
    - `"Việc của tôi – toàn Studio"` ➔ `"Toàn Studio"` (kèm icon `Globe` và tooltip giải thích).
    - `"Tất cả công việc"` ➔ `"Tất cả"` (kèm icon `Layers`).
    - `"Việc của tôi"` ➔ `"Của tôi"` (kèm icon `User`).
    - `"Chờ duyệt"` ➔ `"Chờ duyệt"` (kèm icon `CheckCircle2` và badge cam nổi bật).
  - Hiển thị badge số lượng rõ nét: Sử dụng pill đếm tương phản cao, badge nổi bật cảnh báo khi có việc chờ duyệt.

---

### 📌 Giai Đoạn 2: Tối Ưu Hóa Giao Diện Danh Sách Panel Artwork (`ArtworkPanel.tsx`)
- [x] **2.1. Thiết kế lại hàng Panel (Compact Row Design):**
  - Cấu trúc lại bố cục mỗi khung: Khung số (`Khung #1`, `Đọc #1`), thông tin file hiện hành, nhóm nút hành động với hiệu ứng `group hover:border-zinc-300 hover:shadow-soft-sm`.
  - Gom các nút công cụ gọn gàng, nút Bible và nút Upload được nâng cấp size chuẩn `text-xs font-semibold` không còn bị nhỏ `text-[10px]`.
- [x] **2.2. Chuẩn hóa màu sắc trạng thái (Status Badges):**
  - Thay thế toàn bộ class `text-[10px]`, `text-[11px]` bằng `text-xs font-semibold`.
  - Badge **"Đang duyệt"**: Đổi sang nền vàng nghệ ấm `bg-amber-100 text-amber-900 border-amber-300 font-semibold`.
  - Badge **"Đã duyệt"**: Đổi sang nền ngọc lục bảo `bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold`.
  - Badge **"Bị trả về"**: Nền đỏ san hô `bg-rose-100 text-rose-900 border-rose-300 font-semibold`.
  - Badge **"Mới nhất"**: Điểm nhấn AI Violet `bg-violet-100 text-violet-900 border-violet-300 font-bold`.
- [x] **2.3. Hiển thị trực quan chỉ số phiên bản cạnh tên file:**
  - Định dạng rõ ràng: `<tên_file> (v2)` ngay trên dòng tiêu đề artwork trong panel hiện tại, bản cũ và cả trang.
  - Tách bạch dung lượng, thời gian tải và mã SHA-256 rút gọn `font-mono text-xs text-stone-500`.

---

### 📌 Giai Đoạn 3: Nâng Cấp Tương Tác Series Bible Drawer & Provenance
- [x] **3.1. Tương tác mượt mà với `BibleReferenceDrawer.tsx`:**
  - Thiết kế overlay backdrop tinh tế (`bg-black/30 md:bg-black/15 backdrop-blur-[1px]`), Drawer trượt êm ái từ mép phải (`slide-in-from-right`), không che khuất hoàn toàn tác phẩm giúp tra cứu song song nhân vật/bối cảnh trực quan.
  - Tự động highlight Panel đang chọn trong thanh chọn nhanh (`bg-[#0c0a09] text-white ring-2 ring-[#F97316]/30`).
- [x] **3.2. Chuẩn hóa giao diện trong `BibleReferenceDrawer.tsx`:**
  - Nâng cấp typography: Loại bỏ toàn bộ cỡ chữ nhỏ `< 12px` (như `text-[9px]`, `text-[10px]`, `text-[11px]`), đưa về chuẩn `text-xs` và `text-sm`.
  - Làm nổi bật huy hiệu **CANON LOCKED** màu hổ phách sang trọng kèm mã định danh và thông tin phiên bản khoá/hiệu lực chương rõ nét.

---

### 📌 Giai Đoạn 4: Cân Đối Kích Thước & Size Trên `AssignmentWorkCard.tsx`
- [x] **4.1. Tinh chỉnh Thẻ Công Việc (Assignment Card):**
  - Tăng độ thông thoáng với padding `p-5 md:p-6`, bo góc `rounded-2xl` viền `border-stone-200 hover:border-stone-300`.
  - Nâng cấp typography hộp Brief (`text-xs md:text-sm text-[#292524] bg-[#FAF8F5] p-3.5 rounded-xl border border-[#F0ECE1]`) và hộp phản hồi từ Editor (`bg-white/80 p-3 rounded-xl border border-rose-200/60 text-rose-900`) vô cùng dễ đọc.
  - Chuẩn hóa màu sắc trạng thái `STATUS_STYLE` đồng nhất với thẩm mỹ studio (Sky, Amber, Violet, Indigo, Emerald, Rose).
- [x] **4.2. Cụm nút hành động chính (Editorial Action CTA):**
  - Đồng bộ kích thước các nút CTA mở bàn vẽ, Script Editor, Lettering Canvas, Xem trước trang truyện và Tham chiếu Bible đạt chuẩn chiều cao `h-9 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-2xs`.

---

### 📌 Giai Đoạn 5: Kiểm Thử, Rà Soát Chất Lượng & Cập Nhật Tài Liệu
- [x] **5.1. Kiểm tra biên dịch & Typecheck:**
  - Chạy `npm run build` xác thực 100% không có lỗi TypeScript hay cú pháp (Hoàn tất thành công trong 23s).
- [x] **5.2. Chạy toàn bộ Unit Tests:**
  - Chạy `npx vitest run src/shared/features/collaboration/` đảm bảo toàn bộ **89/89 tests** cho `MyWorkView`, `ArtworkPanel`, `AssignmentWorkCard`, `BibleReferenceDrawer`, `collaborationRules`, `NotificationBell`, `ChapterReviewArtworkOverview` đều **PASSED** 100%.
- [x] **5.3. Nghiệm thu & Chuyển tài liệu:**
  - Kế hoạch đã được nghiệm thu toàn diện và di chuyển sang thư mục `docs/implement-plan/completed/`, cập nhật mục lục tại [docs/README.md](file:///d:/FPT-STUDY/10_FALL-2026/SEP490/Github/panelforge-fe/docs/README.md).
