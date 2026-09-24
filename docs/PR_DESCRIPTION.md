# PR: PanelForge Frontend — Sprint 1 Feature Integration

## Tổng quan

Sprint này tích hợp toàn bộ lớp kết nối Backend API, phân quyền theo role, màn hình Admin, xác thực 2 yếu tố (2FA TOTP), và workspace view riêng cho từng role nghiệp vụ của PanelForge.

---

## 1. Two-Factor Authentication (2FA) — RFC 6238 TOTP

### Files mới
| File | Mô tả |
|------|-------|
| `src/components/modals/TwoFactorSetupModal.tsx` | Modal setup 2FA: render QR Code, nhập OTP, kích hoạt |
| `src/components/modals/TwoFactorSetupModal.test.tsx` | Unit test cho modal 2FA |

### Files thay đổi
- **`src/layouts/GlobalAppShell.tsx`** — Click vào avatar góc trên phải → trigger mở `TwoFactorSetupModal`
- **`src/App.tsx`** — Thêm state `isTwoFactorModalOpen` + mount `<TwoFactorSetupModal>` global

### Flow
```
User click avatar
  → TwoFactorSetupModal mở
  → Step "loading": GET /api/auth/2fa/setup  (lấy QR URI + secret key)
  → Step "setup":   Render QR Code (qrcode.react) → user quét bằng Authenticator app
  → Nhập 6-digit OTP → POST /api/auth/2fa/verify
  → Step "success": Toast "Đã kích hoạt 2FA thành công"
```

### Dependency mới
- **`qrcode.react`** — Render QR code từ chuỗi `otpauth://totp/...`

---

## 2. Role-Based Authorization & Routing

### Views theo từng role (files mới)
| File | Role | Mô tả |
|------|------|-------|
| `src/views/writer/WriterStudioView.tsx` | `WRITER` | Màn hình soạn thảo script, quản lý chapters |
| `src/views/artist/ArtistDeskView.tsx` | `ARTIST` | Canvas page management, upload artwork |
| `src/views/letterer/LettererCanvasView.tsx` | `LETTERER` | Typeset dialogue balloons & sound effects |
| `src/views/editor/EditorDeskView.tsx` | `EDITOR` | Review & approve pages |
| `src/views/producer/ProducerWorkspaceView.tsx` | `PRODUCER` | Dashboard quản lý production pipeline |
| `src/views/reader/ReaderPortalView.tsx` | `READER` | Preview truyện (watermark CONFIDENTIAL) |

### Role-to-View Mapping (`src/App.tsx`)
```
ADMINISTRATOR  →  AdminDashboardView / AdminUserManagementView
                  AdminSystemSettingsView / AdminAuditLogView
PRODUCER       →  ProducerWorkspaceView + WorkflowBoardView + MembersRolesView
WRITER         →  WriterStudioView + ScriptEditorView + ScriptView
ARTIST         →  ArtistDeskView  (gọi Page API + Element API)
LETTERER       →  LettererCanvasView
EDITOR         →  EditorDeskView + ReviewView
READER         →  ReaderPortalView (read-only)
```

### Barrel index files (import sạch)
```
src/views/writer/index.ts     src/views/artist/index.ts
src/views/letterer/index.ts   src/views/editor/index.ts
src/views/producer/index.ts   src/views/reader/index.ts
src/views/admin/index.ts
src/admin/index.ts            src/artist/index.ts
src/writer/index.ts           src/letterer/index.ts
src/producer/index.ts         src/reader/index.ts
src/editor/index.ts
```

### Role Demo Bar
- **`src/components/RoleDemoBar.tsx`** — Floating pill góc dưới phải, preview từng role **không cần login**  
  (Chỉ hiển thị khi `!isAuthenticated`)

### Mock Role Workspace
- **`src/views/MockRoleWorkspaceView.tsx`** — View demo mô phỏng workspace của từng role

---

## 3. Admin Panel (Role: ADMINISTRATOR)

### Views mới
| File | Chức năng |
|------|-----------|
| `src/views/admin/AdminDashboardView.tsx` | Tổng quan: user count, storage usage, AI quota, system health |
| `src/views/admin/AdminUserManagementView.tsx` | Quản lý user: search, activate/deactivate, đổi role, reset 2FA |
| `src/views/admin/AdminAuditLogView.tsx` | Audit log toàn hệ thống, filter theo action / severity / user |
| `src/views/admin/AdminSystemSettingsView.tsx` | Cấu hình AI quota, storage limits, master data |

### Service — `src/services/admin.service.ts`
Kết nối toàn bộ `AdminController`:

```typescript
// User management
getUsers(page, pageSize, search?, role?)   → GET  /api/admin/users
activateUser(id)                           → PUT  /api/admin/users/{id}/activate
deactivateUser(id)                         → PUT  /api/admin/users/{id}/deactivate
changeUserRole(id, role)                   → PUT  /api/admin/users/{id}/role
resetUser2FA(id)                           → POST /api/admin/users/{id}/reset-2fa

// Audit & Stats
getAuditLogs(filters)                      → GET  /api/admin/audit-logs
getSystemStats()                           → GET  /api/admin/system-stats
```

### Tests
- `src/services/admin.service.test.ts`

---

## 4. Core API Service Layer (3 Controllers)

### `src/services/workspace.service.ts` — `WorkspacesController`
```typescript
createWorkspace(req)           → POST   /api/workspaces
listWorkspaces()               → GET    /api/workspaces
getWorkspace(id)               → GET    /api/workspaces/{id}
updateWorkspace(id, req)       → PUT    /api/workspaces/{id}
deleteWorkspace(id)            → DELETE /api/workspaces/{id}
listMembers(id)                → GET    /api/workspaces/{id}/members
addMember(id, req)             → POST   /api/workspaces/{id}/members
removeMember(id, userId)       → DELETE /api/workspaces/{id}/members/{userId}
createPage(workspaceId, req)   → POST   /api/workspaces/{id}/pages
listPages(workspaceId)         → GET    /api/workspaces/{id}/pages
```

### `src/services/page.service.ts` — `PagesController`
```typescript
getPage(id)                    → GET    /api/pages/{id}
getPageSnapshot(id)            → GET    /api/pages/{id}/snapshot
updateCanvas(id, req)          → PUT    /api/pages/{id}/canvas
reorderPage(id, req)           → PUT    /api/pages/{id}/reorder
deletePage(id)                 → DELETE /api/pages/{id}
```

### `src/services/element.service.ts` — `ElementsController`
```typescript
getElements(pageId)                       → GET    /api/pages/{pageId}/elements
addElement(pageId, req)                   → POST   /api/pages/{pageId}/elements
moveElement(pageId, elementId, req)       → PUT    /api/pages/{pageId}/elements/{elementId}/move
removeElement(pageId, elementId, reason)  → DELETE /api/pages/{pageId}/elements/{elementId}
```

### `src/services/auth.service.ts` — Thêm mới
```typescript
externalLogin(provider, idToken)  → POST /api/auth/external-login  (Google OAuth)
setup2FA(token?)                  → GET  /api/auth/2fa/setup
verify2FA(code, token?)           → POST /api/auth/2fa/verify
```

### Tests
- `src/services/controllers.service.test.ts`
- `src/services/auth.service.test.ts`

---

## 5. Layout & UX Fixes

### `src/layouts/GlobalAppShell.tsx`
- **Scroll bug fix**: `<main>` đổi từ `overflow-hidden` → `overflow-y-auto custom-scrollbar`  
  → Content area giờ scroll được bình thường, không bị cắt
- Role badge trong header hiển thị đúng role đang đăng nhập
- Export button đổi label theo role: `ARTIST` → "Submit", còn lại → "Export"

### `src/App.tsx`
- **Scroll bug fix**: wrapper bao ngoài đổi từ `h-full overflow-hidden` → `min-h-full flex-1`  
  → Các view dài (AdminUserManagementView, ScriptEditorView, ...) không bị clip
- Tích hợp `<TwoFactorSetupModal>` global ở cuối render tree
- Routing state `currentView` xử lý đủ 8 roles + sub-views

---

## 6. Components & Modals

### Role Workspace Modals (Quick-preview per role)
| File |
|------|
| `src/components/modals/roles/WriterWorkspace.tsx` |
| `src/components/modals/roles/ArtistWorkspace.tsx` |
| `src/components/modals/roles/LettererWorkspace.tsx` |
| `src/components/modals/roles/EditorWorkspace.tsx` |
| `src/components/modals/roles/ReaderWorkspace.tsx` |

### General Modals
| File | Chức năng |
|------|-----------|
| `SpreadWorkbenchModal.tsx` | Canvas workspace cho từng spread/page |
| `NewPageCardModal.tsx` | Tạo page mới trong Kanban board |
| `PageDetailModal.tsx` | Chi tiết một page card |
| `ExportDeliveryModal.tsx` | Export & deliver chapter |
| `CommandPaletteModal.tsx` | ⌘K global search |
| `VectorStatusModal.tsx` | Trạng thái AI vector processing |
| `AuditLogModal.tsx` | Xem audit log per-page |
| `InviteMemberModal.tsx` | Mời thành viên vào workspace |

### Script Editor Components
| File | Chức năng |
|------|-----------|
| `src/components/script/ScriptBlockEditor.tsx` | Editor cho từng script block |
| `src/components/script/ScriptBlockItem.tsx` | Row item trong script list |
| `src/components/script/ScriptOutline.tsx` | Sidebar outline chapters/scenes |
| `src/components/script/AIBreakdownDiff.tsx` | So sánh AI-generated breakdown |
| `src/components/script/BibleLinkPopover.tsx` | Popover liên kết Series Bible |
| `src/components/script/SpeakerAutocomplete.tsx` | Autocomplete tên nhân vật |
| `src/components/script/VersionCompareView.tsx` | Diff viewer giữa 2 phiên bản |

---

## 7. Test Infrastructure

| File | Mô tả |
|------|-------|
| `src/test/setup.ts` | Vitest setup với `@testing-library/jest-dom` |
| `src/components/modals/LoginModal.test.tsx` | Unit test Login modal |
| `src/components/modals/RegisterModal.test.tsx` | Unit test Register modal |
| `src/components/modals/TwoFactorSetupModal.test.tsx` | Unit test 2FA modal |
| `src/views/WorkflowBoardView.test.tsx` | Unit test Workflow board |
| `src/components/Sidebar.test.tsx` | Unit test Sidebar navigation |
| `src/services/auth.service.test.ts` | Unit test auth service |
| `src/services/admin.service.test.ts` | Unit test admin service |
| `src/services/controllers.service.test.ts` | Unit test workspace/page/element services |

### CI/CD
- `.github/workflows/ci.yml` — GitHub Actions: build + lint + test on every push

---

## 8. Shared Types & Mock Data

| File | Mô tả |
|------|-------|
| `src/types.ts` | TypeScript interfaces: `User`, `WorkflowCard`, `Entity`, `Member`, `ProvenanceLog`... |
| `src/data/mockData.ts` | Mock data cho dev/demo mode |
| `src/data/mockPipelineData.ts` | Mock Kanban pipeline cards |
| `src/data/mockScriptData.ts` | Mock script blocks |

---

## Commits

| Hash | Mô tả |
|------|-------|
| `3a8cf12` | feat: add artist desk view, letterer canvas view, and element service |
| `6ba211f` | feat: initialize frontend application with role-based views, services, components, and testing infrastructure |

---

## Hướng dẫn test

### Setup
```bash
cd "Frontend/panelforge-fe"
npm install
cp .env.example .env.local   # điền VITE_API_URL + Firebase keys
npm run dev                   # http://localhost:5173
```

### Test không cần Backend (Demo Mode)
> Dùng **floating role-switcher pill** ở góc dưới phải màn hình để preview từng role

### Test với Backend thật
1. Backend đang chạy tại `http://localhost:5044`
2. Login → JWT token lưu vào `localStorage`
3. App tự routing đúng view theo `SystemRole` của user

### Test 2FA
1. Login thành công → click **avatar** góc trên phải
2. Modal 2FA mở → quét QR bằng **Google Authenticator** hoặc **Microsoft Authenticator**
3. Nhập 6-digit OTP → kích hoạt thành công

### Test Admin Panel
```
Login bằng account ADMINISTRATOR
→ Sidebar: Dashboard · Users · Settings · Audit Log
→ AdminUserManagementView: search users, change role, activate/deactivate
```

### Test Artist (Pages + Elements API)
```
Login ARTIST → ArtistDeskView
→ Tạo Workspace → Tạo Page → Thêm Element
→ POST /api/workspaces/{id}/pages
→ POST /api/pages/{pageId}/elements
```

### Chạy unit tests
```bash
npm run test          # chạy tất cả
npm run test:ui       # Vitest UI mode
npm run test:coverage # coverage report
```

---

## Environment Variables

```env
VITE_API_URL=http://localhost:5044
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Checklist trước khi merge

- [x] `npm run build` không lỗi
- [x] `npm run test` pass
- [x] Scroll hoạt động bình thường tất cả views (không bị clip)
- [x] 2FA flow end-to-end với Backend
- [x] Admin views gọi đúng `/api/admin/*` endpoints
- [x] Workspace / Page / Element services đúng endpoint & method
- [x] Role routing điều hướng đúng sau login
- [ ] Review UI/UX với designer
- [ ] Test trên mobile viewport (responsive)
- [ ] Test với production Backend URL
