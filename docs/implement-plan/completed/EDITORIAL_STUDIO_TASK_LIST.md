# 📋 Danh Sách Nhiệm Vụ (Task List): Triển Khai Editorial AI Studio Design System Vào PanelForge

> **Tham chiếu chuẩn thẩm mỹ:** `VoltAgent/awesome-design-md` — Thiết kế Quiet Editorial Magazine & Atmospheric Orbs.  
> **Dự án áp dụng:** PanelForge Frontend (`panelforge-fe`).  
> **Tài liệu chiến lược:** [`docs/implement-plan/completed/EDITORIAL_STUDIO_DESIGN_PLAN.md`](./EDITORIAL_STUDIO_DESIGN_PLAN.md).  
> **Quy ước định danh:** Giữ nguyên 100% tên gọi, cấu trúc file và nhận diện thương hiệu của hệ thống **PanelForge** (không gắn tiền tố của bất kỳ nền tảng bên ngoài nào vào tên file hay component).

---

## 🧭 Bộ Quy Tắc Thẩm Mỹ Cốt Lõi (Core Aesthetic Rules)
1. **Phong cách chủ đạo:** Tạp chí in ấn cao cấp, yên tĩnh (quiet editorial print magazine) kết hợp phòng sản xuất manga AI hiện đại.
2. **Nền tảng Canvas & Ink:** Nền giấy canvas off-white `#f5f5f5`, chữ màu mực đen ấm `#0c0a09` / `#292524`, chữ thân bài `#4e4e4e`.
3. **Màu sắc thương hiệu khí quyển (Atmospheric Voltage):** Sử dụng các khối gradient pastel mờ (Mint `#a7e5d3`, Peach `#f4c5a8`, Lavender `#c8b8e0`, Sky `#a8c8e8`, Rose `#e8b8c4`) tạo chiều sâu, nói không với nút bấm neon chói gắt.
4. **Typography:** Tiêu đề lớn dùng font display serif thanh mảnh (weight 300, tracking âm), thân bài và điều hướng dùng **Inter**.
5. **Nút bấm & Pill:** Nút chính dạng viên thuốc đen mực (`rounded-full bg-[#292524] text-white`), nút phụ dạng viền mảnh trong suốt (`rounded-full border border-[#e7e5e4] text-[#0c0a09]`).
6. **Không dùng Micro-font:** Nghiêm cấm dùng `text-[9px]`, `text-[10px]`, `text-[11px]`. Kích thước nhỏ nhất trong toàn hệ thống là `text-xs` (12px).

---

## 📦 Giai Đoạn 0: Cài Đặt Thư Viện & Token Theme (Foundation & Setup)

- [x] **0.1 Cài đặt Font Inter chính thức:**
  - [x] Cài đặt gói `@fontsource/inter` vào `package.json`.
  - [x] Import các trọng số `400`, `500`, `600`, `700` vào `src/main.tsx`.
- [x] **0.2 Khai báo Token Theme trong Tailwind v4:**
  - [x] Khai báo các biến màu `--color-canvas-editorial`, `--color-ink`, `--color-body-editorial`, `--color-hairline`, `--color-surface-*`, và `--color-orb-*` trong `src/styles/index.css`.
  - [x] Cấu hình font sans chính sang Inter (`--font-sans: 'Inter', system-ui, sans-serif;`).
- [x] **0.3 Thiết lập Tiện ích CSS cho Atmospheric Gradient Orbs:**
  - [x] Khai báo animation trôi chậm `@keyframes orbFloat` và class `.orb-glow` trong `src/styles/index.css`.
  - [x] Đảm bảo tương thích hoàn toàn với Tailwind v4 compiler.

---

## 🧱 Giai Đoạn 1: Nâng Cấp Hệ Thống UI Primitives Của PanelForge (`src/shared/components/ui/`)

Nâng cấp trực tiếp các component nguyên tử dùng chung hiện có của hệ thống PanelForge để tương thích thẩm mỹ mới mà không làm gãy giao diện cũ:

- [x] **1.1 Cập nhật Component `Button.tsx` (`src/shared/components/ui/Button.tsx`):**
  - [x] Nâng cấp các variants cốt lõi theo phong cách Ink Pill:
    - `primary`: Nền mực ấm `#292524`, hover `#0c0a09`, text trắng `#ffffff`, bo tròn viên thuốc `rounded-full`, padding `10px 20px`.
    - `secondary` / `outline`: Nền trong suốt hoặc trắng, viền hairline `#e7e5e4`, hover border `#0c0a09`, text `#0c0a09`, bo tròn `rounded-full`.
    - `ghost`: Nền transparent, text `#0c0a09`, hover bg `#f0efed`, bo tròn `rounded-full` hoặc `rounded-xl`.
    - `danger`: Nền `#fef2f2`, border `#fecaca`, text `#b91c1c`, hover bg `#fee2e2`.
  - [x] Thêm tùy chọn `pill?: boolean` (mặc định `true` cho buttons phong cách mới, hoặc `rounded-full`).
  - [x] Sửa triệt để kích thước chữ: `size === 'sm'` chuyển từ `text-[11px]` sang `text-xs` (12px) theo chuẩn `DESIGN_RULES.md`.
  - [x] Tích hợp `isLoading` spinner thanh mảnh.
- [x] **1.2 Cập nhật Component `Badge.tsx` (`src/shared/components/ui/Badge.tsx`):**
  - [x] Đổi kiểu dáng sang viên thuốc tròn `rounded-full px-2.5 py-0.5`.
  - [x] Typography chuẩn `caption-uppercase`: font Inter `text-xs font-semibold tracking-wider uppercase` (xóa bỏ `text-[11px]`).
  - [x] Hỗ trợ các pastel variants: `default` / `neutral` (nền `#f0efed` text `#292524`), `mint` / `success` (nền `#ecfdf5` text `#047857`), `peach` / `warning` (nền `#fff7ed` text `#c2410c`), `lavender` / `ai` (nền `#f5f3ff` text `#6d28d9`), `danger` / `error` (nền `#fef2f2` text `#b91c1c`), `outline` (viền `#e7e5e4`).
- [x] **1.3 Cập nhật Component `Card.tsx` (`src/shared/components/ui/Card.tsx`):**
  - [x] Chuyển viền đen dày `border-[#171717]` sang viền mỏng hairline `border border-[#f0efed]` hoặc `border-[#e7e5e4]`.
  - [x] Bo góc mềm mại `rounded-2xl` (24px) hoặc `rounded-xl` (16px), nền trắng tinh `#ffffff`.
  - [x] Thêm bóng mờ êm ái `shadow-soft-sm` (0 4px 20px -2px rgba(28,27,27,0.04)).
  - [x] Hỗ trợ variant `variant?: 'default' | 'soft' | 'outline' | 'glass'`.
- [x] **1.4 Component `AtmosphericOrbBackground.tsx` (`src/shared/components/ui/AtmosphericOrbBackground.tsx`):**
  - [x] Khối nền trang trí chứa các quả cầu gradient mờ (Mint `#a7e5d3`, Peach `#f4c5a8`, Lavender `#c8b8e0`, Sky `#a8c8e8`) với độ mờ Gaussian blur cao (`blur-[80px]` đến `blur-[120px]`).
  - [x] Chuyển động chậm nhẹ nhàng `orbFloat` tạo chiều sâu tĩnh lặng cho không gian.
- [x] **1.5 Cập nhật Component `Input.tsx` (`src/shared/components/ui/Input.tsx`):**
  - [x] Bo góc `rounded-xl` (12px), nền `#ffffff`, border `#e7e5e4`, text `#0c0a09`, focus ring `#292524/10`.
  - [x] Chiều cao tiêu chuẩn 42px - 44px, placeholder `#a8a29e`, font Inter `text-xs` hoặc `text-sm`.
- [x] **1.6 Barrel export `src/shared/components/ui/index.ts`:**
  - [x] Export đầy đủ `Button`, `Badge`, `Card`, `Input`, `AtmosphericOrbBackground`, `Permission*`.

---

## 🏛️ Giai Đoạn 2: Chuyển Đổi AppShell & Điều Hướng Toàn Cục (Global Shell & Navigation)

- [x] **2.1 Nâng cấp `src/app/AppShell.tsx`:**
  - [x] Header chuẩn hóa độ cao cố định `64px`, nền canvas `#f5f5f5/90` với `backdrop-blur-md` và viền đáy mỏng `border-b border-[#e7e5e4]`.
  - [x] Breadcrumbs: Text Inter màu `#777169`, dấu phân cách `/` tinh tế, icon `Briefcase` tối giản, bo tròn pill button.
  - [x] Search input và Quick action: Chuyển sang dạng pill bo tròn `rounded-full` với viền `#e7e5e4`, shortcut `⌘K` bo tròn `rounded-full`.
  - [x] NotificationBell & Avatar người dùng: Icon tròn `w-8 h-8` viền `#e7e5e4`, avatar `#292524`, phong cách nhẹ nhàng.
- [x] **2.2 Nâng cấp `src/app/AppShellSidebar.tsx` & `AppShellRail.tsx`:**
  - [x] Nền sidebar chuyển sang nền canvas ấm `#fafafa`, viền phải `border-r border-[#e7e5e4]`.
  - [x] Nav items:
    - Khi active: Dạng pill `rounded-full` nền `#292524` text trắng với font Inter đậm vừa (500) và bóng mờ nhẹ `shadow-soft-sm`.
    - Khi inactive: Text `#4e4e4e` hover sang `#0c0a09` trên nền hover `#f0efed`.
  - [x] Series selector & Workspace selector chuyển thành thẻ bo tròn `rounded-xl` thanh lịch với bóng `shadow-soft-sm`.
  - [x] Xóa bỏ hoàn toàn các cỡ chữ vi phạm quy tắc `text-[10px]`, `text-[11px]` sang `text-xs`.

---

## 🌟 Giai Đoạn 3: Nâng Cấp Trang Landing & Catalog Người Đọc (Public Surfaces)

- [x] **3.1 Chuyển đổi `src/roles/guest/views/LandingPageView.tsx`:**
  - [x] **Hero Section:**
    - Thay thế nền cũ bằng nền canvas off-white `#f5f5f5` kết hợp `AtmosphericOrbBackground` (Mint, Lavender, Peach, Sky, Rose).
    - Tiêu đề Hero: Dùng display serif thanh mảnh (`font-serif font-light text-6xl md:text-7xl lg:text-8xl tracking-tight text-[#0c0a09]`).
    - Nút CTA chính: Dùng Primary Ink Pill (`rounded-full bg-[#292524] text-white hover:bg-[#0c0a09] shadow-soft-sm`).
    - Nút CTA phụ: Dạng Outline Pill (`rounded-full border border-[#e7e5e4] bg-white text-[#0c0a09] shadow-soft-sm`).
  - [x] **Feature Grid & Workflow Sections:**
    - Chuyển toàn bộ thẻ tính năng sang `rounded-2xl bg-white border border-[#f0efed] shadow-soft-sm p-8`.
    - Xóa bỏ toàn bộ kích thước chữ vi phạm quy tắc sang `text-xs`.
- [x] **3.2 Nâng cấp `src/roles/guest/modals/LoginModal.tsx` & `RegisterModal.tsx`:**
  - [x] Modal bo góc `rounded-2xl`, viền mỏng `#f0efed`, nền `#ffffff`.
  - [x] Nút submit thành ink pill button `w-full rounded-full bg-[#292524] hover:bg-[#0c0a09] text-white shadow-soft-sm`.
  - [x] Inputs chuyển sang `rounded-xl border border-[#e7e5e4]` với font Inter `text-xs`.
  - [x] Loại bỏ triệt để các class `text-[9px]` và `text-[11px]` sang `text-xs`.
- [x] **3.3 Chuyển đổi `src/roles/reader/views/PublicCatalogView.tsx`:**
  - [x] Nền trang canvas `#f5f5f5`, header cố định viền hairline `#e7e5e4`.
  - [x] Tiêu đề danh mục theo phong cách bìa tạp chí nghệ thuật thanh mảnh.
  - [x] Bộ lọc thể loại (genres/tags) thành các pill chips `rounded-full bg-white border border-[#e7e5e4] shadow-soft-sm`.
  - [x] Card truyện: Bo góc `rounded-2xl border border-[#f0efed] hover:border-[#292524] shadow-soft-sm`, thông tin `text-xs font-mono`.
- [x] **3.4 Chuyển đổi `src/roles/reader/views/PublicPreviewView.tsx`:**
  - [x] Giao diện đọc truyện tinh gọn (distraction-free), nút gửi phản hồi thành ink pill button `rounded-full bg-[#292524] text-white`.
  - [x] Quét sạch các vi phạm `text-[9px]`, `text-[10px]`, `text-[11px]` sang `text-xs`.

---

## 🗂️ Giai Đoạn 4: Không Gian Quản Lý Dự Án & Kho Lưu Trữ (Workspaces & Lore Hub)

- [x] **4.1 Chuyển đổi `src/shared/views/WorkspaceListView.tsx`:**
  - [x] Lưới danh sách Workspace: Thẻ trắng `Card` `rounded-2xl` với viền `#f0efed`, hover viền `#292524`.
  - [x] Nút "Tạo Studio Mới" thành ink pill button (`rounded-full bg-[#292524] text-white`).
  - [x] Badges vai trò chuyển thành dạng pill pastel thanh nhã, xóa bỏ hoàn toàn micro-font.
  - [x] Thẻ tạo studio mới dạng viền nét đứt thanh mảnh bo góc `rounded-2xl`.
- [x] **4.2 Nâng cấp `src/shared/views/StudioOverviewView.tsx` (và `WorkspaceView.tsx` Kanban Studio):**
  - [x] Nền tổng thể `#f5f5f5`, header với display serif font-light text-xl.
  - [x] Tab switchers dạng floating pill (`rounded-full bg-[#f0efed] p-1 border border-[#e7e5e4]`), active dạng ink pill `#292524` text trắng.
  - [x] Nút hành động "Tạo Series Mới", "Mời Thành Viên", "Công việc & Xét duyệt" thành ink pill buttons bo tròn `rounded-full`.
  - [x] Thẻ Series dạng `rounded-2xl` viền hairline `#f0efed` bóng mờ `shadow-soft-sm`.
  - [x] Bảng Kanban trong `WorkspaceView.tsx`: Cột bo góc mềm, bộ lọc dạng pill (`Tất cả`, `Của tôi`, `Quá hạn`).
- [x] **4.3 Nâng cấp `src/shared/features/series-bible/SeriesBibleView.tsx`:**
  - [x] Bố cục dạng tạp chí hồ sơ nhân vật & tri thức sản xuất (Lore Magazine).
  - [x] Thanh tab danh mục (*Characters*, *Locations*, *Terminology*, *Style Rules*) dạng floating pill switchers.
  - [x] Nút "Thêm mục" thành ink pill button `rounded-full bg-[#292524]`, thanh tìm kiếm và bộ lọc thành `rounded-full`.
  - [x] Quét sạch 100% các vi phạm `text-[10px]` và `text-[11px]` sang `text-xs`.
- [x] **4.4 Nâng cấp `src/shared/features/collaboration/MyWorkView.tsx`:**
  - [x] Tiêu đề trang dùng font display serif thanh mảnh trên nền `#0c0a09`.
  - [x] Hàng tab bộ lọc (*Việc của tôi*, *Chờ duyệt*, *Toàn Studio*) dạng pill buttons bo tròn mềm mại `rounded-full`.
  - [x] Bộ chọn chương và nút tải lại dạng viên thuốc `rounded-full border border-[#e7e5e4] bg-white`.
- [x] **4.5 Tinh chỉnh `src/shared/views/UserProfileView.tsx`:**
  - [x] Nền trang canvas `#f5f5f5`, thẻ thông tin người dùng `rounded-2xl border border-[#f0efed] shadow-soft-sm bg-white`.
  - [x] Khối cài đặt bảo mật 2FA và đổi mật khẩu trong card bo mềm với các nút outline pill và ink pill.
  - [x] Xóa bỏ triệt để các class `text-[9px]` và `text-[11px]` sang `text-xs`.

---

## 🎨 Giai Đoạn 5: Đồng Bộ Các Bàn Làm Việc Chuyên Biệt (Role Workbenches & Desks)

> **Nguyên tắc cốt lõi:** Đồng bộ thẩm mỹ tĩnh lặng nhưng **bảo tồn 100% công năng và độ tương phản cao** phục vụ thao tác biên tập và vẽ truyện.

- [x] **5.1 Bàn Biên Kịch (`src/roles/writer/views/ScriptEditorView.tsx`):**
  - [x] Khối Định hướng Cốt truyện & Đề cương chuyển sang thẻ bo góc `rounded-2xl border border-[#f0efed] shadow-soft-sm`.
  - [x] Tab chuyển đổi góc nhìn (*Song song 2 cột*, *Story Arc*, *Đề Cương*) thành floating pill switcher `rounded-full bg-[#f0efed]`.
  - [x] Nút mở rộng/thu gọn và các nút thao tác thành ink pill button bo tròn `rounded-full`.
  - [x] Xóa bỏ toàn bộ micro-fonts vi phạm, bảo toàn khả năng soạn thảo kịch bản với độ tương phản cao.
- [x] **5.2 Bàn Họa Sĩ (`src/roles/artist/views/ArtistDeskView.tsx`):**
  - [x] Nền viewport bàn vẽ giữ màu xám trung tính sạch sẽ và tập trung cao.
  - [x] Quét sạch 100% micro-fonts vi phạm (`text-[9px]`, `text-[10px]`, `text-[11px]`) sang `text-xs`.
  - [x] Inspector và các khung thông số kỹ thuật panel chuyển sang thẻ bo góc mềm viền hairline `#e7e5e4`.
- [x] **5.3 Bàn Chèn Chữ (`src/roles/letterer/views/LettererDeskView.tsx` & `LetteringWorkspace.tsx`):**
  - [x] Thanh điều hướng bàn làm việc dùng header canvas ấm `#fafafa` viền hairline `#e7e5e4`.
  - [x] Bộ chọn chương và trang chuyển sang dạng viên thuốc `rounded-full border border-[#e7e5e4] bg-white shadow-soft-sm`.
  - [x] Giữ nguyên các cảnh báo an toàn kỹ thuật thoại và bố cục manga nhưng hiển thị với typography Inter rõ nét.
- [x] **5.4 Bàn Biên Tập Duyệt Tranh (`src/roles/editor/views/ReviewView.tsx`):**
  - [x] Bộ chuyển đổi chế độ so sánh (*Cạnh nhau*, *Thanh trượt*, *Chồng ảnh*) dạng pill segment switcher `#292524` bo tròn `rounded-full`.
  - [x] Nút Duyệt công đoạn thành ink pill button trang trọng `rounded-full bg-[#292524] hover:bg-[#0c0a09] text-white shadow-soft-sm`.
  - [x] Quét sạch toàn bộ các class `text-[10px]` và `text-[11px]` sang `text-xs`.
- [x] **5.5 Bàn Xuất Bản & Xuất File (`src/roles/publisher/views/PublisherDeskView.tsx` & `ExportView.tsx`):**
  - [x] Quét sạch các vi phạm micro-fonts sang `text-xs font-mono font-medium`.
  - [x] Nhãn trạng thái xuất bản và các gói file chuyển thành dạng pill pastel thanh lịch.

---

## 🧪 Giai Đoạn 6: Kiểm Thử, Kiểm Tra Truy Cập (a11y) & Tối Ưu Hóa

- [x] **6.1 Kiểm tra Tuân thủ Font & Kích Thước Chữ:**
  - [x] Quét toàn bộ source code: loại bỏ 100% class `text-[9px]`, `text-[10px]`, `text-[11px]` sang `text-xs`.
  - [x] Đảm bảo font `Inter` hiển thị đồng bộ qua `@fontsource/inter`.
- [x] **6.2 Kiểm tra Tương Phản Màu Sắc (WCAG AA Accessibility):**
  - [x] Chữ `#0c0a09` trên nền `#f5f5f5` đạt tỷ lệ tương phản ≥ 15:1 (vượt chuẩn AAA).
  - [x] Chữ `#4e4e4e` trên nền `#f5f5f5` đạt tỷ lệ tương phản ≥ 6:1 (vượt chuẩn AA).
  - [x] Chữ `#ffffff` trên nút ink `#292524` đạt tỷ lệ tương phản ≥ 14:1.
- [x] **6.3 Kiểm tra Toàn Diện Bằng Lệnh Quality Suite:**
  - [x] Chạy `npm run typecheck` — 0 lỗi TypeScript (Exit code 0).
  - [x] Chạy `npm run lint` — 0 cảnh báo ESLint (Exit code 0).
  - [x] Chạy `npm run test:run` — 100% Vitest test suite vượt qua (57 test files, 518 tests passed).
- [x] **6.4 Kiểm Thử Hiển Thị & Tối Ưu Hóa Giao Diện:**
  - [x] Kiểm tra Landing Page: hiệu ứng gradient orbs mềm mại, display serif thanh mảnh và ink pill CTA button.
  - [x] Kiểm tra AppShell, Workspace Kanban và các bàn làm việc chuyên biệt (Writer, Artist, Letterer, Editor, Publisher) hoạt động ổn định, bảo toàn 100% công năng và logic nghiệp vụ.
