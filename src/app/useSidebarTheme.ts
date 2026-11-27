import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SIDEBAR_THEME,
  isSidebarTheme,
  readSidebarTheme,
  SIDEBAR_THEME_CHANGE_EVENT,
  SIDEBAR_THEME_STORAGE_KEY,
  type SidebarTheme,
} from './sidebarTheme';

export const useSidebarTheme = () => {
  const [sidebarTheme, setSidebarThemeState] = useState<SidebarTheme>(readSidebarTheme);

  useEffect(() => {
    const syncTheme = (value: unknown) => {
      setSidebarThemeState(isSidebarTheme(value) ? value : DEFAULT_SIDEBAR_THEME);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SIDEBAR_THEME_STORAGE_KEY) syncTheme(event.newValue);
    };
    const handleLocalChange = (event: Event) => {
      syncTheme((event as CustomEvent<SidebarTheme>).detail);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SIDEBAR_THEME_CHANGE_EVENT, handleLocalChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SIDEBAR_THEME_CHANGE_EVENT, handleLocalChange);
    };
  }, []);

  const setSidebarTheme = useCallback((next: SidebarTheme) => {
    setSidebarThemeState(next);
    try {
      window.localStorage.setItem(SIDEBAR_THEME_STORAGE_KEY, next);
    } catch {
      // Keep the in-memory preference when browser storage is unavailable.
    }
    window.dispatchEvent(
      new CustomEvent<SidebarTheme>(SIDEBAR_THEME_CHANGE_EVENT, { detail: next }),
    );
  }, []);

  return [sidebarTheme, setSidebarTheme] as const;
};
