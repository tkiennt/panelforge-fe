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

const CACHE_KEY = 'pf_reader_account';

const readCache = (): boolean | null => {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
};

const writeCache = (value: boolean | null) => {
  try {
    if (value === null) localStorage.removeItem(CACHE_KEY);
    else localStorage.setItem(CACHE_KEY, value ? '1' : '0');
  } catch {
    // trình duyệt chặn storage: chỉ mất phần hiển thị nhanh khi tải lại trang
  }
};

/**
 * `isReader`: true/false khi đã biết, null khi đang chờ landing-context (chỉ với User).
 * Giá trị lần trước được nhớ trên máy để tải lại trang không phải chờ.
 */
export function useReaderAccount(isAuthenticated: boolean, currentRole: SystemRole) {
  const [fetched, setFetched] = useState<boolean | null>(() =>
    isAuthenticated ? readCache() : null,
  );
  const isUser = isAuthenticated && currentRole === 'USER';
  // Đăng xuất / đổi vai trò: bỏ kết quả của phiên trước để người đăng nhập sau không dùng nhầm.
  const [prevIsUser, setPrevIsUser] = useState(isUser);
  if (prevIsUser !== isUser) {
    setPrevIsUser(isUser);
    if (!isUser) setFetched(null);
  }

  useEffect(() => {
    if (!isAuthenticated) writeCache(null);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isUser || localStorage.getItem('token')?.startsWith('mock-')) return;
    let active = true;
    authService
      .getLandingContext()
      .then((landing) => {
        if (!active) return;
        const value = isReaderLanding(landing);
        writeCache(value);
        setFetched(value);
      })
      .catch(() => {
        // Không đọc được landing-context: giữ giao diện Studio như trước, backend vẫn chặn quyền.
        if (active) setFetched(false);
      });
    return () => {
      active = false;
    };
  }, [isUser]);

  const setFromLanding = useCallback((landing?: LandingContextDto | null) => {
    if (!landing) return;
    const value = isReaderLanding(landing);
    writeCache(value);
    setFetched(value);
  }, []);

  /** Gọi lại sau khi độc giả nhận lời mời vào Studio. */
  const refresh = useCallback(async (): Promise<boolean> => {
    const landing = await authService.getLandingContext();
    setFromLanding(landing);
    return isReaderLanding(landing);
  }, [setFromLanding]);

  const isReader: boolean | null = !isUser
    ? false
    : localStorage.getItem('token')?.startsWith('mock-')
      ? false
      : fetched;

  return { isReader, setFromLanding, refresh };
}
