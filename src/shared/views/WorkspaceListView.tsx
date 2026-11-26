import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  LayoutGrid,
  Plus,
  ArrowRight,
  LogOut,
  AlertCircle,
  RotateCw,
  Camera,
  Clock,
  ListTodo,
  ShieldCheck,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { formatBytes } from './studio-overview/formatters';
import { PendingInvitations, TodayTasks, type PendingInvitation } from './WorkspaceShelfSections';
import { Alert, PageHeader } from '@/shared/ui';
import { sortByDue, type TodayTask } from './workspaceShelfTasks';
import { WorkspaceDto, WorkspaceRole, normalizeWorkspaceRole } from '@/types';
import { workspaceService } from '@/services/workspace.service';
import { CreateWorkspaceModal } from '@/roles/producer/modals/CreateWorkspaceModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { useTranslation } from '@/lib/i18n';
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

const getStudioEmoji = (name: string) => {
  const emojis = ['🏢', '🖋️', '🎨', '⚡', '⛩️', '📚'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return emojis[h % emojis.length];
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

  // Lấy danh sách Workspace từ API
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

  // Phân tích vai trò thực tế từ danh sách workspaces
  const roleCounts = useMemo(() => {
    const counts = {
      all: workspaces.length,
      producer: 0,
      editor: 0,
      artist: 0,
      writer: 0,
      letterer: 0,
    };
    for (const ws of workspaces) {
      const isProd = ws.isOwner || String(ws.currentUserRole || '').toUpperCase() === 'PRODUCER';
      if (isProd) {
        counts.producer += 1;
      } else {
        const role = String(ws.currentUserRole || '').toUpperCase();
        if (role === 'EDITOR') counts.editor += 1;
        else if (role === 'ARTIST') counts.artist += 1;
        else if (role === 'WRITER') counts.writer += 1;
        else if (role === 'LETTERER') counts.letterer += 1;
      }
    }
    return counts;
  }, [workspaces]);

  // Bộ lọc theo vai trò
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const roleFilters = useMemo(() => {
    const list: Array<{ id: string; label: string; count: number }> = [
      {
        id: 'all',
        label: t('workspace.studioHub.directory.filterAll', { count: roleCounts.all }),
        count: roleCounts.all,
      },
    ];
    if (roleCounts.producer > 0) {
      list.push({
        id: 'Producer',
        label: t('workspace.studioHub.directory.filterProducer', { count: roleCounts.producer }),
        count: roleCounts.producer,
      });
    }
    if (roleCounts.editor > 0) {
      list.push({
        id: 'Editor',
        label: t('workspace.studioHub.directory.filterEditor', { count: roleCounts.editor }),
        count: roleCounts.editor,
      });
    }
    if (roleCounts.artist > 0) {
      list.push({
        id: 'Artist',
        label: t('workspace.studioHub.directory.filterArtist', { count: roleCounts.artist }),
        count: roleCounts.artist,
      });
    }
    if (roleCounts.writer > 0) {
      list.push({
        id: 'Writer',
        label: t('workspace.studioHub.directory.filterWriter', { count: roleCounts.writer }),
        count: roleCounts.writer,
      });
    }
    return list;
  }, [roleCounts, t]);

  const showFilter = roleFilters.length > 1;

  const filteredByRole = useMemo(() => {
    if (selectedRoleFilter === 'all') return workspaces;
    if (selectedRoleFilter === 'Producer') {
      return workspaces.filter(
        (w) => w.isOwner || String(w.currentUserRole || '').toUpperCase() === 'PRODUCER',
      );
    }
    if (selectedRoleFilter === 'Editor') {
      return workspaces.filter((w) => String(w.currentUserRole || '').toUpperCase() === 'EDITOR');
    }
    if (selectedRoleFilter === 'Artist') {
      return workspaces.filter((w) => String(w.currentUserRole || '').toUpperCase() === 'ARTIST');
    }
    if (selectedRoleFilter === 'Writer') {
      return workspaces.filter((w) => String(w.currentUserRole || '').toUpperCase() === 'WRITER');
    }
    return workspaces;
  }, [workspaces, selectedRoleFilter]);

  // Tìm kiếm Studio
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'created' | 'recent' | 'name'>('created');
  const q = query.trim().toLowerCase();
  const searched = useMemo(() => {
    if (!q) return filteredByRole;
    return filteredByRole.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.ownerName || '').toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q),
    );
  }, [filteredByRole, q]);

  const activityTime = (w: WorkspaceDto) => new Date(w.lastActivityAt || w.createdAt).getTime();
  const visibleWorkspaces = useMemo(() => {
    if (sort === 'created') return searched;
    return [...searched].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, lang === 'en' ? 'en' : 'vi')
        : activityTime(b) - activityTime(a),
    );
  }, [searched, sort, lang]);

  const createButton = (
    <button
      type='button'
      onClick={handleOpenCreate}
      className='bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs shrink-0'
    >
      <Plus className='w-4 h-4' aria-hidden='true' />
      <span>{t('workspace.shelf.create')}</span>
    </button>
  );

  return (
    <div className='min-h-screen flex flex-col font-sans bg-[#FAF9F5] text-stone-900'>
      {/* 1. STICKY TOP HEADER (Stitch Multi-Studio Navigation) */}
      <header className='h-16 bg-white border-b border-stone-200 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-40 shadow-[inset_0_2px_0_var(--studio-accent)]'>
        <div className='flex items-center shrink-0'>
          <div className='flex items-center gap-1.5 cursor-pointer select-none'>
            <span className='text-lg font-bold text-orange-600 tracking-tight font-serif'>
              PanelForge
            </span>
            <span className='text-xs font-bold tracking-wider uppercase bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded'>
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
              <span className='text-stone-500 text-xs'>{currentUser.role || 'Producer'}</span>
              <div className='w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 ml-0.5 overflow-hidden'>
                {avatarUrl && !avatarFailed ? (
                  <img
                    src={avatarUrl}
                    alt=''
                    className='w-full h-full object-cover'
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className='text-xs font-bold'>
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
              <p className='text-xs text-stone-900 mb-4'>{t('workspace.shelf.loadError')}</p>
              <button
                type='button'
                onClick={fetchWorkspaces}
                className='bg-stone-900 text-white inline-flex items-center gap-2 h-10 px-4 text-xs font-semibold rounded-lg hover:bg-stone-800 cursor-pointer'
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
              {/* STITCH HEADER (VIEW 1: DIRECTORY) */}
              <PageHeader
                icon={<Building2 className='w-5 h-5' />}
                title={
                  <div className='flex items-center gap-3'>
                    <span>{t('workspace.studioHub.directory.title')}</span>
                    <span
                      id='dir-total-badge'
                      className='px-2.5 py-0.5 rounded-full bg-kraft text-kraft-ink font-semibold text-xs'
                    >
                      {workspaces.length} Studio
                    </span>
                  </div>
                }
                description={
                  <div>
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
                }
                actions={
                  canCreate && (
                    <button
                      type='button'
                      onClick={handleOpenCreate}
                      className='bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto'
                    >
                      <Plus className='w-4 h-4' />
                      <span>{t('workspace.studioHub.directory.createStudioBtn')}</span>
                    </button>
                  )
                }
              />

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

              {/* TOOLBAR: ROLE FILTER & SEARCH BAR (Stitch Directory View) */}
              <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                {/* Filter Pills */}
                {showFilter && (
                  <div
                    className='flex items-center gap-2 flex-wrap'
                    role='group'
                    aria-label={t('workspace.studioHub.directory.filterRoleLabel')}
                  >
                    <span className='text-xs font-semibold text-stone-500 mr-1'>
                      {t('workspace.studioHub.directory.filterRoleLabel')}
                    </span>
                    {roleFilters.map((pill) => {
                      const isActive = selectedRoleFilter === pill.id;
                      return (
                        <button
                          key={pill.id}
                          type='button'
                          onClick={() => setSelectedRoleFilter(pill.id)}
                          className={`dir-role-pill px-3.5 py-1.5 rounded-lg text-xs cursor-pointer shadow-2xs transition-colors ${
                            isActive
                              ? 'bg-stone-900 text-white font-semibold'
                              : 'bg-white border border-stone-200 text-stone-700 hover:text-stone-900 font-medium'
                          }`}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search & Sort Input */}
                <div className='flex items-center gap-3 ml-auto w-full md:w-auto'>
                  <div className='relative w-full md:w-72'>
                    <Search
                      className='absolute left-3 top-2.5 w-4 h-4 text-stone-400 pointer-events-none'
                      aria-hidden='true'
                    />
                    <input
                      id='dir-search-input'
                      type='search'
                      role='searchbox'
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('workspace.studioHub.directory.searchPlaceholder')}
                      aria-label={t('workspace.studioHub.directory.searchPlaceholder')}
                      className='w-full bg-white pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
                    />
                  </div>
                  {workspaces.length >= 6 && (
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
                  )}
                </div>
              </div>

              {q && visibleWorkspaces.length === 0 && (
                <p className='text-xs text-stone-600 mb-5'>
                  {t('workspace.shelf.search.empty', { query: query.trim() })}
                </p>
              )}

              {/* STUDIO DIRECTORY GRID (Stitch 4-Column Grid) */}
              <div
                id='dir-studio-grid'
                className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch'
              >
                {visibleWorkspaces.map((ws) => {
                  const isCurrent = ws.id === recentWorkspaceId;
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
                      data-role={ws.currentUserRole || 'Member'}
                      data-title={ws.name.toLowerCase()}
                      className={`studio-dir-card bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all group ${
                        isCurrent
                          ? 'border-orange-400 ring-2 ring-orange-400/20 shadow-sm'
                          : 'border-stone-200 shadow-xs hover:shadow-md hover:border-orange-200'
                      }`}
                    >
                      <div className='flex flex-col gap-4'>
                        {/* Header: Icon Tile, Name, Subline, Role Badge */}
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex items-center gap-3 min-w-0'>
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 shadow-2xs relative ${
                                isProducer
                                  ? 'bg-orange-100 text-orange-700'
                                  : isEditor
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {getStudioEmoji(ws.name)}
                              {mayManageCover && (
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCoverModalWorkspace(ws);
                                  }}
                                  title={t('workspace.shelf.changeCover')}
                                  aria-label={t('workspace.shelf.changeCover')}
                                  className='absolute -bottom-1 -right-1 p-1 rounded-md bg-white border border-stone-200 shadow-xs text-stone-600 hover:text-orange-600 cursor-pointer transition-colors'
                                >
                                  <Camera className='w-3 h-3 text-orange-600' aria-hidden='true' />
                                </button>
                              )}
                            </div>
                            <div className='min-w-0 flex-1'>
                              <h3 className='font-bold text-stone-900 text-base leading-snug truncate'>
                                {ws.name}
                              </h3>
                              <span className='text-xs text-stone-400 block truncate'>
                                {ws.ownerName ? `${t('workspace.owner')}: ${ws.ownerName}` : '—'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                              isProducer
                                ? 'bg-orange-100 text-orange-700'
                                : isEditor
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {roleLabel(ws.currentUserRole)}
                          </span>
                        </div>

                        {/* Description */}
                        <p className='text-xs text-stone-600 leading-relaxed line-clamp-2'>
                          {ws.description?.trim() || '—'}
                        </p>

                        {/* Operational Stats Box (Stitch Spec: Bộ truyện, Quy mô, Lưu trữ) */}
                        <div className='grid grid-cols-2 gap-2 bg-[#FAF9F5] p-3 rounded-xl border border-stone-200/80 text-xs'>
                          <div>
                            <span className='text-xs text-stone-400 block'>
                              {t('workspace.studioHub.directory.seriesLabel')}
                            </span>
                            <span className='font-bold text-stone-900 text-sm'>
                              {ws.seriesCount !== undefined && ws.seriesCount > 0
                                ? t('workspace.shelf.series', { count: ws.seriesCount })
                                : t('workspace.shelf.noSeries')}
                            </span>
                          </div>
                          <div>
                            <span className='text-xs text-stone-400 block'>
                              {t('workspace.studioHub.directory.membersLabel')}
                            </span>
                            <span className='font-bold text-stone-900 text-sm'>
                              {t('workspace.shelf.members', { count: ws.memberCount ?? 1 })}
                            </span>
                          </div>

                          {/* Storage Bar (Stitch Directory Spec: Lưu trữ: used / quota + %) */}
                          {(mayManageCover || quota > 0) && (
                            <div
                              className='col-span-2 pt-1 border-t border-stone-200/60 mt-1'
                              data-testid='ws-card-storage'
                            >
                              <div className='flex items-center justify-between text-xs mb-1'>
                                <span className='text-stone-500'>
                                  {t('workspace.studioHub.directory.storageLabel', {
                                    used: formatBytes(used),
                                    quota: quota > 0 ? formatBytes(quota) : '—',
                                  })}
                                </span>
                                <span className='font-semibold text-stone-700 font-mono'>
                                  {quota > 0 ? `${storagePercent}%` : '—'}
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

                        {/* Featured Series chips (Stitch Spec: only if API returns them) */}
                        {ws.seriesPreviews && ws.seriesPreviews.length > 0 && (
                          <div className='flex flex-col gap-1.5' data-testid='ws-series-shelf'>
                            <span className='text-xs font-semibold text-stone-500'>
                              {t('workspace.studioHub.directory.featuredSeries')}
                            </span>
                            <div className='flex items-center gap-2 overflow-hidden flex-wrap'>
                              {ws.seriesPreviews.slice(0, 2).map((s) => (
                                <span
                                  key={s.id}
                                  title={s.title}
                                  className='px-2 py-1 rounded bg-stone-100 text-stone-700 text-xs font-medium truncate max-w-[130px]'
                                >
                                  {s.title}
                                </span>
                              ))}
                              {ws.seriesCount !== undefined &&
                                ws.seriesCount > ws.seriesPreviews.length && (
                                  <span className='px-2 py-1 rounded bg-stone-100 text-stone-700 text-xs font-medium shrink-0'>
                                    +{ws.seriesCount - ws.seriesPreviews.length}
                                  </span>
                                )}
                            </div>
                          </div>
                        )}

                        {/* Member Previews (Avatar bubbles when members exist) */}
                        {ws.memberPreviews && ws.memberPreviews.length > 0 && (
                          <div className='flex items-center -space-x-1.5 pt-0.5'>
                            {ws.memberPreviews.slice(0, 4).map((member) => (
                              <span
                                key={member.userId}
                                title={member.fullName}
                                className='relative inline-block w-6 h-6 rounded-full border-2 border-white bg-stone-200 overflow-hidden shrink-0'
                              >
                                <span className='w-full h-full flex items-center justify-center text-xs font-bold text-stone-700'>
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
                              <span className='inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-stone-100 text-xs font-bold text-stone-600'>
                                +{ws.memberCount - ws.memberPreviews.length}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Pending Tasks & Editor Reviews indicators */}
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
                      </div>

                      {/* Card Footer: Status & Entry CTA */}
                      <div className='pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-2'>
                        {isCurrent ? (
                          <span className='text-xs text-emerald-600 font-medium flex items-center gap-1.5'>
                            <span className='w-2 h-2 rounded-full bg-emerald-600 shrink-0' />
                            {t('workspace.studioHub.directory.currentStudio')}
                          </span>
                        ) : ws.lastActivityAt ? (
                          <span className='text-xs text-stone-400 font-medium inline-flex items-center gap-1 truncate'>
                            <Clock className='w-3 h-3' aria-hidden='true' />
                            {t('workspace.shelf.updated', { days: timeAgo(ws.lastActivityAt) })}
                          </span>
                        ) : (
                          <span className='text-xs text-stone-400 font-medium truncate'>
                            {isEditor
                              ? t('workspace.studioHub.directory.rolePermissionEditor')
                              : '—'}
                          </span>
                        )}

                        <button
                          type='button'
                          onClick={() => onSelectWorkspace(ws)}
                          aria-label={`${t('workspace.shelf.enter')}: ${ws.name}`}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap ${
                            isCurrent
                              ? 'bg-orange-600 hover:bg-orange-700 text-white'
                              : 'bg-stone-900 hover:bg-orange-600 text-white'
                          }`}
                        >
                          <span>
                            {isEditor
                              ? t('workspace.shelf.enterReview')
                              : t('workspace.studioHub.directory.enterStudio')}
                          </span>
                          <ArrowRight className='w-4 h-4' aria-hidden='true' />
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* DASHED CARD: TẠO KHÔNG GIAN STUDIO MỚI (Stitch Card 4) */}
                {canCreate && (
                  <div
                    onClick={handleOpenCreate}
                    className='border-2 border-dashed border-stone-300 hover:border-orange-500 bg-white/60 hover:bg-orange-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group min-h-[300px]'
                  >
                    <div className='w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform'>
                      <Building2 className='w-7 h-7' aria-hidden='true' />
                    </div>
                    <div>
                      <h3 className='font-bold text-stone-900 text-base group-hover:text-orange-600 transition-colors'>
                        {t('workspace.studioHub.directory.createNewCard')}
                      </h3>
                      <p className='text-xs text-stone-500 max-w-xs mt-1 leading-relaxed'>
                        {t('workspace.studioHub.directory.createNewDesc')}
                      </p>
                    </div>
                    <button
                      type='button'
                      className='mt-2 px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-xs group-hover:bg-orange-600 group-hover:border-orange-600 group-hover:text-white transition-colors cursor-pointer shadow-2xs'
                    >
                      {t('workspace.studioHub.directory.startSetup')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </PageContainer>
      </main>

      {/* Modals */}
      {isModalOpen && (
        <CreateWorkspaceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(created) => {
            fetchWorkspaces();
            onSelectWorkspace(created);
          }}
        />
      )}

      {coverModalWorkspace && (
        <WorkspaceCoverPickerDialog
          workspace={coverModalWorkspace}
          isOpen={Boolean(coverModalWorkspace)}
          onClose={() => setCoverModalWorkspace(null)}
          onSuccess={(newUrl) => {
            setWorkspaces((prev) =>
              prev.map((w) => (w.id === coverModalWorkspace.id ? { ...w, coverUrl: newUrl } : w)),
            );
          }}
        />
      )}
    </div>
  );
};
