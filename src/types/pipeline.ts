import { StudioRole, RoleKey, WorkspaceRole } from './auth';

export type KanbanStageKey =
  'script' | 'pencil' | 'ink' | 'color' | 'letter' | 'review' | 'approved';

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
  /** "Cần kiểm tra ảnh hưởng": đầu vào bị mở lại; chặn nộp/duyệt tới khi Editor/Producer quyết giữ hay làm lại. */
  impactReviewReason?: string | null;
}

/** POST .../assignments/{id}/transfer — chuyển giao trang/khung của việc cả chương (Artist/Letterer). */
export interface TransferAssignmentScopeRequest {
  targetType: 'Page' | 'Panel';
  targetIds: string[];
  newAssigneeUserId: string;
  reason: string;
  brief?: string | null;
  dueDate?: string | null;
}

/** POST .../assignments/{id}/impact-review — Keep giữ kết quả, Rework yêu cầu làm lại. */
export interface ResolveImpactReviewRequest {
  decision: 'Keep' | 'Rework';
  reason: string;
}

/** Việc cá nhân xuyên chương: GET /api/workspaces/{workspaceId}/my-assignments */
export interface WorkspaceAssignmentDto extends AssignmentDto {
  seriesTitle: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  /** "Cả chương" | "Trang 2 · Cảnh 3, 4" | "Trang 2 · Khung 1 · Cảnh 3" */
  scopeLabel?: string | null;
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

/** Giao hàng loạt theo AssignmentGranularity của stage. PageIds null/rỗng = mọi trang của chương. DryRun = true: xem trước */
export interface CreateBulkAssignmentRequest {
  pipelineStageId: string;
  assigneeUserId: string;
  brief: string;
  pageIds?: string[] | null;
  referenceNotes?: string | null;
  dueDate?: string | null;
  priority?: AssignmentPriority;
  dryRun?: boolean;
}

/** Một việc trong đợt giao hàng loạt */
export interface BulkAssignmentItemDto {
  entityType: WorkflowEntityType;
  targetEntityId: string;
  pageNumber?: number | null;
  conflictReason?: string | null;
  assignmentId?: string | null;
  dependsOnAssignmentIds?: string[] | null;
}

/** Kết quả giao việc hàng loạt (hoặc bản xem trước khi dryRun = true) */
export interface BulkAssignmentResultDto {
  batchId?: string | null;
  dryRun: boolean;
  granularity: WorkflowEntityType;
  createdCount: number;
  items: BulkAssignmentItemDto[];
}

/** Ứng viên nhận việc đã xếp hạng cho stage */
export interface AssigneeSuggestionDto {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  role: WorkspaceRole;
  activeAssignmentCount: number;
  overdueCount: number;
  stageExperienceCount: number;
  isSeriesMember: boolean;
  reasons: string[];
}

/** Một dòng của kế hoạch giao việc: stage + người nhận */
export interface AssignmentPlanStageRequest {
  pipelineStageId: string;
  assigneeUserId: string;
  brief?: string | null;
  pageIds?: string[] | null;
  dueDate?: string | null;
}

/** Giao nhiều stage một lần theo kế hoạch */
export interface CreateAssignmentPlanRequest {
  stages: AssignmentPlanStageRequest[];
  brief: string;
  referenceNotes?: string | null;
  dueDate?: string | null;
  priority?: AssignmentPriority;
  dryRun?: boolean;
}

/** Kết quả từng stage trong kế hoạch giao việc */
export interface AssignmentPlanStageResultDto {
  pipelineStageId: string;
  stageName: string;
  assigneeUserId: string;
  granularity?: WorkflowEntityType | null;
  skippedReason?: string | null;
  items: BulkAssignmentItemDto[];
}

/** Kết quả giao việc theo kế hoạch (hoặc xem trước khi dryRun = true) */
export interface AssignmentPlanResultDto {
  batchId?: string | null;
  dryRun: boolean;
  createdCount: number;
  stages: AssignmentPlanStageResultDto[];
}

/** Mẫu phân công từng stage từ chương trước */
export interface AssignmentPlanTemplateStageDto {
  pipelineStageId: string;
  stageName: string;
  stageOrder: number;
  assigneeUserId: string;
  assigneeName: string;
  brief?: string | null;
}

/** Mẫu giao việc lấy từ chương gần nhất của Series đã có việc */
export interface AssignmentPlanTemplateDto {
  sourceChapterId?: string | null;
  sourceChapterNumber?: number | null;
  stages: AssignmentPlanTemplateStageDto[];
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
  /** Revision script (mỗi Scene) mà lần nộp này dựa vào; rỗng với lần nộp cũ. */
  scriptRevisionIds?: string[];
}

export type ChangeRequestStatus = 'Open' | 'Resolved' | 'Verified' | 'Rejected' | number;
export type ChangeRequestLayer = 'Artwork' | 'Lettering';

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
  /** Neo nhận xét kịch bản: phân cảnh, dòng (null = cả phân cảnh) và nguyên văn tại lần nộp. */
  sceneId?: string | null;
  scriptLineId?: string | null;
  quotedText?: string | null;
  /** Trang của yêu cầu (BE suy ra từ khung / việc bị trả về). Chỉ có ở GET /chapters/{id}/change-requests. */
  pageId?: string | null;
  /** Công đoạn của việc bị trả về. Chỉ có ở GET /chapters/{id}/change-requests. */
  pipelineStageId?: string | null;
  groupId?: string | null;
  layer?: ChangeRequestLayer;
}

export interface ChangeRequestItemRequest {
  description: string;
  regionJson?: string;
  dueDate?: string;
  /** AssetReference.id của phiên bản artwork đang khoanh vùng. */
  assetReferenceId?: string;
  /** Panel thuộc một Page của Chapter; null/undefined nếu khoanh chung cả trang. */
  panelId?: string | null;
  groupId?: string;
  layer?: ChangeRequestLayer;
  sceneId?: string;
  /** Phải đi kèm sceneId của phân cảnh chứa dòng. */
  scriptLineId?: string;
  quotedText?: string;
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
  | 'AssignmentReady'
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
  /** V1.2 / SCR-07: Mô tả hướng vẽ / chỉ dẫn hình ảnh của Panel */
  direction?: string | null;
}

export interface PanelDetailDto extends PanelDto {
  scriptLineIds?: string[] | null;
}

export interface CreatePanelRequest {
  panelNumber?: number;
  readingOrder?: number;
  boundingBox?: string;
  direction?: string | null;
}

export interface PageLayoutDto {
  panels: PanelDto[];
  unassignedArtworkCount: number;
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

export interface SplitPanelDto {
  order: number;
  bbox: [number, number, number, number];
  /** Đỉnh [x, y] pixel ảnh gốc của khung; khác hình chữ nhật khi khung cắt chéo. BE cũ có thể không gửi. */
  polygon?: [number, number][] | null;
}

export interface SplitBubbleDto {
  panelOrder: number;
  bbox: [number, number, number, number];
  polygon: [number, number][];
}

export interface PanelSplitResult {
  width: number;
  height: number;
  panels: SplitPanelDto[];
  bubbles: SplitBubbleDto[];
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
  /** true = KHÔNG gọi AI (panel chưa có ảnh, không gắn nhân vật, hoặc nhân vật chưa có character sheet). */
  skipped?: boolean;
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

export type PanelVisualContinuityStatus =
  'Passed' | 'Warning' | 'Skipped' | 'Failed' | 'NotChecked';

export interface PanelVisualContinuityDto {
  panelId: string;
  panelNumber: number;
  status: PanelVisualContinuityStatus;
  result?: ImageConsistencyResultDto | null;
  error?: string | null;
}

export interface PageVisualContinuityDto {
  pageId: string;
  passed: number;
  warnings: number;
  skipped: number;
  failed: number;
  panels: PanelVisualContinuityDto[];
}

export type EditorQualityGate = 'all' | 'gate1' | 'gate2';

export interface EditorReviewQueueItemDto {
  assignmentId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  seriesId: string;
  seriesTitle: string;
  pipelineStageId: string;
  stageName: string;
  /** Định danh ổn định của công đoạn (vd. 'script', 'ink', 'letter') — dùng để rẽ nhánh, không dùng stageName. */
  stageSlug: string;
  stageOrder: number;
  stageColorCode: string;
  gate: 'gate1' | 'gate2';
  status: AssignmentStatus;
  entityType: WorkflowEntityType;
  targetEntityId?: string | null;
  scopeLabel: string;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  latestSubmissionId?: string | null;
  submissionAttempt: number;
  submittedAt?: string | null;
  isSelfSubmission: boolean;
  openChangeRequestsCount: number;
  dueDate?: string | null;
  priority: AssignmentPriority;
  createdAt: string;
  artworkReferenceIds?: string[];
}

// ==========================================
// Assignment Grid V3 (StageTask × StageTaskLot)
// ==========================================

export type StageTaskStatus =
  | 'Unassigned'
  | 'Assigned'
  | 'InProgress'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'ReworkRequired'
  | 'Cancelled';

export type StageTaskLotStatus = 'Active' | 'Completed' | 'Closed';

export interface TaskGridStageDto {
  id: string;
  name: string;
  stageOrder: number;
  track?: string | null;
  allowedRole?: WorkspaceRole | string | null;
  isApprovalGate: boolean;
  granularity: WorkflowEntityType;
  isEnabled: boolean;
  prerequisiteStageIds: string[];
}

export interface TaskGridPageDto {
  id: string;
  pageNumber: number;
}

export interface StageTaskDto {
  id: string;
  pipelineStageId: string;
  pageId?: string | null;
  status: StageTaskStatus;
  lotId?: string | null;
  assigneeUserId?: string | null;
  isInputOutdated: boolean;
  outdatedReason?: string | null;
  lastDecisionComment?: string | null;
  reopenReason?: string | null;
  attemptCount?: number;
  reviewerUserId?: string | null;
  isStartable: boolean;
  startedAt?: string | null;
  rowVersion: number;
}

export interface StageTaskLotDto {
  id: string;
  pipelineStageId: string;
  assigneeUserId: string;
  assignedRole: WorkspaceRole | string;
  brief?: string | null;
  dueDate?: string | null;
  status: StageTaskLotStatus;
  isOverdue: boolean;
  taskCount: number;
  approvedCount: number;
  rowVersion: number;
}

export interface TaskGridDto {
  chapterId: string;
  stages: TaskGridStageDto[];
  pages: TaskGridPageDto[];
  tasks: StageTaskDto[];
  lots: StageTaskLotDto[];
}

export interface GenerateStageTasksResultDto {
  created: number;
  cancelled: number;
  total: number;
}

export interface StageTaskLotRequest {
  pipelineStageId: string;
  assigneeUserId: string;
  taskIds: string[];
  brief?: string | null;
  dueDate?: string | null;
}

export interface AssignStageTaskLotsRequest {
  lots: StageTaskLotRequest[];
  dryRun?: boolean;
  reassign?: boolean;
}

export interface UpdateStageTaskLotRequest {
  brief?: string | null;
  dueDate?: string | null;
  clearDueDate?: boolean;
  /** `rowVersion` của lô lúc mở form (BR-11): lệch thì BE trả 409 thay vì đè. */
  expectedRowVersion?: number;
}

export interface AssignStageTaskLotsResultDto {
  dryRun: boolean;
  taskCount: number;
  lots: StageTaskLotDto[];
}

export interface SubmitStageTasksRequest {
  taskIds: string[];
}

export interface UnassignStageTasksRequest {
  taskIds: string[];
}

export interface ReopenStageTaskRequest {
  reason: string;
}

export interface ResolveStageTaskImpactRequest {
  keep: boolean;
}

export interface ReopenStageTaskResultDto {
  task: StageTaskDto;
  outdatedTaskIds: string[];
}

export interface RequestStageTaskChangesRequest {
  comment: string;
}

export type StageTaskSubmissionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Superseded';

export interface StageTaskSubmissionDto {
  id: string;
  attemptNumber: number;
  status: StageTaskSubmissionStatus | string;
  submittedByUserId: string;
  submittedAt: string;
  artworkReferenceIds: string[];
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  decisionComment?: string | null;
  /** JSON mảng SubmissionPanelDto lúc nộp (BR-01). */
  panelLayoutJson?: string | null;
  /** JSON { [pageId]: streamVersion } lúc nộp (BR-01). */
  canvasVersionsJson?: string | null;
  /** ID ScriptVersion mới nhất của chương lúc nộp (BR-01). */
  scriptVersionId?: string | null;
}

/** Parse an toàn panelLayoutJson từ StageTaskSubmissionDto; JSON hỏng/trống trả về []. */
export function parseStageTaskPanelLayout(panelLayoutJson?: string | null): SubmissionPanelDto[] {
  if (!panelLayoutJson || typeof panelLayoutJson !== 'string') return [];
  try {
    const parsed = JSON.parse(panelLayoutJson);
    if (!Array.isArray(parsed)) return [];
    const result: SubmissionPanelDto[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const id = typeof item.id === 'string' ? item.id : typeof item.Id === 'string' ? item.Id : '';
      const pageId =
        typeof item.pageId === 'string'
          ? item.pageId
          : typeof item.PageId === 'string'
            ? item.PageId
            : '';
      if (!id || !pageId) continue;
      result.push({
        id,
        pageId,
        panelNumber: Number(item.panelNumber ?? item.PanelNumber ?? 0) || 0,
        readingOrder: Number(item.readingOrder ?? item.ReadingOrder ?? 0) || 0,
        boundingBox: String(item.boundingBox ?? item.BoundingBox ?? ''),
      });
    }
    return result;
  } catch {
    return [];
  }
}

/** Parse an toàn canvasVersionsJson từ StageTaskSubmissionDto; JSON hỏng/trống trả về {}. */
export function parseStageTaskCanvasVersions(
  canvasVersionsJson?: string | null,
): Record<string, number> {
  if (!canvasVersionsJson || typeof canvasVersionsJson !== 'string') return {};
  try {
    const parsed = JSON.parse(canvasVersionsJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, number> = {};
    for (const [pageId, rawVer] of Object.entries(parsed)) {
      const ver = typeof rawVer === 'number' ? rawVer : Number(rawVer);
      if (pageId && Number.isFinite(ver)) {
        result[pageId] = ver;
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Clean Cutover (Lát cắt 4) ───────────────────────────────────────────────

/** Một ô công việc thuộc lô cá nhân xuyên chương (GET /api/workspaces/{workspaceId}/my-task-lots). */
export interface MyTaskCellDto {
  id: string;
  pageId?: string | null;
  /** null = ô cấp Chương */
  pageNumber?: number | null;
  status: StageTaskStatus;
  isStartable: boolean;
  isInputOutdated: boolean;
  outdatedReason?: string | null;
  lastDecisionComment?: string | null;
  reopenReason?: string | null;
  attemptCount?: number;
}

/** Một lô công việc của người gọi xuyên chương (thay my-assignments V2). */
export interface MyTaskLotDto {
  id: string;
  seriesId: string;
  seriesTitle: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  pipelineStageId: string;
  stageName: string;
  stageOrder: number;
  stageColorCode?: string | null;
  assignedRole: WorkspaceRole | string;
  brief?: string | null;
  dueDate?: string | null;
  status: StageTaskLotStatus;
  isOverdue: boolean;
  tasks: MyTaskCellDto[];
}

/** Ô chờ duyệt (Submitted / UnderReview) trong Workspace (GET /api/workspaces/{workspaceId}/task-grid/review-queue). */
export interface TaskGridReviewItemDto {
  taskId: string;
  seriesId: string;
  seriesTitle: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  pipelineStageId: string;
  stageName: string;
  pageId?: string | null;
  pageNumber?: number | null;
  status: StageTaskStatus;
  assigneeUserId?: string | null;
  reviewerUserId?: string | null;
  reviewerName?: string | null;
  isInputOutdated?: boolean;
  attemptNumber?: number | null;
  submittedAt?: string | null;
}

export interface MigrateSkippedDto {
  assignmentId: string;
  chapterId: string;
  reason: string;
}

/** Kết quả chuyển Assignment V2 sang Lưới V3 (POST /api/series/{seriesId}/task-grid/migrate-assignments). */
export interface MigrateAssignmentsResultDto {
  migrated: number;
  cellsAssigned: number;
  skipped: MigrateSkippedDto[];
}

/** Lấy nhận xét lần duyệt gần nhất từ danh sách lịch sử nộp của ô (mới nhất trước). */
export function pickLatestDecisionComment(
  submissions?: StageTaskSubmissionDto[] | null,
): string | null {
  if (!Array.isArray(submissions) || submissions.length === 0) return null;
  const ordered = [...submissions].sort((a, b) => b.attemptNumber - a.attemptNumber);
  const rejected = ordered.find(
    (s) => String(s.status) === 'Rejected' && Boolean(s.decisionComment?.trim()),
  );
  if (rejected?.decisionComment?.trim()) return rejected.decisionComment.trim();
  const anyComment = ordered.find((s) => Boolean(s.decisionComment?.trim()));
  return anyComment?.decisionComment?.trim() ?? null;
}

export interface ReworkReasonDisplay {
  kind: 'reopen' | 'decision';
  text: string;
}

/**
 * Xác định lý do hiển thị cho ô ReworkRequired: ưu tiên reopenReason (Producer mở lại / sửa thoại),
 * sau đó mới tới lastDecisionComment (hoặc nhận xét lấy từ lịch sử nộp).
 */
export function resolveReworkReasonDisplay(
  cell: {
    status?: string | null;
    reopenReason?: string | null;
    lastDecisionComment?: string | null;
  },
  fallbackComment?: string | null,
): ReworkReasonDisplay | null {
  if (String(cell.status) !== 'ReworkRequired') return null;
  const reopen = cell.reopenReason?.trim();
  if (reopen) return { kind: 'reopen', text: reopen };
  const decision = cell.lastDecisionComment?.trim() || fallbackComment?.trim();
  if (decision) return { kind: 'decision', text: decision };
  return null;
}

/**
 * Bổ sung lastDecisionComment cho các ô đang ReworkRequired khi DTO lưới chưa trả sẵn.
 */
export async function resolveReworkDecisionComments(
  chapterId: string,
  cells: Array<{
    id: string;
    status?: string | null;
    lastDecisionComment?: string | null;
    reopenReason?: string | null;
  }>,
  fetchSubmissions?: (chapterId: string, taskId: string) => Promise<StageTaskSubmissionDto[]>,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const c of cells) {
    if (String(c.status) !== 'ReworkRequired') continue;
    if (c.reopenReason?.trim()) continue;
    const inline = c.lastDecisionComment?.trim();
    if (inline) result[c.id] = inline;
    else missing.push(c.id);
  }
  if (missing.length === 0 || typeof fetchSubmissions !== 'function') {
    return result;
  }
  await Promise.all(
    missing.map(async (taskId) => {
      try {
        const subs = await fetchSubmissions(chapterId, taskId);
        const comment = pickLatestDecisionComment(subs);
        if (comment) result[taskId] = comment;
      } catch {
        // Bỏ qua lỗi lẻ để lưới vẫn hiển thị bình thường
      }
    }),
  );
  return result;
}
