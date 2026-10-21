export type SidebarTheme = 'paper' | 'ink' | 'ocean' | 'plum';
export const SIDEBAR_THEMES: Array<{ id: SidebarTheme; bg: string; accent: string }> = [
  { id: 'paper', bg: '#F7F3EA', accent: '#C2410C' },
  { id: 'ink', bg: '#1C1917', accent: '#F97316' },
  { id: 'ocean', bg: '#0F1B2D', accent: '#2DD4BF' },
  { id: 'plum', bg: '#241B2F', accent: '#C4B5FD' },
];
export const SIDEBAR_ID = 'app-shell-sidebar';
