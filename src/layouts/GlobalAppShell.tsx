import React, { useState } from 'react';
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
import { SystemRole, WorkspaceRole } from '../types';

export interface CurrentUser {
  name: string;
  role: SystemRole;
  workspaceRole?: WorkspaceRole | null;
  avatarInitials: string;
}

interface GlobalAppShellProps {
  currentUser: CurrentUser;
  activeSeries: MangaProject | { title: string; subtitle: string };
  aiState?: 'active' | 'degraded' | 'unavailable';
  children: React.ReactNode;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
  onLeaveFeedback?: () => void;
  onOpenTwoFactor?: () => void;
  onOpenChangePassword?: () => void;
}

// Map roles to their specific navigation configurations
const NAV_CONFIG: Record<string, { section: string; items: any[] }[]> = {
  ADMINISTRATOR: [
    {
      section: 'SYSTEM ADMIN',
      items: [
        { icon: LayoutDashboard, label: 'System Dashboard', href: 'admin-dash' },
        { icon: Users, label: 'Users & Workspaces', href: 'users' },
        { icon: Shield, label: 'Roles & Permissions', href: 'roles' },
        {
          icon: Cpu,
          label: 'AI Provider & Quota',
          href: 'ai-quota',
          badge: { type: 'dot', color: 'bg-emerald-500' },
        },
        { icon: Database, label: 'Storage & Backup', href: 'storage' },
        { icon: List, label: 'Global Audit Log', href: 'audit' },
        { icon: Settings, label: 'Master Data', href: 'master-data' },
      ],
    },
  ],
  PRODUCER: [
    {
      section: 'WORKSPACE',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', href: 'dashboard', isActive: true },
        { icon: Briefcase, label: 'Studio Workspaces', href: 'workspaces' },
        {
          icon: Kanban,
          label: 'Production Pipeline',
          href: 'workflow',
          badge: { type: 'text', text: 'Ch. 5', color: 'bg-[#F97316]/10 text-[#F97316]' },
        },
        {
          icon: BookMarked,
          label: 'Series Bible',
          href: 'bible',
          badge: { type: 'dot', color: 'bg-[#8B5CF6]' },
        },
        {
          icon: Users,
          label: 'Members & Roles',
          href: 'members',
          badge: { type: 'text', text: '6', color: 'text-[#555555]' },
        },
        { icon: Calendar, label: 'Release Calendar', href: 'calendar' },
        { icon: History, label: 'Provenance / Restore', href: 'provenance' },
      ],
    },
    {
      section: 'PUBLISHING',
      items: [
        { icon: FileText, label: 'B5 Pre-Press Specs', href: 'specs' },
        { icon: ShieldCheck, label: 'SHA-256 Provenance', href: 'sha' },
        { icon: Upload, label: 'Export / Publish', href: 'export' },
      ],
    },
  ],
  WRITER: [
    {
      section: 'WRITING',
      items: [
        { icon: FileEdit, label: 'My Scripts', href: 'script', isActive: true },
        {
          icon: Sparkles,
          label: 'AI Breakdown Requests',
          href: 'ai-breakdown',
          badge: { type: 'text', text: '2 Pending', color: 'bg-[#F3E8FF] text-[#6D28D9]' },
        },
        { icon: BookMarked, label: 'Series Bible (Link Mode)', href: 'bible' },
        { icon: Split, label: 'Script Version Compare', href: 'compare' },
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
          href: 'queue',
          badge: { type: 'text', text: '12', color: 'bg-[#F97316] text-white rounded-full px-2' },
        },
        { icon: LayoutTemplate, label: 'Layout & Thumbnail', href: 'layout', isActive: true },
        { icon: UploadCloud, label: 'Upload Artwork', href: 'upload' },
        { icon: BookMarked, label: 'Series Bible & Assets', href: 'bible' },
        {
          icon: AlertCircle,
          label: 'Change Requests',
          href: 'requests',
          badge: { type: 'dot', color: 'bg-red-500' },
        },
      ],
    },
  ],
  LETTERER: [
    {
      section: 'LETTERING',
      items: [
        { icon: Type, label: 'Panel Canvas', href: 'canvas', isActive: true },
        {
          icon: AlertTriangle,
          label: 'Overflow Warnings',
          href: 'warnings',
          badge: { type: 'text', text: '3', color: 'bg-yellow-100 text-yellow-700' },
        },
        { icon: Settings2, label: 'Typography Presets', href: 'presets' },
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
          href: 'review',
          isActive: true,
          badge: {
            type: 'text',
            text: 'In Review',
            color: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
          },
        },
        { icon: Columns, label: 'Side-by-side Compare', href: 'compare' },
        { icon: CheckSquare, label: 'Consistency Check', href: 'check' },
        { icon: MessageSquare, label: 'Change Requests', href: 'requests' },
      ],
    },
  ],
  READER: [],
};

export function GlobalAppShell({
  currentUser,
  activeSeries,
  aiState = 'active',
  children,
  onNavigate,
  onLogout,
  onLeaveFeedback,
  onOpenTwoFactor,
  onOpenChangePassword,
}: GlobalAppShellProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isReader = false;
  const navSections =
    currentUser.role === 'ADMINISTRATOR'
      ? NAV_CONFIG['ADMINISTRATOR'] || []
      : currentUser.workspaceRole
        ? NAV_CONFIG[currentUser.workspaceRole] || []
        : [];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(href);
    }
  };

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
      {!isReader && (
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
            {currentUser.role === 'ADMINISTRATOR' ? (
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
                data-testid='sidebar-workspace-switcher'
                onClick={(e) => handleNavClick(e, 'workspaces')}
                className='group bg-[#FFFFFF] border border-[#E7E7E7] hover:border-[#F97316] transition-all rounded-lg p-2.5 flex items-center justify-between cursor-pointer shadow-xs active:scale-[0.99]'
                title='Đổi Workspace / Quay lại danh sách Workspace'
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
                <ChevronDown className='w-4 h-4 text-[#555555] group-hover:text-[#F97316] transition-colors shrink-0 stroke-[2]' />
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
                  {section.items.map((item, i) => {
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
              <button className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group'>
                <Bell className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2]' />
                <span className='font-medium text-xs'>Notifications</span>
              </button>
              <button className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group'>
                <Search className='w-4 h-4 text-[#555555] group-hover:text-[#171717] stroke-[2]' />
                <span className='font-medium text-xs'>Global Search</span>
              </button>
              <button className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group'>
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
                onClick={onOpenChangePassword}
                className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-[#171717] hover:bg-[#E7E7E7]/40 px-2 py-1.5 rounded-md transition-colors group cursor-pointer'
              >
                <KeyRound className='w-4 h-4 text-[#555555] group-hover:text-[#F97316] stroke-[2]' />
                <span className='font-medium text-xs'>Change Password</span>
              </button>
              <button
                onClick={onLogout}
                className='w-full text-left flex items-center gap-2 text-sm text-[#555555] hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors group mt-2'
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
      )}

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
                <button
                  type='button'
                  data-testid='back-to-workspaces-breadcrumb'
                  className='hover:text-[#171717] cursor-pointer transition-colors flex items-center gap-1.5'
                  onClick={(e) => handleNavClick(e, 'workspaces')}
                  title='Quay lại danh sách Workspace'
                >
                  <Briefcase className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>Workspaces</span>
                </button>
                <span className='mx-2 text-[#B8B8B8] font-normal select-none'>/</span>
                <span className='hover:text-[#171717] cursor-pointer transition-colors truncate'>
                  {activeSeries.title}
                </span>
                <span className='mx-2 text-[#B8B8B8] font-normal select-none'>/</span>
                <span className='text-[#171717] font-semibold truncate flex items-center gap-1.5'>
                  {currentUser.role === 'ADMINISTRATOR' ? 'Global Settings' : 'Workspace'}
                  {currentUser.role !== 'ADMINISTRATOR' && currentUser.workspaceRole && (
                    <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'>
                      {currentUser.workspaceRole}
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
                    {currentUser.role === 'ADMINISTRATOR'
                      ? 'ADMIN'
                      : currentUser.workspaceRole || 'USER'}
                  </span>
                </div>
                <ChevronDown className='w-3 h-3 text-[#888888]' />
              </button>

              {userMenuOpen && (
                <>
                  <div className='fixed inset-0 z-40' onClick={() => setUserMenuOpen(false)} />
                  <div className='absolute right-0 top-11 w-56 bg-white border border-[#E7E7E7] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150'>
                    <div className='px-3 py-2 border-b border-[#E7E7E7] mb-1'>
                      <p className='text-xs font-bold text-[#171717] truncate'>
                        {currentUser.name}
                      </p>
                      <p className='text-[10px] text-[#888888] font-mono'>
                        {currentUser.role === 'ADMINISTRATOR'
                          ? 'System Administrator'
                          : `Workspace: ${currentUser.workspaceRole || 'Member'}`}
                      </p>
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

                    <button
                      data-testid='user-menu-switch-workspace'
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate?.('workspaces');
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#555555] hover:text-[#171717] hover:bg-[#F8F6F0] px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <Briefcase className='w-3.5 h-3.5 text-[#F97316]' />
                      <span>Đổi Workspace (Workspaces)</span>
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

            {(currentUser.role === 'ADMINISTRATOR' ||
              ['PRODUCER', 'ARTIST'].includes(currentUser.workspaceRole as string)) && (
              <button className='bg-[#F97316] text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#EA580C] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm'>
                {currentUser.workspaceRole === 'ARTIST' ? (
                  <UploadCloud className='w-3.5 h-3.5 stroke-[2.5]' />
                ) : (
                  <Upload className='w-3.5 h-3.5 stroke-[2.5]' />
                )}
                <span>{currentUser.workspaceRole === 'ARTIST' ? 'Submit' : 'Export'}</span>
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

          <div className='relative z-10 w-full min-h-full flex-1 flex flex-col'>{children}</div>
        </main>
      </div>
    </div>
  );
}
