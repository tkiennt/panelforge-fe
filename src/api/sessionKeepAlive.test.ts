import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const refreshAccessToken = vi.fn();
vi.mock('./axiosClient', () => ({ refreshAccessToken: () => refreshAccessToken() }));

import { startSessionKeepAlive, KEEP_ALIVE_REFRESH_MS } from './sessionKeepAlive';

describe('startSessionKeepAlive', () => {
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    refreshAccessToken.mockReset().mockResolvedValue('ok');
  });
  afterEach(() => {
    stop?.();
    vi.useRealTimers();
  });

  it('làm mới phiên khi người dùng còn thao tác sau mốc 10 phút', async () => {
    stop = startSessionKeepAlive();
    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_REFRESH_MS - 60_000);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('không làm mới khi người dùng rời máy, để idle timeout của workspace vẫn có hiệu lực', async () => {
    stop = startSessionKeepAlive();
    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_REFRESH_MS * 3);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('dọn listener và interval khi dừng', async () => {
    stop = startSessionKeepAlive();
    stop();
    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_REFRESH_MS);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_REFRESH_MS);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
