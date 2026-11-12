# Role: Publisher (SystemRole)

Đơn vị phát hành bên ngoài Studio (External Stakeholder). Đặc tả hiện hành: `Github/note/PANELFORGE_MASTER_SPECIFICATION_V2_6.md` (Module 5, BR-32, BR-33, quyết định Q7, Q12). Task chuyển đổi: `Github/note/plans/06_RELEASE_PLAN.md` (REL-04) và `07_READER_PLAN.md` (RDR-07).

> **Code hiện tại lệch đặc tả.** Phần 1 mô tả hành vi đang chạy; phần 2 là đích cần đạt. Khi làm xong task tương ứng, xoá dòng ở phần 1 và giữ phần 2.

## 1. Hiện tại trong code (sẽ thay đổi)

- Publisher là vai trò cấp hệ thống (`SystemRole.Publisher`; `WorkspaceRole.Publisher` đã `[Obsolete]`), thấy mọi Series của mọi Workspace.
- Nhận thông báo `ChapterReadyForPublication` khi Producer duyệt chương; xem chương `Approved`.
- Gọi được `POST /api/chapters/{id}/publish` (ngay hoặc lên lịch) và `POST /api/chapters/{id}/reopen` (từ chối kèm lý do). → **Sẽ chuyển về chỉ Producer** (REL-04).
- Chưa đặt được giá chương; giá hiện do Producer/Editor đặt trên cả chương (`isLocked`, `priceVnd`). → **Sẽ chuyển sang Publisher, theo từng ấn bản ngôn ngữ** (RDR-07).

## 2. Đích theo spec V2.6

- **Một tài khoản Publisher duy nhất toàn hệ thống** (Q12), phát hành cho mọi Workspace và Series.
- **Publisher Portal** gồm:
  - **Bàn giao (chỉ đọc):** danh sách gói Release và PreviewLink được chuyển giao, tải gói.
  - **Quy định thương mại:** đặt Free / Trả phí, giá (VNĐ) và số trang xem trước cho **từng ấn bản ngôn ngữ** của chương (BR-33). Được phép ở mọi trạng thái ấn bản, có Audit.
- **Không được:** sửa nội dung, duyệt, nghiệm thu, từ chối, phát hành hay mở lại chương/ấn bản (`403`). Phát hành và mở lại chỉ do Producer.
- Không xem Dashboard lượt đọc và doanh thu (chỉ Producer, BR-32).
- Đọc toàn bộ mọi ấn bản mà không trả tiền.
