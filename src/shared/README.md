# Thư mục Shared (`src/shared/`)

## 1. Mô tả
Thư mục `src/shared/` chứa toàn bộ các màn hình (views), tính năng phức hợp (features), thành phần giao diện cơ bản (`src/shared/ui/`), và các hộp thoại (modals) được sử dụng chung bởi nhiều role hoặc thuộc phạm vi toàn bộ người dùng đã đăng nhập trong PanelForge.

## 2. Cấu trúc thư mục

### 2.1 Views chung (`src/shared/views/`)
- `WorkspaceListView.tsx` (+ test): Danh sách các Studio Workspace người dùng tham gia hoặc sở hữu. Header dạng hero card (pill Studio Hub, tiêu đề serif, KPI thật: tổng studio, bạn sở hữu, việc chờ bạn, bài chờ duyệt), lọc Tất cả / Bạn sở hữu / Được mời khi có cả hai loại, card Level 1 trắng; token theo DESIGN_RULES (`workspaceShelf.css`). Dưới header: khối Lời mời đang chờ (chấp nhận/từ chối), dải "Việc của bạn" (việc chưa xong trên mọi studio, gần hạn trước; `WorkspaceShelfSections.tsx`, `workspaceShelfTasks.ts`); card hiện số series + ảnh bìa nhỏ, thanh dung lượng (Owner/Producer), "Cập nhật ... trước" từ `lastActivityAt`; tìm kiếm & sắp xếp khi có từ 6 studio. Header nằm thẳng trên nền giấy với một câu tóm tắt và chip việc chờ/bài chờ duyệt (chỉ khi > 0); studio chưa có ảnh bìa riêng thì bìa card là kệ truyện (`SeriesShelf`): gáy sách hoặc bìa series thật.
- `NotificationCenterView.tsx`: Trung tâm thông báo hệ thống và tác vụ.
- `UserProfileView.tsx`: Trang thông tin cá nhân người dùng, cài đặt bảo mật và đăng xuất. Banner: ảnh bìa mẫu phủ toàn chiều ngang + lớp phủ kem (ngang trên desktop, dọc trên mobile), avatar trái, thông tin thật bên phải; nút "Đổi ảnh bìa" mở `features/profile/ProfileCoverPickerDialog` (chọn = xem trước, "Áp dụng" lưu qua `PUT /api/users/me/profile-cover`, "Hủy" trả bìa cũ). Danh mục mẫu: `utils/profileCovers.ts` (ID khớp Backend). Chuyển động: chỉ lớp ảnh (crossfade khi đổi + parallax ±6px theo chuột), tắt khi reduced-motion/cảm ứng.

### 2.2 Features phức hợp (`src/shared/features/`)
- **`series-bible/`**: Series Bible (`SeriesBibleView.tsx`): header dạng hero card kèm KPI (Chờ duyệt / Cần vẽ lại / Đã khoá Canon), sidebar trái gồm danh mục và quy trình khoá Canon (spec V2.6 §5.2), nội dung bên phải. Modal: `AddEntityModal.tsx`, `AddRevisionModal.tsx`, `ReworkModal.tsx`, `BibleEntityDetailModal.tsx`; danh mục dùng chung ở `bibleCategory.tsx`. Workbench một mục (`BibleEntityDetailModal`, toàn trang): sidebar gồm mục cùng danh mục, giai đoạn và "Xuất hiện trong kịch bản" (API `/bible/entries/{id}/usages`); vùng chính gồm dải trạng thái vòng đời (ai đang chờ, "Đến lượt bạn"), hai cột Đặc tả | Bản vẽ (ẩn bản vẽ với mục chỉ văn bản), rồi Phiên bản & nhật ký. Trường đặc tả theo danh mục khai báo một nơi ở `bibleSpec.ts` (lưu `detailsJson.attributes`); Artist xem đặc tả chỉ đọc khi nộp Concept.
- **`pipeline-board/`**: Bảng điều phối tiến độ sản xuất dạng Kanban qua các giai đoạn kịch bản, nét vẽ, màu sắc, thoại và phê duyệt : màn Quy trình sản xuất chỉ còn Lưới Giao Việc (`TaskGridBoard.tsx`), ma trận Trang × Công đoạn để Producer giao lô, đổi người, bỏ gán, mở lại và Editor duyệt ngay trên ô. `productionBoard.utils.ts` giữ các hàm dùng chung (nhãn trạng thái, công đoạn).
- **`production-workspace/`**: Khung bàn làm việc sản xuất và trình biên tập tác vụ đa năng (`WorkspaceView.tsx`, `TaskEditorView.tsx`).
- **`account/`**: Quản lý tài khoản cá nhân, xác thực hai lớp và đổi mật khẩu (`ChangePasswordModal.tsx`, `TwoFactorSetupModal.tsx`).
- **`provenance/`** (CF4): Lịch sử & nguồn gốc chương: bản duyệt (snapshot), Provenance Report (Producer/Editor), lịch sử AI và lịch sử canvas từng trang có so sánh / khôi phục cho Producer, Artist (`ChapterProvenanceModal.tsx`, `PageHistoryPanel.tsx`, `provenanceRules.ts`).

### 2.3 UI Primitives (`src/shared/ui/`)
Một mẫu giao diện = một primitive chuẩn dùng chung cho toàn hệ thống:
- `PageHeader`: Header trang với thanh mực cam và ô icon; biến thể toolbar cho thanh công cụ dính.
- `SectionHeader`: Header mục trên nền giấy với nhãn sienna, tiêu đề H2, chip đếm và hành động.
- `Card`: Khung bề mặt cấp 1 với tone ngữ nghĩa và vạch viền nổi bật tuỳ chọn.
- `CardHeader`: Dải đầu thẻ với ô icon theo tone, tiêu đề và nút phụ.
- `CardBody`: Thân thẻ trắng chuẩn chứa nội dung chính.
- `Button`: Nút bấm đa biến thể (primary, secondary, ai, success, warning, danger, ghost), hỗ trợ loading và active scale.
- `IconButton`: Nút bấm chỉ icon bắt buộc có aria-label, kích cỡ sm/md.
- `Badge`: Thẻ trạng thái bo tròn với 7 tone màu ngữ nghĩa và icon tuỳ chọn.
- `StatusBadge`: Thẻ trạng thái tự động ánh xạ enum nghiệp vụ qua statusTone.ts thành tone và nhãn i18n.
- `Field`: Khung bao trường nhập liệu tự động liên kết id, hint, error và cờ aria-describedby/aria-invalid.
- `Input`: Ô nhập liệu một dòng chuẩn kiểu studio với trạng thái focus/invalid.
- `Textarea`: Vùng nhập văn bản nhiều dòng chuẩn kiểu studio.
- `Select`: Menu chọn lựa native chuẩn kiểu studio.
- `SearchInput`: Ô tìm kiếm có icon Search và nút xóa nhanh nội dung.
- `Tabs`: Thanh chuyển tab hỗ trợ role tablist/tab, roving tabindex và điều hướng phím mũi tên.
- `EmptyState`: Khung trạng thái trống viền nét đứt, ô icon cam, tiêu đề serif và một nút hành động.
- `Skeleton`: Khung tải xung nhịp với kích thước tuỳ biến.
- `ProgressBar`: Thanh tiến độ chống chia cho 0 với tone ngữ nghĩa và role progressbar.
- `Metric`: Thẻ chỉ số hiển thị nhãn và giá trị font-mono đậm.
- `Avatar`: Ảnh đại diện người dùng hỗ trợ lazy load và tự động chuyển về chữ cái đầu.
- `CountChip`: Chip đếm số lượng phong cách giấy kraft cho header và tab.
- `Modal`: Hộp thoại modal căn giữa với bẫy tiêu điểm và khoá cuộn trang.
- `Drawer`: Bảng trượt cạnh bên hỗ trợ điều hướng và kiểm duyệt.
- `ConfirmDialog`: Hộp thoại xác nhận hỗ trợ biến thể type-to-confirm.
- `Alert`: Thanh thông báo nội dòng theo 5 tone ngữ nghĩa.
- `Toast`: Thông báo nổi góc màn hình tự động đóng và giới hạn ngăn xếp.
- `SidebarSection` / `SidebarItem`: Thành phần thanh điều hướng bên có hỗ trợ chế độ thu gọn.

### 2.4 Modals dùng chung (`src/shared/modals/`)
- `AuditLogModal.tsx`: Xem nhật ký kiểm toán hành động trong hệ thống.
- `ProvenanceModals.tsx`: Xem lịch sử phiên bản (`VersionHistoryModal`) và nguồn gốc sáng tạo AI (`AIProvenanceModal`).
- `VectorStatusModal.tsx`: Trạng thái đồng bộ chỉ mục véc-tơ cho AI context.
- `CommandPaletteModal.tsx`: Hộp lệnh điều hướng nhanh (Ctrl+K).
- `PreviewLinksModal.tsx`: Producer tạo / thu hồi link xem thử; link sao chép dạng `{origin}/review/invite/{token}`.
- `ReviewHandoffModal.tsx`: Cầu nối Web → Mobile cho trang review công khai: QR chứa `/review/invite/{token}` (app Mobile tự bóc token ở cuối URL), mã token kèm nút Copy và hướng dẫn.
- `SpreadWorkbenchModal.tsx`: Bàn làm việc trang đôi đa năng chuyển đổi giữa Writer, Editor và Artist.
