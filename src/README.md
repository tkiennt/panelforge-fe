# PanelForge Frontend Architecture

Tài liệu cấu trúc mã nguồn Frontend dự án **PanelForge** (`Frontend/panelforge-fe`).
Cấu trúc được tổ chức theo kiến trúc **Role-Based Feature Directory**, đảm bảo:
- **Nhìn đường dẫn biết ngay file thuộc role nào**: mọi nghiệp vụ độc lập được phân bổ vào `src/roles/<role>/`.
- **Ranh giới kiến trúc rõ ràng**: `shared/` chỉ chứa tài nguyên dùng chung, cấm import chéo giữa các role (được enforce tự động bằng ESLint `no-restricted-imports`).
- **Nguồn chân lý duy nhất (Single Source of Truth)**: manifest role tập trung tại `src/roles/roles.ts`.

---

## 1. Bản đồ Role → Thư mục → Route

| Role Key | Tên vai trò | Scope | Thư mục mã nguồn | Route mặc định / URL chính | Màn hình / Component chính |
|---|---|---|---|---|---|
| **ADMINISTRATOR** | System Administrator | `system` | `src/roles/admin/` | `/admin` | `AdminDashboardView`, `AdminUserManagementView`, `AdminSystemSettingsView`, `AdminAuditLogView` |
| **PRODUCER** | Production Producer / Lead | `workspace` | `src/roles/producer/` | `dashboard` (`/workspaces/:wsId/series/:seriesId/dashboard`) | `ProducerWorkspaceView`, `DashboardView`, `MembersRolesView`, `SeriesMembersView`, `ExportView` |
| **WRITER** | Biên kịch / Writer | `workspace` | `src/roles/writer/` | `script` (`/workspaces/:wsId/series/:seriesId/script`) | `ScriptEditorView`, `WriterWorkspace`, `components/script/*` (7 block editors & diffs) |
| **ARTIST** | Họa sĩ / Artist | `workspace` | `src/roles/artist/` | `layout` (`/workspaces/:wsId/series/:seriesId/layout` hoặc `/artist`) | `ArtistDeskView`, `ArtistWorkspace`, `components/page-layout-editor/*`, `ArtworkCanvas` |
| **LETTERER** | Kỹ thuật chèn chữ / Letterer | `workspace` | `src/roles/letterer/` | `canvas` (`/workspaces/:wsId/series/:seriesId/canvas`) | `LettererWorkspace`, `LetteringWorkspace` (canvas bóng thoại, phông chữ, script binding) |
| **EDITOR** | Biên tập viên / Editor | `workspace` | `src/roles/editor/` | `review` (`/review/:taskId`) | `ReviewView`, `EditorWorkspace` (đối chiếu tiêu chí duyệt, cảnh báo AI) |
| **READER** | Độc giả / Người đọc thử | `external` | `src/roles/reader/` | `reader` (`/reader`) | `ReaderPortalView`, `PublicCatalogView` (`/catalog`), `ReaderWorkspace` |
| **GUEST** | Khách vãng lai / Chưa đăng nhập | `public` | `src/roles/guest/` | `/`, `/login` | `LandingPageView`, `LoginModal`, `RegisterModal` |

---

## 2. Thư mục `src/shared/` (Tài nguyên dùng chung)

Chỉ chứa các tài nguyên được tái sử dụng bởi nhiều role hoặc thuộc phạm vi toàn bộ người dùng hệ thống:

- **`src/shared/views/`**:
  - `WorkspaceListView.tsx`: Danh mục Studio Workspace của người dùng (Hub trung tâm).
  - `NotificationCenterView.tsx`: Trung tâm thông báo tác vụ và hệ thống.
  - `UserProfileView.tsx`: Hồ sơ cá nhân và quản lý thiết bị/phiên.
- **`src/shared/features/`**:
  - `series-bible/`: Kinh thánh bộ truyện (Series Bible), quản lý thực thể nhân vật, bối cảnh, quy tắc (`SeriesBibleView.tsx`, `AddEntityModal.tsx`).
  - `ai-agents/`: Hệ thống cộng tác 7 AI Agents (`AiMultiAgentView.tsx`, pipeline preview, recommendation cards).
  - `pipeline-board/`: Bảng Kanban quy trình sản xuất manga theo các chặng (`WorkflowBoardView.tsx`, `KanbanBoard.tsx`).
  - `production-workspace/`: Khung bàn làm việc và trình soạn thảo tác vụ (`WorkspaceView.tsx`, `TaskEditorView.tsx`).
  - `account/`: Quản lý xác thực nâng cao (`ChangePasswordModal.tsx`, `TwoFactorSetupModal.tsx`).
  - `collaboration/`: Luồng cộng tác CF2/CF3 dùng chung mọi vai trò làm nội dung: `MyWorkView.tsx` (route `my-work`), `AssignmentWorkCard.tsx`, `ArtworkPanel.tsx` (upload có SHA-256), `ReviewDecisionPanel.tsx` (duyệt, trả về), `ChangeRequestPanel.tsx`, `SubmissionHistory.tsx`, `NotificationBell.tsx` (chuông ở header), `collaborationRules.ts` (luật bật/tắt nút, hàm thuần có test).
- **`src/shared/components/ui/`**: Các UI atomic component (`Badge.tsx`, `Button.tsx`, `Card.tsx`, `Input.tsx`, `PermissionButton.tsx`, `PermissionGuard.tsx`).
- **`src/shared/modals/`**: Hộp thoại toàn cục (`AuditLogModal.tsx`, `CommandPaletteModal.tsx`, `ProvenanceModals.tsx`, `VectorStatusModal.tsx`, `SpreadWorkbenchModal.tsx`).

---

## 3. Khung Ứng dụng & Cấu hình (`src/app/`, `src/config/`, v.v.)

- **`src/app/`**:
  - `AppShell.tsx` & `AppShellSidebar.tsx`: Khung ứng dụng chính, thanh điều hướng theo ngữ cảnh role và workspace.
  - `Header.tsx`: Thanh tiêu đề điều hướng nhanh.
  - `GlobalModals.tsx`: Container quản lý các modal toàn cục.
  - `routes.tsx`: Khai báo toàn bộ cây định tuyến `<Route>`, phân quyền `PrivateRoute` và `AdminRoute`.
  - `dev/`: Công cụ kiểm thử nhanh giao diện (`RoleDemoBar.tsx`, `DevFloatingMenu.tsx`).
- **`src/roles/roles.ts`**: Manifest role tập trung (`ROLE_MANIFEST`).
- **`src/services/`**: Các lớp giao tiếp API Backend theo từng domain (`auth`, `admin`, `workspace`, `series`, `bible`, `pipeline`, `aiAgents`, `aiWorkflows`).
- **`src/types/`**: Kiểu dữ liệu TypeScript chuẩn hóa theo domain (`auth.ts`, `series.ts`, `pipeline.ts`, `bible.ts`, `workspace.ts`, re-export qua `index.ts`).
- **`src/mocks/`**: Dữ liệu giả lập phục vụ dev mode và unit test (`mockData.ts`, `mockLayoutData.ts`, `mockPipelineData.ts`, `mockScriptData.ts`).
- **`src/config/`**: Cấu hình môi trường (`firebase.ts`).

---

## 4. Quy tắc phụ thuộc Kiến trúc (Architectural Boundaries)

Hệ thống được giám sát tự động bằng ESLint (`no-restricted-imports` trong `.eslintrc.cjs`):
1. **Cấm import chéo giữa hai role**: `src/roles/<role-A>/` tuyệt đối không được import từ `src/roles/<role-B>/`. Nếu cần chia sẻ component/modal, bắt buộc phải đưa vào `src/shared/`.
2. **Cấm `shared/` import từ `roles/`**: Các component dùng chung trong `src/shared/components/`, `features/`, `modals/` không được phụ thuộc ngược vào bất kỳ role nào.
3. **Cấm `services/` import component**: Các file service nghiệp vụ (`*.service.ts`) chỉ thực hiện gọi HTTP và logic dữ liệu, tuyệt đối không phụ thuộc vào tầng giao diện (UI components / views / roles).

---

## 5. Quy trình Kiểm thử & Xây dựng

```bash
# Kiểm tra chất lượng toàn diện (TypeCheck + ESLint + Vitest Unit Tests)
npm run quality

# Build bundle production
npm run build
```
