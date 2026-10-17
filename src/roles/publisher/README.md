# Role: Publisher (WorkspaceRole)

Vai trò chịu trách nhiệm kiểm tra cuối cùng và xuất bản chương truyện ra công chúng (AllowAnonymous / Public Reader) theo Core Flow (họp GVHD tuần 5).

## Trách nhiệm & Quyền hạn
1. Nhận thông báo khi Producer phê duyệt hoàn tất sản xuất chương (`NotificationType.ChapterReadyForPublication`).
2. Xem danh sách các chương đang ở trạng thái `Approved` (Chờ duyệt xuất bản).
3. **Phê duyệt & Xuất bản**:
   - Xuất bản ngay lập tức (`POST /api/chapters/{id}/publish` với `publishAt = null`).
   - Lên lịch xuất bản trong tương lai (`POST /api/chapters/{id}/publish` với `publishAt = ISO UTC`).
4. **Từ chối xuất bản**:
   - Trả lại chương về cho Producer/Studio để chỉnh sửa kèm lý do bắt buộc (`POST /api/chapters/{id}/reopen` với `{ comment }`). Producer sẽ nhận thông báo `ChapterReopened`.
5. Xem toàn bộ dòng thời gian lịch sử phê duyệt (`GET /api/chapters/{id}/reviews`).

## Quy tắc Nghiệp Vụ (BR)
- Chỉ Publisher (hoặc Producer sở hữu Workspace) mới có quyền gọi `POST /api/chapters/{id}/publish`.
- Khi chương đã `Published`, đây là bản phát hành chính thức, **không được phép mở lại** (409 Conflict).
- Độc giả chỉ có thể đọc chương công khai khi `status === Published` và `publishedAt <= now`.
