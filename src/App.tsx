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
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { ReviewView } from './views/ReviewView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { WorkflowBoardView } from './views/WorkflowBoardView';
import { SeriesBibleView } from './views/SeriesBibleView';
import { MembersRolesView } from './views/MembersRolesView';
import { ContentHubView } from './views/ContentHubView';
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
import { ScriptEditorView } from './views/ScriptEditorView';
import { TaskEditor } from './views/TaskEditor';
import { ExportView } from './views/ExportView';


import {
  AdminDashboardView,
  AdminUserManagementView,
  AdminSystemSettingsView,
  AdminAuditLogView,
} from './views/admin';





import { ArtistDeskView } from './views/artist/ArtistDeskView';
import { ProducerWorkspaceView } from './views/producer/ProducerWorkspaceView';
import { NotificationCenterView } from './views/NotificationCenterView';
import { ReaderPortalView } from './views/ReaderPortalView';

import {
  SystemRole,
  WorkspaceRole,
  WorkspaceDto,
  normalizeSystemRole,
  normalizeWorkspaceRole,
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
import { authService } from './services/auth.service';

interface Toast {
  id: string;
  title: string;
  desc: string;
}

const PrivateRoute = ({ isAuthenticated, isDemoMode, children }: { isAuthenticated: boolean, isDemoMode: boolean, children: React.ReactNode }) => {
  if (!isAuthenticated && !isDemoMode) {
    return <Navigate to="/login" replace />;
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
  const isAdmin =
    activeRoles?.includes('ADMINISTRATOR') ||
    currentRole === 'ADMINISTRATOR' ||
    localStorage.getItem('userRole') === 'ADMINISTRATOR';
  if (!isAdmin) {
    return <Navigate to="/workspace" replace />;
  }
  return <>{children}</>;
};

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

function AppContent() {
  const navigate = useNavigate();
  // ---> STATE QUẢN LÝ ĐĂNG NHẬP VÀ ĐIỀU HƯỚNG BÊN NGOÀI <---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // ---> THÊM STATE CHO DEMO ROLE <---
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState<string | null>(null);

  // Navigation & Data State
  const [viewScope, setViewScope] = useState<'hub' | 'project'>('hub');
  const [currentView, setCurrentView] = useState<ViewMode | string>('workspaces');
  const [currentRole, setCurrentRole] = useState<SystemRole>('USER');
  const [currentWorkspaceRole, setCurrentWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [activeProjectRoles, setActiveProjectRoles] = useState<string[]>(['ARTIST']);
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id?: string;
    name: string;
    email: string;
    role: SystemRole;
    isTwoFactorEnabled?: boolean;
  } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsAuthenticated(true);
        // Luôn đồng bộ JWT token từ backend để đảm bảo role luôn được cập nhật mới nhất
        // (tránh trường hợp token cũ có role sai sau khi admin đổi role user)
        try {
          const idToken = await user.getIdToken();
          const res = await authService.externalLogin(idToken);
          if (res?.token) {
            localStorage.setItem('token', res.token);
          }
          if (res?.user?.role) {
            const role = normalizeSystemRole(res.user.role);
            setCurrentRole(role);
            localStorage.setItem('userRole', role);
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
        } catch (err) {
          console.warn('Không thể đồng bộ token backend từ Firebase session:', err);
          // Fallback: đọc từ localStorage nếu có
        }
      } else {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const navigateRoleDefaultView = (role: SystemRole) => {
    if (role === 'ADMINISTRATOR') {
      setViewScope('project');
      setCurrentView('admin-dash');
    } else {
      setCurrentWorkspaceRole(null);
      setViewScope('hub');
      setCurrentView('workspaces');
    }
  };

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

  const handleSelectWorkspace = (ws: WorkspaceDto) => {
    const wsRole =
      normalizeWorkspaceRole(ws.currentUserRole) ||
      (currentRole === 'ADMINISTRATOR' ? 'PRODUCER' : 'ARTIST');
    setCurrentWorkspaceRole(wsRole);
    setViewScope('project');
    navigateToWorkspaceRoleView(wsRole);
  };

  // Khôi phục vai trò từ localStorage hoặc giải mã JWT token khi tải lại trang
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
      const role = normalizeSystemRole(savedRole);
      // Removed setCurrentRole(role) as we are using activeProjectRoles
    }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const role = normalizeSystemRole(u.role);
        setCurrentUserInfo({
          id: u.id,
          name: u.fullName || u.username || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          role,
          isTwoFactorEnabled: !!u.isTwoFactorEnabled,
        });
      } catch {
        // bỏ qua lỗi parse
      }
    }
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      if (savedToken.startsWith('mock-')) {
        setIsAuthenticated(true);
      } else {
        try {
          const parts = savedToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const exp = payload.exp;
            if (exp && Date.now() >= exp * 1000) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('userRole');
              setIsAuthenticated(false);
            } else {
              setIsAuthenticated(true);
              const roleClaim =
                payload.role ||
                payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
              if (roleClaim) {
                const role = normalizeSystemRole(roleClaim);
                setCurrentRole(role);
                localStorage.setItem('userRole', role);
              }
            }
          }
        } catch {
          // bỏ qua lỗi giải mã
        }
      }
    }
  }, []);

  useEffect(() => {
    if (viewScope === 'project') {
      if (currentRole === 'ADMINISTRATOR' || activeProjectRoles.includes('ADMINISTRATOR')) {
        setCurrentView('admin-dash');
      } else {
        setCurrentView('workspace');
      }
    }
  }, [currentRole, activeProjectRoles, viewScope]);

  const [projects, setProjects] = useState<MangaProject[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<MangaProject>(INITIAL_PROJECTS[0]);
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
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, title, desc }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

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

  const handleEnterDemo = (role: string) => {
    if (role === 'landing') {
      setDemoRole(null);
      setIsDemoMode(false);
      return;
    }
    const isDev = role === 'dev';
    if (role === 'administrator' || isDev) {
      setDemoRole(role);
      setIsDemoMode(true);
      setCurrentRole('ADMINISTRATOR');
      setActiveProjectRoles(['ADMINISTRATOR']);
      setCurrentWorkspaceRole(null);
      localStorage.setItem('userRole', 'ADMINISTRATOR');
      localStorage.setItem('token', 'mock-admin-token');
      setViewScope('project');
      navigate('/admin');
      showToast(isDev ? 'Chế độ Dev Mode' : 'Chế độ Demo Role', 'Đang xem giao diện với quyền Administrator');
      return;
    }
    const wsRole = role.toUpperCase() as WorkspaceRole;
    setDemoRole(role);
    setIsDemoMode(true);
    setCurrentRole('USER');
    setCurrentWorkspaceRole(wsRole);
    setActiveProjectRoles([wsRole]);
    localStorage.setItem('userRole', 'USER');
    localStorage.setItem('token', 'mock-demo-token');
    setViewScope('project');
    navigate('/workspace');
    showToast('Chế độ Demo Role', `Đang xem giao diện Workspace với vai trò ${wsRole}`);
  };

  const handleLogout = () => {
    auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    setFirebaseUser(null);
    setCurrentUserInfo(null);
    setIsAuthenticated(false);
    setIsDemoMode(false);
    showToast('Đăng xuất', 'Đã đăng xuất khỏi phiên làm việc.');
  };

  return (
    <div className='min-h-screen bg-[#F8F6F0] text-[#171717] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C] relative'>
      {IS_DEV_MODE && <DevFloatingMenu />}
      <RoleDemoBar
        activeRole={demoRole as DemoRole}
        onRoleSelect={(role) => handleEnterDemo(role)}
        onExitDemo={() => {
          setIsDemoMode(false);
          setDemoRole(null);
          localStorage.removeItem('demoRole');
          localStorage.setItem('isDemoMode', 'false');
        }}
      />

      <Routes>
        <Route
          path="/login"
          element={
            !isAuthenticated && !isDemoMode ? (
              <LandingPageView
                onEnterDemo={handleEnterDemo}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onOpenRegister={() => setIsRegisterModalOpen(true)}
              />
            ) : (
              <Navigate to="/workspaces" replace />
            )
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated} isDemoMode={isDemoMode}>
              <Outlet />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/workspaces" replace />} />

          <Route
            path="workspaces"
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
                  }}
                  onLogout={handleLogout}
                />
              </div>
            }
          />

          <Route
            path="projects"
            element={
              <div className='h-screen w-full overflow-y-auto custom-scrollbar bg-[#FAF8F4]'>
                <ContentHubView
                  projects={projects}
                  onSelectProject={(proj) => setActiveProject(proj)}
                  onEnterProject={handleEnterProject}
                  onCreateNewProject={handleCreateNewProject}
                  isRootView={true}
                />
              </div>
            }
          />

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
                activeSeries={activeProject}
                aiState='active'
                onLogout={handleLogout}
                onLeaveFeedback={() => showToast('Feedback', 'Thanks for your feedback!')}
                onOpenTwoFactor={() => setIsTwoFactorModalOpen(true)}
                onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
              />
            }
          >
            <Route
              path="dashboard"
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
              path="workspace"
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
              path="workspace/task/:taskId"
              element={
                <TaskEditor
                  activeRoles={activeProjectRoles}
                  onShowToast={showToast}
                  isDevMode={IS_DEV_MODE}
                />
              }
            />
            <Route
              path="bible"
              element={
                <SeriesBibleView
                  activeProject={activeProject}
                  entities={entities}
                  onAddEntity={handleAddEntity}
                  onEditEntity={(e) => showToast('Series Bible', `Mở chi tiết ${e.name}`)}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="members"
              element={
                <MembersRolesView
                  activeProject={activeProject}
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
            <Route
              path="review/:taskId"
              element={
                <ReviewView
                  activeRoles={activeProjectRoles}
                  onShowToast={showToast}
                  isDevMode={IS_DEV_MODE}
                />
              }
            />
            <Route path="export" element={<ExportView onShowToast={showToast} />} />
            <Route path="projects/:projectId/export" element={<ExportView onShowToast={showToast} />} />
            <Route path="reader" element={<ReaderPortalView />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="artist" element={<ArtistDeskView />} />
            <Route path="producer" element={<ProducerWorkspaceView />} />
            <Route path="notifications" element={<NotificationCenterView />} />

            <Route
              path="admin"
              element={
                <AdminRoute activeRoles={activeProjectRoles} currentRole={currentRole}>
                  <AdminDashboardView
                    onNavigateToUsers={() => navigate('/users')}
                    onNavigateToSettings={() => navigate('/ai-quota')}
                    onNavigateToAudit={() => navigate('/audit-log')}
                  />
                </AdminRoute>
              }
            />
            <Route
              path="users"
              element={
                <AdminRoute activeRoles={activeProjectRoles} currentRole={currentRole}>
                  <AdminUserManagementView />
                </AdminRoute>
              }
            />
            <Route
              path="ai-quota"
              element={
                <AdminRoute activeRoles={activeProjectRoles} currentRole={currentRole}>
                  <AdminSystemSettingsView />
                </AdminRoute>
              }
            />
            <Route
              path="audit-log"
              element={
                <AdminRoute activeRoles={activeProjectRoles} currentRole={currentRole}>
                  <AdminAuditLogView />
                </AdminRoute>
              }
            />
          </Route>
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
              res?.user?.fullName ||
              res?.user?.email ||
              res?.displayName ||
              res?.email ||
              'bạn';
            showToast('Đăng nhập thành công', `Chào mừng ${displayName} (Vai trò: ${role})!`);
          }}
          onApiLoginSuccess={(authResponse) => {
            setIsLoginModalOpen(false);
            setIsAuthenticated(true);
            if (authResponse?.token) {
              localStorage.setItem('token', authResponse.token);
            }
            const role = normalizeSystemRole(authResponse?.user?.role);
            setCurrentRole(role);
            setCurrentUserInfo({
              id: authResponse?.user?.id,
              name:
                authResponse?.user?.fullName ||
                authResponse?.user?.email?.split('@')[0] ||
                'User',
              email: authResponse?.user?.email || '',
              role,
              isTwoFactorEnabled: authResponse?.user?.isTwoFactorEnabled,
            });
            if (authResponse?.user) {
              localStorage.setItem('user', JSON.stringify(authResponse.user));
            }
            localStorage.setItem('userRole', role);
            navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
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
                authResponse?.user?.fullName ||
                authResponse?.user?.email?.split('@')[0] ||
                'User',
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
          showToast(
            'Bảo mật 2FA',
            'Đã kích hoạt thành công Google Authenticator cho tài khoản!',
          );
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
