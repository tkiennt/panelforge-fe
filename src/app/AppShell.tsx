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
  Palette,
  CreditCard,
  Download,
  Plus,
  FileCheck,
} from 'lucide-react';
import { AppShellSidebar } from './AppShellSidebar';
import { SIDEBAR_ID } from './sidebarTheme';
import { useSidebarTheme } from './useSidebarTheme';
import { NotificationBell } from '@/shared/features/collaboration/NotificationBell';
import { SidebarDrawer } from '@/shared/components/SidebarDrawer';
import { getRoleDefaultPath } from '@/roles/roles';
import { LanguageSwitcher, useTranslation } from '@/lib/i18n';
import { notificationService } from '@/services/notification.service';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { RouteFallback } from '@/shared/components/RouteFallback';
import { StudioSwitcher } from '@/shared/components/StudioSwitcher';
import {
  buildChapterManagementUrl,
  buildChapterReaderUrl,
  buildEditorDeskUrl,
  buildProductionWorkspaceUrl,
  buildScriptReviewUrl,
  buildSeriesExportUrl,
  buildSeriesPath,
} from './routePaths';

export interface CurrentUser {
  name: string;
  role: SystemRole | string;
  workspaceRole?: WorkspaceRole | null;
  activeRoles?: string[];
  avatarInitials: string;
  avatarUrl?: string | null;
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

const getRoleNavConfig = (
  t: (k: string, fallback?: string) => string,
): Record<string, { section: string; items: any[] }[]> => ({
  ADMINISTRATOR: [
    {
      section: t('navigation.sections.systemAdmin'),
      items: [
        { icon: LayoutDashboard, label: t('navigation.menu.systemDashboard'), href: '/admin' },
        { icon: Users, label: t('navigation.menu.usersAndRoles'), href: '/admin?tab=users' },
        {
          icon: Cpu,
          label: t('navigation.menu.aiQuota'),
          href: '/admin?tab=ai-config',
          badge: { type: 'dot', color: 'bg-emerald-500' },
        },
        { icon: List, label: t('navigation.menu.auditLog'), href: '/admin?tab=audit' },
      ],
    },
  ],
  PRODUCER: [
    {
      section: t('navigation.sections.workspace'),
      items: [
        { icon: LayoutDashboard, label: t('navigation.menu.dashboard'), href: '/dashboard' },
        { icon: Briefcase, label: t('navigation.menu.studioWorkspaces'), href: '/producer' },
        {
          icon: Kanban,
          label: t('navigation.menu.production'),
          href: '/workspace',
          badge: { type: 'text', text: 'Ch. 5', color: 'bg-[#F97316]/10 text-[#F97316]' },
        },
        {
          icon: BookMarked,
          label: t('navigation.menu.bible'),
          href: '/bible',
          badge: { type: 'dot', color: 'bg-[#8B5CF6]' },
        },
        { icon: Calendar, label: t('navigation.menu.releaseCalendar'), href: '/calendar' },
        { icon: History, label: t('navigation.menu.provenance'), href: '/provenance' },
        {
          icon: Eye,
          label: t('navigation.menu.readerStats'),
          href: '/reader-stats',
        },
      ],
    },
    {
      section: t('navigation.sections.publishing'),
      items: [
        { icon: FileText, label: 'B5 Pre-Press Specs', href: '/specs' },
        { icon: ShieldCheck, label: 'SHA-256 Provenance', href: '/sha' },
        { icon: Send, label: t('navigation.menu.publishingGate'), href: '/publishing' },
        { icon: Download, label: t('navigation.menu.exportHandoff'), href: '/export' },
      ],
    },
  ],
  WRITER: [
    {
      section: t('navigation.sections.desk'),
      items: [
        { icon: Layers, label: t('navigation.menu.myWork'), href: '/my-work' },
        { icon: FileText, label: t('navigation.menu.script'), href: '/script' },
        { icon: BookMarked, label: t('navigation.menu.bible'), href: '/bible' },
      ],
    },
  ],
  ARTIST: [
    {
      section: t('navigation.sections.desk'),
      items: [
        { icon: Layers, label: t('navigation.menu.myWork'), href: '/my-work' },
        { icon: LayoutTemplate, label: t('navigation.menu.desk'), href: '/artist' },
        { icon: BookMarked, label: t('navigation.menu.bible'), href: '/bible' },
      ],
    },
  ],
  LETTERER: [
    {
      section: t('navigation.sections.desk'),
      items: [
        { icon: Layers, label: t('navigation.menu.myWork'), href: '/my-work' },
        { icon: Type, label: t('navigation.menu.lettering'), href: '/letterer' },
        { icon: BookMarked, label: t('navigation.menu.bible'), href: '/bible' },
      ],
    },
  ],
  EDITOR: [
    {
      section: t('navigation.sections.desk'),
      items: [
        { icon: ShieldCheck, label: t('navigation.menu.reviewDesk'), href: '/editor/desk' },
        { icon: FileText, label: t('navigation.menu.script'), href: '/script' },
        { icon: Layers, label: t('navigation.menu.workAndReview'), href: '/my-work' },
        { icon: BookMarked, label: t('navigation.menu.bible'), href: '/bible' },
      ],
    },
    {
      section: t('navigation.sections.productionUtilities'),
      items: [
        { icon: LayoutDashboard, label: t('navigation.menu.seriesDashboard'), href: '/dashboard' },
        { icon: Kanban, label: t('navigation.menu.production'), href: '/workspace' },
      ],
    },
  ],
  READER: [],
  PUBLISHER: [
    {
      section: t('navigation.sections.publishing'),
      items: [
        {
          icon: Send,
          label: t('navigation.menu.publishingGate'),
          href: '/publishing',
          badge: { type: 'dot', color: 'bg-indigo-600' },
        },
        { icon: BookOpen, label: t('navigation.menu.publicCatalog'), href: '/catalog' },
      ],
    },
  ],
});

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
  const { t } = useTranslation();
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
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const searchParams = new URLSearchParams(location.search);
  const chapterId = params.chapterId || searchParams.get('chapterId');
  const chapterQuery = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : '';
  const rawChapterNumber = chapterId?.replace(/^chapter-?/i, '').replace(/^chap-?/i, '') ?? '';
  const chapterNumberLabel = /^\d+$/.test(rawChapterNumber) ? rawChapterNumber : null;

  const isReader =
    currentUser.activeRoles?.includes('READER') ||
    currentUser.role === 'READER' ||
    currentUser.workspaceRole === ('READER' as any);

  const isPublisher =
    currentUser.role === 'PUBLISHER' || location.pathname.startsWith('/publisher');

  const effectiveRole = currentUser.workspaceRole
    ? String(currentUser.workspaceRole).toUpperCase()
    : currentUser.activeRoles && currentUser.activeRoles.length > 0
      ? String(currentUser.activeRoles[0]).toUpperCase()
      : 'PRODUCER';

  const isSeriesContext = !!seriesId;
  // Studio level (Context 1) is a top-bar-only layout: the series sidebar belongs to Context 2.
  const isStudioHome =
    !!workspaceId &&
    !isSeriesContext &&
    /^\/workspaces\/[^/]+(\/(overview|series))?\/?$/.test(location.pathname);
  const canManageStudio =
    effectiveRole === 'PRODUCER' ||
    effectiveRole === 'ADMINISTRATOR' ||
    currentUser.role === 'ADMINISTRATOR';
  const studioTab = searchParams.get('tab') ?? 'series';
  const setStudioQuery = (key: 'tab' | 'action', value: string | null) => {
    const next = new URLSearchParams(location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    const search = next.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' });
  };
  const effectiveActiveSeries = isSeriesContext
    ? activeSeries
    : { title: activeWorkspace?.name || 'Studio Workspace', subtitle: 'Overview' };

  // Dynamic configuration based on context
  const getNavSections = () => {
    const roleNavConfig = getRoleNavConfig(t);
    if (
      (currentUser.role === 'ADMINISTRATOR' ||
        currentUser.activeRoles?.includes('ADMINISTRATOR')) &&
      !currentUser.workspaceRole
    ) {
      return roleNavConfig['ADMINISTRATOR'] || [];
    }

    // Publisher (vai trò hệ thống) không có vai trò Workspace: effectiveRole mặc định là PRODUCER,
    // nên phải xét trước nhánh Producer để không hiện menu Studio.
    if (isPublisher || effectiveRole === 'PUBLISHER') {
      return [
        {
          section: t('navigation.sections.publisherDesk'),
          items: [
            {
              icon: BookMarked,
              label: t('navigation.menu.publisherManagement'),
              href: '/publisher/series',
              badge: { type: 'dot', color: 'bg-orange-500' },
            },
            {
              icon: BookOpen,
              label: t('navigation.menu.publicCatalog'),
              href: '/publisher/catalog',
            },
            {
              icon: CreditCard,
              label: t('navigation.menu.revenue'),
              href: '/publisher/revenue',
            },
          ],
        },
      ];
    }

    if (effectiveRole === 'PRODUCER') {
      if (isSeriesContext) {
        const workspacePath = buildSeriesPath(workspaceId!, seriesId!, 'workspace');
        const isWorkspacePath = location.pathname === workspacePath;
        const productionTab = searchParams.get('tab') ?? 'progress';
        return [
          {
            section: t('navigation.sidebar.chapterProduction', 'SẢN XUẤT CHƯƠNG'),
            items: [
              {
                icon: Kanban,
                label: t('navigation.menu.pageMatrix', 'Ma trận trang'),
                href: buildProductionWorkspaceUrl(workspaceId!, seriesId!, {
                  chapterId: chapterId ?? undefined,
                  tab: 'progress',
                }),
                isActive: isWorkspacePath && productionTab === 'progress',
                badge: chapterNumberLabel
                  ? {
                      type: 'text',
                      text: `Ch. ${chapterNumberLabel}`,
                      color: 'bg-orange-50 text-orange-600',
                    }
                  : undefined,
              },
              {
                icon: LayoutDashboard,
                label: t('navigation.menu.chapterOverview', 'Tổng quan chương'),
                href: buildChapterManagementUrl(workspaceId!, seriesId!, chapterId ?? undefined),
                isActive:
                  location.pathname === buildSeriesPath(workspaceId!, seriesId!, 'chapters'),
              },
              {
                icon: Users,
                label: t('navigation.menu.crewManagement', 'Quản lý Ê-kíp'),
                href: buildProductionWorkspaceUrl(workspaceId!, seriesId!, {
                  chapterId: chapterId ?? undefined,
                  tab: 'crew',
                }),
                isActive: isWorkspacePath && productionTab === 'crew',
              },
              {
                icon: FileCheck,
                label: t('navigation.menu.productionScript', 'Kịch bản'),
                href: chapterId
                  ? buildScriptReviewUrl(workspaceId!, seriesId!, chapterId)
                  : buildChapterManagementUrl(workspaceId!, seriesId!),
                isActive: location.pathname.includes('/script'),
              },
              {
                icon: BookOpen,
                label: t('navigation.menu.readerAndReview', 'Đọc thử & Soát trang'),
                href: chapterId
                  ? buildChapterReaderUrl(workspaceId!, seriesId!, chapterId)
                  : buildProductionWorkspaceUrl(workspaceId!, seriesId!, { tab: 'progress' }),
                isActive: location.pathname.endsWith('/reader'),
              },
              {
                icon: Download,
                label: t('navigation.menu.handoff', 'Bàn giao'),
                href: buildSeriesExportUrl(workspaceId!, seriesId!, chapterId ?? undefined),
                isActive: location.pathname === buildSeriesPath(workspaceId!, seriesId!, 'export'),
              },
            ],
          },
          {
            section: t('navigation.sections.qualityReview', 'KIỂM DUYỆT'),
            items: [
              {
                icon: ShieldCheck,
                label: t('navigation.menu.editorReviewDesk', 'Kiểm tra & Hiệu đính'),
                href: buildEditorDeskUrl(workspaceId!, seriesId!, {
                  chapterId: chapterId ?? undefined,
                }),
              },
            ],
          },
          {
            section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
            items: [
              {
                icon: BookMarked,
                label: t('navigation.menu.library', 'Thư viện'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
              },
              {
                icon: Eye,
                label: t('navigation.menu.revenueAndReads', 'Doanh thu & Lượt đọc'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/revenue`,
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: t('navigation.sections.studioManagement'),
            items: [
              {
                icon: LayoutDashboard,
                label: t('navigation.menu.studioWorkspaces'),
                href: seriesListHref,
              },
              {
                icon: Eye,
                label: t('navigation.menu.readerStats'),
                href: `/workspaces/${workspaceId}/reader-stats`,
              },
            ],
          },
        ];
      }
    }

    if (effectiveRole === 'EDITOR') {
      if (isSeriesContext) {
        return [
          {
            section: t('navigation.sidebar.seriesOverview', 'TỔNG QUAN'),
            items: [
              {
                icon: Layers,
                label: t('navigation.menu.myWork', 'Việc của tôi'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
              },
            ],
          },
          {
            section: t('navigation.sidebar.chapterProduction', 'SẢN XUẤT CHƯƠNG'),
            items: [
              {
                icon: ShieldCheck,
                label: t('navigation.menu.editorReviewDesk', 'Kiểm tra & Hiệu đính'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/editor/desk`,
              },
              {
                icon: FileText,
                label: t('navigation.menu.script', 'Kịch bản'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
              },
            ],
          },
          {
            section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
            items: [
              {
                icon: BookMarked,
                label: t('navigation.menu.bible', 'Series Bible'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
                badge: { type: 'text', text: 'VAULT', color: 'bg-stone-100 text-stone-600' },
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: t('navigation.sections.desk'),
            items: [
              {
                icon: LayoutDashboard,
                label: t('navigation.menu.studioWorkspaces'),
                href: seriesListHref,
              },
            ],
          },
        ];
      }
    }

    if (effectiveRole === 'WRITER') {
      if (isSeriesContext) {
        return [
          {
            section: t('navigation.sidebar.seriesOverview', 'TỔNG QUAN'),
            items: [
              {
                icon: Layers,
                label: t('navigation.menu.myWork', 'Việc của tôi'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
              },
            ],
          },
          {
            section: t('navigation.sidebar.chapterWriting', 'SÁNG TÁC CHƯƠNG'),
            items: [
              {
                icon: FileText,
                label: t('navigation.menu.chapterScript', 'Kịch bản Chương'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
              },
            ],
          },
          {
            section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
            items: [
              {
                icon: BookMarked,
                label: t('navigation.menu.bible', 'Series Bible'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
                badge: { type: 'text', text: 'VAULT', color: 'bg-stone-100 text-stone-600' },
              },
              {
                icon: Users,
                label: t('navigation.menu.characterProfilesAndLore', 'Hồ sơ Nhân vật & Lore'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible?tab=entities`,
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: t('navigation.sections.desk'),
            items: [
              {
                icon: LayoutDashboard,
                label: t('navigation.menu.studioWorkspaces'),
                href: seriesListHref,
              },
            ],
          },
        ];
      }
    }

    if (effectiveRole === 'ARTIST') {
      if (isSeriesContext) {
        return [
          {
            section: t('navigation.sidebar.seriesOverview', 'TỔNG QUAN'),
            items: [
              {
                icon: Layers,
                label: t('navigation.menu.myWork', 'Việc của tôi'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
              },
            ],
          },
          {
            section: t('navigation.sidebar.chapterProduction', 'SẢN XUẤT CHƯƠNG'),
            items: [
              {
                icon: LayoutTemplate,
                label: t('navigation.menu.panelCanvasDesk', 'Bàn vẽ Khung tranh'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/artist`,
              },
              {
                icon: FileText,
                label: t('navigation.menu.scriptReadOnly', 'Kịch bản (chỉ đọc)'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
              },
            ],
          },
          {
            section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
            items: [
              {
                icon: BookMarked,
                label: t('navigation.menu.bible', 'Series Bible'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: t('navigation.sections.desk'),
            items: [
              {
                icon: LayoutDashboard,
                label: t('navigation.menu.studioWorkspaces'),
                href: seriesListHref,
              },
            ],
          },
        ];
      }
    }

    if (effectiveRole === 'LETTERER') {
      if (isSeriesContext) {
        return [
          {
            section: t('navigation.sidebar.seriesOverview', 'TỔNG QUAN'),
            items: [
              {
                icon: Layers,
                label: t('navigation.menu.myWork', 'Việc của tôi'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
              },
            ],
          },
          {
            section: t('navigation.sidebar.chapterProduction', 'SẢN XUẤT CHƯƠNG'),
            items: [
              {
                icon: Type,
                label: t('navigation.menu.letteringAndBalloons', 'Chèn chữ & Bóng thoại'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/letterer`,
              },
              {
                icon: FileText,
                label: t('navigation.menu.scriptReadOnly', 'Kịch bản (chỉ đọc)'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
              },
            ],
          },
          {
            section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
            items: [
              {
                icon: BookMarked,
                label: t('navigation.menu.bible', 'Series Bible'),
                href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
              },
            ],
          },
        ];
      } else {
        return [
          {
            section: t('navigation.sections.desk'),
            items: [
              {
                icon: LayoutDashboard,
                label: t('navigation.menu.studioWorkspaces'),
                href: seriesListHref,
              },
            ],
          },
        ];
      }
    }

    const base = roleNavConfig[effectiveRole] || roleNavConfig['PRODUCER'] || [];
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (onOpenCommandPalette) {
          onOpenCommandPalette();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

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

  const [sidebarTheme, handleChangeSidebarTheme] = useSidebarTheme();

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
      !href.startsWith('/publisher') &&
      !href.startsWith('/notifications') &&
      !href.startsWith('/profile')
    ) {
      const cleanHref = href.startsWith('/') ? href.slice(1) : href;
      target = `/workspaces/${workspaceId}/series/${seriesId}/${cleanHref}`;
    }
    const finalTarget = target.startsWith('/') ? target : `/${target}`;
    if (
      typeof document !== 'undefined' &&
      typeof (document as any).startViewTransition === 'function'
    ) {
      (document as any).startViewTransition(() => {
        navigate(finalTarget);
      });
    } else {
      navigate(finalTarget);
    }
  };

  // Set isActive based on location pathname & tab query: phân biệt rõ tab=crew và trang chính không có tab
  let bestMatch: any = null;
  let bestScore = -1;
  const currentTab = searchParams.get('tab');

  navSections.forEach((section) => {
    section.items.forEach((item: any) => {
      const [itemPath, itemQuery] = String(item.href).split('?');
      const itemSearchParams = new URLSearchParams(itemQuery || '');
      const itemTab = itemSearchParams.get('tab');

      // Kiểm tra khớp pathname
      const isPathMatch =
        location.pathname === itemPath ||
        (itemPath !== '/' && location.pathname.startsWith(`${itemPath}/`));

      if (!isPathMatch) return;

      // Kiểm tra khớp tab: nếu item có tab thì tab hiện tại phải khớp; nếu URL có tab=crew thì item không được là item không tab
      if (itemTab && itemTab !== currentTab) return;
      if (!itemTab && currentTab === 'crew') return;

      // Điểm ưu tiên: khớp tab cụ thể > khớp path dài hơn
      const score = itemPath.length + (itemTab === currentTab && itemTab ? 1000 : 0);
      if (score > bestScore) {
        bestMatch = item;
        bestScore = score;
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
    if (typeof badge === 'number' || typeof badge === 'string') {
      return (
        <span className='px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-xs shrink-0'>
          {badge}
        </span>
      );
    }
    if (badge.type === 'count') {
      return (
        <span className='px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-xs shrink-0'>
          {badge.count}
        </span>
      );
    }
    if (badge.type === 'dot') {
      return (
        <span className={`w-1.5 h-1.5 rounded-full ${badge.color || 'bg-orange-600'} shrink-0`} />
      );
    }
    if (badge.type === 'text') {
      return (
        <span
          className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${badge.color || 'bg-stone-100 text-stone-600'} shrink-0 max-w-[80px] truncate`}
        >
          {badge.text}
        </span>
      );
    }
    return null;
  };

  const isArtistDesk =
    location.pathname.endsWith('/artist') || location.pathname.endsWith('/artist/');
  const isScriptDesk =
    location.pathname.endsWith('/script') || location.pathname.endsWith('/script/');
  const isLettererDesk =
    location.pathname.endsWith('/letterer') || location.pathname.endsWith('/letterer/');

  return (
    <div className='h-screen w-full flex overflow-hidden text-stone-900 bg-[#FAF9F5]'>
      {/* --- MOBILE DRAWER (< md) --- */}
      {!isReader && !isStudioHome && (
        <SidebarDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          title={t('navigation.header.menuTitle', 'Menu điều hướng')}
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
            theme={sidebarTheme}
            onChangeTheme={handleChangeSidebarTheme}
          />
        </SidebarDrawer>
      )}

      {/* --- PERMANENT SIDEBAR (>= md) --- */}
      {!isReader && !isStudioHome && (
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
          onLogout={onLogout}
          onSelectSeries={onSelectSeries}
          isCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          isMobileDrawer={false}
          theme={sidebarTheme}
          onChangeTheme={handleChangeSidebarTheme}
        />
      )}

      {/* --- RIGHT WRAPPER --- */}
      <div className='flex-1 flex flex-col min-w-0 h-full bg-[#FAF9F5] relative overflow-hidden'>
        <header className='h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 shadow-xs'>
          <div className={`flex items-center gap-2 ${isStudioHome ? 'shrink-0' : 'min-w-0'}`}>
            {isStudioHome && (
              <div className='flex items-center shrink-0'>
                <button
                  type='button'
                  onClick={() => navigate('/workspaces')}
                  className='flex items-center gap-1.5 cursor-pointer'
                >
                  <span className='text-lg font-bold text-orange-600 tracking-tight'>
                    {t('workspace.studioHub.brand')}
                  </span>
                  <span className='text-xs font-bold tracking-wider uppercase bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded'>
                    {t('workspace.studioHub.studioBadge')}
                  </span>
                </button>
                <div className='h-5 w-px bg-stone-200 mx-3' aria-hidden />
              </div>
            )}
            {!isReader && !isStudioHome && (
              <button
                type='button'
                onClick={() => setIsMobileDrawerOpen(true)}
                aria-label={t('navigation.header.openMenu', 'Mở menu điều hướng')}
                aria-expanded={isMobileDrawerOpen}
                className='md:hidden p-2 -ml-2 mr-1 rounded-full text-stone-500 hover:text-stone-900 hover:bg-orange-50 transition-colors cursor-pointer shrink-0'
                data-testid='appshell-hamburger-btn'
              >
                <Menu className='w-5 h-5' />
              </button>
            )}
            {isPublisher ? (
              <div className='flex items-center gap-3'>
                <BrandMark size={28} className='shrink-0' />
                <div className='flex items-center gap-2'>
                  <span className='text-stone-900 font-serif font-bold text-sm'>
                    {t('navigation.header.publisherPortal')}
                  </span>
                  <span className='px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-xs font-mono font-bold'>
                    PUBLISHER PORTAL
                  </span>
                </div>
              </div>
            ) : isReader ? (
              <div className='flex items-center gap-3'>
                <BrandMark size={28} className='shrink-0' />
                <div>
                  <span className='text-stone-900 font-serif font-medium text-sm'>
                    {activeSeries?.title || 'PanelForge Studio'}
                  </span>
                </div>
              </div>
            ) : (
              <nav className='flex items-center text-xs font-semibold text-stone-900 truncate'>
                <button
                  type='button'
                  data-testid='back-to-workspaces-breadcrumb'
                  className='text-stone-700 hover:text-stone-900 cursor-pointer transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 shrink-0'
                  onClick={() => navigate('/workspaces')}
                  title={t(
                    'navigation.header.backToWorkspaces',
                    'Quay lại danh sách Workspace (Workspaces Catalog)',
                  )}
                >
                  <Briefcase className='w-4 h-4 text-stone-500' />
                  <span className='font-semibold'>Workspaces</span>
                </button>
                <span className='mx-1.5 text-stone-300 font-bold select-none shrink-0'>/</span>

                {/* Studio Switcher Dropdown (2-tier Navigation) */}
                <StudioSwitcher
                  activeWorkspaceId={activeWorkspace?.id || workspaceId}
                  activeWorkspaceName={activeWorkspace?.name}
                  onSelectStudio={(ws) => {
                    navigate(`/workspaces/${ws.id}`);
                  }}
                  onCreateNewStudio={() => navigate('/workspaces?create=true')}
                />
                {isSeriesContext && (
                  <>
                    <span className='mx-1.5 text-stone-300 font-bold select-none shrink-0'>/</span>
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
                      className={`font-semibold truncate flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer shrink-0 ${
                        chapterId ? 'text-stone-600 hover:text-stone-900' : 'text-stone-900'
                      }`}
                      title={t('navigation.header.goToSeries', 'Chuyển đến Series Workspace')}
                    >
                      <BookOpen className='w-4 h-4 text-orange-600' />
                      <span className='truncate'>{activeSeries?.title || 'Active Series'}</span>
                    </button>
                    {chapterNumberLabel && (
                      <>
                        <span className='mx-1.5 text-stone-300 font-bold select-none shrink-0'>
                          /
                        </span>
                        <div
                          className='flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-orange-700 truncate bg-orange-50 rounded border border-orange-200/80 shrink-0 cursor-pointer'
                          data-testid='header-chapter-breadcrumb'
                          title={`${t('navigation.header.currentChapter', 'Chương đang mở')}: ${chapterId}`}
                        >
                          <FileText className='w-3.5 h-3.5 text-orange-600' />
                          <span className='truncate'>{`Chapter ${chapterNumberLabel}`}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </nav>
            )}
          </div>

          {isStudioHome && canManageStudio && (
            <nav
              className='hidden lg:flex items-center gap-6 h-full text-sm font-medium'
              aria-label={t('workspace.studioHub.tabsLabel')}
              data-testid='studio-hub-tabs'
            >
              {(
                [
                  ['series', t('workspace.studioHub.tabs.series')],
                  ['members', t('workspace.studioHub.tabs.crew')],
                  ['schedule', t('workspace.studioHub.tabs.schedule')],
                  ['audit', t('workspace.studioHub.tabs.audit')],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type='button'
                  aria-current={studioTab === tab ? 'page' : undefined}
                  onClick={() => setStudioQuery('tab', tab === 'series' ? null : tab)}
                  className={`h-16 flex items-center border-b-2 px-1 whitespace-nowrap transition-colors cursor-pointer ${
                    studioTab === tab
                      ? 'border-orange-600 text-orange-600 font-semibold'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}

          <div className='flex items-center gap-3 shrink-0'>
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
                className='flex items-center gap-2 pl-3 border-l border-stone-200 p-1 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer'
              >
                <div className='w-8 h-8 rounded-full overflow-hidden bg-stone-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs'>
                  {currentUser.avatarUrl && currentUser.avatarUrl !== failedAvatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className='w-full h-full object-cover'
                      onError={() => setFailedAvatarUrl(currentUser.avatarUrl ?? null)}
                    />
                  ) : (
                    currentUser.avatarInitials
                  )}
                </div>
                <div className='hidden md:flex flex-col text-left'>
                  <span className='text-xs font-semibold text-stone-900 leading-tight'>
                    {currentUser.name}
                  </span>
                  <span className='text-xs text-stone-500 font-mono leading-tight'>
                    {currentUser.role}
                  </span>
                </div>
                <ChevronDown className='w-3.5 h-3.5 text-stone-400' />
              </button>

              {userMenuOpen && (
                <>
                  <div className='fixed inset-0 z-40' onClick={() => setUserMenuOpen(false)} />
                  <div className='absolute right-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-1.5 text-xs animate-in fade-in-50 zoom-in-95'>
                    <div className='px-3 py-2 border-b border-stone-100 mb-1'>
                      <p className='font-semibold text-stone-900'>{currentUser.name}</p>
                      <p className='text-xs text-stone-500 font-mono'>{currentUser.role}</p>
                    </div>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/profile');
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-stone-700 hover:text-stone-900 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <UserCircle className='w-3.5 h-3.5 text-stone-500' />
                      <span>{t('navigation.menu.profile')}</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePassword?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-stone-700 hover:text-stone-900 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <KeyRound className='w-3.5 h-3.5 text-stone-500' />
                      <span>{t('navigation.menu.changePassword')}</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenTwoFactor?.();
                      }}
                      className='w-full text-left flex items-center gap-2 text-xs text-stone-700 hover:text-stone-900 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                    >
                      <Shield className='w-3.5 h-3.5 text-orange-600' />
                      <span>{t('navigation.menu.twoFactor')}</span>
                    </button>

                    {isPublisher ? (
                      <button
                        type='button'
                        data-testid='user-menu-publisher-desk'
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/publisher/desk');
                        }}
                        className='w-full text-left flex items-center gap-2 text-xs text-stone-700 hover:text-stone-900 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                      >
                        <Send className='w-3.5 h-3.5 text-orange-600' />
                        <span>{t('navigation.menu.publisherDesk')}</span>
                      </button>
                    ) : (
                      <button
                        type='button'
                        data-testid='user-menu-switch-workspace'
                        onClick={() => {
                          setUserMenuOpen(false);
                          if (onNavigate) onNavigate('/workspaces');
                          navigate('/workspaces');
                        }}
                        className='w-full text-left flex items-center gap-2 text-xs text-stone-700 hover:text-stone-900 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors cursor-pointer'
                      >
                        <Briefcase className='w-3.5 h-3.5 text-orange-600' />
                        <span>{t('navigation.menu.switchWorkspace')}</span>
                      </button>
                    )}

                    <div className='my-1 border-t border-stone-100' />

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
                      <span>{t('navigation.menu.logout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {isStudioHome && canManageStudio && (
              <button
                type='button'
                onClick={() => setStudioQuery('action', 'create-series')}
                className='bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap'
                data-testid='studio-hub-create-series'
              >
                <Plus className='w-4 h-4' />
                <span>{t('workspace.studioHub.createSeries')}</span>
              </button>
            )}

            {isReader && (
              <button
                onClick={onLeaveFeedback}
                className='bg-stone-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-black transition-all shadow-sm'
              >
                Leave Feedback
              </button>
            )}
          </div>
        </header>

        <main className='flex-1 overflow-y-auto custom-scrollbar flex flex-col relative min-h-0 bg-[#FAF9F5]'>
          <div className='relative z-10 w-full min-h-full flex-1 flex flex-col transition-opacity duration-200 animate-in fade-in'>
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>{children || <Outlet />}</Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

export const GlobalAppShell = AppShell;
