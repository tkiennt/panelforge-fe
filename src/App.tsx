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
  clearCachedWorkspaceState,
  getStoredCurrentUserId,
  readCachedWorkspace,
  writeCachedWorkspace,
  normalizeSystemRole,
  normalizeWorkspaceRole,
  getRoleFromToken,
  ProvenanceLogItem,
  AssistantRosterItem,
} from './types';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { buildSeriesPath } from './app/routePaths';
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
import { TwoFactorSetupModal } from '@/shared/features/account/TwoFactorSetupModal';
import { ChangePasswordModal } from '@/shared/features/account/ChangePasswordModal';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { auth, onAuthStateChanged } from '@/config/firebase';
import { User } from 'firebase/auth';
import { useTranslation } from '@/lib/i18n';

export type Toast = ToastItemData;
export type { ToastOptions, ToastType };

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

function AppContent() {
  const { t } = useTranslation();
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
  // LỖI 1: Không tin currentUserRole lưu trong localStorage khi khởi tạo; luôn nạp lại từ API khi vào /workspaces/:id/...
  const [currentWorkspaceRole, setCurrentWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const verifiedWorkspaceKeyRef = useRef<string | null>(null);

  const [activeProjectRoles, setActiveProjectRoles] = useState<string[]>(() => {
    const roleFromToken = getRoleFromToken();
    return roleFromToken === 'ADMINISTRATOR' ? ['ADMINISTRATOR'] : [];
  });
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id?: string;
    name: string;
    email: string;
    role: SystemRole;
    canCreateStudio?: boolean;
    isTwoFactorEnabled?: boolean;
    twoFactorRecoveryCodesLeft?: number;
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
    } else if (role === 'PUBLISHER') {
      setCurrentRole('PUBLISHER');
      setActiveProjectRoles(['PUBLISHER']);
      setCurrentWorkspaceRole('PUBLISHER');
      setViewScope('project');
      setCurrentView('publisher-desk');
      navigate('/publisher/desk');
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
        clearCachedWorkspaceState();
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
            clearCachedWorkspaceState();
            verifiedWorkspaceKeyRef.current = null;
            setActiveWorkspace(null);
            setCurrentWorkspaceRole(null);
            const role = normalizeSystemRole(res.user.role);
            setCurrentRole(role);
            localStorage.setItem('userRole', role);
            setActiveProjectRoles(role === 'ADMINISTRATOR' ? ['ADMINISTRATOR'] : []);
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

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(() =>
    readCachedWorkspace(),
  );

  const handleSelectWorkspace = async (ws: WorkspaceDto) => {
    const uid = currentUserInfo?.id ?? getStoredCurrentUserId();
    const wsRole =
      normalizeWorkspaceRole(ws.currentUserRole) ||
      (ws.isOwner ? 'PRODUCER' : currentRole === 'ADMINISTRATOR' ? 'PRODUCER' : 'ARTIST');
    const tagged = writeCachedWorkspace({ ...ws, currentUserRole: wsRole }, uid);
    setActiveWorkspace(tagged);
    setCurrentWorkspaceRole(wsRole);
    try {
      localStorage.setItem('workspaceRole', wsRole);
    } catch {
      // ignore
    }
    setActiveProjectRoles([wsRole]);
    verifiedWorkspaceKeyRef.current = `${uid || 'anon'}:${ws.id}`;
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
          // 'isTwoFactorEnabled' do FE ghi (getMe + modal bật/tắt) nên mới nhất; 'twoFactorEnabled' là bản BE
          isTwoFactorEnabled: !!(u.isTwoFactorEnabled ?? u.twoFactorEnabled),
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

    if (token && token.startsWith('mock-')) {
      return;
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
        localStorage.setItem('pf_has_session', 'true');

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
          // Trạng thái 2FA thật từ BE (trước đây không có → modal 2FA tưởng chưa bật sau khi tải lại trang)
          isTwoFactorEnabled: !!me.twoFactorEnabled,
          twoFactorRecoveryCodesLeft: me.twoFactorRecoveryCodesLeft,
          avatarUrl: avatar,
        });
        const isTwoFactorEnabled = !!me.twoFactorEnabled;
        try {
          const currentStored = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem(
            'user',
            JSON.stringify({
              ...currentStored,
              ...me,
              isTwoFactorEnabled,
              avatar,
              avatarUrl: avatar,
            }),
          );
        } catch {
          localStorage.setItem(
            'user',
            JSON.stringify({ ...me, isTwoFactorEnabled, avatar, avatarUrl: avatar }),
          );
        }
        // LỖI 1: Nếu bản cache activeWorkspace thuộc user khác (hoặc không khớp me.id), xoá bỏ ngay
        const validCachedWs = readCachedWorkspace(me.id);
        if (!validCachedWs) {
          verifiedWorkspaceKeyRef.current = null;
          setActiveWorkspace(null);
          setCurrentWorkspaceRole(null);
          setActiveProjectRoles(role === 'ADMINISTRATOR' ? ['ADMINISTRATOR'] : []);
        } else if (role === 'ADMINISTRATOR') {
          setActiveProjectRoles(['ADMINISTRATOR']);
          setCurrentWorkspaceRole(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // 401: phiên không hợp lệ hoặc đã hết hạn
        const status = err?.response?.status;
        if (status === 401 || (!savedUser && !token)) {
          verifiedWorkspaceKeyRef.current = null;
          clearCachedWorkspaceState();
          setIsAuthenticated(false);
          setCurrentUserInfo(null);
          setActiveWorkspace(null);
          setCurrentWorkspaceRole(null);
          setActiveProjectRoles([]);
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
          localStorage.removeItem('pf_has_session');
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

  // Tự nạp thông tin và vai trò trong Workspace từ API mỗi khi vào /workspaces/:id/... hoặc F5 (không tin cache)
  useEffect(() => {
    const wsMatch = location.pathname.match(/\/workspaces\/([^/]+)/);
    if (!wsMatch || !wsMatch[1]) return;

    const wsId = wsMatch[1];
    const uid = currentUserInfo?.id ?? getStoredCurrentUserId() ?? 'anon';
    const verifyKey = `${uid}:${wsId}`;
    if (verifiedWorkspaceKeyRef.current === verifyKey) return;

    let cancelled = false;
    workspaceService
      .getWorkspaceById(wsId)
      .catch(() =>
        workspaceService
          .getMyWorkspaces()
          .then((list) => list?.find((w) => w.id === wsId) ?? null)
          .catch(() => null),
      )
      .then((ws) => {
        if (cancelled || !ws) return;
        const derivedRole =
          normalizeWorkspaceRole(ws.currentUserRole) || (ws.isOwner ? 'PRODUCER' : undefined);
        const tagged = writeCachedWorkspace(
          {
            ...ws,
            currentUserRole: derivedRole ?? normalizeWorkspaceRole(ws.currentUserRole),
          },
          currentUserInfo?.id ?? getStoredCurrentUserId(),
        );
        setActiveWorkspace(tagged);
        if (derivedRole) {
          setCurrentWorkspaceRole(derivedRole);
          setActiveProjectRoles([derivedRole]);
          try {
            localStorage.setItem('workspaceRole', derivedRole);
          } catch {
            /* ignore */
          }
        }
        verifiedWorkspaceKeyRef.current = verifyKey;
      })
      .catch((err) => {
        console.warn('Failed to load workspace for URL sync:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, currentUserInfo?.id]);

  // Spec D10: trong một Series, vai trò hiệu lực là vai trò Series (Studio chỉ có Producer / Thành viên)
  const seriesIdInPath = location.pathname.match(/\/workspaces\/[^/]+\/series\/([^/]+)/)?.[1];
  useEffect(() => {
    if (!seriesIdInPath || currentRole === 'ADMINISTRATOR') return;
    let cancelled = false;
    seriesService
      .getSeriesById(seriesIdInPath)
      .then((detail) => {
        const seriesRole = normalizeWorkspaceRole(detail?.currentUserRole);
        if (cancelled || !seriesRole) return;
        setCurrentWorkspaceRole(seriesRole);
        setActiveProjectRoles([seriesRole]);
        try {
          localStorage.setItem('workspaceRole', seriesRole);
        } catch {
          /* ignore */
        }
      })
      .catch((err) => console.warn('Failed to load series role:', err));
    return () => {
      cancelled = true;
    };
  }, [seriesIdInPath, currentRole]);

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
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);

  // Global Lucian #070 Toast System via ToastContext
  const { showToast } = useToast();

  // axiosClient phát 'auth:unauthorized' khi hết phiên (refresh token bị từ chối / 401 không phục hồi được)
  const lastUnauthorizedAtRef = useRef<number>(0);

  useEffect(() => {
    const onUnauthorized = (event?: Event) => {
      const now = Date.now();
      // Chống xử lý trùng lặp khi nhiều request đồng thời nhận 401
      if (now - lastUnauthorizedAtRef.current < 4000) {
        return;
      }
      lastUnauthorizedAtRef.current = now;

      // Kiểm tra xem trước đó có phiên đăng nhập hay không (state isAuthenticated, currentUserInfo, cờ hoặc token)
      const customDetail = (event as CustomEvent)?.detail;
      const hadSession =
        customDetail?.hadSession ??
        Boolean(
          isAuthenticated ||
          currentUserInfo ||
          localStorage.getItem('pf_has_session') === 'true' ||
          localStorage.getItem('user') ||
          localStorage.getItem('userRole') ||
          (localStorage.getItem('token') && !localStorage.getItem('token')?.startsWith('mock-')),
        );

      verifiedWorkspaceKeyRef.current = null;
      clearCachedWorkspaceState();
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('pf_has_session');
      setCurrentUserInfo(null);
      setIsAuthenticated(false);
      setCurrentRole('USER');
      setActiveWorkspace(null);
      setActiveProject(undefined);
      setCurrentWorkspaceRole(null);
      setActiveProjectRoles([]);

      // Nếu trước đó KHÔNG hề có phiên đăng nhập (khách vãng lai), tuyệt đối KHÔNG hiện toast
      if (!hadSession) {
        return;
      }

      const currentPath = window.location.pathname;
      const isAlreadyOnLogin = currentPath.startsWith('/login');
      const isPublicPath =
        currentPath === '/' ||
        currentPath.startsWith('/catalog') ||
        currentPath.startsWith('/terms');

      // Nếu hệ thống đã chuyển tới /login (hoặc được PrivateRoute chuyển tới /login),
      // không thêm nút "Đăng nhập lại" dư thừa.
      // Chỉ khi người dùng đang ở các màn public (như / landing), cơ chế cho phép thì mới cung cấp action "Đăng nhập lại".
      showToast(t('navigation.app.sessionExpiredTitle'), t('navigation.app.sessionExpiredDesc'), {
        id: 'session-expired',
        type: 'warning',
        duration: 7000,
        action:
          !isAlreadyOnLogin && isPublicPath
            ? {
                label: t('navigation.app.reloginBtn'),
                onClick: () => navigate('/login'),
              }
            : undefined,
      });
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [navigate, showToast, isAuthenticated, currentUserInfo, t]);

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
    verifiedWorkspaceKeyRef.current = null;
    clearCachedWorkspaceState();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('pf_remember_device');
    localStorage.removeItem('demoRole');
    localStorage.removeItem('isDemoMode');
    localStorage.removeItem('pf_has_session');
    setFirebaseUser(null);
    setCurrentUserInfo(null);
    setIsAuthenticated(false);
    setCurrentRole('USER');
    setActiveWorkspace(null);
    setActiveProject(undefined);
    setCurrentWorkspaceRole(null);
    setActiveProjectRoles([]);
    // Chủ động đăng xuất: về trang chủ sạch, không để PrivateRoute đẩy sang /login?redirect=<trang cũ>.
    navigate('/', { replace: true });
    showToast(t('navigation.app.loggedOutTitle'), t('navigation.app.loggedOutDesc'), {
      id: 'auth-logout',
      type: 'logout',
      duration: 5000,
    });
  };

  const verifiedRole = getRoleFromToken();
  const defaultRedirectPath =
    isAuthenticated && (verifiedRole === 'ADMINISTRATOR' || currentRole === 'ADMINISTRATOR')
      ? '/admin'
      : isAuthenticated && (verifiedRole === 'PUBLISHER' || currentRole === 'PUBLISHER')
        ? '/publisher/series'
        : '/workspaces';

  const handleApiLoginSuccess = (authResponse: any, customRedirect?: string) => {
    verifiedWorkspaceKeyRef.current = null;
    clearCachedWorkspaceState();
    setActiveWorkspace(null);
    setActiveProject(undefined);
    setCurrentWorkspaceRole(null);
    setIsAuthenticated(true);
    localStorage.removeItem('demoRole');
    localStorage.removeItem('isDemoMode');
    const role = normalizeSystemRole(authResponse?.user?.role);
    setCurrentRole(role);
    setActiveProjectRoles(role === 'ADMINISTRATOR' ? ['ADMINISTRATOR'] : []);
    const apiAvatar = authResponse?.user?.avatarUrl || authResponse?.user?.avatar || null;
    setCurrentUserInfo({
      id: authResponse?.user?.id,
      name: authResponse?.user?.fullName || authResponse?.user?.email?.split('@')[0] || 'User',
      email: authResponse?.user?.email || '',
      role,
      canCreateStudio: authResponse?.user?.canCreateStudio,
      isTwoFactorEnabled: !!(
        authResponse?.user?.twoFactorEnabled ?? authResponse?.user?.isTwoFactorEnabled
      ),
      avatarUrl: apiAvatar,
    });
    if (authResponse?.user) {
      localStorage.setItem('user', JSON.stringify(authResponse.user));
    }
    localStorage.setItem('userRole', role);
    localStorage.setItem('pf_has_session', 'true');

    if (authResponse?.token) {
      localStorage.setItem('token', authResponse.token);
    }
    if (authResponse?.refreshToken) {
      localStorage.setItem('refreshToken', authResponse.refreshToken);
    }

    const displayName =
      authResponse?.user?.fullName ||
      authResponse?.user?.name ||
      authResponse?.user?.displayName ||
      (authResponse?.user?.email
        ? authResponse.user.email.split('@')[0]
        : t('navigation.app.defaultUserDisplay'));

    if (customRedirect) {
      navigate(customRedirect);
      showToast(
        t('navigation.app.loginSuccessTitle'),
        t('navigation.app.welcomeBack', { name: displayName }),
      );
      return;
    }

    // 2-tier architecture: Admin -> /admin, Publisher -> /publisher/series, Producer & Creators -> /workspaces/:wId (Studio Hub)
    authService
      .getLandingContext()
      .then(async (landing) => {
        if (landing?.suggestedLanding === 'AdminDashboard' || role === 'ADMINISTRATOR') {
          navigate('/admin');
        } else if (landing?.suggestedLanding === 'PublisherPortal' || role === 'PUBLISHER') {
          navigate('/publisher/series');
        } else {
          // Spec §5.3 Bước 2: sau đăng nhập luôn vào màn chọn Studio, không tự vào studio gần nhất.
          navigate('/workspaces');
        }
      })
      .catch(async () => {
        if (role === 'ADMINISTRATOR') {
          navigate('/admin');
        } else if (role === 'PUBLISHER') {
          navigate('/publisher/series');
        } else {
          navigate('/workspaces');
        }
      });

    showToast(
      t('navigation.app.loginSuccessTitle'),
      t('navigation.app.welcomeBack', { name: displayName }),
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
        activeSeries={activeProject}
        currentRole={currentRole}
        setCurrentView={(v) => {
          if (v.startsWith('/')) {
            navigate(v);
          } else if (activeWorkspace && activeProject) {
            navigate(buildSeriesPath(activeWorkspace.id, activeProject.id, v));
          } else {
            navigate(`/${v}`);
          }
        }}
        showToast={showToast}
        handleUpdateCardStage={handleUpdateCardStage}
        handleAddCard={handleAddCard}
      />

      <TwoFactorSetupModal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
        twoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        isTwoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        recoveryCodesLeft={currentUserInfo?.twoFactorRecoveryCodesLeft}
        onSuccess={() => {
          showToast(
            t('navigation.app.twoFactorUpdatedTitle'),
            t('navigation.app.twoFactorEnabledDesc'),
          );
          setCurrentUserInfo((prev) =>
            prev ? { ...prev, isTwoFactorEnabled: true, twoFactorRecoveryCodesLeft: 10 } : prev,
          );
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
          showToast(
            t('navigation.app.twoFactorUpdatedTitle'),
            t('navigation.app.twoFactorDisabledDesc'),
          );
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
