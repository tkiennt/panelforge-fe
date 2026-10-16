# 🎨 KẾ HOẠCH REFACTOR TOÀN DIỆN GIAO DIỆN HỌA SĨ (ARTIST DESK UI COMPREHENSIVE REFACTOR)

> **Trạng thái:** 🟢 COMPLETED  
> **Người thực hiện:** AI Assistant & Frontend Team  
> **Ngày bắt đầu:** 2026-10-16  
> **Ngày hoàn thành:** 2026-10-16  
> **Phạm vi tác động:** Toàn bộ không gian làm việc của Họa Sĩ (`src/roles/artist/*`): Bàn vẽ, Canvas, dải trang (Page Strip), thanh công cụ bố cục khung (Panel Layout Controls), thuộc tính ô tranh, hệ thống layer và tất cả các Modals liên quan.  
> **Mục tiêu:** Nâng cấp trải nghiệm người dùng đạt chuẩn Studio Editorial thượng hạng: Chuẩn hóa chữ (typography), khoảng cách (spacing), độ to (sizing & hierarchy), màu sắc ngữ nghĩa (Artisan Ink), thẻ trang (cards), canh lề (alignment), và tất cả các modal điều khiển.

---

## 1. PHÂN TÍCH HIỆN TRẠNG & CÁC VẤN ĐỀ ĐÃ GIẢI QUYẾT

### 1.1. Chữ & Phông chữ (Typography)
- **Đã hoàn thành:**
  - Nâng toàn bộ cỡ chữ dưới 12px lên tối thiểu `text-xs` (12px), thông số kỹ thuật dùng `font-mono text-xs`.
  - Thống nhất phông chữ rõ ràng, loại bỏ toàn bộ `text-[10px]`, `text-[11px]`, `text-[13px]`.
  - Việt hóa hoàn chỉnh, chuẩn mực thuật ngữ Manga (Khung tranh, Thứ tự đọc, Bản phác thảo, Mực nét, Màu, v.v.).

### 1.2. Khoảng cách (Spacing) & Canh lề (Alignment)
- **Đã hoàn thành:**
  - Chuẩn hóa hệ thống nhịp spacing 4px/8px/12px/16px/20px (`space-y-4`, `p-5`, `gap-5`).
  - Thiết kế Canvas Viewport cân xứng, tập trung vào trọng tâm trang vẽ, thanh công cụ căn chỉnh nằm gọn gàng bên trên canvas.

### 1.3. Độ to (Sizing & Hierarchy) & Dải Thẻ Trang (Page Strip)
- **Đã hoàn thành:**
  - Tái cấu trúc dải trang từ lưới tĩnh to (`grid-cols-6`) thành **Horizontal Filmstrip cuộn ngang mượt mà**, thẻ trang tỷ lệ 2:3 gọn gàng, viền cam Studio khi active (`border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-soft-sm`). Giải phóng hơn 200px chiều cao cho màn hình làm việc của Artist.

### 1.4. Màu sắc & Thẻ (Color & Cards - Artisan Ink Pigments)
- **Đã hoàn thành:**
  - Thẻ trang đang chọn chuyển sang viền cam Studio ấm áp: `border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20`.
  - Các nút hành động chính (Lưu toạ độ, Tạo trang, Áp dụng mẫu) chuyển sang `.btn-cta-primary` cam Studio (`#EA580C`).
  - Thao tác AI và Tham chiếu Bible chuyển sang tím Iris (`bg-violet-600` / `bg-violet-50 text-violet-800 border-violet-200`).
  - Cảnh báo sai lệch nhất quán (Consistency) chuyển sang hổ phách (Amber) và ngọc lục bảo (Emerald) hài hòa.

### 1.5. Canh Chỉnh & Modals (Controls & Modals)
- **Đã hoàn thành:**
  - `FrameTemplateModal`: Giao diện chọn mẫu khung bo góc `rounded-2xl`, ô miniature viền cam studio, nút Áp dụng cam Studio.
  - `NewPageCardModal` & `PageDetailModal`: Đồng bộ màu sắc `#EA580C`, bo góc `rounded-2xl`, nút chuyển công đoạn dạng pill, xóa toàn bộ font cấm.
  - `AILayoutModal`: Thiết kế lại modal gợi ý layout AI và modal xác nhận ghi đè theo Quiet Editorial Studio.
  - `PanelLayoutControls`: Cụm nút Segmented Control tinh xảo, đường gióng và nhãn căn chỉnh sắc nét.

---

## 2. MA TRẬN QUY CHUẨN GIAO DIỆN ARTIST DESK

| Thành phần | Trước khi refactor | Sau khi refactor (Editorial Studio) |
| :--- | :--- | :--- |
| **Dải thẻ trang (Pages Strip)** | Lưới tĩnh to, đẩy canvas xuống sâu | Filmstrip ngang cuộn mượt, thẻ trang tỉ lệ chuẩn, viền cam Studio khi active |
| **Canvas Viewport** | Khung viền đen dày, readout đen thô `bg-zinc-900` | Canvas nổi khối với shadow mềm, readout toạ độ tinh gọn `bg-stone-900/95 text-stone-200` |
| **Toolbar dàn trang** | Cụm nút rời rạc màu xanh | Segmented pill control màu xám mực và cam Studio, icon Lucide sắc sảo |
| **Cột thuộc tính (Right Panel)** | Tabs thô, nút xanh dương `bg-blue-600` | Tabs viên thuốc pill, phân tách rõ ràng Khung Panel vs Lớp Vẽ (Layers), nút cam `.btn-cta-primary` |
| **FrameTemplateModal** | Nút nhọn, màu xanh dương | Rounded-2xl, template preview thanh nhã, nút chọn viền cam Studio |
| **AI Layout & Consistency** | Gradient neon tím/xanh | Mực tím Iris (`#7C3AED`) + Mực ngọc (`#059669`) êm dịu, scannable |

---

## 3. CHECKLIST KẾT QUẢ THỰC THI (CHECKLIST)

### 🔹 Giai đoạn 1: Header Bàn Vẽ & Dải Thẻ Trang (Page Filmstrip)
- [x] **1.1.** Cải tiến Header `ArtistDeskView.tsx`: Bộ chọn chương, nút Làm mới, Tham chiếu Bible và Tạo Trang Mới theo chuẩn viên thuốc (pill) và màu cam Studio.
- [x] **1.2.** Tái thiết kế dải danh sách trang thành **Horizontal Filmstrip**:
  - Cuộn ngang mượt mà (`overflow-x-auto custom-scrollbar`).
  - Card trang tỷ lệ manga chuẩn, số trang nổi bật, format DPI font-mono.
  - Trạng thái trang đang chọn: viền cam Studio `border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-soft-sm`.

### 🔹 Giai đoạn 2: Bàn Dàn Khung Tranh (Canvas & Layout Controls)
- [x] **2.1.** Cải tiến `PanelLayoutControls.tsx`:
  - Chuẩn hóa các nút Căn lề (Align: Trái, Phải, Trên, Dưới, Tâm), Phân phối khoảng cách (Distribute), Nắn thẳng (Straighten) thành cụm segmented controls sang trọng.
  - Nâng cỡ chữ các gợi ý và nhãn phím tắt lên tối thiểu `text-xs`.
- [x] **2.2.** Tinh chỉnh Canvas Viewport trong `ArtistDeskView.tsx`:
  - Readout toạ độ (`panel-readout`): Kiểu dáng Studio sang trọng, đo đạc % và pixel rõ ràng, màu sắc cân lề trực quan (`bg-stone-900/95 text-stone-200 border-stone-800`).
  - Nút "Áp Dụng Mẫu Khung" sang cam Studio, "Thêm Panel" sang viền tro.

### 🔹 Giai đoạn 3: Bảng Thuộc Tính & Lớp Vẽ (Inspector & Layers Panel)
- [x] **3.1.** Đồng bộ Tab chuyển đổi: "Khung Panel" (cam Studio) và "Lớp Vẽ & Layer Ảnh" (tím Iris) thành dạng viên thuốc cao cấp rounded-full.
- [x] **3.2.** Tinh chỉnh Khối Nhập Tọa Độ & Thứ Tự Đọc:
  - Nút "Lưu Tọa Độ & Thứ Tự Đọc": Chuyển sang `.btn-cta-primary` cam Studio (`bg-[#EA580C] hover:bg-[#C2410C]`).
  - Nút "Chia đôi dọc" / "Chia đôi ngang": Viền mềm mại, phản hồi hover mượt.
- [x] **3.3.** Khối Ảnh Artwork của Khung:
  - Nút "Tải ảnh cho khung": Chuyển sang cam Studio `.btn-cta-primary`.
  - Nút "Tham chiếu Bible": Màu tím Iris thanh lịch (`border-violet-200 text-violet-800`).
  - Thẻ kết quả kiểm tra nhất quán AI (Character Consistency): Badge tỷ lệ % rõ ràng, phân định Đạt (Emerald) / Sai lệch (Amber).
- [x] **3.4.** Khối Gán Phân Cảnh & Dòng Kịch Bản (Script Anchoring):
  - Form select và danh sách dòng kịch bản sạch sẽ, chữ dễ đọc, checkmark cam studio.

### 🔹 Giai đoạn 4: Refactor Toàn Bộ Modals của Artist
- [x] **4.1.** `FrameTemplateModal.tsx`:
  - Chuẩn hóa phông chữ, loại bỏ cỡ chữ < 12px, header Quiet Editorial Studio.
  - Nút áp dụng mẫu khung chuyển sang cam Studio `.btn-cta-primary`.
  - Thẻ preview mẫu khung trực quan, hover viền cam Studio.
- [x] **4.2.** `NewPageCardModal.tsx` & `PageDetailModal.tsx`:
  - Đồng bộ màu sắc `#EA580C`, bo góc `rounded-2xl`, nút chuyển công đoạn dạng pill.
  - Chuẩn hóa toàn bộ label sang tiếng Việt chuẩn mực, loại bỏ `text-[10px]`.
- [x] **4.3.** `AILayoutModal.tsx`:
  - Cập nhật phong cách Quiet Editorial cho modal gợi ý AI và modal xác nhận ghi đè.

### 🔹 Giai đoạn 5: Rà Soát & Hoàn Tất Nghiệm Thu
- [x] **5.1.** Rà soát tổng thể giao diện trên màn hình desktop và laptop, bảo đảm không còn lỗi biên dịch TypeScript.
- [x] **5.2.** Đảm bảo tính nhất quán với `docs/DESIGN_RULES.md`.
- [x] **5.3.** Chuyển plan từ `ongoing/` sang `completed/` và cập nhật `docs/README.md`.

