# 🎨 PANELFORGE UI/UX DESIGN SYSTEM & REFACTOR RULES (`DESIGN_RULES.md`)

> **Purpose:** This document serves as the mandatory, single source of truth ("UI Constitution") for all AI Agents and Developers when building or refactoring interfaces in `panelforge-fe`. Every screen across `src/app/`, `src/shared/`, and `src/roles/*` must strictly follow these rules to guarantee visual consistency, clean hierarchy, accessibility, and seamless navigation.

---

## 1. CORE PRINCIPLES & COLOR TOKENS ("WARM EDITORIAL STUDIO")

PanelForge uses a tactile **Manga Paper & Ink / Warm Stone** foundation paired with **Tangerine Orange** accents and deterministic semantic colors to evoke a professional editorial and manga studio workspace. Avoid mixing cold blue-grays (`gray-*` / `slate-*`) with warm `stone-*` tokens on the same screen.

### 1.1. Core Principles
1. **Paper & Ink Foundation**: The background is rooted in tactile manga paper (`#FAF9F5`, `#FAF8F5`) and rich ink borders (`#171717`, `#E7E7E7`, `stone-200`). Warm and studio-grade editorial aesthetics over cold flat designs.
2. **Deterministic Color Semantics**: 
   - One color marker = exactly one meaning across the entire system.
   - Orange always = primary CTA / active highlight.
   - Violet always = AI assistance / provenance.
   - Never invert or mix semantic meanings.
3. **Canvas is a Workspace, Not Marketing**: Prioritize information clarity, clean surfaces, and structured boundaries over wasteful empty space.
4. **AI-Generated Elements Must Be Clear**: Every AI-generated or AI-suggested asset must feature visual provenance (border accent, purple badge, or sparkles icon).

### 1.2. Surfaces & Backgrounds
- **App Background (Main Canvas / Page background):** `bg-[#FAF9F5]` or `bg-stone-50`
- **Card / Panel Surface (Primary containers, workbenches):** `bg-white`
- **Muted Surface (Empty states, secondary backgrounds, progress tracks):** `bg-stone-100` (`#F5F5F4` / `#F4F1EA`)
- **Canvas Dark Surface (Artist / Letterer / Review viewport):** `bg-stone-900` or `bg-neutral-900`
- **Elevation Levels (Paper-over-Paper):**
  - **Level 0 (Canvas Base):** `bg-[#FAF9F5]`
  - **Level 1 (Cards, Workspaces, Sections):** `bg-white border border-stone-200/80 rounded-xl shadow-xs`
  - **Level 2 (Toolbars, Sticky Headers):** `bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-xs`
  - **Level 3 (Modals, Drawers, Overlays):** `bg-white border border-stone-200 rounded-2xl shadow-xl backdrop-blur-sm`
  - **Active Selection Highlight:** `bg-orange-50 text-orange-700 border-l-4 border-orange-500`

### 1.3. Standard Borders
- **Default Card Border:** `border border-stone-200/80` (or `border-[#E7E7E7]`)
- **Subtle Divider:** `border-stone-100`
- **Interactive Hover / Focus Border:** `hover:border-orange-300` or `focus:border-orange-500`

### 1.4. Typography Colors
- **Primary Text (Headings, core content):** `text-stone-900` (`#171717`)
- **Secondary Text (Subtitles, descriptions, field labels):** `text-stone-600` (`#555555`)
- **Muted / Helper Text (Captions, timestamps, hints):** `text-stone-500` *(NEVER use `text-stone-300` or lighter for readable text on light backgrounds due to poor contrast)*

### 1.5. Semantic & Domain Status Colors ("Artisan Ink Pigments")
All statuses for `AssignmentStatus`, `StageProgress`, `ChapterStatus`, `ChangeRequest`, and `ConsistencyFinding` must use these exact semantic mappings:
- **Brand / Creator Primary CTA (Mực Cam Studio):**
  - Utility Class: `.btn-cta-primary`
  - Inline Tokens: `bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-soft-sm rounded-full`
  - Soft Tint / Active Tab: `bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100`
- **AI Action / Consistency / Series Bible Lore (Mực Tím Trí Tuệ):**
  - Utility Class: `.btn-cta-ai`
  - Inline Tokens: `bg-violet-600 hover:bg-violet-700 text-white shadow-soft-sm rounded-full`
  - Soft Badge / AI Pill: `bg-violet-50 text-violet-800 border border-violet-200`
  - AI Suggestion Border: `border-l-2 border-violet-500`
- **Approved / Verified / Resolved / Completed / Published (Mực Ngọc Hoàn Tất):**
  - Utility Class: `.btn-cta-success`
  - Inline Tokens: `bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft-sm rounded-full`
  - Badge: `bg-emerald-50 text-emerald-800 border border-emerald-200`
  - Artwork Annotation Bounding Box (`Resolved/Verified`): Green `#10B981` (`border-emerald-500 bg-emerald-500/15`)
- **InReview / Warning / Submitted / Approaching Deadline (≤ 2 days) (Mực Hổ Phách):**
  - Utility Class: `.btn-cta-warning`
  - Inline Tokens: `bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-full`
  - Badge: `bg-amber-50 text-amber-800 border border-amber-200`
- **Blocking Error / Rejected / ReworkRequired / Danger / Delete (Mực Đỏ Chặn / Sửa Lại):**
  - Utility Class: `.btn-cta-danger`
  - Inline Tokens: `border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-full` (hoặc `bg-rose-600 hover:bg-rose-700 text-white` khi xác nhận xóa vĩnh viễn)
  - Badge: `bg-rose-50 text-rose-800 border border-rose-200`
  - Artwork Annotation Bounding Box (`Open`): Red `#EF4444` (`border-red-500 bg-red-500/15`)
- **InProgress / Info / Active Stage (Mực Lam Tiến Độ):**
  - Inline Tokens: `bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded-full`
  - Badge: `bg-blue-50 text-blue-800 border border-blue-200`
- **Neutral / Secondary Action (Mực Tro Yên Tĩnh):**
  - Utility Class: `.btn-cta-secondary`
  - Inline Tokens: `bg-white hover:bg-[#F5F5F4] text-[#292524] border border-[#E7E5E4] rounded-full shadow-soft-sm`
  - Badge/Track: `bg-stone-100 text-stone-600 border border-stone-200`

---

## 2. TYPOGRAPHY & ICONOGRAPHY HIERARCHY

**⛔ STRICT PROHIBITION:** Never use micro font sizes such as `text-[9px]`, `text-[10px]`, or `text-[11px]` for readable UI text. The minimum allowed font size across the entire application is `text-xs` (`12px`).

### 2.1. Font Families
- **Headings / Studio Brand:** `font-serif` (`Playfair Display`, Georgia, serif) with `lining-nums`
- **Body / Interface:** `font-sans` (`Plus Jakarta Sans`, Inter, sans-serif)
- **Data / Codes / Panel IDs / Metrics / Timestamps:** `font-mono` (`JetBrains Mono`, monospace)

### 2.2. Typography Hierarchy Table
| Level | Target Element | Standard Tailwind Classes |
| :--- | :--- | :--- |
| **Page Title (H1)** | Main screen header (Studio Name, Series Title) | `text-2xl font-serif font-bold text-stone-900 tracking-tight` |
| **Section Title (H2)** | Major section headers (Series List, Pipeline, Bible) | `text-lg font-bold text-stone-900` |
| **Card Title (H3)** | Series Card title, Chapter title, Modal title | `text-base font-bold text-stone-900` (or `text-xl font-serif font-bold` for Series Cards) |
| **Card Metric / KPI** | Key numeric metrics (Storage GB, Sessions, %) | `text-lg font-mono font-bold text-stone-900` |
| **Body Text** | Script lines, review comments, descriptions | `text-sm text-stone-700 leading-relaxed` |
| **Label / Table Header** | Input labels, column headers, KPI card titles | `text-sm font-semibold text-stone-800` |
| **Helper / Subtext** | Card footnotes, timestamps, secondary metadata | `text-xs text-stone-500 leading-normal` |
| **Badge / Pill** | Status tags, genre (`GENERAL`), `Chưa cấp quota` | `text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap` |

### 2.3. Iconography Guidelines
- **Icon Family:** **Lucide Icons** exclusively. Do not mix with FontAwesome or other icon libraries.
- **Sizes:**
  - `w-3.5 h-3.5` inside inline text, badges, and small status pills.
  - `w-4 h-4` inside navigation bars, standard buttons, and input attachments.
  - `w-8 h-8` or larger only for empty state illustrations.
- **Semantic Icons:** `Sparkles` = AI, `ShieldCheck` = provenance/audit, `Lock` = locked dependency, `Clock` = deadline, `CheckCircle2` = completed/verified, `AlertTriangle` = warning/error.

---

## 3. LAYOUT, SPACING & CONTAINER RULES

### 3.1. No Double Container Boxing
- **Incorrect:** Wrapping a grid of cards inside a heavy white outer container (`bg-white border rounded-2xl p-6`) and then rendering bordered white cards inside it. This wastes horizontal space and creates visual clutter.
- **Correct:** Place the `Section Header` directly on the page background (`bg-[#FAF9F5]`) and render the card grid (`grid gap-6`) directly underneath.

### 3.2. Equal Height Grid Cards & Balanced Whitespace
- Every card grid (such as the 4 Quota/Usage cards or the 3-column Series grid) must enforce equal card heights:
  - Grid Container: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch` (or `lg:grid-cols-3 gap-6` for Series cards).
  - Individual Card: `flex flex-col justify-between h-full bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs hover:shadow-md transition-all`.
- Keep top headers, middle metrics/progress bars, and bottom helper text aligned across all cards in a row. Avoid cramming long paragraphs into a single KPI card.

### 3.3. Progress Bar Guard Rule
- Every progress bar (Storage Quota, AI Token Quota, Stage Progress) must safely guard against zero division:
  ```ts
  const safePercent = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
  ```
  When `safePercent === 0` (e.g., `0.0 / 0.0 GB`), the inner fill bar MUST have `style={{ width: '0%' }}` so only the gray track (`bg-stone-100`) is visible. Never render a 100% full orange/red bar when usage is 0%.

### 3.4. Standard 3-Pane Studio Workbench Layout
Applies to `ScriptEditorView`, `ArtistDeskView`, `LetteringWorkspace`, and `ReviewView`:
- **Viewport Container:** `h-[calc(100vh-4rem)] flex overflow-hidden bg-stone-50`.
- **Left Pane (Structure Tree / Scene List / Tool Palette):** `w-64` or `w-72` `shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-y-auto`.
- **Center Pane (Main Canvas / Script Editor / Diff Viewport):** `flex-1 relative overflow-auto flex flex-col`. Floating canvas toolbars (Zoom, Pan, Mode Switcher) must use `backdrop-blur-md bg-white/90 border border-stone-200 shadow-sm rounded-lg px-3 py-1.5`.
- **Right Pane (Inspector / Properties / Bible Reference / Consistency Findings / Change Requests):** `w-80` or `w-96` `shrink-0 border-l border-stone-200 bg-white flex flex-col overflow-y-auto`.

---

## 4. SHARED COMPONENT PATTERNS

- **Standard Card:** Header with title and badge, body section, footer with action buttons.
- **Empty States:** Border dashed `border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col items-center justify-center text-center`, warm orange icon container (`bg-orange-50 text-orange-600 p-3 rounded-xl`), `font-serif` title, and clear action CTA.
- **Loading States:** Skeleton pulse with `bg-stone-200/70 rounded-md animate-pulse`, matching the target surface geometry. Avoid full-screen blocking spinners except for page transitions.
- **Drawers / Modals:** Level 3 surface with backdrop blur, fixed right slide-in (e.g., `w-[420px]`), close button in top right, keyboard `Esc` listener.
- **Toasts / Notifications:** Bottom right position, border-l-4 matching semantic status (orange, green, amber, red, purple).
- **Tooltips:** `bg-stone-900 text-white text-xs rounded-md px-2 py-1 shadow-md`.

---

## 5. ROLE-AWARE UI & NAVIGATION FLOW RULES

### 5.1. Dynamic Role Copywriting (Never Hardcode Producer Copy for Other Roles)
Shared screens (such as the Studio Overview / Series Selection screen) must inspect the user's active `WorkspaceRole` and render appropriate descriptions and primary CTA labels:
- **PRODUCER:** "Producer Desk: Manage series, production pipelines, assignments, and studio quotas." → Primary Series CTA: "Manage Series" (Quản Lý Bộ Truyện)
- **EDITOR:** "Editor Desk: Quality control, stage gate reviews, version comparison, and consistency checks." → Primary Series CTA: "Manage Chapters (Review)" (Quản Lý Chương (Duyệt))
- **WRITER:** "Writer Desk: Author structured scripts, story arcs, chapter outlines, and Series Bible links." → Primary Series CTA: "Open Script Workspace" (Soạn Thảo Kịch Bản)
- **ARTIST:** "Artist Desk: Design page layouts, frame templates, panel artwork, and canvas layers." → Primary Series CTA: "Open Artist Desk" (Vào Bàn Vẽ)
- **LETTERER:** "Letterer Desk: Place dialogue balloons, SFX, and synchronize script lines." → Primary Series CTA: "Open Lettering Workspace" (Vào Bàn Chèn Chữ)

### 5.2. Strict 4-Step Hierarchical Navigation Flow
- **Step 1:** `/workspaces` (Select Studio Workspace) ➔ **Step 2:** `/workspace/:wId` (Studio Overview & Series Selection) ➔ **Step 3:** Select Chapter / Task inside Series ➔ **Step 4:** Role-Specific Workbench.
- **Header Breadcrumbs** must accurately reflect the hierarchy (`Workspaces` / `<Studio Name>` / `<Series Name>` / `<Chapter Name>`) and clicking any segment must navigate directly to that level.
- **Sidebar Selectors** (Studio switcher & Series dropdown) must stay 100% synchronized with `activeWorkspaceId` and `activeSeriesId`.

---

## 6. ACCESSIBILITY & MOTION (WCAG AA)

- **Color is never the sole indicator:** All badges and status markers must include text labels or icons in addition to color.
- **Contrast Ratios:** Minimum 4.5:1 for body and label text against light backgrounds.
- **Transitions:** `transition-all duration-150` for micro-interactions (buttons, hovers); `duration-200` to `300` for drawers and modals.
- **Scale on Click:** `active:scale-[0.98]` on primary CTA buttons.

---

## 7. TECHNICAL CONSTRAINTS & QUALITY GATES
- **Preserve 100% of `data-testid` Attributes & API Contracts:** Never delete or rename existing `data-testid` attributes required by unit and integration tests.
- **Enforce ESLint Role Boundaries:** Files inside `src/roles/<role>/` may only import from their own role folder or `src/shared/`. Cross-role imports are strictly forbidden.
- **Mandatory Verification After Every Change Batch:** Always run `npm run quality` (`tsc --noEmit`, `eslint --max-warnings 0`, `vitest run`) and `npm run build` with 0 errors and 0 warnings.
