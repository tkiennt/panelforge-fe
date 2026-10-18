# Kế Hoạch Triển Khai: Refactor Toàn Diện UI Trang Script (Kịch Bản) Trên Mọi Roles

## 1. Mục Tiêu & Phạm Vi
- **Mục tiêu:** Nâng cấp và chuẩn hóa toàn diện giao diện trang Script (`/workspaces/:workspaceId/series/:seriesId/script`) dùng chung cho tất cả các vai trò (Writer, Producer, Editor, Artist, Letterer,...).
- **Nguyên tắc thiết kế (Quiet Editorial Studio & Artisan Ink Pigments):**
  - **Typography:** Loại bỏ triệt để các cỡ chữ siêu nhỏ vi phạm quy tắc `< 12px` (`text-[9px]`, `text-[10px]`, `text-[11px]`). Đưa về hệ chuẩn `text-xs` (12px), `text-sm` (14px), `text-base` (16px), tiêu đề `text-lg`/`text-xl`. Sử dụng `font-mono text-xs` cho các thông số kỹ thuật (thời lượng, số dòng thoại, cảnh số,...).
  - **Màu sắc nghệ nhân:**
    - Cam Studio (`#EA580C`, `text-orange-600`, `bg-orange-50`): Nhấn hành động chính (Lưu, Thêm cảnh, Thêm dòng thoại, Cảnh đang chọn).
    - Tím Iris (`#7C3AED`, `text-violet-600`, `bg-violet-50`): Tác vụ AI và Kiểm tra nhất quán (Consistency Check).
    - Hổ phách Amber (`#D97706`, `text-amber-700`, `bg-amber-50`): Cảnh báo xung đột 409, phân cảnh nháp/đang chỉnh sửa.
    - Ngọc lục bảo Emerald (`#059669`, `text-emerald-700`, `bg-emerald-50`): Trạng thái hoàn thành, đã duyệt.
    - Xám tro Muted Slate (`bg-stone-50`, `border-stone-200`, `text-stone-600`): Cấu trúc nền biên tập, thẻ thông tin phụ.
  - **Khoảng cách & Canh lề (Spacing & Alignment):** Căn chỉnh đồng đều padding thanh toolbar, rail điều hướng cảnh (`w-[280px]`), panel soạn thảo trung tâm (`p-4 md:p-6`) và các drawer/modal.
  - **Thẻ (Cards) & Phân cấp (Hierarchy):** Card phân cảnh bên trái rõ ràng, card dòng thoại kịch bản (`ScriptLineItem`) phân biệt trực quan giữa Lời thoại (Dialogue), Hành động/Chỉ dẫn (Action/Parenthetical), Ghi chú âm thanh (SFX).

---

## 2. Các File Trọng Tâm Đã Refactor
1. `src/roles/writer/views/ScriptEditorView.tsx` - Giao diện chính của màn hình Script.
2. `src/roles/writer/components/script/ScriptLineItem.tsx` - Từng dòng thoại/hành động kịch bản.
3. `src/roles/writer/components/script/ScriptHistoryModal.tsx` - Modal xem và so sánh lịch sử phiên bản kịch bản.
4. `src/roles/writer/components/script/NarrativeContextDrawer.tsx` - Drawer bối cảnh & cốt truyện tập/series.
5. `src/roles/writer/components/script/ConsistencyFindingsDrawer.tsx` - Drawer kết quả rà soát mâu thuẫn cốt truyện/nhân vật.
6. `src/roles/writer/components/script/BibleCharactersDrawer.tsx` - Drawer tra cứu nhân vật Bible.
7. `src/roles/writer/components/script/AIBreakdownDiff.tsx` - Drawer/Modal so sánh phân rã kịch bản AI.
8. `src/roles/writer/components/script/BibleLinkPopover.tsx` - Popover tra cứu nhanh Bible Entry.
9. `src/roles/writer/components/script/SpeakerAutocomplete.tsx` - Autocomplete nhân vật người nói.
10. `src/roles/writer/components/ScriptEditor.tsx` - Component editor phụ trợ.

---

## 3. Lộ Trình Triển Khai Đã Hoàn Thành (100%)

- [x] **Giai đoạn 1:** Khảo sát và Chuẩn hóa Header, Toolbar & Status Banners trong `ScriptEditorView.tsx`.
  - [x] Loại bỏ toàn bộ `text-[9px]`, `text-[10px]`, `text-[11px]` trong header, counter, badge.
  - [x] Đồng bộ hóa các nút công cụ: Lưu kịch bản, Phân cảnh AI, Đề cương truyện, Rà soát nhất quán, Nhân vật Bible.
  - [x] Nâng cấp banner cảnh báo (Chế độ chỉ đọc, Lỗi xung đột 409, Đang sản xuất).

- [x] **Giai đoạn 2:** Refactor Cột Điều Hướng Phân Cảnh (Left Scene Rail) trong `ScriptEditorView.tsx`.
  - [x] Tối ưu hóa card phân cảnh: Viền, nền active/inactive, thời lượng ước tính, số câu thoại.
  - [x] Nâng cấp thanh tìm kiếm phân cảnh và nút thêm phân cảnh mới.

- [x] **Giai đoạn 3:** Refactor Vùng Soạn Thảo Trung Tâm & `ScriptLineItem.tsx`.
  - [x] Tiêu đề phân cảnh, nút thêm dòng thoại, nút phân tích tự động.
  - [x] `ScriptLineItem`: Tinh chỉnh avatar/badge nhân vật, khung thoại, ghi chú diễn xuất, các nút thao tác nhanh (sửa, xóa, di chuyển).

- [x] **Giai đoạn 4:** Refactor Drawers & Modals Đi Kèm.
  - [x] `ScriptHistoryModal.tsx`: Bảng danh sách phiên bản, badge thay đổi, diff xem trước.
  - [x] `NarrativeContextDrawer.tsx`, `ConsistencyFindingsDrawer.tsx`, `BibleCharactersDrawer.tsx`: Đảm bảo typography >= 12px, spacing thoáng đãng, phân cấp rõ ràng.
  - [x] Modals thêm/sửa Scene và Script Line trong `ScriptEditorView.tsx`.

- [x] **Giai đoạn 5:** Kiểm Tra Biên Dịch & Nghiệm Thu.
  - [x] Chạy `npx tsc --noEmit` kiểm tra tính toàn vẹn cú pháp và kiểu dữ liệu (Passed 100%, exit code 0).
  - [x] Di chuyển kế hoạch từ `ongoing/` sang `completed/` và cập nhật `docs/README.md`.
