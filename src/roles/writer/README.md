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
  - `ScriptBlockEditor.tsx`: Danh sách khối kịch bản có hỗ trợ kéo thả và thêm mới.
  - `ScriptBlockItem.tsx`: Biên tập chi tiết từng khối kịch bản (loại khối, nhân vật, nội dung, AI prompt và Bible link).
  - `ScriptOutline.tsx`: Cây cấu trúc đề cương phân cảnh / khối kịch bản.
  - `SpeakerAutocomplete.tsx`: Gợi ý tự động tên nhân vật từ danh mục Bible.
  - `BibleLinkPopover.tsx`: Popover xem nhanh và gán liên kết thực thể Bible vào câu thoại/hành động.
  - `AIBreakdownDiff.tsx`: Xem và đối chiếu so sánh kết quả phân rã kịch bản từ AI.
  - `VersionCompareView.tsx`: So sánh đối chiếu kịch bản giữa các bản sửa đổi (diff revisions).
