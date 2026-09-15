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
import { CheckCircle2 } from 'lucide-react';
import { ScriptView } from './views/ScriptView';
import { ReviewView } from './views/ReviewView';

// ---> IMPORT CÁC TRANG BÊN NGOÀI HỆ THỐNG <---
import { LoginView } from './views/LoginView';
import { LandingPageView } from './views/LandingPageView';

interface Toast {
  id: string;
  title: string;
  desc: string;
}

export default function App() {
  // ---> STATE QUẢN LÝ ĐĂNG NHẬP VÀ ĐIỀU HƯỚNG BÊN NGOÀI <---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>('landing');

  // Navigation & Data State
  const [viewScope, setViewScope] = useState<'hub' | 'project'>('hub');
  const [currentView, setCurrentView] = useState<ViewMode | string>('dashboard');
  const [currentRole, setCurrentRole] = useState<'WRITER' | 'ARTIST' | 'EDITOR'>('ARTIST');

  useEffect(() => {
    if (viewScope === 'project') {
      if (currentRole === 'WRITER') setCurrentView('script');
      else if (currentRole === 'EDITOR') setCurrentView('review');
      else setCurrentView('dashboard');
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

  return (
    <div className='h-screen bg-[#F8F6F0] text-[#171717] font-sans antialiased overflow-hidden selection:bg-[#F97316]/20 selection:text-[#EA580C]'>
      {/* ---> KHU VỰC BÊN NGOÀI (CHƯA ĐĂNG NHẬP) <--- */}
      {!isAuthenticated ? (
        <>
          {authMode === 'landing' && (
            <LandingPageView
              projects={projects}
              onLoginClick={() => setAuthMode('login')}
              onRegisterClick={() => setAuthMode('register')}
            />
          )}

          {(authMode === 'login' || authMode === 'register') && (
            <LoginView
              mode={authMode}
              onBack={() => setAuthMode('landing')}

              // Nhận username và password từ LoginView truyền lên
              onLogin={(username, password) => {
                // MOCK DATA: Định nghĩa các tài khoản ảo
                const mockAccounts: Record<string, 'WRITER' | 'ARTIST' | 'EDITOR'> = {
                  writer: 'WRITER',
                  artist: 'ARTIST',
                  editor: 'EDITOR',
                };

                const roleMatched = mockAccounts[username.toLowerCase()];

                // Giả lập kiểm tra mật khẩu luôn là '123456'
                if (roleMatched && password === '123456') {
                  setIsAuthenticated(true);
                  setCurrentRole(roleMatched); // Tự động set Role đúng với tài khoản
                  showToast(
                    authMode === 'login' ? 'Đăng nhập thành công' : 'Đăng ký thành công',
                    `Chào mừng bạn trở lại với vai trò ${roleMatched}.`,
                  );
                } else {
                  // Nếu sai tài khoản hoặc mật khẩu
                  showToast(
                    'Lỗi xác thực',
                    'Tài khoản không tồn tại hoặc sai mật khẩu. Hãy thử: writer, artist, editor.',
                  );
                }
              }}
            />
          )}
        </>
      ) : (
        /* ---> KHU VỰC BÊN TRONG HỆ THỐNG (ĐÃ ĐĂNG NHẬP) <--- */
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
            <div className='flex h-screen overflow-hidden'>
              <Sidebar
                currentView={currentView}
                userRole={currentRole}
                onSelectView={(view) => {
                  if (view === 'publications') handleReturnToHub();
                  else setCurrentView(view);
                }}
                activeProject={activeProject}
                projects={projects}
                onSelectProject={(proj) => {
                  setActiveProject(proj);
                  showToast('Project Switched', `Active workspace switched to ${proj.title}.`);
                }}
                onReturnToHub={handleReturnToHub}
                onOpenSettings={() =>
                  showToast(
                    'Studio Settings',
                    'LoRA weights and tankōbon export resolutions are calibrated.',
                  )
                }
                onOpenHelp={() =>
                  showToast('Help & Reference', 'PanelForge documentation is up to date.')
                }
                onOpenStorageModal={() =>
                  showToast('Storage Vault', '15.6 GB of 20 GB 600 DPI cloud storage used.')
                }
              />

              <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
                <Header
                  currentView={currentView as ViewMode}
                  activeProject={activeProject}
                  onReturnToHub={handleReturnToHub}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  onOpenAiEngineModal={() => setVectorStatusOpen(true)}
                  onOpenExportModal={() => setExportModalOpen(true)}
                />

                <main className='flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar'>
                  {currentView === 'dashboard' && (
                    <DashboardView
                      activeProject={activeProject}
                      assistants={assistants}
                      provenanceLogs={provenanceLogs}
                      onOpenSpreadModal={() => setSpreadModalOpen(true)}
                      onOpenCanvasModal={() => setSpreadModalOpen(true)}
                      onRunAiAudit={() =>
                        showToast('LoRA Audit Passed', 'Verified 99.4% continuity.')
                      }
                      onExportReport={() => setExportModalOpen(true)}
                      onConfigureAnchors={() => setVectorStatusOpen(true)}
                      onViewAuditLog={() => setAuditLogOpen(true)}
                      onManageAssignments={() => setCurrentView('members')}
                    />
                  )}
                  {currentView === 'workflow' && (
                    <WorkflowBoardView
                      activeProject={activeProject}
                      cards={cards}
                      onUpdateCardStage={handleUpdateCardStage}
                      onOpenCardDetails={(card) => setSelectedCardForDetail(card)}
                      onOpenExportModal={() => setExportModalOpen(true)}
                      onOpenNewCardModal={() => setNewCardOpen(true)}
                      onShowToast={showToast}
                    />
                  )}
                  {currentView === 'bible' && (
                    <SeriesBibleView
                      activeProject={activeProject}
                      entities={entities}
                      onAddEntity={() => setAddEntityOpen(true)}
                      onViewVectorStatus={() => setVectorStatusOpen(true)}
                      onEditEntity={(entity) =>
                        showToast('Edit Entity', `Editing canon for ${entity.name}.`)
                      }
                      onShowToast={showToast}
                    />
                  )}
                  {currentView === 'members' && (
                    <MembersRolesView
                      activeProject={activeProject}
                      members={members}
                      onInviteMember={() => setInviteMemberOpen(true)}
                      onUpdateMemberRole={(id, role, updatedPermissions) => {
                        setMembers((prev) =>
                          prev.map((m) =>
                            m.id === id
                              ? { ...m, role, permissions: updatedPermissions || m.permissions }
                              : m,
                          ),
                        );
                        showToast('Access Updated', `Updated permissions.`);
                      }}
                      onShowToast={showToast}
                    />
                  )}
                  {currentView === 'publications' && (
                    <ContentHubView
                      projects={projects}
                      onSelectProject={(proj) => {
                        setActiveProject(proj);
                        setCurrentView('dashboard');
                      }}
                      onEnterProject={handleEnterProject}
                      onCreateNewProject={handleCreateNewProject}
                      onOpenExportModal={() => setExportModalOpen(true)}
                      isRootView={false}
                    />
                  )}
                  {currentView === 'script' && <ScriptView />}
                  {currentView === 'review' && <ReviewView />}
                </main>
              </div>
            </div>
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

          {/* Thanh giả lập Role */}
          <div className='fixed bottom-5 left-5 z-50 bg-white border border-[#E7E7E7] p-2 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs animate-in slide-in-from-bottom-5'>
            <span className='px-2 font-bold text-[#888888] uppercase tracking-wider text-[10px]'>
              Simulate Role:
            </span>
            {(['WRITER', 'ARTIST', 'EDITOR'] as const).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setCurrentRole(role);
                  showToast('Role Switched', `You are now viewing as ${role}.`);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  currentRole === role
                    ? 'bg-[#F97316] text-white shadow-md'
                    : 'bg-[#F8F6F0] text-[#555555] hover:bg-[#EAE8E0] hover:text-[#171717]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </>
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
