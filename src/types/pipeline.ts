import { StudioRole, RoleKey, WorkspaceRole } from './auth';

export type KanbanStageKey =
  'script' | 'thumbnail' | 'pencil' | 'ink' | 'color' | 'letter' | 'review' | 'approved';

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

// ==========================================
// CF2: UC-05 Assignment & StageProgress Types
// ==========================================

export type WorkflowEntityType = 'Chapter' | 'Page' | 'Panel';

export type AssignmentPriority = 'Low' | 'Medium' | 'High' | 'Urgent' | number;

export type AssignmentStatus =
  | 'Assigned'
  | 'InProgress'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'ReworkRequired'
  | 'Blocked'
  | number;

export interface AssignmentDto {
  id: string;
  seriesId: string;
  chapterId: string;
  entityType: WorkflowEntityType;
  targetEntityId: string;
  pipelineStageId: string;
  assigneeUserId: string;
  assignedRole: WorkspaceRole;
  brief: string;
  referenceNotes?: string | null;
  dueDate?: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  dependsOnAssignmentId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lastFeedbackComment?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateAssignmentRequest {
  entityType: WorkflowEntityType;
  targetEntityId?: string | null;
  pipelineStageId: string;
  assigneeUserId: string;
  brief: string;
  referenceNotes?: string | null;
  dueDate?: string | null;
  priority?: AssignmentPriority;
  dependsOnAssignmentId?: string | null;
}

export interface UpdateAssignmentRequest {
  brief: string;
  referenceNotes?: string | null;
  dueDate?: string | null;
  priority: AssignmentPriority;
  assigneeUserId: string;
  dependsOnAssignmentId?: string | null;
}

export type StageProgressStatus =
  'InProgress' | 'Submitted' | 'InReview' | 'ChangesRequested' | 'Approved' | number;

export interface StageProgressDto {
  id: string;
  pageId: string;
  panelId: string;
  pipelineStageId: string;
  status: StageProgressStatus;
  submittedAt?: string | null;
  submittedByUserId?: string | null;
  updatedAt?: string | null;
}

// ==========================================
// CF3: Submissions & Change Requests Types
// ==========================================

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Superseded' | number;

export interface SubmissionDto {
  id: string;
  assignmentId: string;
  chapterId: string;
  submittedByUserId: string;
  attemptNumber: number;
  status: SubmissionStatus;
  submittedAt: string;
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  decisionComment?: string | null;
}

export type ChangeRequestStatus = 'Open' | 'Resolved' | 'Verified' | 'Rejected' | number;

export interface ChangeRequestDto {
  id: string;
  assignmentId: string;
  chapterId: string;
  submissionId?: string | null;
  responsibleUserId: string;
  createdByUserId: string;
  description: string;
  regionJson?: string | null;
  dueDate?: string | null;
  status: ChangeRequestStatus;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  reviewerComment?: string | null;
  closedByUserId?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ChangeRequestItemRequest {
  description: string;
  regionJson?: string;
  dueDate?: string;
}

export interface RequestAssignmentChangesRequest {
  comment: string;
  changes?: ChangeRequestItemRequest[];
}

// ==========================================
// CF2: Artwork Assets Types
// ==========================================

export interface AssetReferenceDto {
  id: string;
  assetId: string;
  chapterId: string;
  pageId: string;
  pipelineStageId: string;
  versionNumber: number;
  layerType?: string | null;
  fileName: string;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp' | string;
  sizeBytes: number;
  sha256: string;
  reused: boolean;
  uploadedByUserId: string;
  createdAt: string;
}

export interface ArtworkAccessLinkDto {
  url: string;
  expiresAtUtc: string;
}

// ==========================================
// Notifications Types (UC-14 / BR-14)
// ==========================================

export type NotificationType =
  | 'AssignmentAssigned'
  | 'AssignmentUnassigned'
  | 'AssignmentUpdated'
  | 'AssignmentSubmitted'
  | 'AssignmentApproved'
  | 'AssignmentChangesRequested'
  | 'ChangeRequestResolved'
  | 'ChangeRequestReopened'
  | string;

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  assignmentId?: string | null;
  chapterId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  totalCount: number;
  unreadCount: number;
  pageIndex: number;
  pageSize: number;
}
