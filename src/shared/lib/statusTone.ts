import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { SurfaceTone } from '../ui/Surface';

export type StatusKind =
  | 'assignment'
  | 'chapter'
  | 'stageProgress'
  | 'changeRequest'
  | 'consistencyFinding'
  | 'bibleReview'
  | 'artworkReview'
  | 'auditAction'
  | 'series';

export interface StatusToneMeta {
  tone: SurfaceTone;
  icon?: LucideIcon;
  iconName?: string;
  labelKey: string;
  defaultLabel?: string;
}

const ASSIGNMENT_STATUS_MAP: Record<string, StatusToneMeta> = {
  Unassigned: {
    tone: 'neutral',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'common.status.unassigned',
    defaultLabel: 'Chưa phân công',
  },
  '0': {
    tone: 'neutral',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'common.status.unassigned',
    defaultLabel: 'Chưa phân công',
  },
  Assigned: {
    tone: 'info',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.assigned',
    defaultLabel: 'Đã giao',
  },
  '1': {
    tone: 'info',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.assigned',
    defaultLabel: 'Đã giao',
  },
  InProgress: {
    tone: 'warning',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.inProgress',
    defaultLabel: 'Đang làm',
  },
  '2': {
    tone: 'warning',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.inProgress',
    defaultLabel: 'Đang làm',
  },
  Submitted: {
    tone: 'ai',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.submitted',
    defaultLabel: 'Đã nộp, chờ duyệt',
  },
  '3': {
    tone: 'ai',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.submitted',
    defaultLabel: 'Đã nộp, chờ duyệt',
  },
  UnderReview: {
    tone: 'info',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.underReview',
    defaultLabel: 'Đang xét duyệt',
  },
  '4': {
    tone: 'info',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.card.status.underReview',
    defaultLabel: 'Đang xét duyệt',
  },
  Approved: {
    tone: 'success',
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    labelKey: 'collaboration.card.status.approved',
    defaultLabel: 'Đã duyệt',
  },
  '5': {
    tone: 'success',
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    labelKey: 'collaboration.card.status.approved',
    defaultLabel: 'Đã duyệt',
  },
  ReworkRequired: {
    tone: 'danger',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    labelKey: 'collaboration.card.status.reworkRequired',
    defaultLabel: 'Cần sửa lại',
  },
  '6': {
    tone: 'danger',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    labelKey: 'collaboration.card.status.reworkRequired',
    defaultLabel: 'Cần sửa lại',
  },
  Blocked: {
    tone: 'neutral',
    icon: Lock,
    iconName: 'Lock',
    labelKey: 'collaboration.card.status.blocked',
    defaultLabel: 'Bị chặn',
  },
  '7': {
    tone: 'neutral',
    icon: Lock,
    iconName: 'Lock',
    labelKey: 'collaboration.card.status.blocked',
    defaultLabel: 'Bị chặn',
  },
  Cancelled: {
    tone: 'neutral',
    icon: XCircle,
    iconName: 'XCircle',
    labelKey: 'common.status.cancelled',
    defaultLabel: 'Đã hủy',
  },
  '8': {
    tone: 'neutral',
    icon: XCircle,
    iconName: 'XCircle',
    labelKey: 'common.status.cancelled',
    defaultLabel: 'Đã hủy',
  },
};

const CHAPTER_STATUS_MAP: Record<string, StatusToneMeta> = {
  PreProduction: {
    tone: 'neutral',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'artist.chapterSelection.statusPreProduction',
    defaultLabel: 'Tiền kỳ',
  },
  ScriptFrozen: {
    tone: 'info',
    icon: Lock,
    iconName: 'Lock',
    labelKey: 'artist.chapterSelection.statusScriptFrozen',
    defaultLabel: 'Kịch bản đã khóa',
  },
  InProduction: {
    tone: 'brand',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'artist.chapterSelection.statusInProduction',
    defaultLabel: 'Đang sản xuất',
  },
  ChapterApproved: {
    tone: 'success',
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    labelKey: 'artist.chapterSelection.statusApproved',
    defaultLabel: 'Đã duyệt',
  },
  HandedOffAndPublished: {
    tone: 'ai',
    icon: Sparkles,
    iconName: 'Sparkles',
    labelKey: 'artist.chapterSelection.statusPublishedFull',
    defaultLabel: 'Đã xuất bản',
  },
  Archived: {
    tone: 'neutral',
    icon: Lock,
    iconName: 'Lock',
    labelKey: 'common.status.archived',
    defaultLabel: 'Đã lưu trữ',
  },
};

const CHANGE_REQUEST_STATUS_MAP: Record<string, StatusToneMeta> = {
  Open: {
    tone: 'danger',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    labelKey: 'collaboration.changeRequest.status.Open',
    defaultLabel: 'Cần sửa',
  },
  Resolved: {
    tone: 'warning',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.changeRequest.status.Resolved',
    defaultLabel: 'Đã sửa, chờ xác minh',
  },
  Verified: {
    tone: 'success',
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    labelKey: 'collaboration.changeRequest.status.Verified',
    defaultLabel: 'Đã xác minh',
  },
  Rejected: {
    tone: 'neutral',
    icon: XCircle,
    iconName: 'XCircle',
    labelKey: 'collaboration.changeRequest.status.Rejected',
    defaultLabel: 'Đã đóng',
  },
};

const CONSISTENCY_FINDING_SEVERITY_MAP: Record<string, StatusToneMeta> = {
  Blocking: {
    tone: 'danger',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    labelKey: 'common.status.blocking',
    defaultLabel: 'Lỗi chặn',
  },
  Warning: {
    tone: 'warning',
    icon: AlertTriangle,
    iconName: 'AlertTriangle',
    labelKey: 'common.status.warning',
    defaultLabel: 'Cảnh báo',
  },
  Info: {
    tone: 'neutral',
    icon: Info,
    iconName: 'Info',
    labelKey: 'common.status.info',
    defaultLabel: 'Thông tin',
  },
};

const BIBLE_REVIEW_STATUS_MAP: Record<string, StatusToneMeta> = {
  Draft: {
    tone: 'neutral',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'bible.view.cardDraft',
    defaultLabel: 'Bản nháp',
  },
  ConceptSubmitted: {
    tone: 'warning',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'bible.view.cardConceptSubmitted',
    defaultLabel: 'Chờ nét in',
  },
  CanonLocked: {
    tone: 'success',
    icon: Lock,
    iconName: 'Lock',
    labelKey: 'bible.view.cardCanonLocked',
    defaultLabel: 'Đã khóa Canon',
  },
  ReworkRequired: {
    tone: 'danger',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    labelKey: 'bible.view.cardReworkRequired',
    defaultLabel: 'Cần sửa',
  },
};

const ARTWORK_REVIEW_STATUS_MAP: Record<string, StatusToneMeta> = {
  Latest: {
    tone: 'ai',
    icon: Sparkles,
    iconName: 'Sparkles',
    labelKey: 'collaboration.artworkPanel.badgeLatest',
    defaultLabel: 'Mới nhất',
  },
  Pending: {
    tone: 'warning',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.artworkPanel.badgePending',
    defaultLabel: 'Chờ duyệt',
  },
  '0': {
    tone: 'warning',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'collaboration.artworkPanel.badgePending',
    defaultLabel: 'Chờ duyệt',
  },
  Approved: {
    tone: 'success',
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    labelKey: 'collaboration.artworkPanel.badgeApproved',
    defaultLabel: 'Đã duyệt',
  },
  '1': {
    tone: 'success',
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    labelKey: 'collaboration.artworkPanel.badgeApproved',
    defaultLabel: 'Đã duyệt',
  },
  Rejected: {
    tone: 'danger',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    labelKey: 'collaboration.artworkPanel.badgeRejected',
    defaultLabel: 'Từ chối',
  },
  '2': {
    tone: 'danger',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    labelKey: 'collaboration.artworkPanel.badgeRejected',
    defaultLabel: 'Từ chối',
  },
};

const SERIES_STATUS_MAP: Record<string, StatusToneMeta> = {
  PreProduction: {
    tone: 'warning',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'workspace.studioHub.series.statusPreProd',
    defaultLabel: 'Tiền kỳ',
  },
  InProduction: {
    tone: 'brand',
    icon: Clock,
    iconName: 'Clock',
    labelKey: 'workspace.studioHub.series.statusInProd',
    defaultLabel: 'Đang sản xuất',
  },
  Completed: {
    tone: 'success',
    icon: CheckCircle2,
    iconName: 'CheckCircle2',
    labelKey: 'workspace.studioHub.series.statusCompleted',
    defaultLabel: 'Hoàn tất',
  },
};

function resolveAuditAction(action?: string | null): StatusToneMeta {
  if (!action) {
    return {
      tone: 'neutral',
      icon: Info,
      iconName: 'Info',
      labelKey: 'common.status.info',
      defaultLabel: '—',
    };
  }

  const upper = action.trim().toUpperCase();

  if (upper === 'LOGIN') {
    return {
      tone: 'success',
      icon: CheckCircle2,
      iconName: 'CheckCircle2',
      labelKey: 'admin.actions.login',
      defaultLabel: 'Đăng nhập',
    };
  }
  if (upper === 'LOGOUT') {
    return {
      tone: 'neutral',
      icon: Clock,
      iconName: 'Clock',
      labelKey: 'admin.actions.logout',
      defaultLabel: 'Đăng xuất',
    };
  }
  if (upper === 'SESSIONS_REVOKED' || upper === 'REVOKE_SESSION' || upper.includes('REVOKE')) {
    return {
      tone: 'danger',
      icon: AlertCircle,
      iconName: 'AlertCircle',
      labelKey: 'admin.actions.sessionsRevoked',
      defaultLabel: 'Thu hồi phiên',
    };
  }
  if (upper.includes('REFRESHTOKEN')) {
    return {
      tone: 'neutral',
      icon: Clock,
      iconName: 'Clock',
      labelKey: 'common.status.info',
      defaultLabel: action,
    };
  }
  if (upper.includes('CREATE') || upper.includes('ADD')) {
    return {
      tone: 'success',
      icon: CheckCircle2,
      iconName: 'CheckCircle2',
      labelKey: 'admin.actions.create',
      defaultLabel: 'Tạo mới',
    };
  }
  if (upper.includes('DELETE') || upper.includes('REJECT') || upper.includes('REMOVE')) {
    return {
      tone: 'danger',
      icon: AlertCircle,
      iconName: 'AlertCircle',
      labelKey: 'admin.actions.delete',
      defaultLabel: 'Xóa',
    };
  }
  if (upper.includes('APPROVE') || upper.includes('RESOLVE')) {
    return {
      tone: 'success',
      icon: CheckCircle2,
      iconName: 'CheckCircle2',
      labelKey: 'common.status.approved',
      defaultLabel: 'Đã duyệt',
    };
  }
  if (upper.includes('PUBLISH') || upper.includes('EXPORT')) {
    return {
      tone: 'ai',
      icon: Sparkles,
      iconName: 'Sparkles',
      labelKey: 'common.status.published',
      defaultLabel: 'Xuất bản',
    };
  }
  if (upper.includes('SUBMIT')) {
    return {
      tone: 'warning',
      icon: Clock,
      iconName: 'Clock',
      labelKey: 'common.status.submitted',
      defaultLabel: 'Đã nộp',
    };
  }

  return {
    tone: 'neutral',
    icon: Info,
    iconName: 'Info',
    labelKey: 'common.status.info',
    defaultLabel: action,
  };
}

export function getStatusTone(kind: StatusKind, status: string | number): StatusToneMeta {
  const statusStr = String(status);

  switch (kind) {
    case 'assignment':
    case 'stageProgress':
      return (
        ASSIGNMENT_STATUS_MAP[statusStr] ?? {
          tone: 'neutral',
          icon: Clock,
          iconName: 'Clock',
          labelKey: 'common.status.info',
          defaultLabel: statusStr,
        }
      );
    case 'chapter':
      return (
        CHAPTER_STATUS_MAP[statusStr] ?? {
          tone: 'neutral',
          icon: Clock,
          iconName: 'Clock',
          labelKey: 'common.status.info',
          defaultLabel: statusStr,
        }
      );
    case 'changeRequest':
      return (
        CHANGE_REQUEST_STATUS_MAP[statusStr] ?? {
          tone: 'neutral',
          icon: Info,
          iconName: 'Info',
          labelKey: 'common.status.info',
          defaultLabel: statusStr,
        }
      );
    case 'consistencyFinding':
      return (
        CONSISTENCY_FINDING_SEVERITY_MAP[statusStr] ?? {
          tone: 'neutral',
          icon: Info,
          iconName: 'Info',
          labelKey: 'common.status.info',
          defaultLabel: statusStr,
        }
      );
    case 'bibleReview':
      return (
        BIBLE_REVIEW_STATUS_MAP[statusStr] ?? {
          tone: 'neutral',
          icon: Clock,
          iconName: 'Clock',
          labelKey: 'common.status.info',
          defaultLabel: statusStr,
        }
      );
    case 'artworkReview':
      return (
        ARTWORK_REVIEW_STATUS_MAP[statusStr] ?? {
          tone: 'neutral',
          icon: Info,
          iconName: 'Info',
          labelKey: 'common.status.info',
          defaultLabel: statusStr,
        }
      );
    case 'auditAction':
      return resolveAuditAction(statusStr);
    case 'series':
      return (
        SERIES_STATUS_MAP[statusStr] ?? {
          tone: 'neutral',
          icon: Info,
          iconName: 'Info',
          labelKey: 'common.status.info',
          defaultLabel: statusStr,
        }
      );
    default:
      return {
        tone: 'neutral',
        icon: Info,
        iconName: 'Info',
        labelKey: 'common.status.info',
        defaultLabel: statusStr,
      };
  }
}
