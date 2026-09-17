# DESIGN LANGUAGE — Main Canvas (PanelForge)
### "Manga Paper & Ink × Tangerine" — phiên bản mở rộng cho mọi màn hình bên trong `<main>`

> Tài liệu này là **hợp đồng thiết kế bắt buộc**. Mọi prompt xây UI cho từng màn hình con (Kanban, Canvas, Review, Series Bible, Dashboard...) phải đính kèm và tuân thủ tài liệu này, để dù được nhiều AI Agent khác nhau xây ở nhiều thời điểm khác nhau, các màn hình vẫn **nhìn và cảm giác như cùng một sản phẩm**.

---

## 1. Nguyên tắc cốt lõi (không thương lượng)
1. **Giấy & Mực trước, màu sắc sau.** Nền luôn là các sắc thái giấy trung tính (`paper.*`, `ink.border`); màu cam (`brand.orange`) và tím AI (`ai.violet`) chỉ dùng để **chỉ hành động hoặc trạng thái**, không dùng để trang trí.
2. **Một maker màu = một ý nghĩa duy nhất trong toàn hệ thống.** Cam luôn = hành động chính/đang active. Tím luôn = liên quan đến AI. Vàng/hổ phách luôn = cảnh báo/chờ. Đỏ luôn = quá hạn/lỗi/chặn. Xanh lá luôn = hoàn tất/an toàn. Không đảo nghĩa màu ở bất kỳ màn nào.
3. **Mono font = dữ liệu máy đọc được.** Bất cứ đâu hiển thị ID, mã chương/panel, timestamp, phần trăm, trạng thái hệ thống → dùng `font-mono`. Bất cứ đâu là nội dung sáng tác/con người viết (tên, mô tả, lời thoại) → dùng `font-sans`.
4. **Canvas là vùng làm việc, không phải trang marketing.** Mật độ thông tin cao được ưu tiên hơn khoảng trắng trang trí; nhưng nhóm thông tin phải rõ bằng surface/border, không dựa vào khoảng cách lớn.
5. **Mọi thứ AI-sinh-ra phải "tự thú".** Không có nội dung AI nào hiển thị giống hệt nội dung con người tạo — luôn có dấu hiệu thị giác tối thiểu (viền tím mảnh, badge, hoặc icon) theo đúng mục 6.4.

---

## 2. Token nền tảng (kế thừa nguyên vẹn từ Global App Shell — không được định nghĩa lại)
```
brand.orange        #F97316   — hành động chính, active state, CTA
brand.orange-hover  #EA580C
brand.orange-light  #FFF7ED   — nền nhấn nhẹ cho active/selected
brand.orange-border #FDBA74

paper.white  #FFFEFA   paper.warm  #F8F6F0
paper.gray   #F3F1EB   paper.canvas #FFFFFF

ink.black  #171717   ink.gray  #555555
ink.light  #B8B8B8    ink.border #E7E7E7

ai.violet #8B5CF6   ai.purple #6D28D9   ai.light #F3E8FF

Font: heading = Space Grotesk | body = Inter | data/mono = JetBrains Mono
Icon: Lucide, stroke-[2] mặc định, stroke-[2.2] cho icon nhấn mạnh/active
```
**Không tự thêm màu ngoài bảng này ở bất kỳ màn hình nào.** Nếu cần thêm 1 sắc thái ngữ nghĩa mới (ví dụ: một stage mới), phải suy ra từ palette đang có (ví dụ dùng `amber-500`, `emerald-600`, `sky-600` chuẩn Tailwind — xem mục 6.1) chứ không tạo hex tuỳ ý.

---

## 3. Lưới bố cục & khoảng cách (Spacing/Grid)
- Đơn vị cơ sở: **4px**, các bước dùng chuẩn: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Padding canvas ngoài cùng (bên trong `<main>`): `p-6` (24px) ở mọi màn hình — không co giãn theo từng feature.
- Khoảng cách giữa các khối chức năng cấp 1 (ví dụ: header phụ ↔ board, hoặc toolbar ↔ nội dung): `gap-6`.
- Khoảng cách trong 1 nhóm liên quan (card trong 1 cột, field trong 1 form): `gap-2` đến `gap-3`.
- Bo góc chuẩn hoá theo cấp bậc:
  - Surface lớn (panel, cột, drawer): `rounded-xl`
  - Card/thẻ nội dung: `rounded-lg`
  - Badge/pill/button nhỏ: `rounded-md` hoặc `rounded-full` (chỉ pill trạng thái/đếm dùng `rounded-full`)
- Border mặc định mọi surface: `border border-[#E7E7E7]`; hover surface tương tác: `hover:border-[#B8B8B8]`.

---

## 4. Hệ thống bề mặt & độ nổi (Surface & Elevation)
Không dùng shadow lớn kiểu Material — độ nổi thể hiện bằng **nền + viền**, đúng tinh thần "giấy chồng giấy":

| Lớp | Nền | Viền/đổ bóng | Dùng cho |
|---|---|---|---|
| Level 0 — Canvas nền | `bg-[#F3F3F3]` | không | Vùng `<main>` |
| Level 1 — Surface cơ bản | `bg-white` | `border-[#E7E7E7]` + `shadow-2xs` | Card, cột Kanban, khối form |
| Level 2 — Surface nổi | `bg-white` | `border-[#E7E7E7]` + `shadow-sm` | Toolbar sticky, header phụ của board |
| Level 3 — Overlay | `bg-white` | `shadow-lg` + backdrop mờ `bg-black/10` | Drawer, Modal, Dropdown menu |
| Nhấn active/selected | `bg-[#FFF7ED]` | `border-l-4 border-[#F97316]` (kế thừa đúng pattern nav-item active trong Shell) | Item đang chọn trong list, tab đang active |

---

## 5. Thang chữ (Typography Scale) áp dụng cho mọi canvas
| Vai trò | Font | Size/Weight | Ví dụ dùng |
|---|---|---|---|
| Tiêu đề màn hình | Space Grotesk | `text-lg font-semibold` | "Chapter 5 Pipeline" |
| Tiêu đề khối/section | Space Grotesk | `text-sm font-semibold` | Tên cột Kanban, tên panel trong Series Bible |
| Nhãn nhóm (eyebrow) | JetBrains Mono | `text-[11px] uppercase tracking-wider text-[#555555]` | "WORKSPACE", "STAGE", "STATUS" |
| Nội dung chính | Inter | `text-sm text-[#171717]` | Mô tả, lời thoại, comment |
| Meta/phụ | Inter | `text-xs text-[#555555]` | Timestamp hiển thị người-đọc ("2 giờ trước") |
| Dữ liệu máy/ID/số liệu | JetBrains Mono | `text-xs` hoặc `text-[10px]` | `Ch.5 · P.12`, `99.4%`, deadline countdown |

---

## 6. Ngôn ngữ màu theo ngữ nghĩa (Semantic Color Language)
Đây là phần **quan trọng nhất để giữ nhất quán xuyên suốt**, vì mỗi màn hình sẽ có bộ trạng thái riêng nhưng phải map vào cùng 1 hệ dưới đây.

### 6.1. Trạng thái tiến trình / stage
- Mỗi stage trong pipeline được gán **1 màu cố định theo thứ tự cầu vồng nhạt**, dùng chấm tròn nhỏ (`w-1.5 h-1.5 rounded-full`) đặt trước tên stage ở mọi nơi nó xuất hiện (Kanban, badge trên card, filter, dashboard chart):
  ```
  Script    → sky-500      Thumbnail → indigo-500
  Pencil    → slate-500    Ink       → zinc-700
  Color     → rose-400     Letter    → teal-500
  Review    → amber-500    Approved  → emerald-600
  ```
  Nếu Producer đổi tên/thêm stage, gán tuần tự từ dải màu Tailwind trung tính-ấm còn lại theo cùng độ đậm (500/600), không dùng `orange` (đã dành riêng cho hành động) và không dùng `violet/purple` (đã dành riêng cho AI).

### 6.2. Deadline / thời hạn
```
Còn hạn (> 2 ngày)   → emerald-600, nền emerald-50
Sắp đến hạn (≤ 2 ngày) → amber-600, nền amber-50   (dùng chung tông với badge "In Review" đã có ở Shell: #D97706 / #FFFBEB)
Quá hạn               → red-600, nền red-50
```

### 6.3. Trạng thái duyệt/review
```
Draft      → ink.gray, nền paper.gray
In Review  → #D97706 trên nền #FFFBEB, viền #FDE68A   (đúng pattern đã dùng ở breadcrumb Shell)
Change Requested → red-600 trên nền red-50
Approved   → emerald-600 trên nền emerald-50
Locked     → ink.black trên nền ink.border, kèm icon khoá
```

### 6.4. Ngôn ngữ thị giác cho nội dung AI-hỗ trợ (áp dụng mọi màn)
- Viền trái mảnh `border-l-2 border-[#8B5CF6]` hoặc badge pill tím nhỏ `bg-[#F3E8FF] text-[#6D28D9]` kèm icon `sparkles`.
- Badge luôn ghi rõ trạng thái duyệt: "AI Suggested", "AI Suggested · Edited", "AI Suggested · Accepted" — không bao giờ chỉ ghi chung chung "AI".
- Trạng thái engine AI (Active/Degraded/Offline) dùng lại đúng vị trí & 3-state badge đã định nghĩa ở header Shell; nếu Offline, mọi badge "AI Suggested" trên canvas phải kèm icon cảnh báo xám thay vì icon sparkles tím.

---

## 7. Thư viện pattern component dùng chung (Cross-Screen Component Library)
Tất cả các màn hình con **phải tái sử dụng** các pattern sau thay vì tự sáng tạo biến thể mới:

- **Card chuẩn**: thumbnail/icon trái → nội dung giữa (title mono nếu là ID, subtitle sans) → badge/trạng thái phải, đúng cấu trúc project-switcher card đã có trong Shell.
- **Pill/Badge đếm & trạng thái**: `inline-flex items-center px-1.5–2.5 py-0.5 rounded-full text-[10-11px] font-mono font-medium`, màu theo mục 6.
- **Avatar**: hình tròn, nền `ink.black`, chữ trắng `font-heading font-semibold`, initials 2 ký tự — dùng đồng nhất cho user thật lẫn placeholder assignee.
- **Empty state**: khung `border-2 border-dashed border-[#B8B8B8] rounded-xl`, icon trong ô vuông bo góc nền `orange-light`/viền `orange-border`, tiêu đề Space Grotesk + mô tả Inter — **đúng y hệt pattern placeholder canvas gốc**, tái dùng cho mọi trạng thái "chưa có dữ liệu" (board trống, chưa có version, chưa có comment...).
- **Loading state**: skeleton nền `paper.gray` bo góc tương ứng surface đang tải, không dùng spinner to giữa màn hình trừ khi full-page load.
- **Drawer/Side panel**: trượt từ phải, width cố định (ví dụ 420px), header có nút đóng `x`, dùng Level 3 surface.
- **Toolbar sticky**: Level 2 surface, nằm ngay dưới breadcrumb của Shell, chứa filter/search/CTA phụ của riêng màn đó.
- **Toast/Notification**: góc dưới phải, Level 3 surface, viền trái 4px theo màu ngữ nghĩa (cam = thông tin/hành động, đỏ = lỗi, xanh = thành công, tím = AI).
- **Tooltip**: nền `ink.black`, chữ trắng, `text-[11px]`, dùng cho giải thích icon khoá, badge AI, viết tắt mono.

---

## 8. Iconography
- Bộ icon duy nhất: **Lucide**, không trộn bộ icon khác.
- Kích thước chuẩn: `w-3.5 h-3.5` cho icon trong text/badge, `w-4 h-4` cho icon trong nav/button, `w-8 h-8` trở lên chỉ dùng cho icon minh hoạ trong empty-state.
- Stroke: `stroke-[2]` mặc định, `stroke-[2.2]` khi icon biểu thị trạng thái active/nhấn mạnh, `stroke-[1.8]` chỉ dùng cho icon minh hoạ lớn trong empty-state.
- Icon ngữ nghĩa cố định xuyên suốt (không đổi icon khác nghĩa ở màn khác): `sparkles` = AI, `shield-check` = provenance/audit, `lock` = khoá do dependency, `clock` = deadline, `check-circle-2` = hoàn tất/đã xác nhận, `alert-triangle` = cảnh báo.

---

## 9. Chuyển động & tương tác (Motion)
- Thời lượng chuẩn: `transition-all duration-150` cho hover/focus vi vi mô (button, card hover); `duration-200–300` cho drawer/modal mở-đóng.
- Hover surface tương tác: đổi viền trước, đổi nền sau (đúng thứ tự Shell đã dùng: `hover:border-[#B8B8B8]` cho card, `hover:bg-[#E7E7E7]/50` cho nav/list item).
- Nhấn (active/click): `active:scale-[0.98]` cho nút CTA chính, không áp dụng cho card/list item (chỉ đổi nền, không scale).
- Kéo-thả (drag): thẻ đang kéo giảm opacity còn ~60%, cột đích hiện viền cam đứt nét để chỉ vùng thả hợp lệ; nếu thả không hợp lệ (do khoá dependency/quyền), thẻ nảy về vị trí cũ kèm shake nhẹ + toast đỏ.

---

## 10. Khả năng tiếp cận (Accessibility) bắt buộc
- Không bao giờ dùng màu là kênh thông tin duy nhất: mọi badge màu phải kèm icon hoặc text.
- Tương phản chữ/nền tối thiểu theo WCAG AA cho toàn bộ text/badge — không tự ý làm nhạt màu chữ trạng thái để "đẹp hơn".
- `aria-current="page"` cho tab/nav active, `aria-live="polite"` cho toast, `aria-label` cho mọi icon-button không có text.
- Vùng có thể kéo-thả phải có phương án thao tác thay thế bằng bàn phím hoặc menu ngữ cảnh (right-click/kebab menu) để đạt yêu cầu accessibility tối thiểu.

---

## 11. Việc KHÔNG được làm ở bất kỳ màn hình con nào
- Không tạo màu, font, hoặc bo góc mới ngoài hệ token ở mục 2 & 3.
- Không dùng cam (`brand.orange`) cho bất cứ thứ gì không phải hành động chính/active state.
- Không dùng tím (`ai.*`) cho bất cứ thứ gì không liên quan đến AI.
- Không thiết kế empty-state/loading-state riêng biệt khác pattern mục 7 — mọi màn hình dùng chung 1 "giọng" khi trống/đang tải.
- Không tự đặt lại tên hoặc đổi icon ngữ nghĩa đã cố định ở mục 8.
- Không bỏ badge trạng thái duyệt AI ("Suggested/Edited/Accepted") dưới bất kỳ lý do tối giản hoá giao diện nào.
