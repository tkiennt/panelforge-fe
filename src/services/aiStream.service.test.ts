import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  aiStreamService,
  TokenChunkEvent,
  StepRecordedEvent,
  RunStatusChangedEvent,
} from './aiStream.service';

describe('aiStreamService', () => {
  beforeEach(async () => {
    await aiStreamService.disconnect();
  });

  it('cho phép đăng ký và huỷ lắng nghe sự kiện TokenChunk', () => {
    const handler = vi.fn();
    const unsub = aiStreamService.onTokenChunk(handler);

    const dummyEvent: TokenChunkEvent = {
      runId: 'run-123',
      agent: 'Writer',
      stepIndex: 1,
      deltaText: 'Chào bạn',
      isFinal: false,
    };

    // Gọi nội bộ qua dispatch
    (aiStreamService as any).tokenHandlers.forEach((h: any) => h(dummyEvent));
    expect(handler).toHaveBeenCalledWith(dummyEvent);

    unsub();
    (aiStreamService as any).tokenHandlers.forEach((h: any) => h(dummyEvent));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cho phép đăng ký và huỷ lắng nghe sự kiện StepRecorded', () => {
    const handler = vi.fn();
    const unsub = aiStreamService.onStepRecorded(handler);

    const dummyEvent: StepRecordedEvent = {
      runId: 'run-123',
      stepIndex: 1,
      agent: 'Writer',
      round: 0,
      succeeded: true,
      outputJson: '{}',
      runStatus: 'Running',
    };

    (aiStreamService as any).stepHandlers.forEach((h: any) => h(dummyEvent));
    expect(handler).toHaveBeenCalledWith(dummyEvent);

    unsub();
    (aiStreamService as any).stepHandlers.forEach((h: any) => h(dummyEvent));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cho phép đăng ký và huỷ lắng nghe sự kiện RunStatusChanged', () => {
    const handler = vi.fn();
    const unsub = aiStreamService.onRunStatusChanged(handler);

    const dummyEvent: RunStatusChangedEvent = {
      runId: 'run-123',
      status: 'Completed',
    };

    (aiStreamService as any).statusHandlers.forEach((h: any) => h(dummyEvent));
    expect(handler).toHaveBeenCalledWith(dummyEvent);

    unsub();
    (aiStreamService as any).statusHandlers.forEach((h: any) => h(dummyEvent));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('xử lý an toàn khi joinRun và leaveRun không có server chạy', async () => {
    await expect(aiStreamService.joinRun('run-test-456')).resolves.toBeUndefined();
    await expect(aiStreamService.leaveRun('run-test-456')).resolves.toBeUndefined();
  });
});
