import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MangaProject, SystemRole, WorkspaceRole } from '../types';
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
  role: SystemRole | string;
  workspaceRole?: WorkspaceRole | null;
  activeRoles?: string[];
  avatarInitials: string;
}

interface GlobalAppShellProps {
  currentUser: CurrentUser;
  activeSeries?: MangaProject | { title: string; subtitle: string } | null;
  aiState?: 'active' | 'degraded' | 'unavailable';
  children?: React.ReactNode;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
  onLeaveFeedback?: () => void;
  onOpenTwoFactor?: () => void;
  onOpenChangePassword?: () => void;
}

const ROLE_NAV_CONFIG: Record<string, { section: string; items: any[] }[]> = {
  ADMINISTRATOR: [
    {
      section: 'SYSTEM ADMIN',
      items: [
        { icon: LayoutDashboard, label: 'System Dashboard', href: '/admin' },
        { icon: Users, label: 'Users & Roles', href: '/users' },
        {
          icon: Cpu,
          label: 'AI Provider & Quota',
          href: '/ai-quota',
          badge: { type: 'dot', color: 'bg-emerald-500' },
        },
        { icon: List, label: 'Global Audit Log', href: '/audit-log' },
      ],
    },
  ],
  PRODUCER: [
    {
      section: 'WORKSPACE',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: Briefcase, label: 'Studio Workspaces', href: '/producer' },
        {
          icon: Kanban,
          label: 'Production Pipeline',
          href: '/workspace',
          badge: { type: 'text', text: 'Ch. 5', color: 'bg-[#F97316]/10 text-[#F97316]' },
        },
        {
          icon: BookMarked,
          label: 'Series Bible',
          href: '/bible',
          badge: { type: 'dot', color: 'bg-[#8B5CF6]' },
        },
        {
          icon: Users,
          label: 'Members & Roles',
          href: '/members',
        },
        { icon: Calendar, label: 'Release Calendar', href: '/calendar' },
        { icon: History, label: 'Provenance / Restore', href: '/provenance' },
      ],
    },
    {
      section: 'PUBLISHING',
      items: [
        { icon: FileText, label: 'B5 Pre-Press Specs', href: '/specs' },
        { icon: ShieldCheck, label: 'SHA-256 Provenance', href: '/sha' },
        { icon: Upload, label: 'Export / Publish', href: '/export' },
      ],
    },
  ],
  WRITER: [
    {
      section: 'WRITING',
      items: [
        { icon: FileEdit, label: 'My Scripts', href: '/workspace' },
        {
          icon: Sparkles,
          label: 'AI Breakdown Requests',
          href: '/ai-breakdown',
          badge: { type: 'text', text: '2 Pending', color: 'bg-[#F3E8FF] text-[#6D28D9]' },
        },
        { icon: BookMarked, label: 'Series Bible', href: '/bible' },
        { icon: Split, label: 'Script Version Compare', href: '/compare' },
      ],
    },
  ],
  ARTIST: [
    {
      section: 'STUDIO DESK',
      items: [
        {
          icon: Inbox,
          label: 'My Task Queue',
          href: '/workspace',
          badge: { type: 'text', text: '12', color: 'bg-[#F97316] text-white rounded-full px-2' },
        },
        { icon: LayoutTemplate, label: 'Layout & Thumbnail', href: '/layout' },
        { icon: UploadCloud, label: 'Upload Artwork', href: '/upload' },
        { icon: BookMarked, label: 'Series Bible & Assets', href: '/bible' },
        {
          icon: AlertCircle,
          label: 'Change Requests',
          href: '/requests',
          badge: { type: 'dot', color: 'bg-red-500' },
        },
      ],
    },
  ],
  LETTERER: [
    {
      section: 'LETTERING',
      items: [
        { icon: Type, label: 'Panel Canvas', href: '/workspace' },
        {
          icon: AlertTriangle,
          label: 'Overflow Warnings',
          href: '/warnings',
          badge: { type: 'text', text: '3', color: 'bg-yellow-100 text-yellow-700' },
        },
        { icon: Settings2, label: 'Typography Presets', href: '/presets' },
      ],
    },
  ],
  EDITOR: [
    {
      section: 'EDITORIAL',
      items: [
        {
          icon: Inbox,
          label: 'Review Queue',
          href: '/workspace',
          badge: {
            type: 'text',
            text: 'In Review',
            color: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
          },
        },
        { icon: Columns, label: 'Side-by-side Compare', href: '/compare' },
        { icon: CheckSquare, label: 'Consistency Check', href: '/check' },
        { icon: MessageSquare, label: 'Change Requests', href: '/requests' },
      ],
    },
  ],
  READER: [],
};

export function GlobalAppShell({
  currentUser,
  activeSeries = { title: 'PanelForge Studio', subtitle: 'Global Console' },
  aiState = 'active',
  children,
  onNavigate,
  onLogout,
  onLeaveFeedback,
  onOpenTwoFactor,
  onOpenChangePassword,
}: GlobalAppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isReader =
    currentUser.activeRoles?.includes('READER') ||
    currentUser.role === 'READER' ||
    currentUser.workspaceRole === ('READER' as any);

  const effectiveRole = currentUser.workspaceRole
    ? String(currentUser.workspaceRole).toUpperCase()
    : currentUser.activeRoles && currentUser.activeRoles.length > 0
      ? String(currentUser.activeRoles[0]).toUpperCase()
      : 'PRODUCER';

  const rawSections =
    (currentUser.role === 'ADMINISTRATOR' || currentUser.activeRoles?.includes('ADMINISTRATOR')) &&
    !currentUser.workspaceRole
      ? ROLE_NAV_CONFIG['ADMINISTRATOR'] || []
      : ROLE_NAV_CONFIG[effectiveRole] || ROLE_NAV_CONFIG['PRODUCER'] || [];

  const navSections = rawSections.map((sec) => ({
    ...sec,
    items: sec.items.map((item) => ({ ...item })),
  }));

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(href);
    }
    navigate(href.startsWith('/') ? href : `/${href}`);
  };

  // Set isActive based on location pathname
  navSections.forEach((section) => {
    section.items.forEach((item: any) => {
      item.isActive =
        location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
    });
  });

  const renderBadge = (badge: any) => {
    if (!badge) return null;
    if (badge.type === 'dot') {
      return <span className={`w-2 h-2 rounded-full ${badge.color} ml-auto shrink-0`} />;
    }
    if (badge.type === 'text') {
      return (
        <span
          className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${badge.color} shrink-0`}
        >
          {badge.text}
        </span>
      );
    }
    return null;
  };

  const getAiBadgeConfig = (state: string) => {
    switch (state) {
      case 'active':
        return {
          icon: Sparkles,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'AI: Available (Gemini 1.5 Pro)',
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500 animate-pulse',
          label: 'AI: Degraded (High Latency)',
        };
      case 'unavailable':
      default:
        return {
          icon: AlertCircle,
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'AI: Offline (Fallback Mock Active)',
        };
    }
  };

  const aiConfig = getAiBadgeConfig(aiState);

  return (
    <div className='h-screen w-full flex overflow-hidden text-[#171717] bg-[#F8F6F0]'>
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
                    {activeSeries?.title || 'PanelForge Studio'}
                  </span>
                </div>
              </div>
            ) : (
              <nav className='flex items-center text-xs font-medium text-[#555555] truncate'>
                <button
                  type='button'
                  data-testid='back-to-workspaces-breadcrumb'
                  className='hover:text-[#171717] cursor-pointer transition-colors flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-[#FAF8F5]'
                  onClick={() => navigate('/workspaces')}
                  title='Quay lại danh sách Workspace (Workspaces Catalog)'
                >
                  <Briefcase className='w-3.5 h-3.5 text-[#F97316]' />
                  <span className='font-semibold'>Workspaces</span>
                </button>
                <span className='mx-1.5 text-[#B8B8B8] font-normal select-none'>/</span>

                {/* Studio / Series Name Segment */}
                <button
                  type='button'
                  onClick={() => navigate('/producer')}
                  className='hover:text-[#171717] cursor-pointer transition-colors truncate px-1.5 py-1 rounded hover:bg-[#FAF8F5] flex items-center gap-1 font-semibold text-[#171717]'
                  title='Mở Studio Desk (/producer)'
                >
                  <BookOpen className='w-3.5 h-3.5 text-[#8B5CF6]' />
                  <span className='truncate'>{activeSeries?.title || 'PanelForge Studio'}</span>
                </button>
                <span className='mx-1.5 text-[#B8B8B8] font-normal select-none'>/</span>

                {/* Stage / Active View Segment */}
                <button
                  type='button'
                  onClick={() => navigate('/workspace')}
                  className='text-[#171717] font-semibold truncate flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-[#FAF8F5] transition-colors cursor-pointer'
                  title='Chuyển đến Bàn Làm Việc (Kanban Pipeline)'
                >
                  <Layers className='w-3.5 h-3.5 text-[#10B981]' />
                  <span className='truncate'>
                    {currentUser.role === 'ADMINISTRATOR' ||
                    currentUser.activeRoles?.includes('ADMINISTRATOR')
                      ? 'System Console'
                      : 'Kanban Pipeline'}
                  </span>
                  {currentUser.workspaceRole && (
                    <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'>
                      {currentUser.workspaceRole}
                    </span>
                  )}
                </button>
              </nav>
            )}
          </div>

          <div className='flex items-center gap-4 shrink-0'>
            {!isReader && (
              <div className='relative flex items-center'>
                <Search className='w-3.5 h-3.5 text-[#555555] absolute left-3 pointer-events-none stroke-[2]' />
                <input
                  type='text'
                  placeholder='Search frames, dialogues, assets...'
                  className='pl-8 pr-12 py-1.5 bg-[#FAF8F3] hover:bg-[#F3EFE6] focus:bg-white text-xs rounded-md border border-[#E7E7E7] focus:border-[#F97316] focus:outline-none w-64 transition-all'
                />
                <span className='absolute right-2 px-1.5 py-0.5 text-[10px] font-mono text-[#555555] bg-[#E7E7E7] rounded select-none'>
                  ⌘K
                </span>
              </div>
            )}

            {/* AI Status Badge */}
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${aiConfig.color}`}
              title={aiConfig.label}
            >
              <span className={`w-2 h-2 rounded-full ${aiConfig.dot}`} />
              <span className='font-mono text-[11px] hidden sm:inline'>{aiConfig.label}</span>
            </div>

            {/* User Profile Dropdown Menu */}
            <div className='relative'>
              <button
                type='button'
                data-testid='header-user-menu-btn'
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className='flex items-center gap-2.5 p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer'
              >
                <div className='w-8 h-8 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs shadow-xs'>
                  {currentUser.avatarInitials}
                </div>
                <div className='hidden md:flex flex-col text-left'>
                  <span className='text-xs font-semibold text-[#171717] leading-tight'>
                    {currentUser.name}
                  </span>
                  <span className='text-[10px] text-[#555555] font-mono leading-tight'>
                    {currentUser.role}
                  </span>
                </div>
                <ChevronDown className='w-3 h-3 text-[#555555]' />
              </button>

              {userMenuOpen && (
                <>
                  <div className='fixed inset-0 z-40' onClick={() => setUserMenuOpen(false)} />
                  <div className='absolute right-0 mt-2 w-56 bg-white border border-[#E7E7E7] rounded-xl shadow-lg z-50 p-1.5 text-xs animate-in fade-in-50 zoom-in-95'>
                    <div className='px-3 py-2 border-b border-[#E7E7E7] mb-1'>
                      <p className='font-semibold text-[#171717]'>{currentUser.name}</p>
                      <p className='text-[10px] text-[#555555] font-mono'>{currentUser.role}</p>
                    </div>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/profile');
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#171717] hover:bg-neutral-100 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <UserCircle className='w-3.5 h-3.5 text-[#555555]' />
                      <span>Hồ sơ cá nhân</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePassword?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#171717] hover:bg-neutral-100 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <KeyRound className='w-3.5 h-3.5 text-[#555555]' />
                      <span>Đổi mật khẩu</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenTwoFactor?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#171717] hover:bg-neutral-100 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <Shield className='w-3.5 h-3.5 text-[#F97316]' />
                      <span>Bảo mật hai lớp (2FA)</span>
                    </button>

                    <button
                      type='button'
                      data-testid='user-menu-switch-workspace'
                      onClick={() => {
                        setUserMenuOpen(false);
                        if (onNavigate) onNavigate('/workspaces');
                        navigate('/workspaces');
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#555555] hover:text-[#171717] hover:bg-neutral-100 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <Briefcase className='w-3.5 h-3.5 text-[#F97316]' />
                      <span>Đổi Workspace (Workspaces)</span>
                    </button>

                    <div className='my-1 border-t border-[#E7E7E7]' />

                    <button
                      type='button'
                      data-testid='logout-btn'
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

            {(currentUser.role === 'ADMINISTRATOR' ||
              currentUser.activeRoles?.includes('ADMINISTRATOR') ||
              currentUser.activeRoles?.includes('PRODUCER') ||
              currentUser.workspaceRole === 'PRODUCER' ||
              currentUser.activeRoles?.includes('ARTIST') ||
              currentUser.workspaceRole === 'ARTIST') && (
              <button
                onClick={() => {
                  if (
                    currentUser.workspaceRole === 'ARTIST' ||
                    currentUser.activeRoles?.includes('ARTIST')
                  ) {
                    navigate('/workspace/task/default');
                  } else {
                    navigate('/export');
                  }
                }}
                className='bg-[#F97316] text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#EA580C] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm'
              >
                {currentUser.workspaceRole === 'ARTIST' ||
                currentUser.activeRoles?.includes('ARTIST') ? (
                  <>
                    <UploadCloud className='w-3.5 h-3.5 stroke-[2.5]' />
                    <span>Submit</span>
                  </>
                ) : (
                  <>
                    <Upload className='w-3.5 h-3.5 stroke-[2.5]' />
                    <span>Export</span>
                  </>
                )}
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
          <div className='relative z-10 w-full min-h-full flex-1 flex flex-col'>
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
