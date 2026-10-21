import React, { useState, useEffect, Suspense } from 'react';
import { BrandMark } from '@/shared/components/BrandMark';
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
import { NotificationBell } from '@/shared/features/collaboration/NotificationBell';
import { SidebarDrawer } from '@/shared/components/SidebarDrawer';
import { getRoleDefaultPath } from '@/roles/roles';
import { LanguageSwitcher } from '@/lib/i18n';
import { notificationService } from '@/services/notification.service';

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
  onOpenNotifications?: () => void;
  onOpenActivityHistory?: () => void;
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
          label: 'Quy trình sản xuất',
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
  onOpenNotifications,
  onOpenActivityHistory,
  onSelectSeries,
}: GlobalAppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  // Route ngoài workspace (vd /profile) không có :workspaceId → lấy workspace đang chọn; chuỗi "undefined"/"null" coi như không có
  const validId = (v?: string | null) => (v && v !== 'undefined' && v !== 'null' ? v : undefined);
  const workspaceId = validId(params.workspaceId) ?? validId(activeWorkspace?.id);
  const seriesId = validId(params.seriesId);
  const seriesListHref = workspaceId ? `/workspaces/${workspaceId}/series` : '/workspaces';
  const routeHasBadWorkspace = params.workspaceId !== undefined && !validId(params.workspaceId);
  // Mở trực tiếp /workspaces/undefined/... → quay về chọn workspace (giữ query)
  useEffect(() => {
    if (routeHasBadWorkspace)
      navigate({ pathname: '/workspaces', search: location.search }, { replace: true });
  }, [routeHasBadWorkspace, navigate, location.search]);
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
                label: 'Quy trình sản xuất',
                href: `/workspaces/${workspaceId}/series/${seriesId}/workspace`,
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
                href: seriesListHref,
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
                href: seriesListHref,
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
                href: seriesListHref,
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
  // Polling unread notification count for sidebar badge
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await notificationService.getNotifications(true, 1, 1);
        if (isMounted && typeof res?.unreadCount === 'number') {
          setUnreadNotifications(res.unreadCount);
        }
      } catch {
        // silent fallback
      }
    };
    void fetchUnread();
    const interval = window.setInterval(() => {
      if (!document.hidden) void fetchUnread();
    }, 30_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleOpenNotifications = () => {
    setIsMobileDrawerOpen(false);
    if (onOpenNotifications) {
      onOpenNotifications();
    } else {
      navigate('/notifications');
    }
  };

  const handleOpenCommandPalette = () => {
    setIsMobileDrawerOpen(false);
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
    } else {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
    }
  };

  const handleOpenActivityHistory = () => {
    setIsMobileDrawerOpen(false);
    if (onOpenActivityHistory) {
      onOpenActivityHistory();
    } else if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/overview`);
    }
  };

  // Sidebar thu gọn / mở rộng được lưu trạng thái trong localStorage, cố định trên mọi màn hình
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pf.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pf.sidebar.collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navSections = rawSections.map((sec) => ({
    ...sec,
    items: sec.items.map((item) => ({ ...item })),
  }));

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsMobileDrawerOpen(false);
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

  // Set isActive based on location pathname: ưu tiên route khớp chính xác nhất/dài nhất để tránh nhiều mục cùng active ngoài chủ đích
  let bestMatch: any = null;
  let bestMatchLength = 0;

  navSections.forEach((section) => {
    section.items.forEach((item: any) => {
      const isMatch =
        location.pathname === item.href ||
        (item.href !== '/' && location.pathname.startsWith(`${item.href}/`));
      if (isMatch && item.href.length > bestMatchLength) {
        bestMatch = item;
        bestMatchLength = item.href.length;
      }
    });
  });

  navSections.forEach((section) => {
    section.items.forEach((item: any) => {
      item.isActive = item === bestMatch;
    });
  });

  const renderBadge = (badge: any) => {
    if (!badge) return null;
    if (badge.type === 'dot') {
      return <span className={`w-2 h-2 rounded-full ${badge.color} shrink-0`} />;
    }
    if (badge.type === 'text') {
      return (
        <span
          className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold ${badge.color} shrink-0 max-w-[80px] truncate`}
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
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dot: 'bg-emerald-500',
          label: 'AI: Sẵn sàng',
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dot: 'bg-amber-500 animate-pulse',
          label: 'AI: Phản hồi chậm',
        };
      case 'unavailable':
      default:
        return {
          icon: AlertCircle,
          color: 'bg-rose-50 text-rose-800 border-rose-200/80',
          dot: 'bg-rose-500',
          label: 'AI: Ngoại tuyến',
        };
    }
  };

  const aiConfig = getAiBadgeConfig(aiState);

  return (
    <div className='h-screen w-full flex overflow-hidden text-[#1C1917] bg-[#F3F0E9]'>
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
            unreadNotificationCount={unreadNotifications}
            onOpenNotifications={handleOpenNotifications}
            onOpenCommandPalette={handleOpenCommandPalette}
            onOpenActivityHistory={handleOpenActivityHistory}
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

      {/* --- PERMANENT SIDEBAR (>= md) --- */}
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
        unreadNotificationCount={unreadNotifications}
        onOpenNotifications={handleOpenNotifications}
        onOpenCommandPalette={handleOpenCommandPalette}
        onOpenActivityHistory={handleOpenActivityHistory}
        onOpenTwoFactor={onOpenTwoFactor}
        onLogout={onLogout}
        onSelectSeries={onSelectSeries}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileDrawer={false}
      />

      {/* --- RIGHT WRAPPER --- */}
      <div className='flex-1 flex flex-col min-w-0 h-full bg-[#F3F0E9] relative'>
        <header className='h-16 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#D8D2C5] flex items-center justify-between px-4 md:px-6 shrink-0 z-20'>
          <div className='flex items-center gap-2 min-w-0'>
            {!isReader && (
              <button
                type='button'
                onClick={() => setIsMobileDrawerOpen(true)}
                aria-label='Mở menu điều hướng'
                aria-expanded={isMobileDrawerOpen}
                className='md:hidden p-2 -ml-2 mr-1 rounded-full text-[#57534E] hover:text-[#1C1917] hover:bg-[#FFF2E6] transition-colors cursor-pointer shrink-0'
                data-testid='appshell-hamburger-btn'
              >
                <Menu className='w-5 h-5' />
              </button>
            )}
            {isReader ? (
              <div className='flex items-center gap-3'>
                <BrandMark size={28} className='shrink-0' />
                <div>
                  <span className='text-[#1C1917] font-serif font-medium text-sm'>
                    {activeSeries?.title || 'PanelForge Studio'}
                  </span>
                </div>
              </div>
            ) : (
              <nav className='flex items-center text-xs font-semibold text-[#1C1917] truncate'>
                <button
                  type='button'
                  data-testid='back-to-workspaces-breadcrumb'
                  className='text-[#1C1917] hover:text-black cursor-pointer transition-all flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-[#FFF2E6] hover:shadow-2xs'
                  onClick={() => navigate('/workspaces')}
                  title='Quay lại danh sách Workspace (Workspaces Catalog)'
                >
                  <Briefcase className='w-3.5 h-3.5 text-[#57534E]' />
                  <span className='font-bold'>Workspaces</span>
                </button>
                <span className='mx-1.5 text-[#a8a29e] font-bold select-none'>/</span>

                {/* Studio / Series Name Segment */}
                <button
                  type='button'
                  onClick={() => navigate(seriesListHref)}
                  className='text-[#1C1917] hover:text-black cursor-pointer transition-all truncate px-2.5 py-1 rounded-full hover:bg-[#FFF2E6] hover:shadow-2xs flex items-center gap-1 font-bold'
                  title='Mở danh sách Series của Workspace'
                >
                  <Briefcase className='w-3.5 h-3.5 text-[#57534E]' />
                  <span className='truncate'>{activeWorkspace?.name || 'Studio Workspace'}</span>
                </button>
                {isSeriesContext && (
                  <>
                    <span className='mx-1.5 text-[#a8a29e] font-bold select-none'>/</span>
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
                      className={`font-bold truncate flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white hover:shadow-soft-sm transition-all cursor-pointer ${
                        chapterId ? 'text-[#57534e] hover:text-[#0c0a09]' : 'text-[#0c0a09]'
                      }`}
                      title='Chuyển đến Series Workspace'
                    >
                      <BookOpen className='w-3.5 h-3.5 text-[#292524]' />
                      <span className='truncate'>{activeSeries?.title || 'Active Series'}</span>
                    </button>
                    {chapterId && (
                      <>
                        <span className='mx-1.5 text-[#a8a29e] font-bold select-none'>/</span>
                        <div
                          className='flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#0c0a09] truncate bg-white rounded-full border border-[#d6d3d1] shadow-soft-sm'
                          data-testid='header-chapter-breadcrumb'
                          title={`Chương đang mở: ${chapterId}`}
                        >
                          <FileText className='w-3.5 h-3.5 text-[#EA580C]' />
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

          <div className='flex items-center gap-3 shrink-0'>
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
                <Search className='w-3.5 h-3.5 text-[#57534E] absolute left-3.5 pointer-events-none stroke-[2] group-hover:text-[#1C1917] transition-colors' />
                <div className='pl-9 pr-12 py-2 bg-[#FCFBF8] group-hover:bg-[#FCFBF8] text-xs text-[#57534E] rounded-full border border-[#D8D2C5] group-hover:border-[#1C1917] shadow-2xs w-64 transition-all truncate select-none'>
                  Search frames, dialogues, assets...
                </div>
                <span className='absolute right-2 px-2 py-0.5 text-xs font-mono text-[#57534E] bg-[#F3F0E9] rounded-full select-none group-hover:bg-[#EAE5DC]'>
                  ⌘K
                </span>
              </button>
            )}

            {/* AI Status Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shadow-soft-sm ${aiConfig.color}`}
              title={aiConfig.label}
            >
              <span className={`w-2 h-2 rounded-full ${aiConfig.dot}`} />
              <span className='font-mono text-xs hidden sm:inline'>{aiConfig.label}</span>
            </div>

            {/* Chuyển đổi ngôn ngữ VI / EN */}
            <LanguageSwitcher />

            {/* Chuông thông báo thật (UC-14): số chưa đọc và danh sách lấy từ Backend */}
            {!isReader && <NotificationBell workspaceId={workspaceId} seriesId={seriesId} />}

            {/* User Profile Dropdown Menu */}
            <div className='relative'>
              <button
                type='button'
                data-testid='header-user-menu-btn'
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className='flex items-center gap-2.5 p-1 rounded-full hover:bg-[#FFF2E6] transition-all cursor-pointer'
              >
                <div className='w-8 h-8 rounded-full bg-[#1C1917] text-white flex items-center justify-center font-bold text-xs shadow-2xs'>
                  {currentUser.avatarInitials}
                </div>
                <div className='hidden md:flex flex-col text-left'>
                  <span className='text-xs font-semibold text-[#1C1917] leading-tight'>
                    {currentUser.name}
                  </span>
                  <span className='text-[10px] text-[#57534E] font-mono leading-tight'>
                    {currentUser.role}
                  </span>
                </div>
                <ChevronDown className='w-3 h-3 text-[#57534E]' />
              </button>

              {userMenuOpen && (
                <>
                  <div className='fixed inset-0 z-40' onClick={() => setUserMenuOpen(false)} />
                  <div className='absolute right-0 mt-2 w-56 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-editorial z-50 p-1.5 text-xs animate-in fade-in-50 zoom-in-95'>
                    <div className='px-3 py-2 border-b border-[#D8D2C5] mb-1'>
                      <p className='font-semibold text-[#1C1917]'>{currentUser.name}</p>
                      <p className='text-[10px] text-[#57534E] font-mono'>{currentUser.role}</p>
                    </div>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/profile');
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#1C1917] hover:bg-[#FFF2E6] px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <UserCircle className='w-3.5 h-3.5 text-[#57534E]' />
                      <span>Hồ sơ cá nhân</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePassword?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#1C1917] hover:bg-[#FFF2E6] px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <KeyRound className='w-3.5 h-3.5 text-[#57534E]' />
                      <span>Đổi mật khẩu</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenTwoFactor?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-[#1C1917] hover:bg-[#FFF2E6] px-3 py-2 rounded-lg transition-colors cursor-pointer'
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
                      className='w-full text-left flex items-center gap-2 text-xs text-[#57534E] hover:text-[#1C1917] hover:bg-[#FFF2E6] px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <Briefcase className='w-3.5 h-3.5 text-[#F97316]' />
                      <span>Đổi Workspace (Workspaces)</span>
                    </button>

                    <div className='my-1 border-t border-[#D8D2C5]' />

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
                className='bg-[#EA580C] hover:bg-[#C2410C] text-white px-4 py-1.5 rounded-full text-xs font-medium active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-soft-sm'
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

        <main className='flex-1 overflow-y-auto custom-scrollbar flex flex-col relative min-h-0 bg-[#F3F0E9]'>
          <div className='relative z-10 w-full min-h-full flex-1 flex flex-col'>
            <Suspense fallback={null}>{children || <Outlet />}</Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export const GlobalAppShell = AppShell;
