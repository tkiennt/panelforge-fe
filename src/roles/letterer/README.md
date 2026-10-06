# Role: Letterer (WorkspaceRole / TaskRole)

## 1. Mô tả
Chuyên viên chèn thoại (Letterer) chịu trách nhiệm chèn bóng thoại (speech bubbles), hiệu ứng chữ âm thanh (SFX), định kiểu font chữ (Typography Presets), và liên kết câu thoại kịch bản với bóng thoại trên bản vẽ (Script Binding).

## 2. Route & Màn hình
- **Route mặc định**: `canvas` (tại Task Editor khi xử lý tác vụ Lettering)
- **Màn hình chính**:
  - `LetteringWorkspace.tsx`: Không gian làm việc chèn bóng thoại tương tác trên canvas tranh vẽ trong Task Editor.
  - `LettererWorkspace.tsx`: Bàn làm việc chèn chữ chuyên sâu tích hợp liên kết kịch bản (Script Binding) và căn chỉnh kiểu chữ.
