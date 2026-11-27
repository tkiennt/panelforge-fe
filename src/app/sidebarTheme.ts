export type SidebarTheme = 'paper' | 'ink' | 'ocean' | 'plum';
export const DEFAULT_SIDEBAR_THEME: SidebarTheme = 'ink';
export const SIDEBAR_THEME_STORAGE_KEY = 'pf.sidebar.theme';
export const SIDEBAR_THEME_CHANGE_EVENT = 'pf:sidebar-theme-change';

export const SIDEBAR_THEMES: Array<{ id: SidebarTheme; bg: string; accent: string }> = [
  { id: 'paper', bg: '#F7F3EA', accent: '#C2410C' },
  { id: 'ink', bg: '#1C1917', accent: '#F97316' },
  { id: 'ocean', bg: '#0F1B2D', accent: '#2DD4BF' },
  { id: 'plum', bg: '#241B2F', accent: '#C4B5FD' },
];
export const SIDEBAR_ID = 'app-shell-sidebar';

export const isSidebarTheme = (value: unknown): value is SidebarTheme =>
  SIDEBAR_THEMES.some((theme) => theme.id === value);

export const readSidebarTheme = (): SidebarTheme => {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_THEME;
  try {
    const saved = window.localStorage.getItem(SIDEBAR_THEME_STORAGE_KEY);
    return isSidebarTheme(saved) ? saved : DEFAULT_SIDEBAR_THEME;
  } catch {
    return DEFAULT_SIDEBAR_THEME;
  }
};
