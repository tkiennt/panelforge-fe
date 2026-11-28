import { useCallback, useEffect, useState } from 'react';
import { authService, type LandingContextDto } from '@/services/auth.service';
import type { SystemRole } from '@/types';

/**
 * Độc giả = User không thuộc Studio nào và không được tạo Studio (quyết định 2026-11-28, phương án A).
 * Backend đã tính sẵn điều này ở landing-context (`suggestedLanding = PublicCatalog`).
 */
export const isReaderLanding = (
  landing?: Pick<LandingContextDto, 'suggestedLanding'> | null,
): boolean => landing?.suggestedLanding === 'PublicCatalog';

/** Trang tương ứng trong khu độc giả khi độc giả mở một route của Studio. */
export function readerPathFor(pathname: string): string {
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return '/catalog/profile';
  if (pathname === '/notifications' || pathname.startsWith('/notifications/')) {
    return '/catalog/notifications';
  }
  return '/catalog';
}

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 15000;

/**
 * `isReader`: true/false khi đã biết, null khi đang chờ landing-context (chỉ với User).
 * Không nhớ kết quả trên máy: lời mời được nhận hay gói vừa mua làm kết quả cũ sai ngay, và gate đã có
 * màn chờ khi null. Lỗi mạng thì giữ null và thử lại (lùi dần), không đoán là thành viên Studio.
 */
export function useReaderAccount(
  isAuthenticated: boolean,
  currentRole: SystemRole,
  userId?: string | null,
) {
  const isUser = isAuthenticated && currentRole === 'USER';
  const accountKey = isUser ? (userId ?? '') : null;
  const [fetched, setFetched] = useState<boolean | null>(null);
  // Đăng xuất / đổi tài khoản / đổi vai trò: bỏ kết quả của tài khoản trước.
  const [prevKey, setPrevKey] = useState(accountKey);
  if (prevKey !== accountKey) {
    setPrevKey(accountKey);
    setFetched(null);
  }

  const isMock = () => localStorage.getItem('token')?.startsWith('mock-') ?? false;

  useEffect(() => {
    if (accountKey === null || isMock()) return;
    let active = true;
    let timer: number | undefined;
    const load = (attempt: number) => {
      authService
        .getLandingContext()
        .then((landing) => {
          if (active) setFetched(isReaderLanding(landing));
        })
        .catch(() => {
          if (!active) return;
          const delay = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
          timer = window.setTimeout(() => load(attempt + 1), delay);
        });
    };
    load(0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [accountKey]);

  const setFromLanding = useCallback((landing?: LandingContextDto | null) => {
    if (landing) setFetched(isReaderLanding(landing));
  }, []);

  /** Tài khoản vừa thành thành viên / được tạo Studio: mở khu Studio ngay, không chờ landing-context. */
  const markStudioMember = useCallback(() => setFetched(false), []);

  const isReader: boolean | null = !isUser ? false : isMock() ? false : fetched;

  return { isReader, setFromLanding, markStudioMember };
}
