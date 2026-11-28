import type { ChapterReviewStatsDto } from '@/types';

export interface ReviewTotals {
  queue: number;
  waitingReview: number;
  inReview: number;
  openChangeRequests: number;
  resolvedChangeRequests: number;
  overdueChangeRequests: number;
  openFindings: number;
  blockingFindings: number;
  approved: number;
  rejected: number;
  firstPassApproved: number;
  /** % lần duyệt ngay ở lần nộp đầu trên tổng quyết định; null khi chưa có quyết định. */
  firstPassRate: number | null;
  tasksTotal: number;
  tasksApproved: number;
  tasksInProgress: number;
  tasksRework: number;
  tasksOverdue: number;
  productionPercent: number | null;
  scriptsInReview: number;
}

export function sumReviewStats(rows: ChapterReviewStatsDto[]): ReviewTotals {
  const t = rows.reduce(
    (acc, r) => ({
      waitingReview: acc.waitingReview + r.waitingReview,
      inReview: acc.inReview + r.inReview,
      openChangeRequests: acc.openChangeRequests + r.openChangeRequests,
      resolvedChangeRequests: acc.resolvedChangeRequests + r.resolvedChangeRequests,
      overdueChangeRequests: acc.overdueChangeRequests + r.overdueChangeRequests,
      openFindings: acc.openFindings + r.openFindings,
      blockingFindings: acc.blockingFindings + r.blockingFindings,
      approved: acc.approved + r.approved,
      rejected: acc.rejected + r.rejected,
      firstPassApproved: acc.firstPassApproved + r.firstPassApproved,
      tasksTotal: acc.tasksTotal + (r.tasksTotal ?? 0),
      tasksApproved: acc.tasksApproved + (r.tasksApproved ?? 0),
      tasksInProgress: acc.tasksInProgress + (r.tasksInProgress ?? 0),
      tasksRework: acc.tasksRework + (r.tasksRework ?? 0),
      tasksOverdue: acc.tasksOverdue + (r.tasksOverdue ?? 0),
      scriptsInReview: acc.scriptsInReview + (r.scriptStatus === 'InReview' ? 1 : 0),
    }),
    {
      waitingReview: 0,
      inReview: 0,
      openChangeRequests: 0,
      resolvedChangeRequests: 0,
      overdueChangeRequests: 0,
      openFindings: 0,
      blockingFindings: 0,
      approved: 0,
      rejected: 0,
      firstPassApproved: 0,
      tasksTotal: 0,
      tasksApproved: 0,
      tasksInProgress: 0,
      tasksRework: 0,
      tasksOverdue: 0,
      scriptsInReview: 0,
    },
  );
  const decided = t.approved + t.rejected;
  return {
    ...t,
    queue: t.waitingReview + t.inReview,
    firstPassRate: decided === 0 ? null : Math.round((100 * t.firstPassApproved) / decided),
    productionPercent:
      t.tasksTotal === 0 ? null : Math.round((100 * t.tasksApproved) / t.tasksTotal),
  };
}
