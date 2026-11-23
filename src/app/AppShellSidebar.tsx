/* Adapted for PanelForge Editorial AI Studio Design System from Stitch Complete UI */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronsUpDown,
  ChevronDown,
  LogOut,
  Settings,
  Palette,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Briefcase,
} from 'lucide-react';
import { CurrentUser } from './AppShell';
import { getRoleDefaultPath } from '@/roles/roles';
import { SeriesDto, seriesService } from '@/services/series.service';
import { useTranslation } from '@/lib/i18n';
import { SidebarItem, SidebarSection } from '@/shared/ui';
import { SIDEBAR_ID, SIDEBAR_THEMES, type SidebarTheme } from './sidebarTheme';

const THEME_FALLBACK: Record<SidebarTheme, string> = {
  paper: 'Giấy sáng',
  ink: 'Mực đậm',
  ocean: 'Biển đêm',
  plum: 'Tím bản thảo',
};

export interface AppShellSidebarProps {
  currentUser: CurrentUser;
  activeWorkspace?: { id?: string; name: string } | null;
  activeSeries?: { id?: string; title: string; subtitle?: string } | null;
  workspaceId?: string;
  seriesId?: string;
  isReader?: boolean;
  navSections: Array<{
    section: string;
    items: Array<{
      icon?: React.ElementType;
      label: string;
      href: string;
      badge?: any;
      isActive?: boolean;
    }>;
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
}

type FloatPos = { left: number; top: number; width?: number };

const floatFrom = (el: HTMLElement, outside: boolean, width = 240): FloatPos => {
  const r = el.getBoundingClientRect();
  if (outside) return { left: r.right + 8, top: r.top, width };
  return { left: r.left, top: r.bottom + 4, width: r.width };
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
}) => {
  const { t } = useTranslation();
  const location = useLocation();

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

  const [seriesPos, setSeriesPos] = useState<FloatPos | null>(null);
  const [themePos, setThemePos] = useState<FloatPos | null>(null);
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const seriesBtnRef = useRef<HTMLButtonElement>(null);
  const seriesMenuRef = useRef<HTMLDivElement>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

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

  const anyOpen = !!seriesPos || !!themePos;
  useEffect(() => {
    if (!anyOpen) return;
    const close = () => {
      setSeriesPos(null);
      setThemePos(null);
    };
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (
        seriesMenuRef.current?.contains(n) ||
        seriesBtnRef.current?.contains(n) ||
        themeMenuRef.current?.contains(n) ||
        themeBtnRef.current?.contains(n)
      )
        return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (themePos) themeBtnRef.current?.focus();
      else seriesBtnRef.current?.focus();
      close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
    };
  }, [anyOpen, themePos]);

  useEffect(() => {
    setSeriesPos(null);
    setThemePos(null);
    setTip(null);
  }, [isCollapsed]);

  useEffect(() => {
    if (themePos)
      themeMenuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [themePos]);

  if (isReader) return null;

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
  // chapterId is usually a GUID; only show a chapter chip when the URL carries a real chapter number.
  const rawChapterNum = chapterId?.replace(/^chapter-?/i, '').replace(/^chap-?/i, '') ?? '';
  const cleanChapterNum = /^\d+$/.test(rawChapterNum) ? rawChapterNum.padStart(2, '0') : null;

  const userRoleDisplay = currentUser.workspaceRole
    ? t(
        `navigation.roles.${String(currentUser.workspaceRole).toLowerCase()}`,
        String(currentUser.workspaceRole),
      )
    : currentUser.role
      ? t(`navigation.roles.${String(currentUser.role).toLowerCase()}`, String(currentUser.role))
      : 'Thành viên';

  const seriesLabel = `Series: ${seriesId ? activeSeries?.title || t('navigation.sidebar.activeSeriesFallback', 'Bộ truyện') : t('navigation.sidebar.chooseSeries', 'Chọn Series')}`;
  const themeLabel = t('navigation.sidebar.appearance', 'Giao diện thanh bên');
  const themeName = (id: SidebarTheme) => t(`navigation.sidebar.themes.${id}`, THEME_FALLBACK[id]);

  const moveFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    );
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (e.key === 'Tab') {
      setThemePos(null);
    }
  };

  const backToStudioHref = workspaceId ? `/workspaces/${workspaceId}/series` : '/workspaces';

  return (
    <aside
      id={isMobileDrawer ? undefined : SIDEBAR_ID}
      data-sb-theme={theme}
      style={{ width: isMobileDrawer ? '100%' : showFullContent ? '256px' : '64px' }}
      className={
        isMobileDrawer
          ? 'pf-sidebar w-full flex flex-col select-none h-full overflow-hidden bg-white'
          : `pf-sidebar hidden md:flex flex-col shrink-0 select-none z-20 h-full bg-white border-r border-stone-200 overflow-hidden relative transition-[width] duration-200 ${
              showFullContent ? 'w-64' : 'w-16'
            }`
      }
      data-collapsed={isCollapsed ? 'true' : 'false'}
      data-testid={isMobileDrawer ? 'mobile-sidebar-nav' : 'app-shell-sidebar'}
      aria-label='Main menu'
    >
      <div className='flex flex-col h-full min-h-0'>
        {/* Header: "← Về Sảnh Studio" + version chip (v3.2) */}
        <div className='h-16 px-4 flex items-center justify-between border-b border-stone-200 bg-white shrink-0'>
          {showFullContent ? (
            <div className='flex items-center justify-between w-full min-w-0'>
              <button
                type='button'
                data-testid='sidebar-workspace-switcher'
                onClick={(e) => handleNavClick(e, backToStudioHref)}
                className='flex items-center gap-2 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors py-1.5 px-2 rounded-lg hover:bg-stone-100 cursor-pointer min-w-0'
              >
                <ArrowLeft className='w-4 h-4 text-stone-500 shrink-0' />
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
                    className='p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer'
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
                className='w-10 h-10 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer'
                title={t('navigation.sidebar.backToStudio', 'Về Sảnh Studio')}
                {...railTip(t('navigation.sidebar.backToStudio', 'Về Sảnh Studio'))}
              >
                <ArrowLeft className='w-4 h-4 text-stone-500' />
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
                  className='w-8 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer'
                >
                  <PanelLeftOpen className='w-4 h-4' />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card: BỘ TRUYỆN ĐANG MỞ */}
        <div className={`shrink-0 ${showFullContent ? 'p-3.5' : 'p-2'}`}>
          {showFullContent ? (
            <div className='p-3 rounded-lg bg-[#FAF9F5] border border-stone-200'>
              <div className='flex items-center justify-between mb-1.5'>
                <span className='text-xs uppercase tracking-wider text-stone-500 font-bold truncate'>
                  {t('navigation.sidebar.activeSeriesLabel', 'BỘ TRUYỆN ĐANG MỞ')}
                </span>
                {cleanChapterNum ? (
                  <span className='px-1.5 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200/60 shrink-0'>
                    {`Chương ${cleanChapterNum}`}
                  </span>
                ) : (
                  <span className='flex items-center gap-1 text-xs text-emerald-700 font-semibold shrink-0'>
                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
                    Active
                  </span>
                )}
              </div>
              <button
                ref={seriesBtnRef}
                type='button'
                data-testid='sidebar-series-selector'
                aria-haspopup='menu'
                aria-expanded={!!seriesPos}
                onClick={(e) => {
                  if (seriesPos) return setSeriesPos(null);
                  if (seriesList.length === 0) loadSeries();
                  setThemePos(null);
                  setTip(null);
                  setSeriesPos(floatFrom(e.currentTarget, isCollapsed, 260));
                }}
                className='w-full flex items-center justify-between gap-1 text-left cursor-pointer group'
                title={seriesLabel}
                aria-label={seriesLabel}
              >
                <div className='flex items-center gap-2 min-w-0'>
                  <div className='w-7 h-7 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors'>
                    <BookOpen className='w-4 h-4 text-orange-700' />
                  </div>
                  <span className='text-xs font-bold text-stone-900 truncate group-hover:text-orange-700 transition-colors'>
                    {seriesId
                      ? activeSeries?.title || 'Active Series'
                      : activeWorkspace?.name ||
                        t('navigation.sidebar.chooseSeries', 'Chọn Series...')}
                  </span>
                </div>
                <ChevronsUpDown className='w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0' />
              </button>
            </div>
          ) : (
            <button
              ref={seriesBtnRef}
              type='button'
              data-testid='sidebar-series-selector'
              aria-haspopup='menu'
              aria-expanded={!!seriesPos}
              onClick={(e) => {
                if (seriesPos) return setSeriesPos(null);
                if (seriesList.length === 0) loadSeries();
                setThemePos(null);
                setTip(null);
                setSeriesPos(floatFrom(e.currentTarget, isCollapsed, 260));
              }}
              className='w-10 h-10 mx-auto rounded-lg flex items-center justify-center bg-[#FAF9F5] border border-stone-200 text-orange-700 hover:bg-orange-50 transition-colors cursor-pointer'
              title={seriesLabel}
              aria-label={seriesLabel}
              {...railTip(seriesLabel)}
            >
              <BookOpen className='w-4 h-4 text-orange-700' />
            </button>
          )}

          {/* Series Popover */}
          {seriesPos && (
            <div
              ref={seriesMenuRef}
              role='menu'
              className='fixed rounded-xl border border-stone-200 bg-white shadow-xl z-[60] py-1 max-h-60 overflow-y-auto'
              style={{ left: seriesPos.left, top: seriesPos.top, width: seriesPos.width }}
            >
              <div className='px-3 py-1.5 border-b border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-500'>
                <span>{t('navigation.sidebar.seriesInStudio', 'Bộ truyện trong Studio')}</span>
                <button
                  type='button'
                  onClick={(e) => {
                    setSeriesPos(null);
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
                        setSeriesPos(null);
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
                          ? 'bg-orange-50 text-orange-700 font-semibold'
                          : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className='truncate pr-2 min-w-0'>
                        <p className='truncate'>{s.title}</p>
                        <p className='text-xs font-mono text-stone-400'>
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

        {/* Navigation Sections */}
        <nav
          className={`flex-1 min-h-0 overflow-y-auto px-3 py-1 space-y-4 ${
            showFullContent ? '' : 'px-2'
          }`}
          aria-label={t('navigation.sidebar.mainNav', 'Điều hướng chính')}
          onScroll={() => setTip(null)}
        >
          {navSections.map((section, idx) => {
            const isChapterSection =
              section.section.toLowerCase().includes('chương') ||
              section.section.toLowerCase().includes('chapter');

            return (
              <div
                key={idx}
                className={`space-y-1 ${idx > 0 ? 'pt-2 border-t border-stone-200/60' : ''}`}
              >
                {showFullContent ? (
                  <div className='px-2 py-1 flex items-center justify-between'>
                    <span className='text-xs uppercase tracking-wider text-stone-400 font-bold truncate'>
                      {section.section}
                    </span>
                    {isChapterSection && cleanChapterNum && (
                      <span className='text-xs font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-semibold shrink-0'>
                        {`CH.${cleanChapterNum}`}
                      </span>
                    )}
                  </div>
                ) : null}

                <div className='space-y-0.5'>
                  {section.items.map((item, i) => (
                    <SidebarItem
                      key={`${item.href}-${i}`}
                      href={`#${item.href}`}
                      currentPath={location.pathname}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge ? renderBadge(item.badge) : undefined}
                      badgeLabel={
                        item.badge
                          ? `${item.label}: ${
                              typeof item.badge === 'string' || typeof item.badge === 'number'
                                ? item.badge
                                : 'status'
                            }`
                          : undefined
                      }
                      collapsed={!showFullContent}
                      onClick={(event) => handleNavClick(event, item.href)}
                      {...railTip(item.label)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer: User Card (Avatar initials, name, role line, settings icon) + Logout */}
        <div className='p-3 border-t border-stone-200 bg-white shrink-0 space-y-1.5'>
          {showFullContent ? (
            <div className='flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors'>
              <div className='flex items-center gap-2.5 min-w-0'>
                <div className='w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs shrink-0'>
                  {currentUser.avatarInitials}
                </div>
                <div className='flex flex-col min-w-0'>
                  <span className='text-xs font-semibold text-stone-900 truncate leading-tight'>
                    {currentUser.name}
                  </span>
                  <span className='text-xs text-stone-500 truncate leading-tight'>
                    {userRoleDisplay}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                {onChangeTheme && (
                  <button
                    ref={themeBtnRef}
                    type='button'
                    data-testid='sidebar-theme-btn'
                    aria-haspopup='menu'
                    aria-expanded={!!themePos}
                    aria-label={themeLabel}
                    onClick={(e) => {
                      if (themePos) return setThemePos(null);
                      setSeriesPos(null);
                      setTip(null);
                      const r = e.currentTarget.getBoundingClientRect();
                      setThemePos({
                        left: isCollapsed ? r.right + 8 : r.left,
                        top: Math.max(8, r.top - 8 - 4 * 40 - 40),
                        width: 224,
                      });
                    }}
                    className='p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors cursor-pointer'
                    title={themeLabel}
                  >
                    <Palette className='w-4 h-4' />
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => {
                    handleNavClick({ preventDefault: () => {} } as any, '/profile');
                  }}
                  title={t('navigation.menu.settings', 'Cài đặt không gian làm việc')}
                  aria-label={t('navigation.menu.settings', 'Cài đặt không gian làm việc')}
                  className='p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors cursor-pointer'
                >
                  <Settings className='w-4 h-4' />
                </button>
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center gap-2'>
              <div
                className='w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs shrink-0'
                title={`${currentUser.name} (${userRoleDisplay})`}
                {...railTip(currentUser.name)}
              >
                {currentUser.avatarInitials}
              </div>
              {onChangeTheme && (
                <button
                  ref={themeBtnRef}
                  type='button'
                  data-testid='sidebar-theme-btn'
                  aria-haspopup='menu'
                  aria-expanded={!!themePos}
                  aria-label={themeLabel}
                  onClick={(e) => {
                    if (themePos) return setThemePos(null);
                    setSeriesPos(null);
                    setTip(null);
                    const r = e.currentTarget.getBoundingClientRect();
                    setThemePos({
                      left: r.right + 8,
                      top: Math.max(8, r.top - 8 - 4 * 40 - 40),
                      width: 224,
                    });
                  }}
                  className='w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer'
                  {...railTip(themeLabel)}
                >
                  <Palette className='w-4 h-4' />
                </button>
              )}
            </div>
          )}

          {/* Theme Popover Menu */}
          {themePos && onChangeTheme && (
            <div
              ref={themeMenuRef}
              role='menu'
              aria-label={themeLabel}
              onKeyDown={moveFocus}
              className='fixed rounded-xl border border-stone-200 bg-white shadow-2xl z-[60] p-1'
              style={{ left: themePos.left, top: themePos.top, width: themePos.width }}
            >
              <div className='px-2.5 py-1.5 text-xs font-semibold text-stone-500'>{themeLabel}</div>
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
                      setThemePos(null);
                    }}
                    className='w-full h-9 px-2.5 flex items-center gap-2.5 rounded-lg text-xs cursor-pointer text-left hover:bg-stone-50 transition-colors'
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
                    {selected && <Check className='w-4 h-4 shrink-0 text-orange-600' />}
                  </button>
                );
              })}
            </div>
          )}

          {onLogout && (
            <button
              type='button'
              onClick={onLogout}
              data-testid='sidebar-logout-btn'
              title='Logout'
              aria-label='Logout'
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ${
                showFullContent ? 'justify-start' : 'justify-center'
              }`}
              {...railTip('Logout')}
            >
              <LogOut className='w-4 h-4 text-stone-400 group-hover:text-rose-500 shrink-0' />
              {showFullContent && <span>Logout</span>}
            </button>
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
