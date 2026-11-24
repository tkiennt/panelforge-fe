import {
  AssignmentDto,
  AssignmentPriority,
  AssignmentStatus,
  StageTaskStatus,
  WorkflowEntityType,
  WorkspaceRole,
} from '@/types';
import { translate } from '@/lib/i18n';

export interface BoardLotCellItem {
  id: string;
  pageId: string | null;
  pageNumber: number | null;
  targetLabel: string;
  status: StageTaskStatus;
  assigneeUserId?: string | null;
  isStartable: boolean;
  isInputOutdated: boolean;
  outdatedReason?: string | null;
  lastDecisionComment?: string | null;
  reopenReason?: string | null;
  prerequisitesApproved: boolean;
}

export interface BoardCard {
  id: string;
  seriesId: string;
  chapterId: string;
  entityType: WorkflowEntityType;
  targetEntityId: string;
  targetLabel: string;
  /** Trang chứa target (Page → chính trang, Panel → trang chứa khung từ AssignmentDto.pageId). */
  pageId?: string | null;
  /** Số trang khi việc gắn với Page hoặc Panel có pageId còn tồn tại trong chương; null với Chapter/Panel chưa rõ trang. */
  pageNumber?: number | null;
  pipelineStageId: string;
  stageName: string;
  stageOrder: number;
  stageColor?: string | null;
  isStageEnabled?: boolean;
  assigneeUserId: string;
  assigneeName: string;
  assigneeEmail?: string;
  assigneeAvatarInitials: string;
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
  impactReviewReason?: string | null;
  rawAssignment?: AssignmentDto;
  /** True khi thẻ được đọc từ Lưới giao việc V3 (StageTask × StageTaskLot). */
  isGridTask?: boolean;
  /** True khi thẻ đại diện cho 1 lô (StageTaskLot) gom nhiều ô cấp Trang. */
  isGridLot?: boolean;
  lotId?: string | null;
  lotApprovedCount?: number;
  lotTaskCount?: number;
  firstPageId?: string | null;
  lotTasks?: BoardLotCellItem[];
  isStartable?: boolean;
}

export interface BoardColumnDefinition {
  status: AssignmentStatus;
  label: string;
  description: string;
  badgeClass: string;
  headerBgClass: string;
  accentBorderClass: string;
}

export const BOARD_COLUMNS: BoardColumnDefinition[] = [
  {
    status: 'Assigned',
    get label() {
      return translate('pipeline.boardColumns.Assigned.label');
    },
    get description() {
      return translate('pipeline.boardColumns.Assigned.description');
    },
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    headerBgClass: 'bg-zinc-50/80',
    accentBorderClass: 'border-t-zinc-400',
  },
  {
    status: 'InProgress',
    get label() {
      return translate('pipeline.boardColumns.InProgress.label');
    },
    get description() {
      return translate('pipeline.boardColumns.InProgress.description');
    },
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    headerBgClass: 'bg-amber-50/50',
    accentBorderClass: 'border-t-amber-500',
  },
  {
    status: 'Submitted',
    get label() {
      return translate('pipeline.boardColumns.Submitted.label');
    },
    get description() {
      return translate('pipeline.boardColumns.Submitted.description');
    },
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    headerBgClass: 'bg-blue-50/50',
    accentBorderClass: 'border-t-blue-500',
  },
  {
    status: 'UnderReview',
    get label() {
      return translate('pipeline.boardColumns.UnderReview.label');
    },
    get description() {
      return translate('pipeline.boardColumns.UnderReview.description');
    },
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    headerBgClass: 'bg-purple-50/50',
    accentBorderClass: 'border-t-purple-500',
  },
  {
    status: 'ReworkRequired',
    get label() {
      return translate('pipeline.boardColumns.ReworkRequired.label');
    },
    get description() {
      return translate('pipeline.boardColumns.ReworkRequired.description');
    },
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    headerBgClass: 'bg-rose-50/50',
    accentBorderClass: 'border-t-rose-500',
  },
  {
    status: 'Approved',
    get label() {
      return translate('pipeline.boardColumns.Approved.label');
    },
    get description() {
      return translate('pipeline.boardColumns.Approved.description');
    },
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    headerBgClass: 'bg-emerald-50/50',
    accentBorderClass: 'border-t-emerald-500',
  },
  {
    status: 'Blocked',
    get label() {
      return translate('pipeline.boardColumns.Blocked.label');
    },
    get description() {
      return translate('pipeline.boardColumns.Blocked.description');
    },
    badgeClass: 'bg-stone-200 text-stone-800 border-stone-300',
    headerBgClass: 'bg-stone-100/70',
    accentBorderClass: 'border-t-stone-600',
  },
];
