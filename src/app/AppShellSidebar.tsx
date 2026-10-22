import React, { useState, useEffect, useRef } from 'react';
import { BrandMark } from '@/shared/components/BrandMark';
import {
  Server,
  BookOpen,
  Briefcase,
  ChevronDown,
  Bell,
  Search,
  History,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
} from 'lucide-react';
import { CurrentUser } from './AppShell';
import { MangaProject } from '@/types';
import { seriesService, SeriesDto } from '@/services/series.service';
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
  activeSeries: MangaProject | { title: string; subtitle: string };
  workspaceId?: string;
  seriesId?: string;
  isReader: boolean;
  navSections: any[];
  handleNavClick: (e: React.MouseEvent, href: string) => void;
  renderBadge: (badge: any) => React.ReactNode;
  onOpenNotifications?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenActivityHistory?: () => void;
  unreadNotificationCount?: number;
  onOpenTwoFactor?: () => void;
  onLogout?: () => void;
  onSelectSeries?: (seriesId: string) => void;
  isRailExpanded?: boolean;
  isCollapsed?: boolean;
  onToggleRail?: () => void;
  onToggleCollapse?: () => void;
  isMobileDrawer?: boolean;
}

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
  onOpenNotifications,
  onOpenCommandPalette,
  onOpenActivityHistory,
  unreadNotificationCount,
  onOpenTwoFactor,
  onLogout,
  onSelectSeries,
  isRailExpanded,
  isCollapsed: isCollapsedProp,
  onToggleRail,
  onToggleCollapse,
  isMobileDrawer = false,
}) => {
  // Ưu tiên isCollapsedProp, nếu không có thì dựa theo isRailExpanded (false nghĩa là thu gọn, true là mở rộng)
  const isCollapsed =
    !isMobileDrawer &&
    (isCollapsedProp !== undefined
      ? isCollapsedProp
      : isRailExpanded !== undefined
        ? !isRailExpanded
        : false);
  const showFullContent = isMobileDrawer || !isCollapsed;
  const handleToggle = onToggleCollapse || onToggleRail;

  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadSeries = React.useCallback(() => {
    if (!workspaceId) return;
    setLoadingSeries(true);
    seriesService
      .getSeriesList(workspaceId)
      .then((data) => {
        setSeriesList(data || []);
      })
      .catch((err) => {
        console.warn('Failed to load series for sidebar dropdown:', err);
        setSeriesList([]);
      })
      .finally(() => setLoadingSeries(false));
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && showFullContent) {
      loadSeries();
    }
  }, [workspaceId, showFullContent, loadSeries]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSeriesDropdownOpen(false);
      }
    };
    if (seriesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [seriesDropdownOpen]);

  if (isReader) return null;

  return (
    <aside
      className={
        isMobileDrawer
          ? 'w-full bg-[#FCFBF8] flex flex-col select-none h-full overflow-hidden'
          : `hidden md:flex flex-col shrink-0 select-none z-20 h-full bg-[#FCFBF8] border-r border-[#E7E2D9] transition-all duration-200 ${
              isCollapsed ? 'w-16' : 'w-64'
            }`
      }
      data-testid={isMobileDrawer ? 'mobile-sidebar-nav' : 'app-shell-sidebar'}
    >
      {/* Brand Header */}
      <div
        className={`px-3 pt-4 pb-2 flex items-center ${
          showFullContent ? 'justify-between' : 'flex-col gap-2 justify-center'
        }`}
      >
        <div className='flex items-center gap-2.5 min-w-0'>
          <BrandMark size={28} className='shrink-0' />
          {showFullContent && (
            <div className='min-w-0'>
              <div className='font-serif font-medium text-sm leading-tight text-[#1C1917] tracking-tight truncate'>
                PanelForge
              </div>
              <div className='text-xs uppercase font-mono tracking-wider text-[#78716C] font-medium truncate'>
                Studio Edition
              </div>
            </div>
          )}
        </div>

        <div className='flex items-center gap-1'>
          {showFullContent && (
            <span className='items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-[#F1EEE8] text-[#78716C] inline-flex'>
              v2.4
            </span>
          )}
          {handleToggle && !isMobileDrawer && (
            <button
              type='button'
              onClick={handleToggle}
              aria-label={showFullContent ? 'Thu gọn menu' : 'Mở rộng menu'}
              title={showFullContent ? 'Thu gọn menu' : 'Mở rộng menu'}
              className='p-1.5 rounded-lg hover:bg-[#F1EEE8] text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1'
              data-testid='sidebar-rail-toggle-btn'
            >
              {showFullContent ? (
                <PanelLeftClose className='w-4 h-4' />
              ) : (
                <PanelLeftOpen className='w-4 h-4' />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Workspace & Series Context Switchers */}
      <div className={`mt-3 space-y-1.5 ${showFullContent ? 'mx-3' : 'mx-2'}`}>
        {currentUser.activeRoles?.includes('ADMINISTRATOR') && (
          <div
            className={`flex items-center gap-2 px-1 mb-2 text-[#1C1917] ${
              showFullContent ? 'justify-start' : 'justify-center'
            }`}
          >
            <Server className='w-3.5 h-3.5 text-[#78716C] shrink-0' />
            {showFullContent && <span className='text-xs font-bold inline'>System Admin Zone</span>}
          </div>
        )}

        {/* 1. Workspace Switcher */}
        <div
          data-testid='sidebar-workspace-switcher'
          onClick={(e) => handleNavClick(e, '/workspaces')}
          className={`group flex items-center cursor-pointer p-2 rounded-lg bg-white border border-[#E7E2D9] hover:border-[#C2410C]/40 hover:bg-[#F1EEE8]/50 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ${
            showFullContent
              ? 'justify-between min-h-[42px]'
              : 'justify-center w-10 h-10 p-0 mx-auto'
          }`}
          title={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
          aria-label={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
        >
          <div className='flex items-center gap-2.5 min-w-0'>
            <Briefcase className='w-4 h-4 stroke-[2] text-[#1C1917] shrink-0' />
            {showFullContent && (
              <div className='min-w-0'>
                <p className='text-xs font-semibold text-[#1C1917] truncate leading-tight'>
                  {activeWorkspace?.name || 'PanelForge Studio'}
                </p>
                <p className='text-[11px] text-[#78716C] font-mono truncate'>
                  {currentUser.workspaceRole || 'Studio Workspace'}
                </p>
              </div>
            )}
          </div>
          {showFullContent && (
            <ChevronDown className='w-3.5 h-3.5 text-[#78716C] group-hover:text-[#1C1917] transition-colors shrink-0' />
          )}
        </div>

        {/* 2. Series Selector (hiển thị khi đang trong ngữ cảnh Workspace) */}
        {workspaceId && (
          <div className='relative' ref={dropdownRef}>
            <div
              data-testid='sidebar-series-selector'
              onClick={() => {
                if (!showFullContent) {
                  handleToggle?.();
                  return;
                }
                if (!seriesDropdownOpen && seriesList.length === 0) {
                  loadSeries();
                }
                setSeriesDropdownOpen((prev) => !prev);
              }}
              className={`group flex items-center cursor-pointer p-2 rounded-lg bg-white border border-[#E7E2D9] hover:border-[#C2410C]/40 hover:bg-[#F1EEE8]/50 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ${
                showFullContent
                  ? 'justify-between min-h-[42px]'
                  : 'justify-center w-10 h-10 p-0 mx-auto'
              }`}
              title={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
              aria-label={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <BookOpen className='w-4 h-4 stroke-[2] text-[#1C1917] shrink-0' />
                {showFullContent && (
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold text-[#1C1917] truncate leading-tight'>
                      {seriesId ? activeSeries?.title || 'Active Series' : 'Chọn Series...'}
                    </p>
                    <p className='text-[11px] text-[#78716C] font-mono truncate'>
                      {seriesId ? activeSeries?.subtitle || 'Chương hiện tại' : 'Danh sách Series'}
                    </p>
                  </div>
                )}
              </div>
              {showFullContent && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#78716C] group-hover:text-[#1C1917] transition-transform shrink-0 ${
                    seriesDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </div>

            {/* Dropdown Popover */}
            {seriesDropdownOpen && showFullContent && (
              <div className='absolute left-0 right-0 mt-1 bg-white border border-[#E7E2D9] rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95'>
                <div className='px-3 py-1.5 border-b border-[#E7E2D9]/70 flex items-center justify-between text-[11px] font-semibold text-[#57534E]'>
                  <span>Bộ truyện trong Studio</span>
                  <button
                    type='button'
                    onClick={(e) => {
                      setSeriesDropdownOpen(false);
                      handleNavClick(
                        e,
                        workspaceId ? `/workspaces/${workspaceId}/series` : '/workspaces',
                      );
                    }}
                    className='text-[#C2410C] hover:text-[#9A3412] text-[11px] font-medium cursor-pointer'
                  >
                    Xem tất cả
                  </button>
                </div>
                {loadingSeries && (
                  <div className='p-3 text-xs text-[#78716C] text-center'>Đang tải...</div>
                )}
                {!loadingSeries && seriesList.length === 0 && (
                  <div className='p-3 text-xs text-[#78716C] text-center'>
                    Chưa có bộ truyện nào
                  </div>
                )}
                {!loadingSeries &&
                  seriesList.map((s) => {
                    const isSelected = s.id === seriesId;
                    return (
                      <div
                        key={s.id}
                        onClick={(e) => {
                          setSeriesDropdownOpen(false);
                          if (onSelectSeries) {
                            onSelectSeries(s.id);
                          }
                          handleNavClick(e, `/workspaces/${workspaceId}/series/${s.id}/dashboard`);
                        }}
                        className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#FFF2E6] text-[#1C1917] font-semibold'
                            : 'hover:bg-[#F1EEE8] text-[#57534E]'
                        }`}
                      >
                        <div className='truncate pr-2'>
                          <p className='truncate'>{s.title}</p>
                          <p className='text-xs text-[#78716C] font-mono'>
                            {s.genre || 'Manga'} • {s.chaptersCount || 0} chương
                          </p>
                        </div>
                        {isSelected && <Check className='w-3.5 h-3.5 text-[#C2410C] shrink-0' />}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav
        className={`mt-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar ${
          showFullContent ? 'px-3' : 'px-2'
        }`}
        aria-label='Điều hướng chính'
      >
        {navSections.map((section, idx) => (
          <div key={idx}>
            {showFullContent && (
              <div className='text-[11px] text-[#78716C] font-semibold px-3 mb-1.5 uppercase tracking-wide font-sans'>
                {section.section}
              </div>
            )}
            <div className='space-y-1'>
              {section.items.map((item: any, i: number) => {
                const baseClass =
                  'group relative flex items-center rounded-lg transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ';
                const activeClass = item.isActive
                  ? 'bg-[#FFF2E6] hover:bg-[#FFF2E6] text-[#1C1917] font-semibold'
                  : 'bg-transparent text-[#57534E] hover:bg-[#F1EEE8] hover:text-[#1C1917] font-medium cursor-pointer';

                const iconClass = `w-5 h-5 shrink-0 transition-colors ${
                  item.isActive
                    ? 'text-[#C2410C] stroke-[2]'
                    : 'text-[#78716C] group-hover:text-[#1C1917] stroke-[1.8]'
                }`;
                const IconComp = item.icon;

                return (
                  <a
                    key={i}
                    href={`#${item.href}`}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`${baseClass} ${activeClass} ${
                      showFullContent
                        ? `justify-start gap-3 px-3 py-2.5 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[42px]'}`
                        : 'justify-center w-10 h-10 min-h-[40px] p-2 mx-auto'
                    }`}
                    aria-current={item.isActive ? 'page' : undefined}
                    title={item.label}
                    aria-label={item.label}
                  >
                    {/* Vạch cam bên trái rộng 3px, cao khoảng 20-22px, căn giữa theo chiều dọc */}
                    {item.isActive && (
                      <span
                        className='absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] bg-[#C2410C] rounded-r-[2px]'
                        aria-hidden='true'
                      />
                    )}

                    {IconComp && <IconComp className={iconClass} />}
                    {showFullContent && (
                      <>
                        <span className='font-sans text-[14px] leading-5 line-clamp-2 break-words flex-1 text-left'>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className='ml-auto shrink-0 flex items-center'>
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

      {/* Footer Navigation & System Controls */}
      <div
        className={`mt-auto border-t border-[#E7E2D9] bg-[#FCFBF8] ${
          showFullContent ? 'p-3' : 'p-2'
        }`}
      >
        <div className='space-y-1 mb-1'>
          <button
            type='button'
            onClick={onOpenNotifications}
            title={
              (unreadNotificationCount ?? 0) > 0
                ? `Notifications (${unreadNotificationCount} chưa đọc)`
                : 'Notifications'
            }
            aria-label={
              (unreadNotificationCount ?? 0) > 0
                ? `Notifications (${unreadNotificationCount} chưa đọc)`
                : 'Notifications'
            }
            data-testid='sidebar-notifications-btn'
            className={`w-full flex items-center text-[13px] font-sans font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#F1EEE8] rounded-lg transition-colors duration-150 motion-reduce:transition-none group cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ${
              showFullContent
                ? `justify-start gap-3 px-3 py-2 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`
                : 'justify-center w-10 h-10 min-h-[40px] p-2 mx-auto relative'
            }`}
          >
            <div className='relative shrink-0'>
              <Bell className='w-5 h-5 text-[#78716C] group-hover:text-[#1C1917] stroke-[1.8]' />
              {!showFullContent && (unreadNotificationCount ?? 0) > 0 && (
                <span
                  data-testid='sidebar-notifications-dot'
                  className='absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F97316] ring-2 ring-[#FCFBF8]'
                />
              )}
            </div>
            {showFullContent && (
              <>
                <span className='truncate text-[14px]'>Notifications</span>
                {(unreadNotificationCount ?? 0) > 0 && (
                  <span
                    data-testid='sidebar-notifications-badge'
                    className='ml-auto px-1.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#F97316]/15 text-[#C2410C] border border-[#F97316]/30'
                  >
                    {unreadNotificationCount! > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </>
            )}
          </button>
          <button
            type='button'
            onClick={onOpenCommandPalette}
            title='Global Search (⌘K / Ctrl+K)'
            aria-label='Global Search'
            data-testid='sidebar-global-search-btn'
            className={`w-full flex items-center text-[13px] font-sans font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#F1EEE8] rounded-lg transition-colors duration-150 motion-reduce:transition-none group cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ${
              showFullContent
                ? `justify-start gap-3 px-3 py-2 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`
                : 'justify-center w-10 h-10 min-h-[40px] p-2 mx-auto'
            }`}
          >
            <Search className='w-5 h-5 text-[#78716C] group-hover:text-[#1C1917] stroke-[1.8] shrink-0' />
            {showFullContent && (
              <>
                <span className='truncate text-[14px]'>Global Search</span>
                <span className='ml-auto text-[10px] font-mono text-[#78716C] bg-[#EFECE6] px-1.5 py-0.5 rounded border border-[#D8D2C5]'>
                  ⌘K
                </span>
              </>
            )}
          </button>
          <button
            type='button'
            onClick={onOpenActivityHistory}
            title='My Activity / History'
            aria-label='My Activity / History'
            data-testid='sidebar-activity-history-btn'
            className={`w-full flex items-center text-[13px] font-sans font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#F1EEE8] rounded-lg transition-colors duration-150 motion-reduce:transition-none group cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ${
              showFullContent
                ? `justify-start gap-3 px-3 py-2 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`
                : 'justify-center w-10 h-10 min-h-[40px] p-2 mx-auto'
            }`}
          >
            <History className='w-5 h-5 text-[#78716C] group-hover:text-[#1C1917] stroke-[1.8] shrink-0' />
            {showFullContent && <span className='truncate text-[14px]'>My Activity / History</span>}
          </button>
          <button
            type='button'
            onClick={onOpenTwoFactor}
            title='Profile & Security (2FA)'
            aria-label='Profile & Security (2FA)'
            className={`w-full flex items-center text-[13px] font-sans font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#F1EEE8] rounded-lg transition-colors duration-150 motion-reduce:transition-none group cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] focus-visible:outline-offset-1 ${
              showFullContent
                ? `justify-start gap-3 px-3 py-2 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`
                : 'justify-center w-10 h-10 min-h-[40px] p-2 mx-auto'
            }`}
          >
            <UserCircle className='w-5 h-5 text-[#78716C] group-hover:text-[#1C1917] stroke-[1.8] shrink-0' />
            {showFullContent && (
              <span className='truncate text-[14px]'>Profile & Security (2FA)</span>
            )}
          </button>
          <button
            type='button'
            onClick={onLogout}
            title='Logout'
            aria-label='Logout'
            className={`w-full flex items-center text-[13px] font-sans font-medium text-[#57534E] hover:text-rose-600 hover:bg-rose-50/70 rounded-lg transition-colors duration-150 motion-reduce:transition-none group mt-1 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-rose-500 focus-visible:outline-offset-1 ${
              showFullContent
                ? `justify-start gap-3 px-3 py-2 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`
                : 'justify-center w-10 h-10 min-h-[40px] p-2 mx-auto'
            }`}
          >
            <LogOut className='w-5 h-5 text-[#78716C] group-hover:text-rose-600 stroke-[1.8] shrink-0' />
            {showFullContent && <span className='truncate text-[14px]'>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
