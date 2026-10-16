import React, { useState, useEffect, useRef } from 'react';
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
  onToggleRail?: () => void;
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
  isRailExpanded = false,
  onToggleRail,
  isMobileDrawer = false,
}) => {
  const showFullContent = isMobileDrawer || isRailExpanded;
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
          ? 'w-full bg-[#F8F6F0] flex flex-col select-none h-full overflow-hidden'
          : `hidden md:flex flex-col shrink-0 select-none z-20 h-full bg-[#F8F6F0] border-r border-[#E7E7E7] transition-all duration-200 ${
              isRailExpanded ? 'w-64' : 'w-16 lg:w-64'
            }`
      }
      data-testid={isMobileDrawer ? 'mobile-sidebar-nav' : 'app-shell-sidebar'}
    >
      {/* Brand Header */}
      <div
        className={`px-4 pt-4 pb-1 flex items-center ${
          showFullContent ? 'justify-between' : 'justify-center lg:justify-between'
        }`}
      >
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white font-heading font-bold text-base shadow-sm tracking-tighter shrink-0'>
            PF
          </div>
          <div className={showFullContent ? 'block' : 'hidden lg:block'}>
            <div className='font-heading font-bold text-sm leading-tight text-[#171717] tracking-tight truncate'>
              PanelForge
            </div>
            <div className='text-[10px] uppercase font-mono tracking-wider text-[#555555] font-medium truncate'>
              Studio Edition
            </div>
          </div>
        </div>

        <div className='flex items-center gap-1'>
          <span
            className={`items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#E7E7E7] text-[#555555] ${
              showFullContent ? 'inline-flex' : 'hidden lg:inline-flex'
            }`}
          >
            v2.4
          </span>
          {onToggleRail && !isMobileDrawer && (
            <button
              type='button'
              onClick={onToggleRail}
              aria-label={isRailExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              title={isRailExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              className='hidden md:flex lg:hidden p-1 rounded hover:bg-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-colors cursor-pointer'
              data-testid='sidebar-rail-toggle-btn'
            >
              {isRailExpanded ? (
                <PanelLeftClose className='w-4 h-4' />
              ) : (
                <PanelLeftOpen className='w-4 h-4' />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Workspace & Series Context Switchers */}
      <div className='mx-2 lg:mx-4 mt-3 space-y-1.5'>
        {currentUser.activeRoles?.includes('ADMINISTRATOR') && (
          <div
            className={`flex items-center gap-2 px-1 mb-2 text-[#171717] ${
              showFullContent ? 'justify-start' : 'justify-center lg:justify-start'
            }`}
          >
            <Server className='w-3.5 h-3.5 text-[#555555] shrink-0' />
            <span
              className={`text-xs font-bold ${showFullContent ? 'inline' : 'hidden lg:inline'}`}
            >
              System Admin Zone
            </span>
          </div>
        )}

        {/* 1. Workspace Switcher */}
        <div
          data-testid='sidebar-workspace-switcher'
          onClick={(e) => handleNavClick(e, '/workspaces')}
          className={`group flex items-center cursor-pointer px-2 py-1.5 rounded-md hover:bg-[#E7E7E7]/40 transition-colors ${
            showFullContent ? 'justify-between' : 'justify-center lg:justify-between'
          }`}
          title={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
          aria-label={`Workspace: ${activeWorkspace?.name || 'Chọn Workspace'}`}
        >
          <div className='flex items-center gap-2.5 min-w-0'>
            <Briefcase className='w-4 h-4 stroke-[2] text-[#F97316] shrink-0' />
            <div className={`min-w-0 ${showFullContent ? 'block' : 'hidden lg:block'}`}>
              <p className='text-xs font-bold text-[#171717] truncate leading-tight'>
                {activeWorkspace?.name || 'PanelForge Studio'}
              </p>
              <p className='text-[10px] text-[#555555] font-mono truncate'>
                {currentUser.workspaceRole || 'Studio Workspace'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#555555] group-hover:text-[#171717] transition-colors shrink-0 ${
              showFullContent ? 'block' : 'hidden lg:block'
            }`}
          />
        </div>

        {/* 2. Series Selector (hiển thị khi đang trong ngữ cảnh Workspace) */}
        {workspaceId && (
          <div className='relative' ref={dropdownRef}>
            <div
              data-testid='sidebar-series-selector'
              onClick={() => {
                if (!seriesDropdownOpen && seriesList.length === 0) {
                  loadSeries();
                }
                setSeriesDropdownOpen((prev) => !prev);
              }}
              className={`group flex items-center cursor-pointer px-2 py-1.5 rounded-md hover:bg-[#E7E7E7]/40 transition-colors ${
                showFullContent ? 'justify-between' : 'justify-center lg:justify-between'
              }`}
              title={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
              aria-label={`Series: ${seriesId ? activeSeries?.title || 'Bộ truyện' : 'Chọn Series'}`}
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <BookOpen className='w-4 h-4 stroke-[2] text-[#10B981] shrink-0' />
                <div className={`min-w-0 ${showFullContent ? 'block' : 'hidden lg:block'}`}>
                  <p className='text-xs font-bold text-[#171717] truncate leading-tight'>
                    {seriesId ? activeSeries?.title || 'Active Series' : 'Chọn Series...'}
                  </p>
                  <p className='text-[10px] text-[#555555] font-mono truncate'>
                    {seriesId ? activeSeries?.subtitle || 'Chương hiện tại' : 'Danh sách Series'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#555555] group-hover:text-[#171717] transition-transform shrink-0 ${
                  seriesDropdownOpen ? 'rotate-180' : ''
                } ${showFullContent ? 'block' : 'hidden lg:block'}`}
              />
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
                          <p className='text-[10px] text-stone-400 font-mono'>
                            {s.genre || 'Manga'} • {s.chaptersCount || 0} chương
                          </p>
                        </div>
                        {isSelected && <Check className='w-3.5 h-3.5 text-orange-600 shrink-0' />}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className='mt-5 flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar'>
        {navSections.map((section, idx) => (
          <div key={idx}>
            <div
              className={`text-[11px] text-[#555555] font-semibold px-2 mb-2 uppercase tracking-wider font-mono ${
                showFullContent ? 'block' : 'hidden lg:block'
              }`}
            >
              {section.section}
            </div>
            <div className='space-y-1'>
              {section.items.map((item: any, i: number) => {
                const baseClass =
                  'group flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm font-medium transition-colors ';
                const activeClass = item.isActive
                  ? 'bg-[#E7E7E7]/60 text-[#171717] font-bold'
                  : 'text-[#555555] hover:bg-[#E7E7E7]/30 hover:text-[#171717] cursor-pointer';

                const iconClass = `w-4 h-4 shrink-0 transition-colors ${
                  item.isActive
                    ? 'text-[#171717] stroke-[2.2]'
                    : 'text-[#555555] group-hover:text-[#171717] stroke-[2]'
                }`;
                const IconComp = item.icon;

                return (
                  <a
                    key={i}
                    href={`#${item.href}`}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`${baseClass} ${activeClass} ${
                      showFullContent ? 'justify-start' : 'justify-center lg:justify-start'
                    }`}
                    aria-current={item.isActive ? 'page' : undefined}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <IconComp className={iconClass} />
                    <span className={`truncate ${showFullContent ? 'inline' : 'hidden lg:inline'}`}>
                      {item.label}
                    </span>
                    <span
                      className={showFullContent ? 'inline ml-auto' : 'hidden lg:inline lg:ml-auto'}
                    >
                      {renderBadge(item.badge)}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Navigation & System Controls */}
      <div className='mt-auto p-3 border-t border-[#E7E7E7] bg-[#FAF8F3]/60'>
        <div className='space-y-1 mb-2'>
          <button
            title='Notifications'
            aria-label='Notifications'
            className={`w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer ${
              showFullContent ? 'justify-start' : 'justify-center lg:justify-start'
            }`}
          >
            <Bell className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2] shrink-0' />
            <span
              className={`font-medium text-xs truncate ${
                showFullContent ? 'inline' : 'hidden lg:inline'
              }`}
            >
              Notifications
            </span>
          </button>
          <button
            title='Global Search'
            aria-label='Global Search'
            className={`w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer ${
              showFullContent ? 'justify-start' : 'justify-center lg:justify-start'
            }`}
          >
            <Search className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2] shrink-0' />
            <span
              className={`font-medium text-xs truncate ${
                showFullContent ? 'inline' : 'hidden lg:inline'
              }`}
            >
              Global Search
            </span>
          </button>
          <button
            title='My Activity / History'
            aria-label='My Activity / History'
            className={`w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer ${
              showFullContent ? 'justify-start' : 'justify-center lg:justify-start'
            }`}
          >
            <History className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2] shrink-0' />
            <span
              className={`font-medium text-xs truncate ${
                showFullContent ? 'inline' : 'hidden lg:inline'
              }`}
            >
              My Activity / History
            </span>
          </button>
          <button
            onClick={onOpenTwoFactor}
            title='Profile & Security (2FA)'
            aria-label='Profile & Security (2FA)'
            className={`w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer ${
              showFullContent ? 'justify-start' : 'justify-center lg:justify-start'
            }`}
          >
            <UserCircle className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2] shrink-0' />
            <span
              className={`font-medium text-xs truncate ${
                showFullContent ? 'inline' : 'hidden lg:inline'
              }`}
            >
              Profile & Security (2FA)
            </span>
          </button>
          <button
            onClick={onLogout}
            title='Logout'
            aria-label='Logout'
            className={`w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors group mt-1 cursor-pointer ${
              showFullContent ? 'justify-start' : 'justify-center lg:justify-start'
            }`}
          >
            <LogOut className='w-4 h-4 text-[#555555] group-hover:text-red-600 stroke-[2] shrink-0' />
            <span
              className={`font-medium text-xs truncate ${
                showFullContent ? 'inline' : 'hidden lg:inline'
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};
