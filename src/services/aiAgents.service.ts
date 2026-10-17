// src/services/aiAgents.service.ts
// Trợ lý AI trong màn làm việc của từng role (BE: AiAgentsController). Mỗi nhiệm vụ (workflowType) chạy một tập agent
// riêng. AI chỉ ĐỀ XUẤT; người có quyền quyết định Accept / Reject / RequestChanges.
import axiosClient from '../api/axiosClient';

export type AiRunStatus =
  'Queued' | 'Running' | 'WaitingForHuman' | 'Completed' | 'Failed' | 'Interrupted';
/** Supervisor = Gemini điều phối (không phải ProducerAgent); 7 agent còn lại là agent chuyên môn. */
export type AiAgentName =
  | 'Supervisor'
  | 'Writer'
  | 'Continuity'
  | 'Storyboard'
  | 'Artist'
  | 'Letterer'
  | 'Editor'
  | 'Producer';
export type WorkerAgentName = Exclude<AiAgentName, 'Supervisor'>;
export type AiSuggestionStatus = 'Pending' | 'Accepted' | 'Rejected' | 'ChangesRequested';
/** Chỉ các loại KẾT QUẢ ÁP DỤNG ĐƯỢC mới là suggestion; báo cáo Editor/Producer nằm trong output của step. */
export type AiSuggestionKind = 'Script' | 'Layout' | 'ImagePrompt' | 'Lettering';
export type ContentRevisionKind = 'Script' | 'Layout' | 'ImagePrompt';
export type ReadingDirection = 'LeftToRight' | 'RightToLeft';
/** Nhiệm vụ = loại workflow. Run tạo trước khi có loại workflow được BE trả là FullScene. */
export type AiWorkflowType =
  'FullScene' | 'Script' | 'Storyboard' | 'Artist' | 'Letterer' | 'Editor' | 'Producer';
export type WorkspaceRoleName = 'Producer' | 'Writer' | 'Artist' | 'Letterer' | 'Editor';

// ── Payload của từng agent (output của step) ─────────────────────────────────
/** Quyết định điều phối: gọi agent nào tiếp theo. allowedActions do CODE tính (hàng rào); guardrailOverridden = code ghi đè lựa chọn sai. */
export interface SupervisorDecision {
  schemaVersion: number;
  runId: string;
  round: number;
  action: WorkerAgentName | 'StopForHuman' | 'Finish' | string;
  reason: string;
  instruction?: string | null;
  allowedActions: string[];
  guardrailOverridden: boolean;
}
export interface ScriptDraftLine {
  lineId: string;
  order: number;
  speakerId?: string | null;
  dialogue?: string | null;
  stageDirection?: string | null;
}
export interface ScriptDraft {
  schemaVersion: number;
  runId: string;
  sceneId: string;
  round: number;
  lines: ScriptDraftLine[];
  bibleRevisionIds: string[];
  revisionNotes?: string | null;
}
export interface BibleEvidence {
  bibleEntryId: string;
  bibleRevisionId: string;
  quote: string;
}
export interface ContinuityFinding {
  findingId: string;
  severity: 'Blocking' | 'Warning' | 'Info' | string;
  category: string;
  description: string;
  scriptLineIds: string[];
  evidence: BibleEvidence[];
  suggestedFix?: string | null;
}
export interface ContinuityReport {
  schemaVersion: number;
  runId: string;
  round: number;
  findings: ContinuityFinding[];
  summary: string;
}
export interface LayoutPanel {
  panelNumber: number;
  readingOrder: number;
  bbox: { x: number; y: number; w: number; h: number };
  coordinateSpace: string;
  camera: string;
  description: string;
  characterIds: string[];
  sourceScriptLineIds: string[];
}
export interface LayoutPage {
  pageNumber: number;
  panels: LayoutPanel[];
}
export interface StoryboardLayout {
  schemaVersion: number;
  runId: string;
  sceneId: string;
  readingDirection: string;
  pages: LayoutPage[];
  notes?: string | null;
}
export interface ReviewReport {
  schemaVersion: number;
  runId: string;
  verdict: 'Approve' | 'ApproveWithChanges' | 'RequestChanges' | string;
  summary: string;
  checklist: { name: string; passed: boolean; detail: string }[];
  items: { target: string; severity: string; comment: string; scriptLineIds: string[] }[];
  draftRejectComment?: string | null;
}
/** Prompt ảnh cho một panel. panelId/referenceIds do CODE kiểm từ context (Bible hiệu lực tại chương). */
export interface ArtistPanelPrompt {
  panelId: string;
  pageNumber: number;
  panelNumber: number;
  prompt: string;
  referenceIds: string[];
  consistencyNotes?: string | null;
}
export interface ArtistPromptSet {
  schemaVersion: number;
  runId: string;
  sceneId: string;
  layoutRevisionId: string;
  panels: ArtistPanelPrompt[];
  styleSummary?: string | null;
}
/** Đề xuất rút gọn thoại. maxChars/limitSource là ƯỚC LƯỢNG do code tính, không phải kết quả render. */
export interface LetteringSuggestion {
  sourceScriptLineId: string;
  targetElementId?: string | null;
  panelId?: string | null;
  originalText: string;
  suggestedText: string;
  reason: string;
  maxChars: number;
  limitSource: 'element-estimate' | 'panel-estimate' | string;
  withinEstimatedLimit: boolean;
}
export interface LetteringSuggestionSet {
  schemaVersion: number;
  runId: string;
  sceneId: string;
  suggestions: LetteringSuggestion[];
  summary?: string | null;
}
export interface ProgressFact {
  key: string;
  text: string;
}
export interface ProductionReport {
  schemaVersion: number;
  runId: string;
  headline: string;
  summary: string;
  risks: { severity: string; description: string; sourceFactKeys: string[] }[];
  recommendations: {
    action: string;
    rationale: string;
    sourceFactKeys: string[];
    suggestedOwnerRole?: string | null;
  }[];
  dataGaps: string[];
  facts: ProgressFact[];
}

// ── DTO của BE ────────────────────────────────────────────────────────────────
export interface AiStepDto {
  id: string;
  stepIndex: number;
  agent: AiAgentName;
  round: number;
  parentStepId?: string | null;
  status: 'Succeeded' | 'Failed';
  provider: string;
  model: string;
  promptVersion: string;
  promptRef: string;
  parameters?: Record<string, unknown> | null;
  input?: Record<string, unknown> | null;
  output?: unknown | null;
  startedAtUtc: string;
  completedAtUtc: string;
  durationMs: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  repairAttempts: number;
  errorCode?: string | null;
  errorMessage?: string | null;
}
export interface AiDecisionDto {
  id: string;
  decision: AiSuggestionStatus;
  decidedByUserId: string;
  reason?: string | null;
  decidedAtUtc: string;
  chapterVersionAtDecision: number;
  resultRevisionId?: string | null;
  modificationLevel: string;
}
export interface AiSuggestionDto {
  id: string;
  runId: string;
  stepId: string;
  sceneId: string;
  kind: AiSuggestionKind;
  status: AiSuggestionStatus;
  summary: string;
  payload?: unknown | null;
  payloadHash: string;
  baseChapterVersion: number;
  baseScriptRevisionId?: string | null;
  bibleRevisionIds: string[];
  parentSuggestionId?: string | null;
  hasBlockingFindings: boolean;
  createdAt: string;
  decisions: AiDecisionDto[];
  /** Vai trò Workspace được quyết định loại đề xuất này (BE trả; BE cũ không có → coi như không giới hạn ở UI, BE vẫn kiểm). */
  decisionRoles?: WorkspaceRoleName[];
  /** BE tính: người đang xem có thể Accept/Reject/RequestChanges ngay lúc này. Thiếu (BE cũ) → UI hiểu là có thể. */
  canDecide?: boolean;
}
export interface AiRunDto {
  id: string;
  seriesId: string;
  chapterId: string;
  /** Null với báo cáo cấp Chapter (Producer). */
  sceneId?: string | null;
  requestedByUserId: string;
  status: AiRunStatus;
  provider: string;
  model: string;
  brief: string;
  readingDirection: ReadingDirection;
  revisionRounds: number;
  maxRevisionRounds: number;
  baseChapterVersion: number;
  baseScriptRevisionId?: string | null;
  bibleRevisionIds: string[];
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  lastActivityAtUtc: string;
  completedAtUtc?: string | null;
  steps: AiStepDto[];
  suggestions: AiSuggestionDto[];
  /** Thiếu ở BE cũ → coi là FullScene (run cũ vẫn hiển thị được). */
  workflowType?: AiWorkflowType;
}
export interface ContentRevisionDto {
  id: string;
  kind: ContentRevisionKind;
  versionNumber: number;
  summary: string;
  contentHash: string;
  previousRevisionId?: string | null;
  sourceSuggestionId?: string | null;
  mapping?: unknown | null;
  createdAt: string;
}
export interface SceneLite {
  id: string;
  chapterId: string;
  sceneNumber: number;
  heading?: string | null;
  summary?: string | null;
}
export interface RunWorkflowRequest {
  chapterId: string;
  /** Bắt buộc với mọi nhiệm vụ nội dung; bỏ trống với Producer (báo cáo cấp Chapter). */
  sceneId?: string | null;
  brief: string;
  readingDirection: ReadingDirection;
  chapterVersion: number;
  baseScriptRevisionId?: string | null;
  /** Không gửi = FullScene. Quyền do Backend tự xác định; FE không gửi role hay danh sách agent. */
  workflowType?: AiWorkflowType;
}
export interface RunWorkflowResponse {
  runId: string;
  status: AiRunStatus;
  provider: string;
  model: string;
}
export interface ReviewResponse {
  suggestionId: string;
  status: AiSuggestionStatus;
  decisionId: string;
  resultRevisionId?: string | null;
  chapterVersion: number;
}
/** Một điều kiện còn thiếu để chạy nhiệm vụ. Kind: Permission | Config | State | Context. */
export interface AiMissingCondition {
  code: string;
  kind: 'Permission' | 'Config' | 'State' | 'Context' | string;
  message: string;
}
export interface AiWorkflowAvailability {
  workflowType: AiWorkflowType;
  title: string;
  description: string;
  agents: WorkerAgentName[];
  requiredRoles: WorkspaceRoleName[];
  /** Các loại đề xuất áp dụng được, hoặc ['Report'] = báo cáo tham khảo (không có Accept/Reject). */
  resultKinds: (AiSuggestionKind | 'Report')[];
  canRun: boolean;
  missing: AiMissingCondition[];
}
export interface AiWorkflowAvailabilityResponse {
  yourRole?: WorkspaceRoleName | null;
  chapterId: string;
  sceneId?: string | null;
  workflows: AiWorkflowAvailability[];
}

/** Lỗi API có mã máy đọc được: AI_UNAVAILABLE (503), CONFLICT (409), AI_DISABLED / FORBIDDEN (403)... */
// ── CF4: lịch sử AI run, so sánh revision, Provenance Report ──

export interface AiRunSummaryDto {
  id: string;
  chapterId: string;
  sceneId?: string | null;
  requestedByUserId: string;
  status: AiRunStatus;
  workflowType: AiWorkflowType;
  provider: string;
  model: string;
  brief: string;
  revisionRounds: number;
  maxRevisionRounds: number;
  baseChapterVersion: number;
  errorCode?: string | null;
  createdAt: string;
  lastActivityAtUtc: string;
  completedAtUtc?: string | null;
  stepCount: number;
  suggestionCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface AiRunHistoryResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: AiRunSummaryDto[];
}

export interface AiRunHistoryFilter {
  chapterId?: string;
  sceneId?: string;
  status?: AiRunStatus;
  workflowType?: AiWorkflowType;
  page?: number;
  pageSize?: number;
}

export type DiffChangeType = 'Added' | 'Removed' | 'Modified' | 'Moved';

export interface RevisionDiffEntry {
  /** Script: `line:{lineId}`; loại khác: khoá JSON hoặc `[i]`; `$` = toàn bộ. */
  path: string;
  changeType: DiffChangeType;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface RevisionSideDto {
  id: string;
  versionNumber: number;
  kind: ContentRevisionKind;
  summary: string;
  contentHash: string;
  sourceSuggestionId?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface RevisionDiffResponse {
  left: RevisionSideDto;
  right: RevisionSideDto;
  differences: RevisionDiffEntry[];
  leftPayload?: unknown;
  rightPayload?: unknown;
}

export type ProvenanceNodeType =
  'Run' | 'Step' | 'Suggestion' | 'Decision' | 'Revision' | 'Snapshot';

export interface ProvenanceNode {
  nodeType: ProvenanceNodeType;
  id: string;
  timestamp: string;
  summary: string;
  /** Trường provenance theo loại node (model, promptRef, người quyết, mức sửa, hash...). */
  details?: Record<string, unknown> | null;
}

export interface ProvenanceEdge {
  fromId: string;
  toId: string;
  relationship: string;
}

export interface ProvenanceStats {
  totalRuns: number;
  totalSteps: number;
  totalSuggestions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  pendingSuggestions: number;
  modifiedByHumanDecisions: number;
  totalRevisions: number;
  aiOriginatedRevisions: number;
  manualRevisions: number;
  totalSnapshots: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
}

export type ProvenanceEventType =
  | 'RunStarted'
  | 'RunCompleted'
  | 'RunFailed'
  | 'StepCompleted'
  | 'SuggestionCreated'
  | 'DecisionMade'
  | 'RevisionCreated'
  | 'SnapshotCreated';

export interface ProvenanceTimelineEntry {
  timestamp: string;
  eventType: ProvenanceEventType;
  summary: string;
  entityId: string;
  relatedRunId?: string | null;
}

export interface ProvenanceReportResponse {
  chapterId: string;
  sceneId?: string | null;
  generatedAtUtc: string;
  stats: ProvenanceStats;
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  timeline: ProvenanceTimelineEntry[];
}

export class AiApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function toError(error: any, fallback: string): AiApiError {
  const data = error?.response?.data;
  const message = data?.error || data?.message || fallback;
  return new AiApiError(message, data?.code, error?.response?.status);
}

export const isActiveRun = (status?: AiRunStatus) => status === 'Queued' || status === 'Running';

/** Run cũ (BE chưa có loại workflow) = FullScene. */
export const workflowOf = (run?: Pick<AiRunDto, 'workflowType'> | null): AiWorkflowType =>
  run?.workflowType ?? 'FullScene';

export const aiAgentsService = {
  /** Chạy một nhiệm vụ AI. Quyền (vai trò, assignment, chương khoá, context) do Backend kiểm; thiếu điều kiện → 403/409 kèm lý do. */
  async runWorkflow(seriesId: string, body: RunWorkflowRequest): Promise<RunWorkflowResponse> {
    try {
      const res = await axiosClient.post(`/series/${seriesId}/ai/workflows/run`, body);
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể chạy workflow AI.');
    }
  },

  /** Nhiệm vụ nào người dùng này chạy được trong Chapter/Scene này và còn thiếu điều kiện gì (Backend tính). */
  async getWorkflowAvailability(
    seriesId: string,
    chapterId: string,
    sceneId?: string | null,
  ): Promise<AiWorkflowAvailabilityResponse> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/ai/workflows/availability`, {
        params: sceneId ? { chapterId, sceneId } : { chapterId },
      });
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể tải danh sách nhiệm vụ AI.');
    }
  },

  async getRun(seriesId: string, runId: string): Promise<AiRunDto> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/ai/runs/${runId}`);
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể tải trạng thái run.');
    }
  },

  async getSuggestions(
    seriesId: string,
    params?: { status?: AiSuggestionStatus; runId?: string },
  ): Promise<AiSuggestionDto[]> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/ai/suggestions`, { params });
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể tải danh sách đề xuất.');
    }
  },

  async getSceneRevisions(seriesId: string, sceneId: string): Promise<ContentRevisionDto[]> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/ai/scenes/${sceneId}/revisions`);
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể tải lịch sử revision.');
    }
  },

  /** CF4: lịch sử AI run của Series, mới nhất trước (thành viên Workspace). */
  async getRunHistory(
    seriesId: string,
    filter: AiRunHistoryFilter = {},
  ): Promise<AiRunHistoryResponse> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/ai/runs`, { params: filter });
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể tải lịch sử AI.');
    }
  },

  /** CF4 / UC-18: so sánh hai revision cùng loại của một Scene (script so theo từng dòng). */
  async compareRevisions(
    seriesId: string,
    sceneId: string,
    left: string,
    right: string,
  ): Promise<RevisionDiffResponse> {
    try {
      const res = await axiosClient.get(
        `/series/${seriesId}/ai/scenes/${sceneId}/revisions/compare`,
        {
          params: { left, right },
        },
      );
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể so sánh hai revision.');
    }
  },

  /** CF4 / UC-19: Provenance Report của chương (Producer; Editor chỉ đọc). Lọc thêm theo Scene nếu cần. */
  async getProvenanceReport(
    seriesId: string,
    chapterId: string,
    sceneId?: string,
  ): Promise<ProvenanceReportResponse> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/ai/chapters/${chapterId}/provenance`, {
        params: sceneId ? { sceneId } : undefined,
      });
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể tải Provenance Report.');
    }
  },

  async getScenesByChapter(chapterId: string): Promise<SceneLite[]> {
    try {
      const res = await axiosClient.get(`/chapters/${chapterId}/scenes`);
      return res.data ?? [];
    } catch (e) {
      throw toError(e, 'Không thể tải danh sách Scene.');
    }
  },

  /** decision: accept | reject | request-changes. Accept bắt buộc chapterVersion hiện tại (sai → 409). */
  async review(
    seriesId: string,
    suggestionId: string,
    decision: 'accept' | 'reject' | 'request-changes',
    body: { reason?: string; chapterVersion?: number },
  ): Promise<ReviewResponse> {
    try {
      const res = await axiosClient.post(
        `/series/${seriesId}/ai/suggestions/${suggestionId}/${decision}`,
        body,
      );
      return res.data;
    } catch (e) {
      throw toError(e, 'Không thể ghi quyết định.');
    }
  },
};

/** Revision script mới nhất của Scene → baseScriptRevisionId cho lần chạy kế (null nếu chưa có). */
export function latestScriptRevisionId(revisions: ContentRevisionDto[]): string | null {
  const scripts = revisions.filter((r) => r.kind === 'Script');
  if (scripts.length === 0) return null;
  return scripts.reduce((a, b) => (b.versionNumber > a.versionNumber ? b : a)).id;
}

/** Step Writer liền trước (để so sánh lượt sửa) — dùng cho phần "đã sửa" trong UI. */
export function previousWriterStep(steps: AiStepDto[], current: AiStepDto): AiStepDto | undefined {
  return [...steps]
    .filter((s) => s.agent === 'Writer' && s.stepIndex < current.stepIndex && s.output)
    .sort((a, b) => b.stepIndex - a.stepIndex)[0];
}
