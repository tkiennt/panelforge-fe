import React from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { AppShell } from './AppShell';
import { WorkspaceView } from '@/shared/features/production-workspace/WorkspaceView';
import { TaskEditorView } from '@/shared/features/production-workspace/TaskEditorView';
import { ExportView } from '@/roles/producer/views/ExportView';
import { DashboardView } from '@/roles/producer/views/DashboardView';
import { ProducerWorkspaceView } from '@/roles/producer/views/ProducerWorkspaceView';
import { AdminDashboard } from '@/roles/admin/views';
import { ArtistDeskView } from '@/roles/artist/views/ArtistDeskView';
import { ReviewView } from '@/roles/editor/views/ReviewView';
import { NotificationCenterView } from '@/shared/views/NotificationCenterView';
import { ReaderPortalView } from '@/roles/reader/views/ReaderPortalView';
import { PublicCatalogView } from '@/roles/reader/views/PublicCatalogView';
import { PublicPreviewView } from '@/roles/reader/views/PublicPreviewView';
import { LandingPageView } from '@/roles/guest/views/LandingPageView';
import { WorkspaceListView } from '@/shared/views/WorkspaceListView';
import { UserProfileView } from '@/shared/views/UserProfileView';
import { SeriesBibleView } from '@/shared/features/series-bible/SeriesBibleView';
import { AiMultiAgentView } from '@/shared/features/ai-agents/AiMultiAgentView';
import { MyWorkView } from '@/shared/features/collaboration/MyWorkView';
import { PublisherDeskView } from '@/roles/publisher/views/PublisherDeskView';
import { ScriptEditorView } from '@/roles/writer/views/ScriptEditorView';
import LettererWorkspace from '@/roles/letterer/views/LettererWorkspace';
import {
  SystemRole,
  WorkspaceRole,
  WorkspaceDto,
  MangaProject,
  StudioMember,
  BibleEntity,
  getRoleFromToken,
} from '@/types';

export const PrivateRoute = ({
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

export const AdminRoute = ({
  activeRoles,
  currentRole,
  children,
}: {
  activeRoles?: any[];
  currentRole?: any;
  children: React.ReactNode;
}) => {
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

export interface AppRoutesProps {
  isAuthenticated: boolean;
  defaultRedirectPath: string;
  handleSelectWorkspace: (ws: WorkspaceDto) => Promise<void>;
  currentUserInfo: {
    id?: string;
    name: string;
    email: string;
    role: SystemRole;
    canCreateStudio?: boolean;
    isTwoFactorEnabled?: boolean;
  } | null;
  firebaseUser: User | null;
  currentRole: SystemRole;
  currentWorkspaceRole: WorkspaceRole | null;
  activeProjectRoles: string[];
  activeWorkspace: WorkspaceDto | null;
  activeProject: MangaProject | null;
  setActiveProject: (p: MangaProject) => void;
  handleLogout: () => void;
  showToast: (title: string, desc: string) => void;
  setIsTwoFactorModalOpen: (open: boolean) => void;
  setIsChangePasswordModalOpen: (open: boolean) => void;
  setIsLoginModalOpen: (open: boolean) => void;
  setIsRegisterModalOpen: (open: boolean) => void;
  members: StudioMember[];
  setMembers: React.Dispatch<React.SetStateAction<StudioMember[]>>;
  handleInviteMember: (m: StudioMember) => void;
  assistants: any[];
  provenanceLogs: any[];
  handleAddEntity: (e: BibleEntity) => void;
  isDevMode?: boolean;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  isAuthenticated,
  defaultRedirectPath,
  handleSelectWorkspace,
  currentUserInfo,
  firebaseUser,
  currentRole,
  currentWorkspaceRole,
  activeProjectRoles,
  activeWorkspace,
  activeProject,
  setActiveProject,
  handleLogout,
  showToast,
  setIsTwoFactorModalOpen,
  setIsChangePasswordModalOpen,
  setIsLoginModalOpen,
  setIsRegisterModalOpen,
  members,
  setMembers,
  handleInviteMember,
  assistants,
  provenanceLogs,
  handleAddEntity,
  isDevMode = false,
}) => {
  const navigate = useNavigate();

  return (
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

      {/* CF5: Public Preview Link Route (No Auth Guard, No Bearer Header) */}
      <Route path='/preview/:token' element={<PublicPreviewView />} />

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
            <AppShell
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

            <Route path='series/:seriesId'>
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
                  <TaskEditorView
                    activeRoles={activeProjectRoles}
                    onShowToast={showToast}
                    isDevMode={isDevMode}
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
              <Route
                path='my-work'
                element={
                  <MyWorkView
                    currentUserId={currentUserInfo?.id}
                    workspaceRole={currentWorkspaceRole}
                    onShowToast={showToast}
                  />
                }
              />
              <Route
                path='review/:taskId'
                element={
                  <ReviewView
                    currentUserId={currentUserInfo?.id}
                    workspaceRole={currentWorkspaceRole}
                    onShowToast={showToast}
                  />
                }
              />
              <Route
                path='script'
                element={
                  <ScriptEditorView onShowToast={showToast} workspaceRole={currentWorkspaceRole} />
                }
              />
              <Route path='ai-agents' element={<AiMultiAgentView onShowToast={showToast} />} />
              <Route path='publishing' element={<PublisherDeskView onShowToast={showToast} />} />
              <Route
                path='artist'
                element={<ArtistDeskView workspaceRole={currentWorkspaceRole} />}
              />
              <Route path='letterer' element={<LettererWorkspace />} />
              <Route path='export' element={<ExportView onShowToast={showToast} />} />
            </Route>
          </Route>

          {/* Flat routes for backward compatibility / other views */}
          <Route path='producer' element={<ProducerWorkspaceView />} />
          <Route
            path='review/:taskId'
            element={
              <ReviewView
                currentUserId={currentUserInfo?.id}
                workspaceRole={currentWorkspaceRole}
                onShowToast={showToast}
              />
            }
          />
          <Route path='reader' element={<ReaderPortalView />} />
          <Route
            path='profile'
            element={<UserProfileView user={firebaseUser} onLogout={handleLogout} />}
          />
          <Route path='artist' element={<ArtistDeskView />} />
          <Route path='letterer' element={<LettererWorkspace />} />
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
  );
};
