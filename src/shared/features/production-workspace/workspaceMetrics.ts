import type { ChapterDto, ChapterLockGateDto } from '@/services/chapter.service';
import type { ChapterProgressDto, SeriesProgressDto, WorkloadDto } from '@/services/series.service';
import type { BibleEntryDto } from '@/services/bible.service';

/** Chương đã qua Gate 3 nhưng chưa phát hành. */
export const isApprovedStatus = (status?: string | null) =>
  status === 'ChapterApproved' || status === 'Approved';

/** Chương đã bàn giao & phát hành cho độc giả. */
export const isPublishedStatus = (status?: string | null) =>
  status === 'HandedOffAndPublished' || status === 'Published';

export interface ChapterMetrics {
  percent: number;
  pageCount: number;
  panelCount: number;
  approvedPanels: number;
  rework: number;
  overdue: number;
}

/** Số liệu tiến độ của một chương lấy từ GET /series/{id}/progress (UC-16). */
export const getChapterMetrics = (
  chapter: Pick<ChapterDto, 'id' | 'pagesCount' | 'status'> | undefined,
  progress: SeriesProgressDto | null,
): ChapterMetrics => {
  const row: ChapterProgressDto | undefined = chapter
    ? progress?.chapters?.find((c) => c.chapterId === chapter.id)
    : undefined;
  const stages = row?.stages ?? [];
  const lastStage = [...stages].sort((a, b) => a.stageOrder - b.stageOrder).at(-1);
  const done = isApprovedStatus(chapter?.status) || isPublishedStatus(chapter?.status);
  return {
    percent: done ? 100 : Math.round(row?.percentComplete ?? 0),
    pageCount: row?.pageCount ?? chapter?.pagesCount ?? 0,
    panelCount: row?.panelCount ?? 0,
    approvedPanels: lastStage?.approved ?? 0,
    rework: stages.reduce((sum, s) => sum + (s.changesRequested || 0), 0),
    overdue: row?.overdueAssignments ?? 0,
  };
};

/** Số cảnh báo đang mở trên Gate khoá chương (cờ ảnh hưởng, finding chặn, change request). */
export const countGateWarnings = (gate: ChapterLockGateDto | null) =>
  (gate?.items ?? [])
    .filter((i) =>
      ['IMPACT_FLAGS', 'BLOCKING_FINDINGS', 'OPEN_CHANGE_REQUESTS'].includes(String(i.code)),
    )
    .reduce((sum, i) => sum + (i.count || 0), 0);

export interface BibleMetrics {
  total: number;
  locked: number;
  pending: number;
}

/** Non-Crowd check: các mục Bible đang hoạt động, không phải đám đông, đã khoá chuẩn hay chưa. */
export const getBibleMetrics = (entries: BibleEntryDto[]): BibleMetrics => {
  const relevant = entries.filter((e) => e.isActive !== false && !e.isCrowd);
  const locked = relevant.filter(
    (e) => e.effectiveRevision?.isLocked || e.effectiveRevision?.reviewStatus === 'CanonLocked',
  ).length;
  return { total: relevant.length, locked, pending: relevant.length - locked };
};

export interface CrewMetrics {
  open: number;
  done: number;
  total: number;
  donePercent: number;
  ready: number;
  withOverdue: number;
  avgOpen: number;
}

const memberTotal = (w?: WorkloadDto) =>
  w ? (w.open || 0) + (w.waitingReview || 0) + (w.done || 0) : 0;

/** Tải công việc của từng thành viên: phần trăm việc đã xong trên tổng việc được giao. */
export const getMemberLoad = (w?: WorkloadDto) => {
  const total = memberTotal(w);
  return {
    total,
    percent: total > 0 ? Math.round(((w?.done || 0) / total) * 100) : 0,
  };
};

export const getCrewMetrics = (memberIds: string[], workload: WorkloadDto[]): CrewMetrics => {
  const byUser = new Map(workload.map((w) => [w.userId, w]));
  const rows = memberIds.map((id) => byUser.get(id));
  const open = rows.reduce((s, w) => s + (w?.open || 0) + (w?.waitingReview || 0), 0);
  const done = rows.reduce((s, w) => s + (w?.done || 0), 0);
  const total = open + done;
  const withOverdue = rows.filter((w) => (w?.overdue || 0) > 0).length;
  return {
    open,
    done,
    total,
    donePercent: total > 0 ? Math.round((done / total) * 100) : 0,
    ready: memberIds.length - withOverdue,
    withOverdue,
    avgOpen: memberIds.length > 0 ? Math.round((open / memberIds.length) * 10) / 10 : 0,
  };
};

/** Số ngày còn lại tới hạn (âm = đã trễ). null khi chưa đặt hạn. */
export const daysUntil = (isoDate?: string | null, now: Date = new Date()): number | null => {
  if (!isoDate) return null;
  // "YYYY-MM-DD" (DateOnly của BE) phải hiểu theo giờ địa phương, không phải UTC.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const target = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
};
