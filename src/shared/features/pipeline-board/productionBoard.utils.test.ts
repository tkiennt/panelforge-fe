import { describe, it, expect } from 'vitest';
import type { BoardCard } from './pipelineBoard.types';
import {
  EMPTY_DETAIL_FILTERS,
  blockedReason,
  buildScopeOptions,
  computeMetrics,
  formatChapterLabel,
  groupCards,
  isCompletedLate,
  matchesDetailFilters,
  matchesQuickFilter,
  needsMyAction,
  primaryActionFor,
} from './productionBoard.utils';

const NOW = new Date('2026-10-18T00:00:00Z').getTime();

const card = (over: Partial<BoardCard>): BoardCard =>
  ({
    id: 'c',
    seriesId: 's',
    chapterId: 'ch',
    entityType: 'Chapter',
    targetEntityId: 'ch',
    targetLabel: 'Toàn chương',
    pageNumber: null,
    pipelineStageId: 'st-1',
    stageName: 'Kịch bản',
    stageOrder: 1,
    isStageEnabled: true,
    assigneeUserId: 'u-1',
    assigneeName: 'An',
    assigneeAvatarInitials: 'A',
    assignedRole: 'WRITER',
    brief: 'Việc',
    priority: 'Medium',
    status: 'Assigned',
    dependsOnAssignmentIds: [],
    rawAssignment: {} as BoardCard['rawAssignment'],
    ...over,
  }) as BoardCard;

const cards: BoardCard[] = [
  card({ id: 'a', status: 'InProgress', assigneeUserId: 'me', brief: 'Vẽ nét trang 1' }),
  card({ id: 'b', status: 'Submitted', assigneeUserId: 'other' }),
  card({ id: 'c', status: 'Submitted', assigneeUserId: 'me' }),
  card({
    id: 'd',
    status: 'Approved',
    dueDate: '2026-10-01T00:00:00Z',
    completedAt: '2026-10-05T00:00:00Z',
  }),
  card({ id: 'e', status: 'Blocked', dependsOnAssignmentIds: ['a'] }),
  card({
    id: 'f',
    status: 'Assigned',
    entityType: 'Page',
    targetEntityId: 'p2',
    targetLabel: 'Trang 2',
    pageNumber: 2,
    dueDate: '2026-10-10T00:00:00Z',
    isStageEnabled: false,
  }),
  card({ id: 'g', status: 'ReworkRequired', entityType: 'Panel', targetLabel: 'Khung tranh' }),
];

describe('productionBoard.utils', () => {
  it('"Cần tôi xử lý": việc của tôi còn làm được + việc người khác chờ tôi duyệt, không tự duyệt', () => {
    const editor = { userId: 'me', workspaceRole: 'Editor' };
    expect(cards.filter((c) => needsMyAction(c, editor)).map((c) => c.id)).toEqual(['a', 'b']);
    const artist = { userId: 'me', workspaceRole: 'ARTIST' };
    expect(cards.filter((c) => needsMyAction(c, artist)).map((c) => c.id)).toEqual(['a']);
    expect(needsMyAction(cards[0], { userId: null })).toBe(false);
  });

  it('lọc nhanh theo trạng thái thật (Chờ xét duyệt = Đã nộp + Đang duyệt)', () => {
    const ids = (f: Parameters<typeof matchesQuickFilter>[1]) =>
      cards.filter((c) => matchesQuickFilter(c, f, {})).map((c) => c.id);
    expect(ids('review')).toEqual(['b', 'c']);
    expect(ids('done')).toEqual(['d']);
    expect(ids('all')).toHaveLength(cards.length);
  });

  it('chỉ số tính trên toàn chương; việc tắt công đoạn không tính hoàn tất; việc xong không quá hạn', () => {
    const m = computeMetrics(cards, NOW);
    expect(m).toMatchObject({
      total: 7,
      done: 1,
      percent: 14,
      waitingReview: 2,
      blocked: 1,
      overdue: 1,
      disabledStage: 1,
    });
  });

  it('bộ lọc chi tiết kết hợp + tìm không dấu', () => {
    const f = { ...EMPTY_DETAIL_FILTERS, search: 've net', assignee: 'me' };
    expect(cards.filter((c) => matchesDetailFilters(c, f, NOW)).map((c) => c.id)).toEqual(['a']);
    const overdue = { ...EMPTY_DETAIL_FILTERS, overdueOnly: true, scope: 'page:p2' };
    expect(cards.filter((c) => matchesDetailFilters(c, overdue, NOW)).map((c) => c.id)).toEqual([
      'f',
    ]);
  });

  it('nhóm theo trang/người/trạng thái không mất và không nhân đôi việc', () => {
    for (const g of ['page', 'assignee', 'status'] as const) {
      const groups = groupCards(cards, g);
      const ids = groups.flatMap((x) => x.cards.map((c) => c.id));
      expect(ids.sort()).toEqual(cards.map((c) => c.id).sort());
    }
    expect(groupCards(cards, 'page').map((g) => g.label)).toEqual([
      'Toàn chương',
      'Trang 2',
      'Khung tranh (chưa xác định trang)',
    ]);
  });

  it('phạm vi, lý do bị chặn, hoàn tất trễ, nhãn chương và hành động theo quyền', () => {
    expect(buildScopeOptions(cards).map((o) => o.key)).toEqual(['chapter', 'page:p2', 'panel']);
    expect(blockedReason(cards[4], cards)).toBe('Chờ Kịch bản · Toàn chương');
    expect(isCompletedLate(cards[3])).toBe(true);
    expect(formatChapterLabel(1, 'Chương 1: Khởi đầu')).toBe('Chương 1: Khởi đầu');
    expect(formatChapterLabel(2, 'Đối đầu')).toBe('Chương 2: Đối đầu');
    expect(primaryActionFor(cards[0], { userId: 'me' }).label).toBe('Tiếp tục');
    expect(primaryActionFor(cards[1], { userId: 'me', workspaceRole: 'PRODUCER' }).label).toBe(
      'Xét duyệt',
    );
    expect(primaryActionFor(cards[2], { userId: 'me', workspaceRole: 'PRODUCER' }).label).toBe(
      'Xem chi tiết',
    );
  });
});
