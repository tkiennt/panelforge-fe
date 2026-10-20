import { refreshAccessToken } from './axiosClient';

// Access token sống 30 phút; làm mới khi người dùng còn thao tác để màn vẽ/soạn kịch bản (ít gọi API)
// không bị văng ra. Chỉ refresh khi CÓ hoạt động kể từ lần refresh trước: người rời máy vẫn hết phiên
// theo idle timeout của workspace (BE kiểm LastActiveAt khi refresh).
export const KEEP_ALIVE_REFRESH_MS = 10 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;

/** Bắt đầu theo dõi hoạt động và làm mới phiên ngầm. Trả về hàm dọn dẹp. */
export function startSessionKeepAlive(now: () => number = Date.now): () => void {
  let lastActivity = now();
  let lastRefresh = now();
  let inFlight = false;

  const markActive = () => {
    lastActivity = now();
  };

  const tick = async () => {
    if (inFlight || document.visibilityState !== 'visible') return;
    if (lastActivity <= lastRefresh || now() - lastRefresh < KEEP_ALIVE_REFRESH_MS) return;
    inFlight = true;
    try {
      // Thất bại vì phiên bị từ chối: refreshAccessToken tự clearSession + phát auth:unauthorized.
      if (await refreshAccessToken()) lastRefresh = now();
    } finally {
      inFlight = false;
    }
  };

  ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
  document.addEventListener('visibilitychange', tick);
  const timer = window.setInterval(tick, CHECK_EVERY_MS);

  return () => {
    ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
    document.removeEventListener('visibilitychange', tick);
    window.clearInterval(timer);
  };
}
