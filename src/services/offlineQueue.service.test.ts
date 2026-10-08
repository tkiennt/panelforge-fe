import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { offlineQueueService } from './offlineQueue.service';

vi.mock('../api/axiosClient');

describe('offlineQueueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    offlineQueueService.clearQueue();
  });

  afterEach(() => {
    offlineQueueService.clearQueue();
  });

  it('enqueue thêm item vào hàng đợi và lưu vào localStorage', () => {
    const item = offlineQueueService.enqueue({
      type: 'ADD_ELEMENT',
      endpoint: '/pages/page-1/elements',
      method: 'POST',
      payload: { elementType: 'DialogueBalloon', content: 'Hello' },
      clientRefId: 'client-ref-1',
    });

    expect(item.id).toBeDefined();
    expect(item.clientRefId).toBe('client-ref-1');

    const state = offlineQueueService.getState();
    expect(state.pendingCount).toBe(1);
    expect(state.items[0].clientRefId).toBe('client-ref-1');
  });

  it('flushQueue gửi các item thành công và xoá khỏi hàng đợi', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { success: true } });

    offlineQueueService.enqueue(
      {
        type: 'CREATE_SCRIPT_LINE',
        endpoint: '/chapters/chap-1/scenes/scene-1/script-lines',
        method: 'POST',
        payload: { dialogueText: 'Test line', clientLineId: 'line-uuid' },
        clientRefId: 'line-uuid',
      },
      { autoFlush: false },
    );

    const result = await offlineQueueService.flushQueue();

    expect(axiosClient.post).toHaveBeenCalledWith('/chapters/chap-1/scenes/scene-1/script-lines', {
      dialogueText: 'Test line',
      clientLineId: 'line-uuid',
    });
    expect(result.succeeded).toBe(1);
    expect(offlineQueueService.getState().pendingCount).toBe(0);
  });

  it('flushQueue dừng lại và giữ lại hàng đợi nếu gặp lỗi mạng (ERR_NETWORK)', async () => {
    const networkError: any = new Error('Network Error');
    networkError.code = 'ERR_NETWORK';
    vi.mocked(axiosClient.post).mockRejectedValueOnce(networkError);

    offlineQueueService.enqueue(
      {
        type: 'ADD_ELEMENT',
        endpoint: '/pages/page-1/elements',
        method: 'POST',
        payload: { content: 'Offline text' },
        clientRefId: 'elem-uuid',
      },
      { autoFlush: false },
    );

    const result = await offlineQueueService.flushQueue();

    expect(result.failed).toBe(1);
    expect(offlineQueueService.getState().pendingCount).toBe(1);
    expect(offlineQueueService.getState().isOnline).toBe(false);
  });

  it('subscribe nhận cập nhật trạng thái khi hàng đợi thay đổi', () => {
    const listener = vi.fn();
    const unsubscribe = offlineQueueService.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pendingCount: 0 }));

    offlineQueueService.enqueue({
      type: 'SET_READING_ORDER',
      endpoint: '/pages/p1/elements/e1/reading-order',
      method: 'PUT',
      payload: { readingOrder: 2 },
      clientRefId: 'ref-ro',
    });

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pendingCount: 1 }));

    unsubscribe();
  });

  it('flushQueue gặp lỗi 409 Conflict thì giữ lại item và phát sự kiện panelforge:offline_conflict (Lỗi 3)', async () => {
    const conflictError: any = new Error('Conflict');
    conflictError.response = {
      status: 409,
      data: {
        code: 'CONFLICT',
        conflict: 'ELEMENT_VERSION_CONFLICT',
        message: 'Phiên bản phần tử đã thay đổi bởi người khác',
      },
    };
    vi.mocked(axiosClient.put).mockRejectedValueOnce(conflictError);

    const conflictHandler = vi.fn();
    window.addEventListener('panelforge:offline_conflict', conflictHandler);

    offlineQueueService.enqueue(
      {
        type: 'UPDATE_ELEMENT_TEXT',
        endpoint: '/pages/p1/elements/e1/text',
        method: 'PUT',
        payload: { content: 'New Text', expectedElementVersion: 1 },
        clientRefId: 'elem-1',
      },
      { autoFlush: false },
    );

    const result = await offlineQueueService.flushQueue();

    expect(result.failed).toBe(1);
    expect(offlineQueueService.getState().pendingCount).toBe(1);
    expect(conflictHandler).toHaveBeenCalledTimes(1);

    const conflicts = offlineQueueService.getConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].lastStatusCode).toBe(409);

    window.removeEventListener('panelforge:offline_conflict', conflictHandler);
  });

  it('cô lập hàng đợi theo từng tài khoản đăng nhập (Lỗi 5)', () => {
    // User A
    localStorage.setItem('user', JSON.stringify({ id: 'user-a' }));
    offlineQueueService.enqueue({
      type: 'ADD_ELEMENT',
      endpoint: '/pages/p1/elements',
      method: 'POST',
      payload: { content: 'From user A' },
      clientRefId: 'a-1',
    });
    expect(offlineQueueService.getState().pendingCount).toBe(1);

    // Switch to User B
    localStorage.setItem('user', JSON.stringify({ id: 'user-b' }));
    expect(offlineQueueService.getState().pendingCount).toBe(0);

    // Back to User A
    localStorage.setItem('user', JSON.stringify({ id: 'user-a' }));
    expect(offlineQueueService.getState().pendingCount).toBe(1);
  });
});
