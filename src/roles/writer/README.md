# Role: Writer (WorkspaceRole / TaskRole)

## 1. Mô tả
Biên kịch (Writer) chịu trách nhiệm sáng tác kịch bản truyện tranh, biên soạn đề cương chương (outline), sử dụng AI Breakdown để phân rã kịch bản thành các khối cảnh (scene), hành động (action), thoại (dialogue), và liên kết thực thể Kinh thánh bộ truyện (Bible Entities).

## 2. Route & Màn hình
- **Route mặc định**: `/workspaces/:workspaceId/series/:seriesId/script`
- **Màn hình chính**:
  - `ScriptEditorView.tsx`: Màn hình soạn thảo kịch bản chuyên sâu toàn màn hình, hỗ trợ kiểm tra phiên bản (version compare), đề cương khối kịch bản và AI Breakdown.
  - `WriterWorkspace.tsx`: Bàn làm việc nhanh của biên kịch trong cửa sổ phân cảnh / Spread Workbench.

## 3. Thành phần (Components)
- `ScriptEditor.tsx`: Trình soạn thảo kịch bản tích hợp trong Task Editor đa vai trò.
- `components/script/`:
  - `ScriptLineItem.tsx`: Biên tập chi tiết từng dòng kịch bản (Speaker, loại thoại, nội dung, ghi chú âm thanh/hành động).
  - `BibleCharactersDrawer.tsx`: Drawer tra cứu và gán nhanh nhân vật/thực thể Bible vào dòng kịch bản.
  - `ConsistencyFindingsDrawer.tsx`: Drawer hiển thị kết quả kiểm tra nhất quán kịch bản và cuộn tới dòng thoại tương ứng.
  - `NarrativeContextDrawer.tsx`: Drawer xem mạch truyện (Story Arc) và đề cương chương (Outline).
  - `ScriptHistoryModal.tsx`: Hộp thoại lịch sử phiên bản kịch bản phân cảnh, so sánh đối chiếu diff và khôi phục revision (UC-18, UC-13).
