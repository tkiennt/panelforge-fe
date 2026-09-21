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
        {currentUser.activeRoles?.includes('ADMINISTRATOR') ? (
          <div className='bg-[#FFFFFF] border border-[#E7E7E7] rounded-lg p-2.5 flex items-center justify-between shadow-xs'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='w-6 h-6 rounded bg-[#171717] flex items-center justify-center shrink-0 text-white'>
                <Server className='w-3.5 h-3.5' />
              </div>
              <div className='min-w-0'>
                <p className='text-xs font-semibold text-[#171717] truncate leading-tight'>
                  System Global
                </p>
                <p className='text-[10px] text-[#555555] font-mono truncate'>Admin Zone</p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className='group bg-[#FFFFFF] border border-[#E7E7E7] hover:border-[#B8B8B8] transition-all rounded-lg p-2.5 flex items-center justify-between cursor-pointer shadow-xs'
            title='Switch active manga serialization'
          >
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='w-6 h-6 rounded bg-[#FFF7ED] border border-[#FDBA74]/50 flex items-center justify-center shrink-0 text-[#F97316]'>
                <BookOpen className='w-3.5 h-3.5 stroke-[2.2]' />
              </div>
              <div className='min-w-0'>
                <p className='text-xs font-semibold text-[#171717] truncate leading-tight'>
                  {activeSeries.title}
                </p>
                <p className='text-[10px] text-[#555555] font-mono truncate'>
                  {activeSeries.subtitle || 'Volume 01'}
                </p>
              </div>
            </div>
            <ChevronDown className='w-4 h-4 text-[#555555] group-hover:text-[#171717] transition-colors shrink-0 stroke-[2]' />
          </div>
        )}
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
                  ? 'bg-[#FFF7ED] text-[#F97316] border-l-4 border-[#F97316] shadow-2xs rounded-r-md rounded-l-none'
                  : 'text-[#555555] hover:bg-[#E7E7E7]/50 hover:text-[#171717] cursor-pointer';

                const iconClass = `w-4 h-4 transition-colors ${item.isActive ? 'text-[#F97316] stroke-[2.2]' : 'text-[#555555] group-hover:text-[#171717] stroke-[2]'}`;
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
