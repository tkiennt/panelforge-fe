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
  stageName?: string;
  stageOrder?: number;
  assigneeUserId: string;
  assignedRole: WorkspaceRole;
  brief: string;
  referenceNotes?: string | null;
  dueDate?: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  dependsOnAssignmentId?: string | null;
  dependsOnAssignmentIds?: string[];
  startedAt?: string | null;
  completedAt?: string | null;
  lastFeedbackComment?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

/** Việc cá nhân xuyên chương: GET /api/workspaces/{workspaceId}/my-assignments */
export interface WorkspaceAssignmentDto extends AssignmentDto {
  seriesTitle: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  stageName: string;
  stageOrder: number;
  stageColorCode?: string | null;
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
  dependsOnAssignmentIds?: string[];
}

export interface UpdateAssignmentRequest {
  brief: string;
  referenceNotes?: string | null;
  dueDate?: string | null;
  priority: AssignmentPriority;
  assigneeUserId: string;
  dependsOnAssignmentId?: string | null;
  dependsOnAssignmentIds?: string[];
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

/** Bố cục một khung chụp lúc nộp (BR-01): lần nộp cũ không đổi khi khung bị xoá/đổi toạ độ sau đó. */
export interface SubmissionPanelDto {
  id: string;
  pageId: string;
  panelNumber: number;
  readingOrder: number;
  boundingBox: string;
}

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
  /** Phiên bản artwork (AssetReference.id) đúng của lần nộp này; rỗng với việc không có artwork / lần nộp cũ. */
  artworkReferenceIds?: string[];
  /** Version của chương lúc nộp (revision script). */
  chapterVersion?: number;
  /** Bố cục khung lúc nộp; mảng rỗng với lần nộp có trước bản sửa BE và việc không có Panel. */
  panelLayout?: SubmissionPanelDto[];
  /** pageId → version canvas (event stream) lúc nộp; dùng dựng lại lớp chữ của việc Letter. Rỗng với lần nộp cũ. */
  canvasVersions?: Record<string, number>;
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
  /** Phiên bản artwork mà vùng khoanh (regionJson) thuộc về; null = không gắn ảnh cụ thể. */
  assetReferenceId?: string | null;
  /** Panel thuộc một Page của Chapter; null/undefined nếu khoanh chung cả trang. */
  panelId?: string | null;
}

export interface ChangeRequestItemRequest {
  description: string;
  regionJson?: string;
  dueDate?: string;
  /** AssetReference.id của phiên bản artwork đang khoanh vùng. */
  assetReferenceId?: string;
  /** Panel thuộc một Page của Chapter; null/undefined nếu khoanh chung cả trang. */
  panelId?: string | null;
}

export interface RequestAssignmentChangesRequest {
  comment: string;
  changes?: ChangeRequestItemRequest[];
  /** Chống quyết định nhầm: id của lần nộp Pending đang xem; lệch → 409. */
  expectedSubmissionId?: string;
}

export interface ApproveAssignmentRequest {
  /** Chống quyết định nhầm: id của lần nộp Pending đang xem; lệch → 409. */
  expectedSubmissionId?: string;
}

export interface ReturnWorkFromReviewRequest {
  targetAssignmentId: string;
  description: string;
  regionJson?: string;
  panelId?: string;
  assetReferenceId?: string;
  dueDate?: string;
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
  /** Ảnh cho một Panel; null/undefined = artwork cả trang. */
  panelId?: string | null;
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
  | 'ChapterReadyForPublication'
  | 'ChapterReopened'
  | 'ChapterPublished'
  | 'AssignmentDueSoon'
  | 'AssignmentOverdue'
  | 'ChangeRequestDueSoon'
  | 'ChangeRequestOverdue'
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

export interface PanelDto {
  id: string;
  pageId: string;
  panelNumber: number;
  boundingBox: string;
  readingOrder: number;
  currentStageId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  sceneId?: string | null;
  /** BR-11 / CF4 4.2: gửi lại làm expectedVersion khi sửa toạ độ (thiếu ở BE cũ). */
  version?: number;
}

export interface PanelDetailDto extends PanelDto {
  scriptLineIds?: string[] | null;
}

export interface CreatePanelRequest {
  panelNumber?: number;
  readingOrder?: number;
  boundingBox?: string;
}

export interface UpdatePanelCoordinatesRequest {
  boundingBox: string;
  readingOrder?: number;
  /** Version panel lúc tải (BR-11). Lệch → 409 CONFLICT; bỏ trống = không kiểm (hàng chờ ngoại tuyến). */
  expectedVersion?: number;
}

export interface AssignPanelSceneRequest {
  sceneId: string | null;
}

export interface AssignPanelScriptLinesRequest {
  scriptLineIds: string[];
}

// ==========================================
// CF3: Consistency Check (kiểm tra nhất quán bằng code)
// ==========================================

export type ConsistencyFindingSeverity = 'Info' | 'Warning' | 'Blocking';

export type ConsistencyFindingStatus =
  'Open' | 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification' | 'Resolved' | 'Stale';

export interface ConsistencyFindingDto {
  id: string;
  chapterId: string;
  ruleCode: string;
  consistencyRuleId?: string | null;
  severity: ConsistencyFindingSeverity;
  message: string;
  evidence?: string | null;
  sceneId?: string | null;
  scriptLineId?: string | null;
  bibleEntryId?: string | null;
  status: ConsistencyFindingStatus;
  triageNote?: string | null;
  triagedByUserId?: string | null;
  triagedAt?: string | null;
  lastDetectedAt: string;
  createdAt: string;
}

export interface ConsistencyCheckResultDto {
  chapterId: string;
  checkedAt: string;
  newCount: number;
  openCount: number;
  blockingOpenCount: number;
  clearedCount: number;
  findings: ConsistencyFindingDto[];
}

export interface VisualDeviationDto {
  findingId: string;
  chapterId: string;
  characterId: string;
  characterName: string;
  characterSheetVersion?: number | null;
  characterSheetImageUrl?: string | null;
  pageId?: string | null;
  pageNumber?: number | null;
  panelId?: string | null;
  panelNumber?: number | null;
  assetReferenceId?: string | null;
  artworkUrl?: string | null;
  similarityScore: number;
  threshold: number;
  isDeviation: boolean;
  severity: ConsistencyFindingSeverity;
  message: string;
  status: ConsistencyFindingStatus;
  triageNote?: string | null;
  triagedByUserId?: string | null;
  triagedByUserName?: string | null;
  triagedAt?: string | null;
  detectedAt: string;
  detailedDeviations?: ImageConsistencyDeviationDto[] | null;
  summaryReason?: string | null;
  revisionRef?: string | null;
}

export interface ImageConsistencyDeviationDto {
  aspect: string;
  description: string;
  regionHint?: string | null;
}

export interface ImageConsistencyResultDto {
  panelId: string;
  characterId?: string | null;
  characterName?: string | null;
  characterSheetVersion?: number | null;
  score: number;
  threshold: number;
  passed: boolean;
  summaryReason?: string | null;
  deviations: ImageConsistencyDeviationDto[];
  findingId?: string | null;
  revisionRef?: string | null;
  assetReferenceId?: string | null;
  artworkUrl?: string | null;
  characterSheetUrl?: string | null;
}

export interface VisualConsistencyReportDto {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  checkedAt: string;
  threshold: number;
  totalEvaluated: number;
  passedCount: number;
  deviationCount: number;
  openDeviationCount: number;
  blockingDeviationCount: number;
  deviations: VisualDeviationDto[];
}
