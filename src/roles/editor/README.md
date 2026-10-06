# Role: Editor (WorkspaceRole / TaskRole)

## 1. Mô tả
Biên tập viên (Editor) chịu trách nhiệm kiểm soát chất lượng bản thảo truyện tranh, đánh giá tại các cổng phê duyệt (Approval Gates), ghim chú thích góp ý trực tiếp trên trang tranh (Annotations), và kiểm tra tính nhất quán liên tục (AI Continuity Checks).

## 2. Route & Màn hình
- **Route mặc định**: `review` (tại `/workspaces/:workspaceId/review/:taskId`)
- **Màn hình chính**:
  - `ReviewView.tsx`: Màn hình kiểm duyệt bản thảo toàn diện kèm danh sách phát hiện, phê duyệt hoặc từ chối chuyển tiếp giai đoạn.
  - `EditorWorkspace.tsx`: Bàn làm việc biên tập nhanh trong Spread Workbench kèm cảnh báo nhất quán từ AI.
