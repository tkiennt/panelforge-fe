import { describe, it, expect } from 'vitest';
import type { AssignmentDto } from '@/types';
import {
  buildRegionJson,
  countUnclosed,
  describeRegion,
  getWorkActions,
  hasCurrentArtwork,
  isOverdue,
  isRegionInputValid,
  isReviewerRole,
  lastRejectedAt,
  needsArtwork,
  normalizeRole,
  resolvePageId,
} from './collaborationRules';

const assignment = (over: Partial<AssignmentDto> = {}): AssignmentDto => ({
  id: 'a1',
  seriesId: 's1',
  chapterId: 'c1',
  entityType: 'Page',
  targetEntityId: 'page-1',
  pipelineStageId: 'stage-1',
  assigneeUserId: 'artist-1',
  assignedRole: 'Artist' as never, // Backend trả PascalCase
  brief: 'Vẽ pencil',
  priority: 'Medium',
  status: 'InProgress',
  createdAt: '2026-10-06T00:00:00Z',
  ...over,
});

const ctx = (over = {}) => ({
  userId: 'artist-1',
  workspaceRole: 'ARTIST',
  changeRequests: [],
  hasCurrentArtwork: true as boolean | null,
  ...over,
});

describe('vai trò', () => {
  it('chuẩn hóa hoa/thường và nhận Editor, Producer là người duyệt', () => {
    expect(normalizeRole('Artist')).toBe('ARTIST');
    expect(isReviewerRole('Editor')).toBe(true);
    expect(isReviewerRole('PRODUCER')).toBe(true);
    expect(isReviewerRole('WRITER')).toBe(false);
    expect(isReviewerRole(null)).toBe(false);
  });
});

describe('artwork', () => {
  it('chỉ việc Artist trên Page/Panel cần artwork', () => {
    expect(needsArtwork(assignment())).toBe(true);
    expect(needsArtwork(assignment({ entityType: 'Panel' }))).toBe(true);
    expect(needsArtwork(assignment({ entityType: 'Chapter' }))).toBe(false);
    expect(needsArtwork(assignment({ assignedRole: 'Writer' as never }))).toBe(false);
  });

  it('resolvePageId: Page lấy thẳng, Panel suy ra từ StageProgress, Chapter là null', () => {
    const progress = [{ panelId: 'panel-9', pageId: 'page-3' }];
    expect(resolvePageId(assignment(), progress)).toBe('page-1');
    expect(
      resolvePageId(assignment({ entityType: 'Panel', targetEntityId: 'panel-9' }), progress),
    ).toBe('page-3');
    expect(
      resolvePageId(assignment({ entityType: 'Panel', targetEntityId: 'panel-x' }), progress),
    ).toBeNull();
    expect(resolvePageId(assignment({ entityType: 'Chapter' }), progress)).toBeNull();
  });

  const art = (createdAt: string, pageId = 'page-1', stage = 'stage-1', panelId?: string) => ({
    pageId,
    pipelineStageId: stage,
    createdAt,
    panelId,
  });

  it('hasCurrentArtwork: đúng trang và đúng stage', () => {
    expect(hasCurrentArtwork([art('2026-10-06T10:00:00Z')], 'page-1', 'stage-1', null)).toBe(true);
    expect(
      hasCurrentArtwork([art('2026-10-06T10:00:00Z', 'page-2')], 'page-1', 'stage-1', null),
    ).toBe(false);
    expect(
      hasCurrentArtwork(
        [art('2026-10-06T10:00:00Z', 'page-1', 'stage-2')],
        'page-1',
        'stage-1',
        null,
      ),
    ).toBe(false);
    expect(hasCurrentArtwork([], 'page-1', 'stage-1', null)).toBe(false);
    expect(hasCurrentArtwork([art('2026-10-06T10:00:00Z')], null, 'stage-1', null)).toBe(false);
  });

  it('hasCurrentArtwork: thoả mãn khi có ảnh cả trang HOẶC tất cả panel có ảnh riêng', () => {
    const panels = ['p-1', 'p-2'];
    // Chỉ có ảnh cả trang -> true
    expect(
      hasCurrentArtwork([art('2026-10-06T10:00:00Z')], 'page-1', 'stage-1', null, panels),
    ).toBe(true);

    // Có ảnh từng panel nhưng thiếu 1 panel -> false
    expect(
      hasCurrentArtwork(
        [art('2026-10-06T10:00:00Z', 'page-1', 'stage-1', 'p-1')],
        'page-1',
        'stage-1',
        null,
        panels,
      ),
    ).toBe(false);

    // Đủ ảnh cho tất cả panel -> true
    expect(
      hasCurrentArtwork(
        [
          art('2026-10-06T10:00:00Z', 'page-1', 'stage-1', 'p-1'),
          art('2026-10-06T10:00:00Z', 'page-1', 'stage-1', 'p-2'),
        ],
        'page-1',
        'stage-1',
        null,
        panels,
      ),
    ).toBe(true);
  });

  it('sau khi bị trả về phải có bản mới hơn lần từ chối (BR-01)', () => {
    const rejectedAt = '2026-10-06T12:00:00Z';
    expect(hasCurrentArtwork([art('2026-10-06T11:00:00Z')], 'page-1', 'stage-1', rejectedAt)).toBe(
      false,
    );
    expect(hasCurrentArtwork([art('2026-10-06T12:00:00Z')], 'page-1', 'stage-1', rejectedAt)).toBe(
      true,
    );
    expect(hasCurrentArtwork([art('2026-10-06T13:00:00Z')], 'page-1', 'stage-1', rejectedAt)).toBe(
      true,
    );
  });

  it('lastRejectedAt lấy lần từ chối mới nhất, bỏ qua Pending/Approved', () => {
    expect(lastRejectedAt([])).toBeNull();
    expect(
      lastRejectedAt([
        { status: 'Rejected', decidedAt: '2026-10-06T10:00:00Z' },
        { status: 'Approved', decidedAt: '2026-10-06T15:00:00Z' },
        { status: 'Rejected', decidedAt: '2026-10-06T12:00:00Z' },
        { status: 'Pending', decidedAt: null },
      ]),
    ).toBe('2026-10-06T12:00:00Z');
  });
});

describe('getWorkActions: người nhận', () => {
  it('Assigned hoặc ReworkRequired thì được bắt đầu; không nộp, không duyệt', () => {
    for (const status of ['Assigned', 'ReworkRequired'] as const) {
      const r = getWorkActions(assignment({ status }), ctx());
      expect(r.canStart).toBe(true);
      expect(r.canSubmit).toBe(false);
      expect(r.canDecide).toBe(false);
    }
  });

  it('InProgress + đủ artwork + không còn yêu cầu Open thì nộp được', () => {
    const r = getWorkActions(assignment(), ctx());
    expect(r.canSubmit).toBe(true);
    expect(r.canUploadArtwork).toBe(true);
    expect(r.submitBlockedReason).toBeNull();
  });

  it('thiếu artwork thì chặn nộp và nói rõ lý do', () => {
    const r = getWorkActions(assignment(), ctx({ hasCurrentArtwork: false }));
    expect(r.canSubmit).toBe(false);
    expect(r.submitBlockedReason).toContain('artwork');
  });

  it('còn yêu cầu sửa Open thì chặn nộp lại; Resolved thì không chặn nộp', () => {
    const open = getWorkActions(assignment(), ctx({ changeRequests: [{ status: 'Open' }] }));
    expect(open.canSubmit).toBe(false);
    expect(open.submitBlockedReason).toContain('1 yêu cầu');

    const resolved = getWorkActions(
      assignment(),
      ctx({ changeRequests: [{ status: 'Resolved' }] }),
    );
    expect(resolved.canSubmit).toBe(true);
  });

  it('việc cấp Chapter (Writer) không cần artwork', () => {
    const r = getWorkActions(
      assignment({ entityType: 'Chapter', assignedRole: 'Writer' as never }),
      ctx({ workspaceRole: 'WRITER', hasCurrentArtwork: false }),
    );
    expect(r.canSubmit).toBe(true);
    expect(r.canUploadArtwork).toBe(false);
  });

  it('người không phải người nhận không có nút làm việc nào', () => {
    const r = getWorkActions(
      assignment(),
      ctx({ userId: 'someone-else', workspaceRole: 'ARTIST' }),
    );
    expect(r.canStart).toBe(false);
    expect(r.canSubmit).toBe(false);
    expect(r.canUploadArtwork).toBe(false);
    expect(r.submitBlockedReason).toBeNull();
  });
});

describe('getWorkActions: người duyệt', () => {
  const editor = { userId: 'editor-1', workspaceRole: 'EDITOR' };

  it('Editor mở review việc đã nộp, rồi mới duyệt/trả về được', () => {
    expect(getWorkActions(assignment({ status: 'Submitted' }), ctx(editor)).canOpenReview).toBe(
      true,
    );
    expect(getWorkActions(assignment({ status: 'Submitted' }), ctx(editor)).canDecide).toBe(false);

    const underReview = getWorkActions(assignment({ status: 'UnderReview' }), ctx(editor));
    expect(underReview.canOpenReview).toBe(false);
    expect(underReview.canDecide).toBe(true);
  });

  it('không ai tự duyệt việc của chính mình (BR-06)', () => {
    const self = getWorkActions(
      assignment({ status: 'UnderReview', assigneeUserId: 'editor-1' }),
      ctx(editor),
    );
    expect(self.canDecide).toBe(false);
    expect(self.canOpenReview).toBe(false);
  });

  it('Writer/Artist không duyệt được', () => {
    expect(
      getWorkActions(
        assignment({ status: 'UnderReview' }),
        ctx({ userId: 'w', workspaceRole: 'WRITER' }),
      ).canDecide,
    ).toBe(false);
  });

  it('còn yêu cầu Open hoặc Resolved chưa xác minh thì cảnh báo trước khi duyệt', () => {
    const blocked = getWorkActions(
      assignment({ status: 'UnderReview' }),
      ctx({
        ...editor,
        changeRequests: [{ status: 'Resolved' }, { status: 'Open' }, { status: 'Verified' }],
      }),
    );
    expect(blocked.approveBlockedReason).toContain('2 yêu cầu');

    const clear = getWorkActions(
      assignment({ status: 'UnderReview' }),
      ctx({ ...editor, changeRequests: [{ status: 'Verified' }, { status: 'Rejected' }] }),
    );
    expect(clear.approveBlockedReason).toBeNull();
  });

  it('countUnclosed phân biệt nộp lại (Open) với duyệt (Open + Resolved)', () => {
    const crs = [
      { status: 'Open' },
      { status: 'Resolved' },
      { status: 'Verified' },
      { status: 'Rejected' },
    ] satisfies { status: 'Open' | 'Resolved' | 'Verified' | 'Rejected' }[];
    expect(countUnclosed(crs, false)).toBe(1);
    expect(countUnclosed(crs, true)).toBe(2);
  });
});

describe('vùng ChangeRequest', () => {
  it('đổi phần trăm sang JSON chuẩn hóa 0–1', () => {
    expect(JSON.parse(buildRegionJson({ x: '10', y: '20', w: '30', h: '40' })!)).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.3,
      h: 0.4,
    });
  });

  it('để trống hoàn toàn thì không có vùng và hợp lệ', () => {
    expect(buildRegionJson({})).toBeNull();
    expect(buildRegionJson({ x: '', y: ' ', w: '', h: '' })).toBeNull();
    expect(isRegionInputValid({})).toBe(true);
  });

  it.each<[Partial<Record<'x' | 'y' | 'w' | 'h', string>>, string]>([
    [{ x: '10', y: '20', w: '30' }, 'thiếu h'],
    [{ x: '90', y: '0', w: '20', h: '10' }, 'vượt khỏi ảnh'],
    [{ x: '0', y: '0', w: '0', h: '10' }, 'w = 0'],
    [{ x: '-5', y: '0', w: '10', h: '10' }, 'âm'],
    [{ x: 'abc', y: '0', w: '10', h: '10' }, 'không phải số'],
  ])('nhập dở hoặc sai bị chặn (%j: %s)', (input) => {
    expect(buildRegionJson(input)).toBeNull();
    expect(isRegionInputValid(input)).toBe(false);
  });

  it('describeRegion đọc được JSON Backend trả về, JSON hỏng thì null', () => {
    expect(describeRegion('{"x":0.1,"y":0.2,"w":0.3,"h":0.4}')).toBe(
      'x 10%, y 20%, rộng 30%, cao 40%',
    );
    expect(describeRegion('not json')).toBeNull();
    expect(describeRegion(null)).toBeNull();
  });
});

describe('isOverdue', () => {
  it('quá hạn khi hạn đã qua', () => {
    const now = new Date('2026-10-06T12:00:00Z');
    expect(isOverdue('2026-10-05T00:00:00Z', now)).toBe(true);
    expect(isOverdue('2026-10-07T00:00:00Z', now)).toBe(false);
    expect(isOverdue(null, now)).toBe(false);
  });
});
