import React, { useState, useEffect, useRef } from 'react';
import {
  ViewMode,
  MangaProject,
  KanbanCard,
  KanbanStageKey,
  BibleEntity,
  StudioMember,
  SystemRole,
  WorkspaceRole,
  WorkspaceDto,
  normalizeSystemRole,
  normalizeWorkspaceRole,
  getRoleFromToken,
  ProvenanceLogItem,
  AssistantRosterItem,
} from './types';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { GlobalModals } from './app/GlobalModals';
import { AppRoutes } from './app/routes';
import { ROLE_MANIFEST } from './roles/roles';
import { ToastItemData, ToastOptions, ToastType } from '@/shared/components/ToastNotification';
import { useToast, ToastProvider } from '@/shared/context/ToastContext';
import { ConfirmProvider } from '@/shared/context/ConfirmContext';
import { authService } from './services/auth.service';
import { userService } from './services/user.service';
import { refreshAccessToken } from './api/axiosClient';
import { startSessionKeepAlive } from './api/sessionKeepAlive';
import { seriesService } from './services/series.service';
import { workspaceService } from './services/workspace.service';
import { offlineQueueService } from './services/offlineQueue.service';
import { LoginModal } from '@/roles/guest/modals/LoginModal';
import { RegisterModal } from '@/roles/guest/modals/RegisterModal';
import { TwoFactorSetupModal } from '@/shared/features/account/TwoFactorSetupModal';
import { ChangePasswordModal } from '@/shared/features/account/ChangePasswordModal';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { auth, onAuthStateChanged } from '@/config/firebase';
import { User } from 'firebase/auth';

export type Toast = ToastItemData;
export type { ToastOptions, ToastType };

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

function AppContent() {
  const navigate = useNavigate();
  // ---> STATE QUẢN LÝ ĐĂNG NHẬP VÀ ĐIỀU HƯỚNG BÊN NGOÀI <---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('user') || !!localStorage.getItem('token');
  });
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Giữ phiên khi người dùng còn thao tác (không áp dụng cho token demo 'mock-...').
  useEffect(() => {
    if (!isAuthenticated || localStorage.getItem('token')?.startsWith('mock-')) return;
    return startSessionKeepAlive();
  }, [isAuthenticated]);

  // Navigation & Data State
  const [viewScope, setViewScope] = useState<'hub' | 'project'>('hub');
  const [currentView, setCurrentView] = useState<ViewMode | string>('workspaces');
  const [currentRole, setCurrentRole] = useState<SystemRole>(() => {
    const roleFromToken = getRoleFromToken();
    if (roleFromToken) return roleFromToken;
    const stored = localStorage.getItem('userRole');
    return stored ? normalizeSystemRole(stored) : 'USER';
  });
  const [currentWorkspaceRole, setCurrentWorkspaceRole] = useState<WorkspaceRole | null>(() => {
    try {
      const saved = localStorage.getItem('activeWorkspace');
      if (saved) {
        const ws = JSON.parse(saved);
        const roleFromToken = getRoleFromToken();
        const stored = localStorage.getItem('userRole');
        const role = roleFromToken || (stored ? normalizeSystemRole(stored) : null);
        return (
          normalizeWorkspaceRole(ws.currentUserRole) ||
          (role === 'ADMINISTRATOR' ? 'PRODUCER' : 'ARTIST')
        );
      }
      return null;
    } catch {
      return null;
    }
  });

  const [activeProjectRoles, setActiveProjectRoles] = useState<string[]>(() => {
    try {
      const roleFromToken = getRoleFromToken();
      const stored = localStorage.getItem('userRole');
      const role = roleFromToken || (stored ? normalizeSystemRole(stored) : null);

      const saved = localStorage.getItem('activeWorkspace');
      if (saved) {
        const ws = JSON.parse(saved);
        const wsRole =
          normalizeWorkspaceRole(ws.currentUserRole) ||
          (role === 'ADMINISTRATOR' ? 'PRODUCER' : 'ARTIST');
        return [wsRole];
      }
      return role === 'ADMINISTRATOR' ? ['ADMINISTRATOR'] : ['ARTIST'];
    } catch {
      return ['ARTIST'];
    }
  });
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id?: string;
    name: string;
    email: string;
    role: SystemRole;
    canCreateStudio?: boolean;
    isTwoFactorEnabled?: boolean;
    avatarUrl?: string | null;
  } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvt = event as CustomEvent<{ avatarUrl?: string; name?: string }>;
      if (customEvt.detail) {
        setCurrentUserInfo((prev) =>
          prev
            ? {
                ...prev,
                ...(customEvt.detail.avatarUrl !== undefined && {
                  avatarUrl: customEvt.detail.avatarUrl,
                }),
                ...(customEvt.detail.name !== undefined && { name: customEvt.detail.name }),
              }
            : prev,
        );
      }
    };
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
    };
  }, []);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const navigateRoleDefaultView = (role: SystemRole) => {
    if (role === 'ADMINISTRATOR') {
      setCurrentRole('ADMINISTRATOR');
      setActiveProjectRoles(['ADMINISTRATOR']);
      setCurrentWorkspaceRole(null);
      setViewScope('project');
      setCurrentView('admin-dash');
      navigate(ROLE_MANIFEST.ADMINISTRATOR.defaultRoute);
    } else {
      setCurrentRole('USER');
      setCurrentWorkspaceRole(null);
      setActiveProjectRoles(['ARTIST']);
      setViewScope('hub');
      setCurrentView('workspaces');
      navigate('/workspaces');
    }
  };

  useEffect(() => {
    // Xóa sạch session/token khi chạy lại project (mỗi lần reload tab / restart app mới) trừ khi người dùng tích "Ghi nhớ thiết bị"
    const sessionKey = 'pf_app_session_started';
    const rememberDevice = localStorage.getItem('pf_remember_device');
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, 'true');
      if (!rememberDevice || rememberDevice === 'false') {
        auth.signOut().catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        localStorage.removeItem('demoRole');
        localStorage.removeItem('isDemoMode');
        localStorage.removeItem('activeWorkspace');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsAuthenticated(true);
        try {
          const idToken = await user.getIdToken();
          const res = await authService.externalLogin(idToken);
          if (res?.user?.role) {
            const role = normalizeSystemRole(res.user.role);
            setCurrentRole(role);
            localStorage.setItem('userRole', role);
            if (role === 'ADMINISTRATOR') {
              setActiveProjectRoles(['ADMINISTRATOR']);
            }
            setCurrentUserInfo({
              id: res.user.id,
              name: res.user.fullName || user.displayName || user.email?.split('@')[0] || 'User',
              email: res.user.email || user.email || '',
              role,
              isTwoFactorEnabled: !!res.user.twoFactorEnabled,
              avatarUrl: res.user.avatarUrl || (res.user as any).avatar || user.photoURL || null,
            });
            localStorage.setItem('user', JSON.stringify(res.user));
            navigateRoleDefaultView(role);
          }
        } catch (err) {
          console.warn('Không thể đồng bộ token backend từ Firebase session:', err);
        }
      } else {
        // Không có phiên Firebase (vd. đăng nhập email/mật khẩu qua backend):
        // Trạng thái được kiểm tra và đồng bộ chính xác qua authService.getMe() ở effect mount.
      }
    });
    return () => unsubscribe();
    // Chỉ đăng ký listener Firebase một lần khi mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToWorkspaceRoleView = (role: WorkspaceRole) => {
    const target = ROLE_MANIFEST[role]?.defaultRoute || 'dashboard';
    setCurrentView(target as ViewMode);
  };

  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/workspaces' || location.pathname === '/') {
      setCurrentWorkspaceRole(null);
    }
  }, [location.pathname]);

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(() => {
    try {
      const saved = localStorage.getItem('activeWorkspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSelectWorkspace = async (ws: WorkspaceDto) => {
    setActiveWorkspace(ws);
    try {
      localStorage.setItem('activeWorkspace', JSON.stringify(ws));
    } catch {
      // localStorage không khả dụng (private mode...) — bỏ qua, state vẫn đúng trong phiên
    }
    const wsRole =
      normalizeWorkspaceRole(ws.currentUserRole) ||
      (currentRole === 'ADMINISTRATOR' ? 'PRODUCER' : 'ARTIST');
    setCurrentWorkspaceRole(wsRole);
    try {
      localStorage.setItem('workspaceRole', wsRole);
    } catch {
      // ignore
    }
    setActiveProjectRoles([wsRole]);
    setViewScope('project');

    let firstSeriesId: string | null = null;
    // Clear stale project before loading new workspace's series
    setActiveProject(null as any);
    // Tải danh sách Series thật từ Backend API PostgreSQL cho Workspace này
    try {
      const realSeriesList = await seriesService.getSeriesList(ws.id);
      if (realSeriesList && realSeriesList.length > 0) {
        const firstSeries = realSeriesList[0];
        firstSeriesId = firstSeries.id;
        const adaptedProject: MangaProject = {
          id: firstSeries.id,
          title: firstSeries.title,
          subtitle: firstSeries.synopsis || 'Studio Series',
          arc: firstSeries.genre || 'Action / Manga',
          chapter: firstSeries.chaptersCount || 1,
          format: firstSeries.format || 'B5 Tankōbon Master (600 DPI)',
          status: 'In Production',
          progressPercent: 50,
          completedPages: 16,
          totalPages: 32,
          dueDate: 'Dec 2026',
          daysLeft: 30,
          genres: [firstSeries.genre || 'Manga'],
          coverStyle: 'halftone-cyber',
          coverText: firstSeries.title,
          tagline: firstSeries.synopsis || 'Studio Production',
          lastUpdated: new Date(firstSeries.createdAt).toLocaleDateString(),
        };
        setActiveProject(adaptedProject);
      }
    } catch (err) {
      console.warn('Không thể nạp Series thật cho Workspace:', err);
    }

    // Strict UI flow: Workspaces list (/workspaces) -> Select a Workspace -> Series Selection Screen (/workspaces/{id}/series)
    navigateToWorkspaceRoleView(wsRole);
    navigate(`/workspaces/${ws.id}/series`);
  };

  // Khôi phục vai trò và phiên làm việc: nạp nhanh từ localStorage, xác thực qua GET /Auth/me
  useEffect(() => {
    const token = localStorage.getItem('token');
    const verifiedRole = getRoleFromToken(token);
    if (verifiedRole) {
      setIsAuthenticated(true);
      setCurrentRole(verifiedRole);
      localStorage.setItem('userRole', verifiedRole);
      if (verifiedRole === 'ADMINISTRATOR') {
        setActiveProjectRoles(['ADMINISTRATOR']);
        setCurrentWorkspaceRole(null);
      } else {
        setActiveProjectRoles((prev) => (prev.includes('ADMINISTRATOR') ? ['ARTIST'] : prev));
      }
      if (token && token.startsWith('mock-')) {
        return;
      }
    }

    // Nạp thông tin user từ localStorage để hiển thị nhanh (optimistic UI)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const storedRole = localStorage.getItem('userRole');
        const role = storedRole ? normalizeSystemRole(storedRole) : normalizeSystemRole(u.role);
        setCurrentUserInfo({
          id: u.id,
          name: u.fullName || u.username || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          role,
          canCreateStudio: !!u.canCreateStudio,
          isTwoFactorEnabled: !!u.isTwoFactorEnabled,
          avatarUrl: u.avatarUrl || u.avatar || null,
        });
        setCurrentRole(role);
        if (role === 'ADMINISTRATOR') {
          setActiveProjectRoles(['ADMINISTRATOR']);
          setCurrentWorkspaceRole(null);
        }
      } catch {
        // bỏ qua lỗi parse
      }
    }

    // Gọi GET /Auth/me để xác thực phiên với Backend qua cookie HttpOnly pf_access
    let isMounted = true;
    authService
      .getMe()
      .then(async (me) => {
        if (!isMounted) return;
        setIsAuthenticated(true);
        const role = normalizeSystemRole(me.role);
        setCurrentRole(role);
        localStorage.setItem('userRole', role);

        let avatar = me.avatarUrl || me.avatar || null;
        if (!avatar) {
          try {
            const profile = await userService.getMyProfile();
            if (profile?.avatar) {
              avatar = profile.avatar;
            }
          } catch {
            // bỏ qua lỗi nếu không gọi được /Users/me
          }
        }
        if (!isMounted) return;

        setCurrentUserInfo({
          id: me.id,
          name: me.fullName || me.email?.split('@')[0] || 'User',
          email: me.email,
          role,
          canCreateStudio: !!me.canCreateStudio,
          avatarUrl: avatar,
        });
        try {
          const currentStored = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem(
            'user',
            JSON.stringify({
              ...currentStored,
              ...me,
              avatar,
              avatarUrl: avatar,
            }),
          );
        } catch {
          localStorage.setItem('user', JSON.stringify({ ...me, avatar, avatarUrl: avatar }));
        }
        if (role === 'ADMINISTRATOR') {
          setActiveProjectRoles(['ADMINISTRATOR']);
          setCurrentWorkspaceRole(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // 401: phiên không hợp lệ hoặc đã hết hạn
        const status = err?.response?.status;
        if (status === 401 || (!savedUser && !token)) {
          setIsAuthenticated(false);
          setCurrentUserInfo(null);
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (viewScope === 'project') {
      if (currentRole === 'ADMINISTRATOR') {
        setCurrentView('admin-dash');
      }
    }
  }, [currentRole, viewScope]);

  const [projects, setProjects] = useState<MangaProject[]>([]);
  const [activeProject, setActiveProject] = useState<MangaProject | undefined>(() => {
    try {
      const saved = localStorage.getItem('activeProject');
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    if (activeProject) {
      localStorage.setItem('activeProject', JSON.stringify(activeProject));
    }
  }, [activeProject]);

  useEffect(() => {
    const match = location.pathname.match(/\/workspaces\/([^/]+)\/series\/([^/]+)/);
    if (match && match[2]) {
      const seriesId = match[2];
      if (activeProject?.id !== seriesId) {
        seriesService
          .getSeriesById(seriesId)
          .then((firstSeries) => {
            const adaptedProject: MangaProject = {
              id: firstSeries.id,
              title: firstSeries.title,
              subtitle: firstSeries.synopsis || 'N/A',
              arc: 'Arc 01',
              chapter: 1,
              format: firstSeries.format || 'B5 Tankōbon Master (600 DPI)',
              status: 'In Production',
              progressPercent: 50,
              completedPages: 16,
              totalPages: 32,
              dueDate: 'Dec 2026',
              daysLeft: 30,
              genres: [firstSeries.genre || 'Manga'],
              coverStyle: 'halftone-cyber',
              coverText: firstSeries.title,
              tagline: firstSeries.synopsis || 'Studio Production',
              lastUpdated: new Date(firstSeries.createdAt).toLocaleDateString(),
            };
            setActiveProject(adaptedProject);
          })
          .catch((err) => {
            console.warn('Failed to load series for URL sync:', err);
          });
      }
    }
  }, [location.pathname, activeProject?.id]);

  // Tự nạp thông tin và vai trò trong Workspace khi mở trực tiếp bằng URL hoặc F5
  useEffect(() => {
    const wsMatch = location.pathname.match(/\/workspaces\/([^/]+)/);
    if (wsMatch && wsMatch[1]) {
      const wsId = wsMatch[1];
      if (!currentWorkspaceRole || activeWorkspace?.id !== wsId) {
        workspaceService
          .getWorkspaceById(wsId)
          .then((ws) => {
            if (ws) {
              setActiveWorkspace({
                ...ws,
                currentUserRole: normalizeWorkspaceRole(ws.currentUserRole),
              });
              try {
                localStorage.setItem('activeWorkspace', JSON.stringify(ws));
              } catch {
                /* ignore */
              }
              const derivedRole =
                normalizeWorkspaceRole(ws.currentUserRole) ||
                (ws.isOwner ? 'PRODUCER' : currentRole === 'ADMINISTRATOR' ? 'PRODUCER' : 'ARTIST');
              setCurrentWorkspaceRole(derivedRole);
              setActiveProjectRoles([derivedRole]);
            }
          })
          .catch((err) => {
            console.warn('Failed to load workspace for URL sync:', err);
          });
      }
    }
  }, [location.pathname, activeWorkspace?.id, currentWorkspaceRole, currentRole]);

  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [entities, setEntities] = useState<BibleEntity[]>([]);
  const [members, setMembers] = useState<StudioMember[]>([]);
  const [provenanceLogs, setProvenanceLogs] = useState<ProvenanceLogItem[]>([]);
  const [assistants] = useState<AssistantRosterItem[]>([]);

  // Modals
  const [spreadModalOpen, setSpreadModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<KanbanCard | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);

  // Global Lucian #070 Toast System via ToastContext
  const { showToast } = useToast();

  // axiosClient phát 'auth:unauthorized' khi hết phiên (refresh token bị từ chối / 401 không phục hồi được)
  const lastUnauthorizedAtRef = useRef<number>(0);

  useEffect(() => {
    const onUnauthorized = () => {
      const now = Date.now();
      // Chống xử lý trùng lặp khi nhiều request đồng thời nhận 401
      if (now - lastUnauthorizedAtRef.current < 4000) {
        return;
      }
      lastUnauthorizedAtRef.current = now;

      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('activeWorkspace');
      setCurrentUserInfo(null);
      setIsAuthenticated(false);
      setCurrentRole('USER');
      setCurrentWorkspaceRole(null);

      const currentPath = window.location.pathname;
      const isAlreadyOnLogin = currentPath.startsWith('/login');
      const isPublicPath =
        currentPath === '/' ||
        currentPath.startsWith('/catalog') ||
        currentPath.startsWith('/terms');

      // Nếu hệ thống đã chuyển tới /login (hoặc được PrivateRoute chuyển tới /login),
      // không thêm nút "Đăng nhập lại" dư thừa.
      // Chỉ khi người dùng đang ở các màn public (như / landing), cơ chế cho phép thì mới cung cấp action "Đăng nhập lại".
      showToast('Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.', {
        id: 'session-expired',
        type: 'warning',
        duration: 7000,
        action:
          !isAlreadyOnLogin && isPublicPath
            ? {
                label: 'Đăng nhập lại',
                onClick: () => navigate('/login'),
              }
            : undefined,
      });
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [navigate, showToast]);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return; // Không cho mở Command Palette nếu chưa đăng nhập
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  // Các hàm tiện ích
  const handleUpdateCardStage = (cardId: string, newStage: KanbanStageKey) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, stage: newStage } : c)));
    if (selectedCardForDetail && selectedCardForDetail.id === cardId) {
      setSelectedCardForDetail((prev) => (prev ? { ...prev, stage: newStage } : null));
    }
  };

  const handleAddCard = (newCard: KanbanCard) => setCards((prev) => [newCard, ...prev]);
  const handleAddEntity = (newEntity: BibleEntity) => setEntities((prev) => [newEntity, ...prev]);

  const handleInviteMember = (newMember: StudioMember) => {
    setMembers((prev) => [
      ...prev,
      {
        ...newMember,
        permissions: newMember.permissions || ['Master Commit & Tankōbon Lock'],
        cryptoKey: newMember.cryptoKey || 'ECDSA-P256 [0x9B2C...F18]',
        activeTask: newMember.activeTask || 'New Production Assignment',
        status: 'Active',
      },
    ]);
    showToast('Member Provisioned', `Invited ${newMember.name} as ${newMember.role}.`);
  };

  const handleCreateNewProject = (customProject?: MangaProject) => {
    const newId = `project-${Date.now()}`;
    const newProj: MangaProject = customProject || {
      id: newId,
      title: 'Ghost Protocol: Sector 9',
      subtitle: 'Studio Mappa • Arc 01 Pilot Episode',
      arc: 'Arc 01: Pilot (Draft)',
      chapter: 1,
      format: 'B5 Tankōbon Master (600 DPI)',
      status: 'Pre-Production (15%)',
      progressPercent: 15,
      completedPages: 5,
      totalPages: 32,
      dueDate: 'Feb 2027',
      daysLeft: 60,
      genres: ['Cyberpunk', 'Tactical Mecha'],
      coverStyle: 'halftone-cyber',
      coverText: 'GHOST PROTOCOL',
      tagline: 'Arc 01 Pilot Episode',
      lastUpdated: 'Just now',
    };
    setProjects((prev) => [newProj, ...prev]);
    showToast('Serialization Created', `Added "${newProj.title}" to Publications Catalog.`);
  };

  const handleEnterProject = (proj: MangaProject, targetView: ViewMode | string = 'workspace') => {
    setActiveProject(proj);

    const defaultRole = currentWorkspaceRole || 'PRODUCER';
    setActiveProjectRoles([defaultRole]);

    navigate(targetView === 'workspace' ? '/workspace' : `/${targetView}`);
    showToast('Entered Studio Workspace', `Active workspace: ${proj.title}`);
  };

  const handleReturnToHub = () => {
    setCurrentWorkspaceRole(null);
    setViewScope('hub');
    setCurrentView('workspaces');
    navigate('/workspaces');
    showToast('Returned to Workspaces', 'Back to Workspace Catalog.');
  };

  const handleLogout = () => {
    void authService.logout(); // thu hồi refresh token trên BE (đọc token trước khi xoá bên dưới)
    auth.signOut();
    offlineQueueService.clearQueue();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('pf_remember_device');
    localStorage.removeItem('demoRole');
    localStorage.removeItem('isDemoMode');
    localStorage.removeItem('activeWorkspace');
    setFirebaseUser(null);
    setCurrentUserInfo(null);
    setIsAuthenticated(false);
    setCurrentRole('USER');
    setCurrentWorkspaceRole(null);
    // Chủ động đăng xuất: về trang chủ sạch, không để PrivateRoute đẩy sang /login?redirect=<trang cũ>.
    navigate('/', { replace: true });
    showToast('Đã đăng xuất', 'Bạn đã đăng xuất khỏi PanelForge.', {
      id: 'auth-logout',
      type: 'logout',
      duration: 5000,
    });
  };

  const verifiedRole = getRoleFromToken();
  const defaultRedirectPath =
    isAuthenticated && (verifiedRole === 'ADMINISTRATOR' || currentRole === 'ADMINISTRATOR')
      ? '/admin'
      : '/workspaces';

  const handleApiLoginSuccess = (authResponse: any, customRedirect?: string) => {
    setIsLoginModalOpen(false);
    setIsRegisterModalOpen(false);
    setIsAuthenticated(true);
    localStorage.removeItem('demoRole');
    localStorage.removeItem('isDemoMode');
    const role = normalizeSystemRole(authResponse?.user?.role);
    setCurrentRole(role);
    const apiAvatar = authResponse?.user?.avatarUrl || authResponse?.user?.avatar || null;
    setCurrentUserInfo({
      id: authResponse?.user?.id,
      name: authResponse?.user?.fullName || authResponse?.user?.email?.split('@')[0] || 'User',
      email: authResponse?.user?.email || '',
      role,
      canCreateStudio: authResponse?.user?.canCreateStudio,
      isTwoFactorEnabled: authResponse?.user?.isTwoFactorEnabled,
      avatarUrl: apiAvatar,
    });
    if (authResponse?.user) {
      localStorage.setItem('user', JSON.stringify(authResponse.user));
    }
    localStorage.setItem('userRole', role);

    if (authResponse?.token) {
      localStorage.setItem('token', authResponse.token);
    }
    if (authResponse?.refreshToken) {
      localStorage.setItem('refreshToken', authResponse.refreshToken);
    }

    if (customRedirect) {
      navigate(customRedirect);
      showToast(
        'Đăng nhập thành công',
        `Chào mừng ${authResponse?.user?.fullName || 'bạn'} (Vai trò: ${role})!`,
      );
      return;
    }

    // BR-23 / F3: Luồng chuẩn PanelForge: Admin -> /admin, còn lại vào /workspaces -> Series -> Không gian làm việc
    authService
      .getLandingContext()
      .then((landing) => {
        if (landing?.suggestedLanding === 'AdminDashboard' || role === 'ADMINISTRATOR') {
          navigate('/admin');
        } else {
          navigate('/workspaces');
        }
      })
      .catch(() => {
        navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
      });

    showToast(
      'Đăng nhập thành công',
      `Chào mừng ${authResponse?.user?.fullName || 'bạn'} (Vai trò: ${role})!`,
    );
  };

  const handleRegisterSuccess = (authResponse: any, customRedirect?: string) => {
    handleApiLoginSuccess(authResponse, customRedirect);
  };

  return (
    <div className='min-h-screen bg-[#F8F6F0] text-[#171717] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C] relative'>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        defaultRedirectPath={defaultRedirectPath}
        handleSelectWorkspace={handleSelectWorkspace}
        currentUserInfo={currentUserInfo}
        firebaseUser={firebaseUser}
        currentRole={currentRole}
        currentWorkspaceRole={currentWorkspaceRole}
        activeProjectRoles={activeProjectRoles}
        activeWorkspace={activeWorkspace}
        activeProject={activeProject}
        setActiveProject={setActiveProject}
        handleLogout={handleLogout}
        showToast={showToast}
        setIsTwoFactorModalOpen={setIsTwoFactorModalOpen}
        setIsChangePasswordModalOpen={setIsChangePasswordModalOpen}
        setIsLoginModalOpen={setIsLoginModalOpen}
        setIsRegisterModalOpen={setIsRegisterModalOpen}
        setIsCommandPaletteOpen={setCommandPaletteOpen}
        setIsAuditLogOpen={setAuditLogOpen}
        members={members}
        setMembers={setMembers}
        handleInviteMember={handleInviteMember}
        assistants={assistants}
        provenanceLogs={provenanceLogs}
        handleAddEntity={handleAddEntity}
        isDevMode={IS_DEV_MODE}
        onApiLoginSuccess={handleApiLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />

      {/* Các Modals dùng chung */}
      <GlobalModals
        commandPaletteOpen={commandPaletteOpen}
        setCommandPaletteOpen={setCommandPaletteOpen}
        spreadModalOpen={spreadModalOpen}
        setSpreadModalOpen={setSpreadModalOpen}
        auditLogOpen={auditLogOpen}
        setAuditLogOpen={setAuditLogOpen}
        newCardOpen={newCardOpen}
        setNewCardOpen={setNewCardOpen}
        selectedCardForDetail={selectedCardForDetail}
        setSelectedCardForDetail={setSelectedCardForDetail}
        cards={cards}
        entities={entities}
        provenanceLogs={provenanceLogs}
        activeProjectRoles={activeProjectRoles}
        activeWorkspace={activeWorkspace}
        currentRole={currentRole}
        setCurrentView={(v) => navigate(`/${v}`)}
        showToast={showToast}
        handleUpdateCardStage={handleUpdateCardStage}
        handleAddCard={handleAddCard}
      />

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={(username, password) => {
            const name = username.split('@')[0].toLowerCase();
            if (name === 'admin' || name === 'administrator') {
              setIsAuthenticated(true);
              setCurrentRole('ADMINISTRATOR');
              setCurrentWorkspaceRole(null);
              setCurrentUserInfo({
                name: 'Administrator',
                email: username,
                role: 'ADMINISTRATOR',
              });
              localStorage.setItem('userRole', 'ADMINISTRATOR');
              localStorage.setItem('token', 'mock-admin-token');
              setIsLoginModalOpen(false);
              navigate('/admin');
              showToast('Đăng nhập thành công', 'Chào mừng Quản trị viên hệ thống!');
            } else if (password === '123456') {
              setIsAuthenticated(true);
              setCurrentRole('USER');
              setCurrentWorkspaceRole(null);
              setCurrentUserInfo({
                name: username.split('@')[0],
                email: username,
                role: 'USER',
              });
              localStorage.setItem('userRole', 'USER');
              localStorage.setItem('token', 'mock-user-token');
              setIsLoginModalOpen(false);
              navigate('/workspaces');
              showToast('Đăng nhập thành công', `Chào mừng ${username.split('@')[0]}!`);
            } else {
              showToast(
                'Lỗi xác thực',
                'Tài khoản không tồn tại hoặc sai mật khẩu. Hãy thử: writer, artist, editor, producer, admin (mật khẩu: 123456).',
              );
            }
          }}
          onSwitchToRegister={() => {
            setIsLoginModalOpen(false);
            setIsRegisterModalOpen(true);
          }}
          onGoogleLogin={(res) => {
            setIsLoginModalOpen(false);
            setIsAuthenticated(true);
            localStorage.removeItem('demoRole');
            localStorage.removeItem('isDemoMode');
            const role = normalizeSystemRole(res?.user?.role);
            setCurrentRole(role);
            const googleAvatar = res?.user?.avatarUrl || res?.user?.avatar || res?.photoURL || null;
            setCurrentUserInfo({
              id: res?.user?.id,
              name:
                res?.user?.fullName ||
                res?.displayName ||
                res?.user?.email?.split('@')[0] ||
                'User',
              email: res?.user?.email || res?.email || '',
              role,
              avatarUrl: googleAvatar,
            });
            if (res?.user) {
              localStorage.setItem('user', JSON.stringify(res.user));
            }
            localStorage.setItem('userRole', role);

            if (res?.token) {
              localStorage.setItem('token', res.token);
            }
            if (res?.refreshToken) {
              localStorage.setItem('refreshToken', res.refreshToken);
            }

            navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
            const displayName =
              res?.user?.fullName || res?.user?.email || res?.displayName || res?.email || 'bạn';
            const roleLabel = role === 'ADMINISTRATOR' ? 'Administrator' : 'User';
            showToast('Đăng nhập thành công', `Chào mừng ${displayName} (Vai trò: ${roleLabel})!`);
          }}
          onApiLoginSuccess={handleApiLoginSuccess}
        />
      )}

      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSwitchToLogin={() => {
            setIsRegisterModalOpen(false);
            setIsLoginModalOpen(true);
          }}
          onSuccess={handleRegisterSuccess}
        />
      )}

      <TwoFactorSetupModal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
        twoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        isTwoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        onSuccess={() => {
          showToast('Bảo mật 2FA', 'Đã kích hoạt thành công Google Authenticator cho tài khoản!');
          setCurrentUserInfo((prev) => (prev ? { ...prev, isTwoFactorEnabled: true } : prev));
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              parsed.isTwoFactorEnabled = true;
              localStorage.setItem('user', JSON.stringify(parsed));
            } catch {
              // bỏ qua
            }
          }
        }}
        onDisabled={() => {
          showToast('Bảo mật 2FA', 'Đã tắt xác thực 2 lớp cho tài khoản.');
          setCurrentUserInfo((prev) => (prev ? { ...prev, isTwoFactorEnabled: false } : prev));
        }}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        twoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        isTwoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        onSuccess={() => {
          showToast('Change Password', 'Account password updated successfully!');
        }}
      />

      {/* ===== GLOBAL FLOATING PREVIEW WIDGET (visible on all pages) ===== */}
      {/* 

      {!isAuthenticated && (
        <div className='fixed bottom-6 right-6 z-[200]'>
          <div className='glass rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.14)] border border-[#e7e7e7]/80 p-1.5 flex items-center gap-1'>
            <div className='hidden sm:flex items-center gap-1.5 pl-2 pr-1.5 py-1'>
              <span className='w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot'></span>
              <span className='text-xs font-semibold text-[#404040] uppercase tracking-[0.15em]'>
                Preview
              </span>
            </div>
            <div className='hidden sm:block w-px h-5 bg-[#e7e7e7] mx-0.5'></div>
            {[
              { label: 'Landing', Icon: Home, roleKey: 'landing' },
              { label: 'Dev Mode (Workspace)', Icon: CheckCircle2, roleKey: 'dev' },
              { label: 'Admin', Icon: Shield, roleKey: 'administrator' },
              { label: 'Producer', Icon: Briefcase, roleKey: 'producer' },
              { label: 'Writer', Icon: PenLine, roleKey: 'writer' },
              { label: 'Artist', Icon: Layers, roleKey: 'artist' },
              { label: 'Letterer', Icon: Type, roleKey: 'letterer' },
              { label: 'Editor', Icon: CheckCheck, roleKey: 'editor' },
              { label: 'Reader', Icon: BookOpen, roleKey: 'reader' },
            ].map(({ label, Icon, roleKey }) => {
              const isActive =
                roleKey === 'landing' ? !isDemoMode : demoRole === roleKey && isDemoMode;
              return (
                <div key={roleKey} className='relative group'>
                  <button
                    onClick={() => handleEnterDemo(roleKey)}
                    className={`w-9 h-9 rounded-full transition flex items-center justify-center text-sm cursor-pointer ${
                      isActive
                        ? 'bg-[#171717] text-white'
                        : 'text-[#404040] hover:text-[#f97316] hover:bg-[#fff7ed]'
                    }`}
                    aria-label={`Preview as ${label}`}
                  >
                    <Icon className='w-4 h-4' />
                  </button>
                  <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#171717] text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'>
                    {label}
                    <div className='absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#171717]'></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      */}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ConfirmProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ConfirmProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
