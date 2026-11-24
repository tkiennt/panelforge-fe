import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  LayoutGrid,
  Plus,
  ArrowRight,
  LogOut,
  AlertCircle,
  RotateCw,
  Users,
  Camera,
  Clock,
  ShieldCheck,
  ListTodo,
  BookOpen,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { formatBytes } from './studio-overview/formatters';
import {
  PendingInvitations,
  SeriesShelf,
  TodayTasks,
  type PendingInvitation,
} from './WorkspaceShelfSections';
import { Alert } from '@/shared/ui';
import { sortByDue, type TodayTask } from './workspaceShelfTasks';
import { WorkspaceDto, WorkspaceRole, normalizeWorkspaceRole } from '@/types';
import { workspaceService } from '@/services/workspace.service';
import { CreateWorkspaceModal } from '@/roles/producer/modals/CreateWorkspaceModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { useTranslation } from '@/lib/i18n';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { StudioCoverFallback } from '@/shared/components/StudioCoverFallback';
import { WorkspaceCoverPickerDialog } from '@/shared/components/WorkspaceCoverPickerDialog';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { LucianInlineAlert } from '@/shared/components/lucian';
import { BlankPageSketch } from '@/shared/components/BlankPageSketch';
import './workspaceShelf.css';

interface WorkspaceListViewProps {
  onSelectWorkspace: (workspace: WorkspaceDto) => void;
  onCreateWorkspace?: () => void;
  currentUser?: {
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    canCreateStudio?: boolean;
  } | null;
  onLogout?: () => void;
  /** Studio the user last entered (from the app's activeWorkspace), if any. */
  recentWorkspaceId?: string | null;
}

// Deterministic tone palette for studio accents
const COVER_TONES = ['#EA580C', '#0F766E', '#7C3AED', '#B45309', '#BE123C', '#1D4ED8'];
const toneFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVER_TONES[h % COVER_TONES.length];
};

export const WorkspaceListView: React.FC<WorkspaceListViewProps> = ({
  onSelectWorkspace,
  onCreateWorkspace,
  currentUser,
  onLogout,
  recentWorkspaceId,
}) => {
  const confirm = useConfirm();
  const { t, lang } = useTranslation();
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverModalWorkspace, setCoverModalWorkspace] = useState<WorkspaceDto | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [now] = useState(() => Date.now());

  const isAdmin =
    currentUser?.role?.toUpperCase() === 'ADMINISTRATOR' ||
    currentUser?.role?.toUpperCase() === 'ADMIN';
  const canCreate = !isAdmin && !!currentUser?.canCreateStudio;

  // Gọi API thật lấy danh sách Workspace của user hiện tại
  const fetchWorkspaces = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await workspaceService.getMyWorkspaces();
      const mapped: WorkspaceDto[] = (data || []).map((ws) => ({
        ...ws,
        currentUserRole: normalizeWorkspaceRole(ws.currentUserRole),
        pendingTasks: (ws as Partial<WorkspaceDto>).pendingTasks ?? 0,
        pendingEditorReviews: (ws as Partial<WorkspaceDto>).pendingEditorReviews ?? 0,
      }));
      setWorkspaces(mapped);
    } catch (error) {
      console.error('Lỗi khi tải danh sách Workspace:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => setAvatarFailed(false), [currentUser?.avatarUrl]);

  // Lời mời tham gia Studio đang chờ
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  useEffect(() => {
    if (isAdmin) return;
    let active = true;
    workspaceService.getPendingInvitations().then((list) => active && setInvitations(list || []));
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleAcceptInvitation = async (inv: PendingInvitation) => {
    setInviteBusyId(inv.workspaceId);
    setInviteError(null);
    try {
      await workspaceService.acceptInvitation(inv.workspaceId);
      setInvitations((prev) => prev.filter((i) => i.workspaceId !== inv.workspaceId));
      await fetchWorkspaces();
    } catch (err) {
      setInviteError((err as Error)?.message || t('workspace.shelf.invitations.error'));
    } finally {
      setInviteBusyId(null);
    }
  };

  const handleRejectInvitation = async (inv: PendingInvitation) => {
    const ok = await confirm({
      title: t('workspace.shelf.invitations.rejectConfirmTitle'),
      description: t('workspace.shelf.invitations.rejectConfirm', { name: inv.workspaceName }),
      confirmText: t('workspace.shelf.invitations.reject'),
      cancelText: t('workspace.shelf.cancel'),
      variant: 'warning',
    });
    if (!ok) return;
    setInviteBusyId(inv.workspaceId);
    setInviteError(null);
    try {
      await workspaceService.rejectInvitation(inv.workspaceId);
      setInvitations((prev) => prev.filter((i) => i.workspaceId !== inv.workspaceId));
    } catch (err) {
      setInviteError((err as Error)?.message || t('workspace.shelf.invitations.error'));
    } finally {
      setInviteBusyId(null);
    }
  };

  // Việc của bạn trong Studio
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [todayError, setTodayError] = useState(false);
  useEffect(() => {
    const withWork = workspaces.filter((w) => (w.pendingTasks ?? 0) > 0);
    if (withWork.length === 0) {
      setTodayTasks([]);
      setTodayError(false);
      return;
    }
    let active = true;
    Promise.allSettled(
      withWork.map((w) =>
        assignmentService
          .getMyAssignments(w.id)
          .then((list) =>
            list
              .filter((a) => a.status !== 'Approved')
              .map((a): TodayTask => ({ workspace: w, assignment: a })),
          ),
      ),
    ).then((results) => {
      if (!active) return;
      const loaded = results.filter(
        (r): r is PromiseFulfilledResult<TodayTask[]> => r.status === 'fulfilled',
      );
      setTodayError(loaded.length === 0);
      setTodayTasks(sortByDue(loaded.flatMap((r) => r.value)));
    });
    return () => {
      active = false;
    };
  }, [workspaces]);

  const handleOpenCreate = async () => {
    if (isAdmin) {
      await confirm({
        title: t('workspace.notices.adminTitle'),
        description: t('workspace.adminNotice'),
        confirmText: t('workspace.shelf.understood'),
        cancelText: t('common.actions.close'),
        variant: 'warning',
      });
      return;
    }
    if (!currentUser?.canCreateStudio) {
      await confirm({
        title: t('workspace.notices.producerTitle'),
        description: t('workspace.producerNotice'),
        confirmText: t('workspace.shelf.understood'),
        cancelText: t('common.actions.close'),
        variant: 'warning',
      });
      return;
    }
    if (onCreateWorkspace) {
      onCreateWorkspace();
    } else {
      setIsModalOpen(true);
    }
  };

  const roleLabel = (role?: WorkspaceRole | null) => {
    const key = `workspace.shelf.role.${(role || 'member').toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : role || t('workspace.shelf.role.member');
  };

  const timeAgo = (dateString: string) => {
    const diffDays = Math.floor((now - new Date(dateString).getTime()) / 86400000);
    if (diffDays <= 0) return t('workspace.today');
    if (diffDays === 1) return t('workspace.yesterday');
    return t('workspace.daysAgo', { count: diffDays });
  };

  const canManageCover = (ws: WorkspaceDto) => {
    if (isAdmin) return false;
    const role = (ws.currentUserRole || '').toString().toUpperCase();
    return ws.isOwner || role === 'PRODUCER' || role === '0';
  };

  const recent = recentWorkspaceId ? workspaces.find((w) => w.id === recentWorkspaceId) : null;
  const avatarUrl = currentUser?.avatarUrl?.trim();

  // Thống kê số lượng thực tế
  const ownedCount = workspaces.filter((w) => w.isOwner).length;
  const pendingTotal = workspaces.reduce((n, w) => n + (w.pendingTasks ?? 0), 0);
  const reviewTotal = workspaces.reduce((n, w) => n + (w.pendingEditorReviews ?? 0), 0);
  const summary =
    ownedCount === workspaces.length
      ? t('workspace.shelf.summary.allOwned', { count: workspaces.length })
      : ownedCount === 0
        ? t('workspace.shelf.summary.noneOwned', { count: workspaces.length })
        : t('workspace.shelf.summary.mixed', { count: workspaces.length, owned: ownedCount });

  // Lọc theo vai trò / sở hữu
  const [filter, setFilter] = useState<'all' | 'owned' | 'joined'>('all');
  const showFilter = ownedCount > 0 && ownedCount < workspaces.length;
  const filteredByOwner =
    !showFilter || filter === 'all'
      ? workspaces
      : workspaces.filter((w) => (filter === 'owned' ? w.isOwner : !w.isOwner));

  // Tìm kiếm Studio: Hiển thị khi có từ 6 studio trở lên
  const SEARCH_MIN_STUDIOS = 6;
  const showSearch = workspaces.length >= SEARCH_MIN_STUDIOS;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'created' | 'recent' | 'name'>('created');
  const q = showSearch ? query.trim().toLowerCase() : '';
  const searched = q
    ? filteredByOwner.filter(
        (w) => w.name.toLowerCase().includes(q) || (w.ownerName || '').toLowerCase().includes(q),
      )
    : filteredByOwner;
  const activityTime = (w: WorkspaceDto) => new Date(w.lastActivityAt || w.createdAt).getTime();
  const visibleWorkspaces =
    !showSearch || sort === 'created'
      ? searched
      : [...searched].sort((a, b) =>
          sort === 'name'
            ? a.name.localeCompare(b.name, lang === 'en' ? 'en' : 'vi')
            : activityTime(b) - activityTime(a),
        );

  const createButton = (
    <button
      type='button'
      onClick={handleOpenCreate}
      className='bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs shrink-0'
    >
      <Plus className='w-4 h-4' aria-hidden='true' />
      <span>{t('workspace.shelf.create')}</span>
    </button>
  );

  return (
    <div className='min-h-screen flex flex-col font-sans bg-[#FAF9F5] text-stone-900'>
      {/* 1. STICKY TOP HEADER (Stitch Multi-Studio Navigation) */}
      <header className='h-16 bg-white border-b border-stone-200 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-40 shadow-xs'>
        <div className='flex items-center shrink-0'>
          <div className='flex items-center gap-1.5 cursor-pointer select-none'>
            <span className='text-lg font-bold text-orange-600 tracking-tight font-serif'>
              PanelForge
            </span>
            <span className='text-[10px] font-bold tracking-wider uppercase bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded'>
              STUDIO
            </span>
          </div>
          <div className='h-5 w-px bg-stone-200 mx-3' />
          <div className='flex items-center gap-1 text-xs font-medium'>
            <span className='px-2.5 py-1 rounded-md text-stone-900 bg-stone-100 font-semibold flex items-center gap-1.5 border border-stone-200'>
              <LayoutGrid className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
              <span>Workspaces</span>
            </span>
          </div>
        </div>

        {/* User Pill & Actions */}
        <div className='flex items-center gap-3 shrink-0'>
          {currentUser && (
            <Link
              to='/profile'
              title={t('workspace.shelf.profile')}
              aria-label={`${t('workspace.shelf.profile')}: ${currentUser.name}`}
              className='flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 pl-3 pr-2 py-1.5 rounded-full border border-stone-200 transition-colors text-xs cursor-pointer'
            >
              <span className='font-semibold text-stone-800 truncate max-w-[140px]'>
                {currentUser.name}
              </span>
              <span className='text-stone-400'>•</span>
              <span className='text-stone-500 text-[11px]'>{currentUser.role || 'Producer'}</span>
              <div className='w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 ml-0.5 overflow-hidden'>
                {avatarUrl && !avatarFailed ? (
                  <img
                    src={avatarUrl}
                    alt=''
                    className='w-full h-full object-cover'
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className='text-[11px] font-bold'>
                    {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </Link>
          )}

          {canCreate && workspaces.length > 0 && (
            <button
              type='button'
              onClick={handleOpenCreate}
              className='bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap'
            >
              <Plus className='w-4 h-4' />
              <span>{t('workspace.shelf.create')}</span>
            </button>
          )}

          {onLogout && (
            <button
              type='button'
              onClick={onLogout}
              title={t('profile.logout')}
              aria-label={t('profile.logout')}
              className='p-2 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-stone-200 transition-colors cursor-pointer'
            >
              <LogOut className='w-4 h-4' aria-hidden='true' />
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN DIRECTORY CONTENT */}
      <main className='w-full flex-1 bg-[#FAF9F5]'>
        <PageContainer className='py-6 md:py-8 flex flex-col gap-6 max-w-[1840px]'>
          {/* Admin Role Limitation Notice */}
          {isAdmin && (
            <LucianInlineAlert
              type='info'
              title={t('workspace.notices.adminBadge')}
              description={t('workspace.shelf.adminRestrictionDesc')}
              dismissible={true}
            />
          )}

          {loading ? (
            <div aria-busy='true' className='space-y-6'>
              <span className='sr-only'>{t('workspace.loading')}</span>
              <div className='bg-white border border-stone-200 rounded-2xl p-6 h-36 animate-pulse' />
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className='bg-white border border-stone-200 rounded-2xl p-5 h-72 animate-pulse'
                  />
                ))}
              </div>
            </div>
          ) : loadError ? (
            <Alert tone='danger' className='max-w-md mx-auto mt-10 text-center'>
              <AlertCircle className='w-6 h-6 text-rose-600 mx-auto mb-3' aria-hidden='true' />
              <p className='text-sm text-[#44403C] mb-4'>{t('workspace.shelf.loadError')}</p>
              <button
                type='button'
                onClick={fetchWorkspaces}
                className='bg-stone-900 text-white inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold rounded-lg hover:bg-stone-800'
              >
                <RotateCw className='w-4 h-4' aria-hidden='true' />
                {t('workspace.shelf.retry')}
              </button>
            </Alert>
          ) : workspaces.length === 0 ? (
            /* Empty State */
            <div className='mt-6 bg-white border-2 border-dashed border-stone-300 rounded-2xl p-10 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left'>
              <BlankPageSketch />
              <div className='flex-1'>
                <h1 className='text-2xl font-serif font-bold text-stone-900 mb-2 tracking-tight'>
                  {t('workspace.emptyTitle')}
                </h1>
                <p className='text-xs text-stone-600 leading-relaxed max-w-prose'>
                  {canCreate ? t('workspace.shelf.emptyCreate') : t('workspace.shelf.emptyInvite')}
                </p>
              </div>
              {canCreate && createButton}
            </div>
          ) : (
            <>
              {/* STITCH HERO BANNER CARD (VIEW 1: DIRECTORY) */}
              <div className='bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6'>
                <div className='flex flex-col gap-1.5'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800'>
                      Workspace Management
                    </span>
                    <span className='text-xs text-stone-400'>•</span>
                    <span className='text-xs font-medium text-stone-500'>
                      Manga Paper × Tangerine Edition
                    </span>
                  </div>
                  <h1 className='text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3 font-serif'>
                    <span>{t('workspace.shelf.title')}</span>
                    <span className='px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-xs border border-stone-200'>
                      {workspaces.length} Studio
                    </span>
                  </h1>
                  <p
                    className='text-stone-600 text-xs leading-relaxed max-w-3xl'
                    data-testid='ws-summary'
                  >
                    {summary}
                  </p>
                  {/* KPI Chips */}
                  {(pendingTotal > 0 || reviewTotal > 0) && (
                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                      {pendingTotal > 0 && (
                        <span
                          className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-xs font-medium'
                          data-testid='ws-chip-pending'
                        >
                          <ListTodo className='w-3.5 h-3.5' aria-hidden='true' />
                          {t('workspace.shelf.pendingForYou', { count: pendingTotal })}
                        </span>
                      )}
                      {reviewTotal > 0 && (
                        <span
                          className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium'
                          data-testid='ws-chip-reviews'
                        >
                          <ShieldCheck className='w-3.5 h-3.5' aria-hidden='true' />
                          {t('workspace.shelf.pendingReviews', { count: reviewTotal })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {canCreate && (
                  <button
                    type='button'
                    onClick={handleOpenCreate}
                    className='bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto'
                  >
                    <Plus className='w-4 h-4' />
                    <span>{t('workspace.shelf.createNewBtn')}</span>
                  </button>
                )}
              </div>

              {/* Pending Studio Invitations Banner */}
              {invitations.length > 0 && (
                <PendingInvitations
                  invitations={invitations}
                  busyId={inviteBusyId}
                  error={inviteError}
                  t={t}
                  roleLabel={(r) => roleLabel(normalizeWorkspaceRole(r))}
                  timeAgo={timeAgo}
                  onAccept={(inv) => void handleAcceptInvitation(inv)}
                  onReject={(inv) => void handleRejectInvitation(inv)}
                />
              )}

              {/* Unfinished Today Tasks */}
              {(todayTasks.length > 0 || todayError) && (
                <TodayTasks
                  tasks={todayTasks.slice(0, 5)}
                  total={todayTasks.length}
                  error={todayError}
                  now={now}
                  t={t}
                  onOpen={onSelectWorkspace}
                />
              )}

              {/* Recently Visited Studio Alert */}
              {recent && (
                <div className='flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Clock className='w-4 h-4 text-orange-600 shrink-0' aria-hidden='true' />
                    <p className='text-stone-700 truncate'>
                      {t('workspace.shelf.recent')}{' '}
                      <strong className='font-semibold text-stone-900'>{recent.name}</strong>
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => onSelectWorkspace(recent)}
                    className='inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-900 cursor-pointer'
                  >
                    {t('workspace.shelf.continue')}
                    <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
                  </button>
                </div>
              )}

              {/* FILTER & SEARCH BAR (Stitch Directory View) */}
              {(showFilter || showSearch) && (
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                  {/* Filter Pills */}
                  {showFilter && (
                    <div
                      className='flex items-center gap-2 flex-wrap'
                      role='group'
                      aria-label={t('workspace.shelf.filter.label')}
                    >
                      <span className='text-xs font-semibold text-stone-500 mr-1'>
                        {t('workspace.shelf.filterByRole')}
                      </span>
                      <button
                        type='button'
                        onClick={() => setFilter('all')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors ${
                          filter === 'all'
                            ? 'bg-stone-900 text-white'
                            : 'bg-white border border-stone-200 text-stone-700 hover:text-stone-900'
                        }`}
                      >
                        {t('workspace.shelf.filter.all')} ({workspaces.length})
                      </button>
                      <button
                        type='button'
                        onClick={() => setFilter('owned')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer shadow-2xs transition-colors ${
                          filter === 'owned'
                            ? 'bg-stone-900 text-white font-semibold'
                            : 'bg-white border border-stone-200 text-stone-700 hover:text-stone-900'
                        }`}
                      >
                        {t('workspace.shelf.filter.owned')} {ownedCount}
                      </button>
                      <button
                        type='button'
                        onClick={() => setFilter('joined')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer shadow-2xs transition-colors ${
                          filter === 'joined'
                            ? 'bg-stone-900 text-white font-semibold'
                            : 'bg-white border border-stone-200 text-stone-700 hover:text-stone-900'
                        }`}
                      >
                        {t('workspace.shelf.filter.joined')} {workspaces.length - ownedCount}
                      </button>
                    </div>
                  )}

                  {/* Search & Sort Input */}
                  {showSearch && (
                    <div className='flex items-center gap-3 ml-auto'>
                      <div className='relative w-full sm:w-72'>
                        <Search
                          className='absolute left-3 top-2.5 w-4 h-4 text-stone-400 pointer-events-none'
                          aria-hidden='true'
                        />
                        <input
                          type='search'
                          role='searchbox'
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={t('workspace.shelf.search.placeholder')}
                          aria-label={t('workspace.shelf.search.placeholder')}
                          className='w-full bg-white pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
                        />
                      </div>
                      <div className='relative shrink-0'>
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value as typeof sort)}
                          aria-label={t('workspace.shelf.search.sort')}
                          className='bg-white border border-stone-200 text-stone-700 px-3 py-2 rounded-xl text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-orange-600 cursor-pointer pr-7 appearance-none font-medium'
                        >
                          <option value='created'>{t('workspace.shelf.search.created')}</option>
                          <option value='name'>{t('workspace.shelf.search.name')}</option>
                          <option value='recent'>{t('workspace.shelf.search.recent')}</option>
                        </select>
                        <ArrowUpDown
                          className='w-3 h-3 text-stone-400 absolute right-2.5 top-3 pointer-events-none'
                          aria-hidden='true'
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {q && visibleWorkspaces.length === 0 && (
                <p className='text-sm text-stone-600 mb-5'>
                  {t('workspace.shelf.search.empty', { query: query.trim() })}
                </p>
              )}

              {/* STUDIO DIRECTORY GRID (Stitch 4-Column Grid) */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch'>
                {visibleWorkspaces.map((ws) => {
                  const tone = toneFor(ws.id);
                  const isRecent = ws.id === recentWorkspaceId;
                  const isProducer =
                    String(ws.currentUserRole || '').toUpperCase() === 'PRODUCER' || ws.isOwner;
                  const isEditor = String(ws.currentUserRole || '').toUpperCase() === 'EDITOR';
                  const mayManageCover = canManageCover(ws);

                  const quota = ws.storageQuotaBytes || 0;
                  const used = ws.usedStorageBytes || 0;
                  const storagePercent =
                    quota > 0 ? Math.min(100, Math.max(0, Math.round((used / quota) * 100))) : 0;

                  return (
                    <article
                      key={ws.id}
                      aria-label={ws.name}
                      className='bg-white border border-stone-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-orange-300 transition-all group'
                    >
                      <div className='flex flex-col gap-3.5'>
                        {/* Cover / Series Shelf / Visual Header */}
                        <div className='relative w-full h-32 rounded-xl overflow-hidden bg-stone-100'>
                          {ws.coverUrl ? (
                            <AuthenticatedImage
                              src={ws.coverUrl}
                              alt={t('workspace.notices.coverAlt', { name: ws.name })}
                              className='w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]'
                              loading='lazy'
                              fallback={
                                <StudioCoverFallback name={ws.name} tone={tone} id={ws.id} />
                              }
                            />
                          ) : (ws.seriesPreviews?.length ?? 0) > 0 ? (
                            <SeriesShelf
                              series={ws.seriesPreviews!}
                              more={Math.max(0, (ws.seriesCount ?? 0) - ws.seriesPreviews!.length)}
                              tone={tone}
                            />
                          ) : (
                            <StudioCoverFallback name={ws.name} tone={tone} id={ws.id} />
                          )}

                          {mayManageCover && (
                            <div className='absolute top-2.5 right-2.5 z-20'>
                              <button
                                type='button'
                                onClick={() => setCoverModalWorkspace(ws)}
                                title={t('workspace.shelf.changeCover')}
                                aria-label={t('workspace.shelf.changeCover')}
                                className='p-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-700 border border-stone-200 shadow-xs backdrop-blur-xs cursor-pointer'
                              >
                                <Camera
                                  className='w-3.5 h-3.5 text-orange-600'
                                  aria-hidden='true'
                                />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Header: Icon, Name, Role Badge */}
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex items-center gap-2.5 min-w-0'>
                            <div
                              className='w-9 h-9 rounded-lg flex items-center justify-center text-sm font-serif font-bold shrink-0 shadow-2xs'
                              style={{
                                backgroundColor: isProducer
                                  ? '#FFEDD5'
                                  : isEditor
                                    ? '#E0F2FE'
                                    : '#F5F5F4',
                                color: isProducer ? '#C2410C' : isEditor ? '#0369A1' : '#44403C',
                              }}
                            >
                              {ws.name.trim().charAt(0).toUpperCase() || '🏢'}
                            </div>
                            <div className='min-w-0 flex-1'>
                              <h3 className='font-bold text-stone-900 text-sm leading-snug line-clamp-1'>
                                {ws.name}
                              </h3>
                              <span className='text-[11px] text-stone-400 block truncate'>
                                {ws.ownerName
                                  ? `${t('workspace.owner')}: ${ws.ownerName}`
                                  : t('workspace.shelf.studioOrg')}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                              isProducer
                                ? 'bg-orange-100 text-orange-700'
                                : isEditor
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {roleLabel(ws.currentUserRole)}
                          </span>
                        </div>

                        {/* Description */}
                        {ws.description?.trim() ? (
                          <p className='text-xs text-stone-600 leading-relaxed line-clamp-2'>
                            {ws.description.trim()}
                          </p>
                        ) : null}

                        {/* Operational Stats Box (Stitch Spec) */}
                        <div className='grid grid-cols-2 gap-2 bg-[#FAF9F5] p-2.5 rounded-xl border border-stone-200/80 text-xs'>
                          <div>
                            <span className='text-[11px] text-stone-400 block'>
                              {t('workspace.shelf.seriesStatLabel')}
                            </span>
                            <span className='font-bold text-stone-900 text-xs'>
                              {ws.seriesCount !== undefined && ws.seriesCount > 0
                                ? t('workspace.shelf.series', { count: ws.seriesCount })
                                : t('workspace.shelf.noSeries')}
                            </span>
                          </div>
                          <div>
                            <span className='text-[11px] text-stone-400 block'>
                              {t('workspace.shelf.scaleStatLabel')}
                            </span>
                            <span className='font-bold text-stone-900 text-xs'>
                              {t('workspace.shelf.members', { count: ws.memberCount ?? 1 })}
                            </span>
                          </div>

                          {/* Storage Bar (Only Producer / Owner) */}
                          {mayManageCover && (
                            <div
                              className='col-span-2 pt-1 border-t border-stone-200/60 mt-1'
                              data-testid='ws-card-storage'
                            >
                              <div className='flex items-center justify-between text-[11px] mb-1 text-stone-500'>
                                <span>{t('workspace.shelf.storage')}</span>
                                <span className='font-semibold text-stone-700 font-mono'>
                                  {formatBytes(used)} / {quota > 0 ? formatBytes(quota) : '—'}
                                </span>
                              </div>
                              <div
                                className='w-full bg-stone-200 h-1.5 rounded-full overflow-hidden'
                                role='progressbar'
                                aria-label={t('workspace.shelf.storage')}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={storagePercent}
                              >
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    storagePercent >= 90
                                      ? 'bg-rose-500'
                                      : storagePercent >= 75
                                        ? 'bg-amber-500'
                                        : 'bg-orange-600'
                                  }`}
                                  style={{ width: `${storagePercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Series Showcase row (chỉ hiện tag riêng khi studio đã có ảnh bìa riêng) */}
                        {ws.coverUrl && ws.seriesPreviews && ws.seriesPreviews.length > 0 && (
                          <div className='flex flex-col gap-1'>
                            <span className='text-[11px] font-semibold text-stone-500'>
                              {t('workspace.shelf.featuredSeries')}
                            </span>
                            <div className='flex items-center gap-1.5 overflow-hidden flex-wrap'>
                              {ws.seriesPreviews.map((s) => (
                                <span
                                  key={s.id}
                                  title={s.title}
                                  className='px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-medium truncate max-w-[120px]'
                                >
                                  {s.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending Tasks / Editor Reviews alert badge */}
                        {(ws.pendingTasks ?? 0) > 0 && !isEditor && (
                          <div className='text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5'>
                            <ListTodo className='w-3.5 h-3.5 shrink-0' />
                            <span>
                              {t('workspace.shelf.pendingForYou', {
                                count: ws.pendingTasks ?? 0,
                              })}
                            </span>
                          </div>
                        )}
                        {((ws.pendingEditorReviews ?? 0) > 0 || isEditor) && (
                          <div
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border ${
                              (ws.pendingEditorReviews ?? 0) > 0
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-stone-50 text-stone-600 border-stone-200'
                            }`}
                          >
                            <ShieldCheck className='w-3.5 h-3.5 shrink-0' />
                            <span>
                              {(ws.pendingEditorReviews ?? 0) > 0
                                ? t('workspace.shelf.pendingReviews', {
                                    count: ws.pendingEditorReviews ?? 0,
                                  })
                                : t('workspace.shelf.noPendingReviews')}
                            </span>
                          </div>
                        )}

                        {/* Member Previews */}
                        {ws.memberPreviews && ws.memberPreviews.length > 0 && (
                          <div className='flex items-center -space-x-1.5 pt-0.5'>
                            {ws.memberPreviews.slice(0, 4).map((member) => (
                              <span
                                key={member.userId}
                                title={member.fullName}
                                className='relative inline-block w-6 h-6 rounded-full border-2 border-white bg-stone-200 overflow-hidden shrink-0'
                              >
                                <span className='w-full h-full flex items-center justify-center text-[10px] font-bold text-stone-700'>
                                  {member.fullName.charAt(0).toUpperCase()}
                                </span>
                                {member.avatarUrl && (
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.fullName}
                                    className='absolute inset-0 w-full h-full object-cover'
                                    onError={(e) => e.currentTarget.remove()}
                                  />
                                )}
                              </span>
                            ))}
                            {ws.memberCount > ws.memberPreviews.length && (
                              <span className='inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-stone-100 text-[10px] font-bold text-stone-600'>
                                +{ws.memberCount - ws.memberPreviews.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Activity & Entry CTA */}
                      <div className='pt-3.5 mt-3.5 border-t border-stone-100 flex items-center justify-between gap-2'>
                        <span className='text-[11px] text-stone-500 inline-flex items-center gap-1'>
                          <Clock className='w-3 h-3' aria-hidden='true' />
                          {ws.lastActivityAt
                            ? t('workspace.shelf.updated', { days: timeAgo(ws.lastActivityAt) })
                            : t('workspace.shelf.created', { days: timeAgo(ws.createdAt) })}
                        </span>

                        <button
                          type='button'
                          onClick={() => onSelectWorkspace(ws)}
                          aria-label={`${t('workspace.shelf.enter')}: ${ws.name}`}
                          className='bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap'
                        >
                          <span>
                            {isEditor
                              ? t('workspace.shelf.enterReview')
                              : t('workspace.shelf.enterHub')}
                          </span>
                          <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* DASHED CARD: TẠO KHÔNG GIAN STUDIO MỚI (Stitch Card 4) */}
                <div
                  onClick={handleOpenCreate}
                  className='border-2 border-dashed border-stone-300 hover:border-orange-500 bg-white/60 hover:bg-orange-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group min-h-[280px]'
                >
                  <div className='w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform'>
                    <Building2 className='w-7 h-7' />
                  </div>
                  <div>
                    <h3 className='font-bold text-stone-900 text-base group-hover:text-orange-600 transition-colors'>
                      {t('workspace.shelf.createCardTitle')}
                    </h3>
                    <p className='text-xs text-stone-500 max-w-xs mt-1 leading-relaxed'>
                      {t('workspace.shelf.createCardDesc')}
                    </p>
                  </div>
                  <button
                    type='button'
                    className='mt-2 px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-xs group-hover:bg-orange-600 group-hover:border-orange-600 group-hover:text-white transition-colors cursor-pointer shadow-2xs'
                  >
                    {t('workspace.shelf.createCardCta')}
                  </button>
                </div>
              </div>
            </>
          )}
        </PageContainer>
      </main>

      {/* Modal Tạo Workspace Thật (POST /api/Workspaces) */}
      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newWs) => {
          setWorkspaces((prev) => [
            { ...newWs, currentUserRole: normalizeWorkspaceRole(newWs.currentUserRole) },
            ...prev,
          ]);
        }}
      />

      {/* Modal Đổi Ảnh Bìa Studio Lưu Lên R2 (PUT /api/workspaces/{id}/cover) */}
      {coverModalWorkspace && (
        <WorkspaceCoverPickerDialog
          isOpen={!!coverModalWorkspace}
          workspace={coverModalWorkspace}
          tone={toneFor(coverModalWorkspace.id)}
          onClose={() => setCoverModalWorkspace(null)}
          onSuccess={(newCoverUrl) => {
            const targetId = coverModalWorkspace.id;
            setWorkspaces((prev) =>
              prev.map((w) => (w.id === targetId ? { ...w, coverUrl: newCoverUrl } : w)),
            );
          }}
        />
      )}
    </div>
  );
};
