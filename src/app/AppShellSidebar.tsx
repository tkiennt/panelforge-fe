/* Lucian UX/UI Prompt #040 · Collapsible navigation rail · (c) 2026 Seokwoo Lee · MIT License */
/* Adapted for PanelForge Editorial AI Studio Design System */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Briefcase,
  BookOpen,
  LogOut,
  Server,
  Check,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
} from 'lucide-react';
import { CurrentUser } from './AppShell';
import { SeriesDto } from '@/services/series.service';
import { seriesService } from '@/services/series.service';
import { BrandMark } from '@/shared/components/BrandMark';
import { useTranslation } from '@/lib/i18n';
import '@/styles/modules/sidebar-theme.css';

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
      badge?: string | number;
      isActive?: boolean;
    }>;
  }>;
  handleNavClick: (e: React.MouseEvent, href: string) => void;
  renderBadge: (badge: string | number) => React.ReactNode;
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

/** Vị trí cho lớp nổi position:fixed — thoát khỏi overflow của rail, không nằm dưới main. */
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
  const isPublisher =
    currentUser.role === 'PUBLISHER' ||
    currentUser.workspaceRole === ('PUBLISHER' as any) ||
    currentUser.activeRoles?.includes('PUBLISHER') ||
    location.pathname.startsWith('/publisher');
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

  // Đóng lớp nổi khi click ra ngoài, Escape, đổi kích thước hoặc đổi trạng thái rail
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

  // Đưa focus vào lựa chọn hiện tại khi mở popover màu
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

  const rowSize = showFullContent
    ? `justify-start gap-3 px-4 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`
    : 'justify-center w-10 h-10 mx-auto';

  const workspaceLabel = `Workspace: ${activeWorkspace?.name || t('navigation.sidebar.chooseWorkspace', 'Chọn Workspace')}`;
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

  return (
    <aside
      id={isMobileDrawer ? undefined : SIDEBAR_ID}
      data-sb-theme={theme}
      style={{ width: isMobileDrawer ? '100%' : showFullContent ? '256px' : '64px' }}
      className={
        isMobileDrawer
          ? 'pf-sidebar w-full flex flex-col select-none h-full overflow-hidden'
          : `pf-sidebar hidden md:flex flex-col shrink-0 select-none z-20 h-full border-r overflow-hidden relative transition-[width] duration-200 ${
              showFullContent ? 'w-64' : 'w-16'
            }`
      }
      data-collapsed={isCollapsed ? 'true' : 'false'}
      data-testid={isMobileDrawer ? 'mobile-sidebar-nav' : 'app-shell-sidebar'}
      aria-label='Main menu'
    >
      {/* Brand & Rail Toggle: Thương hiệu và nút thu gọn / mở rộng bên trong side rail (Lucian #040) */}
      <div
        className={`px-4 flex items-center h-16 shrink-0 border-b relative ${
          showFullContent
            ? isMobileDrawer
              ? 'justify-between pr-12'
              : 'justify-between'
            : 'flex-col justify-center gap-1 py-1 px-2'
        }`}
        style={{ borderColor: 'var(--sb-border)' }}
      >
        <div className={`flex items-center gap-2.5 min-w-0 ${showFullContent ? 'flex-1' : ''}`}>
          <BrandMark
            size={showFullContent ? 28 : 22}
            tone={theme === 'paper' ? undefined : 'paper'}
            className='shrink-0'
          />
          {showFullContent && (
            <div className='min-w-0 pf-sb-label flex-1'>
              <div className='font-serif font-medium text-sm leading-tight tracking-tight truncate'>
                PanelForge
              </div>
              <div
                className='text-xs uppercase font-mono tracking-wider font-medium truncate'
                style={{ color: 'var(--sb-muted)' }}
              >
                Studio Edition
              </div>
            </div>
          )}
          {showFullContent && (
            <span
              className='pf-sb-label px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium shrink-0'
              style={{ background: 'var(--sb-surface)', color: 'var(--sb-muted)' }}
            >
              v2.4
            </span>
          )}
        </div>

        {handleToggle && !isMobileDrawer && (
          <button
            type='button'
            onClick={handleToggle}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={!isCollapsed}
            aria-controls={SIDEBAR_ID}
            data-testid='sidebar-rail-toggle-btn'
            className={
              showFullContent
                ? 'p-1.5 rounded-lg text-[var(--sb-muted)] hover:text-[var(--sb-text)] hover:bg-[var(--sb-hover)] transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sb-accent)]'
                : 'w-7 h-6 rounded-md flex items-center justify-center text-[var(--sb-muted)] hover:text-[var(--sb-text)] hover:bg-[var(--sb-hover)] transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sb-accent)]'
            }
          >
            {isCollapsed ? (
              <PanelLeftOpen className='w-4 h-4' />
            ) : (
              <PanelLeftClose className='w-4 h-4' />
            )}
          </button>
        )}
      </div>

      {/* Workspace & Series Context Switchers */}
      <div className={`mt-3 space-y-1.5 ${showFullContent ? 'mx-4' : 'mx-2'}`}>
        {isPublisher ? (
          <div
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-2 ${
              showFullContent ? 'justify-start' : 'justify-center'
            } bg-[#FFF2E6] border border-[#FDBA74] shadow-2xs`}
          >
            <Send className='w-4 h-4 shrink-0 text-[#C2410C]' />
            {showFullContent && (
              <div className='min-w-0 pf-sb-label'>
                <p className='text-xs font-bold tracking-tight text-[#C2410C] leading-tight'>
                  Publisher Portal
                </p>
                <p className='text-[10px] text-stone-500 truncate'>Hệ thống xuất bản</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {currentUser.activeRoles?.includes('ADMINISTRATOR') && (
              <div
                className={`flex items-center gap-2 px-1 mb-2 ${
                  showFullContent ? 'justify-start' : 'justify-center'
                }`}
                style={{ color: 'var(--sb-accent)' }}
              >
                <Server className='w-3.5 h-3.5 shrink-0' />
                {showFullContent && (
                  <span className='pf-sb-label text-xs font-bold tracking-tight'>Admin Zone</span>
                )}
              </div>
            )}

            <button
              type='button'
              data-testid='sidebar-workspace-switcher'
              onClick={(e) => handleNavClick(e, '/workspaces')}
              className={`pf-sb-surface group flex items-center cursor-pointer rounded-xl text-left ${
                showFullContent
                  ? 'w-full justify-between min-h-[42px] p-2'
                  : 'justify-center w-10 h-10 mx-auto'
              }`}
              title={showFullContent ? workspaceLabel : undefined}
              aria-label={workspaceLabel}
              {...railTip(workspaceLabel)}
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <Briefcase className='w-4 h-4 shrink-0' style={{ color: 'var(--sb-accent)' }} />
                {showFullContent && (
                  <div className='min-w-0 pf-sb-label'>
                    <p className='text-xs font-semibold truncate leading-tight'>
                      {activeWorkspace?.name || 'PanelForge Studio'}
                    </p>
                    <p
                      className='text-[10.5px] font-mono truncate'
                      style={{ color: 'var(--sb-muted)' }}
                    >
                      {currentUser.workspaceRole || 'Studio Workspace'}
                    </p>
                  </div>
                )}
              </div>
              {showFullContent && (
                <ChevronDown
                  className='w-3.5 h-3.5 shrink-0'
                  style={{ color: 'var(--sb-muted)' }}
                />
              )}
            </button>

            {workspaceId && (
              <div className='relative'>
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
                  className={`pf-sb-surface group flex items-center cursor-pointer rounded-xl text-left ${
                    showFullContent
                      ? 'w-full justify-between min-h-[42px] p-2'
                      : 'justify-center w-10 h-10 mx-auto'
                  }`}
                  title={showFullContent ? seriesLabel : undefined}
                  aria-label={seriesLabel}
                  {...railTip(seriesLabel)}
                >
                  <div className='flex items-center gap-2.5 min-w-0'>
                    <BookOpen className='w-4 h-4 shrink-0' style={{ color: 'var(--sb-accent)' }} />
                    {showFullContent && (
                      <div className='min-w-0 pf-sb-label'>
                        <p className='text-xs font-semibold truncate leading-tight'>
                      {seriesId ? activeSeries?.title || 'Active Series' : t('navigation.sidebar.chooseSeries', 'Chọn Series...')}
                        </p>
                        <p
                          className='text-[10.5px] font-mono truncate'
                          style={{ color: 'var(--sb-muted)' }}
                        >
                          {seriesId
                            ? activeSeries?.subtitle ||
                              t('navigation.sidebar.currentChapterSubtitle', 'Chương hiện tại')
                            : t('navigation.sidebar.seriesListSubtitle', 'Danh sách Series')}
                        </p>
                      </div>
                    )}
                  </div>
                  {showFullContent && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform shrink-0 ${seriesPos ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--sb-muted)' }}
                    />
                  )}
                </button>

                {seriesPos && (
                  <div
                    ref={seriesMenuRef}
                    role='menu'
                    className='pf-sb-popover fixed rounded-xl shadow-2xl z-[60] py-1 max-h-60 overflow-y-auto'
                    style={{ left: seriesPos.left, top: seriesPos.top, width: seriesPos.width }}
                  >
                    <div
                      className='px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold'
                      style={{ borderColor: 'var(--sb-border)', color: 'var(--sb-muted)' }}
                    >
                  <span>{t('navigation.sidebar.seriesInStudio', 'Bộ truyện trong Studio')}</span>
                      <button
                        type='button'
                        onClick={(e) => {
                          setSeriesPos(null);
                          handleNavClick(e, `/workspaces/${workspaceId}/series`);
                        }}
                        className='text-[11px] font-medium cursor-pointer hover:underline'
                        style={{ color: 'var(--sb-accent)' }}
                      >
                    {t('navigation.sidebar.allSeries', 'Xem tất cả')}
                      </button>
                    </div>
                    {loadingSeries && (
                      <div className='p-3 text-xs text-center' style={{ color: 'var(--sb-muted)' }}>
                    {t('navigation.sidebar.loading', 'Đang tải...')}
                      </div>
                    )}
                    {!loadingSeries && seriesList.length === 0 && (
                      <div className='p-3 text-xs text-center' style={{ color: 'var(--sb-muted)' }}>
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
                              handleNavClick(
                                e,
                                `/workspaces/${workspaceId}/series/${s.id}/dashboard`,
                              );
                            }}
                            aria-current={isSelected ? 'page' : undefined}
                            className='pf-sb-item w-full px-3 py-2 text-xs flex items-center justify-between cursor-pointer text-left'
                          >
                            <div className='truncate pr-2 min-w-0'>
                              <p className='truncate'>{s.title}</p>
                              <p className='text-xs font-mono' style={{ color: 'var(--sb-muted)' }}>
                            {s.genre || 'Manga'} • {s.chaptersCount || 0} {t('navigation.sidebar.chaptersCount', 'chương')}
                              </p>
                            </div>
                            {isSelected && (
                              <Check
                                className='w-3.5 h-3.5 shrink-0'
                                style={{ color: 'var(--sb-accent)' }}
                              />
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation List */}
      <nav
        className={`mt-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-4 custom-scrollbar ${
          showFullContent ? 'px-4' : 'px-2'
        }`}
        aria-label={t('navigation.sidebar.mainNav', 'Điều hướng chính')}
        onScroll={() => setTip(null)}
      >
        {navSections.map((section, idx) => (
          <div
            key={idx}
            className={idx > 0 && !showFullContent ? 'pt-3 border-t' : undefined}
            style={idx > 0 && !showFullContent ? { borderColor: 'var(--sb-border)' } : undefined}
          >
            {showFullContent && (
              <div
                className='pf-sb-label text-[11px] font-semibold px-2 mb-1.5 uppercase tracking-wider font-mono'
                style={{ color: 'var(--sb-muted)' }}
              >
                {section.section}
              </div>
            )}
            <div className='space-y-1'>
              {section.items.map((item: any, i: number) => {
                const IconComp = item.icon;
                return (
                  <a
                    key={i}
                    href={`#${item.href}`}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`pf-sb-item group relative flex items-center rounded-xl cursor-pointer focus:outline-none transition-all duration-150 ${
                      showFullContent ? `${rowSize} py-2.5` : rowSize
                    } ${
                      item.isActive
                        ? 'bg-[var(--sb-active-bg)] text-[var(--sb-text)] font-semibold shadow-xs'
                        : ''
                    }`}
                    aria-current={item.isActive ? 'page' : undefined}
                    title={showFullContent ? item.label : undefined}
                    aria-label={item.label}
                    {...railTip(item.label)}
                  >
                    {item.isActive && (
                      <span
                        className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[var(--sb-accent)] shadow-[0_0_8px_var(--sb-accent)]'
                        aria-hidden='true'
                      />
                    )}
                    {IconComp && (
                      <IconComp
                        className={`pf-sb-icon w-5 h-5 shrink-0 stroke-[1.9] ${
                          item.isActive ? 'text-[var(--sb-accent)]' : ''
                        }`}
                      />
                    )}
                    {showFullContent && (
                      <>
                        <span className='pf-sb-label font-sans text-[13.5px] leading-5 flex-1 text-left'>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className='pf-sb-label ml-auto shrink-0 flex items-center'>
                            {renderBadge(item.badge)}
                          </span>
                        )}
                      </>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Giao diện thanh bên + Đăng xuất */}
      <div
        className={`shrink-0 border-t space-y-1 ${showFullContent ? 'p-4' : 'p-2'}`}
        style={{ borderColor: 'var(--sb-border)' }}
      >
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
              // Mở lên trên (cuối sidebar) và ra ngoài rail khi thu gọn
              setThemePos({
                left: isCollapsed ? r.right + 8 : r.left,
                top: Math.max(8, r.top - 8 - 4 * 40 - 40),
                width: 224,
              });
            }}
            className={`pf-sb-item w-full flex items-center rounded-xl cursor-pointer text-[13.5px] font-medium focus:outline-none ${rowSize}`}
            {...railTip(themeLabel)}
          >
            <Palette className='pf-sb-icon w-[18px] h-[18px] shrink-0 stroke-[1.8]' />
            {showFullContent && <span className='pf-sb-label'>{themeLabel}</span>}
          </button>
        )}
        {themePos && onChangeTheme && (
          <div
            ref={themeMenuRef}
            role='menu'
            aria-label={themeLabel}
            onKeyDown={moveFocus}
            className='pf-sb-popover fixed rounded-xl shadow-2xl z-[60] p-1'
            style={{ left: themePos.left, top: themePos.top, width: themePos.width }}
          >
            <div
              className='px-2.5 py-1.5 text-[11px] font-semibold'
              style={{ color: 'var(--sb-muted)' }}
            >
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
                  onClick={() => onChangeTheme(opt.id)}
                  className='pf-sb-item w-full h-10 px-2.5 flex items-center gap-2.5 rounded-lg text-[13px] cursor-pointer text-left focus:outline-none'
                  style={selected ? { color: 'var(--sb-text)', fontWeight: 600 } : undefined}
                >
                  <span
                    className='w-5 h-5 rounded-full shrink-0 border flex items-center justify-center'
                    style={{ background: opt.bg, borderColor: 'var(--sb-border)' }}
                    aria-hidden='true'
                  >
                    <span className='w-2 h-2 rounded-full' style={{ background: opt.accent }} />
                  </span>
                  <span className='flex-1 truncate'>{themeName(opt.id)}</span>
                  {selected && (
                    <Check className='w-4 h-4 shrink-0' style={{ color: 'var(--sb-accent)' }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {onLogout && (
          <button
            type='button'
            onClick={onLogout}
            title={showFullContent ? 'Logout' : undefined}
            aria-label='Logout'
            data-testid='sidebar-logout-btn'
            className={`pf-sb-item w-full flex items-center rounded-xl cursor-pointer text-[13.5px] font-medium hover:!text-rose-500 focus:outline-none ${rowSize}`}
            {...railTip('Logout')}
          >
            <LogOut className='w-[18px] h-[18px] shrink-0 stroke-[1.8]' />
            {showFullContent && <span className='pf-sb-label'>Logout</span>}
          </button>
        )}
      </div>

      {tip && (
        <div
          role='tooltip'
          className='pf-sb-popover fixed z-[70] px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none shadow-lg -translate-y-1/2'
          style={{ left: tip.left, top: tip.top }}
        >
          {tip.text}
        </div>
      )}
    </aside>
  );
};
