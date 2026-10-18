# 🎨 KẾ HOẠCH BỔ SUNG & ĐỒNG BỘ HỆ THỐNG MÀU SẮC TRẠNG THÁI & NÚT BẤM (COLOR SYSTEM ENHANCEMENT)

> **Trạng thái:** 🟢 COMPLETED  
> **Người thực hiện:** AI Assistant & Frontend Team  
> **Ngày bắt đầu:** 2026-10-16  
> **Ngày hoàn thành:** 2026-10-16  
> **Phạm vi tác động:** Toàn bộ 100% màn hình giao diện (Auth, AppShell, Writer, Pipeline, Collaboration, Series Bible, Artist, Letterer, Producer, Editor, Publisher, Reader, Admin).  
> **Mục tiêu:** Xây dựng một bộ màu sắc trạng thái (Semantic Status Colors) và phân cấp nút bấm (Button Hierarchy) hài hòa, tinh tế theo phong cách Quiet Editorial Studio, giúp làm nổi bật các yếu tố cần chú ý, nút bấm và trạng thái mà không phá vỡ thẩm mỹ tổng thể.

---

## 1. PHÂN TÍCH VẤN ĐỀ & TRIẾT LÝ THIẾT KẾ

### 1.1. Hiện trạng
- Sau khi chuyển đổi sang phong cách Quiet Editorial Studio (`#f5f5f5` canvas, `#292524` ink black, `#e7e5e4` hairline), giao diện trông rất trang nhã nhưng gặp vấn đề về **khả năng quét mắt nhanh (scannability)**:
  - Tất cả các nút bấm đều là viên thuốc màu đen mực (`bg-[#292524] text-white`) hoặc viền xám mỏng (`border border-[#e7e5e4]`), khiến người dùng khó phân biệt được đâu là hành động chính (CTA), đâu là thao tác AI, đâu là thao tác nguy hiểm (Xóa/Trả về).
  - Các trạng thái (InProduction, InReview, Approved, Published, ReworkRequired) chưa có sự đồng bộ: mỗi màn hình lại dùng một mã màu khác nhau hoặc dùng màu mặc định quá mờ nhạt.
  - Các cảnh báo (Blocking finding, Warning finding, Info) cần được làm nổi bật đúng mức độ ưu tiên mà không gây cảm giác "chói gắt" kiểu neon.

### 1.2. Giải pháp: Mực Màu Nghệ Thuật (Artisan Ink Pigments)
- Không dùng màu neon bão hòa quá cao làm phá vỡ nền giấy ấm của tạp chí in ấn.
- Sử dụng bảng màu mực mỹ thuật với tỷ lệ pha trộn tinh tế:
  - **Mực Cam Studio (`#EA580C` / `#C2410C`):** Dành riêng cho hành động chính của Creator (Primary CTA, Nút Tạo mới, Lưu kịch bản, Highlight hoạt động).
  - **Mực Tím Trí Tuệ (`#7C3AED` / `#6D28D9`):** Dành riêng cho các tính năng AI & Lore (Kiểm tra nhất quán, Gợi ý AI, Series Bible).
  - **Mực Ngọc Hoàn Tất (`#059669` / `#047857`):** Dành cho thành công, đã duyệt (Approved), hoàn thành (Completed), xuất bản (Published).
  - **Mực Hổ Phách (`#D97706` / `#B45309`):** Dành cho chờ duyệt (InReview), cảnh báo nhẹ, sắp đến hạn deadline (<= 2 ngày).
  - **Mực Đỏ Chặn / Sửa Lại (`#DC2626` / `#B91C1C`):** Dành cho lỗi chặn (Blocking), trả về sửa (ReworkRequired), xung đột (Conflict), xóa.
  - **Mực Lam Tiến Độ (`#2563EB` / `#1D4ED8`):** Dành cho đang sản xuất (InProduction), bản thảo nháp (Draft), thông tin.

---

## 2. MA TRẬN MÀU SẮC ĐỒNG BỘ (COLOR & STATUS MATRIX)

| Semantic Role | Màu Nền Badge / Container | Màu Viền (Border) | Màu Chữ / Icon (Text) | Nút Bấm Tương Ứng (Action Button) |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Creator Action** | `bg-orange-50` (`#FFF7ED`) | `border-orange-200` (`#FED7AA`) | `text-orange-800` (`#9A3412`) | `bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-soft-sm` |
| **AI / Continuity / Lore** | `bg-violet-50` (`#F5F3FF`) | `border-violet-200` (`#DDD6FE`) | `text-violet-800` (`#5B21B6`) | `bg-violet-600 hover:bg-violet-700 text-white` hoặc `bg-violet-50 text-violet-800 border border-violet-200` |
| **Approved / Success** | `bg-emerald-50` (`#ECFDF5`) | `border-emerald-200` (`#A7F3D0`) | `text-emerald-800` (`#065F46`) | `bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft-sm` |
| **InReview / Warning** | `bg-amber-50` (`#FFFBEB`) | `border-amber-200` (`#FDE68A`) | `text-amber-800` (`#92400E`) | `bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100` |
| **Rework / Danger / Blocking** | `bg-rose-50` (`#FEF2F2`) | `border-rose-200` (`#FECACA`) | `text-rose-800` (`#9F1239`) | `border border-rose-300 text-rose-700 hover:bg-rose-50` (hoặc `bg-rose-600 text-white` khi xác nhận xóa) |
| **InProduction / Info** | `bg-blue-50` (`#EFF6FF`) | `border-blue-200` (`#BFDBFE`) | `text-blue-800` (`#1E40AF`) | `bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100` |
| **Neutral / Secondary** | `bg-[#F5F5F4]` | `border-[#E7E5E4]` | `text-[#44403C]` | `bg-white hover:bg-[#F5F5F4] text-[#292524] border border-[#E7E5E4]` |

---

## 3. LỘ TRÌNH THỰC THI CHI TIẾT (STEP-BY-STEP EXECUTION ROADMAP)

### 🔹 Giai đoạn 0: Cốt Lõi Theme & UI Primitives (Foundation)
- [x] **0.1.** Cập nhật `src/styles/index.css`: Bổ sung tokens trạng thái và utility classes `.btn-cta-*`, `.badge-status-*`.
- [x] **0.2.** Cập nhật `src/shared/components/ui/Button.tsx`: Bổ sung các variants (`ai`, `ai-soft`, `success`, `success-soft`, `warning`, `warning-soft`, `danger-solid`, `accent`).
- [x] **0.3.** Cập nhật `src/shared/components/ui/Badge.tsx`: Bổ sung các variants (`inproduction`, `amber`, `published`, `draft`).
- [x] **0.4.** Cập nhật `src/app/AppShell.tsx` & `AppShellSidebar.tsx`: Chuẩn hóa active menu item (màu cam Studio), role badge (Admin, Producer, Artist, Writer...) và notification dot.

### 🔹 Giai đoạn 1: Soạn Thảo Kịch Bản (Writer Workspace)
- [x] **1.1.** `src/roles/writer/views/ScriptEditorView.tsx`:
  - Chuẩn hóa header chapter status pill (`InProduction` -> xanh lam, `Approved` -> ngọc lục bảo, `Published` -> xanh lá đậm, `InReview` -> hổ phách).
  - Nút "Kiểm tra nhất quán": Đổi sang màu tím AI Iris với badge số lượng lỗi nổi bật (`bg-rose-500 text-white` nếu có lỗi, `bg-zinc-200 text-zinc-700` nếu sạch).
  - Nút "Nhân vật Bible": Đổi sang tone tím nhạt lavender đồng bộ.
  - Nút "Lưu Story Arc" / "Lưu Đề Cương" / "+ Tạo cảnh mới": Áp dụng `.btn-cta-primary` (cam ấm).
  - Cột danh sách phân cảnh: Thẻ cảnh đang chọn đổi thành viền cam với nền cam ấm nhẹ (`bg-orange-50/60 border-orange-500`).
  - Danh mục cảnh báo kịch bản: `Blocking` (đỏ rose), `Warning` (hổ phách amber), `Info` (xanh lam).

### 🔹 Giai đoạn 2: Quy Trình Sản Xuất & Thẻ Bài (Pipeline Board & Collaboration)
- [x] **2.1.** `src/shared/features/pipeline-board/TaskCard.tsx`:
  - Đồng bộ màu sắc hạn chót: Overdue (đỏ crimson), Sắp đến hạn (hổ phách), On-track (xám ngọc).
  - Cải tiến Stage color chips và Priority tags.
- [x] **2.2.** `src/shared/features/pipeline-board/KanbanColumn.tsx`:
  - Đồng bộ header cột Kanban (Script, Thumbnail, Pencil, Ink, Review, Approved) với viền màu tinh tế.
- [x] **2.3.** `src/shared/features/collaboration/ReviewDecisionPanel.tsx`:
  - Nút "Duyệt": Sử dụng màu xanh ngọc `.btn-cta-success` (`bg-emerald-600 text-white`).
  - Nút "Trả về để sửa": Sử dụng viền đỏ vang `.btn-cta-danger` (`border-rose-300 text-rose-700`).
- [x] **2.4.** `src/shared/features/collaboration/MyWorkView.tsx`:
  - Trạng thái công việc và nút nộp bài (Submit for Review) nổi bật.

### 🔹 Giai đoạn 3: Bàn Vẽ Họa Sĩ & Letterer (Artist & Letterer Desks)
- [x] **3.1.** `src/roles/artist/views/ArtistDeskView.tsx`:
  - Thẻ trang (Page cards): Highlight trang đang vẽ với viền cam Studio.
  - Nút Upload bản vẽ / Lưu canvas: Tone cam nổi bật.
  - Trạng thái công đoạn của từng trang: InProgress, InReview, Approved.
- [x] **3.2.** `src/roles/letterer/views/LettererDeskView.tsx` & `LetteringWorkspace.tsx`:
  - Nút thêm bóng thoại (Speech bubble), nút SFX, nút AI rút gọn thoại với tone tím Iris đồng bộ.

### 🔹 Giai đoạn 4: Series Bible RAG (Lore & World-Building)
- [x] **4.1.** `src/shared/features/series-bible/SeriesBibleView.tsx`:
  - Các danh mục Canon (Nhân vật, Địa điểm, Đạo cụ, Quy tắc cốt truyện) với màu sắc thẻ phân loại rõ ràng.
  - Nút "+ Thêm thực thể mới" (Primary CTA cam Studio).
- [x] **4.2.** `AddEntityModal.tsx` & `BibleEntityDetailModal.tsx`:
  - Nút Lưu / Cập nhật thực thể / Xem lịch sử phiên bản.

### 🔹 Giai đoạn 5: Producer, Publisher & Editor Workspaces
- [x] **5.1.** `src/roles/producer/views/ExportView.tsx`:
  - Nút Xuất bản (Primary CTA cam Studio) và nút Tải (Xanh ngọc).
- [x] **5.2.** `src/roles/editor/views/ReviewView.tsx`:
  - Danh sách Change Requests và quyết định phê duyệt (Confirmed, Rejected, Ignored, Clarification).
- [x] **5.3.** `src/roles/publisher/views/PublisherDeskView.tsx`:
  - Nút Xuất bản / Lên lịch (Xanh ngọc), nút Từ chối (Đỏ rose), nút Đọc thử.

### 🔹 Giai đoạn 6: Admin & Cấu Hình Hệ Thống (System Admin)
- [x] **6.1.** `src/roles/admin/views/AdminUserManagementView.tsx`:
  - Badge trạng thái tài khoản (Hoạt động, Bị khóa, Chờ xác thực).
  - Nút Cấp quyền Producer (Accent cam studio).
- [x] **6.2.** `src/roles/admin/views/components/AdminAssignRoleModal.tsx`:
  - Radio options, badge Producer cam studio, nút cập nhật.

### 🔹 Giai đoạn 7: Public Portal & Account (Guest, Reader, Profile)
- [x] **7.1.** `src/roles/guest/views/LandingPageView.tsx`:
  - Nút Onboard Studio CTA cam studio nổi bật.
- [x] **7.2.** `src/roles/reader/views/PublicCatalogView.tsx`:
  - Nút Đọc thử, badge thể loại, nút Trở về Workspace.
- [x] **7.3.** `src/shared/views/UserProfileView.tsx`:
  - Nút Đổi mật khẩu, cài đặt 2FA TOTP.

### 🔹 Giai đoạn 8: Nghiệm Thu & Cập Nhật Tài Liệu
- [x] **8.1.** Cập nhật `docs/DESIGN_RULES.md` phản ánh toàn bộ hệ thống màu và phân cấp nút mới.
- [x] **8.2.** Di chuyển file plan từ `docs/implement-plan/ongoing/` sang `docs/implement-plan/completed/`.
