import React from 'react';
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { User } from 'firebase/auth';
import { AppShell } from './AppShell';
import { AuthLayout } from '@/roles/guest/views/AuthLayout';
import { LoginPage } from '@/roles/guest/views/LoginPage';
import { RegisterPage } from '@/roles/guest/views/RegisterPage';

const WorkspaceRedirect: React.FC = () => {
  const { workspaceId, '*': rest } = useParams<{ workspaceId: string; '*'?: string }>();
  return <Navigate to={`/workspaces/${workspaceId}${rest ? `/${rest}` : ''}`} replace />;
};
import { seriesService } from '@/services/series.service';
import { WorkspaceView } from '@/shared/features/production-workspace/WorkspaceView';
import { TaskEditorView } from '@/shared/features/production-workspace/TaskEditorView';
import { ExportView } from '@/roles/producer/views/ExportView';
import { DashboardView } from '@/roles/producer/views/DashboardView';
import { StudioOverviewView } from '@/shared/views/StudioOverviewView';
import { AdminDashboard } from '@/roles/admin/views';
import { ArtistDeskView } from '@/roles/artist/views/ArtistDeskView';
import { ReviewView } from '@/roles/editor/views/ReviewView';
import { NotificationCenterView } from '@/shared/views/NotificationCenterView';
import { PublicCatalogView } from '@/roles/reader/views/PublicCatalogView';
import { PublicPreviewView } from '@/roles/reader/views/PublicPreviewView';
import { LandingPageView } from '@/roles/guest/views/LandingPageView';
import { WorkspaceListView } from '@/shared/views/WorkspaceListView';
import { UserProfileView } from '@/shared/views/UserProfileView';
import { SeriesBibleView } from '@/shared/features/series-bible/SeriesBibleView';
import { MyWorkView } from '@/shared/features/collaboration/MyWorkView';
import { PublisherDeskView } from '@/roles/publisher/views/PublisherDeskView';
import { ScriptEditorView } from '@/roles/writer/views/ScriptEditorView';
import LettererDeskView from '@/roles/letterer/views/LettererDeskView';
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
  const location = useLocation();
  if (!isAuthenticated) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
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
  setIsCommandPaletteOpen?: (open: boolean) => void;
  members: StudioMember[];
  setMembers: React.Dispatch<React.SetStateAction<StudioMember[]>>;
  handleInviteMember: (m: StudioMember) => void;
  assistants: any[];
  provenanceLogs: any[];
  handleAddEntity: (e: BibleEntity) => void;
  isDevMode?: boolean;
  onApiLoginSuccess?: (authResponse: any) => void;
  onRegisterSuccess?: (authResponse: any) => void;
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
  setIsCommandPaletteOpen,
  members,
  setMembers,
  handleInviteMember,
  assistants,
  provenanceLogs,
  handleAddEntity,
  isDevMode = false,
  onApiLoginSuccess,
  onRegisterSuccess,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Routes>
      <Route
        path='/'
        element={
          !isAuthenticated ? (
            <LandingPageView
              onOpenLogin={() => navigate(`/login${location.search}`)}
              onOpenRegister={() => navigate(`/register${location.search}`)}
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
            <AuthLayout mode='login'>
              <LoginPage onLoginSuccess={onApiLoginSuccess} />
            </AuthLayout>
          ) : (
            <Navigate to={defaultRedirectPath} replace />
          )
        }
      />

      <Route
        path='/register'
        element={
          !isAuthenticated ? (
            <AuthLayout mode='register'>
              <RegisterPage onRegisterSuccess={onRegisterSuccess} />
            </AuthLayout>
          ) : (
            <Navigate to={defaultRedirectPath} replace />
          )
        }
      />

      {/* CF5: Public Preview Link Route (No Auth Guard, No Bearer Header) */}
      <Route path='/preview/:token' element={<PublicPreviewView />} />

      {/* Public Catalog Route (BR-24: Public AllowAnonymous) */}
      <Route
        path='/catalog'
        element={
          <PublicCatalogView
            onBackToWorkspaces={() => navigate(isAuthenticated ? '/workspaces' : '/')}
            onOpenLogin={() => navigate(`/login?redirect=${encodeURIComponent('/catalog')}`)}
          />
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
        <Route path='workspace/:workspaceId/*' element={<WorkspaceRedirect />} />
        <Route path='workspace/:workspaceId' element={<WorkspaceRedirect />} />

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
              onOpenCommandPalette={() => setIsCommandPaletteOpen?.(true)}
              onSelectSeries={(newSeriesId) => {
                seriesService
                  .getSeriesById(newSeriesId)
                  .then((series) => {
                    const adapted: MangaProject = {
                      id: series.id,
                      title: series.title,
                      subtitle: series.synopsis || 'N/A',
                      arc: 'Arc 01',
                      chapter: 1,
                      format: series.format || 'B5 Tankōbon Master (600 DPI)',
                      status: 'In Production',
                      progressPercent: 50,
                      completedPages: 16,
                      totalPages: 32,
                      dueDate: 'Dec 2026',
                      daysLeft: 30,
                      genres: [series.genre || 'Manga'],
                      coverStyle: 'halftone-cyber',
                      coverText: series.title,
                      tagline: series.synopsis || 'Studio Production',
                      lastUpdated: new Date(series.createdAt).toLocaleDateString(),
                    };
                    setActiveProject(adapted);
                  })
                  .catch((err) => console.warn('Failed to load series on select:', err));
              }}
            />
          }
        >
          <Route path='workspaces/:workspaceId'>
            <Route index element={<StudioOverviewView />} />
            <Route path='overview' element={<StudioOverviewView />} />
            <Route path='series' element={<StudioOverviewView />} />

            <Route path='series/:seriesId'>
              <Route index element={<Navigate to='dashboard' replace />} />
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
              <Route path='publishing' element={<PublisherDeskView onShowToast={showToast} />} />
              <Route
                path='artist'
                element={<ArtistDeskView workspaceRole={currentWorkspaceRole} />}
              />
              <Route path='letterer' element={<LettererDeskView />} />
              <Route path='export' element={<ExportView onShowToast={showToast} />} />
            </Route>
          </Route>

          {/* Flat legacy routes: safely redirect to /workspaces or /catalog */}
          <Route path='producer' element={<Navigate to='/workspaces' replace />} />
          <Route path='reader' element={<Navigate to='/catalog' replace />} />
          <Route path='artist' element={<Navigate to='/workspaces' replace />} />
          <Route path='letterer' element={<Navigate to='/workspaces' replace />} />
          <Route
            path='profile'
            element={<UserProfileView user={firebaseUser} onLogout={handleLogout} />}
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
            path='catalog'
            element={<PublicCatalogView onBackToWorkspaces={() => navigate('/workspaces')} />}
          />
          <Route
            path='notifications'
            element={
              <NotificationCenterView
                onNavigateToWorkspace={(workspaceId) => navigate(`/workspaces/${workspaceId}`)}
              />
            }
          />
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
