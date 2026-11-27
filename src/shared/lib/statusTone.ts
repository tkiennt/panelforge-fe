import type { SurfaceTone } from '@/shared/ui/Surface';

export type StatusIconName =
  | 'circle'
  | 'clock'
  | 'circle-check'
  | 'circle-x'
  | 'lock'
  | 'send'
  | 'shield-check'
  | 'triangle-alert'
  | 'ban'
  | 'sparkles';

export type StatusKind =
  | 'assignment'
  | 'chapter'
  | 'script'
  | 'stageTask'
  | 'stageProgress'
  | 'changeRequest'
  | 'consistencySeverity'
  | 'consistencyStatus'
  | 'bibleReview'
  | 'artworkReview'
  | 'previewLink'
  | 'series';

export interface StatusToneDefinition {
  tone: SurfaceTone;
  icon: StatusIconName;
  labelKey: string;
}

type StatusToneMap = Record<string, StatusToneDefinition>;

const common = (tone: SurfaceTone, icon: StatusIconName, label: string): StatusToneDefinition => ({
  tone,
  icon,
  labelKey: `status.${label}`,
});

export const STATUS_TONES: Record<StatusKind, StatusToneMap> = {
  assignment: {
    Assigned: common('info', 'circle', 'assigned'),
    InProgress: common('info', 'clock', 'inProgress'),
    Submitted: common('warning', 'send', 'submitted'),
    UnderReview: common('warning', 'clock', 'underReview'),
    Approved: common('success', 'circle-check', 'approved'),
    ReworkRequired: common('danger', 'circle-x', 'reworkRequired'),
    Blocked: common('danger', 'ban', 'blocked'),
  },
  chapter: {
    PreProduction: common('neutral', 'clock', 'preProduction'),
    InProduction: common('info', 'clock', 'inProduction'),
    ChapterApproved: common('success', 'circle-check', 'approved'),
    HandedOffAndPublished: common('success', 'circle-check', 'published'),
  },
  script: {
    Draft: common('neutral', 'circle', 'draft'),
    InReview: common('warning', 'clock', 'underReview'),
    Frozen: common('success', 'lock', 'scriptFrozen'),
  },
  stageTask: {
    Unassigned: common('neutral', 'circle', 'unassigned'),
    Assigned: common('info', 'circle', 'assigned'),
    InProgress: common('info', 'clock', 'inProgress'),
    Submitted: common('warning', 'send', 'submitted'),
    UnderReview: common('warning', 'clock', 'underReview'),
    Approved: common('success', 'circle-check', 'approved'),
    ReworkRequired: common('danger', 'circle-x', 'reworkRequired'),
    Cancelled: common('neutral', 'ban', 'cancelled'),
  },
  stageProgress: {
    NotStarted: common('neutral', 'circle', 'notStarted'),
    InProgress: common('info', 'clock', 'inProgress'),
    Completed: common('success', 'circle-check', 'completed'),
    Blocked: common('danger', 'ban', 'blocked'),
  },
  changeRequest: {
    Open: common('danger', 'circle-x', 'open'),
    Resolved: common('success', 'circle-check', 'resolved'),
    Verified: common('success', 'shield-check', 'verified'),
    Rejected: common('danger', 'circle-x', 'rejected'),
  },
  consistencySeverity: {
    Info: common('info', 'circle', 'info'),
    Warning: common('warning', 'triangle-alert', 'warning'),
    Blocking: common('danger', 'ban', 'blocking'),
  },
  consistencyStatus: {
    Open: common('danger', 'circle-x', 'open'),
    Resolved: common('success', 'circle-check', 'resolved'),
    Dismissed: common('neutral', 'ban', 'dismissed'),
  },
  bibleReview: {
    Draft: common('neutral', 'circle', 'draft'),
    ConceptSubmitted: common('warning', 'send', 'conceptSubmitted'),
    ReworkRequired: common('danger', 'circle-x', 'reworkRequired'),
    CanonLocked: common('success', 'lock', 'canonLocked'),
  },
  artworkReview: {
    Latest: common('brand', 'sparkles', 'latest'),
    Pending: common('warning', 'clock', 'pending'),
    Approved: common('success', 'circle-check', 'approved'),
    Rejected: common('danger', 'circle-x', 'rejected'),
    Superseded: common('neutral', 'circle', 'superseded'),
  },
  previewLink: {
    Active: common('success', 'circle-check', 'active'),
    Expired: common('neutral', 'clock', 'expired'),
    Revoked: common('danger', 'ban', 'revoked'),
  },
  series: {
    PreProduction: common('warning', 'clock', 'preProduction'),
    InProduction: common('info', 'clock', 'inProduction'),
    Completed: common('success', 'circle-check', 'completed'),
  },
};

const UNKNOWN_STATUS = common('neutral', 'circle', 'unknown');

export const getStatusTone = (
  kind: StatusKind,
  status: string | number | null | undefined,
): StatusToneDefinition => STATUS_TONES[kind][String(status ?? '')] ?? UNKNOWN_STATUS;

export const getAuditActionTone = (action?: string | null): SurfaceTone => {
  const upper = action?.trim().toUpperCase() ?? '';
  if (!upper || upper === 'LOGOUT' || upper.includes('REFRESHTOKEN')) return 'neutral';
  if (upper === 'LOGIN' || upper.includes('CREATE') || upper.includes('ADD')) return 'success';
  if (
    upper.includes('DELETE') ||
    upper.includes('REMOVE') ||
    upper.includes('REJECT') ||
    upper.includes('REVOKE')
  ) {
    return 'danger';
  }
  if (upper.includes('SUBMIT')) return 'warning';
  if (upper.includes('APPROVE') || upper.includes('RESOLVE') || upper.includes('PUBLISH')) {
    return 'success';
  }
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('ASSIGN')) return 'info';
  return 'neutral';
};
