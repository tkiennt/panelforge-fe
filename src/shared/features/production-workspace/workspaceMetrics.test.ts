import { describe, it, expect } from 'vitest';
import {
  countGateWarnings,
  daysUntil,
  getBibleMetrics,
  getChapterMetrics,
  getCrewMetrics,
  getMemberLoad,
} from './workspaceMetrics';

const stage = (order: number, approved: number, changesRequested = 0) =>
  ({
    stageId: `s-${order}`,
    name: `S${order}`,
    stageOrder: order,
    notStarted: 0,
    inProgress: 0,
    submitted: 0,
    inReview: 0,
    changesRequested,
    approved,
  }) as any;

const progress = {
  chapters: [
    {
      chapterId: 'c-1',
      pageCount: 6,
      panelCount: 20,
      percentComplete: 35,
      stages: [stage(2, 7, 1), stage(1, 15, 2)],
      overdueAssignments: 1,
    },
  ],
  workload: [],
} as any;

describe('workspaceMetrics – số liệu thật cho thẻ Workspace (UC-16)', () => {
  it('lấy tiến độ chương từ series progress, panel xong = approved ở stage cuối', () => {
    expect(
      getChapterMetrics({ id: 'c-1', pagesCount: 6, status: 'InProduction' } as any, progress),
    ).toEqual({
      percent: 35,
      pageCount: 6,
      panelCount: 20,
      approvedPanels: 7,
      rework: 3,
      overdue: 1,
    });
  });

  it('chương đã nghiệm thu / phát hành luôn 100%, chương chưa có số liệu là 0%', () => {
    expect(
      getChapterMetrics({ id: 'c-1', pagesCount: 6, status: 'ChapterApproved' } as any, progress)
        .percent,
    ).toBe(100);
    expect(
      getChapterMetrics({ id: 'c-9', pagesCount: 4, status: 'InProduction' } as any, progress),
    ).toMatchObject({ percent: 0, pageCount: 4, panelCount: 0 });
  });

  it('Bible bỏ qua mục đám đông và mục đã tắt; đếm mục đã khoá chuẩn', () => {
    const entries = [
      { isActive: true, effectiveRevision: { isLocked: true } },
      { isActive: true, effectiveRevision: { reviewStatus: 'CanonLocked' } },
      { isActive: true, effectiveRevision: { reviewStatus: 'ConceptSubmitted' } },
      { isActive: true, isStub: true, effectiveRevision: null },
      { isActive: true, isCrowd: true },
      { isActive: false },
    ] as any;
    expect(getBibleMetrics(entries)).toEqual({ total: 4, locked: 2, pending: 2 });
  });

  it('ê-kíp: chỉ tính thành viên của series, đếm người trễ hạn', () => {
    const workload = [
      { userId: 'a', open: 2, waitingReview: 1, done: 3, overdue: 1 },
      { userId: 'b', open: 0, waitingReview: 0, done: 4, overdue: 0 },
      { userId: 'x', open: 9, waitingReview: 0, done: 0, overdue: 5 },
    ] as any;
    expect(getCrewMetrics(['a', 'b', 'c'], workload)).toEqual({
      open: 3,
      done: 7,
      total: 10,
      donePercent: 70,
      ready: 2,
      withOverdue: 1,
      avgOpen: 1,
    });
    expect(getMemberLoad(workload[0])).toEqual({ total: 6, percent: 50 });
    expect(getMemberLoad(undefined)).toEqual({ total: 0, percent: 0 });
  });

  it('cảnh báo Gate chỉ cộng cờ ảnh hưởng, finding chặn và change request', () => {
    expect(
      countGateWarnings({
        items: [
          { code: 'IMPACT_FLAGS', count: 2 },
          { code: 'OPEN_CHANGE_REQUESTS', count: 1 },
          { code: 'NO_PAGES', count: 5 },
        ],
      } as any),
    ).toBe(3);
    expect(countGateWarnings(null)).toBe(0);
  });

  it('daysUntil tính theo ngày lịch', () => {
    const now = new Date(2026, 10, 25, 23, 0);
    expect(daysUntil('2026-11-27', now)).toBe(2);
    expect(daysUntil('2026-11-24', now)).toBe(-1);
    expect(daysUntil(null, now)).toBeNull();
  });
});
