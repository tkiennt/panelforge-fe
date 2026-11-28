/* Adapted for PanelForge Editorial AI Studio Design System from Stitch Complete UI */

import React, { useState, useEffect, useRef, useId } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronsUpDown,
  LogOut,
  Settings,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  UserCircle,
} from 'lucide-react';
import { CurrentUser } from './AppShell';
import { getRoleDefaultPath } from '@/roles/roles';
import { SeriesDto, seriesService } from '@/services/series.service';
import { useTranslation } from '@/lib/i18n';
import { SidebarItem } from '@/shared/ui';
import { SIDEBAR_ID, SIDEBAR_THEMES, type SidebarTheme } from './sidebarTheme';

/** Ảnh đại diện người dùng; ảnh lỗi/không có thì hiện chữ viết tắt (giống header AppShell). */
function SidebarUserAvatar({ user, className }: { user: CurrentUser; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = user.avatarUrl && user.avatarUrl !== failedUrl ? user.avatarUrl : null;
  return (
    <div
      className={`w-8 h-8 rounded-full overflow-hidden text-white flex items-center justify-center text-xs shrink-0 ${className}`}
    >
      {url ? (
        <img
          src={url}
          alt=''
          width={32}
          height={32}
          className='w-full h-full object-cover'
          onError={() => setFailedUrl(url)}
        />
      ) : (
        user.avatarInitials
      )}
    </div>
  );
}

export interface SidebarNavItem {
  icon?: React.ElementType;
  label: string;
  href: string;
  badge?: any;
  isActive?: boolean;
  readOnly?: boolean;
  tooltip?: string;
}

export interface AppShellSidebarProps {
  currentUser: CurrentUser;
  activeWorkspace?: { id?: string; name: string } | null;
  activeSeries?: {
    id?: string;
    title: string;
    subtitle?: string;
    status?: string;
    isCompleted?: boolean;
    chaptersCount?: number;
  } | null;
  workspaceId?: string;
  seriesId?: string;
  isReader?: boolean;
  navSections: Array<{
    section: string;
    items: SidebarNavItem[];
  }>;
  handleNavClick: (e: React.MouseEvent, href: string) => void;
  renderBadge: (badge: any) => React.ReactNode;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenActivityHistory?: () => void;
  onOpenTwoFactor?: () => void;
  onLogout?: () => void;
  onSelectSeries?: (seriesId: string) => void;
  isRailExpanded?: boolean;
  isCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onToggleCollapse?: () => void;
  onToggleRail?: () => void;
  isMobileDrawer?: boolean;
  theme?: SidebarTheme;
  onChangeTheme?: (theme: SidebarTheme) => void;
  activeChapterNumber?: number | null;
  surfaceClassName?: string;
}

type PopoverPlacement = 'bottom' | 'top' | 'right-start' | 'right-end';

const hasNativeInvoker = () =>
  typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;

const supportsAnchorPos = () =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('position-area', 'block-end');

const invokerAttrs = (targetId: string) =>
  ({ commandfor: targetId, command: 'toggle-popover' }) as Record<string, string>;

const positionPopoverFallback = (
  trigger: HTMLElement | null,
  menu: HTMLElement | null,
  placement: PopoverPlacement,
  preferredWidth?: number,
) => {
  if (!trigger || !menu || supportsAnchorPos()) return;
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  const width = preferredWidth ?? (menu.offsetWidth || 240);
  const height = menu.offsetHeight || 220;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = r.left;
  let top = r.bottom + 4;
  if (placement === 'top') {
    left = r.left;
    top = r.top - height - 8;
  } else if (placement === 'right-start') {
    left = r.right + 8;
    top = r.top;
  } else if (placement === 'right-end') {
    left = r.right + 8;
    top = r.bottom - height;
  }

  menu.style.left = `${Math.max(margin, Math.min(left, vw - width - margin))}px`;
  menu.style.top = `${Math.max(margin, Math.min(top, vh - height - margin))}px`;
};

const safeShowPopover = (menu: HTMLElement | null, source?: HTMLElement | null) => {
  if (!menu) return;
  try {
    const fn = (menu as HTMLElement & { showPopover?: (opts?: { source?: HTMLElement }) => void })
      .showPopover;
    if (typeof fn === 'function') {
      fn.call(menu, source ? { source } : undefined);
    }
  } catch {
    // ignore if already open or unsupported
  }
};

const safeHidePopover = (menu: HTMLElement | null) => {
  if (!menu) return;
  try {
    if (typeof menu.hidePopover === 'function') {
      menu.hidePopover();
    }
  } catch {
    // ignore if already closed
  }
};

export const AppShellSidebar: React.FC<AppShellSidebarProps> = ({
  currentUser,
  activeWorkspace,
  activeSeries,
  workspaceId,
  seriesId,
  isReader,
  navSections,
  handleNavClick,
  renderBadge,
  onLogout,
  onSelectSeries,
  isRailExpanded,
  isCollapsed: isCollapsedProp,
  onToggleSidebar,
  onToggleCollapse,
  onToggleRail,
  isMobileDrawer = false,
  theme = 'ink',
  onChangeTheme,
  activeChapterNumber,
  surfaceClassName,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const uid = useId();
  const seriesTriggerId = `pf-sb-series-trigger-${uid}`;
  const seriesMenuId = `pf-sb-series-menu-${uid}`;
  const userMenuTriggerId = `pf-sb-user-trigger-${uid}`;
  const userMenuId = `pf-sb-user-menu-${uid}`;

  const handleToggle = onToggleSidebar || onToggleCollapse || onToggleRail;
  const isCollapsed =
    !isMobileDrawer &&
    (isCollapsedProp !== undefined
      ? isCollapsedProp
      : isRailExpanded !== undefined
        ? !isRailExpanded
        : false);
  const showFullContent = isMobileDrawer || !isCollapsed;
  const toggleLabel = isCollapsed
    ? t('navigation.sidebar.expand', 'Mở rộng thanh điều hướng')
    : t('navigation.sidebar.collapse', 'Thu gọn thanh điều hướng');

  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const seriesBtnRef = useRef<HTMLButtonElement>(null);
  const seriesMenuRef = useRef<HTMLDivElement>(null);
  const userMenuBtnRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const focusUserMenuOnOpenRef = useRef(false);

  const loadSeries = React.useCallback(() => {
    if (!workspaceId) return;
    setLoadingSeries(true);
    seriesService
      .getSeriesList(workspaceId)
      .then((res) => setSeriesList(res || []))
      .catch((err) => {
        console.error('Không thể nạp danh sách series cho sidebar:', err);
        setSeriesList([]);
      })
      .finally(() => setLoadingSeries(false));
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && showFullContent) loadSeries();
  }, [workspaceId, showFullContent, loadSeries]);

  // Sync native Popover API toggle state for series switcher (no document mousedown listener).
  useEffect(() => {
    const el = seriesMenuRef.current;
    if (!el) return;
    const onBeforeToggle = (ev: Event) => {
      if ((ev as ToggleEvent).newState === 'open') {
        setSeriesMenuOpen(true);
      }
    };
    const onToggle = (ev: Event) => {
      const open = (ev as ToggleEvent).newState === 'open';
      setSeriesMenuOpen(open);
      if (open) {
        setTip(null);
        if (seriesList.length === 0) loadSeries();
        positionPopoverFallback(
          seriesBtnRef.current,
          el,
          showFullContent ? 'bottom' : 'right-start',
          260,
        );
      }
    };
    el.addEventListener('beforetoggle', onBeforeToggle);
    el.addEventListener('toggle', onToggle);
    return () => {
      el.removeEventListener('beforetoggle', onBeforeToggle);
      el.removeEventListener('toggle', onToggle);
    };
  }, [showFullContent, seriesList.length, loadSeries]);

  // Sync native Popover API toggle state for user settings menu (no document mousedown listener).
  useEffect(() => {
    const el = userMenuRef.current;
    if (!el) return;
    const onBeforeToggle = (ev: Event) => {
      if ((ev as ToggleEvent).newState === 'open') {
        setUserMenuOpen(true);
      }
    };
    const onToggle = (ev: Event) => {
      const open = (ev as ToggleEvent).newState === 'open';
      setUserMenuOpen(open);
      if (open) {
        setTip(null);
        positionPopoverFallback(
          userMenuBtnRef.current,
          el,
          showFullContent ? 'top' : 'right-end',
          240,
        );
      }
    };
    el.addEventListener('beforetoggle', onBeforeToggle);
    el.addEventListener('toggle', onToggle);
    return () => {
      el.removeEventListener('beforetoggle', onBeforeToggle);
      el.removeEventListener('toggle', onToggle);
    };
  }, [showFullContent]);

  useEffect(() => {
    safeHidePopover(seriesMenuRef.current);
    safeHidePopover(userMenuRef.current);
    setSeriesMenuOpen(false);
    setUserMenuOpen(false);
    setTip(null);
  }, [isCollapsed]);

  useEffect(() => {
    if (userMenuOpen && focusUserMenuOnOpenRef.current) {
      focusUserMenuOnOpenRef.current = false;
      userMenuRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')
        ?.focus();
    }
  }, [userMenuOpen]);

  if (isReader) return null;

  const closeSeriesMenu = (restoreFocus = false) => {
    safeHidePopover(seriesMenuRef.current);
    setSeriesMenuOpen(false);
    if (restoreFocus) seriesBtnRef.current?.focus();
  };

  const closeUserMenu = (restoreFocus = false) => {
    safeHidePopover(userMenuRef.current);
    setUserMenuOpen(false);
    if (restoreFocus) userMenuBtnRef.current?.focus();
  };

  const handleSeriesTriggerClick = () => {
    if (hasNativeInvoker()) return;
    if (seriesMenuOpen) {
      closeSeriesMenu();
      return;
    }
    if (seriesList.length === 0) loadSeries();
    setTip(null);
    setSeriesMenuOpen(true);
    safeShowPopover(seriesMenuRef.current, seriesBtnRef.current);
    positionPopoverFallback(
      seriesBtnRef.current,
      seriesMenuRef.current,
      showFullContent ? 'bottom' : 'right-start',
      260,
    );
  };

  const handleUserMenuTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) focusUserMenuOnOpenRef.current = true;
    if (hasNativeInvoker()) return;
    if (userMenuOpen) {
      closeUserMenu();
      return;
    }
    setTip(null);
    setUserMenuOpen(true);
    safeShowPopover(userMenuRef.current, userMenuBtnRef.current);
    positionPopoverFallback(
      userMenuBtnRef.current,
      userMenuRef.current,
      showFullContent ? 'top' : 'right-end',
      240,
    );
  };

  const handleUserMenuTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusUserMenuOnOpenRef.current = true;
      if (!userMenuOpen) {
        e.currentTarget.click();
      } else {
        userMenuRef.current
          ?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')
          ?.focus();
      }
    }
  };

  const handleMenuKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    closeMenu: (restoreFocus?: boolean) => void,
  ) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeMenu(true);
      return;
    }
    if (e.key === 'Tab') {
      closeMenu(false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]'),
    );
    if (!items.length) return;
    e.preventDefault();
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  const railTip = (text: string) =>
    isCollapsed
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTip({ text, top: r.top + r.height / 2, left: r.right + 10 });
          },
          onFocus: (e: React.FocusEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTip({ text, top: r.top + r.height / 2, left: r.right + 10 });
          },
          onMouseLeave: () => setTip(null),
          onBlur: () => setTip(null),
        }
      : {};

  const searchParams = new URLSearchParams(location.search);
  const chapterId = searchParams.get('chapterId');
  // chapterId is usually a GUID; prefer explicit activeChapterNumber when available.
  const rawChapterNum = chapterId?.replace(/^chapter-?/i, '').replace(/^chap-?/i, '') ?? '';
  const cleanChapterNum =
    typeof activeChapterNumber === 'number' && activeChapterNumber > 0
      ? String(activeChapterNumber).padStart(2, '0')
      : /^\d+$/.test(rawChapterNum)
        ? rawChapterNum.padStart(2, '0')
        : null;
  const displayChapterNum =
    typeof activeChapterNumber === 'number' && activeChapterNumber > 0
      ? String(activeChapterNumber)
      : cleanChapterNum
        ? String(Number(cleanChapterNum))
        : null;

  const KNOWN_ROLE_KEYS = new Set([
    'producer',
    'writer',
    'artist',
    'letterer',
    'editor',
    'publisher',
    'admin',
    'reader',
    'member',
  ]);
  const resolvedRoleKey = (() => {
    const candidates = [currentUser.workspaceRole, currentUser.activeRoles?.[0], currentUser.role];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const lower = String(candidate).trim().toLowerCase();
      if (KNOWN_ROLE_KEYS.has(lower)) return lower;
    }
    if (location.pathname.includes('/artist')) return 'artist';
    if (location.pathname.includes('/letterer')) return 'letterer';
    if (location.pathname.includes('/editor')) return 'editor';
    if (location.pathname.includes('/script')) return 'writer';
    return 'member';
  })();
  const userRoleDisplay = t(`navigation.roles.${resolvedRoleKey}`, t('navigation.roles.member'));

  const matchedSeries = seriesId ? seriesList.find((s) => s.id === seriesId) : undefined;
  const seriesStatusMeta = (() => {
    if (
      matchedSeries ||
      activeSeries?.isCompleted !== undefined ||
      activeSeries?.chaptersCount !== undefined
    ) {
      const isCompleted = matchedSeries?.isCompleted ?? activeSeries?.isCompleted ?? false;
      const chaptersCount = matchedSeries?.chaptersCount ?? activeSeries?.chaptersCount ?? 0;
      if (isCompleted) {
        return {
          label: t('workspace.studioHub.series.statusCompleted', 'Hoàn thành'),
          className: 'bg-stone-200/80 text-stone-700',
          dotClass: 'bg-stone-500',
        };
      }
      if (chaptersCount === 0) {
        return {
          label: t('workspace.studioHub.series.statusPreProd', 'Tiền kỳ'),
          className: 'bg-amber-100 text-amber-800',
          dotClass: 'bg-amber-500',
        };
      }
      return {
        label: t('workspace.studioHub.series.statusInProd', 'Đang sản xuất'),
        className: 'bg-emerald-50 text-emerald-700',
        dotClass: 'bg-emerald-500',
      };
    }
    if (seriesId && activeSeries?.status) {
      const normalized = activeSeries.status.toLowerCase();
      if (normalized.includes('complet')) {
        return {
          label: t('workspace.studioHub.series.statusCompleted', 'Hoàn thành'),
          className: 'bg-stone-200/80 text-stone-700',
          dotClass: 'bg-stone-500',
        };
      }
      if (normalized.includes('pre')) {
        return {
          label: t('workspace.studioHub.series.statusPreProd', 'Tiền kỳ'),
          className: 'bg-amber-100 text-amber-800',
          dotClass: 'bg-amber-500',
        };
      }
      if (normalized.includes('prod')) {
        return {
          label: t('workspace.studioHub.series.statusInProd', 'Đang sản xuất'),
          className: 'bg-emerald-50 text-emerald-700',
          dotClass: 'bg-emerald-500',
        };
      }
    }
    return {
      label: userRoleDisplay,
      className: 'bg-stone-200/70 text-stone-700',
      dotClass: null as string | null,
    };
  })();

  const seriesLabel = `Series: ${seriesId ? activeSeries?.title || t('navigation.sidebar.activeSeriesFallback', 'Bộ truyện') : t('navigation.sidebar.chooseSeries', 'Chọn Series')}`;
  const themeLabel = t('navigation.sidebar.appearance', 'Giao diện thanh bên');
  const themeName = (id: SidebarTheme) => t(`navigation.sidebar.themes.${id}`);
  const profileSettingsLabel = t('navigation.sidebar.profileAndSettings', 'Hồ sơ & cài đặt');
  const logoutLabel = t('navigation.menu.logout', 'Đăng xuất');
  const backToStudioHref = workspaceId ? `/workspaces/${workspaceId}/series` : '/workspaces';

  const seriesPopoverEl = (
    <div
      ref={seriesMenuRef}
      id={seriesMenuId}
      popover='auto'
      data-placement={showFullContent ? 'bottom' : 'right-start'}
      data-testid='sidebar-series-menu'
      className='pf-sb-popover pf-sb-popover-menu w-[260px] rounded-xl shadow-xl py-1 max-h-64 overflow-y-auto'
    >
      {seriesMenuOpen && (
        <div
          role='menu'
          aria-labelledby={seriesTriggerId}
          onKeyDown={(e) => handleMenuKeyDown(e, closeSeriesMenu)}
        >
          <div className='pf-sb-muted px-3 py-1.5 border-b border-[var(--sb-border)] flex items-center justify-between text-xs font-semibold'>
            <span>{t('navigation.sidebar.seriesInStudio', 'Bộ truyện trong Studio')}</span>
            <button
              type='button'
              onClick={(e) => {
                closeSeriesMenu();
                handleNavClick(e, backToStudioHref);
              }}
              className='text-xs font-medium cursor-pointer text-orange-600 hover:underline'
            >
              {t('navigation.sidebar.allSeries', 'Xem tất cả')}
            </button>
          </div>
          {loadingSeries && (
            <div className='p-3 text-xs text-center text-stone-400'>
              {t('navigation.sidebar.loading', 'Đang tải...')}
            </div>
          )}
          {!loadingSeries && seriesList.length === 0 && (
            <div className='p-3 text-xs text-center text-stone-400'>
              {t('navigation.sidebar.noSeries', 'Chưa có bộ truyện nào')}
            </div>
          )}
          {!loadingSeries &&
            seriesList.map((s) => {
              const isSelected = s.id === seriesId;
              return (
                <button
                  type='button'
                  role='menuitem'
                  key={s.id}
                  onClick={(e) => {
                    closeSeriesMenu();
                    onSelectSeries?.(s.id);
                    const target = getRoleDefaultPath(
                      currentUser.workspaceRole || currentUser.role,
                      workspaceId,
                      s.id,
                    );
                    handleNavClick(e, target);
                  }}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`w-full px-3 py-2 text-xs flex items-center justify-between cursor-pointer text-left transition-colors ${
                    isSelected
                      ? 'bg-orange-500/15 text-[var(--sb-accent)] font-semibold'
                      : 'hover:bg-[var(--sb-hover)] pf-sb-text'
                  }`}
                >
                  <div className='truncate pr-2 min-w-0'>
                    <p className='truncate'>{s.title}</p>
                    <p className='text-xs font-mono pf-sb-muted tabular-nums'>
                      {s.genre || 'Manga'} • {s.chaptersCount || 0}{' '}
                      {t('navigation.sidebar.chaptersCount', 'chương')}
                    </p>
                  </div>
                  {isSelected && <Check className='w-4 h-4 shrink-0 text-orange-600' />}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );

  const userMenuPopoverEl = (
    <div
      ref={userMenuRef}
      id={userMenuId}
      popover='auto'
      data-placement={showFullContent ? 'top' : 'right-end'}
      data-testid='sidebar-user-menu'
      className='pf-sb-popover pf-sb-popover-menu w-[228px] rounded-xl shadow-2xl p-1.5'
    >
      {userMenuOpen && (
        <div
          role='menu'
          aria-labelledby={userMenuTriggerId}
          onKeyDown={(e) => handleMenuKeyDown(e, closeUserMenu)}
        >
          <div className='px-2.5 py-2 border-b border-[var(--sb-border)] mb-1'>
            <p className='pf-sb-text text-xs font-semibold truncate'>{currentUser.name}</p>
            <p className='pf-sb-muted text-xs truncate'>{userRoleDisplay}</p>
          </div>

          <button
            type='button'
            role='menuitem'
            data-testid='sidebar-menu-profile-btn'
            onClick={(e) => {
              closeUserMenu();
              handleNavClick(e, '/profile');
            }}
            className='pf-sb-action w-full min-h-9 px-2.5 py-1.5 flex items-center gap-2.5 rounded-lg text-xs font-medium cursor-pointer text-left transition-colors'
          >
            <UserCircle className='w-4 h-4 shrink-0' aria-hidden='true' />
            <span className='truncate'>{profileSettingsLabel}</span>
          </button>

          {onChangeTheme && (
            <>
              <hr className='my-1.5 border-[var(--sb-border)]' />
              <div role='group' aria-label={themeLabel}>
                <div className='pf-sb-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wider'>
                  {themeLabel}
                </div>
                {SIDEBAR_THEMES.map((opt) => {
                  const selected = opt.id === theme;
                  return (
                    <button
                      key={opt.id}
                      type='button'
                      role='menuitemradio'
                      aria-checked={selected}
                      data-testid={`sidebar-theme-${opt.id}`}
                      onClick={() => {
                        onChangeTheme(opt.id);
                        closeUserMenu();
                      }}
                      className={`pf-sb-action w-full min-h-9 px-2.5 py-1.5 flex items-center gap-2.5 rounded-lg text-xs cursor-pointer text-left transition-colors ${
                        selected ? 'font-semibold' : ''
                      }`}
                      style={selected ? { fontWeight: 600 } : undefined}
                    >
                      <span
                        className='w-4 h-4 rounded-full shrink-0 border flex items-center justify-center'
                        style={{ background: opt.bg, borderColor: '#d6d3d1' }}
                        aria-hidden='true'
                      >
                        <span
                          className='w-1.5 h-1.5 rounded-full'
                          style={{ background: opt.accent }}
                        />
                      </span>
                      <span className='flex-1 truncate'>{themeName(opt.id)}</span>
                      {selected && (
                        <Check className='w-4 h-4 shrink-0 text-orange-600' aria-hidden='true' />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {onLogout && (
            <>
              <hr className='my-1.5 border-[var(--sb-border)]' />
              <button
                type='button'
                role='menuitem'
                data-testid='sidebar-logout-btn'
                onClick={() => {
                  closeUserMenu();
                  onLogout();
                }}
                className='w-full min-h-9 px-2.5 py-1.5 flex items-center gap-2.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer text-left transition-colors'
              >
                <LogOut className='w-4 h-4 text-rose-500 shrink-0' aria-hidden='true' />
                <span className='truncate'>{logoutLabel}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <aside
      id={isMobileDrawer ? undefined : SIDEBAR_ID}
      data-sb-theme={theme}
      style={{ width: isMobileDrawer ? '100%' : showFullContent ? '256px' : '64px' }}
      className={
        isMobileDrawer
          ? `pf-sidebar w-full flex flex-col select-none h-full overflow-hidden ${surfaceClassName || ''}`
          : `pf-sidebar hidden md:flex flex-col shrink-0 select-none z-20 h-full border-r overflow-hidden relative transition-[width] duration-200 ${
              showFullContent ? 'w-64' : 'w-16'
            } ${surfaceClassName || ''}`
      }
      data-collapsed={isCollapsed ? 'true' : 'false'}
      data-testid={isMobileDrawer ? 'mobile-sidebar-nav' : 'app-shell-sidebar'}
      aria-label='Main menu'
    >
      <div className='flex flex-col h-full min-h-0'>
        {/* Header: "← Về Sảnh Studio" + toggle */}
        <div className='pf-sb-chrome h-16 px-4 flex items-center justify-between border-b shrink-0'>
          {showFullContent ? (
            <div className='flex items-center justify-between w-full min-w-0'>
              <button
                type='button'
                data-testid='sidebar-workspace-switcher'
                onClick={(e) => handleNavClick(e, backToStudioHref)}
                className='pf-sb-action flex items-center gap-2 text-xs font-semibold transition-colors py-1.5 px-2 rounded-lg cursor-pointer min-w-0'
              >
                <ArrowLeft className='w-4 h-4 shrink-0' />
                <span className='truncate'>
                  {t('navigation.sidebar.backToStudio', 'Về Sảnh Studio')}
                </span>
              </button>
              <div className='flex items-center gap-1.5 shrink-0 ml-2'>
                {handleToggle && !isMobileDrawer && (
                  <button
                    type='button'
                    onClick={handleToggle}
                    aria-label={toggleLabel}
                    title={toggleLabel}
                    aria-expanded={!isCollapsed}
                    aria-controls={SIDEBAR_ID}
                    data-testid='sidebar-rail-toggle-btn'
                    className='pf-sb-action w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer'
                  >
                    <PanelLeftClose className='w-4 h-4' />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center w-full gap-1 py-1'>
              <button
                type='button'
                data-testid='sidebar-workspace-switcher'
                onClick={(e) => handleNavClick(e, backToStudioHref)}
                className='pf-sb-action w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer'
                title={t('navigation.sidebar.backToStudio', 'Về Sảnh Studio')}
                {...railTip(t('navigation.sidebar.backToStudio', 'Về Sảnh Studio'))}
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
              {handleToggle && !isMobileDrawer && (
                <button
                  type='button'
                  onClick={handleToggle}
                  aria-label={toggleLabel}
                  title={toggleLabel}
                  aria-expanded={!isCollapsed}
                  aria-controls={SIDEBAR_ID}
                  data-testid='sidebar-rail-toggle-btn'
                  className='pf-sb-action w-8 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer'
                >
                  <PanelLeftOpen className='w-4 h-4' />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card: BỘ TRUYỆN ĐANG MỞ */}
        <div className={`shrink-0 ${showFullContent ? 'px-4 py-3' : 'p-2'}`}>
          {showFullContent ? (
            <div className='pf-sb-surface p-3.5 rounded-lg'>
              <div className='flex items-center justify-between gap-2 mb-1.5'>
                <span className='pf-sb-muted text-xs uppercase tracking-wider font-semibold truncate'>
                  {t('navigation.sidebar.activeSeriesLabel', 'BỘ TRUYỆN ĐANG MỞ')}
                </span>
                {displayChapterNum && (
                  <span className='px-2 py-0.5 rounded text-xs font-medium bg-[#EA580C] text-white shrink-0 whitespace-nowrap tabular-nums'>
                    {`${t('navigation.breadcrumbs.chapters')} ${displayChapterNum}`}
                  </span>
                )}
              </div>
              <button
                ref={seriesBtnRef}
                id={seriesTriggerId}
                type='button'
                data-testid='sidebar-series-selector'
                aria-haspopup='menu'
                aria-expanded={seriesMenuOpen}
                onClick={handleSeriesTriggerClick}
                {...invokerAttrs(seriesMenuId)}
                className='w-full flex items-center justify-between gap-1 text-left cursor-pointer group'
                title={seriesLabel}
                aria-label={seriesLabel}
              >
                <span className='pf-sb-text text-[15px] font-bold truncate group-hover:text-[var(--sb-accent)] transition-colors'>
                  {seriesId
                    ? activeSeries?.title ||
                      t('navigation.sidebar.activeSeriesFallback', 'Bộ truyện')
                    : activeWorkspace?.name ||
                      t('navigation.sidebar.chooseSeries', 'Chọn Series...')}
                </span>
                <ChevronsUpDown className='pf-sb-muted w-3.5 h-3.5 group-hover:text-[var(--sb-text)] transition-colors shrink-0' />
              </button>
              {!displayChapterNum && (
                <div className='mt-1.5 flex items-center'>
                  <span
                    data-testid='sidebar-series-status-badge'
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${seriesStatusMeta.className}`}
                  >
                    {seriesStatusMeta.dotClass && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${seriesStatusMeta.dotClass}`}
                        aria-hidden='true'
                      />
                    )}
                    {seriesStatusMeta.label}
                  </span>
                </div>
              )}
              {seriesPopoverEl}
            </div>
          ) : (
            <>
              <button
                ref={seriesBtnRef}
                id={seriesTriggerId}
                type='button'
                data-testid='sidebar-series-selector'
                aria-haspopup='menu'
                aria-expanded={seriesMenuOpen}
                onClick={handleSeriesTriggerClick}
                {...invokerAttrs(seriesMenuId)}
                className='pf-sb-surface w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-[var(--sb-accent)] cursor-pointer'
                title={seriesLabel}
                aria-label={seriesLabel}
                {...railTip(seriesLabel)}
              >
                <BookOpen className='w-4 h-4' />
              </button>
              {seriesPopoverEl}
            </>
          )}
        </div>

        {/* Navigation Sections */}
        <nav
          className={`flex-1 min-h-0 overflow-y-auto px-3 py-1 space-y-4 ${
            showFullContent ? '' : 'px-2'
          }`}
          aria-label={t('navigation.sidebar.mainNav', 'Điều hướng chính')}
          onScroll={() => setTip(null)}
        >
          {navSections.map((section, idx) => {
            const sectionLabel = section.section.trim();
            const isChapterSection =
              sectionLabel.toLowerCase().includes('chương') ||
              sectionLabel.toLowerCase().includes('chapter');

            return (
              <div
                key={idx}
                className={`space-y-1 ${idx > 0 ? 'pt-2 border-t border-[var(--sb-border)]' : ''}`}
              >
                {showFullContent && sectionLabel.length > 0 ? (
                  <div className='px-2 py-1 flex items-center justify-between'>
                    <span className='pf-sb-muted text-xs uppercase tracking-wider font-bold truncate'>
                      {sectionLabel}
                    </span>
                    {isChapterSection && cleanChapterNum && (
                      <span className='text-xs font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-semibold shrink-0 tabular-nums'>
                        {`CH.${cleanChapterNum}`}
                      </span>
                    )}
                  </div>
                ) : null}

                <div className='space-y-0.5'>
                  {section.items.map((item, i) => {
                    const itemBadge = item.badge ? (
                      renderBadge(item.badge)
                    ) : item.readOnly ? (
                      <Lock
                        className='w-3.5 h-3.5 pf-sb-muted shrink-0'
                        aria-hidden='true'
                        data-testid='sidebar-item-readonly-icon'
                      />
                    ) : undefined;
                    const itemBadgeLabel = item.badge
                      ? `${item.label}: ${
                          typeof item.badge === 'string' || typeof item.badge === 'number'
                            ? item.badge
                            : 'status'
                        }`
                      : item.readOnly
                        ? t('navigation.sidebar.readOnlyBadge', 'Chỉ đọc')
                        : undefined;

                    return (
                      <SidebarItem
                        key={`${item.href}-${i}`}
                        href={`#${item.href}`}
                        currentPath={location.pathname}
                        active={item.isActive}
                        icon={item.icon}
                        label={item.label}
                        badge={itemBadge}
                        badgeLabel={itemBadgeLabel}
                        title={showFullContent ? item.tooltip : undefined}
                        collapsed={!showFullContent}
                        onClick={(event) => handleNavClick(event, item.href)}
                        {...railTip(item.tooltip || item.label)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer: User Card + Unified Popover Settings Menu */}
        <div className='pf-sb-chrome p-3 border-t shrink-0'>
          {showFullContent ? (
            <div className='pf-sb-surface flex items-center justify-between gap-1 p-1.5 rounded-xl'>
              <button
                type='button'
                data-testid='sidebar-user-profile-btn'
                onClick={(e) => handleNavClick(e, '/profile')}
                title={profileSettingsLabel}
                aria-label={`${currentUser.name} — ${profileSettingsLabel}`}
                className='flex-1 flex items-center gap-2.5 p-1 rounded-lg text-left min-w-0 pf-sb-action cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange-500'
              >
                <SidebarUserAvatar user={currentUser} className='bg-[#EA580C] font-semibold' />
                <div className='flex flex-col min-w-0'>
                  <span className='pf-sb-text text-xs font-semibold truncate leading-tight'>
                    {currentUser.name}
                  </span>
                  <span className='pf-sb-muted text-[11px] truncate leading-tight'>
                    {userRoleDisplay}
                  </span>
                </div>
              </button>
              <button
                ref={userMenuBtnRef}
                id={userMenuTriggerId}
                type='button'
                data-testid='sidebar-user-menu-btn'
                aria-haspopup='menu'
                aria-expanded={userMenuOpen}
                aria-label={profileSettingsLabel}
                title={profileSettingsLabel}
                onClick={handleUserMenuTriggerClick}
                onKeyDown={handleUserMenuTriggerKeyDown}
                {...invokerAttrs(userMenuId)}
                className={`pf-sb-action w-9 h-9 rounded-lg flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange-500 ${
                  userMenuOpen ? 'ring-2 ring-orange-500' : ''
                }`}
              >
                <Settings className='w-4 h-4' aria-hidden='true' />
              </button>
              {userMenuPopoverEl}
            </div>
          ) : (
            <div className='flex flex-col items-center'>
              <button
                ref={userMenuBtnRef}
                id={userMenuTriggerId}
                type='button'
                data-testid='sidebar-user-menu-btn'
                aria-haspopup='menu'
                aria-expanded={userMenuOpen}
                aria-label={profileSettingsLabel}
                title={`${currentUser.name} (${userRoleDisplay})`}
                onClick={handleUserMenuTriggerClick}
                onKeyDown={handleUserMenuTriggerKeyDown}
                {...invokerAttrs(userMenuId)}
                className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                  userMenuOpen ? 'ring-2 ring-orange-500' : 'hover:ring-2 hover:ring-orange-400/60'
                }`}
                {...railTip(`${currentUser.name} · ${userRoleDisplay}`)}
              >
                <SidebarUserAvatar user={currentUser} className='bg-stone-900 font-bold' />
              </button>
              {userMenuPopoverEl}
            </div>
          )}
        </div>
      </div>

      {tip && (
        <div
          role='tooltip'
          className='fixed z-[70] px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none shadow-lg -translate-y-1/2 bg-stone-900 text-white'
          style={{ left: tip.left, top: tip.top }}
        >
          {tip.text}
        </div>
      )}
    </aside>
  );
};
