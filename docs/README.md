# 📚 PanelForge Technical Documentation Hub (`docs/`)

> Trung tâm lưu trữ và điều hướng toàn bộ tài liệu kỹ thuật, quy chuẩn thiết kế, kiến trúc hệ thống và kế hoạch triển khai của **PanelForge Manga Studio Frontend**.

---

## 🧭 CÁC TÀI LIỆU CHÍNH (CORE DOCUMENTS)

| Tài liệu | Mô tả | Trạng thái |
| :--- | :--- | :--- |
| [**DOCUMENTATION_PROCESS.md**](./DOCUMENTATION_PROCESS.md) | **Quy trình quản lý tài liệu & Quy tắc Source-Code-Doc-Sync** (Vòng đời kế hoạch `ongoing` → `completed`, ma trận cập nhật code-to-docs). | 🟢 Active |
| [**DESIGN_RULES.md**](../../panelforge-hub/docs/spec/DESIGN_RULES.md) | **Quy chuẩn thiết kế giao diện Editorial AI Studio**: Bảng token màu, font Inter, pill buttons, atmospheric orbs, spacing và layout. | 🟢 Active |
| [**PRODUCT.md**](../PRODUCT.md) | **Đặc tả nghiệp vụ sản phẩm**: 5 core flows, phân quyền 9 vai trò, Series Bible RAG, AI Assistant. | 🟢 Active |
| [**CLAUDE.md**](../CLAUDE.md) | **Chỉ dẫn phát triển**: Coding conventions, scripts kiểm thử và ràng buộc đồng bộ tài liệu. | 🟢 Active |

---

## 📋 ĐẶC TẢ & THEO DÕI CÔNG VIỆC NHÓM

- [`PANELFORGE_MASTER_SPECIFICATION_V2_6.md`](../../panelforge-hub/docs/V2.6/PANELFORGE_MASTER_SPECIFICATION_V2_6.md): đặc tả nghiệp vụ dùng chung cho Backend, Frontend và Mobile (luồng End-to-End, 5 module, Business Rules BR-xx, ma trận quyền, máy trạng thái). Bảng "Nhật ký quyết định" Q1–Q14 ở đầu file.
- [`TEAM_WORKBOARD.md`](../../panelforge-hub/docs/tracking/TEAM_WORKBOARD.md): ai đang làm gì, đã xong gì, đổi API/DB nào. **Bắt buộc cập nhật** khi bắt đầu và khi xong việc (quy tắc ở §1 của file).
- [`CHAPTER_AND_SCRIPT_SPECIFICATION.md`](../../panelforge-hub/docs/spec/CHAPTER_AND_SCRIPT_SPECIFICATION.md): đặc tả chi tiết Chương & Kịch bản.
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
| **Publisher** | [src/roles/publisher/README.md](../src/roles/publisher/README.md) | Publisher Portal: nhận gói bàn giao, quy định Free/Trả phí và giá theo ấn bản ngôn ngữ (spec V2.6) |
| **Reader** | [src/roles/reader/README.md](../src/roles/reader/README.md) | Trải nghiệm đọc truyện, tương tác độc giả |
| **Writer** | [src/roles/writer/README.md](../src/roles/writer/README.md) | Viết kịch bản, quản lý Series Bible, AI Script Breakdown |

---

> 💡 **Quy tắc bắt buộc:** Khi thực hiện bất kỳ thay đổi nào trong mã nguồn, hãy tham chiếu [`DOCUMENTATION_PROCESS.md`](./DOCUMENTATION_PROCESS.md) để cập nhật tài liệu tương ứng trước khi commit.
