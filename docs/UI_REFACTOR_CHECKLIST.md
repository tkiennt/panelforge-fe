# ✅ PANELFORGE UI REFACTOR & SYNCHRONIZATION CHECKLIST (`UI_REFACTOR_CHECKLIST.md`)

> **Instructions for AI Agent:** Before modifying any UI component, read `DESIGN_RULES.md`. Execute tasks phase-by-phase, run `npm run quality` after each batch, and mark completed items with `[x]`.

---

## PHASE 1: STRUCTURAL CONSOLIDATION & DUPLICATE REMOVAL
- [x] **1.1. Remove Root-Level Legacy Files:**
  - [x] Delete `App_old.tsx`, `App_commit.tsx`, and `GlobalAppShell.html` after verifying zero active imports.
- [x] **1.2. Consolidate Duplicated Role Workspaces (4 Overlapping Locations):**
  - [x] Keep the canonical API-connected views inside `src/roles/{writer,artist,letterer,editor}/views/`.
  - [x] Merge or remove redundant duplicates in `components/modals/roles/*Workspace.tsx` and `components/task-editor/*`.
- [x] **1.3. Consolidate Member & Pipeline Views:**
  - [x] Merge `MembersRolesView.tsx`, `ProjectMembersView.tsx`, and `SeriesMembersView.tsx` into a single canonical `src/roles/producer/views/MembersRolesView.tsx` (MVP manages members at the Workspace level, not `SeriesMember`).
  - [x] Remove orphaned `ProductionPipelineView.tsx` and standardize on `src/shared/features/pipeline-board/KanbanBoard.tsx`.
- [x] **1.4. Clean Up Residual Mock Data Imports:**
  - [x] Replace or remove references to `src/data/mock*.ts` inside `AILayoutModal`, `BibleReferencePanel`, `AIBreakdownDiff`, and `ScriptOutline`.

---

## PHASE 2: APPSHELL & END-TO-END NAVIGATION FLOW SYNCHRONIZATION
- [x] **2.1. Centralize Role Manifest & Routes:**
  - [x] Create/verify `src/roles/roles.ts` (`ROLE_MANIFEST`) and `src/app/routes.tsx`.
  - [x] Fix post-workspace selection routing: Selecting a Workspace from `/workspaces` must take ALL workspace roles (`PRODUCER`, `EDITOR`, `WRITER`, `ARTIST`, `LETTERER`) to the **Studio Series Selection Screen** first—never skip Series selection or jump into an uncontextualized editor view.
- [x] **2.2. Fix Top Header (`src/app/Header.tsx`):**
  - [x] Fix Breadcrumb navigation (`Workspaces / <Studio> / <Series> / <Chapter>`): Clicking each breadcrumb segment must route cleanly to the corresponding hierarchy level.
  - [x] Align the Global Search input, `AI: Ready` status pill, Notification bell badge, and User Profile dropdown.
- [x] **2.3. Fix Left Sidebar (`src/app/AppShellSidebar.tsx`):**
  - [x] Top Workspace Switcher must display the active Studio name and current user's `WorkspaceRole`.
  - [x] Series Selector dropdown (`"Select Series..."`) must populate with the active Studio's real Series list, reflect the currently selected Series, and trigger the exact same navigation flow as clicking a Series Card.
  - [x] Sidebar navigation items must dynamically adapt to the active role and current navigation depth (Studio level vs. Series/Chapter level).

---

## PHASE 3: SCREEN-BY-SCREEN UI PATCHING & COMPONENT DECOMPOSITION

### Group A: Shared Screens & Studio Overview (`src/shared/` & Studio Level)
- [ ] **A1. Workspaces List (`WorkspaceListView.tsx`):**
  - [ ] Standardize Studio card grid, role badges, and the "Create Studio" button (visible when `canCreateStudio === true`).
- [ ] **A2. Studio Overview & Series Selection (`ProducerWorkspaceView.tsx` / Shared Studio Overview):**
  - [ ] **Decompose Monolithic File (1,315 lines)** into focused sub-components: `StudioOverviewHeader`, `StudioQuotaCards`, `SeriesGridSection`, and `SeriesCard`.
  - [ ] **Fix Role Copywriting Bug:** Replace the hardcoded Producer subtitle with dynamic role-aware descriptions based on the active user's role (`EDITOR`, `WRITER`, `ARTIST`, `LETTERER`, `PRODUCER`).
  - [ ] **Fix Storage Progress Bar Bug (`0.0 / 0.0 GB`):** Guard percentage math so `0%` usage renders `width: 0%` on a neutral gray track instead of a 100% full orange bar.
  - [ ] **Balance the 4 Quota/Usage Cards:** Upgrade helper text to at least `text-xs`, apply `whitespace-nowrap` to badges like `"Chưa cấp quota"`, remove misaligned floating `"NFR Governance"` text, and apply `flex flex-col justify-between h-full` so all 4 cards have identical height.
  - [ ] **Polish Series Cards:** Remove redundant outer white wrapper boxes; align Genre badge (`GENERAL`), Series Title (`text-xl font-serif font-bold`), Reading Direction (`Vertical` / `RTL`), Chapter count badge, and bottom CTA buttons (`h-10`).
- [ ] **A3. Series Bible (`SeriesBibleView.tsx` - 1,165 lines):**
  - [ ] Decompose into sub-components (`BibleSidebarFilter`, `BibleEntityGrid`, `BibleDetailDrawer`, `BibleRevisionHistory`).
  - [ ] Standardize `🔒 CANON LOCKED` badges, `Supersede Locked Revision` modal flow, chapter effective filter (`effectiveFromChapterNumber`), and `Read-only` mode for Artist/Letterer.
- [ ] **A4. Production Pipeline Kanban Board (`KanbanBoard.tsx` / `WorkflowBoardView.tsx`):**
  - [ ] Standardize column widths and spacing across all 7 `AssignmentStatus` columns (`Assigned` → `Approved`), displaying clear stage badges, deadlines, and overdue indicators.

### Group B: Role-Specific Workbenches (3-Pane Studio Layout)
- [ ] **B1. Writer Script Editor (`src/roles/writer/views/ScriptEditorView.tsx`):**
  - [ ] Standardize 3-pane layout: *Narrative Context* accordion (Story Arc & Chapter Outline), Scene/ScriptLine editor list, and *Consistency Check* drawer (`Blocking`, `Warning`, `Info` findings + `CHARACTER_NOT_LOCKED`).
  - [ ] Verify smooth auto-scroll and orange border highlight when clicking a finding.
- [ ] **B2. Artist Desk & Page Layout (`src/roles/artist/views/ArtistDeskView.tsx` & `ArtworkPanel.tsx`):**
  - [ ] Polish the 11-preset `FrameTemplateModal`, panel bounding-box controls, per-panel artwork upload card, and Canvas Image Layer tab (`BACKGROUND`, `EFFECT`, `PROP`, `CHARACTER`, `ARTWORK_LAYER`).
  - [ ] Verify numbered annotation overlays (`#1, #2`) on both thumbnails and fullscreen zoom modal, keeping `ChangeRequestPanel` pinned at the top when status is `ReworkRequired`.
- [ ] **B3. Letterer Workspace (`src/roles/letterer/views/LetteringWorkspace.tsx`):**
  - [ ] Standardize balloon creation toolbar (`SPEECH`, `THOUGHT`, `NARRATION`, `SFX`), stale dialogue badge (`isStale`), and the 3 automated safety warnings (`TEXT_OVERFLOW`, `READING_ORDER_MISMATCH`, `OVERLAPS_KEY_ARTWORK_REGION`).
  - [ ] Verify `OfflineStatusBanner` and `ElementConflictModal` (HTTP 409 Conflict resolution UI).
- [ ] **B4. Editor Review & Version Comparison (`src/roles/editor/views/ReviewView.tsx`):**
  - [ ] Polish the comparison mode switcher (*Side-by-side*, *Swipe slider*, *Onion-skin*) and *Canvas Pixel Diff* toggle (magenta overlay + diff percentage).
  - [ ] Center the `1200×1800` composite page viewport cleanly and align the right-hand `ChangeRequest` annotation list and `Approve` / `Request Changes` action bar.

### Group C: Administration, Release, Preview & Public Reader (`Admin`, `Producer`, `Publisher`, `Reader`)
- [ ] **C1. Chapter Approval, Preview Links & Export (`SeriesChaptersModal`, `PreviewLinksModal`, `ExportView`):**
  - [ ] Standardize preview link creation table, access log counters, revoke status badges, and feedback triage actions (`Noted` / `NeedsChange`).
- [ ] **C2. External Preview & Public Reader (`PublicPreviewView.tsx`, `PublicCatalogView.tsx`):**
  - [ ] Ensure diagonal repeating SVG watermark overlay protects content without blocking RTL/LTR/Vertical page navigation controls or the feedback submission drawer.
- [ ] **C3. System Administration (`src/roles/admin/views/`):**
  - [ ] Consolidate `AdminDashboard.tsx` and `AdminDashboardView.tsx`; align user account tables, AI quota governance forms, and system audit log filters.

---

## PHASE 4: FINAL QUALITY VERIFICATION
- [ ] Run `npm run quality` (`tsc --noEmit`, `eslint --max-warnings 0`, `vitest run`) and confirm **0 errors, 0 warnings, and 100% passing tests**.
- [ ] Run `npm run build` and verify clean production bundle output.
- [ ] Manually verify the complete 4-step navigation flow (Login ➔ Workspaces ➔ Select Series ➔ Select Chapter/Task ➔ Role Workbench).
