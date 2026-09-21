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
import { ReviewView } from './views/ReviewView';
import { GlobalAppShell } from './layouts/GlobalAppShell';
import { ProductionPipelineView } from './views/ProductionPipelineView';

// --- IMPORT FILE WRITER WORKSPACE VÀ ARTIST WORKSPACE Ở ĐÂY ---
import WriterWorkspace from './components/modals/roles/WriterWorkspace';
import ArtistWorkspace from './components/modals/roles/ArtistWorkspace';
// ----------------------------------------------------------------

// Import các màn hình mới
import { MyProjectsView } from './views/producer/MyProjectsView';
import { ProjectMembersView } from './views/producer/ProjectMembersView';

import { MockRoleWorkspaceView } from './views/MockRoleWorkspaceView';

<<<<<<< Updated upstream
=======
// Import các trang mới của Producer
import { MyProjectsView } from './views/producer/MyProjectsView';
import { ProjectDetailView } from './views/producer/ProjectDetailView';

import { ArtistDeskView } from './views/artist';
import { LettererCanvasView } from './views/letterer';
import { WriterStudioView } from './views/writer';
import { EditorDeskView } from './views/editor';
import { ReaderPortalView } from './views/reader';

import { SystemRole, normalizeSystemRole } from './types';
>>>>>>> Stashed changes
import { LoginModal } from './components/modals/LoginModal';
import { LandingPageView } from './views/LandingPageView';
import { UserProfile } from './views/UserProfile';
import { auth, onAuthStateChanged } from './firebase';
import { User } from 'firebase/auth';

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsAuthenticated(true);
<<<<<<< Updated upstream
=======
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
>>>>>>> Stashed changes
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Navigation & Data State
  const [viewScope, setViewScope] = useState<'hub' | 'project'>('hub');
  const [currentView, setCurrentView] = useState<ViewMode | string>('dashboard');
<<<<<<< Updated upstream
  const [currentRole, setCurrentRole] = useState<'WRITER' | 'ARTIST' | 'EDITOR' | 'PRODUCER'>(
    'ARTIST',
  );
=======
  const [currentRole, setCurrentRole] = useState<SystemRole>('ARTIST');
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id?: string;
    name: string;
    email: string;
    role: SystemRole;
  } | null>(null);

  const navigateRoleDefaultView = (role: SystemRole) => {
    switch (role) {
      case 'ADMINISTRATOR':
        setCurrentView('admin-dash');
        break;
      case 'PRODUCER':
<<<<<<< Updated upstream
        setCurrentView('dashboard'); // <-- TRẢ LẠI THÀNH 'dashboard' ĐỂ KHỚP VỚI MENU
=======
        setCurrentView('my-projects'); // Cập nhật màn hình mặc định mới cho Producer
>>>>>>> Stashed changes
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

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
      const role = normalizeSystemRole(savedRole);
      setCurrentRole(role);
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
>>>>>>> Stashed changes

  useEffect(() => {
    if (viewScope === 'project') {
      switch (currentRole) {
        case 'WRITER':
          setCurrentView('script'); 
          break;
        case 'ARTIST':
          setCurrentView('dashboard'); 
          break;
        case 'EDITOR':
          setCurrentView('review'); 
          break;
        default:
          setCurrentView('dashboard');
      }
    }
  }, [currentRole, viewScope]);

  const [projects, setProjects] = useState<MangaProject[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<MangaProject>(INITIAL_PROJECTS[0]);
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_KANBAN_CARDS);
  const [entities, setEntities] = useState<BibleEntity[]>(INITIAL_BIBLE_ENTITIES);
  const [members, setMembers] = useState<StudioMember[]>(INITIAL_MEMBERS);
  const [provenanceLogs, setProvenanceLogs] = useState(INITIAL_PROVENANCE_LOGS);

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

  // Toast System
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (title: string, desc: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, title, desc }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

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
    setDemoRole(role);
    setIsDemoMode(true);
<<<<<<< Updated upstream
    setCurrentRole(role.toUpperCase() as any);
    setViewScope('project'); // Always enter project to show App Shell
=======
    setCurrentRole(mappedRole);
    setViewScope('project');
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
>>>>>>> Stashed changes
  };

  return (
    <div className='min-h-screen bg-[#F8F6F0] text-[#171717] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C] relative'>
      {!isAuthenticated && !isDemoMode ? (
        <>
          {authMode === 'landing' && (
            <LandingPageView
              onEnterDemo={handleEnterDemo}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {isLoginModalOpen && (
            <LoginModal
              onClose={() => setIsLoginModalOpen(false)}
              onLogin={(username, password) => {
<<<<<<< Updated upstream
                const mockAccounts: Record<string, 'WRITER' | 'ARTIST' | 'EDITOR'> = {
=======
                const mockAccounts: Record<string, SystemRole> = {
                  admin: 'ADMINISTRATOR',
                  producer: 'PRODUCER',
>>>>>>> Stashed changes
                  writer: 'WRITER',
                  artist: 'ARTIST',
                  editor: 'EDITOR',
                };
                const name = username.split('@')[0].toLowerCase();
                const roleMatched = mockAccounts[name] || mockAccounts[username.toLowerCase()];

                if (roleMatched && password === '123456') {
                  setIsAuthenticated(true);
                  setCurrentRole(roleMatched);
                  setViewScope('project');
                  setIsLoginModalOpen(false);

                  switch (roleMatched) {
                    case 'WRITER':
                      setCurrentView('script');
                      break;
                    case 'ARTIST':
                      setCurrentView('dashboard');
                      break;
                    case 'EDITOR':
                      setCurrentView('review');
                      break;
                  }
                  showToast(
                    'Đăng nhập thành công',
                    `Chào mừng bạn trở lại với vai trò ${roleMatched}.`,
                  );
                } else {
<<<<<<< Updated upstream
                  showToast(
                    'Lỗi xác thực',
                    'Tài khoản không tồn tại hoặc sai mật khẩu. Hãy thử: writer, artist, editor.',
                  );
=======
                  showToast('Lỗi xác thực', 'Tài khoản không tồn tại hoặc sai mật khẩu.');
>>>>>>> Stashed changes
                }
              }}
              onGoogleLogin={(user) => {
                setIsLoginModalOpen(false);
<<<<<<< Updated upstream
                showToast('Đăng nhập thành công', `Chào mừng ${user.displayName || user.email}`);
=======
                setIsRegisterModalOpen(true);
              }}
              onGoogleLogin={(res) => {
                /* Xử lý google login */
              }}
              onApiLoginSuccess={(authResponse) => {
                /* Xử lý API login */
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
                /* Xử lý đăng ký thành công */
>>>>>>> Stashed changes
              }}
            />
          )}
        </>
      ) : firebaseUser ? (
        <UserProfile user={firebaseUser} onLogout={() => setFirebaseUser(null)} />
      ) : (
<<<<<<< Updated upstream
        /* ---> KHU VỰC BÊN TRONG HỆ THỐNG (ĐÃ ĐĂNG NHẬP DEMO TRUYỀN THỐNG) <--- */
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                name: firebaseUser
                  ? firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
                  : 'Tatsuki F.',
                role: currentRole as any,
                avatarInitials: firebaseUser
                  ? (firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()
                  : 'TF',
=======
                name: currentUserInfo?.name || firebaseUser?.displayName || 'Tatsuki F.',
                role: currentRole,
                avatarInitials: (currentUserInfo?.name || currentRole || 'U')
                  .charAt(0)
                  .toUpperCase(),
>>>>>>> Stashed changes
              }}
              activeSeries={activeProject}
              aiState='active'
              onNavigate={(href) => {
                if (href === 'publications') handleReturnToHub();
                else setCurrentView(href);
              }}
              onLogout={() => {
                auth.signOut();
                setFirebaseUser(null);
                setIsAuthenticated(false);
              }}
              onLeaveFeedback={() => showToast('Feedback', 'Thanks for your feedback!')}
            >
<<<<<<< Updated upstream
<<<<<<< Updated upstream
              <div className='w-full h-full relative overflow-hidden'>
                
                {/* --- RENDER THEO ROLE Ở ĐÂY --- */}
                {currentView === 'dashboard' && currentRole === 'ARTIST' && (
                  <ArtistWorkspace />
                )}

                {currentView === 'script' && currentRole === 'WRITER' && (
                  <WriterWorkspace />
                )}

                {/* Render bảng Pipeline tổng quan cho các role khác (như PRODUCER, READER...) */}
                {currentView === 'dashboard' && currentRole !== 'ARTIST' && (
=======
              <div className='w-full min-h-full flex-1 relative flex flex-col'>
                {/* ---> 1. PRODUCER: QUẢN LÝ STUDIO (GIAO DIỆN MỚI) <--- */}
                {currentView === 'my-projects' && <MyProjectsView />}
                {currentView === 'project-members' && <ProjectMembersView />}
                {currentView === 'publish-manga' && (
                  <div className='p-6 text-[#171717]'>Giao diện Xuất bản truyện sẽ đặt ở đây</div>
                )}

                {/* Giữ lại fallback giao diện Workflow (nếu có routing đến từ chỗ khác) */}
                {(currentView === 'dashboard' || currentView === 'workflow') && (
>>>>>>> Stashed changes
                  <ProductionPipelineView
                    currentUserRole={currentRole as any}
                    onShowToast={showToast}
                    isReaderMode={currentRole === 'READER'}
                  />
                )}
                {currentView === 'workspaces' && <ProducerWorkspaceView />}

                {currentView === 'review' && (
                  <div className='p-4'>Editor Workspace (Placeholder)</div>
                )}
                {/* ------------------------------- */}
                
=======
              <div className='w-full min-h-full flex-1 relative flex flex-col'>
                {/* ---> CÁC TRANG DÀNH CHO PRODUCER <--- */}
                {currentView === 'dashboard' && (
                  <MyProjectsView
                    projects={projects}
                    onNavigateToDetail={(proj) => {
                      setActiveProject(proj);
                      setCurrentView('project-detail');
                    }}
                  />
                )}

                {currentView === 'project-detail' && (
                  <ProjectDetailView
                    project={activeProject}
                    onBack={() => setCurrentView('dashboard')}
                  />
                )}

<<<<<<< Updated upstream
=======
                {/* 8. MEMBERS & STUDIO ROLES */}
>>>>>>> Stashed changes
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

                {currentView === 'publishing' && (
                  <div className='flex-1 flex flex-col items-center justify-center text-[#888888] p-8'>
                    <BookOpen className='w-16 h-16 mb-4 text-[#E7E7E7]' />
                    <h2 className='text-xl font-bold text-[#171717] mb-2'>Xuất bản truyện</h2>
                    <p className='text-sm'>Tính năng xuất bản và phân phối đang được phát triển.</p>
                  </div>
                )}

                {/* 2. WRITER: SCRIPT STUDIO & AI BREAKDOWN */}
                {(currentView === 'script' ||
                  currentView === 'ai-breakdown' ||
                  currentView === 'compare') && <WriterStudioView onShowToast={showToast} />}

                {/* 3. ARTIST: PAGES DESK & CANVAS */}
                {(currentView === 'layout' ||
                  currentView === 'queue' ||
                  currentView === 'upload' ||
                  currentView === 'requests') && <ArtistDeskView />}

                {/* 4. LETTERER: PANEL CANVAS & ELEMENTS */}
                {(currentView === 'canvas' ||
                  currentView === 'warnings' ||
                  currentView === 'presets') && <LettererCanvasView />}

                {/* 5. EDITOR: REVIEW & CONSISTENCY CHECK */}
                {(currentView === 'review' || currentView === 'check') && <EditorDeskView />}

                {/* 6. READER: PREVIEW PORTAL */}
                {currentView === 'reader' && <ReaderPortalView />}

                {/* 7. SERIES BIBLE REPOSITORY (CHO MỌI ROLE) */}
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
>>>>>>> Stashed changes
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
        </>
      )}

      {/* ===== GLOBAL FLOATING PREVIEW WIDGET ===== */}
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
                    className={`w-9 h-9 rounded-full transition flex items-center justify-center text-sm cursor-pointer ${isActive ? 'bg-[#171717] text-white' : 'text-[#404040] hover:text-[#f97316] hover:bg-[#fff7ed]'}`}
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