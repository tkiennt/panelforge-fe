# 📚 PanelForge Technical Documentation Hub (`docs/`)

> Trung tâm lưu trữ và điều hướng toàn bộ tài liệu kỹ thuật, quy chuẩn thiết kế, kiến trúc hệ thống và kế hoạch triển khai của **PanelForge Manga Studio Frontend**.

---

## 🧭 CÁC TÀI LIỆU CHÍNH (CORE DOCUMENTS)

| Tài liệu | Mô tả | Trạng thái |
| :--- | :--- | :--- |
| [**DOCUMENTATION_PROCESS.md**](./DOCUMENTATION_PROCESS.md) | **Quy trình quản lý tài liệu & Quy tắc Source-Code-Doc-Sync** (Vòng đời kế hoạch `ongoing` → `completed`, ma trận cập nhật code-to-docs). | 🟢 Active |
| [**DESIGN_RULES.md**](./DESIGN_RULES.md) | **Quy chuẩn thiết kế giao diện Editorial AI Studio**: Bảng token màu, font Inter, pill buttons, atmospheric orbs, spacing và layout. | 🟢 Active |
| [**PRODUCT.md**](../PRODUCT.md) | **Đặc tả nghiệp vụ sản phẩm**: 5 core flows, phân quyền 9 vai trò, Series Bible RAG, AI Assistant. | 🟢 Active |
| [**CLAUDE.md**](../CLAUDE.md) | **Chỉ dẫn phát triển**: Coding conventions, scripts kiểm thử và ràng buộc đồng bộ tài liệu. | 🟢 Active |

---

## 📋 KẾ HOẠCH TRIỂN KHAI (IMPLEMENTATION PLANS)

Thư mục: [`docs/implement-plan/`](./implement-plan/)

### 🟡 Đang Thực Hiện (`ongoing/`)
> *Chứa các kế hoạch tính năng hoặc đợt refactor đang trong quá trình phát triển.*

*(Hiện tại không có kế hoạch nào đang thực hiện)*

### 🟢 Đã Hoàn Thành (`completed/`)
> *Chứa các kế hoạch đã hoàn thành 100% nhiệm vụ, pass typecheck, lint và unit test.*

- [**VISUAL_PANEL_UPLOADER_REFACTOR_PLAN.md**](./implement-plan/completed/VISUAL_PANEL_UPLOADER_REFACTOR_PLAN.md): Kế hoạch triển khai "Bàn Tải & Khớp Nét Panel Trực Quan" (Visual Panel Uploader) trên Bàn Vẽ Artist Desk (CF2) – kéo thả trực tiếp vào ô canvas, giải quyết cảnh báo chặn bắt đầu nhiệm vụ, tái cấu trúc bố cục 3 cột hiện đại và hỗ trợ 2 chế độ tải.
- [**MY_WORK_UI_COMPREHENSIVE_REFACTOR_PLAN.md**](./implement-plan/completed/MY_WORK_UI_COMPREHENSIVE_REFACTOR_PLAN.md): Kế hoạch tối ưu hóa & refactor toàn diện màn hình "Công việc của tôi" (My Work View) – cân đối kích cỡ chữ, thu gọn tab, compact row cho danh sách Panel Artwork, chuẩn hóa màu sắc trạng thái, tích hợp Series Bible Drawer và hiển thị phiên bản `(v...)`.
- [**SCRIPT_UI_COMPREHENSIVE_REFACTOR_PLAN.md**](./implement-plan/completed/SCRIPT_UI_COMPREHENSIVE_REFACTOR_PLAN.md): Kế hoạch refactor toàn diện UI trang Script (Kịch bản) trên tất cả các roles – chữ, khoảng cách, độ to, màu sắc, thẻ, canh lề, modal.
- [**ARTIST_UI_COMPREHENSIVE_REFACTOR_PLAN.md**](./implement-plan/completed/ARTIST_UI_COMPREHENSIVE_REFACTOR_PLAN.md): Kế hoạch refactor toàn diện không gian làm việc của Họa Sĩ (Artist Desk UI) – chữ, khoảng cách, độ to, màu sắc, thẻ, canh lề, modal.
- [**COLOR_SYSTEM_AND_STATUS_ENHANCEMENT_PLAN.md**](./implement-plan/completed/COLOR_SYSTEM_AND_STATUS_ENHANCEMENT_PLAN.md): Kế hoạch bổ sung & đồng bộ hệ thống màu sắc trạng thái, nút bấm và các yếu tố cần chú ý (Artisan Ink Pigments).
- [**EDITORIAL_STUDIO_DESIGN_PLAN.md**](./implement-plan/completed/EDITORIAL_STUDIO_DESIGN_PLAN.md): Kế hoạch áp dụng Editorial AI Studio Design System vào PanelForge.
- [**EDITORIAL_STUDIO_TASK_LIST.md**](./implement-plan/completed/EDITORIAL_STUDIO_TASK_LIST.md): Danh sách kiểm tra chi tiết các màn hình và components đã chuyển đổi sang phong cách Editorial Studio.
- [**UI_REFACTOR_CHECKLIST.md**](./implement-plan/completed/UI_REFACTOR_CHECKLIST.md): Danh mục tinh giản kiến trúc UI, loại bỏ duplicate role views và dọn dẹp mock data.

---

## 🔍 KIỂM ĐỊNH CHẤT LƯỢNG (AUDIT & QUALITY)

- [**UI_SCREEN_AUDIT.md**](./audit/UI_SCREEN_AUDIT.md): Báo cáo rà soát hiện trạng 100% các màn hình giao diện (Auth, Workspace, Production Pipeline, Series Bible, AI Tools, Role Desks).

---

## 📦 LƯU TRỮ LỊCH SỬ (ARCHIVE)

Thư mục: [`docs/archive/reviews/`](./archive/reviews/)
- [**2FA_AUTHENTICATION_REVIEW.md**](./archive/reviews/2FA_AUTHENTICATION_REVIEW.md): Báo cáo nghiệm thu tính năng xác thực 2 yếu tố (TOTP RFC 6238).
- [**BACKEND_EMAIL_PIN_VERIFICATION_REVIEW.md**](./archive/reviews/BACKEND_EMAIL_PIN_VERIFICATION_REVIEW.md): Báo cáo rà soát luồng gửi mã PIN qua email và bảo mật API.
- [**FE_TESTING_REVIEW.md**](./archive/reviews/FE_TESTING_REVIEW.md): Kế hoạch thiết lập Vitest, giải quyết lỗi xung đột CRLF/Prettier và chuẩn hóa TypeScript ban đầu.

---

## 🧩 TÀI LIỆU KIẾN TRÚC THEO VAI TRÒ (ROLE-BASED MODULES)

Mỗi vai trò nghiệp vụ trong PanelForge có tài liệu kiến trúc cục bộ tại thư mục tương ứng:

| Vai trò | Đường dẫn tài liệu | Trách nhiệm chính |
| :--- | :--- | :--- |
| **Overview** | [src/README.md](../src/README.md) | Kiến trúc phân tầng và điều hướng phân quyền (RBAC) |
| **Shared** | [src/shared/README.md](../src/shared/README.md) | Các component dùng chung, Pipeline Kanban Board, Modals |
| **Admin** | [src/roles/admin/README.md](../src/roles/admin/README.md) | Quản lý người dùng, phân quyền, cài đặt hệ thống |
| **Artist** | [src/roles/artist/README.md](../src/roles/artist/README.md) | Bàn vẽ Manga, layout panel, layer quản lý |
| **Editor** | [src/roles/editor/README.md](../src/roles/editor/README.md) | Soát lỗi, kiểm tra tính liên tục, duyệt bản thảo |
| **Guest** | [src/roles/guest/README.md](../src/roles/guest/README.md) | Xem portfolio công khai, xem demo |
| **Letterer** | [src/roles/letterer/README.md](../src/roles/letterer/README.md) | Đặt bóng thoại (speech bubble), hiệu ứng âm thanh (SFX) |
| **Producer** | [src/roles/producer/README.md](../src/roles/producer/README.md) | Quản lý dự án, tiến độ sprint, Kanban pipeline |
| **Publisher** | [src/roles/publisher/README.md](../src/roles/publisher/README.md) | Xuất bản, catalog, thông tin phát hành |
| **Reader** | [src/roles/reader/README.md](../src/roles/reader/README.md) | Trải nghiệm đọc truyện, tương tác độc giả |
| **Writer** | [src/roles/writer/README.md](../src/roles/writer/README.md) | Viết kịch bản, quản lý Series Bible, AI Script Breakdown |

---

> 💡 **Quy tắc bắt buộc:** Khi thực hiện bất kỳ thay đổi nào trong mã nguồn, hãy tham chiếu [`DOCUMENTATION_PROCESS.md`](./DOCUMENTATION_PROCESS.md) để cập nhật tài liệu tương ứng trước khi commit.
