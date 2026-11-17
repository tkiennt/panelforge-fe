---
trigger: always_on
---
# Modern Web Guidance (HTML/CSS/JS phía client)

Trước khi viết/sửa UI, CSS hay JS phía client trong `panelforge-fe`, tra bộ guide offline tại `.claude/skills/modern-web-guidance/`:

1. Tìm id trong `.claude/skills/modern-web-guidance/INDEX.md` bằng từ khoá tiếng Anh về năng lực UI (vd `dialog`, `popover`, `tooltip`, `enter submit`, `image priority`).
2. Đọc `.claude/skills/modern-web-guidance/guides/<category>/<id>.md` và áp dụng theo `SKILL.md` cùng thư mục (chính sách trình duyệt, cách dùng với React 19 + Tailwind v4).
3. Không gọi `npx modern-web-guidance` trừ khi user cho phép.

Mặc định bắt buộc (chi tiết ở `CLAUDE.md` mục "Modern Web Guidance"):
- Overlay chặn trang: `<dialog>` + `showModal()` qua `shared/ui/Modal` / `Drawer`; không dựng `fixed inset-0` + `role="dialog"` mới.
- Dropdown/menu/popover: Popover API; không thêm listener `mousedown` "click outside" mới.
- `onKeyDown` xử lý `Enter` bỏ qua khi `e.nativeEvent.isComposing` (bộ gõ tiếng Việt).
- Ngày/số: `Intl` theo ngôn ngữ i18n hiện hành, không ghi cứng `'vi-VN'`.
- `<img>` có kích thước, `loading="lazy"` dưới màn đầu, ảnh LCP `fetchPriority="high"`.

Thứ bậc: Business Rules → bảo mật → kiến trúc hiện có → `DESIGN_RULES.md` → guide này.
