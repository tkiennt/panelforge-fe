# Role: Writer (WorkspaceRole / TaskRole)

## 1. Mô tả

Biên kịch (Writer) chịu trách nhiệm sáng tác kịch bản truyện tranh (Graphic Novel Full Script), phân đoạn phân cảnh (scenes), gõ liền mạch trên bàn viết Screenplay Flow Editor, liên kết thực thể Series Bible, tiếp nhận góp ý từ Editor, và quản lý các phiên bản kịch bản (Script Versions).

## 2. Route & Màn hình

- **Route mặc định**: `/workspaces/:workspaceId/series/:seriesId/script`
- **Màn hình chính**:
  - `ScriptEditorView.tsx`: Bàn viết kịch bản chuẩn Stitch `writer.html`:
    - **Header**: Thanh điều hướng phân cấp (Workspace / Series / Script Editor), thông tin Chương hiện tại, trạng thái quy trình (Đang viết → Chờ duyệt → Đã chốt), nút hành động theo vai trò (Gửi duyệt / Bắt đầu sản xuất).
    - **Thanh công cụ kịch bản (Top Toolbar)**:
      - Nút mở/thu gọn Phân cảnh (`#btn-toggle-scene-outline`): bật/tắt ngăn kéo phân cảnh bên trái (`ScriptScenesDrawer`).
      - Tiêu đề chương / kịch bản và nhãn trạng thái lưu (`Đã lưu` / `Chưa lưu (Ctrl+S)`).
      - Nút Lưu nhanh (`Ctrl+S`).
      - Cụm tab mở Bảng công cụ Biên kịch bên phải: **Series Bible** (`ScriptRightBiblePanel`), **Góp ý** (`ScriptReviewSidePanel`), **Version** (`ScriptVersionsDrawer`).
    - **Cột phân cảnh bên trái (`ScriptScenesDrawer`)**: Danh sách phân cảnh, ghi chú phạm vi panel, chọn cảnh, cấu hình / đổi tên / xoá cảnh (Producer có quyền xoá chương). Có thể thu gọn thành thanh sidetab 44px (`#scene-collapsed-tab`).
    - **Bàn viết trung tâm (`ScreenplayFlowEditor`)**: Bàn viết Graphic Novel Full Script hiện đại trên nền giấy trắng:
      - Chia Trang (`TRANG N - PANEL: K`) và Panel (`PANEL N`).
      - Gõ phím liền mạch: `Enter` xuống dòng kế tiếp, `Tab` đổi sang nhân vật / `( )` sắc thái, `Ctrl+1..8` đổi loại dòng, `Ctrl+S` lưu kịch bản.
      - Nút nổi Trợ lý kịch bản AI (`#btn-ai-script-assistant`): Popover gợi ý nhanh theo ngữ cảnh (thoại đối kháng, SFX cao trào, phản xạ nhân vật).
    - **Bảng điều khiển bên phải (Right Drawers)**:
      - **Series Bible (`ScriptRightBiblePanel`)**: Danh sách thực thể Series Bible với 2 tab "Trong chương" (Chapter Cast) và "Toàn bộ" (All Bible entries). Hỗ trợ tra cứu nhanh, xem tag phân loại (Nhân vật, Địa điểm, Đạo cụ...), liên kết trực tiếp tới Series Bible vault.
      - **Góp ý biên tập (`ScriptReviewSidePanel`)**: Danh sách góp ý từ Editor theo từng dòng kịch bản, cho phép Writer đánh dấu đã giải quyết (Resolve) và nhảy đến dòng tương ứng.
      - **Lịch sử phiên bản (`ScriptVersionsDrawer`)**: Danh sách các phiên bản kịch bản (commits/pushes), so sánh diff chi tiết và khôi phục revision (UC-18, UC-13).
  - `WriterWorkspace.tsx`: Bàn làm việc của biên kịch trong cửa sổ phân cảnh / Spread Workbench.

## 3. Thành phần (Components)

- `src/roles/writer/components/script/`:
  - `ScriptScenesDrawer.tsx`: Ngăn kéo danh sách phân cảnh chuẩn Stitch.
  - `ScriptRightBiblePanel.tsx`: Bảng Series Bible bên phải chuẩn Stitch `writer.html` (tab "Trong chương" & "Toàn bộ", liên kết Series Bible).
  - `ScriptReviewSidePanel.tsx`: Bảng góp ý biên tập và phản hồi kịch bản từ Editor.
  - `ScriptVersionsDrawer.tsx`: Ngăn kéo quản lý lịch sử phiên bản kịch bản và khôi phục revision.
  - `useScriptDrawers.ts`: Hook quản lý trạng thái mở/đóng các drawer (trái: `scenes`; phải: `bible`, `comments`, `versions`).
  - `flow/`:
    - `ScreenplayFlowEditor.tsx`: Bàn viết kịch bản Graphic Novel với TipTap engine.
    - `grammar/scriptGrammar.ts`: Văn phạm các khối kịch bản Graphic Novel.
    - `nodes/ScriptLineBlockNode.ts`: Các node dòng kịch bản TipTap (Page, Panel, Action, Character, Dialogue, SFX...).
    - `scriptFlowAdapter.ts`: Bộ chuyển đổi dữ liệu giữa tài liệu TipTap và API Backend.
    - `BibleRefFloatingMenu.tsx`: Menu nổi tham chiếu Series Bible trong bàn viết.
