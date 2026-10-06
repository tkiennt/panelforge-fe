# Role: Guest (Khách vãng lai / Chưa đăng nhập)

## 1. Mô tả
Khách vãng lai (Guest) là người dùng truy cập PanelForge khi chưa xác thực danh tính. Role này có thể khám phá sản phẩm, tìm hiểu tính năng và tiến hành đăng nhập hoặc đăng ký tài khoản.

## 2. Route & Màn hình
- **Route mặc định**: `/`
- **Màn hình chính**:
  - `LandingPageView.tsx`: Trang giới thiệu giải pháp xuất bản và sản xuất truyện tranh tích hợp AI PanelForge.

## 3. Modals nghiệp vụ
- `LoginModal.tsx`: Hộp thoại đăng nhập (hỗ trợ Email + Mật khẩu, Google Firebase, bước xác thực hai yếu tố 2FA).
- `RegisterModal.tsx`: Hộp thoại đăng ký tài khoản mới và xác minh email bằng mã OTP / PIN.
