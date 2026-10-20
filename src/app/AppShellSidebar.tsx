/* Lucian UX/UI Prompt #040 · Collapsible navigation rail · (c) 2026 Seokwoo Lee · MIT License */
/* Adapted for PanelForge Editorial AI Studio Design System */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Briefcase,
  BookOpen,
  LogOut,
  Server,
  Check,
} from 'lucide-react';
import { CurrentUser } from './AppShell';
import { SeriesDto } from '@/services/series.service';
import { seriesService } from '@/services/series.service';
import { BrandMark } from '@/shared/components/BrandMark';
import '@/shared/components/lucian/lucian-040.css';

export interface AppShellSidebarProps {
  currentUser: CurrentUser;
  activeWorkspace?: { id: string; name: string } | null;
  activeSeries?: { id: string; title: string; subtitle?: string } | null;
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
  onToggleRail?: () => void;
  onToggleCollapse?: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
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
  onLogout,
  onSelectSeries,
  isRailExpanded,
  isCollapsed: isCollapsedProp,
  onToggleRail,
  onToggleCollapse,
  onExpand,
  onCollapse,
  isMobileDrawer = false,
}) => {
  const sidebarRef = useRef<HTMLElement>(null);

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
      .then((res) => {
        setSeriesList(res || []);
      })
      .catch((err) => {
        console.error('Không thể nạp danh sách series cho sidebar:', err);
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
      ref={sidebarRef}
      style={{
        backgroundColor: '#1C1917',
        color: '#FCFBF8',
        width: isMobileDrawer ? '100%' : showFullContent ? '256px' : '64px',
      }}
      className={
        isMobileDrawer
          ? 'w-full bg-[#1C1917] text-[#FCFBF8] flex flex-col select-none h-full overflow-hidden'
          : `u040-rail hidden md:flex flex-col shrink-0 select-none z-20 h-full bg-[#1C1917] text-[#FCFBF8] border-r border-[#292524] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width] overflow-hidden relative ${
              showFullContent ? 'is-wide w-64' : 'w-16'
            }`
      }
      data-testid={isMobileDrawer ? 'mobile-sidebar-nav' : 'app-shell-sidebar'}
      aria-label='Main menu'
    >
      {/* Brand Header: Lucian #040 Top Bar */}
      <div
        className={`px-3 flex items-center h-16 shrink-0 border-b border-[#292524] relative bg-[#1C1917] transition-all duration-200 ${
          showFullContent ? 'justify-between pr-10' : 'justify-center'
        }`}
      >
        <div className={`flex items-center gap-2.5 min-w-0 ${!showFullContent ? 'justify-center' : ''}`}>
          <BrandMark size={28} tone='paper' className='shrink-0' />
          {showFullContent && (
            <div className='min-w-0 animate-in fade-in duration-200'>
              <div className='font-serif font-medium text-sm leading-tight text-[#FCFBF8] tracking-tight truncate'>
                PanelForge
              </div>
              <div className='text-xs uppercase font-mono tracking-wider text-[#A8A29E] font-medium truncate'>
                Studio Edition
              </div>
            </div>
          )}
        </div>

        {showFullContent && (
          <span className='items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white/10 text-[#D6D3D1] inline-flex animate-in fade-in duration-200 mr-2'>
            v2.4
          </span>
        )}

        {handleToggle && !isMobileDrawer && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            aria-expanded={showFullContent}
            aria-label={showFullContent ? 'Thu gọn menu' : 'Mở rộng menu'}
            title={showFullContent ? 'Thu gọn menu' : 'Mở rộng menu'}
            className='u040-tog'
            data-testid='sidebar-rail-toggle-btn'
          >
            <svg viewBox='0 0 16 16' aria-hidden='true'>
              <path d='M6 3.5L10.5 8 6 12.5' />
            </svg>
          </button>
        )}
      </div>

      {/* Workspace & Series Context Switchers (Dark Theme) */}
      <div className={`mt-3 space-y-1.5 ${showFullContent ? 'mx-3' : 'mx-2'}`}>
        {currentUser.activeRoles?.includes('ADMINISTRATOR') && (
          <div
            className={`flex items-center gap-2 px-1 mb-2 text-[#F97316] ${
              showFullContent ? 'justify-start' : 'justify-center'
            }`}
          >
            <Server className='w-3.5 h-3.5 shrink-0' />
            {showFullContent && (
              <span className='text-xs font-bold tracking-tight'>Admin Zone</span>
            )}
          </div>
        )}

        {/* 1. Workspace Switcher */}
        <div
          data-testid='sidebar-workspace-switcher'
          onClick={(e) => handleNavClick(e, '/workspaces')}
          className={`group flex items-center cursor-pointer p-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-[#F97316]/60 hover:bg-white/[0.1] transition-all focus:outline-none focus-visible:outline-2 focus-visible:outline-[#F97316] ${
            showFullContent
              ? 'justify-between min-h-[42px]'
              : 'justify-center w-10 h-10 p-0 mx-auto'
          }`}
          title={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
          aria-label={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
        >
          <div className='flex items-center gap-2.5 min-w-0'>
            <Briefcase className='w-4 h-4 text-[#F97316] shrink-0' />
            {showFullContent && (
              <div className='min-w-0'>
                <p className='text-xs font-semibold text-[#FCFBF8] truncate leading-tight'>
                  {activeWorkspace?.name || 'PanelForge Studio'}
                </p>
                <p className='text-[10.5px] text-[#A8A29E] font-mono truncate'>
                  {currentUser.workspaceRole || 'Studio Workspace'}
                </p>
              </div>
            )}
          </div>
          {showFullContent && (
            <ChevronDown className='w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#FCFBF8] transition-colors shrink-0' />
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
              className={`group flex items-center cursor-pointer p-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-[#F97316]/60 hover:bg-white/[0.1] transition-all focus:outline-none focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                showFullContent
                  ? 'justify-between min-h-[42px]'
                  : 'justify-center w-10 h-10 p-0 mx-auto'
              }`}
              title={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
              aria-label={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <BookOpen className='w-4 h-4 text-[#F97316] shrink-0' />
                {showFullContent && (
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold text-[#FCFBF8] truncate leading-tight'>
                      {seriesId ? activeSeries?.title || 'Active Series' : 'Chọn Series...'}
                    </p>
                    <p className='text-[10.5px] text-[#A8A29E] font-mono truncate'>
                      {seriesId ? activeSeries?.subtitle || 'Chương hiện tại' : 'Danh sách Series'}
                    </p>
                  </div>
                )}
              </div>
              {showFullContent && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#FCFBF8] transition-transform shrink-0 ${
                    seriesDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </div>

            {/* Dropdown Popover */}
            {seriesDropdownOpen && showFullContent && (
              <div className='absolute left-0 right-0 mt-1 bg-[#24201E] border border-[#3E3835] rounded-xl shadow-2xl z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95'>
                <div className='px-3 py-1.5 border-b border-[#3E3835] flex items-center justify-between text-[11px] font-semibold text-[#A8A29E]'>
                  <span>Bộ truyện trong Studio</span>
                  <button
                    type='button'
                    onClick={(e) => {
                      setSeriesDropdownOpen(false);
                      handleNavClick(e, `/workspaces/${workspaceId}/series`);
                    }}
                    className='text-[#F97316] hover:text-[#EA580C] text-[11px] font-medium cursor-pointer'
                  >
                    Xem tất cả
                  </button>
                </div>
                {loadingSeries && (
                  <div className='p-3 text-xs text-[#A8A29E] text-center'>Đang tải...</div>
                )}
                {!loadingSeries && seriesList.length === 0 && (
                  <div className='p-3 text-xs text-[#A8A29E] text-center'>
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
                            ? 'bg-[#F97316]/20 text-[#FCFBF8] font-semibold'
                            : 'hover:bg-white/5 text-[#D6D3D1]'
                        }`}
                      >
                        <div className='truncate pr-2'>
                          <p className='truncate'>{s.title}</p>
                          <p className='text-xs text-[#A8A29E] font-mono'>
                            {s.genre || 'Manga'} • {s.chaptersCount || 0} chương
                          </p>
                        </div>
                        {isSelected && <Check className='w-3.5 h-3.5 text-[#F97316] shrink-0' />}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lucian #040 Navigation List */}
      <nav
        className={`mt-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar bg-[#1C1917] ${
          showFullContent ? 'px-3' : 'px-2'
        }`}
        aria-label='Điều hướng chính'
      >
        {navSections.map((section, idx) => (
          <div key={idx}>
            {showFullContent && (
              <div className='text-[10px] text-[#A8A29E] font-bold px-3 mb-1.5 uppercase tracking-wider font-mono'>
                {section.section}
              </div>
            )}
            <div className='space-y-1'>
              {section.items.map((item: any, i: number) => {
                const baseClass =
                  'group relative flex items-center rounded-xl transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:outline-2 focus-visible:outline-[#F97316] ';
                const activeClass = item.isActive
                  ? 'bg-white/12 text-[#FCFBF8] font-bold shadow-sm'
                  : 'bg-transparent text-[#D6D3D1] hover:bg-white/10 hover:text-white font-medium cursor-pointer';

                const iconClass = `w-5 h-5 shrink-0 transition-colors ${
                  item.isActive
                    ? 'text-[#F97316] stroke-[2]'
                    : 'text-[#A8A29E] group-hover:text-white stroke-[1.8]'
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
                    {/* Lucian #040 Active Highlight Indicator (vạch gradient cam mép trái) */}
                    {item.isActive && (
                      <span
                        className='absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-[22px] bg-gradient-to-b from-[#F97316] to-[#EA580C] rounded-r'
                        aria-hidden='true'
                      />
                    )}

                    {IconComp && <IconComp className={iconClass} />}
                    {showFullContent && (
                      <>
                        <span className='font-sans text-[13.5px] leading-5 truncate flex-1 text-left animate-in fade-in duration-150'>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className='ml-auto shrink-0 flex items-center animate-in fade-in duration-150'>
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

      {/* Lucian #040 Footer Profile & System Controls */}
      <div
        className={`mt-auto border-t border-[#292524] bg-[#1C1917] ${
          showFullContent ? 'p-3' : 'p-2'
        }`}
      >
        {/* User Profile Card */}
        {showFullContent && (
          <div className='flex items-center gap-2.5 p-2 rounded-xl bg-white/5 mb-2' data-testid='sidebar-user-card'>
            <div
              className='w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0'
              style={{
                background: 'radial-gradient(circle at 35% 30%, #FFD3A8, #F97316 60%, #C2410C)',
              }}
            >
              {currentUser.avatarInitials || currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-xs font-bold text-[#FCFBF8] truncate leading-tight'>
                {currentUser.name}
              </p>
              <p className='text-[10.5px] text-[#A8A29E] font-mono truncate'>
                {currentUser.workspaceRole || currentUser.role}
              </p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            type='button'
            onClick={onLogout}
            title='Logout'
            aria-label='Logout'
            data-testid='sidebar-logout-btn'
            className={`w-full flex items-center text-[13px] font-sans font-medium text-[#A8A29E] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors duration-150 motion-reduce:transition-none group cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-rose-500 ${
              showFullContent
                ? `justify-start gap-3 px-3 py-2 ${isMobileDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`
                : 'justify-center w-10 h-10 min-h-[40px] p-2 mx-auto'
            }`}
          >
            <LogOut className='w-4.5 h-4.5 text-[#78716C] group-hover:text-rose-400 stroke-[1.8] shrink-0' />
            {showFullContent && <span className='truncate text-[13.5px] font-medium'>Logout</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
