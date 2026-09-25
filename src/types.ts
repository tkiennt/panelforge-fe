export type ViewMode = 'dashboard' | 'workflow' | 'bible' | 'members' | 'publications';

export type WorkflowSubView = 'board' | 'list' | 'grid';

export type KanbanStageKey =
  'script' | 'thumbnail' | 'pencil' | 'ink' | 'color' | 'letter' | 'review' | 'approved';

export interface MangaProject {
  id: string;
  title: string;
  subtitle: string;
  arc: string;
  chapter: number;
  format: string;
  status: string;
  progressPercent: number;
  completedPages: number;
  totalPages: number;
  dueDate: string;
  daysLeft: number;
  genres: string[];
  coverStyle: 'halftone-cyber' | 'drifter' | 'valkyrie' | 'chrono';
  coverText: string;
  tagline: string;
  lastUpdated: string;
  coverImage?: string;
}

export interface KanbanCard {
  id: string;
  pageNumber: string;
  subTitle?: string;
  title: string;
  stage: KanbanStageKey;
  assignee: string;
  assigneeRole: string;
  assigneeInitials: string;
  avatarBg: string;
  pageType: 'Single' | 'Spread' | 'Action' | 'Dialogue';
  statusBadge?: string;
  statusColor?: string;
  dueText: string;
  isOverdue?: boolean;
  overdueText?: string;
  isApproved?: boolean;
  aiAssistBadge?: string;
  wireframeText?: string;
  imageUrl?: string;
  tags: string[];
  editorialNote?: string;
  scriptVersion?: string;
  completionText?: string;
  progressPercent?: number;
  isPrintReady?: boolean;
}

export type EntityCategory = 'character' | 'location' | 'prop' | 'rule';
export type BibleCategory = | 'all' | 'characters' | 'locations' | 'terminology' | 'style'
  | 'character'
  | 'location'
  | 'prop'
  | 'rule';

export interface BibleEntityRevision {
  version: string;
  date: string;
  summary: string;
  details: string;
  author: string;
  sha: string;
  isActive: boolean;
}

export interface BibleEntity {
  id: string;
  code: string;
  name: string;
  category: BibleCategory | EntityCategory;
  categoryLabel?: string;
  badgeColor?: string;
  roleOrType?: string;
  subtitle?: string;
  description: string;
  tags?: string[];
  negativeConstraints?: string[];
  referenceCut?: string;
  modelAnchor?: string;
  affiliationOrSpec?: string;
  renderSpec?: string;
  imageUrl?: string;
  iconName?: string;
  isVectorized?: boolean;
  priority?: 'High (Strict Check)' | 'Standard' | 'Low';
  revisions?: BibleEntityRevision[];
  enforcedByAi?: boolean;
  ruleNumber?: string;
  strictCheck?: boolean;
  anchorLink?: string;
  guardrailNote?: string;
  referencesCount?: number;
  loraWeight?: number;
  modelVersion?: string;
  continuityMatch?: number;
  status?: string;
  colors?: string[];
}

export type StudioRole = 'Lead Producer' | 'Artist' | 'Writer' | 'Editor' | 'Letterer';
export type RoleKey = 'producer' | 'artist' | 'writer' | 'editor' | 'letterer';

export type SystemRole = 'ADMINISTRATOR' | 'USER';

export type WorkspaceRole = 'PRODUCER' | 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR';

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  roles: (WorkspaceRole | string)[];
}

/**
 * Chuẩn hóa SystemRole (chỉ có 2 giá trị toàn cục: ADMINISTRATOR hoặc USER).
 */
export function normalizeSystemRole(role: any): SystemRole {
  if (!role && role !== 0) return 'USER';
  const r = String(role).trim().toUpperCase();
  if (r === 'ADMIN' || r === 'ADMINISTRATOR' || r === '1') return 'ADMINISTRATOR';
  return 'USER';
}

/**
 * Kiểm tra chuỗi có đúng định dạng JWT (gồm 3 phần ngăn bởi 2 dấu chấm) và chưa hết hạn hay không.
 */
export function isValidJwt(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Giải mã claim role trực tiếp từ JWT token đã ký bởi backend (Single Source of Truth).
 * Tuyệt đối không tin cậy chuỗi userRole tự ghi trong localStorage.
 */
export function getRoleFromToken(customToken?: string | null): SystemRole | null {
  const token =
    customToken !== undefined
      ? customToken
      : typeof window !== 'undefined'
      ? localStorage.getItem('token')
      : null;

  if (!token) return null;

  // Hỗ trợ mock token phục vụ unit test / dev mode
  if (token === 'mock-admin-token') return 'ADMINISTRATOR';
  if (token.startsWith('mock-')) return 'USER';

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      // Kiểm tra hạn token nếu có exp claim
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }
      let roleClaim =
        payload.role ||
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      // JWT có thể chứa mảng role khi backend thêm nhiều claim cùng type
      if (Array.isArray(roleClaim)) {
        roleClaim = roleClaim[0];
      }
      if (roleClaim) {
        return normalizeSystemRole(roleClaim);
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Chuẩn hóa WorkspaceRole (5 role sản xuất trong Workspace theo Entity E-11).
 */
export function normalizeWorkspaceRole(role: any): WorkspaceRole | null {
  if (!role && role !== 0) return null;
  const r = String(role).trim().toUpperCase();
  if (r === 'PRODUCER' || r === '0') return 'PRODUCER';
  if (r === 'WRITER' || r === '1') return 'WRITER';
  if (r === 'ARTIST' || r === '2') return 'ARTIST';
  if (r === 'LETTERER' || r === '3') return 'LETTERER';
  if (r === 'EDITOR' || r === '4') return 'EDITOR';
  return null;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  createdAt: string;
  isOwner: boolean;
  currentUserRole?: WorkspaceRole | null;
  memberCount: number;
  pendingTasks: number;
}

export interface StudioMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarBg: string;
  role: StudioRole | string;
  roleKey?: RoleKey;
  assignedChapter?: string;
  assignedChapterNote?: string;
  status: 'Active' | 'Pending Invite' | 'On Leave' | string;
  isYou?: boolean;
  twoFactorActive?: boolean;
  cryptoKey?: string;
  permissions?: string[];
  activeTask?: string;
}

export interface ProvenanceLogItem {
  id: string;
  actor: string;
  action: string;
  timeAgo: string;
  details: string;
  hash: string;
  statusTag: string;
  statusTagColor: string;
  type: 'ai' | 'artist' | 'producer' | 'editorial' | 'audit';
}

export interface AssistantRosterItem {
  id: string;
  name: string;
  task: string;
  page: string;
  initials: string;
  avatarBg: string;
  status: 'active' | 'in-progress' | 'queued';
}
