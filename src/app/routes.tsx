import React, { lazy, Suspense } from 'react';
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
import { FocusWorkspaceLayout } from './FocusWorkspaceLayout';
import { AuthLayout } from '@/roles/guest/views/AuthLayout';
import { LoginPage } from '@/roles/guest/views/LoginPage';
import { RegisterPage } from '@/roles/guest/views/RegisterPage';

const WorkspaceRedirect: React.FC = () => {
  const { workspaceId, '*': rest } = useParams<{ workspaceId: string; '*'?: string }>();
  return <Navigate to={`/workspaces/${workspaceId}${rest ? `/${rest}` : ''}`} replace />;
};
import { seriesService } from '@/services/series.service';
const WorkspaceView = lazy(() =>
  import('@/shared/features/production-workspace/WorkspaceView').then((m) => ({
    default: m.WorkspaceView,
  })),
);
const TaskEditorView = lazy(() =>
  import('@/shared/features/production-workspace/TaskEditorView').then((m) => ({
    default: m.TaskEditorView,
  })),
);
const ExportView = lazy(() =>
  import('@/roles/producer/views/ExportView').then((m) => ({ default: m.ExportView })),
);
const DashboardView = lazy(() =>
  import('@/roles/producer/views/DashboardView').then((m) => ({ default: m.DashboardView })),
);
const StudioOverviewView = lazy(() =>
  import('@/shared/views/StudioOverviewView').then((m) => ({ default: m.StudioOverviewView })),
);
const AdminDashboard = lazy(() =>
  import('@/roles/admin/views').then((m) => ({ default: m.AdminDashboard })),
);
const ArtistDeskView = lazy(() =>
  import('@/roles/artist/views/ArtistDeskView').then((m) => ({ default: m.ArtistDeskView })),
);
const ArtistChapterSelectionView = lazy(() =>
  import('@/roles/artist/views/ArtistChapterSelectionView').then((m) => ({
    default: m.ArtistChapterSelectionView,
  })),
);
const ArtistWorkspaceView = lazy(() =>
  import('@/roles/artist/workspace/ArtistWorkspaceView').then((m) => ({ default: m.ArtistWorkspaceView })),
);
const ReviewView = lazy(() =>
  import('@/roles/editor/views/ReviewView').then((m) => ({ default: m.ReviewView })),
);
const NotificationCenterView = lazy(() =>
  import('@/shared/views/NotificationCenterView').then((m) => ({
    default: m.NotificationCenterView,
  })),
);
const PublicCatalogView = lazy(() =>
  import('@/roles/reader/views/PublicCatalogView').then((m) => ({ default: m.PublicCatalogView })),
);
const PublicPreviewView = lazy(() =>
  import('@/roles/reader/views/PublicPreviewView').then((m) => ({ default: m.PublicPreviewView })),
);
import { LandingPageView } from '@/roles/guest/views/LandingPageView';
const WorkspaceListView = lazy(() =>
  import('@/shared/views/WorkspaceListView').then((m) => ({ default: m.WorkspaceListView })),
);
const UserProfileView = lazy(() =>
  import('@/shared/views/UserProfileView').then((m) => ({ default: m.UserProfileView })),
);
const SeriesBibleView = lazy(() =>
  import('@/shared/features/series-bible/SeriesBibleView').then((m) => ({
    default: m.SeriesBibleView,
  })),
);
const MyWorkView = lazy(() =>
  import('@/shared/features/collaboration/MyWorkView').then((m) => ({ default: m.MyWorkView })),
);
const PublisherDeskView = lazy(() =>
  import('@/roles/publisher/views/PublisherDeskView').then((m) => ({
    default: m.PublisherDeskView,
  })),
);
const PublisherSeriesView = lazy(() =>
  import('@/roles/publisher/views/PublisherSeriesView').then((m) => ({
    default: m.PublisherSeriesView,
  })),
);
const ScriptEditorView = lazy(() =>
  import('@/roles/writer/views/ScriptEditorView').then((m) => ({ default: m.ScriptEditorView })),
);
const ScriptChapterSelectionView = lazy(() =>
  import('@/roles/writer/views/ScriptChapterSelectionView').then((m) => ({
    default: m.ScriptChapterSelectionView,
  })),
);
const LettererDeskView = lazy(() => import('@/roles/letterer/views/LettererDeskView'));
const LettererChapterSelectionView = lazy(() =>
  import('@/roles/letterer/views/LettererChapterSelectionView').then((m) => ({
    default: m.LettererChapterSelectionView,
  })),
);
import {
  SystemRole,
  WorkspaceRole,
  WorkspaceDto,
  MangaProject,
  StudioMember,
  BibleEntity,
  getRoleFromToken,
} from '@/types';

/** Lazy route chunks: keeps Konva/editor code out of the Landing/Login bundle. */
import { RouteFallback } from '@/shared/components/RouteFallback';
export { RouteFallback };

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
    avatarUrl?: string | null;
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
  setIsAuditLogOpen?: (open: boolean) => void;
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

const resolveUserAvatar = (
  currentUserInfo?: { avatarUrl?: string | null } | null,
  firebaseUser?: User | null,
): string | null => {
  if (currentUserInfo?.avatarUrl) return currentUserInfo.avatarUrl;
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (u.avatarUrl) return u.avatarUrl;
    if (u.avatar) return u.avatar;
  } catch {
    // ignore
  }
  return firebaseUser?.photoURL || null;
};

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
  setIsAuditLogOpen,
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

  const appCurrentUser = {
    name:
      currentUserInfo?.name ||
      firebaseUser?.displayName ||
      firebaseUser?.email?.split('@')[0] ||
      'Tatsuki F.',
    role: currentRole,
    workspaceRole: currentWorkspaceRole,
    activeRoles: activeProjectRoles,
    avatarUrl: resolveUserAvatar(currentUserInfo, firebaseUser),
    avatarInitials: (
      currentUserInfo?.name ||
      firebaseUser?.displayName ||
      currentRole ||
      'U'
    )
      .charAt(0)
      .toUpperCase(),
  };

  return (
    <Suspense fallback={<RouteFallback />}>
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
              currentRole === 'PUBLISHER' ? (
                <Navigate to='/publisher/desk' replace />
              ) : (
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
                      avatarUrl: resolveUserAvatar(currentUserInfo, firebaseUser),
                      canCreateStudio: currentUserInfo?.canCreateStudio,
                    }}
                    onLogout={handleLogout}
                  />
                </div>
              )
            }
          />

          <Route path='projects' element={<Navigate to='/workspaces' replace />} />
          <Route path='workspace/:workspaceId/*' element={<WorkspaceRedirect />} />
          <Route path='workspace/:workspaceId' element={<WorkspaceRedirect />} />

          <Route
            element={
              <AppShell
                currentUser={appCurrentUser}
                activeWorkspace={activeWorkspace}
                activeSeries={activeProject}
                aiState='active'
                onLogout={handleLogout}
                onLeaveFeedback={() => showToast('Feedback', 'Thanks for your feedback!')}
                onOpenTwoFactor={() => setIsTwoFactorModalOpen(true)}
                onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen?.(true)}
                onOpenActivityHistory={() => setIsAuditLogOpen?.(true)}
                onOpenNotifications={() => navigate('/notifications')}
                onSelectSeries={(newSeriesId) => {
                  seriesService
                    .getSeriesById(newSeriesId)
                    .then((series) => {
                      const adapted: MangaProject = {
                        id: series.id,
                        title: series.title,
                        subtitle: series.synopsis || '',
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
                      workspaceRole={currentWorkspaceRole}
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
                      currentUserId={currentUserInfo?.id}
                      onShowToast={showToast}
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
                <Route path='publishing' element={<PublisherDeskView onShowToast={showToast} />} />
                <Route path='export' element={<ExportView onShowToast={showToast} />} />
                <Route
                  path='artist'
                  element={<ArtistChapterSelectionView onShowToast={showToast} />}
                />
                <Route
                  path='script'
                  element={
                    <ScriptChapterSelectionView
                      onShowToast={showToast}
                      workspaceRole={currentWorkspaceRole}
                    />
                  }
                />
                <Route
                  path='letterer'
                  element={<LettererChapterSelectionView onShowToast={showToast} />}
                />
              </Route>
            </Route>

            {/* Flat legacy routes: safely redirect to /workspaces or /catalog */}
            <Route path='producer' element={<Navigate to='/workspaces' replace />} />
            <Route path='reader' element={<Navigate to='/catalog' replace />} />
            <Route path='artist' element={<Navigate to='/workspaces' replace />} />
            <Route path='letterer' element={<Navigate to='/workspaces' replace />} />
            <Route
              path='profile'
              element={
                <UserProfileView
                  user={firebaseUser}
                  onLogout={handleLogout}
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

            {/* Dedicated Top-Level Publisher Portal */}
            <Route path='publisher'>
              <Route index element={<Navigate to='desk' replace />} />
              <Route path='desk' element={<PublisherDeskView onShowToast={showToast} />} />
              <Route path='series' element={<PublisherSeriesView onShowToast={showToast} />} />
              <Route
                path='catalog'
                element={<PublicCatalogView onBackToWorkspaces={() => navigate('/publisher/desk')} />}
              />
            </Route>
          </Route>

          {/* FOCUSED STUDIO WORKSPACE ROUTES: Desk & Editors (Dedicated layout without AppShellSidebar) */}
          <Route
            element={
              <FocusWorkspaceLayout
                currentUser={appCurrentUser}
                activeWorkspace={activeWorkspace}
                activeSeries={activeProject}
                onLogout={handleLogout}
              />
            }
          >
            <Route path='workspaces/:workspaceId/series/:seriesId'>
              <Route
                path='artist/desk'
                element={<ArtistDeskView workspaceRole={currentWorkspaceRole} />}
              />
              <Route
                path='artist/desk/:chapterId'
                element={<ArtistDeskView workspaceRole={currentWorkspaceRole} />}
              />
              <Route
                path='chapters/:chapterId/artist'
                element={<ArtistDeskView workspaceRole={currentWorkspaceRole} />}
              />
              <Route
                path='artist/workspace'
                element={<ArtistWorkspaceView workspaceRole={currentWorkspaceRole} />}
              />
              <Route
                path='script/editor'
                element={
                  <ScriptEditorView
                    currentUserId={currentUserInfo?.id}
                    onShowToast={showToast}
                    workspaceRole={currentWorkspaceRole}
                  />
                }
              />
              <Route
                path='script/editor/:chapterId'
                element={
                  <ScriptEditorView
                    currentUserId={currentUserInfo?.id}
                    onShowToast={showToast}
                    workspaceRole={currentWorkspaceRole}
                  />
                }
              />
              <Route
                path='chapters/:chapterId/script'
                element={
                  <ScriptEditorView
                    currentUserId={currentUserInfo?.id}
                    onShowToast={showToast}
                    workspaceRole={currentWorkspaceRole}
                  />
                }
              />
              <Route path='letterer/desk' element={<LettererDeskView />} />
              <Route path='letterer/desk/:chapterId' element={<LettererDeskView />} />
              <Route path='chapters/:chapterId/letterer' element={<LettererDeskView />} />
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
                path='review/:taskId'
                element={
                  <ReviewView
                    currentUserId={currentUserInfo?.id}
                    workspaceRole={currentWorkspaceRole}
                    onShowToast={showToast}
                  />
                }
              />
            </Route>
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
    </Suspense>
  );
};
