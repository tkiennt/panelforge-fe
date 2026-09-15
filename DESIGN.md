# Design System & UI Guidelines

## Typography
- Lựa chọn font: Mặc định sử dụng font hệ thống (`sans-serif` với các thư viện như Inter hoặc Roboto nếu có).
- Kích thước: Tailwind cơ bản (sm, base, lg, xl, 2xl).

## Colors
- **Primary**: Màu chủ đạo cho các CTA (Call to action) button.
- **Secondary**: Các phần background hoặc component phụ trợ.
- **State Colors**:
  - Success: `green-500`
  - Error: `red-500`
  - Warning: `yellow-500`

## Components
- **Buttons**:
  - Sử dụng Tailwind class như `px-4 py-2 rounded-md font-medium`.
- **Modals**:
  - Nền mờ `bg-black/50`, form căn giữa màn hình với `z-index` cao.
- **Cards**:
  - Sử dụng `bg-white shadow-sm rounded-lg border border-gray-200`.

## Layout
- Ứng dụng theo dạng Single Page Application (SPA).
- **Sidebar** bên trái cố định (`w-64`), **Header** trên cùng (`h-16`), phần còn lại là **Main Content**.

*(Có thể cập nhật thêm chi tiết về Tailwind classes khi hệ thống phát triển)*
