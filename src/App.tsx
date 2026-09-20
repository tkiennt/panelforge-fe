import React, { useState, useEffect } from 'react';
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
} from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { WorkflowBoardView } from './views/WorkflowBoardView';
import { SeriesBibleView } from './views/SeriesBibleView';
import { MembersRolesView } from './views/MembersRolesView';
import { ContentHubView } from './views/ContentHubView';
import { SpreadWorkbenchModal } from './components/modals/SpreadWorkbenchModal';
import { PageDetailModal } from './components/modals/PageDetailModal';
import { ExportDeliveryModal } from './components/modals/ExportDeliveryModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { VectorStatusModal } from './components/modals/VectorStatusModal';
import { AuditLogModal } from './components/modals/AuditLogModal';
import { InviteMemberModal } from './components/modals/InviteMemberModal';
import { AddEntityModal } from './components/modals/AddEntityModal';
import { NewPageCardModal } from './components/modals/NewPageCardModal';
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
import { ProductionPipelineView } from './views/ProductionPipelineView';
import { ScriptEditorView } from './views/ScriptEditorView';

import { MockRoleWorkspaceView } from './views/MockRoleWorkspaceView';
import {
  AdminDashboardView,
  AdminUserManagementView,
  AdminSystemSettingsView,
  AdminAuditLogView,
} from './views/admin';

import { ProducerWorkspaceView } from './views/producer';
import { ArtistDeskView } from './views/artist';
import { LettererCanvasView } from './views/letterer';
import { WriterStudioView } from './views/writer';
import { EditorDeskView } from './views/editor';
import { ReaderPortalView } from './views/reader';

import { SystemRole, normalizeSystemRole } from './types';
import { LoginModal } from './components/modals/LoginModal';
import { RegisterModal } from './components/modals/RegisterModal';
import { TwoFactorSetupModal } from './components/modals/TwoFactorSetupModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { LandingPageView } from './views/LandingPageView';
import { UserProfile } from './views/UserProfile';
import { auth, onAuthStateChanged } from './firebase';
import { User } from 'firebase/auth';
import { authService } from './services/auth.service';

interface Toast {
  id: string;
  title: string;
  desc: string;
}

export default function App() {
  // ---> STATE QUẢN LÝ ĐĂNG NHẬP VÀ ĐIỀU HƯỚNG BÊN NGOÀI <---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // ---> THÊM STATE CHO DEMO ROLE <---
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsAuthenticated(true);
        // Tự động đồng bộ JWT token backend nếu chưa có trong localStorage
        const existingToken = localStorage.getItem('token');
        if (!existingToken) {
          try {
            const idToken = await user.getIdToken();
            const res = await authService.externalLogin(idToken);
            if (res?.token) {
              localStorage.setItem('token', res.token);
            }
          } catch (err) {
            console.warn('Không thể đồng bộ token backend từ Firebase session:', err);
          }
        }
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Navigation & Data State
  const [viewScope, setViewScope] = useState<'hub' | 'project'>('hub');
  const [currentView, setCurrentView] = useState<ViewMode | string>('dashboard');
  const [currentRole, setCurrentRole] = useState<SystemRole>('ARTIST');
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id?: string;
    name: string;
    email: string;
    role: SystemRole;
    isTwoFactorEnabled?: boolean;
  } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const navigateRoleDefaultView = (role: SystemRole) => {
    switch (role) {
      case 'ADMINISTRATOR':
        setCurrentView('admin-dash');
        break;
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
      case 'READER':
        setCurrentView('reader');
        break;
      default:
        setCurrentView('dashboard');
    }
  };

  // Khôi phục vai trò từ localStorage hoặc giải mã JWT token khi tải lại trang
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
      const role = normalizeSystemRole(savedRole);
      setCurrentRole(role);
    }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const role = normalizeSystemRole(u.role);
        setCurrentRole(role);
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
      try {
        const parts = savedToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const roleClaim =
            payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
          if (roleClaim) {
            const role = normalizeSystemRole(roleClaim);
            setCurrentRole(role);
            localStorage.setItem('userRole', role);
          }
        }
      } catch {
        // bỏ qua lỗi giải mã
      }
    }
  }, []);

  useEffect(() => {
    if (viewScope === 'project') {
      navigateRoleDefaultView(currentRole);
    }
  }, [currentRole, viewScope]);

  const [projects, setProjects] = useState<MangaProject[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<MangaProject>(INITIAL_PROJECTS[0]);
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_KANBAN_CARDS);
  const [entities, setEntities] = useState<BibleEntity[]>(INITIAL_BIBLE_ENTITIES);
  const [members, setMembers] = useState<StudioMember[]>(INITIAL_MEMBERS);
  const [provenanceLogs, setProvenanceLogs] = useState(INITIAL_PROVENANCE_LOGS);
  const [assistants] = useState(INITIAL_ASSISTANTS);

  // Modals
  const [spreadModalOpen, setSpreadModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [vectorStatusOpen, setVectorStatusOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [addEntityOpen, setAddEntityOpen] = useState(false);
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

  const handleEnterProject = (proj: MangaProject, targetView: ViewMode | string = 'dashboard') => {
    setActiveProject(proj);
    setCurrentView(targetView);
    setViewScope('project');
    showToast('Entered Studio Workspace', `Active workspace: ${proj.title}`);
  };

  const handleReturnToHub = () => {
    setViewScope('hub');
    showToast('Returned to Hub', 'Back to Publications Catalog.');
  };

  const handleEnterDemo = (role: string) => {
    if (role === 'landing') {
      setDemoRole(null);
      setIsDemoMode(false);
      return;
    }
    const mappedRole = normalizeSystemRole(role);
    setDemoRole(role);
    setIsDemoMode(true);
    setCurrentRole(mappedRole);
    setViewScope('project'); // Always enter project to show App Shell
    navigateRoleDefaultView(mappedRole);
    showToast('Chế độ Demo Role', `Đang xem giao diện với quyền ${mappedRole}`);
  };

  const handleLogout = () => {
    auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setFirebaseUser(null);
    setCurrentUserInfo(null);
    setIsAuthenticated(false);
    setIsDemoMode(false);
    showToast('Đăng xuất', 'Đã đăng xuất khỏi phiên làm việc.');
  };

  return (
    <div className='min-h-screen bg-[#F8F6F0] text-[#171717] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C] relative'>
      {/* ---> KHU VỰC BÊN NGOÀI (CHƯA ĐĂNG NHẬP HOẶC KHÔNG PHẢI DEMO) <--- */}
      {!isAuthenticated && !isDemoMode ? (
        <>
          {authMode === 'landing' && (
            <LandingPageView
              onEnterDemo={handleEnterDemo}
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onOpenRegister={() => setIsRegisterModalOpen(true)}
            />
          )}

          {isLoginModalOpen && (
            <LoginModal
              onClose={() => setIsLoginModalOpen(false)}
              onLogin={(username, password) => {
                const mockAccounts: Record<string, SystemRole> = {
                  admin: 'ADMINISTRATOR',
                  administrator: 'ADMINISTRATOR',
                  producer: 'PRODUCER',
                  writer: 'WRITER',
                  artist: 'ARTIST',
                  letterer: 'LETTERER',
                  editor: 'EDITOR',
                  reader: 'READER',
                };

                // Trích xuất tên người dùng từ email
                const name = username.split('@')[0].toLowerCase();
                const roleMatched = mockAccounts[name] || mockAccounts[username.toLowerCase()];

                if (roleMatched && password === '123456') {
                  setIsAuthenticated(true);
                  setCurrentRole(roleMatched);
                  setCurrentUserInfo({
                    name: username.split('@')[0],
                    email: username,
                    role: roleMatched,
                  });
                  localStorage.setItem('userRole', roleMatched);
                  setViewScope('project');
                  setIsLoginModalOpen(false);
                  navigateRoleDefaultView(roleMatched);
                  showToast(
                    'Đăng nhập thành công',
                    `Chào mừng bạn trở lại với vai trò ${roleMatched}.`,
                  );
                } else {
                  showToast(
                    'Lỗi xác thực',
                    'Tài khoản không tồn tại hoặc sai mật khẩu. Hãy thử: writer, artist, editor, producer, admin, letterer, reader (mật khẩu: 123456).',
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
                setViewScope('project');
                navigateRoleDefaultView(role);
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
                setViewScope('project');
                navigateRoleDefaultView(role);
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
                setViewScope('project');
                navigateRoleDefaultView(role);
                showToast(
                  'Kích hoạt thành công',
                  `Chào mừng ${authResponse?.user?.fullName || 'bạn'} (Vai trò: ${role})!`,
                );
              }}
            />
          )}
        </>
      ) : (
        /* ---> KHU VỰC BÊN TRONG HỆ THỐNG (ĐÃ ĐĂNG NHẬP THEO PHÂN QUYỀN RBAC) <--- */
        <>
          {viewScope === 'hub' ? (
            <div className='h-screen w-full overflow-y-auto custom-scrollbar bg-[#FAF8F4]'>
              <ContentHubView
                projects={projects}
                onSelectProject={(proj) => setActiveProject(proj)}
                onEnterProject={handleEnterProject}
                onCreateNewProject={handleCreateNewProject}
                onOpenExportModal={() => setExportModalOpen(true)}
                isRootView={true}
              />
            </div>
          ) : (
            <GlobalAppShell
              currentUser={{
                name:
                  currentUserInfo?.name ||
                  firebaseUser?.displayName ||
                  firebaseUser?.email?.split('@')[0] ||
                  'Tatsuki F.',
                role: currentRole,
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
              onNavigate={(href) => {
                if (href === 'publications') handleReturnToHub();
                else setCurrentView(href);
              }}
              onLogout={handleLogout}
              onLeaveFeedback={() => showToast('Feedback', 'Thanks for your feedback!')}
              onOpenTwoFactor={() => setIsTwoFactorModalOpen(true)}
              onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
            >
              <div className='w-full min-h-full flex-1 relative flex flex-col'>
                {/* 1. PRODUCER: WORKSPACES & PIPELINE */}
                {currentView === 'workspaces' && <ProducerWorkspaceView />}
                {(currentView === 'dashboard' || currentView === 'workflow') && (
                  <ProductionPipelineView
                    currentUserRole={currentRole as any}
                    onShowToast={showToast}
                    isReaderMode={currentRole === 'READER'}
                  />
                )}

                {/* 2. WRITER: SCRIPT STUDIO & AI BREAKDOWN */}
                {(currentView === 'script' ||
                  currentView === 'ai-breakdown' ||
                  currentView === 'compare') && <WriterStudioView onShowToast={showToast} />}

                {/* 3. ARTIST: PAGES DESK & CANVAS (PagesController) */}
                {(currentView === 'layout' ||
                  currentView === 'queue' ||
                  currentView === 'upload' ||
                  currentView === 'requests') && <ArtistDeskView />}

                {/* 4. LETTERER: PANEL CANVAS & ELEMENTS (ElementsController) */}
                {(currentView === 'canvas' ||
                  currentView === 'warnings' ||
                  currentView === 'presets') && <LettererCanvasView />}

                {/* 5. EDITOR: REVIEW & CONSISTENCY CHECK */}
                {(currentView === 'review' || currentView === 'check') && <EditorDeskView />}

                {/* 6. READER: PREVIEW PORTAL */}
                {currentView === 'reader' && <ReaderPortalView />}

                {/* 7. SERIES BIBLE REPOSITORY */}
                {currentView === 'bible' && (
                  <SeriesBibleView
                    activeProject={activeProject}
                    entities={entities}
                    onAddEntity={() => setAddEntityOpen(true)}
                    onViewVectorStatus={() => setVectorStatusOpen(true)}
                    onEditEntity={(e) => showToast('Series Bible', `Mở chi tiết ${e.name}`)}
                    onShowToast={showToast}
                  />
                )}

                {/* 8. MEMBERS & STUDIO ROLES (PRODUCER) */}
                {currentView === 'members' && (
                  <MembersRolesView
                    activeProject={activeProject}
                    members={members}
                    onInviteMember={() => setInviteMemberOpen(true)}
                    onUpdateMemberRole={(memberId, newRole) => {
                      setMembers((prev) =>
                        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
                      );
                      showToast('Cập nhật quyền', `Đã phân quyền ${newRole} cho thành viên`);
                    }}
                    onShowToast={showToast}
                  />
                )}

                {/* 9. SYSTEM ADMIN SCREENS (ADMINISTRATOR) */}
                {currentView === 'admin-dash' && (
                  <AdminDashboardView
                    onNavigateToUsers={() => setCurrentView('users')}
                    onNavigateToSettings={() => setCurrentView('ai-quota')}
                    onNavigateToAudit={() => setCurrentView('audit')}
                  />
                )}

                {(currentView === 'users' || currentView === 'roles') && (
                  <AdminUserManagementView />
                )}

                {(currentView === 'ai-quota' ||
                  currentView === 'storage' ||
                  currentView === 'master-data') && <AdminSystemSettingsView />}

                {currentView === 'audit' && <AdminAuditLogView />}
              </div>
            </GlobalAppShell>
          )}

          {/* Các Modals */}
          <SpreadWorkbenchModal
            isOpen={spreadModalOpen}
            onClose={() => setSpreadModalOpen(false)}
            onShowToast={showToast}
            userRole={currentRole}
          />
          <PageDetailModal
            card={selectedCardForDetail}
            onClose={() => setSelectedCardForDetail(null)}
            onUpdateStage={handleUpdateCardStage}
            onShowToast={showToast}
          />
          <ExportDeliveryModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            activeProject={activeProject}
            onShowToast={showToast}
          />
          <CommandPaletteModal
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onNavigateView={setCurrentView}
            onSelectCard={(c) => setSelectedCardForDetail(c)}
            onSelectEntity={(e) => {
              setCurrentView('bible');
              showToast('Entity Selected', `Navigated to ${e.name}`);
            }}
            cards={cards}
            entities={entities}
          />
          <VectorStatusModal
            isOpen={vectorStatusOpen}
            onClose={() => setVectorStatusOpen(false)}
            onShowToast={showToast}
          />
          <AuditLogModal
            isOpen={auditLogOpen}
            onClose={() => setAuditLogOpen(false)}
            logs={provenanceLogs}
            onShowToast={showToast}
          />
          <InviteMemberModal
            isOpen={inviteMemberOpen}
            onClose={() => setInviteMemberOpen(false)}
            onInvite={handleInviteMember}
            onShowToast={showToast}
          />
          <AddEntityModal
            isOpen={addEntityOpen}
            onClose={() => setAddEntityOpen(false)}
            onAdd={handleAddEntity}
            onShowToast={showToast}
          />
          <NewPageCardModal
            isOpen={newCardOpen}
            onClose={() => setNewCardOpen(false)}
            onAddCard={handleAddCard}
            onShowToast={showToast}
          />
          <TwoFactorSetupModal
            isOpen={isTwoFactorModalOpen}
            onClose={() => setIsTwoFactorModalOpen(false)}
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
              showToast(
                'Change Password',
                'Account password updated successfully!',
              );
            }}
          />
        </>
      )}

      {/* ===== GLOBAL FLOATING PREVIEW WIDGET (visible on all pages) ===== */}
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
