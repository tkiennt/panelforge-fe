# Tài liệu Frontend

> **Đặc tả nghiệp vụ, kế hoạch, quy chuẩn UI: chỉ đọc tại `panelforge-hub/docs/`.** Repo này không giữ tài liệu nghiệp vụ hay plan để tránh lệch với bản gốc.

| Tài liệu | Nội dung |
| :--- | :--- |
| [`PANELFORGE_MASTER_SPECIFICATION_V2_6.md`](../../panelforge-hub/docs/V2.6/PANELFORGE_MASTER_SPECIFICATION_V2_6.md) | Đặc tả nghiệp vụ dùng chung BE/FE/Mobile; nhật ký quyết định ở đầu file |
| [`plans/`](../../panelforge-hub/docs/note/plans/) | Kế hoạch theo module (SCR, BIB, ASG, ART, REV, REL, RDR, UIQ) |
| [`DESIGN_RULES.md`](../../panelforge-hub/docs/spec/DESIGN_RULES.md) | Quy chuẩn thiết kế giao diện |
| [`TEAM_WORKBOARD.md`](../../panelforge-hub/docs/tracking/TEAM_WORKBOARD.md) | Ai đang làm gì; cập nhật khi bắt đầu và khi xong việc |
| [`PRODUCT.md`](../PRODUCT.md) | Định vị sản phẩm và ngôn ngữ thị giác |
| [`CLAUDE.md`](../CLAUDE.md) | Quy ước code và kiểm thử của repo |

## Tài liệu theo vai trò trong code

Mỗi thư mục vai trò mô tả màn hình **đang có trong code** (không phải đặc tả):

| Vai trò | README |
| :--- | :--- |
| Tổng quan, RBAC | [src/README.md](../src/README.md) |
| Dùng chung | [src/shared/README.md](../src/shared/README.md) |
| Admin · Artist · Editor · Guest · Letterer · Producer · Publisher · Reader · Writer | `src/roles/<vai trò>/README.md` |

Khi đổi token UI, luồng màn hình, workspace theo vai trò hoặc component dùng chung: cập nhật README vai trò tương ứng và `panelforge-hub/docs/spec/DESIGN_RULES.md` trong cùng thay đổi.
