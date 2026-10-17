# ✅ PANELFORGE UI REFACTOR & SYNCHRONIZATION CHECKLIST (`UI_REFACTOR_CHECKLIST.md`)

> **Instructions for AI Agent:** Before modifying any UI component, read `DESIGN_RULES.md`. Execute tasks phase-by-phase, run `npm run quality` after each batch, and mark completed items with `[x]`.

---

## PHASE 1: STRUCTURAL CONSOLIDATION & DUPLICATE REMOVAL
- [x] **1.1. Remove Root-Level Legacy Files:**
  - [x] Delete `App_old.tsx`, `App_commit.tsx`, and `GlobalAppShell.html` after verifying zero active imports.
  - [x] Remove orphaned `src/app/Header.tsx` (an unmounted legacy navbar completely superseded by canonical `AppShell.tsx` header).
- [x] **1.2. Consolidate Duplicated Role Workspaces (4 Overlapping Locations):**
  - [x] Keep the canonical API-connected views inside `src/roles/{writer,artist,letterer,editor}/views/`.
  - [x] Merge or remove redundant duplicates in `components/modals/roles/*Workspace.tsx` and `components/task-editor/*`.
  - [x] Consolidate or deprecate experimental Spike UI components in `src/roles/artist/components/page-layout-editor/` (`CanvasEditor.tsx`, `PanelProperties.tsx`, `CanvasPanelItem.tsx`) in favor of canonical `ArtistDeskView.tsx`.
- [x] **1.3. Consolidate Member & Pipeline Views:**
  - [x] Merge `MembersRolesView.tsx`, `ProjectMembersView.tsx`, and `SeriesMembersView.tsx` into a single canonical `src/roles/producer/views/MembersRolesView.tsx` (MVP manages members at the Workspace level, not `SeriesMember`).
  - [x] Remove orphaned `ProductionPipelineView.tsx` and standardize on `src/shared/features/pipeline-board/KanbanBoard.tsx`.
- [x] **1.4. Clean Up Residual Mock Data Imports:**
  - [x] Replace or remove references to `src/data/mock*.ts` inside `AILayoutModal`, `BibleReferencePanel`, `AIBreakdownDiff`, and `ScriptOutline`.
  - [x] Clean unused mock block files in `src/roles/writer/components/script/` (`VersionCompareView.tsx`, `ScriptBlockEditor.tsx`, `ScriptBlockItem.tsx`) superseded by `ScriptHistoryModal.tsx` and `ScriptEditorView.tsx`.
  - [x] Remove legacy `INITIAL_*` mock bindings in `src/App.tsx` and migrate default project/membership states to real API types.

---

## PHASE 2: APPSHELL & END-TO-END NAVIGATION FLOW SYNCHRONIZATION
- [x] **2.1. Centralize Role Manifest & Routes:**
  - [x] Create/verify `src/roles/roles.ts` (`ROLE_MANIFEST`) and `src/app/routes.tsx`.
  - [x] Fix post-workspace selection routing: Selecting a Workspace from `/workspaces` must take ALL workspace roles (`PRODUCER`, `EDITOR`, `WRITER`, `ARTIST`, `LETTERER`) to the **Studio Series Selection Screen** first—never skip Series selection or jump into an uncontextualized editor view.
  - [x] Remove dead fallback flat routes in `src/app/routes.tsx` (`/producer`, `/reader`, `/artist`, `/letterer`) that lack `:workspaceId` and `:seriesId` context.
- [x] **2.2. Fix Top Header (`src/app/Header.tsx` / `AppShell.tsx` Header):**
  - [x] Fix Breadcrumb navigation (`Workspaces / <Studio> / <Series> / <Chapter>`): Clicking each breadcrumb segment must route cleanly to the corresponding hierarchy level.
  - [x] Align the Global Search input, `AI: Ready` status pill, Notification bell badge, and User Profile dropdown.
  - [x] Connect Global Search input (`⌘K`) in `AppShell.tsx` top bar to trigger `CommandPaletteModal` shortcut.
  - [x] Add Active Chapter breadcrumb segment (`/ <Chapter N>`) in Header when editing inside Chapter-specific workbenches (`Script`, `ArtistDesk`, `Letterer`).
- [x] **2.3. Fix Left Sidebar (`src/app/AppShellSidebar.tsx`):**
  - [x] Top Workspace Switcher must display the active Studio name and current user's `WorkspaceRole`.
  - [x] Series Selector dropdown (`"Select Series..."`) must populate with the active Studio's real Series list, reflect the currently selected Series, and trigger the exact same navigation flow as clicking a Series Card.
  - [x] Sidebar navigation items must dynamically adapt to the active role and current navigation depth (Studio level vs. Series/Chapter level).
  - [x] Synchronize `activeProject` state in `App.tsx` when a user selects a series from the sidebar popover dropdown.

---

## PHASE 3: SCREEN-BY-SCREEN UI PATCHING & COMPONENT DECOMPOSITION

### Group A: Shared Screens & Studio Overview (`src/shared/` & Studio Level)
- [x] **A1. Workspaces List (`WorkspaceListView.tsx`):**
  - [x] Standardize Studio card grid, role badges, and the "Create Studio" button (visible when `canCreateStudio === true`).
- [x] **A2. Studio Overview & Series Selection (`src/shared/views/StudioOverviewView.tsx` - formerly `ProducerWorkspaceView.tsx`):**
  - [x] **Decompose Monolithic File (1,315 lines)** into focused sub-components: `StudioOverviewHeader`, `StudioQuotaCards`, `SeriesGridSection`, and `SeriesCard`.
  - [x] **Fix Role Copywriting Bug:** Replace the hardcoded Producer subtitle with dynamic role-aware descriptions based on the active user's role (`EDITOR`, `WRITER`, `ARTIST`, `LETTERER`, `PRODUCER`).
  - [x] **Fix Storage Progress Bar Bug (`0.0 / 0.0 GB`):** Guard percentage math so `0%` usage renders `width: 0%` on a neutral gray track instead of a 100% full orange bar.
  - [x] **Balance the 4 Quota/Usage Cards:** Upgrade helper text to at least `text-xs`, apply `whitespace-nowrap` to badges like `"Chưa cấp quota"`, remove misaligned floating `"NFR Governance"` text, and apply `flex flex-col justify-between h-full` so all 4 cards have identical height.
  - [x] **Polish Series Cards:** Remove redundant outer white wrapper boxes; align Genre badge (`GENERAL`), Series Title (`text-xl font-serif font-bold`), Reading Direction (`Vertical` / `RTL`), Chapter count badge, and bottom CTA buttons (`h-10`).
- [x] **A3. Series Bible (`SeriesBibleView.tsx` - 1,165 lines):**
  - [x] Decompose into sub-components (`BibleSidebarFilter`, `BibleEntityGrid`, `BibleDetailDrawer`, `BibleRevisionHistory`).
  - [x] Standardize `🔒 CANON LOCKED` badges, `Supersede Locked Revision` modal flow, chapter effective filter (`effectiveFromChapterNumber`), and `Read-only` mode for Artist/Letterer.
- [x] **A4. Production Pipeline Kanban Board (`KanbanBoard.tsx` / `WorkflowBoardView.tsx`):**
  - [x] Standardize column widths and spacing across all 7 `AssignmentStatus` columns (`Assigned` → `Approved`), displaying clear stage badges, deadlines, and overdue indicators.
- [x] **A5. Series Progress & Burndown Dashboard (`src/roles/producer/views/DashboardView.tsx`):**
  - [x] Standardize KPI metric cards grid (Total Pages, Progress %, Days Left, Active Assignments).
  - [x] Provide intuitive empty-state illustration and CTA when Burndown Chart or Stage Matrix has 0 entries.
  - [x] Polish Stage Progress Matrix and Chapter Delivery timeline table with accurate role and status badge colors.
  - [x] Pinned overdue Change Requests section with direct jump buttons to the relevant workbenches.
- [x] **A6. Studio Members & Team Management (`src/roles/producer/views/MembersRolesView.tsx`):**
  - [x] Standardize Member Roster table with Studio-level roles (`PRODUCER`, `EDITOR`, `WRITER`, `ARTIST`, `LETTERER`).
  - [x] Standardize `InviteMemberModal` with role selector, email validation, and permission preview.
  - [x] Add member revocation confirmation modal and display ECDSA cryptographic key badges.
- [x] **A7. Unified "My Work" Task Desk (`src/shared/features/collaboration/MyWorkView.tsx`):**
  - [x] Standardize task cards grouped by assignment status (`Assigned`, `InProgress`, `InReview`, `ReworkRequired`).
  - [x] Pinned warning alert and highlight border for tasks with status `ReworkRequired`.
  - [x] Context-aware direct jump CTA buttons based on role (`Open Script Editor`, `Open Drawing Desk`, `Open Lettering Canvas`, `Open Review View`).
- [x] **A8. Task Detail & Execution Workbench (`src/shared/features/production-workspace/TaskEditorView.tsx`):**
  - [x] Replace mock fallback to `INITIAL_KANBAN_CARDS` with live `assignmentService.getAssignmentById`.
  - [x] Standardize task lifecycle transition buttons (`Start Work`, `Submit for Review`, `Close`), deadlines, and comment drawer.

### Group B: Role-Specific Workbenches (3-Pane Studio Layout)
- [ ] **B1. Writer Script Editor (`src/roles/writer/views/ScriptEditorView.tsx`):**
  - [ ] Standardize 3-pane layout: *Narrative Context* accordion (Story Arc & Chapter Outline), Scene/ScriptLine editor list, and *Consistency Check* drawer (`Blocking`, `Warning`, `Info` findings + `CHARACTER_NOT_LOCKED`).
  - [ ] Verify smooth auto-scroll and orange border highlight when clicking a finding.
- [ ] **B2. Artist Desk & Page Layout (`src/roles/artist/views/ArtistDeskView.tsx` & `ArtworkPanel.tsx`):**
  - [ ] Polish the 11-preset `FrameTemplateModal`, panel bounding-box controls, per-panel artwork upload card, and Canvas Image Layer tab (`BACKGROUND`, `EFFECT`, `PROP`, `CHARACTER`, `ARTWORK_LAYER`).
  - [ ] Expand central canvas viewport (reduce meaningless empty margins) for high-precision pan/zoom drawing workbench.
  - [ ] Verify numbered annotation overlays (`#1, #2`) on both thumbnails and fullscreen zoom modal, keeping `ChangeRequestPanel` pinned at the top when status is `ReworkRequired`.
- [ ] **B3. Letterer Workspace (`src/roles/letterer/views/LetteringWorkspace.tsx` & `LettererWorkspace.tsx`):**
  - [ ] Standardize balloon creation toolbar (`SPEECH`, `THOUGHT`, `NARRATION`, `SFX`), stale dialogue badge (`isStale`), and the 3 automated safety warnings (`TEXT_OVERFLOW`, `READING_ORDER_MISMATCH`, `OVERLAPS_KEY_ARTWORK_REGION`).
  - [ ] Verify `OfflineStatusBanner` and `ElementConflictModal` (HTTP 409 Conflict resolution UI).
  - [ ] **File Renaming**: Rename wrapper `LettererWorkspace.tsx` to `LettererDeskView.tsx` for architectural symmetry with `ArtistDeskView.tsx` and `PublisherDeskView.tsx`.
  - [ ] **Remove Obsolete Spreads**: Delete deprecated `SpreadWorkbenchModal.tsx` and legacy workspaces (`ArtistWorkspace.tsx`, `EditorWorkspace.tsx`, `WriterWorkspace.tsx`).
- [ ] **B4. Editor Review & Version Comparison (`src/roles/editor/views/ReviewView.tsx`):**
  - [ ] Polish the comparison mode switcher (*Side-by-side*, *Swipe slider*, *Onion-skin*) and *Canvas Pixel Diff* toggle (magenta overlay + diff percentage).
  - [ ] Center the `1200×1800` composite page viewport cleanly and align the right-hand `ChangeRequest` annotation list and `Approve` / `Request Changes` action bar.

### Group C: Administration, Release, Preview & Account Management
- [ ] **C1. Chapter Tankōbon Release & Master Export (`ExportView.tsx`, `SeriesChaptersModal.tsx`, `PreviewLinksModal.tsx`):**
  - [ ] Standardize preview link creation table, access log counters, revoke status badges, and feedback triage actions (`Noted` / `NeedsChange`).
  - [ ] Add real-time export progress polling, format selector cards (B5 Tankōbon Master, Webtoon Digital, Print PDF), and export history list with download links in `ExportView.tsx`.
  - [ ] Standardize `SeriesChaptersModal.tsx` chapter status indicators, chapter number sorting, and chapter lock/unlock triggers.
- [ ] **C2. External Preview & Public Reader (`PublicPreviewView.tsx`, `PublicCatalogView.tsx`):**
  - [ ] Ensure diagonal repeating SVG watermark overlay protects content without blocking RTL/LTR/Vertical page navigation controls or the feedback submission drawer.
  - [ ] Polish Public Catalog grid, genre tags, search filter, and cover thumbnail aspect ratios.
- [ ] **C3. System Administration Portal (`src/roles/admin/views/`):**
  - [ ] **Disambiguate Naming**: Rename `AdminDashboard.tsx` to `AdminPortalShell.tsx` to clearly separate Shell layout navigation from `AdminDashboardView.tsx` (System Health & Services tab).
  - [ ] Polish `UsersRolesView.tsx` (User account table, role assignment modal, ban/unban status).
  - [ ] Polish `AiProviderQuotaView.tsx` (API provider keys, rate limit quotas, provider status).
  - [ ] Polish `SystemAuditLogsView.tsx` (Date-range filters, user action event log table).
- [ ] **C4. Publisher Desk & Distribution (`src/roles/publisher/views/PublisherDeskView.tsx`):**
  - [ ] Standardize release approval checklist, Chapter tankōbon metadata verification, and `Approve for Release` action bar.
  - [ ] Connect with `chapterPublishService` for official digital/print tankōbon locking.
- [ ] **C5. Notification Center & User Account Security (`NotificationCenterView.tsx`, `UserProfileView.tsx`, `TwoFactorSetupModal.tsx`, `ChangePasswordModal.tsx`):**
  - [ ] Standardize `NotificationCenterView.tsx` with filter tabs (Assignments, Reviews, System Alerts), "Mark all as read" button, and unread highlight dots.
  - [ ] Standardize `UserProfileView.tsx` with user metadata, studio memberships, 2FA toggle button, and password change modal.

---

## PHASE 4: FINAL QUALITY VERIFICATION
- [ ] Run `npm run quality` (`tsc --noEmit`, `eslint --max-warnings 0`, `vitest run`) and confirm **0 errors, 0 warnings, and 100% passing tests**.
- [ ] Run `npm run build` and verify clean production bundle output.
- [ ] Manually verify the complete 4-step navigation flow (Login ➔ Workspaces ➔ Select Series ➔ Select Chapter/Task ➔ Role Workbench).
