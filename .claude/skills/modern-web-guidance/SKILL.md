---
name: modern-web-guidance
description: |
  Offline copy of Google Chrome's Modern Web Guidance (210 guides) for PanelForge FE. Use FIRST when writing or changing HTML/CSS/client-side JS in panelforge-fe: modals/dialogs/drawers, popovers/dropdowns/menus, tooltips, tabs, toasts, forms & validation, Enter-to-submit inputs (IME), tables, scroll/animations/view transitions, images & Core Web Vitals (LCP/INP/CLS), accessibility, dates/locales, HTML sanitization, security headers, canvas accessibility.
  Do NOT use for backend (.NET, SQL, EF), Flutter mobile, CI/tooling, tests, or pure copy/i18n edits.
---

# Modern Web Guidance (PanelForge, offline)

Bản sao cố định của https://github.com/GoogleChrome/modern-web-guidance (xem `SOURCE.md`). Dùng file local, **không** gọi `npx modern-web-guidance` (cần mạng và chạy package ngoài; chỉ dùng khi user cho phép rõ ràng).

## Quy trình

1. **Tìm guide:** Grep `INDEX.md` trong thư mục skill này bằng 1–3 từ khoá tiếng Anh về *năng lực UI/nền tảng*, không dùng tên React/Tailwind/tên màn hình (vd `dialog`, `tooltip`, `enter submit`, `popover`, `tabs`, `image priority`, `long tasks`). Tách task nhiều tính năng thành nhiều lần tìm.
2. **Đọc guide:** mở `guides/<category>/<id>.md`. Đọc cả guide chuyên đề lẫn guide nền của mảng đó khi liên quan (`html`, `css`, `forms`, `accessibility`, `performance`, `security`, `color`). Guide nhắc `(via npx … retrieve "<id>")` → đọc `guides/*/<id>.md` tương ứng.
3. **Áp dụng vào stack PanelForge** (React 19 + Tailwind v4 + Vite):
   - Thuộc tính HTML mới chưa có type (`popover`, `commandfor`, `command`, `interestfor`…): spread/cast `{...({ popover: 'auto' } as Record<string, string>)}`, không sửa `@types/react`.
   - `showModal()`, `showPopover()` gọi qua `ref`; id/anchor-name sinh bằng `useId()`.
   - `:root`, `@starting-style`, `@property` để ở CSS top-level (vd `src/styles/`), không nhét vào class Tailwind động.
   - Không thêm dependency/polyfill mới (CLAUDE.md quy tắc 13); fallback viết tay ngắn hoặc giữ thư viện đang có.
4. **Kiểm lại** code so với guide (pattern hiện đại + fallback bắt buộc) trước khi kết thúc.
5. **Ghi nguồn:** cuối câu trả lời bàn giao thêm mục `### Modern Web Guidance`, mỗi guide đã áp dụng một gạch đầu dòng: `` - **`<id>`**: <lựa chọn không hiển nhiên đã làm và lỗi nó tránh> ``. Không bịa id; chỉ ghi guide đã đọc trong lượt này.

## Chính sách trình duyệt (PanelForge)

- **Baseline Widely available:** dùng thoải mái, không cần fallback.
- **Baseline Newly available:** được dùng nếu có feature detection (`CSS.supports`, `'x' in HTMLElement.prototype`, `@supports`) và fallback ≤ 20 dòng, không thêm dependency.
- **Limited availability** (vd `interestfor`, `command`/`commandfor` nếu chưa Baseline): chỉ làm progressive enhancement trên nền chức năng đã chạy được.
- Ưu tiên cao hơn guide: Business Rules → bảo mật → kiến trúc hiện có → `DESIGN_RULES.md` (token màu, cỡ chữ ≥ 12px, Lucide) → skill này.

## Không làm

- Không chạy `legacy-scan`, không tải bản mới tự động. Cập nhật bản sao: xem `SOURCE.md`.
- Không áp guide cho canvas Konva ngoài phần a11y/xuất ảnh (`expose-canvas-content-to-browser-features`, `export-html-media-from-canvas`).
