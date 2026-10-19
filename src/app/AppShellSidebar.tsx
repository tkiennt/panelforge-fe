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
          ? 'w-full bg-[#fafafa] flex flex-col select-none h-full overflow-hidden'
          : `hidden md:flex flex-col shrink-0 select-none z-20 h-full bg-[#fafafa] border-r border-[#e7e5e4] transition-all duration-200 ${
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
              <div className='font-serif font-medium text-sm leading-tight text-[#0c0a09] tracking-tight truncate'>
                PanelForge
              </div>
              <div className='text-xs uppercase font-mono tracking-wider text-[#777169] font-medium truncate'>
                Studio Edition
              </div>
            </div>
          )}
        </div>

        <div className='flex items-center gap-1'>
          {showFullContent && (
            <span className='items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[#f0efed] text-[#777169] inline-flex'>
              v2.4
            </span>
          )}
          {handleToggle && !isMobileDrawer && (
            <button
              type='button'
              onClick={handleToggle}
              aria-label={showFullContent ? 'Thu gọn menu' : 'Mở rộng menu'}
              title={showFullContent ? 'Thu gọn menu' : 'Mở rộng menu'}
              className='p-1.5 rounded-lg hover:bg-[#f0efed] text-[#777169] hover:text-[#0c0a09] transition-colors cursor-pointer'
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
            className={`flex items-center gap-2 px-1 mb-2 text-[#171717] ${
              showFullContent ? 'justify-start' : 'justify-center'
            }`}
          >
            <Server className='w-3.5 h-3.5 text-[#555555] shrink-0' />
            {showFullContent && <span className='text-xs font-bold inline'>System Admin Zone</span>}
          </div>
        )}

        {/* 1. Workspace Switcher */}
        <div
          data-testid='sidebar-workspace-switcher'
          onClick={(e) => handleNavClick(e, '/workspaces')}
          className={`group flex items-center cursor-pointer p-2 rounded-xl bg-white border border-[#e7e5e4] hover:border-[#292524] transition-all shadow-soft-sm ${
            showFullContent ? 'justify-between' : 'justify-center'
          }`}
          title={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
          aria-label={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
        >
          <div className='flex items-center gap-2.5 min-w-0'>
            <Briefcase className='w-4 h-4 stroke-[2] text-[#292524] shrink-0' />
            {showFullContent && (
              <div className='min-w-0'>
                <p className='text-xs font-semibold text-[#0c0a09] truncate leading-tight'>
                  {activeWorkspace?.name || 'PanelForge Studio'}
                </p>
                <p className='text-xs text-[#777169] font-mono truncate'>
                  {currentUser.workspaceRole || 'Studio Workspace'}
                </p>
              </div>
            )}
          </div>
          {showFullContent && (
            <ChevronDown className='w-3.5 h-3.5 text-[#777169] group-hover:text-[#0c0a09] transition-colors shrink-0' />
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
              className={`group flex items-center cursor-pointer p-2 rounded-xl bg-white border border-[#e7e5e4] hover:border-[#292524] transition-all shadow-soft-sm ${
                showFullContent ? 'justify-between' : 'justify-center'
              }`}
              title={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
              aria-label={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <BookOpen className='w-4 h-4 stroke-[2] text-[#292524] shrink-0' />
                {showFullContent && (
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold text-[#0c0a09] truncate leading-tight'>
                      {seriesId ? activeSeries?.title || 'Active Series' : 'Chọn Series...'}
                    </p>
                    <p className='text-xs text-[#777169] font-mono truncate'>
                      {seriesId ? activeSeries?.subtitle || 'Chương hiện tại' : 'Danh sách Series'}
                    </p>
                  </div>
                )}
              </div>
              {showFullContent && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#777169] group-hover:text-[#0c0a09] transition-transform shrink-0 ${
                    seriesDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </div>

            {/* Dropdown Popover */}
            {seriesDropdownOpen && showFullContent && (
              <div className='absolute left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95'>
                <div className='px-3 py-1.5 border-b border-stone-100 flex items-center justify-between text-[11px] font-semibold text-stone-600'>
                  <span>Bộ truyện trong Studio</span>
                  <button
                    type='button'
                    onClick={(e) => {
                      setSeriesDropdownOpen(false);
                      handleNavClick(e, `/workspaces/${workspaceId}/series`);
                    }}
                    className='text-orange-600 hover:text-orange-700 text-[10px] cursor-pointer'
                  >
                    Xem tất cả
                  </button>
                </div>
                {loadingSeries && (
                  <div className='p-3 text-xs text-stone-400 text-center'>Đang tải...</div>
                )}
                {!loadingSeries && seriesList.length === 0 && (
                  <div className='p-3 text-xs text-stone-400 text-center'>
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
                            ? 'bg-orange-50 text-orange-900 font-semibold'
                            : 'hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <div className='truncate pr-2'>
                          <p className='truncate'>{s.title}</p>
                          <p className='text-xs text-stone-500 font-mono'>
                            {s.genre || 'Manga'} • {s.chaptersCount || 0} chương
                          </p>
                        </div>
                        {isSelected && <Check className='w-3.5 h-3.5 text-[#292524] shrink-0' />}
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
        className={`mt-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar ${
          showFullContent ? 'px-3' : 'px-1.5'
        }`}
      >
        {navSections.map((section, idx) => (
          <div key={idx}>
            {showFullContent && (
              <div className='text-xs text-[#a8a29e] font-semibold px-3 mb-2 uppercase tracking-wider font-mono'>
                {section.section}
              </div>
            )}
            <div className='space-y-1'>
              {section.items.map((item: any, i: number) => {
                const baseClass =
                  'group flex items-center text-xs font-medium transition-all duration-150 ';
                const activeClass = item.isActive
                  ? 'bg-[#292524] text-white shadow-soft-sm font-semibold border-l-2 border-orange-500'
                  : 'text-[#4e4e4e] hover:bg-[#f0efed] hover:text-[#0c0a09] cursor-pointer';

                const iconClass = `w-4 h-4 shrink-0 transition-colors ${
                  item.isActive
                    ? 'text-white stroke-[2]'
                    : 'text-[#777169] group-hover:text-[#0c0a09] stroke-[1.8]'
                }`;
                const IconComp = item.icon;

                return (
                  <a
                    key={i}
                    href={`#${item.href}`}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`${baseClass} ${activeClass} ${
                      showFullContent
                        ? 'justify-start gap-3 px-3 py-2 rounded-full'
                        : 'justify-center p-2.5 rounded-full mx-auto w-10 h-10'
                    }`}
                    aria-current={item.isActive ? 'page' : undefined}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <IconComp className={iconClass} />
                    {showFullContent && (
                      <>
                        <span className='truncate'>{item.label}</span>
                        <span className='ml-auto'>{renderBadge(item.badge)}</span>
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
        className={`mt-auto border-t border-[#e7e5e4] bg-[#fafafa] ${
          showFullContent ? 'p-3' : 'p-1.5'
        }`}
      >
        <div className='space-y-1 mb-2'>
          <button
            title='Notifications'
            aria-label='Notifications'
            className={`w-full flex items-center text-xs text-[#777169] hover:text-[#0c0a09] hover:bg-[#f0efed] rounded-full transition-colors group cursor-pointer ${
              showFullContent
                ? 'justify-start gap-2.5 px-3 py-2'
                : 'justify-center p-2.5 mx-auto w-10 h-10'
            }`}
          >
            <Bell className='w-4 h-4 text-[#777169] group-hover:text-[#0c0a09] stroke-[1.8] shrink-0' />
            {showFullContent && <span className='font-medium text-xs truncate'>Notifications</span>}
          </button>
          <button
            title='Global Search'
            aria-label='Global Search'
            className={`w-full flex items-center text-xs text-[#777169] hover:text-[#0c0a09] hover:bg-[#f0efed] rounded-full transition-colors group cursor-pointer ${
              showFullContent
                ? 'justify-start gap-2.5 px-3 py-2'
                : 'justify-center p-2.5 mx-auto w-10 h-10'
            }`}
          >
            <Search className='w-4 h-4 text-[#777169] group-hover:text-[#0c0a09] stroke-[1.8] shrink-0' />
            {showFullContent && <span className='font-medium text-xs truncate'>Global Search</span>}
          </button>
          <button
            title='My Activity / History'
            aria-label='My Activity / History'
            className={`w-full flex items-center text-xs text-[#777169] hover:text-[#0c0a09] hover:bg-[#f0efed] rounded-full transition-colors group cursor-pointer ${
              showFullContent
                ? 'justify-start gap-2.5 px-3 py-2'
                : 'justify-center p-2.5 mx-auto w-10 h-10'
            }`}
          >
            <History className='w-4 h-4 text-[#777169] group-hover:text-[#0c0a09] stroke-[1.8] shrink-0' />
            {showFullContent && (
              <span className='font-medium text-xs truncate'>My Activity / History</span>
            )}
          </button>
          <button
            onClick={onOpenTwoFactor}
            title='Profile & Security (2FA)'
            aria-label='Profile & Security (2FA)'
            className={`w-full flex items-center text-xs text-[#777169] hover:text-[#0c0a09] hover:bg-[#f0efed] rounded-full transition-colors group cursor-pointer ${
              showFullContent
                ? 'justify-start gap-2.5 px-3 py-2'
                : 'justify-center p-2.5 mx-auto w-10 h-10'
            }`}
          >
            <UserCircle className='w-4 h-4 text-[#777169] group-hover:text-[#0c0a09] stroke-[1.8] shrink-0' />
            {showFullContent && (
              <span className='font-medium text-xs truncate'>Profile & Security (2FA)</span>
            )}
          </button>
          <button
            onClick={onLogout}
            title='Logout'
            aria-label='Logout'
            className={`w-full flex items-center text-xs text-[#777169] hover:text-red-600 hover:bg-red-50 rounded-full transition-colors group mt-1 cursor-pointer ${
              showFullContent
                ? 'justify-start gap-2.5 px-3 py-2'
                : 'justify-center p-2.5 mx-auto w-10 h-10'
            }`}
          >
            <LogOut className='w-4 h-4 text-[#777169] group-hover:text-red-600 stroke-[1.8] shrink-0' />
            {showFullContent && <span className='font-medium text-xs truncate'>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
