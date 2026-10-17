# BÁO CÁO AUDIT TOÀN DIỆN GIAO DIỆN (UI/UX SCREEN AUDIT)
**Dự án**: PanelForge Manga Studio AI  
**Thời gian thực hiện**: 14/10/2026  
**Phương pháp thực hiện**: Trình duyệt tự động hoá (Browser Subagent) đăng nhập lần lượt từng tài khoản phân quyền (RBAC), kiểm tra DOM/Console logs, kết hợp đối chiếu mã nguồn phân tích tĩnh (Static Code Audit).

---

## 1. TỔNG QUAN TÌNH TRẠNG KIỂM TRA ROLE-BASED ACCESS & SERVER

| Role | Tài khoản đăng nhập | Mật khẩu | URL đích chính | Trạng thái hiển thị | Console Errors / Warnings |
|---|---|---|---|---|---|
| **Guest / Public** | *(Chưa đăng nhập)* | — | `/`, `/login`, `/catalog`, `/preview/:token` | Hoạt động tốt | Sạch, không có lỗi runtime |
| **Admin** | `admin@panelforge.com` | `Bnt123#` | `/admin` | Hoạt động, hiển thị đúng dữ liệu hệ thống | Cảnh báo deprecation React key nhỏ |
| **Producer** | `producer@panelforge.com` | `Bnt123#` | `/workspaces`, `/workspaces/:id`, `/series/:id/dashboard`, `/series/:id/export` | Hoạt động, gọi API BE thực tế | 1 số hình ảnh avatar unaccent 404 fallback |
| **Writer** | `writer@panelforge.com` | `Bnt123#` | `/workspaces/:id/series/:id/script` | Hoạt động, CRUD ScriptLines & Outline OK | Cảnh báo input uncontrolled nhẹ |
| **Artist** | `artist@panelforge.com` | `Bnt123#` | `/workspaces/:id/series/:id/artist` | Hoạt động, quản lý Pages & Mẫu khung | Không có lỗi nghiêm trọng |
| **Letterer** | `letterer@panelforge.com` | `Bnt123#` | `/workspaces/:id/series/:id/letterer` | Hoạt động với `LetteringWorkspace` | Có một số cảnh báo props SVG |
| **Editor** | `editor@panelforge.com` | `Bnt123#` | `/workspaces/:id/series/:id/review/:taskId` | Hoạt động với `ReviewView` | Không có lỗi runtime |

---

## 2. PHÂN TÍCH CHI TIẾT CÁC MÀN HÌNH CÒN DÙNG DỮ LIỆU MẪU (MOCK DATA)

Qua rà soát toàn bộ source code frontend, các thành phần phụ thuộc vào `mocks/mockData.ts` và `mocks/mockScriptData.ts` bao gồm:

### 2.1. Thư mục `src/roles/artist/components/page-layout-editor/`
- **Các file**:
  - `CanvasEditor.tsx` (dùng mock SVG layout, 0 lượt sử dụng trong luồng chính).
  - `AILayoutModal.tsx` (dùng mock AI suggestions cho khung hình).
  - `PanelProperties.tsx` (dùng mock thuộc tính khung hình).
  - `BibleReferencePanel.tsx` (import trực tiếp `INITIAL_BIBLE_ENTITIES` từ `@/mocks/mockData`).
- **Thực trạng**: Đây là các component cũ thuộc về giai đoạn thiết kế thử nghiệm ban đầu (Spike UI). Hiện tại luồng Artist đã chuyển sang dùng toàn diện **`ArtistDeskView.tsx`** (kết nối trực tiếp với `panelService`, `pageService`, `frameTemplateService`).
- **Kiến nghị**: Loại bỏ hoặc refactor các component này vào kho lưu trữ (archive), ngắt hoàn toàn kết nối với mock data.

### 2.2. Nhóm component kịch bản: `AIBreakdownDiff`, `ScriptOutline`, `VersionCompareView`
- **File**:
  - `src/roles/writer/components/script/AIBreakdownDiff.tsx` (import `ScriptBlock` từ `@/mocks/mockScriptData`).
  - `src/roles/writer/components/script/ScriptOutline.tsx` (import `ScriptBlock` từ `@/mocks/mockScriptData`).
  - `src/roles/writer/components/script/VersionCompareView.tsx` (import `ScriptBlock` từ `@/mocks/mockScriptData`).
- **Thực trạng**: Cả 3 file này hiện tại **không còn được import** ở bất cứ đâu trong `ScriptEditorView.tsx` hay các views chính của Writer (`0 usages`). Màn hình kịch bản thực tế đã dùng `scriptLineService` với các Entity chính thức từ backend API (Cảnh, Dòng kịch bản, Phân loại Lời thoại/Chỉ dẫn).
- **Kiến nghị**: Xoá bỏ các file thừa này để dọn sạch cây thư mục dự án.

### 2.3. Màn hình `TaskEditorView.tsx`
- **Đường dẫn**: `src/shared/features/production-workspace/TaskEditorView.tsx`
- **Thực trạng**: File này vẫn import và tìm kiếm task từ `INITIAL_KANBAN_CARDS` (`@/mocks/mockData`). Khi người dùng mở route `/workspaces/:wsId/series/:seriesId/task/:taskId`, nếu ID không có trong mock data thì sẽ fallback về một object giả lập `"Demo Task: ..."`.
- **Kiến nghị**: Chuyển `TaskEditorView` sang gọi API thực tế của `assignmentService` hoặc tích hợp modal chi tiết task từ Kanban Board (`WorkflowBoardView`).

---

## 3. TÌNH TRẠNG CÁC MÀN HÌNH TĨNH / KẾT NỐI API (STATIC VS REAL API)

| Màn hình | File Component | Tình trạng API thực tế | Đánh giá & Khắc phục |
|---|---|---|---|
| **ExportView** | `src/roles/producer/views/ExportView.tsx` | **ĐÃ NỐI API THẬT** (`exportService`, `chapterService`) | Giao diện đã gọi `chapterService.getChaptersBySeries` và `exportService.createExport`. Tuy nhiên cần hoàn thiện thanh tiến trình theo thời gian thực (SignalR / polling định kỳ). |
| **ReaderPortalView / PublicCatalogView** | `src/roles/reader/views/PublicCatalogView.tsx` | **ĐÃ NỐI API THẬT** (`catalogService.getPublicCatalog`) | Đã thay thế hoàn toàn route `/reader` cũ bằng `/catalog`. Màn hình tải danh sách truyện công khai thực tế từ backend. |
| **PublicPreviewView** | `src/roles/reader/views/PublicPreviewView.tsx` | **ĐÃ NỐI API THẬT** (`previewLinkService.resolvePreviewLink`) | Hỗ trợ đọc truyện qua Public Share Token không cần đăng nhập. Cần cải thiện UX điều hướng lật trang dạng Webtoon/Manga. |
| **DashboardView** | `src/roles/producer/views/DashboardView.tsx` | **ĐÃ NỐI API THẬT** (`seriesService.getSeriesProgress`) | Đã kết nối lấy StageProgress, Burndown và Ma trận công đoạn. Cần xử lý UI trực quan hơn khi dữ liệu rỗng (Empty state cho Burndown). |
| **VersionCompareView** | `src/roles/writer/components/script/VersionCompareView.tsx` | **MÀN HÌNH TĨNH / MOCK** | Chưa kết nối API lịch sử version kịch bản của backend. Đang dùng mock `ScriptBlock`. |

---

## 4. RÀ SOÁT CÁC FILE TRÙNG LẶP & ĐẶT TÊN DỄ GÂY NHẦM LẪN

### 4.1. `AdminDashboard.tsx` vs `AdminDashboardView.tsx`
- **Thực trạng**: 
  - `AdminDashboard.tsx`: Đóng vai trò là **Shell Layout điều hướng** riêng của trang Admin (chứa Sidebar, Drawer, thanh Header Admin, quản lý tab chuyển đổi).
  - `AdminDashboardView.tsx`: Là **Tab con "Overview & Health"** hiển thị thông số CPU, RAM, Postgres DB, Storage, Service Nodes.
- **Vấn đề**: Tên gọi tương tự nhau dễ gây hiểu nhầm là duplicate code.
- **Giải pháp**: Đổi tên `AdminDashboard.tsx` thành `AdminPortalShell.tsx` hoặc `AdminLayout.tsx` để phản ánh đúng cấu trúc.

### 4.2. Cặp màn hình Letterer: `LettererWorkspace.tsx` vs `LetteringWorkspace.tsx`
- **Thực trạng**:
  - `LettererWorkspace.tsx`: Component bọc ngoài (Wrapper) phụ trách chọn Chapter và Page từ URL params.
  - `LetteringWorkspace.tsx`: Bàn làm việc kỹ thuật chèn chữ thực thụ (Workspace Canvas, Canvas Text, Bong bóng thoại, AI Suggestions).
- **Giải pháp**: Giữ nguyên cơ chế nhưng đổi tên file wrapper thành `LettererDeskView.tsx` cho đồng bộ với `ArtistDeskView.tsx` và `PublisherDeskView.tsx`.

### 4.3. Các component di sản: `ArtistWorkspace.tsx`, `EditorWorkspace.tsx`, `WriterWorkspace.tsx`
- **Thực trạng**:
  - Các file này chỉ còn được dùng duy nhất bên trong `SpreadWorkbenchModal.tsx` (một modal xem trang đôi hai trang cũ).
  - Hoàn toàn độc lập và không ăn nhập với luồng làm việc thực tế hiện tại (`ArtistDeskView`, `ReviewView`, `ScriptEditorView`).
- **Giải pháp**: Loại bỏ modal cũ `SpreadWorkbenchModal` và dọn dẹp cả 3 file workspace mock này.

---

## 5. CÁC VẤN ĐỀ VỀ BỐ CỤC, UI CHƯA TỐT, UX CHƯA HỢP LÝ PHÁT HIỆN QUA BROWSER

1. **Sidebar Navigation bị ép không gian**:
   - Ở độ phân giải laptop chuẩn (1366x768 hoặc 1536x730), mục menu dưới cùng ("Cổng Duyệt Xuất Bản", "AI Multi-Agent") thường xuyên bị đẩy sát đáy hoặc tràn khỏi viewport do cụm thông tin user/logout chiếm diện tích cố định.
2. **Khung tranh Artist Desk quá nhiều khoảng trắng vô nghĩa**:
   - Màn hình bàn vẽ hiện tại dành đến 80% diện tích cho khoảng trống bao quanh thumbnail `1200x1800`. Cần mở rộng canvas làm việc trung tâm theo dạng pan/zoom viewport thực thụ của phần mềm đồ hoạ.
3. **Empty States còn đơn điệu**:
   - Các màn hình khi chưa có dữ liệu (Series Bible, Ma trận phân cảnh) chỉ hiển thị icon và thông báo ngắn, chưa có các CTA dẫn dắt người dùng thực hiện hành động đầu tiên một cách trực quan.
4. **Trực quan hoá số liệu và thẻ Quota**:
   - Trên Producer Overview, 4 thẻ hạn mức và tài nguyên có cấu trúc chữ bị dồn ép, các thanh tiến trình hiển thị màu sắc cam/xanh chưa đồng nhất với độ cảnh báo (ví dụ 0% sử dụng nhưng vẫn hiện thanh đậm).

---

## 6. KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO (ACTION PLAN)
1. Dọn dẹp các file rác và mock data không còn sử dụng (`AIBreakdownDiff`, `ScriptOutline`, `VersionCompareView`, `page-layout-editor`).
2. Tái cấu trúc tên gọi `AdminDashboard` -> `AdminPortalShell`.
3. Thay thế mock `TaskEditorView` bằng logic thật.
4. Bắt tay vào thiết kế lại các màn hình trọng điểm (Artist Desk, Producer Dashboard, Series Bible) theo phong cách Manga Paper & Ink trên Stitch.
