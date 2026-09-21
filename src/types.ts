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
export type BibleCategory =
  | 'all'
  | 'characters'
  | 'locations'
  | 'cyberware'
  | 'lore'
  | 'style'
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

export type StudioRole = 'Lead Producer' | 'Artist / Inker' | 'Writer' | 'Reviewer / Editor';
export type RoleKey = 'producer' | 'artist' | 'writer' | 'reviewer';

export type SystemRole =
  'ADMINISTRATOR' | 'PRODUCER' | 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR' | 'READER';

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  roles: SystemRole[];
}

export function normalizeSystemRole(role: any): SystemRole {
  if (!role) return 'ARTIST';
  const r = String(role).trim().toUpperCase();
  if (r === '0' || r === 'ADMIN' || r === 'ADMINISTRATOR') return 'ADMINISTRATOR';
  if (r === '1' || r === 'PRODUCER') return 'PRODUCER';
  if (r === '2' || r === 'WRITER') return 'WRITER';
  if (r === '3' || r === 'ARTIST') return 'ARTIST';
  if (r === '4' || r === 'LETTERER') return 'LETTERER';
  if (r === '5' || r === 'EDITOR') return 'EDITOR';
  if (r === '6' || r === 'READER') return 'READER';
  return 'ARTIST';
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
