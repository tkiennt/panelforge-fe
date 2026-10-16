import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { MangaProject, SystemRole, WorkspaceRole } from '@/types';
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
  Send,
  Menu,
} from 'lucide-react';
import { AppShellSidebar } from './AppShellSidebar';
import { AppShellRail } from './AppShellRail';
import { NotificationBell } from '@/shared/features/collaboration/NotificationBell';
import { SidebarDrawer } from '@/shared/components/SidebarDrawer';
import { getRoleDefaultPath } from '@/roles/roles';

export interface CurrentUser {
  name: string;
  role: SystemRole | string;
  workspaceRole?: WorkspaceRole | null;
  activeRoles?: string[];
  avatarInitials: string;
}

interface GlobalAppShellProps {
  currentUser: CurrentUser;
  activeWorkspace?: { id?: string; name: string } | null;
  activeSeries?: MangaProject | { title: string; subtitle: string } | null;
  aiState?: 'active' | 'degraded' | 'unavailable';
  children?: React.ReactNode;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
  onLeaveFeedback?: () => void;
  onOpenTwoFactor?: () => void;
  onOpenChangePassword?: () => void;
  onOpenCommandPalette?: () => void;
  onSelectSeries?: (seriesId: string) => void;
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
      section: 'BÀN LÀM VIỆC',
      items: [
        { icon: Layers, label: 'Công việc của tôi', href: '/my-work' },
        { icon: FileText, label: 'Kịch bản (Script)', href: '/script' },
        { icon: BookMarked, label: 'Series Bible', href: '/bible' },
      ],
    },
  ],
  ARTIST: [
    {
      section: 'BÀN LÀM VIỆC',
      items: [
        { icon: Layers, label: 'Công việc của tôi', href: '/my-work' },
        { icon: LayoutTemplate, label: 'Bàn vẽ & Khung trang', href: '/artist' },
        { icon: BookMarked, label: 'Series Bible', href: '/bible' },
      ],
    },
  ],
  LETTERER: [
    {
      section: 'BÀN LÀM VIỆC',
      items: [
        { icon: Layers, label: 'Công việc của tôi', href: '/my-work' },
        { icon: Type, label: 'Chèn chữ & Bóng thoại', href: '/letterer' },
        { icon: BookMarked, label: 'Series Bible', href: '/bible' },
      ],
    },
  ],
  EDITOR: [
    {
      section: 'BÀN LÀM VIỆC',
      items: [
        { icon: Layers, label: 'Công việc của tôi', href: '/my-work' },
        { icon: BookMarked, label: 'Series Bible', href: '/bible' },
      ],
    },
  ],
  READER: [],
  PUBLISHER: [
    {
      section: 'PUBLISHING',
      items: [
        {
          icon: Send,
          label: 'Cổng Duyệt Xuất Bản',
          href: '/publishing',
          badge: { type: 'dot', color: 'bg-indigo-600' },
        },
        { icon: BookOpen, label: 'Public Catalog', href: '/catalog' },
      ],
    },
  ],
};

export function AppShell({
  currentUser,
  activeWorkspace,
  activeSeries = { title: 'PanelForge Studio', subtitle: 'Global Console' },
  aiState = 'active',
  children,
  onNavigate,
  onLogout,
  onLeaveFeedback,
  onOpenTwoFactor,
  onOpenChangePassword,
  onOpenCommandPalette,
  onSelectSeries,
}: GlobalAppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId, seriesId } = useParams();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const chapterId = searchParams.get('chapterId');

  const isReader =
    currentUser.activeRoles?.includes('READER') ||
    currentUser.role === 'READER' ||
    currentUser.workspaceRole === ('READER' as any);

  const effectiveRole = currentUser.workspaceRole
    ? String(currentUser.workspaceRole).toUpperCase()
    : currentUser.activeRoles && currentUser.activeRoles.length > 0
      ? String(currentUser.activeRoles[0]).toUpperCase()
      : 'PRODUCER';

  const isSeriesContext = !!seriesId;
  const effectiveActiveSeries = isSeriesContext
    ? activeSeries
    : { title: activeWorkspace?.name || 'Studio Workspace', subtitle: 'Overview' };

  // Dynamic configuration based on context
  const getNavSections = () => {
    if (
      (currentUser.role === 'ADMINISTRATOR' ||
        currentUser.activeRoles?.includes('ADMINISTRATOR')) &&
      !currentUser.workspaceRole
    ) {
      return ROLE_NAV_CONFIG['ADMINISTRATOR'] || [];
    }

    if (effectiveRole === 'PRODUCER') {
      if (isSeriesContext) {
        return [
          {
            section: 'SERIES MANAGEMENT',
            items: [
              {
                icon: LayoutDashboard,
                label: 'Series Dashboard',
                href: `/workspaces/${workspaceId}/series/${seriesId}/dashboard`,
              },

              {
                icon: Kanban,
                label: 'Production Pipeline',
                href: `/workspaces/${workspaceId}/series/${seriesId}/workspace`,
                badge: { type: 'text', text: 'Active', color: 'bg-[#F97316]/10 text-[#F97316]' },
              },
              {
                icon: Layers,
                label: 'Công việc & Xét duyệt',
                href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
              },
              {
                icon: FileText,
                label: 'Kịch bản (Script)',
                href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
              },
              {
                icon: LayoutTemplate,
                label: 'Bàn vẽ & Khung trang',
                href: `/workspaces/${workspaceId}/series/${seriesId}/artist`,
              },
              {
                icon: Type,
                label: 'Chèn chữ & Bóng thoại',
                href: `/workspaces/${workspaceId}/series/${seriesId}/letterer`,
              },
              {
                icon: BookMarked,
                label: 'Series Bible',
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
                badge: { type: 'dot', color: 'bg-[#8B5CF6]' },
              },
              {
                icon: Send,
                label: 'Cổng Duyệt Xuất Bản',
                href: `/workspaces/${workspaceId}/series/${seriesId}/publishing`,
              },
              {
                icon: Upload,
                label: 'Export / Publish',
                href: `/workspaces/${workspaceId}/series/${seriesId}/export`,
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: 'STUDIO MANAGEMENT',
            items: [
              {
                icon: LayoutDashboard,
                label: 'Studio Workspaces',
                href: `/workspaces/${workspaceId}/series`,
              },
            ],
          },
        ];
      }
    }

    if (effectiveRole === 'PUBLISHER') {
      if (isSeriesContext) {
        return [
          {
            section: 'PUBLISHING',
            items: [
              {
                icon: Send,
                label: 'Cổng Duyệt Xuất Bản',
                href: `/workspaces/${workspaceId}/series/${seriesId}/publishing`,
                badge: { type: 'dot', color: 'bg-indigo-600' },
              },
              {
                icon: BookMarked,
                label: 'Series Bible',
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
              },
              {
                icon: BookOpen,
                label: 'Public Catalog',
                href: '/catalog',
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: 'PUBLISHER DESK',
            items: [
              {
                icon: LayoutDashboard,
                label: 'Danh sách Series',
                href: `/workspaces/${workspaceId}/series`,
              },
              {
                icon: BookOpen,
                label: 'Public Catalog',
                href: '/catalog',
              },
            ],
          },
        ];
      }
    }

    if (
      effectiveRole === 'WRITER' ||
      effectiveRole === 'EDITOR' ||
      effectiveRole === 'ARTIST' ||
      effectiveRole === 'LETTERER'
    ) {
      if (isSeriesContext) {
        return [
          {
            section: 'BÀN LÀM VIỆC',
            items: [
              {
                icon: Layers,
                label: 'Công việc của tôi',
                href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
              },
              {
                icon: FileText,
                label: 'Kịch bản (Script)',
                href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
              },
              // Màn làm việc riêng theo vai trò (route artist/letterer đã có trong routes.tsx)
              ...(effectiveRole === 'ARTIST'
                ? [
                    {
                      icon: LayoutTemplate,
                      label: 'Bàn vẽ & Khung trang',
                      href: `/workspaces/${workspaceId}/series/${seriesId}/artist`,
                    },
                  ]
                : []),
              ...(effectiveRole === 'LETTERER'
                ? [
                    {
                      icon: Type,
                      label: 'Chèn chữ & Bóng thoại',
                      href: `/workspaces/${workspaceId}/series/${seriesId}/letterer`,
                    },
                  ]
                : []),
              {
                icon: BookMarked,
                label: 'Series Bible',
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
              },
            ],
          },
          {
            section: 'TIỆN ÍCH SẢN XUẤT',
            items: [
              {
                icon: Kanban,
                label: 'Bảng Pipeline',
                href: `/workspaces/${workspaceId}/series/${seriesId}/workspace`,
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: 'STUDIO',
            items: [
              {
                icon: LayoutDashboard,
                label: 'Danh sách Series',
                href: `/workspaces/${workspaceId}/series`,
              },
            ],
          },
        ];
      }
    }

    const base = ROLE_NAV_CONFIG[effectiveRole] || ROLE_NAV_CONFIG['PRODUCER'] || [];
    return base;
  };

  const rawSections = getNavSections();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  // Màn Letterer cần tối đa diện tích canvas: menu hệ thống thu thành thanh icon, bấm để mở lớp phủ.
  const [isRailOverlayOpen, setIsRailOverlayOpen] = useState(false);
  const compactRail = !isReader && /\/letterer\/?$/.test(location.pathname);

  const navSections = rawSections.map((sec) => ({
    ...sec,
    items: sec.items.map((item) => ({ ...item })),
  }));

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsMobileDrawerOpen(false);
    setIsRailOverlayOpen(false);
    if (onNavigate) {
      onNavigate(href);
    }
    let target = href;
    if (
      workspaceId &&
      seriesId &&
      !href.startsWith('/workspaces') &&
      !href.startsWith('/workspace') &&
      !href.startsWith('/catalog') &&
      !href.startsWith('/admin') &&
      !href.startsWith('/notifications') &&
      !href.startsWith('/profile')
    ) {
      const cleanHref = href.startsWith('/') ? href.slice(1) : href;
      target = `/workspaces/${workspaceId}/series/${seriesId}/${cleanHref}`;
    }
    navigate(target.startsWith('/') ? target : `/${target}`);
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
          label: 'AI: Sẵn sàng',
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500 animate-pulse',
          label: 'AI: Phản hồi chậm',
        };
      case 'unavailable':
      default:
        return {
          icon: AlertCircle,
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'AI: Ngoại tuyến',
        };
    }
  };

  const aiConfig = getAiBadgeConfig(aiState);

  return (
    <div className='h-screen w-full flex overflow-hidden text-[#171717] bg-[#F8F6F0]'>
      {/* --- MOBILE DRAWER (< md) --- */}
      {!isReader && (
        <SidebarDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          title='Menu điều hướng'
        >
          <AppShellSidebar
            currentUser={currentUser}
            activeWorkspace={activeWorkspace}
            activeSeries={effectiveActiveSeries as any}
            workspaceId={workspaceId}
            seriesId={seriesId}
            isReader={isReader}
            navSections={navSections}
            handleNavClick={handleNavClick}
            renderBadge={renderBadge}
            onOpenTwoFactor={() => {
              setIsMobileDrawerOpen(false);
              onOpenTwoFactor?.();
            }}
            onLogout={() => {
              setIsMobileDrawerOpen(false);
              onLogout?.();
            }}
            onSelectSeries={onSelectSeries}
            isRailExpanded={true}
            isMobileDrawer={true}
          />
        </SidebarDrawer>
      )}

      {/* --- PERMANENT SIDEBAR (>= md); thanh icon ở màn Letterer --- */}
      {compactRail ? (
        <>
          <AppShellRail
            navSections={navSections}
            handleNavClick={handleNavClick}
            onExpand={() => setIsRailOverlayOpen(true)}
          />
          {isRailOverlayOpen && (
            <div
              className='fixed inset-0 z-[1000] hidden md:flex'
              role='dialog'
              aria-label='Menu hệ thống'
              data-testid='app-shell-rail-overlay'
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsRailOverlayOpen(false);
              }}
            >
              <AppShellSidebar
                currentUser={currentUser}
                activeWorkspace={activeWorkspace}
                activeSeries={effectiveActiveSeries as any}
                workspaceId={workspaceId}
                seriesId={seriesId}
                isReader={isReader}
                navSections={navSections}
                handleNavClick={handleNavClick}
                renderBadge={renderBadge}
                onOpenTwoFactor={onOpenTwoFactor}
                onLogout={onLogout}
                onSelectSeries={onSelectSeries}
                isRailExpanded={true}
                isMobileDrawer={false}
              />
              <div
                className='flex-1 bg-black/40'
                onClick={() => setIsRailOverlayOpen(false)}
                data-testid='app-shell-rail-overlay-backdrop'
                aria-hidden='true'
              />
            </div>
          )}
        </>
      ) : (
        <AppShellSidebar
          currentUser={currentUser}
          activeWorkspace={activeWorkspace}
          activeSeries={effectiveActiveSeries as any}
          workspaceId={workspaceId}
          seriesId={seriesId}
          isReader={isReader}
          navSections={navSections}
          handleNavClick={handleNavClick}
          renderBadge={renderBadge}
          onOpenTwoFactor={onOpenTwoFactor}
          onLogout={onLogout}
          onSelectSeries={onSelectSeries}
          isRailExpanded={isRailExpanded}
          onToggleRail={() => setIsRailExpanded((prev) => !prev)}
          isMobileDrawer={false}
        />
      )}

      {/* --- RIGHT WRAPPER --- */}
      <div className='flex-1 flex flex-col min-w-0 h-full bg-[#FFFFFF] relative'>
        <header className='h-16 bg-[#FFFFFF] border-b border-[#E7E7E7] flex items-center justify-between px-4 md:px-6 shrink-0 z-20'>
          <div className='flex items-center gap-2 min-w-0'>
            {!isReader && (
              <button
                type='button'
                onClick={() => setIsMobileDrawerOpen(true)}
                aria-label='Mở menu điều hướng'
                aria-expanded={isMobileDrawerOpen}
                className='md:hidden p-2 -ml-2 mr-1 rounded-lg text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB] transition-colors cursor-pointer shrink-0'
                data-testid='appshell-hamburger-btn'
              >
                <Menu className='w-5 h-5' />
              </button>
            )}
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
                  onClick={() =>
                    navigate(workspaceId ? `/workspaces/${workspaceId}/series` : '/workspaces')
                  }
                  className='hover:text-[#171717] cursor-pointer transition-colors truncate px-1.5 py-1 rounded hover:bg-[#FAF8F5] flex items-center gap-1 font-semibold text-[#171717]'
                  title='Mở danh sách Series của Workspace'
                >
                  <Briefcase className='w-3.5 h-3.5 text-[#8B5CF6]' />
                  <span className='truncate'>{activeWorkspace?.name || 'Studio Workspace'}</span>
                </button>
                {isSeriesContext && (
                  <>
                    <span className='mx-1.5 text-[#B8B8B8] font-normal select-none'>/</span>
                    <button
                      type='button'
                      onClick={() =>
                        navigate(
                          getRoleDefaultPath(
                            currentUser.workspaceRole || currentUser.role,
                            workspaceId,
                            seriesId,
                          ),
                        )
                      }
                      className={`font-semibold truncate flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                        chapterId ? 'text-[#555555] font-normal hover:text-[#171717]' : 'text-[#171717]'
                      }`}
                      title='Chuyển đến Series Workspace'
                    >
                      <BookOpen className='w-3.5 h-3.5 text-[#10B981]' />
                      <span className='truncate'>{activeSeries?.title || 'Active Series'}</span>
                    </button>
                    {chapterId && (
                      <>
                        <span className='mx-1.5 text-[#B8B8B8] font-normal select-none'>/</span>
                        <div
                          className='flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold text-[#171717] truncate bg-[#FAF8F5] rounded border border-[#E7E7E7]'
                          data-testid='header-chapter-breadcrumb'
                          title={`Chương đang mở: ${chapterId}`}
                        >
                          <FileText className='w-3.5 h-3.5 text-[#F97316]' />
                          <span className='truncate'>
                            {chapterId.toLowerCase().startsWith('ch') || !isNaN(Number(chapterId))
                              ? `Chapter ${chapterId.replace(/^chapter-?/i, '')}`
                              : `Chapter (${chapterId.slice(0, 8)})`}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </nav>
            )}
          </div>

          <div className='flex items-center gap-4 shrink-0'>
            {!isReader && (
              <button
                type='button'
                onClick={() => {
                  if (onOpenCommandPalette) {
                    onOpenCommandPalette();
                  } else {
                    window.dispatchEvent(
                      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
                    );
                  }
                }}
                className='relative flex items-center text-left cursor-pointer group'
                title='Tìm kiếm nhanh hoặc mở bảng lệnh (⌘K / Ctrl+K)'
                data-testid='header-command-palette-trigger'
              >
                <Search className='w-3.5 h-3.5 text-[#555555] absolute left-3 pointer-events-none stroke-[2] group-hover:text-[#171717] transition-colors' />
                <div className='pl-8 pr-12 py-1.5 bg-[#FAF8F3] group-hover:bg-[#F3EFE6] text-xs text-[#555555] rounded-md border border-[#E7E7E7] group-hover:border-[#F97316] w-64 transition-all truncate select-none'>
                  Search frames, dialogues, assets...
                </div>
                <span className='absolute right-2 px-1.5 py-0.5 text-[10px] font-mono text-[#555555] bg-[#E7E7E7] rounded select-none group-hover:bg-[#dedede]'>
                  ⌘K
                </span>
              </button>
            )}

            {/* AI Status Badge */}
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${aiConfig.color}`}
              title={aiConfig.label}
            >
              <span className={`w-2 h-2 rounded-full ${aiConfig.dot}`} />
              <span className='font-mono text-[11px] hidden sm:inline'>{aiConfig.label}</span>
            </div>

            {/* Chuông thông báo thật (UC-14): số chưa đọc và danh sách lấy từ Backend */}
            {!isReader && <NotificationBell workspaceId={workspaceId} seriesId={seriesId} />}

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

export const GlobalAppShell = AppShell;
