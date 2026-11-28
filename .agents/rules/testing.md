---
trigger: always_on
---
# Kiểm thử: chỉ chạy test trước khi push

- Sau mỗi lần sửa code: **KHÔNG** chạy `npm run test:run`, `vitest`, `npm run quality` hay Playwright. Chỉ kiểm tra tĩnh nhanh trên file vừa sửa:
  - `npx eslint <file vừa sửa>`
  - `npm run typecheck`
  - `npm run i18n:check` nếu có sửa `src/locales/*`
- **Ngay trước khi push lên GitHub (hoặc mở/cập nhật PR):** chạy `npm run lint`, `npm run typecheck` và test của các thư mục bị ảnh hưởng (`npx vitest run <thư mục đã sửa>`). Có lỗi thì sửa xong mới push.
- Người dùng yêu cầu chạy test trực tiếp thì chạy ngay, không cần đợi đến lúc push.
