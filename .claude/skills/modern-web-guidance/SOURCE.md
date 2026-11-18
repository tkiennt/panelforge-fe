# Nguồn

- Repo: https://github.com/GoogleChrome/modern-web-guidance
- Commit: `64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65` (2026-11-16), package npm `modern-web-guidance@1.0.1`
- Giấy phép: Apache-2.0 (`LICENSE`). Nội dung `guides/` giữ nguyên, không sửa.
- `UPSTREAM_SKILL.md`: SKILL.md gốc (dùng `npx`), chỉ để tham khảo. Lưu ý: SKILL gốc nhắc lệnh `legacy-scan` nhưng CLI npm đã phát hành (kiểm 2026-11-17) chỉ có `search`, `list`, `retrieve`, `install`, `uninstall`, `update` → audit dự án làm bằng Grep (xem `09_MODERN_WEB_PLAN.md` §5).
- `SKILL.md`, `INDEX.md`: viết cho PanelForge (chế độ offline). `INDEX.md` sinh lại từ `guides/`.

## Cập nhật bản sao

1. Clone repo trên vào thư mục tạm, kiểm tra commit mới.
2. Thay `guides/` và `UPSTREAM_SKILL.md`, cập nhật commit ở file này.
3. Sinh lại `INDEX.md` (tiêu đề + câu mở đầu của từng guide).
4. Đọc diff `UPSTREAM_SKILL.md` xem có quy tắc mới cần đưa vào `SKILL.md`.
5. Commit `chore(deps): update modern web guidance to <commit7>`.
