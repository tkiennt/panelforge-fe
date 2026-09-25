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
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { CurrentUser } from '../GlobalAppShell';
import { MangaProject } from '../../types';

interface AppShellSidebarProps {
  currentUser: CurrentUser;
  activeSeries: MangaProject | { title: string; subtitle: string };
  isReader: boolean;
  navSections: any[];
  handleNavClick: (e: React.MouseEvent, href: string) => void;
  renderBadge: (badge: any) => React.ReactNode;
  onOpenTwoFactor?: () => void;
  onLogout?: () => void;
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
}) => {
  if (isReader) return null;

  return (
    <aside className='w-64 bg-[#F8F6F0] border-r border-[#E7E7E7] flex flex-col shrink-0 select-none z-20 h-full'>
      <div className='px-5 pt-4 pb-1 flex items-center justify-between'>
        <div className='flex items-center gap-2.5'>
          <div className='w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white font-heading font-bold text-base shadow-sm tracking-tighter'>
            PF
          </div>
          <div>
            <div className='font-heading font-bold text-sm leading-tight text-[#171717] tracking-tight'>
              PanelForge
            </div>
            <div className='text-[10px] uppercase font-mono tracking-wider text-[#555555] font-medium'>
              Studio Edition
            </div>
          </div>
        </div>
        <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#E7E7E7] text-[#555555]'>
          v2.4
        </span>
      </div>

      <div className='mx-4 mt-3'>
        {currentUser.activeRoles?.includes('ADMINISTRATOR') && (
          <div className='flex items-center gap-2 px-1 mb-4 text-[#171717]'>
            <Server className='w-3.5 h-3.5 text-[#555555]' />
            <span className='text-xs font-bold'>System Admin Zone</span>
          </div>
        )}
        
        <div
          data-testid='sidebar-workspace-switcher'
          onClick={(e) => handleNavClick(e, '/workspaces')}
          className='group flex items-center justify-between cursor-pointer px-1 py-1 rounded-md hover:bg-[#E7E7E7]/40 transition-colors'
          title='Switch active workspace'
        >
          <div className='flex items-center gap-2.5 min-w-0'>
            <BookOpen className='w-4 h-4 stroke-[2] text-[#171717]' />
            <div className='min-w-0'>
              <p className='text-xs font-bold text-[#171717] truncate leading-tight'>
                {activeSeries?.title || 'PanelForge Studio'}
              </p>
              <p className='text-[10px] text-[#555555] font-mono truncate'>
                {activeSeries?.subtitle || 'Volume 01'}
              </p>
            </div>
          </div>
          <ChevronDown className='w-3.5 h-3.5 text-[#555555] group-hover:text-[#171717] transition-colors shrink-0' />
        </div>
      </div>

      <nav className='mt-5 flex-1 overflow-y-auto px-2 space-y-4'>
        {navSections.map((section, idx) => (
          <div key={idx}>
            <div className='text-[11px] text-[#555555] font-semibold px-3 mb-2 uppercase tracking-wider font-mono'>
              {section.section}
            </div>
            <div className='space-y-1'>
              {section.items.map((item: any, i: number) => {
                const baseClass =
                  'group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ';
                const activeClass = item.isActive
                  ? 'bg-[#E7E7E7]/60 text-[#171717] font-bold'
                  : 'text-[#555555] hover:bg-[#E7E7E7]/30 hover:text-[#171717] cursor-pointer';

                const iconClass = `w-4 h-4 transition-colors ${item.isActive ? 'text-[#171717] stroke-[2.2]' : 'text-[#555555] group-hover:text-[#171717] stroke-[2]'}`;
                const IconComp = item.icon;

                return (
                  <a
                    key={i}
                    href={`#${item.href}`}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={baseClass + activeClass}
                    aria-current={item.isActive ? 'page' : undefined}
                  >
                    <IconComp className={iconClass} />
                    <span>{item.label}</span>
                    {renderBadge(item.badge)}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className='mt-auto p-4 border-t border-[#E7E7E7] bg-[#FAF8F3]/60'>
        <div className='space-y-1 mb-4'>
          <button className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer'>
            <Bell className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2]' />
            <span className='font-medium text-xs'>Notifications</span>
          </button>
          <button className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer'>
            <Search className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2]' />
            <span className='font-medium text-xs'>Global Search</span>
          </button>
          <button className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer'>
            <History className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2]' />
            <span className='font-medium text-xs'>My Activity / History</span>
          </button>
          <button
            onClick={onOpenTwoFactor}
            className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer'
          >
            <UserCircle className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2]' />
            <span className='font-medium text-xs'>Profile & Security (2FA)</span>
          </button>
          <button
            onClick={onLogout}
            className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors group mt-2 cursor-pointer'
          >
            <LogOut className='w-4 h-4 text-[#555555] group-hover:text-red-600 stroke-[2]' />
            <span className='font-medium text-xs'>Logout</span>
          </button>
        </div>

        <div className='px-2 flex items-center justify-between text-[11px] text-[#555555] font-mono'>
          <span className='flex items-center gap-1.5'>
            <span className='w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse'></span>
            Sync Online
          </span>
          <span className='text-[#B8B8B8]'>v2.4</span>
        </div>
      </div>
    </aside>
  );
};
