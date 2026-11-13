# BẢNG THEO DÕI CÔNG VIỆC NHÓM (TEAM WORKBOARD)

> Một file duy nhất cho cả 3 repo (`PanelForge_FA26SE251`, `panelforge-fe`, `panelforge-mobile`). Ai pull `panelforge-fe` về cũng biết người khác đang làm gì, đã xong gì, có đổi API hay DB không.
> Nghiệp vụ tham chiếu: [`PANELFORGE_MASTER_SPECIFICATION_V2_6.md`](PANELFORGE_MASTER_SPECIFICATION_V2_6.md) (ghi mã BR-xx, Module hoặc quyết định Q-n khi khai báo việc).

---

## 1. Cách cập nhật (bắt buộc với mọi thành viên và AI agent)

1. **Trước khi code:** `git pull` nhánh `trungkien` của `panelforge-fe`, thêm **một dòng** vào bảng §2 "Đang làm". Commit riêng và push ngay để người khác thấy:
   `docs(tracker): start <việc ngắn gọn>`
2. **Không nhận việc** đụng vào file đang có trong cột "File chính" của người khác ở §2. Hỏi người đó trước.
3. **Khi xong (đã merge vào `trungkien` của repo mình làm):** xoá dòng của mình ở §2, thêm **một dòng** lên đầu bảng §3 "Đã xong". Commit riêng:
   `docs(tracker): finish <việc ngắn gọn>`
4. **Đổi API, DTO, DB hoặc enum** mà repo khác dùng: ghi rõ ở cột "Ảnh hưởng người khác" (endpoint, trường, migration). Không ghi được thì việc chưa xong.
5. Chỉ **thêm hoặc xoá dòng của chính mình**; không sửa dòng của người khác, không sắp xếp lại bảng. Gặp conflict khi pull thì giữ cả hai dòng.
6. Làm việc ở repo khác (backend, mobile) vẫn cập nhật file này trong `panelforge-fe`, vì đây là nơi duy nhất cả nhóm cùng đọc.

**Cột "Repo":** `BE` = `PanelForge_FA26SE251` · `FE` = `panelforge-fe` · `MO` = `panelforge-mobile`.

---

## 2. Đang làm

| Người | Repo | Việc | Spec (BR / Module / Q) | Nhánh | File chính | Bắt đầu |
|---|---|---|---|---|---|---|
| DontPassAway | BE + FE | Series Bible: refactor màn hình, quyền thẩm định theo §5.1 (Writer/Editor endorse, Producer khoá, Admin không khoá), khoá Canon cho Nhân vật/Bối cảnh/Đạo cụ; workbench Writer ↔ Artist + đặc tả theo danh mục. API mới: `GET /api/series/{seriesId}/bible/entries/{entryId}/usages`; `/endorse` nhận Writer + Editor; `/request-rework` nhận Producer, Writer, Editor | Module 1, §5.1, §5.2, BR-01, BR-15 | `feature/series-bible-spec-v26` | `src/shared/features/series-bible/*`, `roles/editor/views/BibleReviewView.tsx`; BE `BibleController.cs` | 2026-11-12 |

---

## 3. Đã xong (mới nhất ở trên)

| Ngày | Người | Repo | Việc | Commit merge | Ảnh hưởng người khác (API / DB / enum) |
|---|---|---|---|---|---|
| 2026-11-12 | trungkien | FE | Đưa đặc tả V2.6 vào `docs/` và tạo bảng theo dõi này | — | Không |
