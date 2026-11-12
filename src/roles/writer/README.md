# Role: Writer (WorkspaceRole / TaskRole)

## 1. Mô tả
Biên kịch (Writer) chịu trách nhiệm sáng tác kịch bản truyện tranh, biên soạn đề cương chương (outline), sử dụng AI Breakdown để phân rã kịch bản thành các khối cảnh (scene), hành động (action), thoại (dialogue), và liên kết thực thể Kinh thánh bộ truyện (Bible Entities).

## 2. Route & Màn hình
- **Route mặc định**: `/workspaces/:workspaceId/series/:seriesId/script`
- **Màn hình chính**:
  - `ScriptEditorView.tsx`: Bàn viết kịch bản, bố cục theo Bàn vẽ của Artist:
    - Header chung (`FocusWorkspaceLayout`): Bộ truyện / Chương, công đoạn Viết → Editor duyệt → Khóa kịch bản, nút Gửi Editor duyệt (Producer: Duyệt kịch bản).
    - Thanh biểu tượng trái (`ScriptStudioRail`): Đề cương, Nhân vật, Nhất quán, Nhập, Trợ lý AI, Lịch sử; phía dưới là Phân cảnh và Bible Gate.
    - Trang giấy ở giữa (`ScreenplayFlowEditor`) theo định dạng full script truyện tranh: Writer chia Trang → Panel, không làm thumbnail (Artist vẽ theo kịch bản).
      - Mỗi Panel: dòng "PANEL N:" và mô tả khung tranh; thoại / dẫn truyện / SFX là dòng hai cột "1. TÊN (OFF):  lời thoại", đánh số lại từ 1 ở mỗi trang.
      - Gõ `TÊN:` hoặc `TÊN (OFF):` ở đầu dòng để viết thoại; cảnh chỉ là đường phân cách nhẹ, Trợ lý AI và Lịch sử dùng cảnh tại con trỏ.
    - Thanh công cụ nổi ở đáy: chế độ xem, dải trang + "Thêm trang" (4 hoặc 5 khung), loại dòng hiện tại, lưu (Ctrl+S).
    - Gõ kịch bản: Enter = dòng hành động mới; gõ `Tên:` đầu dòng = lời thoại có nhãn người nói (khớp Series Bible,
      hoặc tên viết HOA); Tab / Shift+Tab đổi loại dòng (Hành động → Thoại → Lời dẫn → SFX); Enter trên dòng trống
      quay về hành động; Backspace đầu lời thoại bỏ nhãn người nói.
    - Định dạng lưu giữ tương thích Bàn vẽ: thoại `Tên: "lời thoại"`, `SFX: ...`, `Lời dẫn: ...`.
  - `WriterWorkspace.tsx`: Bàn làm việc nhanh của biên kịch trong cửa sổ phân cảnh / Spread Workbench.

## 3. Thành phần (Components)
- `ScriptEditor.tsx`: Trình soạn thảo kịch bản tích hợp trong Task Editor đa vai trò.
- `components/script/`:
  - `ScriptStudioRail.tsx`: Thanh biểu tượng 72px của bàn viết (cùng theme `pf-sidebar` với Bàn vẽ), hỗ trợ badge và menu con.
  - `ScriptScenesDrawer.tsx`: Ngăn kéo danh sách phân cảnh (chọn, đổi tên, xoá cảnh; Producer xoá chương).
  - `ScriptLineItem.tsx`: Biên tập chi tiết từng dòng kịch bản (Speaker, loại thoại, nội dung, ghi chú âm thanh/hành động).
  - `BibleCharactersDrawer.tsx`: Drawer tra cứu và gán nhanh nhân vật/thực thể Bible vào dòng kịch bản.
  - `ConsistencyFindingsDrawer.tsx`: Drawer hiển thị kết quả kiểm tra nhất quán kịch bản và cuộn tới dòng thoại tương ứng.
  - `NarrativeContextDrawer.tsx`: Drawer xem mạch truyện (Story Arc) và đề cương chương (Outline).
  - `ScriptHistoryModal.tsx`: Hộp thoại lịch sử phiên bản kịch bản phân cảnh, so sánh đối chiếu diff và khôi phục revision (UC-18, UC-13).
