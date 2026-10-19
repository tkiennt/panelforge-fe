# Kế Hoạch Triển Khai: Chuẩn Hóa Văn Phong UI/UX & Tái Cấu Trúc Đa Ngôn Ngữ (UI/UX Copy Standardization & i18n Refactor)

> **Trạng thái:** 🟢 **Đã hoàn thành (Completed)**  
> **Ngày hoàn thành:** 19/10/2026  
> **Mục tiêu:** Quét toàn bộ codebase Frontend, bóc tách chuỗi viết cứng, chuẩn hóa câu chữ Tiếng Việt ngắn gọn, súc tích, chuyên nghiệp cho môi trường Studio sáng tác truyện tranh; thiết lập hệ thống từ điển song ngữ (i18n) phân tầng (Việt - Anh) tương thích hoàn hảo với React 19 và TypeScript.

---

## 1. Phân Tích Hiện Trạng & Thách Thức Kỹ Thuật

1. **Chuỗi giao diện phân tán & viết cứng (Hardcoded Strings):** Các thông báo toast, nhãn nút, tiêu đề modal, placeholder đã được bóc tách và chuẩn hóa, không còn câu chữ rải rác.
2. **Văn phong rườm rà, thiếu tính chuyên nghiệp:** Triệt tiêu hoàn toàn các từ đệm không cần thiết (*"vui lòng"*, *"xin hãy"*, *"tiến hành"*, *"thực hiện"*, *"đã được... thành công"*), giảm độ dài câu, bảo đảm tính thẩm mỹ và không gây vỡ bố cục trên các nút CTA nhỏ và modal.
3. **Hệ thống đa ngôn ngữ (i18n):** Đã thiết lập kiến trúc từ điển phân tầng type-safe với React Context và custom hook `useTranslation()`, hỗ trợ chuyển đổi tức thì giữa Tiếng Việt (mặc định) và Tiếng Anh (fallback), tương thích hoàn hảo với React 19.
4. **Bảo toàn Test Contracts:** Toàn bộ test suites kiểm tra text và `data-testid` đều được duy trì 100% pass, không làm gãy hợp đồng kiểm thử.

---

## 2. Nguyên Tắc Chuẩn Hóa Văn Phong (UX Writing Rules) & Bảng Thuật Ngữ

### A. Triệt tiêu rườm rà (Conciseness & Candor)
- **Cắt bỏ hoàn toàn từ đệm thừa:** "Vui lòng", "xin hãy", "tiến hành", "thực hiện", "bạn có thể", "đã... thành công".
  - *Trước:* "Vui lòng bấm vào nút dưới đây để thực hiện lưu kịch bản"
  - *Sau:* "Lưu kịch bản"
- **Động từ hành động trực tiếp (Action-First):** Đặt động từ lên đầu (*Tạo chương, Giao việc, Khoá nhân vật, Duyệt bài, Trả về, Thay thế bản khoá*).
- **Thông báo lỗi 3 phần:** [Chuyện gì đã xảy ra?] + [Nguyên nhân ngắn gọn] + [Hành động khắc phục].

### B. Giới hạn độ dài hiển thị (Character Constraints)
- **Nút bấm (CTA):** Tối đa 2 – 3 từ, $\le 18$ ký tự.
- **Tiêu đề Bảng/Modal/Header:** Tối đa 4 – 6 từ, $\le 40$ ký tự.
- **Nhãn Form (Labels):** Tối đa 1 – 3 từ, $\le 25$ ký tự.
- **Thông báo Toast/Banner:** $\le 100$ ký tự (tránh tràn mép thông báo).

### C. Từ điển thuật ngữ chuẩn (PanelForge Glossary & Taxonomy)
- Workspace / Studio: **Studio**
- Series Bible: **Series Bible** (hoặc **Hồ sơ tác phẩm**)
- Canon Locked: **Đã khoá chuẩn (Canon Locked)**
- Supersede Locked Revision: **Thay thế bản khoá** (tuyệt đối không dùng "Mở khoá")
- Pipeline Stage: **Công đoạn**
- Assignment: **Nhiệm vụ** (hoặc **Phân công**)
- StageProgress: **Tiến độ công đoạn**
- Submission: **Bản nộp** (*Đang chờ duyệt, Đã duyệt, Đã trả về*)
- Change Request: **Yêu cầu sửa đổi** (*Mới tạo, Đã sửa, Đã xác minh*)
- Review / Approve / Reject: **Kiểm duyệt** / **Phê duyệt** / **Trả về**
- Frame Template: **Mẫu khung tranh**
- Key Artwork Region: **Vùng nét vẽ trọng tâm**
- Dialogue Balloon / Thought Balloon / Narration Box: **Bóng thoại** / **Bóng suy nghĩ** / **Hộp dẫn chuyện**
- Text Overflow: **Tràn chữ**
- Reading Order: **Thứ tự đọc** (Phải qua trái / Trái qua phải)
- Consistency Finding: **Lỗi bất nhất** (*Ngăn chặn / Cảnh báo / Thông tin*)
- Provenance Report: **Báo cáo nguồn gốc nội dung**

---

## 3. Lộ Trình Triển Khai Chi Tiết (5 Giai Đoạn) - ĐÃ HOÀN TẤT 100%

### 📌 Giai Đoạn 1: Thiết Kế & Khởi Tạo Hệ Thống i18n Core (Engine & Phân Tầng Từ Điển)
- [x] **1.1. Xây dựng Type-Safe i18n Engine:**
  - Tạo `src/lib/i18n.tsx` cung cấp context, hook `useTranslation()`, hàm `t('namespace.key', params?)` và helper `setLanguage('vi' | 'en')`.
  - Lưu trữ ngôn ngữ đã chọn vào `localStorage` (`panelforge_lang`, mặc định là `'vi'`).
  - Hỗ trợ fallback: nếu key tiếng Anh chưa có, tự động lấy giá trị tiếng Việt tương ứng.
- [x] **1.2. Khởi tạo 6 Namespaces Từ Điển Song Ngữ (`src/locales/`):**
  - `src/locales/vi/` & `src/locales/en/`:
    - `common.json`: Nút bấm chung (Lưu, Hủy, Xóa, Xác nhận, Đóng), thông báo hệ thống, ngoại tuyến/đồng bộ, trạng thái nạp.
    - `navigation.json`: Thanh điều hướng, breadcrumbs, menu vai trò, switch studio.
    - `bible.json`: Thực thể nhân vật, bối cảnh, đạo cụ, canon lock, supersede bản khoá.
    - `production.json`: Canvas bàn vẽ, panel slice, full-page composite, layers, bóng thoại, phông chữ.
    - `review.json`: So sánh diff, phê duyệt, trả về, Change Request, kiểm tra nhất quán.
    - `pipeline.json`: Hàng đợi nhiệm vụ, kanban, tiến độ công đoạn, phân công hoạ sĩ.
- [x] **1.3. Language Switcher Component:**
  - Tích hợp `LanguageSwitcher` pill gọn gàng trên thanh Header trong `AppShell.tsx` để người dùng chuyển đổi tức thì giữa Tiếng Việt và English.

---

### 📌 Giai Đoạn 2: Chuẩn Hóa UX Copy & Bóc Tách Chuỗi Cho Shared Features & Modals
- [x] **2.1. Shared Collaboration Components (`src/shared/features/collaboration/`):**
  - `MyWorkView.tsx`: Chuẩn hóa danh sách nhiệm vụ, nhãn tab, nút nộp bài, thời hạn theo bảng thuật ngữ chuẩn.
  - `AssignmentWorkCard.tsx`: Tối ưu câu chữ trạng thái, hành động "Bắt đầu làm việc", "Xem chi tiết".
  - `BibleReferenceDrawer.tsx`: Chuẩn hóa tab nhân vật, loại bỏ các mã FR kỹ thuật máy móc.
  - `ChapterReviewArtworkOverview.tsx`: Chuẩn hóa tiến độ phê duyệt, trạng thái công đoạn.
- [x] **2.2. Shared Modals & Banners (`src/shared/modals/`, `src/shared/components/`):**
  - `ElementConflictModal.tsx`: Thông báo xung đột phiên bản ngắn gọn, loại bỏ mã BR kỹ thuật thừa.
  - `OfflineStatusBanner.tsx`: Trạng thái kết nối mạng súc tích, loại bỏ mã NFR-09, kết nối đa ngôn ngữ `t('common.offline.*')`.

---

### 📌 Giai Đoạn 3: Chuẩn Hóa UX Copy & i18n Cho Không Gian Sáng Tác (Artist, Writer, Letterer)
- [x] **3.1. Bàn Vẽ Họa Sĩ (Artist Desk Workspace):**
  - `ArtistDeskView.tsx`: Áp dụng i18n cho Floating Toolbar, Dropzone overlay, Inspector toạ độ, Assignment Gateway CTA, Toggle chế độ tải.
  - `PanelLayoutToolbar.tsx`: Nút sắp xếp, canh lề, chia khung, readout thông số.
  - `FrameTemplateModal.tsx`: Rút gọn tiêu đề, thông báo trang đã có khung súc tích.
- [x] **3.2. Không Gian Kịch Bản (Writer Workspace):**
  - `ScriptEditorView.tsx`: Giao diện thoại, chỉ dẫn diễn xuất, neo phân cảnh, đối chiếu Series Bible.
- [x] **3.3. Không Gian Thoại & Chữ (Letterer Workspace):**
  - `LetteringWorkspace.tsx`: Bóng thoại, hộp dẫn chuyện, định dạng văn bản, cảnh báo tràn chữ (Text Overflow), thứ tự đọc.

---

### 📌 Giai Đoạn 4: Chuẩn Hóa UX Copy & i18n Cho Quản Trị & Đánh Giá (Producer, Editor, Admin, Reader)
- [x] **4.1. Điều Phối Sản Xuất (Producer Workspace):**
  - Cấu hình pipeline công đoạn, giao việc (`CreateAssignmentModal.tsx`), Kanban board.
- [x] **4.2. Ban Biên Tập & Kiểm Duyệt (Editor Workspace):**
  - Luồng phê duyệt bản nộp, Change Requests, báo cáo tính nhất quán (AI Consistency Findings), Báo cáo nguồn gốc (Provenance Report).
- [x] **4.3. Quản Trị Hệ Thống & Trải Nghiệm Đọc (Admin, Reader):**
  - Quản lý thành viên Studio, cấu hình hệ thống, màn hình đọc truyện.

---

### 📌 Giai Đoạn 5: Kiểm Thử Toàn Diện, Audit Rà Soát & Hoàn Tất Lưu Trữ
- [x] **5.1. Unit & Integration Testing:**
  - `src/lib/i18n.test.tsx`: 6/6 tests passed.
  - `src/shared/components/OfflineStatusBanner.test.tsx`: 3/3 tests passed.
  - `src/shared/modals/ElementConflictModal.test.tsx`: 2/2 tests passed.
  - `src/shared/features/collaboration/BibleReferenceDrawer.test.tsx`: 6/6 tests passed.
  - `src/roles/artist/views/ArtistDeskView.test.tsx`: 20/20 tests passed.
  - `src/roles/artist/modals/FrameTemplateModal.test.tsx`: 3/3 tests passed.
  - `src/roles/letterer/`: 86/86 tests passed.
  - `src/roles/producer/`: 32/32 tests passed.
  - `src/roles/editor/`: 42/42 tests passed.
  - `src/roles/writer/`: 22/22 tests passed.
  - `src/shared/`: 277/277 tests passed.
- [x] **5.2. Typecheck & Build Verification:**
  - `npx tsc --noEmit`: 0 errors.
  - `npm run build`: Build bundle thành công trong 23.23s.
- [x] **5.3. Hoàn tất & Di chuyển tài liệu:**
  - Di chuyển kế hoạch từ `ongoing/` sang `completed/` và cập nhật mục lục tại `docs/README.md`.
