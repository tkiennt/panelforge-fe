# Kế Hoạch Triển Khai: "Bàn Tải & Khớp Nét Panel Trực Quan" (Visual Panel Uploader) Trên Bàn Vẽ Artist Desk (CF2)

> **Trạng thái:** 🟢 **Hoàn thành (Completed)**  
> **Ngày khởi tạo:** 17/10/2026  
> **Ngày hoàn thành:** 19/10/2026  
> **Mục tiêu:** Đưa toàn bộ hành động tải ảnh về Canvas trung tâm, cho phép kéo-thả (Drag & Drop) và dán clipboard trực tiếp, tái cấu trúc bố cục 3 cột hiện đại, giải quyết triệt để cảnh báo chặn upload nhiệm vụ và hỗ trợ 2 chế độ vẽ (Panel Slice vs Full-page Composite).

---

## 1. Phân Tích Hiện Trạng & Các Điểm Nghẽn Chính

Dựa trên rà soát thực tế tại [ArtistDeskView.tsx](file:///d:/FPT-STUDY/10_FALL-2026/SEP490/Github/panelforge-fe/src/roles/artist/views/ArtistDeskView.tsx):
1. **Thao tác tải ảnh bị giấu sâu trong Inspector Panel:** Nút *"Tải ảnh cho khung"* nằm tít ở sidebar cột bên phải dưới nhiều trường thông số kỹ thuật ($X, Y, W, H$), tách rời hoàn toàn khỏi Canvas trung tâm.
2. **Cảnh báo điều kiện chặn mơ hồ:** Thông báo thụ động *"Cần đang làm (bấm 'Bắt đầu') một việc được giao cho Page hoặc Panel này mới tải được ảnh"* khiến Artist bối rối không biết nhiệm vụ ở đâu để bắt đầu.
3. **Quá nhiều thông số kỹ thuật số thô:** Bảng nhập $X(\%), Y(\%), \text{Rộng}\times\text{Cao}(\%)$ và nút *"Lưu Tọa Độ & Thứ Tự Đọc"* chiếm diện tích lớn nhưng không phản ánh thao tác trực quan của hoạ sĩ.
4. **Thiếu phản hồi trực tiếp trên từng Panel:** Trên canvas, các khung #1, #2, #3 chỉ là ô trống trắng, không có vùng kéo thả (Dropzone) trực tiếp, không thấy thumbnail ảnh nháp hay thanh tiến độ.
5. **Kịch bản phân cảnh nằm tít dưới đáy:** Danh sách dòng thoại neo vào panel nằm ở dưới cùng của sidebar phải, buộc hoạ sĩ phải cuộn lên cuộn xuống liên tục khi vẽ.

---

## 2. Thiết Kế Bố Cục & Trải Nghiệm Mới

### 🏛️ Bố Cục 3 Cột Hiện Đại:
- **Cột Trái (300px - 320px) — Bối Cảnh & Script Neo (Script & References):**
  - Tách riêng danh sách phân cảnh và các dòng kịch bản/thoại đã neo vào Panel đang chọn (#1, #2...).
  - Tích hợp nút xem nhanh Bible Reference ngay cạnh dòng thoại để tra cứu phục trang/thiết kế nhân vật mà không che canvas.
- **Khu Vực Trung Tâm (Flex-1) — Canvas Tương Tác & Direct Dropzone:**
  - Vùng kéo thả trực tiếp (Direct Drag & Drop): Khi kéo file ảnh vào khung nào, khung đó đổi viền cam nét đứt sáng và nhãn *"Thả ảnh vào Khung #X"*.
  - Hỗ trợ dán ảnh trực tiếp từ clipboard (`Ctrl+V` / `Paste`).
  - Thanh công cụ nổi (Floating Action Bar) ngay trên Panel đang chọn: `[+ Tải ảnh] [Đổi ảnh] [Tham chiếu Bible] [Xóa khung] [Chia khung]`.
- **Cột Phải (280px - 300px) — Thuộc Tính & Trạng Thái Công Đoạn (Production Inspector):**
  - Bảng tóm tắt bố cục panel gọn gàng (kích thước, vị trí, thứ tự đọc) thay cho các input số thô.
  - Khối Trạng thái Nhiệm vụ (Assignment Gateway) chủ động: Cung cấp nút CTA hành động trực tiếp.
  - Công cụ kiểm tra tính nhất quán (AI Consistency Check).

### ⚡ Giải Pháp Triệt Để Cho Cảnh Báo "Cần bấm Bắt đầu việc":
- Nếu công việc ở trạng thái `Assigned`: Ngay tại vị trí nút upload / ô panel trên canvas, hiển thị nút CTA:  
  👉 **`[Bắt đầu việc & Tải ảnh ngay]`** (Tự động kích hoạt API `assignmentService.startAssignment` rồi mở hộp thoại chọn file).
- Nếu bị chặn bởi công đoạn trước: Hiển thị trạng thái khóa nhẹ kèm nguyên nhân: *"Khung #X đang chờ Duyệt Kịch bản"*.

### 🖼️ 2 Chế Độ Tải (Upload Modes):
- **Chế độ 1: Tải theo từng Panel (Panel Slice Mode - Mặc định):** Bấm hoặc thả ảnh vào panel nào, ảnh khớp chính xác vào panel đó.
- **Chế độ 2: Tải cả trang (Full-page Composite Mode):** Toggle `[Tải cả trang (1200×1800)]`, đặt ảnh trang làm nền canvas và overlay các khung panel lên trên để đối chiếu khớp nét.

---

## 3. Lộ Trình Triển Khai Chi Tiết (5 Giai Đoạn)

### 📌 Giai Đoạn 1: Tái Cấu Trúc Bố Cục 3 Cột (3-Column Layout)
- [x] **1.1. Tách Cột Trái: Bối Cảnh & Script Neo:**
  - Chuyển phần Phân cảnh (Scene Selector) và Dòng kịch bản neo (Script Lines Anchored) từ đáy sidebar phải sang cột trái chuyên biệt.
  - Tích hợp nút xem nhanh Bible Reference cho nhân vật có thoại trong khung (`panel-bible-reference-btn-${id}`).
- [x] **1.2. Mở Rộng Canvas Trung Tâm (Flex-1 / 6 cols):**
  - Đặt Canvas làm tâm điểm lớn nhất của không gian làm việc (`lg:col-span-6`).
- [x] **1.3. Tinh Gọn Sidebar Thuộc Tính Cột Phải:**
  - Thay thế các ô input phần trăm thô sơ bằng thẻ tóm tắt thông số thanh lịch, hiển thị gọn gàng.
  - Tối ưu nút lưu toạ độ và giữ nguyên khả năng tương thích API.

---

### 📌 Giai Đoạn 2: Trực Quan Hóa Panel Dropzone Trên Canvas (Direct Drag & Drop)
- [x] **2.1. Xử lý sự kiện Kéo Thả (Drag & Drop):**
  - Xử lý `onDragOver`, `onDragLeave`, `onDrop` trên từng khung panel.
  - Hiệu ứng viền cam nét đứt sáng (`border-dashed border-orange-500 bg-orange-500/20 ring-2 ring-orange-400`) khi rê file vào khung và overlay nhãn *"Thả ảnh vào Khung #X"*.
- [x] **2.2. Trạng thái Panel Trực Quan:**
  - *Chưa có ảnh:* Icon nét vẽ mờ + nhãn *"Chưa có ảnh (Kéo thả hoặc chọn tệp)"* + nút nhanh `+ Tải ảnh`.
  - *Đang tải lên:* Vòng xoay tiến độ + kiểm tra mã băm SHA-256 nội bộ và thông báo tiến trình chi tiết.
  - *Đã có ảnh:* Hiển thị ảnh sắc nét kèm badge phiên bản `v...` ở góc, hover overlay nút *"Đổi ảnh"*.
- [x] **2.3. Hỗ trợ Dán Ảnh Từ Clipboard (`Ctrl+V`):**
  - Bắt sự kiện paste khi panel đang được chọn và tự động đẩy file vào luồng upload.

---

### 📌 Giai Đoạn 3: Thanh Công Cụ Nổi (Floating Toolbar) & Assignment Gateway CTA
- [x] **3.1. Floating Action Bar Trên Panel Đang Chọn:**
  - Hiển thị thanh nổi nhỏ gọn phía trên đỉnh khung: `[+ Tải ảnh] [Đổi ảnh] [Tham chiếu Bible] [Xóa khung] [Chia đôi]`.
- [x] **3.2. Cải tiến Assignment Gateway CTA:**
  - Thay thế thông báo lỗi thụ động bằng nút bấm tương tác:  
    Nếu `Assigned`: Hiển thị nút `[Bắt đầu việc & Tải ảnh ngay]` (gọi API start và kích hoạt file picker).
  - Duy trì đầy đủ các `data-testid` hiện có (`desk-upload-panel-btn-${id}`, `desk-upload-panel-blocked`).

---

### 📌 Giai Đoạn 4: Hỗ Trợ 2 Chế Độ Tải (Panel Slice vs Full-Page Composite) & Chuẩn Hóa UX Copy
- [x] **4.1. Toggle Chế Độ Tải Trên Canvas Header:**
  - Nút chuyển `[Tải từng khung]` và `[Tải cả trang (1200×1800)]`.
- [x] **4.2. Chế độ Full-Page Composite:**
  - Đặt ảnh cả trang làm backdrop layer dưới canvas và hiển thị các đường biên panel đè lên trên để đối chiếu khớp nét.
- [x] **4.3. Chuẩn Hóa Từ Vựng UX Writing:**
  - Bỏ các mã quy tắc nội bộ (`BR-11`, `BR-04`, `BR-12`, `Breaking 152`), ngôn ngữ tập trung vào hành động sáng tác của hoạ sĩ.

---

### 📌 Giai Đoạn 5: Kiểm Thử, Rà Soát Chất Lượng & Lưu Trữ
- [x] **5.1. Unit Tests:**
  - Chạy `npx vitest run src/roles/artist/` đảm bảo 100% tests của Artist Desk đều **PASSED** (42/42 tests).
- [x] **5.2. Typecheck & Build:**
  - Chạy `npm run build` xác thực không có lỗi TypeScript hay cú pháp (0 lỗi).
- [x] **5.3. Hoàn tất & Di chuyển tài liệu:**
  - Di chuyển kế hoạch từ `ongoing/` sang `completed/` và cập nhật mục lục tại [docs/README.md](file:///d:/FPT-STUDY/10_FALL-2026/SEP490/Github/panelforge-fe/docs/README.md).
