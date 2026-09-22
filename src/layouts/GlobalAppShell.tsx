import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MangaProject } from '../types';
import {
  LayoutDashboard,
  Users,
  Shield,
  Cpu,
  Database,
  List,
  Settings,
  Briefcase,
  Kanban,
  BookMarked,
  Calendar,
  History,
  FileText,
  ShieldCheck,
  Upload,
  FileEdit,
  Sparkles,
  Split,
  Inbox,
  LayoutTemplate,
  UploadCloud,
  AlertCircle,
  Type,
  AlertTriangle,
  Settings2,
  Columns,
  CheckSquare,
  MessageSquare,
  Server,
  BookOpen,
  ChevronDown,
  Bell,
  Search,
  UserCircle,
  Eye,
  Layers,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { AppShellSidebar } from './components/AppShellSidebar';

export interface CurrentUser {
  name: string;
  role: string;
  activeRoles?: string[];
  avatarInitials: string;
}

interface GlobalAppShellProps {
  currentUser: CurrentUser;
  activeSeries: MangaProject | { title: string; subtitle: string };
  aiState?: 'active' | 'degraded' | 'unavailable';
  onLogout?: () => void;
  onLeaveFeedback?: () => void;
  onOpenTwoFactor?: () => void;
  onOpenChangePassword?: () => void;
}

const UNIFIED_NAV_CONFIG = [
  {
    section: 'STUDIO WORKSPACE',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Kanban, label: 'Production Pipeline', href: '/workspace' },
      { icon: Split, label: 'Panel Workspace', href: '/workspace/task/default' },
      { icon: BookMarked, label: 'Series Bible', href: '/bible' },
      { icon: Users, label: 'Members & Roles', href: '/members' },
    ],
  },
  {
    section: 'PUBLISHING & AUDIT',
    items: [
      { icon: History, label: 'Provenance / Restore', href: '/provenance' },
      { icon: Upload, label: 'Export / Publish', href: '/export' },
    ],
  },
];

export function GlobalAppShell({
  currentUser,
  activeSeries,
  aiState = 'active',
  onLogout,
  onLeaveFeedback,
  onOpenTwoFactor,
  onOpenChangePassword,
}: GlobalAppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isReader = currentUser.activeRoles?.includes('READER') || currentUser.role === 'READER';
  // We use unified config for everyone. Admin gets extra items appended.
  const navSections = [...UNIFIED_NAV_CONFIG];
  
  if (currentUser.activeRoles?.includes('ADMINISTRATOR')) {
    navSections.push({
      section: 'SYSTEM ADMIN',
      items: [
        { icon: LayoutDashboard, label: 'System Dashboard', href: '/admin' },
        { icon: Users, label: 'Users & Workspaces', href: '/users' },
        { icon: Cpu, label: 'AI Provider & Quota', href: '/ai-quota' },
        { icon: List, label: 'Global Audit Log', href: '/audit-log' },
      ],
    });
  }

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    navigate(href);
  };
  
  // Set isActive based on location pathname
  navSections.forEach(section => {
    section.items.forEach((item: any) => {
      item.isActive = location.pathname.startsWith(item.href);
    });
  });

  const renderBadge = (badge: any) => {
    if (!badge) return null;
    if (badge.type === 'dot') {
      return <span className={`ml-auto w-1.5 h-1.5 rounded-full ${badge.color}`}></span>;
    }
    if (badge.type === 'text') {
      return (
        <span
          className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${badge.color || 'text-[#555555]'}`}
        >
          {badge.text}
        </span>
      );
    }
    return null;
  };

  const getAiBadgeConfig = (state: string) => {
    switch (state) {
      case 'degraded':
        return {
          wrapper: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
          Icon: Sparkles,
          iconColor: 'text-yellow-600',
          text: 'AI Slow',
          ping: false,
        };
      case 'unavailable':
        return {
          wrapper: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200',
          Icon: AlertTriangle,
          iconColor: 'text-gray-500',
          text: 'AI Offline — Manual mode',
          ping: false,
        };
      case 'active':
      default:
        return {
          wrapper: 'bg-[#F3E8FF] text-[#6D28D9] border-[#8B5CF6] hover:bg-[#EDE9FE]',
          Icon: Sparkles,
          iconColor: 'text-[#8B5CF6]',
          text: 'AI Active',
          ping: true,
          extra: (
            <span className='text-[10px] font-mono text-[#8B5CF6]/80 border-l border-[#8B5CF6]/30 pl-1 ml-0.5'>
              99.4%
            </span>
          ),
        };
    }
  };

  const aiConfig = getAiBadgeConfig(aiState);

  return (
    <div className='h-screen w-full flex overflow-hidden text-[#171717] bg-[#F8F6F0]'>
      {/* --- SIDEBAR --- */}
      {/* --- SIDEBAR --- */}
      <AppShellSidebar
        currentUser={currentUser}
        activeSeries={activeSeries}
        isReader={isReader}
        navSections={navSections}
        handleNavClick={handleNavClick}
        renderBadge={renderBadge}
        onOpenTwoFactor={onOpenTwoFactor}
        onLogout={onLogout}
      />

      {/* --- RIGHT WRAPPER --- */}
      <div className='flex-1 flex flex-col min-w-0 h-full bg-[#FFFFFF] relative'>
        <header className='h-16 bg-[#FFFFFF] border-b border-[#E7E7E7] flex items-center justify-between px-6 shrink-0 z-20'>
          <div className='flex items-center gap-2 min-w-0'>
            {isReader ? (
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white font-heading font-bold text-base shadow-sm tracking-tighter'>
                  PF
                </div>
                <div>
                  <span className='text-[#171717] font-semibold text-sm'>
                    Preview: {activeSeries.title}
                  </span>
                  <span className='ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-red-50 text-red-600 border border-red-200'>
                    CONFIDENTIAL
                  </span>
                </div>
              </div>
            ) : (
              <nav className='flex items-center text-sm font-medium text-[#555555] truncate'>
                <span
                  className='hover:text-[#171717] cursor-pointer transition-colors'
                  onClick={() => navigate('/projects')}
                >
                  Projects
                </span>
                <span className='mx-2 text-[#B8B8B8] font-normal select-none'>/</span>
                <span className='hover:text-[#171717] cursor-pointer transition-colors truncate'>
                  {activeSeries.title}
                </span>
                <span className='mx-2 text-[#B8B8B8] font-normal select-none'>/</span>
                <span className='text-[#171717] font-semibold truncate flex items-center gap-1.5'>
                  {currentUser.activeRoles?.includes('ADMINISTRATOR') ? 'Global Settings' : 'Workspace'}
                  {!currentUser.activeRoles?.includes('ADMINISTRATOR') && !currentUser.activeRoles?.includes('READER') && (
                    <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'>
                      In Review
                    </span>
                  )}
                </span>
              </nav>
            )}
          </div>

          <div className='flex items-center gap-4 shrink-0'>
            {!isReader && (
              <div className='relative flex items-center'>
                <Search className='w-3.5 h-3.5 text-[#555555] absolute left-3 pointer-events-none stroke-[2]' />
                <input
                  type='text'
                  placeholder='Search cuts, dialogue, lore...'
                  className='bg-[#F3F3F3] border border-[#E7E7E7] rounded-full pl-8 pr-8 py-1.5 text-xs text-[#171717] placeholder:text-[#B8B8B8] focus:outline-none focus:border-[#F97316] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#F97316]/10 transition-all w-56 lg:w-64'
                />
                <kbd className='hidden sm:inline-block absolute right-2.5 text-[9px] font-mono text-[#555555] bg-white border border-[#E7E7E7] rounded px-1.5 py-0.5 shadow-2xs pointer-events-none'>
                  ⌘K
                </kbd>
              </div>
            )}

            {!isReader && (
              <div
                className={`hidden sm:flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-default shadow-2xs ${aiConfig.wrapper}`}
              >
                {aiConfig.ping && (
                  <span className='w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-ping'></span>
                )}
                <aiConfig.Icon className={`w-3 h-3 stroke-[2.2] ${aiConfig.iconColor}`} />
                <span>{aiConfig.text}</span>
                {aiConfig.extra}
              </div>
            )}

            {isReader && (
              <button
                onClick={onLogout}
                className='text-sm font-medium text-[#555555] hover:text-[#171717] px-3 py-1.5 flex items-center gap-1.5'
              >
                <LogOut className='w-4 h-4' /> Exit Preview
              </button>
            )}

            {!isReader && (
              <button
                className='p-1.5 text-[#555555] hover:text-[#171717] hover:bg-[#F3F3F3] rounded-full transition-colors relative'
                aria-label='Notifications'
              >
                <Bell className='w-4 h-4 stroke-[2]' />
                <span className='absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F97316] ring-2 ring-white'></span>
              </button>
            )}

            <div className='h-5 w-px bg-[#E7E7E7]'></div>

            <div className='relative'>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className='flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity text-left'
                title='User Profile & Security'
              >
                <div className='w-8 h-8 rounded-full bg-[#171717] text-[#FFFFFF] font-heading font-semibold text-xs flex items-center justify-center shadow-xs ring-1 ring-[#E7E7E7]'>
                  {currentUser.avatarInitials}
                </div>
                <div className='hidden md:flex flex-col text-left'>
                  <span className='text-xs font-medium text-[#171717] leading-tight'>
                    {currentUser.name}
                  </span>
                  <span className='text-[10px] text-[#555555] font-mono leading-none'>
                    {currentUser.role}
                  </span>
                </div>
                <ChevronDown className='w-3 h-3 text-[#888888]' />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className='fixed inset-0 z-40'
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className='absolute right-0 top-11 w-56 bg-white border border-[#E7E7E7] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150'>
                    <div className='px-3 py-2 border-b border-[#E7E7E7] mb-1'>
                      <p className='text-xs font-bold text-[#171717] truncate'>{currentUser.name}</p>
                      <p className='text-[10px] text-[#888888] font-mono'>{currentUser.role}</p>
                    </div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenTwoFactor?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#555555] hover:text-[#171717] hover:bg-[#F8F6F0] px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <ShieldCheck className='w-3.5 h-3.5 text-[#F97316]' />
                      <span>Two-Factor Auth (2FA)</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePassword?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#555555] hover:text-[#171717] hover:bg-[#F8F6F0] px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <KeyRound className='w-3.5 h-3.5 text-[#F97316]' />
                      <span className='font-medium text-[#171717]'>Change Password</span>
                    </button>

                    <div className='my-1 border-t border-[#E7E7E7]' />

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <LogOut className='w-3.5 h-3.5 text-red-500' />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {currentUser.activeRoles?.some(r => ['PRODUCER', 'ADMINISTRATOR', 'ARTIST'].includes(r)) && (
              <button className='bg-[#F97316] text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#EA580C] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm'>
                {currentUser.activeRoles?.includes('ARTIST') ? (
                  <UploadCloud className='w-3.5 h-3.5 stroke-[2.5]' />
                ) : (
                  <Upload className='w-3.5 h-3.5 stroke-[2.5]' />
                )}
                <span>{currentUser.activeRoles?.includes('ARTIST') ? 'Submit' : 'Export'}</span>
              </button>
            )}

            {isReader && (
              <button
                onClick={onLeaveFeedback}
                className='bg-[#171717] text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-black transition-all shadow-sm'
              >
                Leave Feedback
              </button>
            )}
          </div>
        </header>

        <main className='flex-1 overflow-y-auto custom-scrollbar flex flex-col relative min-h-0 bg-[#F3F3F3]'>
          {isReader && (
            <div className='absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-[0.03] rotate-[-30deg] z-0 overflow-hidden'>
              <p className='text-6xl font-heading font-bold text-black whitespace-nowrap'>
                CONFIDENTIAL PREVIEW DO NOT DISTRIBUTE
              </p>
              <p className='text-6xl font-heading font-bold text-black whitespace-nowrap mt-20'>
                CONFIDENTIAL PREVIEW DO NOT DISTRIBUTE
              </p>
              <p className='text-6xl font-heading font-bold text-black whitespace-nowrap mt-20'>
                CONFIDENTIAL PREVIEW DO NOT DISTRIBUTE
              </p>
            </div>
          )}

          <div className='relative z-10 w-full min-h-full flex-1 flex flex-col'><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
