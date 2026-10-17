# KẾ HOẠCH TRIỂN KHAI KIỂM THỬ FRONTEND & ĐẢM BẢO CHẤT LƯỢNG CODE (FE TESTING PLAN)

> **Dự án**: PanelForge Manga Studio Frontend (React 19 + TypeScript + Vite + Tailwind CSS)  
> **Mục tiêu**: Thiết lập hệ thống kiểm thử tự động (Unit Test, Component Test, Integration Test) và chuẩn hóa chất lượng code frontend.

---

## I. HIỆN TRẠNG CODEBASE & CÁC VẤN ĐỀ CẦN XỬ LÝ TRƯỚC

Trước khi triển khai viết test, có một số vấn đề nền tảng cần được chuẩn hóa để môi trường test và build chạy ổn định:

1. **Xung đột CRLF / Prettier (8.500+ lỗi đỏ)**:
   * Do môi trường Windows dùng `CRLF` nhưng Prettier mặc định kiểm tra `LF`.
   * **Giải pháp**: Bổ sung `"endOfLine": "auto"` vào `.prettierrc`.
2. **Lỗi TypeScript trong `src/App.tsx`**:
   * Gọi `<ArtistWorkspace />`, `<WriterWorkspace />`, `<EditorWorkspace />` nhưng chưa import từ `./components/modals/roles/`.
   * Đối tượng `newProj` trong `handleCreateNewProject` thiếu 3 trường bắt buộc của `MangaProject` (`coverStyle`, `coverText`, `tagline`).
   * **Giải pháp**: Import bổ sung và cập nhật đầy đủ các trường dữ liệu.
3. **Lỗi TypeScript trong `src/services/auth.service.ts`**:
   * `import.meta.env` chưa được nhận diện type Vite.
   * **Giải pháp**: Cấu hình `"types": ["vite/client"]` trong `tsconfig.json`.
4. **Hai file backup ở root (`App_commit.tsx`, `App_old.tsx`)**:
   * TypeScript đang quét nhầm 2 file này ở ngoài `src/` dẫn đến hàng chục lỗi import không tìm thấy.
   * **Giải pháp**: Thêm `"include": ["src"]` vào `tsconfig.json`.

---

## II. DANH MỤC CÁC BÀI TEST TÔI CÓ THỂ TRIỂN KHAI

### 1. Unit Test cho Services & Tầng Xử lý Dữ liệu (Services & Utilities)
* **File test**: `src/services/auth.service.test.ts`
  * **Test Case 1**: Gọi API `login` thành công (HTTP 200) khi người dùng nhập đúng thông tin -> xác nhận trả về token và thông tin user.
  * **Test Case 2**: Xử lý lỗi xác thực (HTTP 401 Unauthorized / sai mật khẩu) -> xác nhận throw đúng thông báo lỗi thân thiện.
  * **Test Case 3**: Xử lý lỗi máy chủ (HTTP 500 Server Error) -> không làm crash ứng dụng, trả về thông báo lỗi chuẩn.
  * **Test Case 4**: Xử lý lỗi mất kết nối mạng (Network failure) -> bắt ngoại lệ an toàn.
* **File test**: `src/data/mockData.test.ts`
  * Kiểm tra tính toàn vẹn của dữ liệu mẫu (`INITIAL_PROJECTS`, `INITIAL_KANBAN_CARDS`, `INITIAL_MEMBERS`), đảm bảo không có trường null bất thường gây lỗi runtime.

### 2. Component Testing (Kiểm thử Giao diện & Tương tác Người dùng)
* **File test**: `src/components/modals/LoginModal.test.tsx`
  * **Test Case 1**: Kiểm tra render đầy đủ các thành phần UI: input Email, Password, nút Đăng nhập, nút đóng.
  * **Test Case 2**: Kiểm tra validation: Nếu để trống hoặc nhập sai định dạng email, hiển thị thông báo nhắc nhở và không gửi request rác.
  * **Test Case 3**: Kiểm tra trạng thái tải (Loading state): Trong lúc chờ API phản hồi, nút Đăng nhập bị vô hiệu hóa và hiển thị trạng thái đang xử lý.
  * **Test Case 4**: Luồng đăng nhập thành công: Gọi đúng `authService.login`, đóng modal và kích hoạt callback thành công.
* **File test**: `src/components/Sidebar.test.tsx`
  * **Test Case 1**: Render chính xác danh sách các mục điều hướng (Dashboard, Workflow, Series Bible, Members...).
  * **Test Case 2**: Click vào từng mục điều hướng kích hoạt đúng callback `setCurrentView(...)`.
  * **Test Case 3**: Kiểm tra hiển thị trạng thái active (highlight) tương ứng với view hiện tại.
* **File test**: `src/components/modals/CreateProjectModal.test.tsx`
  * **Test Case 1**: Kiểm tra việc nhập dữ liệu form tạo mới project (Tiêu đề, Chapter, Arc, Cover Style...).
  * **Test Case 2**: Submit form gọi hàm `onCreateProject` với payload chuẩn kiểu `MangaProject`.
* **File test**: `src/views/WorkflowBoardView.test.tsx`
  * **Test Case 1**: Render đúng 8 cột trạng thái Kanban (`Script`, `Thumbnail`, `Pencil`, `Ink`, `Color`, `Letter`, `Review`, `Approved`).
  * **Test Case 2**: Render đúng số lượng card trang truyện và hiển thị đúng nhãn `pageType`.

### 3. Integration / Smoke Testing (Kiểm thử Tổng thể Ứng Dụng)
* **File test**: `src/App.test.tsx`
  * Kiểm tra ứng dụng khởi chạy và render thành công trang Landing Page / Workspace mà không vấp phải bất kỳ uncaught exception nào.
  * Kiểm tra luồng chuyển đổi giữa Landing Page và Main App.
  * Kiểm tra việc mở / đóng các Modal quan trọng (Command Palette, Vector Status, Spread Workbench).

---

## III. CÔNG NGHỆ & CÔNG CỤ SẼ ĐƯỢC TÍCH HỢP

| Công Cụ | Mục Đích | Ưu Điểm |
| :--- | :--- | :--- |
| **Vitest** | Test runner chính | Tích hợp gốc với Vite, siêu nhanh, hỗ trợ ESM & TypeScript out-of-the-box |
| **@testing-library/react** | Kiểm thử Component React | Tiêu chuẩn số 1 thế giới cho React, tập trung vào trải nghiệm người dùng thực tế |
| **@testing-library/jest-dom** | Bộ matcher mở rộng | Cho phép viết `expect(element).toBeInTheDocument()`, `toBeDisabled()` trực quan |
| **@testing-library/user-event** | Giả lập tương tác | Mô phỏng chính xác hành động gõ phím, click chuột của người dùng |
| **jsdom** | Môi trường DOM ảo | Chạy test React nhanh chóng trong Node.js mà không cần mở trình duyệt thật |

---

## IV. CÁC LỆNH SẼ ĐƯỢC BỔ SUNG VÀO `package.json`

Sau khi tích hợp, bạn có thể dễ dàng chạy các lệnh sau từ terminal:

```bash
# Chạy toàn bộ test tự động (chế độ theo dõi khi code thay đổi)
npm run test

# Chạy kiểm thử 1 lần (dành cho CI/CD hoặc kiểm tra trước khi commit)
npm run test:run

# Kiểm tra độ phủ kiểm thử (Coverage Report xem bao nhiêu % code đã được test)
npm run test:coverage

# Kiểm tra toàn bộ lỗi kiểu dữ liệu TypeScript
npm run typecheck

# Lệnh tổng hợp: Kiểm tra typecheck + lint + chạy test một lượt
npm run quality
```

---

## V. QUY TRÌNH THỰC HIỆN KHI BẠN DUYỆT

1. **Bước 1**: Cài đặt các devDependencies cho Vitest & React Testing Library.
2. **Bước 2**: Khắc phục các lỗi nền tảng (CRLF Prettier, thiếu import trong `App.tsx`, cấu hình `tsconfig.json`).
3. **Bước 3**: Cấu hình file `vitest.config.ts` và `src/test/setup.ts`.
4. **Bước 4**: Viết các bộ test cụ thể (`auth.service.test.ts`, `LoginModal.test.tsx`, `Sidebar.test.tsx`, `WorkflowBoardView.test.tsx`, `App.test.tsx`).
5. **Bước 5**: Chạy thử nghiệm và xác minh 100% test case đều PASS xanh và `npm run build` thành công mỹ mãn.

---
*Vui lòng xem xét các hạng mục trên và phản hồi nếu bạn muốn điều chỉnh hoặc phê duyệt triển khai!*
