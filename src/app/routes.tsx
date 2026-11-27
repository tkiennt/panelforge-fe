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
import { RequireWorkspaceRole } from './RequireWorkspaceRole';
import { resolveCurrentWorkspaceRole } from './workspaceRoleGuard';
import { getRoleDefaultPath } from '@/roles/roles';
import {
  buildRoleChapterReaderUrl,
  buildSeriesReaderUrl,
  type StudioReaderRole,
} from './routePaths';
import { AuthLayout } from '@/roles/guest/views/AuthLayout';
import { LoginPage } from '@/roles/guest/views/LoginPage';
import { RegisterPage } from '@/roles/guest/views/RegisterPage';
import { useTranslation } from '@/lib/i18n';

/** Link cũ /preview/:token → /review/invite/:token (cùng định dạng route với Mobile). */
const LegacyPreviewRedirect: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  return <Navigate to={`/review/invite/${encodeURIComponent(token)}`} replace />;
};

interface SeriesIndexRedirectProps {
  currentWorkspaceRole?: WorkspaceRole | null;
  activeProjectRoles?: string[];
  currentRole?: SystemRole | string;
}

/** Tự động điều hướng đến màn hình mặc định theo vai trò khi vào trang chủ bộ truyện */
const SeriesIndexRedirect: React.FC<SeriesIndexRedirectProps> = ({
  currentWorkspaceRole,
  activeProjectRoles,
  currentRole,
}) => {
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const effectiveRole = resolveCurrentWorkspaceRole(
    currentWorkspaceRole,
    activeProjectRoles,
    currentRole,
  );
  const target = getRoleDefaultPath(effectiveRole, workspaceId, seriesId);
  return <Navigate to={target} replace />;
};

interface ChapterReaderRoleBoundaryProps extends SeriesIndexRedirectProps {
  expectedRole?: StudioReaderRole;
  children?: React.ReactNode;
}

const ChapterReaderRoleBoundary: React.FC<ChapterReaderRoleBoundaryProps> = ({
  currentWorkspaceRole,
  activeProjectRoles,
  currentRole,
  expectedRole,
  children,
}) => {
  const {
    workspaceId = '',
    seriesId = '',
    chapterId = '',
  } = useParams<{
    workspaceId: string;
    seriesId: string;
    chapterId: string;
  }>();
  const effectiveRole = resolveCurrentWorkspaceRole(
    currentWorkspaceRole,
    activeProjectRoles,
    currentRole,
  ).toLowerCase();
  const canonicalRole: StudioReaderRole | null =
    effectiveRole === 'writer' || effectiveRole === 'editor' || effectiveRole === 'producer'
      ? effectiveRole
      : effectiveRole === 'administrator'
        ? expectedRole || 'producer'
        : null;

  if (!canonicalRole) {
    return <Navigate to={buildSeriesReaderUrl(workspaceId, seriesId, { chapterId })} replace />;
  }

  if (!expectedRole || canonicalRole !== expectedRole) {
    return (
      <Navigate
        to={buildRoleChapterReaderUrl(canonicalRole, workspaceId, seriesId, chapterId)}
        replace
      />
    );
  }

  return <>{children}</>;
};

import { seriesService } from '@/services/series.service';
const WorkspaceView = lazy(() =>
  import('@/shared/features/production-workspace/WorkspaceView').then((m) => ({
    default: m.WorkspaceView,
  })),
);
const ExportView = lazy(() =>
  import('@/roles/producer/views/ExportView').then((m) => ({ default: m.ExportView })),
);
const ProducerChapterManagementView = lazy(() =>
  import('@/roles/producer/views/ProducerChapterManagementView').then((m) => ({
    default: m.ProducerChapterManagementView,
  })),
);
const StudioOverviewView = lazy(() =>
  import('@/shared/views/StudioOverviewView').then((m) => ({ default: m.StudioOverviewView })),
);
const AdminDashboard = lazy(() =>
  import('@/roles/admin/views/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const ArtistDeskView = lazy(() =>
  import('@/roles/artist/views/ArtistDeskView').then((m) => ({ default: m.ArtistDeskView })),
);
const ArtistChapterSelectionView = lazy(() =>
  import('@/roles/artist/views/ArtistChapterSelectionView').then((m) => ({
    default: m.ArtistChapterSelectionView,
  })),
);
const ReviewView = lazy(() =>
  import('@/roles/editor/views/ReviewView').then((m) => ({ default: m.ReviewView })),
);
const EditorDeskView = lazy(() =>
  import('@/roles/editor/views/EditorDeskView').then((m) => ({ default: m.EditorDeskView })),
);
const ScriptReviewView = lazy(() =>
  import('@/roles/editor/views/ScriptReviewView').then((m) => ({ default: m.ScriptReviewView })),
);
const EditorChapterReaderView = lazy(() =>
  import('@/roles/editor/views/ChapterReaderView').then((m) => ({ default: m.ChapterReaderView })),
);
const WriterChapterReaderView = lazy(() =>
  import('@/roles/writer/views/WriterChapterReaderView').then((m) => ({
    default: m.WriterChapterReaderView,
  })),
);
const ProducerChapterReaderView = lazy(() =>
  import('@/roles/producer/views/ProducerChapterReaderView').then((m) => ({
    default: m.ProducerChapterReaderView,
  })),
);
const SeriesReaderView = lazy(() =>
  import('@/shared/features/series-reader/SeriesReaderView').then((m) => ({
    default: m.SeriesReaderView,
  })),
);
const SeriesRevenueView = lazy(() =>
  import('@/roles/producer/views/SeriesRevenueView').then((m) => ({
    default: m.SeriesRevenueView,
  })),
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
const MyWorkHubView = lazy(() =>
  import('@/shared/views/MyWorkHubView').then((m) => ({ default: m.MyWorkHubView })),
);
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
const ProducerReaderStatsView = lazy(() =>
  import('@/roles/producer/views/ProducerReaderStatsView').then((m) => ({
    default: m.ProducerReaderStatsView,
  })),
);
const PublisherRevenueView = lazy(() =>
  import('@/roles/publisher/views/PublisherRevenueView').then((m) => ({
    default: m.PublisherRevenueView,
  })),
);
const PublisherSeriesInsightsView = lazy(() =>
  import('@/roles/publisher/views/PublisherSeriesInsightsView').then((m) => ({
    default: m.PublisherSeriesInsightsView,
  })),
);
const PublisherChapterManageView = lazy(() =>
  import('@/roles/publisher/views/PublisherChapterManageView').then((m) => ({
    default: m.PublisherChapterManageView,
  })),
);
const PublisherDeskView = lazy(() =>
  import('@/roles/publisher/views/PublisherDeskView').then((m) => ({
    default: m.PublisherDeskView,
  })),
);
const PublisherSeriesCatalogView = lazy(() =>
  import('@/roles/publisher/views/PublisherSeriesCatalogView').then((m) => ({
    default: m.PublisherSeriesCatalogView,
  })),
);
const PublisherSeriesDetailView = lazy(() =>
  import('@/roles/publisher/views/PublisherSeriesDetailView').then((m) => ({
    default: m.PublisherSeriesDetailView,
  })),
);
const PublisherBankSettingsView = lazy(() =>
  import('@/roles/publisher/views/PublisherBankSettingsView').then((m) => ({
    default: m.PublisherBankSettingsView,
  })),
);
const ScriptEditorView = lazy(() =>
  import('@/roles/writer/views/ScriptEditorView').then((m) => ({
    default: m.default || m.ScriptEditorView,
  })),
);
const ScriptChapterSelectionView = lazy(() =>
  import('@/roles/writer/views/ScriptChapterSelectionView').then((m) => ({
    default: m.default || m.ScriptChapterSelectionView,
  })),
);
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
  const { t } = useTranslation();
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
    avatarInitials: (currentUserInfo?.name || firebaseUser?.displayName || currentRole || 'U')
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
        <Route path='/review/invite/:token' element={<PublicPreviewView />} />
        <Route path='/preview/:token' element={<LegacyPreviewRedirect />} />

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
                <Navigate to='/publisher/series' replace />
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

          {/* UIQ-11q: việc của tôi xuyên mọi Studio */}
          <Route path='my-work' element={<MyWorkHubView />} />

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
              <Route
                path='reader-stats'
                element={
                  <RequireWorkspaceRole
                    allowedRoles={['PRODUCER', 'ADMINISTRATOR']}
                    currentWorkspaceRole={currentWorkspaceRole}
                    currentRole={currentRole}
                    activeRoles={activeProjectRoles}
                  >
                    <ProducerReaderStatsView />
                  </RequireWorkspaceRole>
                }
              />
              <Route path='payments' element={<Navigate to='../reader-stats' replace />} />

              <Route path='series/:seriesId'>
                <Route
                  index
                  element={
                    <SeriesIndexRedirect
                      currentWorkspaceRole={currentWorkspaceRole}
                      activeProjectRoles={activeProjectRoles}
                      currentRole={currentRole}
                    />
                  }
                />
                <Route path='dashboard' element={<Navigate to='../chapters' replace />} />
                <Route
                  path='chapters'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['PRODUCER', 'ARTIST', 'LETTERER', 'EDITOR', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <ProducerChapterManagementView
                        workspaceRole={currentWorkspaceRole}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='workspace'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['PRODUCER', 'ARTIST', 'LETTERER', 'EDITOR', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <WorkspaceView
                        currentUserRole={currentWorkspaceRole}
                        systemRole={currentRole}
                        userRoles={activeProjectRoles}
                        currentUserId={currentUserInfo?.id}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='bible'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={[
                        'PRODUCER',
                        'WRITER',
                        'ARTIST',
                        'LETTERER',
                        'EDITOR',
                        'ADMINISTRATOR',
                      ]}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <SeriesBibleView
                        activeProject={activeProject}
                        onAddEntity={handleAddEntity}
                        onSelectSeries={(p) => setActiveProject(p)}
                        onEditEntity={(e) =>
                          showToast(
                            'Series Bible',
                            t('navigation.app.openEntityDetail', { name: e.name }),
                          )
                        }
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='my-work'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['WRITER', 'ARTIST', 'LETTERER', 'EDITOR', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <MyWorkView
                        currentUserId={currentUserInfo?.id}
                        workspaceRole={currentWorkspaceRole}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route path='publishing' element={<Navigate to='../export' replace />} />
                <Route
                  path='export'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['PRODUCER', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <ExportView onShowToast={showToast} />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='revenue'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['PRODUCER', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <SeriesRevenueView onShowToast={showToast} />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='artist'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['ARTIST', 'LETTERER', 'EDITOR', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <ArtistChapterSelectionView onShowToast={showToast} />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='script'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['WRITER', 'EDITOR', 'ARTIST', 'LETTERER', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <ScriptChapterSelectionView
                        onShowToast={showToast}
                        workspaceRole={currentWorkspaceRole}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='letterer'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['LETTERER', 'ARTIST', 'EDITOR', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <LettererChapterSelectionView onShowToast={showToast} />
                    </RequireWorkspaceRole>
                  }
                />

                {/* Review workspace stays in AppShell for Editor and Producer fallback (BR-06 / Gate 2). */}
                <Route
                  path='editor/desk'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['EDITOR', 'PRODUCER', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <EditorDeskView
                        currentUserId={currentUserInfo?.id}
                        workspaceRole={currentWorkspaceRole}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='editor/bible'
                  element={<Navigate to='../bible?tab=review' replace />}
                />
                <Route
                  path='chapters/:chapterId/script/review'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={[
                        'EDITOR',
                        'PRODUCER',
                        'ARTIST',
                        'LETTERER',
                        'WRITER',
                        'ADMINISTRATOR',
                      ]}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <ScriptReviewView
                        currentUserId={currentUserInfo?.id}
                        workspaceRole={currentWorkspaceRole}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='read'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={['PRODUCER', 'EDITOR', 'WRITER', 'ADMINISTRATOR']}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <SeriesReaderView
                        workspaceRole={currentWorkspaceRole}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='chapters/:chapterId/reader'
                  element={
                    <ChapterReaderRoleBoundary
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeProjectRoles={activeProjectRoles}
                    />
                  }
                />
                <Route
                  path='writer/chapters/:chapterId/reader'
                  element={
                    <ChapterReaderRoleBoundary
                      expectedRole='writer'
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeProjectRoles={activeProjectRoles}
                    >
                      <RequireWorkspaceRole
                        allowedRoles={['WRITER', 'ADMINISTRATOR']}
                        currentWorkspaceRole={currentWorkspaceRole}
                        currentRole={currentRole}
                        activeRoles={activeProjectRoles}
                      >
                        <WriterChapterReaderView
                          currentUserId={currentUserInfo?.id}
                          onShowToast={showToast}
                        />
                      </RequireWorkspaceRole>
                    </ChapterReaderRoleBoundary>
                  }
                />
                <Route
                  path='editor/chapters/:chapterId/reader'
                  element={
                    <ChapterReaderRoleBoundary
                      expectedRole='editor'
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeProjectRoles={activeProjectRoles}
                    >
                      <RequireWorkspaceRole
                        allowedRoles={['EDITOR', 'ADMINISTRATOR']}
                        currentWorkspaceRole={currentWorkspaceRole}
                        currentRole={currentRole}
                        activeRoles={activeProjectRoles}
                      >
                        <EditorChapterReaderView
                          currentUserId={currentUserInfo?.id}
                          onShowToast={showToast}
                        />
                      </RequireWorkspaceRole>
                    </ChapterReaderRoleBoundary>
                  }
                />
                <Route
                  path='producer/chapters/:chapterId/reader'
                  element={
                    <ChapterReaderRoleBoundary
                      expectedRole='producer'
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeProjectRoles={activeProjectRoles}
                    >
                      <RequireWorkspaceRole
                        allowedRoles={['PRODUCER', 'ADMINISTRATOR']}
                        currentWorkspaceRole={currentWorkspaceRole}
                        currentRole={currentRole}
                        activeRoles={activeProjectRoles}
                      >
                        <ProducerChapterReaderView
                          currentUserId={currentUserInfo?.id}
                          onShowToast={showToast}
                        />
                      </RequireWorkspaceRole>
                    </ChapterReaderRoleBoundary>
                  }
                />
                <Route
                  path='review/:taskId'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={[
                        'EDITOR',
                        'PRODUCER',
                        'ARTIST',
                        'LETTERER',
                        'WRITER',
                        'ADMINISTRATOR',
                      ]}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <ReviewView
                        currentUserId={currentUserInfo?.id}
                        workspaceRole={currentWorkspaceRole}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route
                  path='chapters/:chapterId/review/:taskId'
                  element={
                    <RequireWorkspaceRole
                      allowedRoles={[
                        'EDITOR',
                        'PRODUCER',
                        'ARTIST',
                        'LETTERER',
                        'WRITER',
                        'ADMINISTRATOR',
                      ]}
                      currentWorkspaceRole={currentWorkspaceRole}
                      currentRole={currentRole}
                      activeRoles={activeProjectRoles}
                    >
                      <ReviewView
                        currentUserId={currentUserInfo?.id}
                        workspaceRole={currentWorkspaceRole}
                        onShowToast={showToast}
                      />
                    </RequireWorkspaceRole>
                  }
                />
                <Route path='review' element={<Navigate to='../workspace' replace />} />
              </Route>
            </Route>

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
              path='notifications'
              element={
                <NotificationCenterView
                  onNavigateToWorkspace={(workspaceId) => navigate(`/workspaces/${workspaceId}`)}
                />
              }
            />

            {/* Admin Portal: dùng chung AppShell (header + sidebar) như Publisher Portal */}
            <Route
              path='admin'
              element={
                <AdminRoute activeRoles={activeProjectRoles} currentRole={currentRole}>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Dedicated Top-Level Publisher Portal */}
            <Route
              path='publisher'
              element={
                <RequireWorkspaceRole
                  allowedRoles={['PUBLISHER']}
                  currentWorkspaceRole={currentWorkspaceRole}
                  currentRole={currentRole}
                  activeRoles={activeProjectRoles}
                />
              }
            >
              <Route index element={<Navigate to='series' replace />} />
              <Route
                path='series'
                element={<PublisherSeriesCatalogView onShowToast={showToast} />}
              />
              <Route
                path='series/:seriesId'
                element={<PublisherSeriesDetailView onShowToast={showToast} />}
              />
              <Route path='desk' element={<PublisherDeskView onShowToast={showToast} />} />
              {/* Doanh thu: chỉ Publisher quản lý (cấu hình ngân hàng Studio, giá theo ngôn ngữ) */}
              <Route path='revenue' element={<PublisherRevenueView />} />
              <Route path='revenue/series/:seriesId' element={<PublisherSeriesInsightsView />} />
              <Route
                path='revenue/series/:seriesId/chapters/:chapterId'
                element={<PublisherChapterManageView />}
              />
              <Route
                path='revenue/workspaces/:workspaceId'
                element={<PublisherBankSettingsView onShowToast={showToast} />}
              />
            </Route>
          </Route>

          {/* FOCUSED STUDIO WORKSPACE ROUTES: authoring canvases only.
              Producer and Editor review screens stay in AppShell so their navigation is continuous. */}
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
              {/* Artist Desk routes: ARTIST, LETTERER, EDITOR, ADMINISTRATOR */}
              <Route
                element={
                  <RequireWorkspaceRole
                    allowedRoles={['ARTIST', 'LETTERER', 'EDITOR', 'ADMINISTRATOR']}
                    currentWorkspaceRole={currentWorkspaceRole}
                    currentRole={currentRole}
                    activeRoles={activeProjectRoles}
                  />
                }
              >
                <Route
                  path='artist/desk'
                  element={<ArtistDeskView workspaceRole={currentWorkspaceRole} />}
                />
              </Route>

              {/* Script Editor routes: WRITER, EDITOR, ARTIST, LETTERER, ADMINISTRATOR */}
              <Route
                element={
                  <RequireWorkspaceRole
                    allowedRoles={['WRITER', 'EDITOR', 'ARTIST', 'LETTERER', 'ADMINISTRATOR']}
                    currentWorkspaceRole={currentWorkspaceRole}
                    currentRole={currentRole}
                    activeRoles={activeProjectRoles}
                  />
                }
              >
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
              </Route>
            </Route>
          </Route>

          <Route path='*' element={<Navigate to={defaultRedirectPath} replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
