# Role: Editor (WorkspaceRole)

## 1. Mô tả
Biên tập viên kiểm soát chất lượng tại các cổng duyệt (CF3): đọc bản nộp, gắn nhận xét vào đúng phiên bản và vùng, xác minh yêu cầu sửa, phân loại phát hiện nhất quán và quyết định trả bài hoặc duyệt. Editor không có công cụ sáng tác (không sửa câu chữ của Writer, không vẽ).

## 2. Route & Màn hình

| Route (dưới `/workspaces/:workspaceId/series/:seriesId`) | View | Việc |
|---|---|---|
| `editor/desk` | `EditorDeskView` | Hàng đợi bài chờ duyệt của cả Series, lọc Gate 1 / Gate 2 |
| `chapters/:chapterId/script/review?assignmentId=` | `ScriptReviewView` | Duyệt kịch bản: nhận xét theo dòng/phân cảnh |
| `chapters/:chapterId/review/:taskId` | `ReviewView` | Duyệt tranh của một việc Page/Panel; việc Review cả chương chuyển sang `ChapterReviewView` |
| `editor/bible` | `BibleReviewView` | Duyệt thiết kế Series Bible: Artist nộp concept → Editor xác nhận (`WriterEndorsed`) hoặc yêu cầu vẽ lại (`ReworkRequired`); Producer khoá canon |

## 3. Bố cục chung của màn duyệt
Bản nộp ở giữa, cột phải có hai tab **Nhận xét** / **Kiểm tra**, thanh quyết định ở đáy cột phải.

- **Nhận xét = yêu cầu sửa.** Nhận xét (dòng kịch bản, hoặc vùng khoanh trên tranh) được giữ làm nháp theo từng lần nộp và chỉ gửi khi trả bài; mỗi nhận xét thành một `ChangeRequest`.
- **Trả bài** bắt buộc có nhận xét chung (BR-06). **Duyệt** bị khoá khi còn nháp chưa gửi hoặc còn yêu cầu sửa `Open`/`Resolved`; lý do hiện bằng chữ.
- Yêu cầu sửa `Resolved`: **Đạt** (Verified) hoặc **Chưa đạt** (mở lại, bắt buộc lý do). Yêu cầu `Open`: **Bỏ yêu cầu** (Rejected, bắt buộc lý do).
- Phát hiện nhất quán: Bỏ qua / Cần làm rõ bắt buộc ghi lý do (BR-21). Lý do nhập tại chỗ (`review-shared/ReasonForm`), không dùng `window.prompt`.
- Người nhận việc không duyệt được việc của mình; backend chặn (403), giao diện chỉ báo lý do.

## 4. Cấu trúc thư mục
- `views/review-shared/`: trạng thái yêu cầu sửa, lưu nháp theo lần nộp, `ReasonForm`, `DecisionBar`.
- `views/script-review/`: bản thảo đọc theo cảnh, tab Nhận xét, tab Kiểm tra (Bible Gate, nhất quán, đóng băng của Producer).
- `views/artwork-review/`: `useSubmissionArtworks` (ghép trang từ ảnh Panel, lớp chữ của việc Letter, link ảnh ngắn hạn BR-16), canvas khoanh vùng, tab Nhận xét, tab Nhất quán hình ảnh.
