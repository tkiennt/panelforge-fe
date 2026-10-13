import {
  AssignmentDto,
  AssignmentPriority,
  AssignmentStatus,
  WorkflowEntityType,
  WorkspaceRole,
} from '@/types';

export interface BoardCard {
  id: string;
  seriesId: string;
  chapterId: string;
  entityType: WorkflowEntityType;
  targetEntityId: string;
  targetLabel: string;
  pipelineStageId: string;
  stageName: string;
  stageOrder: number;
  stageColor?: string | null;
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
  rawAssignment: AssignmentDto;
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
    label: 'Chờ thực hiện',
    description: 'Nhiệm vụ đã phân công, chờ thành viên bấm Bắt đầu',
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    headerBgClass: 'bg-zinc-50/80',
    accentBorderClass: 'border-t-zinc-400',
  },
  {
    status: 'InProgress',
    label: 'Đang làm',
    description: 'Thành viên đang vẽ, viết kịch bản hoặc chèn chữ',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    headerBgClass: 'bg-amber-50/50',
    accentBorderClass: 'border-t-amber-500',
  },
  {
    status: 'Submitted',
    label: 'Đã nộp bài',
    description: 'Đã nộp bản thảo và artwork, chờ Editor mở xét duyệt',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    headerBgClass: 'bg-blue-50/50',
    accentBorderClass: 'border-t-blue-500',
  },
  {
    status: 'UnderReview',
    label: 'Đang duyệt',
    description: 'Editor hoặc Producer đang xem xét và so sánh với Bible',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    headerBgClass: 'bg-purple-50/50',
    accentBorderClass: 'border-t-purple-500',
  },
  {
    status: 'ReworkRequired',
    label: 'Cần sửa đổi',
    description: 'Bị trả về kèm yêu cầu sửa (Change Requests)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    headerBgClass: 'bg-rose-50/50',
    accentBorderClass: 'border-t-rose-500',
  },
  {
    status: 'Approved',
    label: 'Đã hoàn tất',
    description: 'Công việc đã được nghiệm thu đạt chuẩn',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    headerBgClass: 'bg-emerald-50/50',
    accentBorderClass: 'border-t-emerald-500',
  },
  {
    status: 'Blocked',
    label: 'Bị chặn',
    description: 'Chưa thể thực hiện do công đoạn trước chưa hoàn thành',
    badgeClass: 'bg-stone-200 text-stone-800 border-stone-300',
    headerBgClass: 'bg-stone-100/70',
    accentBorderClass: 'border-t-stone-600',
  },
];
