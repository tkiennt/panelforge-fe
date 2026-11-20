import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { aiStreamService, StepRecordedEvent, RunStatusChangedEvent } from './aiStream.service';

describe('aiStreamService', () => {
  beforeEach(async () => {
    await aiStreamService.disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('không còn phơi bày onTokenChunk hay đăng ký listener TokenChunk khi kết nối Hub', async () => {
    expect('onTokenChunk' in aiStreamService).toBe(false);
    expect('tokenHandlers' in aiStreamService).toBe(false);

    const on = vi.fn();
    const fakeConnection = {
      state: HubConnectionState.Connected,
      on,
      onreconnected: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      invoke: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(HubConnectionBuilder.prototype, 'build').mockReturnValue(fakeConnection as never);

    await aiStreamService.connect();

    const registeredEvents = on.mock.calls.map(([eventName]) => eventName);
    expect(registeredEvents).toEqual(['StepRecorded', 'RunStatusChanged']);
    expect(registeredEvents).not.toContain('TokenChunk');
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
