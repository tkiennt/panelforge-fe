# Role: Publisher (SystemRole)

Đơn vị phát hành bên ngoài Studio (External Stakeholder). Đặc tả hiện hành: [`panelforge-hubs/docs/V2.6/PANELFORGE_MASTER_SPECIFICATION_V2_6.md`](../../../../panelforge-hubs/docs/V2.6/PANELFORGE_MASTER_SPECIFICATION_V2_6.md) (Module 5, BR-32, BR-33, quyết định Q7, Q8, Q12, D1, D4).

## Quyền theo spec V2.6 (cập nhật 2026-11-26)

- **Một tài khoản Publisher duy nhất toàn hệ thống** (Q12), làm việc với mọi Workspace và Series.
- **Producer chỉ bàn giao:** nghiệm thu Gate 3, cho phép phát hành từng ấn bản (`Approve Edition`) rồi bàn giao (`ChapterHandedOff`). Producer không phát hành.
- **Publisher Portal** gồm:
  - **Bàn giao:** xem danh sách gói Release và PreviewLink được chuyển giao, tải gói về.
  - **Quy định thương mại:** đặt Free / Trả phí, giá (VNĐ) và số trang xem trước cho **từng ấn bản ngôn ngữ** (BR-33). Bắt buộc đặt trước khi phát hành (D4). Thao tác này được phép ở mọi trạng thái ấn bản và có ghi Audit.
  - **Phát hành:** phát hành ngay (`PublishEdition`) hoặc hẹn giờ (`ScheduleEdition`) từng ấn bản đã được bàn giao (`Approved → Published`).
  - **Dashboard lượt đọc & doanh thu** (BR-32) của mọi Workspace. Producer cũng xem được, nhưng chỉ của Workspace mình.
  - **Tài khoản ngân hàng nền tảng và đối soát VietQR:** Publisher cấu hình tài khoản ngân hàng của nền tảng (Q13) ở `/publisher/revenue/payments`, bắt nhập mã 2FA, có lịch sử thay đổi; trang này cũng liệt kê giao dịch toàn nền tảng (kể cả nạp Ví), còn `/publisher/revenue/workspaces/:id` lọc theo Studio. Webhook SePay tự duyệt giao dịch khi khớp mã đơn; giao dịch nào còn chờ thì Publisher duyệt hoặc từ chối tay (kèm lý do).
- **Không được làm (trả `403`):** sửa nội dung, duyệt, nghiệm thu, từ chối hoặc trả lại bàn giao, mở lại chương về `InProduction` (quyền này chỉ Producer có).
- Được đọc toàn bộ mọi ấn bản mà không cần trả tiền.
