// src/roles/writer/machines/chapterScriptMachine.test.ts
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { chapterScriptMachine } from './chapterScriptMachine';

describe('chapterScriptMachine (Workflow State Engine)', () => {
  it('khởi tạo và chuyển sang drafting khi kịch bản chưa đóng băng', () => {
    const actor = createActor(chapterScriptMachine);
    actor.start();

    expect(actor.getSnapshot().value).toBe('drafting');
  });

  it('chặn PRODUCER_FREEZE nếu chưa qua rào chắn Series Bible', () => {
    const actor = createActor(chapterScriptMachine);
    actor.start();

    // Giả lập Bible Gate chưa đạt
    actor.send({ type: 'BIBLE_GATE_CHECKED', isPassed: false, pendingCount: 2 });
    actor.send({ type: 'PRODUCER_FREEZE' });

    // Vẫn ở drafting và có ghi nhận lỗi
    expect(actor.getSnapshot().value).toBe('drafting');
    expect(actor.getSnapshot().context.lastError).toContain('Rào chắn Series Bible chưa đạt');
  });

  it('cho phép PRODUCER_FREEZE khi Bible Gate đã CanonLocked', () => {
    const actor = createActor(chapterScriptMachine);
    actor.start();

    // Bible Gate đạt 100%
    actor.send({ type: 'BIBLE_GATE_CHECKED', isPassed: true, pendingCount: 0 });
    actor.send({ type: 'PRODUCER_FREEZE' });

    // Chuyển sang frozen (Read-only)
    expect(actor.getSnapshot().value).toBe('frozen');
  });

  it('quản lý quy trình xin mở lại kịch bản (Request Reopen -> Approve -> UnfrozenRevision)', () => {
    const actor = createActor(chapterScriptMachine);
    actor.start();

    // Đóng băng kịch bản
    actor.send({ type: 'BIBLE_GATE_CHECKED', isPassed: true, pendingCount: 0 });
    actor.send({ type: 'PRODUCER_FREEZE' });
    expect(actor.getSnapshot().value).toBe('frozen');

    // Writer gửi yêu cầu mở lại
    actor.send({ type: 'REQUEST_REOPEN', reason: 'Sửa twist câu thoại' });
    expect(actor.getSnapshot().value).toBe('reopenRequested');

    // Producer chấp thuận mở kịch bản
    actor.send({ type: 'PRODUCER_APPROVE_REOPEN' });
    expect(actor.getSnapshot().value).toBe('unfrozenRevision');
  });
});

