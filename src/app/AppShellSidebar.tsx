import React from 'react';
import {
  Server,
  BookOpen,
  ChevronDown,
  Bell,
  Search,
  History,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { CurrentUser } from './AppShell';
import { MangaProject } from '@/types';

export interface AppShellSidebarProps {
  currentUser: CurrentUser;
  activeSeries: MangaProject | { title: string; subtitle: string };
  isReader: boolean;
  navSections: any[];
  handleNavClick: (e: React.MouseEvent, href: string) => void;
  renderBadge: (badge: any) => React.ReactNode;
  onOpenTwoFactor?: () => void;
  onLogout?: () => void;
  isRailExpanded?: boolean;
  onToggleRail?: () => void;
  isMobileDrawer?: boolean;
}

export const AppShellSidebar: React.FC<AppShellSidebarProps> = ({
  currentUser,
  activeSeries,
  isReader,
  navSections,
  handleNavClick,
  renderBadge,
  onOpenTwoFactor,
  onLogout,
  isRailExpanded = false,
  onToggleRail,
  isMobileDrawer = false,
}) => {
  if (isReader) return null;

  const showFullContent = isMobileDrawer || isRailExpanded;

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

      {/* Workspace / Context Switcher */}
      <div className='mx-2 lg:mx-4 mt-3'>
        {currentUser.activeRoles?.includes('ADMINISTRATOR') && (
          <div
            className={`flex items-center gap-2 px-1 mb-4 text-[#171717] ${
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

        <div
          data-testid='sidebar-workspace-switcher'
          onClick={(e) => handleNavClick(e, '/workspaces')}
          className={`group flex items-center cursor-pointer px-2 py-1.5 rounded-md hover:bg-[#E7E7E7]/40 transition-colors ${
            showFullContent ? 'justify-between' : 'justify-center lg:justify-between'
          }`}
          title={`Workspace: ${activeSeries?.title || 'PanelForge Studio'}`}
          aria-label={`Workspace: ${activeSeries?.title || 'PanelForge Studio'}`}
        >
          <div className='flex items-center gap-2.5 min-w-0'>
            <BookOpen className='w-4 h-4 stroke-[2] text-[#171717] shrink-0' />
            <div className={`min-w-0 ${showFullContent ? 'block' : 'hidden lg:block'}`}>
              <p className='text-xs font-bold text-[#171717] truncate leading-tight'>
                {activeSeries?.title || 'PanelForge Studio'}
              </p>
              <p className='text-[10px] text-[#555555] font-mono truncate'>
                {activeSeries?.subtitle || 'Volume 01'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#555555] group-hover:text-[#171717] transition-colors shrink-0 ${
              showFullContent ? 'block' : 'hidden lg:block'
            }`}
          />
        </div>
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
