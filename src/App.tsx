import React, { useState, useEffect } from 'react';
import { RoleDemoBar, DemoRole } from './components/RoleDemoBar';
import { DevFloatingMenu } from './components/DevFloatingMenu';
import {
  ViewMode,
  MangaProject,
  KanbanCard,
  KanbanStageKey,
  BibleEntity,
  StudioMember,
} from './types';
import {
  INITIAL_PROJECTS,
  INITIAL_KANBAN_CARDS,
  INITIAL_BIBLE_ENTITIES,
  INITIAL_MEMBERS,
  INITIAL_PROVENANCE_LOGS,
  INITIAL_ASSISTANTS,
  INITIAL_PROJECT_MEMBERSHIPS,
} from './data/mockData';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { ReviewView } from '@/roles/editor/views/ReviewView';
import { Header } from './components/Header';
import { DashboardView } from '@/roles/producer/views/DashboardView';
import { WorkflowBoardView } from './views/WorkflowBoardView';
import { SeriesBibleView } from './views/SeriesBibleView';
import { AiMultiAgentView } from './views/ai/AiMultiAgentView';
import { MembersRolesView } from '@/roles/producer/views/MembersRolesView';
import { SeriesMembersView } from '@/roles/producer/views/SeriesMembersView';
import { GlobalModals } from './components/GlobalModals';
import {
  CheckCircle2,
  Home,
  Briefcase,
  PenLine,
  Layers,
  CheckCheck,
  Shield,
  Type,
  BookOpen,
} from 'lucide-react';
import { GlobalAppShell } from './layouts/GlobalAppShell';
import { WorkspaceView } from './views/WorkspaceView';
import { ScriptEditorView } from '@/roles/writer/views/ScriptEditorView';
import { TaskEditor } from './views/TaskEditor';
import { ExportView } from '@/roles/producer/views/ExportView';

import {
  AdminDashboard,
  AdminDashboardView,
  AdminUserManagementView,
  AdminSystemSettingsView,
  AdminAuditLogView,
} from '@/roles/admin/views';

import { ArtistDeskView } from '@/roles/artist/views/ArtistDeskView';
import { ProducerWorkspaceView } from '@/roles/producer/views/ProducerWorkspaceView';
import { NotificationCenterView } from './views/NotificationCenterView';
import { ReaderPortalView } from '@/roles/reader/views/ReaderPortalView';
import { PublicCatalogView } from '@/roles/reader/views/PublicCatalogView';
import { authService } from './services/auth.service';
import { refreshAccessToken } from './api/axiosClient';
import { seriesService } from './services/series.service';

import {
  SystemRole,
  WorkspaceRole,
  WorkspaceDto,
  normalizeSystemRole,
  normalizeWorkspaceRole,
  getRoleFromToken,
} from './types';
import { LoginModal } from './components/modals/LoginModal';
import { RegisterModal } from './components/modals/RegisterModal';
import { TwoFactorSetupModal } from './components/modals/TwoFactorSetupModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { LandingPageView } from './views/LandingPageView';
import { WorkspaceListView } from './views/WorkspaceListView';
import { UserProfile } from './views/UserProfile';
import { auth, onAuthStateChanged } from './firebase';
import { User } from 'firebase/auth';

interface Toast {
  id: string;
  title: string;
  desc: string;
}

const PrivateRoute = ({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: React.ReactNode;
}) => {
  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({
  activeRoles,
  currentRole,
  children,
}: {
  activeRoles?: any[];
  currentRole?: any;
  children: React.ReactNode;
}) => {
  // Lấy role xác thực từ Token JWT hoặc State/localStorage nếu vừa đăng nhập thành công
  const verifiedRole = getRoleFromToken();
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdmin =
    verifiedRole === 'ADMINISTRATOR' ||
    currentRole === 'ADMINISTRATOR' ||
    storedRole === 'ADMINISTRATOR';

  if (!isAdmin) {
    return <Navigate to='/workspaces' replace />;
  }
  return <>{children}</>;
};

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

function AppContent() {
  const navigate = useNavigate();
  // ---> STATE QUẢN LÝ ĐĂNG NHẬP VÀ ĐIỀU HƯỚNG BÊN NGOÀI <---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

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
  } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const navigateRoleDefaultView = (role: SystemRole) => {
    if (role === 'ADMINISTRATOR') {
      setCurrentRole('ADMINISTRATOR');
      setActiveProjectRoles(['ADMINISTRATOR']);
      setCurrentWorkspaceRole(null);
      setViewScope('project');
      setCurrentView('admin-dash');
      navigate('/admin');
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
          const existingToken = localStorage.getItem('token');
          if (!existingToken) {
            const idToken = await user.getIdToken();
            const res = await authService.externalLogin(idToken);
            if (res?.token) {
              localStorage.setItem('token', res.token);
            }
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
              });
              localStorage.setItem('user', JSON.stringify(res.user));
              navigateRoleDefaultView(role);
            }
          }
        } catch (err) {
          console.warn('Không thể đồng bộ token backend từ Firebase session:', err);
        }
      } else {
        // Không có phiên Firebase (vd. đăng nhập email/mật khẩu qua backend): giữ JWT backend,
        // chỉ coi là chưa đăng nhập khi không còn token. Đăng xuất do handleLogout xoá token.
        setIsAuthenticated(!!localStorage.getItem('token'));
      }
    });
    return () => unsubscribe();
    // Chỉ đăng ký listener Firebase một lần khi mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToWorkspaceRoleView = (role: WorkspaceRole) => {
    switch (role) {
      case 'PRODUCER':
        setCurrentView('dashboard');
        break;
      case 'WRITER':
        setCurrentView('script');
        break;
      case 'ARTIST':
        setCurrentView('layout');
        break;
      case 'LETTERER':
        setCurrentView('canvas');
        break;
      case 'EDITOR':
        setCurrentView('review');
        break;
      default:
        setCurrentView('dashboard');
    }
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
    setActiveProjectRoles([wsRole]);
    setViewScope('project');

    let firstSeriesId: string | null = null;
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

    // Smart Landing by Persona & Series Availability
    if (wsRole === 'PRODUCER' || currentRole === 'ADMINISTRATOR') {
      navigate(`/workspaces/${ws.id}/overview`);
    } else {
      // Vai trò khác vào thẳng bàn làm việc của Series đầu tiên; Workspace chưa có Series thì vào trang tổng quan
      navigateToWorkspaceRoleView(wsRole);
      navigate(
        firstSeriesId
          ? `/workspaces/${ws.id}/series/${firstSeriesId}/workspace`
          : `/workspaces/${ws.id}/overview`,
      );
    }
  };

  // Khôi phục vai trò và phiên làm việc từ JWT token (Single Source of Truth) khi tải lại trang
  useEffect(() => {
    const verifiedRole = getRoleFromToken();
    if (verifiedRole) {
      setIsAuthenticated(true);
      setCurrentRole(verifiedRole);
      localStorage.setItem('userRole', verifiedRole); // Luôn ghi đè đồng bộ đúng role từ token
      if (verifiedRole === 'ADMINISTRATOR') {
        setActiveProjectRoles(['ADMINISTRATOR']);
        setCurrentWorkspaceRole(null);
      } else {
        if (activeProjectRoles.includes('ADMINISTRATOR')) {
          setActiveProjectRoles(['ARTIST']);
        }
      }
    } else {
      const savedToken = localStorage.getItem('token');
      if (savedToken && !savedToken.startsWith('mock-')) {
        if (localStorage.getItem('refreshToken')) {
          // Access token (30 phút) đã hết hạn nhưng còn refresh token → đổi token mới rồi nạp lại trang.
          // Refresh bị từ chối thì axiosClient tự dọn phiên và phát 'auth:unauthorized'.
          void refreshAccessToken().then((newToken) => {
            if (newToken) window.location.reload();
          });
        } else {
          // Token hết hạn hoặc không hợp lệ -> xóa sạch
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
          setIsAuthenticated(false);
        }
      }
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const role = verifiedRole || normalizeSystemRole(u.role);
        setCurrentUserInfo({
          id: u.id,
          name: u.fullName || u.username || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          role,
          canCreateStudio: !!u.canCreateStudio,
          isTwoFactorEnabled: !!u.isTwoFactorEnabled,
        });
      } catch {
        // bỏ qua lỗi parse
      }
    }
    // Chỉ khôi phục phiên một lần khi mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewScope === 'project') {
      if (currentRole === 'ADMINISTRATOR') {
        setCurrentView('admin-dash');
      }
    }
  }, [currentRole, viewScope]);

  const [projects, setProjects] = useState<MangaProject[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<MangaProject | undefined>(() => {
    try {
      const saved = localStorage.getItem('activeProject');
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS[0];
    } catch {
      return INITIAL_PROJECTS[0];
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

  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_KANBAN_CARDS);
  const [entities, setEntities] = useState<BibleEntity[]>(INITIAL_BIBLE_ENTITIES);
  const [members, setMembers] = useState<StudioMember[]>(INITIAL_MEMBERS);
  const [provenanceLogs, setProvenanceLogs] = useState(INITIAL_PROVENANCE_LOGS);
  const [assistants] = useState(INITIAL_ASSISTANTS);

  // Modals
  const [spreadModalOpen, setSpreadModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<KanbanCard | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);

  // Toast System
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (title: string, desc: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, desc }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // axiosClient phát 'auth:unauthorized' khi hết phiên (refresh token bị từ chối / 401 không phục hồi được)
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('activeWorkspace');
      setCurrentUserInfo(null);
      setIsAuthenticated(false);
      setCurrentRole('USER');
      setCurrentWorkspaceRole(null);
      showToast('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại.');
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

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

    // Find roles for the current user in this project
    const userId = currentUserInfo?.id || 'member-tf'; // default to TF for testing
    const membership = INITIAL_PROJECT_MEMBERSHIPS.find(
      (m) => m.projectId === proj.id && m.userId === userId,
    );

    if (membership && membership.roles.length > 0) {
      setActiveProjectRoles(membership.roles);
    } else {
      // Default fallback
      setActiveProjectRoles(['READER']);
    }

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
    showToast('Đăng xuất', 'Đã đăng xuất khỏi phiên làm việc.');
  };

  const verifiedRole = getRoleFromToken();
  const defaultRedirectPath =
    isAuthenticated && (verifiedRole === 'ADMINISTRATOR' || currentRole === 'ADMINISTRATOR')
      ? '/admin'
      : '/workspaces';

  return (
    <div className='min-h-screen bg-[#F8F6F0] text-[#171717] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C] relative'>
      <Routes>
        <Route
          path='/'
          element={
            !isAuthenticated ? (
              <LandingPageView
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onOpenRegister={() => setIsRegisterModalOpen(true)}
              />
            ) : (
              <Navigate to={defaultRedirectPath} replace />
            )
          }
        />

        <Route
          path='/login'
          element={
            !isAuthenticated ? (
              <LandingPageView
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onOpenRegister={() => setIsRegisterModalOpen(true)}
              />
            ) : (
              <Navigate to={defaultRedirectPath} replace />
            )
          }
        />

        <Route
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Outlet />
            </PrivateRoute>
          }
        >
          <Route
            path='workspaces'
            element={
              <div className='h-screen w-full overflow-y-auto custom-scrollbar bg-[#FAF8F4]'>
                <WorkspaceListView
                  onSelectWorkspace={handleSelectWorkspace}
                  currentUser={{
                    name:
                      currentUserInfo?.name ||
                      firebaseUser?.displayName ||
                      firebaseUser?.email?.split('@')[0] ||
                      'User',
                    email: currentUserInfo?.email || firebaseUser?.email || '',
                    role: currentRole,
                    avatarUrl: firebaseUser?.photoURL,
                    canCreateStudio: currentUserInfo?.canCreateStudio,
                  }}
                  onLogout={handleLogout}
                />
              </div>
            }
          />

          <Route path='projects' element={<Navigate to='/workspaces' replace />} />

          <Route
            element={
              <GlobalAppShell
                currentUser={{
                  name:
                    currentUserInfo?.name ||
                    firebaseUser?.displayName ||
                    firebaseUser?.email?.split('@')[0] ||
                    'Tatsuki F.',
                  role: currentRole,
                  workspaceRole: currentWorkspaceRole,
                  activeRoles: activeProjectRoles,
                  avatarInitials: (
                    currentUserInfo?.name ||
                    firebaseUser?.displayName ||
                    currentRole ||
                    'U'
                  )
                    .charAt(0)
                    .toUpperCase(),
                }}
                activeWorkspace={activeWorkspace}
                activeSeries={activeProject}
                aiState='active'
                onLogout={handleLogout}
                onLeaveFeedback={() => showToast('Feedback', 'Thanks for your feedback!')}
                onOpenTwoFactor={() => setIsTwoFactorModalOpen(true)}
                onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
              />
            }
          >
            <Route path='workspaces/:workspaceId'>
              <Route index element={<ProducerWorkspaceView />} />
              <Route path='overview' element={<ProducerWorkspaceView />} />
              <Route
                path='members'
                element={
                  <MembersRolesView
                    activeProject={activeProject}
                    workspaceId={activeWorkspace?.id}
                    members={members}
                    onInviteMember={handleInviteMember}
                    onUpdateMemberRole={(memberId, newRole) => {
                      setMembers((prev) =>
                        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
                      );
                      showToast('Cập nhật quyền', `Đã phân quyền ${newRole} cho thành viên`);
                    }}
                    onShowToast={showToast}
                  />
                }
              />

              <Route path='series/:seriesId'>
                <Route path='members' element={<SeriesMembersView onShowToast={showToast} />} />
                <Route
                  path='dashboard'
                  element={
                    <DashboardView
                      activeProject={activeProject}
                      assistants={assistants}
                      provenanceLogs={provenanceLogs}
                      onShowToast={showToast}
                    />
                  }
                />
                <Route
                  path='workspace'
                  element={
                    <WorkspaceView
                      currentUserRole={currentWorkspaceRole}
                      systemRole={currentRole}
                      userRoles={activeProjectRoles}
                      onShowToast={showToast}
                    />
                  }
                />
                <Route
                  path='task/:taskId'
                  element={
                    <TaskEditor
                      activeRoles={activeProjectRoles}
                      onShowToast={showToast}
                      isDevMode={IS_DEV_MODE}
                    />
                  }
                />
                <Route
                  path='bible'
                  element={
                    <SeriesBibleView
                      activeProject={activeProject}
                      onAddEntity={handleAddEntity}
                      onSelectSeries={(p) => setActiveProject(p)}
                      onEditEntity={(e) => showToast('Series Bible', `Mở chi tiết ${e.name}`)}
                      onShowToast={showToast}
                    />
                  }
                />
                <Route path='ai-agents' element={<AiMultiAgentView onShowToast={showToast} />} />
                <Route path='export' element={<ExportView onShowToast={showToast} />} />
              </Route>
            </Route>

            {/* Flat routes for backward compatibility / other views */}
            <Route path='producer' element={<ProducerWorkspaceView />} />
            <Route
              path='review/:taskId'
              element={
                <ReviewView
                  activeRoles={activeProjectRoles}
                  onShowToast={showToast}
                  isDevMode={IS_DEV_MODE}
                />
              }
            />
            <Route path='reader' element={<ReaderPortalView />} />
            <Route
              path='profile'
              element={<UserProfile user={firebaseUser} onLogout={handleLogout} />}
            />
            <Route path='artist' element={<ArtistDeskView />} />
            <Route
              path='catalog'
              element={<PublicCatalogView onBackToWorkspaces={() => navigate('/workspaces')} />}
            />
            <Route path='notifications' element={<NotificationCenterView />} />
          </Route>

          {/* Standalone Global Admin Portal (Decoupled completely from GlobalAppShell) */}
          <Route
            path='admin'
            element={
              <AdminRoute activeRoles={activeProjectRoles} currentRole={currentRole}>
                <AdminDashboard
                  onLogout={handleLogout}
                  currentUser={{
                    name: currentUserInfo?.name || firebaseUser?.displayName || 'Administrator',
                    email: currentUserInfo?.email || firebaseUser?.email || 'admin@panelforge.sys',
                    role: currentRole,
                  }}
                />
              </AdminRoute>
            }
          />

          <Route path='*' element={<Navigate to={defaultRedirectPath} replace />} />
        </Route>
      </Routes>

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
            if (res?.token) {
              localStorage.setItem('token', res.token);
            }
            const role = normalizeSystemRole(res?.user?.role);
            setCurrentRole(role);
            setCurrentUserInfo({
              id: res?.user?.id,
              name:
                res?.user?.fullName ||
                res?.displayName ||
                res?.user?.email?.split('@')[0] ||
                'User',
              email: res?.user?.email || res?.email || '',
              role,
            });
            localStorage.setItem('userRole', role);
            navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
            const displayName =
              res?.user?.fullName || res?.user?.email || res?.displayName || res?.email || 'bạn';
            const roleLabel = role === 'ADMINISTRATOR' ? 'Administrator' : 'User';
            showToast('Đăng nhập thành công', `Chào mừng ${displayName} (Vai trò: ${roleLabel})!`);
          }}
          onApiLoginSuccess={(authResponse) => {
            setIsLoginModalOpen(false);
            setIsAuthenticated(true);
            localStorage.removeItem('demoRole');
            localStorage.removeItem('isDemoMode');
            if (authResponse?.token) {
              localStorage.setItem('token', authResponse.token);
            }
            const role = normalizeSystemRole(authResponse?.user?.role);
            setCurrentRole(role);
            setCurrentUserInfo({
              id: authResponse?.user?.id,
              name:
                authResponse?.user?.fullName || authResponse?.user?.email?.split('@')[0] || 'User',
              email: authResponse?.user?.email || '',
              role,
              canCreateStudio: authResponse?.user?.canCreateStudio,
              isTwoFactorEnabled: authResponse?.user?.isTwoFactorEnabled,
            });
            if (authResponse?.user) {
              localStorage.setItem('user', JSON.stringify(authResponse.user));
            }
            localStorage.setItem('userRole', role);

            // BR-23 / F3: Điều hướng theo suggestedLanding từ landing-context API
            authService
              .getLandingContext(authResponse?.token)
              .then((landing) => {
                if (landing?.suggestedLanding === 'AdminDashboard') {
                  navigate('/admin');
                } else if (landing?.suggestedLanding === 'YourWorkspaces') {
                  navigate('/workspaces');
                } else if (landing?.suggestedLanding === 'StudioCreation') {
                  navigate(landing.canCreateStudio ? '/producer' : '/workspaces');
                } else if (landing?.suggestedLanding === 'PublicCatalog') {
                  navigate('/catalog');
                } else {
                  navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
                }
              })
              .catch(() => {
                navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
              });

            showToast(
              'Đăng nhập thành công',
              `Chào mừng ${authResponse?.user?.fullName || 'bạn'} (Vai trò: ${role})!`,
            );
          }}
        />
      )}

      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSwitchToLogin={() => {
            setIsRegisterModalOpen(false);
            setIsLoginModalOpen(true);
          }}
          onSuccess={(authResponse) => {
            setIsRegisterModalOpen(false);
            setIsAuthenticated(true);
            if (authResponse?.token) {
              localStorage.setItem('token', authResponse.token);
            }
            const role = normalizeSystemRole(authResponse?.user?.role);
            setCurrentRole(role);
            setCurrentUserInfo({
              id: authResponse?.user?.id,
              name:
                authResponse?.user?.fullName || authResponse?.user?.email?.split('@')[0] || 'User',
              email: authResponse?.user?.email || '',
              role,
            });
            localStorage.setItem('userRole', role);
            navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
            showToast(
              'Kích hoạt thành công',
              `Chào mừng ${authResponse?.user?.fullName || 'bạn'} (Vai trò: ${role})!`,
            );
          }}
        />
      )}

      <TwoFactorSetupModal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
        twoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        isTwoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        token={localStorage.getItem('token') || ''}
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
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        twoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        isTwoFactorEnabled={currentUserInfo?.isTwoFactorEnabled ?? false}
        token={localStorage.getItem('token') || ''}
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
              <span className='text-[10px] font-semibold text-[#404040] uppercase tracking-[0.15em]'>
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
                  <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#171717] text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'>
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

      {/* Floating Toast Notification Stack */}
      <div className='fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none'>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className='pointer-events-auto bg-[#171717] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#333333] flex items-start gap-3 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-200'
          >
            <CheckCircle2 className='w-4 h-4 text-[#10B981] shrink-0 mt-0.5' />
            <div>
              <div className='text-xs font-bold text-white font-display'>{toast.title}</div>
              <div className='text-[11px] text-[#CCCCCC] mt-0.5 leading-snug'>{toast.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
