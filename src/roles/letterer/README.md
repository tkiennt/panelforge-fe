# Role: Letterer (WorkspaceRole / TaskRole)

## 1. Mô tả
Chuyên viên chèn thoại (Letterer) chịu trách nhiệm chèn bóng thoại (speech bubbles), hiệu ứng chữ âm thanh (SFX), định kiểu font chữ (Typography Presets), và liên kết câu thoại kịch bản với bóng thoại trên bản vẽ (Script Binding).

## 2. Route & Màn hình
- **Route mặc định**: `/workspaces/{wsId}/series/{seriesId}/letterer`
- **Màn hình chính**:
  - `LetteringWorkspace.tsx`: Không gian làm việc chèn bóng thoại tương tác trên canvas tranh vẽ trong Task Editor / Letterer Desk.
  - `LettererWorkspace.tsx`: Bàn làm việc chèn chữ chuyên sâu tích hợp liên kết kịch bản (Script Binding) và căn chỉnh kiểu chữ.

## 3. Quy tắc phân loại dòng kịch bản (Script Line Classification)
Hàm phân loại duy nhất `classifyScriptLine` (`src/roles/letterer/lib/textStyle.ts`) áp dụng thống nhất toàn bộ bàn làm việc:
| Điều kiện dữ liệu | Loại phần tử (`kind`) | Nhãn UI | Hành vi thao tác |
|---|---|---|---|
| `dialogueText` có nội dung, có người nói (`speakerCharacterId` hoặc `speakerName`) | `SPEECH` (`SPEECH_BALLOON` / `THOUGHT_BALLOON`) | **Thoại** | Kéo thả được, đếm vào tiến độ |
| `dialogueText` có nội dung, **không** có người nói | `NARRATION` (`NARRATION_BOX`) | **Dẫn truyện** | Kéo thả được, đếm vào tiến độ |
| `dialogueText` bắt đầu bằng `SFX:` (không phân biệt hoa/thường) | `SFX` (`SOUND_EFFECT`) | **SFX** | Kéo thả được, tự động loại bỏ tiền tố `SFX:` khi đặt chữ |
| `dialogueText` rỗng (chỉ có `stageDirection`) | `DIRECTION` | **Chỉ dẫn** | **Không** phải chữ của Letterer; ẩn mặc định, không kéo thả được, không tính vào bộ đếm |

### Quản lý chỉ dẫn hành động (Stage Directions)
- **Ẩn mặc định**: Các dòng chỉ dẫn không xuất hiện trong danh sách dòng kéo thả để tránh nhầm lẫn.
- **Công tắc "Hiện chỉ dẫn"**: Cho phép bật xem các dòng chỉ dẫn dưới dạng chữ nghiêng, màu nhạt, không có tay nắm kéo (chỉ đọc).
- **Cảnh báo phần tử cũ**: Phần tử chữ đã đặt trước đây có nội dung là chỉ dẫn sẽ hiển thị badge cảnh báo `stage-direction-warning`: *"Nội dung là chỉ dẫn, không phải thoại"* để Letterer xem xét chỉnh sửa hoặc xoá.
- **Không bao giờ fallback**: Loại bỏ toàn bộ `|| line.stageDirection` khi tạo hoặc xem trước phần tử chữ.

## 4. Nhóm kịch bản theo Khung & Đồng bộ ngữ cảnh
- **Nhóm theo khung**: Dòng kịch bản được gom theo `panelId` thứ tự `Khung 1`, `Khung 2`... Dòng chưa gán thuộc nhóm `"Chưa gán khung"`.
- **Đồng bộ 2 chiều (Canvas ⇄ Sidebar)**:
  - Bấm vào khung trên Canvas -> tự động cuộn danh sách đến nhóm của khung đó và highlight nhóm.
  - Bấm vào header nhóm -> chọn và highlight khung đó trên Canvas (`ring-2 ring-amber-500 bg-amber-500/10`).
- **Bộ đếm tiến độ**: Hiển thị chính xác `x/y đã đặt` kèm thanh tiến độ mảnh (`placedCount / totalLetterable`), chỉ tính các dòng thoại/dẫn truyện/SFX thực tế.
- **Bộ lọc nhanh**: 3 nút chuyển nhanh `Tất cả` / `Chưa đặt` / `Khung đang chọn`.

## 5. Phân lớp ảnh nền Canvas (Background Artwork Hierarchy)
Canvas hiển thị tranh nền theo 3 cấp độ ưu tiên:
1. **Ưu tiên 1**: Ảnh hoàn thiện cả trang (`wholePageArtUrl` hoặc `backdropUrl`).
2. **Ưu tiên 2**: Ảnh hoàn thiện hoặc thumbnail mới nhất của từng khung đặt đúng toạ độ `boundingBox` của từng khung (`letterer-panels-backdrop-layer`).
3. **Ưu tiên 3**: Trang trắng sạch kèm thông báo *"Chưa có ảnh"* (`letterer-no-art-notice`).
- **Điều khiển độ đục (Opacity)**: Slider "Nền" (0–100%) điều chỉnh trực tiếp độ mờ của lớp ảnh nền canvas để Letterer dễ dàng quan sát và căn chỉnh bóng thoại.
