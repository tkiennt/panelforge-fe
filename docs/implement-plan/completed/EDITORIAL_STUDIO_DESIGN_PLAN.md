# 🎨 Kế Hoạch Triển Khai Design System ElevenLabs Vào Hệ Thống PanelForge

> **Tham chiếu chuẩn:** [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) — `design-md/elevenlabs/DESIGN.md`  
> **Dự án áp dụng:** PanelForge Frontend (`panelforge-fe`)  
> **Phiên bản:** 1.0 (Production Blueprint)  
> **Bảng nhiệm vụ chi tiết:** [EDITORIAL_STUDIO_TASK_LIST.md](./EDITORIAL_STUDIO_TASK_LIST.md)

---

## 1. Triết Lý Thiết Kế (Design Philosophy)

Theo đặc tả từ `awesome-design-md/elevenlabs/DESIGN.md`:
* **Aesthetic Profile:** Mang phong cách một **tạp chí in ấn cao cấp, yên tĩnh (quiet editorial print magazine)** kết hợp nền tảng AI hiện đại — khác biệt hoàn toàn với các giao diện dark-mode bão hòa màu neon hoặc các công cụ kỹ thuật thô cứng.
* **Canvas & Ink:** Nền tảng là mặt giấy canvas off-white (`#f5f5f5`), giữ chữ bằng màu mực đen ấm gần như tuyệt đối (`#292524` / `#0c0a09`).
* **Atmospheric Brand Voltage (Điện áp khí quyển):** Màu sắc thương hiệu được truyền tải qua **nhiếp ảnh và các khối gradient mờ ảo (soft pastel atmospheric gradient orbs)** trôi nhẹ trên trang (Mint `#a7e5d3` → Peach `#f4c5a8` → Lavender `#c8b8e0` → Sky `#a8c8e8` → Rose `#e8b8c4`), thay vì dùng các nút bấm CTA màu neon chói lọi.
* **Typography:** Tiêu đề lớn dùng font display serif thanh mảnh ở độ đậm cực nhẹ (**weight 300** với letter-spacing âm siết chặt), kết hợp font **Inter** chuẩn mực cho thân văn bản, điều hướng và chú thích.
* **Buttons & CTAs:** Nút bấm chính là dạng viên thuốc đen mực (**near-black ink pill button** `rounded-full`), nút phụ là viền mảnh trong suốt (**transparent outline pill**).

---

## 2. Bảng Token Thiết Kế Chi Tiết (Design Tokens Specification)

### 2.1. Bảng Màu (Color Tokens)

| Token Name | Giá trị Hex | Mục đích sử dụng trong PanelForge |
| :--- | :--- | :--- |
| `color-canvas` | `#f5f5f5` | Nền canvas trang chính, body background |
| `color-canvas-soft` | `#fafafa` | Nền thứ cấp, nền khối nội dung nhẹ |
| `color-canvas-deep` | `#0c0a09` | Nền các khối dark section (Landing, Canvas stage view) |
| `color-ink` | `#0c0a09` | Chữ chính (headings, tiêu đề bài viết, text nhấn mạnh) |
| `color-body` | `#4e4e4e` | Chữ nội dung thông thường, mô tả |
| `color-body-strong` | `#292524` | Chữ nội dung nhấn mạnh |
| `color-muted` | `#777169` | Chữ phụ, metadata, nhãn phụ |
| `color-muted-soft` | `#a8a29e` | Placeholder, icon thứ cấp |
| `color-hairline` | `#e7e5e4` | Viền chia khối mặc định, divider mảnh tinh tế |
| `color-hairline-soft` | `#f0efed` | Viền khối thẻ nhẹ, table border |
| `color-hairline-strong` | `#d6d3d1` | Viền input khi hover, viền thẻ nổi bật |
| `color-surface-card` | `#ffffff` | Nền thẻ (card), popup, dropdown modal |
| `color-surface-strong` | `#f0efed` | Nền badge pill, chip tags |
| `color-surface-dark` | `#0c0a09` | Nền thẻ tối đặc biệt |
| `color-primary` | `#292524` | Nút bấm chính (pill button ink) |
| `color-primary-active` | `#0c0a09` | Nút bấm chính khi hover/active |
| `color-on-primary` | `#ffffff` | Chữ trên nút bấm chính |
| `color-orb-mint` | `#a7e5d3` | Khối gradient mờ - Mint |
| `color-orb-peach` | `#f4c5a8` | Khối gradient mờ - Peach |
| `color-orb-lavender` | `#c8b8e0` | Khối gradient mờ - Lavender |
| `color-orb-sky` | `#a8c8e8` | Khối gradient mờ - Sky |
| `color-orb-rose` | `#e8b8c4` | Khối gradient mờ - Rose |
| `color-semantic-error` | `#dc2626` | Trạng thái lỗi / Reject / Alert |
| `color-semantic-success` | `#16a34a` | Trạng thái đạt / Approve / Done |

### 2.2. Kiểu Chữ (Typography Tokens)

* **Display Font (Serif Editorial):** `Waldenburg` (fallback: `'Playfair Display', 'Times New Roman', serif`)
  * `display-mega`: `64px / line-height 1.05 / weight 300 / tracking -1.92px`
  * `display-xl`: `48px / line-height 1.08 / weight 300 / tracking -0.96px`
  * `display-lg`: `36px / line-height 1.17 / weight 300 / tracking -0.36px`
  * `display-md`: `32px / line-height 1.13 / weight 300 / tracking -0.32px`
  * `display-sm`: `24px / line-height 1.2 / weight 300 / tracking 0px`
* **Body & UI Font (Sans-Serif):** `Inter` (fallback: `system-ui, sans-serif`)
  * `title-md`: `20px / line-height 1.35 / weight 500 / tracking 0px`
  * `title-sm`: `18px / line-height 1.44 / weight 500 / tracking 0.18px`
  * `body-md`: `16px / line-height 1.5 / weight 400 / tracking 0.16px`
  * `body-sm`: `15px / line-height 1.47 / weight 400 / tracking 0.15px`
  * `caption`: `14px / line-height 1.5 / weight 400 / tracking 0px`
  * `caption-uppercase`: `12px / line-height 1.4 / weight 600 / tracking 0.96px / UPPERCASE`
  * `button`: `15px / line-height 1.0 / weight 500 / tracking 0px`
  * `nav-link`: `15px / line-height 1.4 / weight 500 / tracking 0px`

### 2.3. Bo Góc (Border Radii) & Spacing

* `rounded-pill`: `9999px` (nút bấm, badge chip, search bar)
* `rounded-2xl`: `24px` (thẻ nội dung lớn, gradient orb cards)
* `rounded-xl`: `16px` (modal, card tiêu chuẩn, feature box)
* `rounded-lg`: `12px` (input box, dropdown menu)
* `rounded-md`: `8px` (button nhỏ, thumbnail frame)

---

## 3. Các Phần Cần Cài Đặt (Dependencies & Installation)

Đã cài đặt các gói cần thiết vào `panelforge-fe`:
1. **`@fontsource/inter`**: Font chữ chuẩn cho toàn bộ body, navigation, labels và buttons theo đặc tả ElevenLabs.
2. **`lucide-react`**: Bộ icon vector thanh mảnh phù hợp phong cách editorial.
3. **`motion` (Framer Motion v12)**: Xử lý hiệu ứng gradient orbs trôi chậm và chuyển cảnh mượt mà.

---

## 4. Kế Hoạch Triển Khai Từng Bước (Implementation Roadmap)

### 📌 Giai Đoạn 1: Tích Hợp Token & Theme Vào `src/styles/index.css`
* **Nhiệm vụ:**
  - Nhập `@fontsource/inter` vào `src/main.tsx` hoặc `src/styles/index.css`.
  - Cập nhật khối `@theme` trong Tailwind v4 với toàn bộ biến màu chuẩn Editorial Studio:
    ```css
    @theme {
      --font-display: 'Playfair Display', serif;
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;

      --color-canvas-editorial: #f5f5f5;
      --color-canvas-soft: #fafafa;
      --color-canvas-deep: #0c0a09;
      --color-ink: #0c0a09;
      --color-ink-primary: #292524;
      --color-ink-primary-active: #0c0a09;
      --color-body-editorial: #4e4e4e;
      --color-body-strong: #292524;
      --color-muted-editorial: #777169;
      --color-muted-soft: #a8a29e;
      --color-hairline: #e7e5e4;
      --color-hairline-soft: #f0efed;
      --color-hairline-strong: #d6d3d1;
      --color-surface-card: #ffffff;
      --color-surface-strong: #f0efed;
      
      --color-orb-mint: #a7e5d3;
      --color-orb-peach: #f4c5a8;
      --color-orb-lavender: #c8b8e0;
      --color-orb-sky: #a8c8e8;
      --color-orb-rose: #e8b8c4;
    }
    ```
  - Thiết lập tiện ích CSS `.orb-glow` tạo hiệu ứng nền mờ gradient pastel đặc trưng.

### 📌 Giai Đoạn 2: Xây Dựng Bộ UI Primitives Của PanelForge (`src/shared/components/ui/`)
* **Nhiệm vụ:**
  - `StudioButton`:
    - `variant="primary"`: Nền `#292524`, chữ trắng, bo tròn `rounded-full`, hover sang `#0c0a09`.
    - `variant="outline"`: Nền trong suốt, viền `#e7e5e4`, chữ `#0c0a09`, hover viền `#0c0a09`.
    - `variant="tertiary"`: Text thuần hover nhẹ.
  - `StudioBadge`: Viên thuốc `rounded-full` nền `#f0efed`, chữ `12px` font Inter uppercase tracking rộng.
  - `StudioCard`: Thẻ trắng `#ffffff` với bo góc mềm mại `rounded-2xl`, viền siêu mỏng `border border-[#f0efed]`, bóng mờ tinh tế không đổ bóng cứng.
  - `AtmosphericOrbBackground`: Khối bọc nội dung có gradient orb mờ (blur `80px` - `120px`) di chuyển nhẹ nhàng.
  - `StudioInput` & `StudioSelect`: Bo góc `rounded-xl` (12px), nền `#ffffff`, border `#e7e5e4`.

### 📌 Giai Đoạn 3: Cải Tiến AppShell & Header Điều Hướng
* **Nhiệm vụ:**
  - `AppShell.tsx`: Chuẩn hóa thanh Header thành thanh điều hướng cao cố định `64px`, nền canvas `#f5f5f5/90` với backdrop blur nhẹ.
  - Nút chuyển Workspace / Chọn Series chuyển thành pill dropdown gọn gàng.
  - Avatar người dùng và các nút hành động chuyển thành icon tròn `w-8 h-8` viền `#e7e5e4`.
  - Sidebar: Sử dụng nền `#fafafa`, các mục menu là pill mờ khi active thay vì khối màu cam gắt.

### 📌 Giai Đoạn 4: Áp Dụng Lên Landing Page & Catalog Người Đọc
* **Nhiệm vụ:**
  - `LandingPageView.tsx`:
    - Tiêu đề Hero: Dùng font display serif thanh mảnh (weight 300, tracking -1.5px), kết hợp khối gradient orb pastel (Mint → Lavender → Peach) làm nền.
    - CTAs chính: "Khám Phá Dự Án" thành Ink Pill Button, "Đăng Nhập" thành Outline Pill Button.
    - Card tính năng: Bo góc `rounded-2xl` nền trắng muốt, padding `32px`.
  - `PublicCatalogView.tsx` & `PublicPreviewView.tsx`:
    - Nền chuyển về canvas `#f5f5f5`, danh sách truyện theo lưới tạp chí nghệ thuật.

### 📌 Giai Đoạn 5: Điều Chỉnh Không Gian Làm Việc (Studio Workbenches)
* **Nhiệm vụ:**
  - Giữ vững tính công năng (High Ergonomics) của các bàn vẽ: `ArtistDeskView`, `ScriptEditorView`, `LettererDeskView`, `ReviewView`.
  - Thay thế các nút thao tác sặc sỡ bằng tông Ink Pill / Outline Pill thanh lịch.
  - Các badge trạng thái (InReview, ReworkRequired, Approved) chuyển sang dạng pill mềm với viền mảnh chuẩn ElevenLabs.

---

## 5. Quy Chuẩn Kiểm Thử & Nghiệm Thu (Quality Assurance)

1. **Lint & Typecheck:** Chạy `npm run typecheck` và `npm run lint` bảo đảm 0 cảnh báo và 0 lỗi.
2. **Typography Check:** Không xuất hiện micro font (`text-[9px]`, `text-[10px]`, `text-[11px]`), font chữ thân bài hiển thị chuẩn Inter.
3. **Contrast Ratio (WCAG AA):** Chữ `#0c0a09` và `#4e4e4e` trên nền `#f5f5f5` đạt tỷ lệ tương phản tối thiểu 4.5:1.
4. **Vitest Suite:** Toàn bộ test suite hiện có của hệ thống vượt qua 100%.
