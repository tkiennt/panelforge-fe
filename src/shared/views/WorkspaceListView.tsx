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
  BookOpen,
  Users,
  X,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { formatBytes } from './studio-overview/formatters';
import { PendingInvitations, TodayTasks, type PendingInvitation } from './WorkspaceShelfSections';
import { Alert, Card, CardBody, CardHeader, PageHeader, SectionHeader } from '@/shared/ui';
import { sortByDue, type TodayTask } from './workspaceShelfTasks';
import { WorkspaceDto, WorkspaceRole, normalizeWorkspaceRole } from '@/types';
import { workspaceService } from '@/services/workspace.service';
import { CreateWorkspaceModal } from '@/roles/producer/modals/CreateWorkspaceModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { SeriesBannerFallback } from '@/shared/features/series-identity/SeriesImageFallbacks';
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

const getStudioMonogram = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return 'S';
  const words = trimmed.split(/[\s_-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
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

  // Bộ lọc theo vai trò: chỉ hiển thị khi người dùng có từ 2 vai trò khác nhau trở lên trên các Studio
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
    if (roleCounts.letterer > 0) {
      list.push({
        id: 'Letterer',
        label: t('workspace.studioHub.directory.filterLetterer', { count: roleCounts.letterer }),
        count: roleCounts.letterer,
      });
    }
    return list;
  }, [roleCounts, t]);

  // roleFilters[0] là "All", nên chỉ khi có >= 2 vai trò thực tế (length > 2) bộ lọc mới có tác dụng lọc
  const showFilter = roleFilters.length > 2;

  const filteredByRole = useMemo(() => {
    if (!showFilter || selectedRoleFilter === 'all') return workspaces;
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
    if (selectedRoleFilter === 'Letterer') {
      return workspaces.filter((w) => String(w.currentUserRole || '').toUpperCase() === 'LETTERER');
    }
    return workspaces;
  }, [workspaces, selectedRoleFilter, showFilter]);

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

  // DESIGN_RULES §4.8.4: tối đa 1 thẻ nổi bật (studio gần nhất > studio có việc chờ > studio duy nhất)
  const featuredWorkspaceId = useMemo(() => {
    if (recentWorkspaceId && visibleWorkspaces.some((w) => w.id === recentWorkspaceId)) {
      return recentWorkspaceId;
    }
    const withUrgentOrPending = visibleWorkspaces.find(
      (w) => (w.pendingTasks ?? 0) > 0 || (w.pendingEditorReviews ?? 0) > 0,
    );
    if (withUrgentOrPending) return withUrgentOrPending.id;
    return visibleWorkspaces.length === 1 ? (visibleWorkspaces[0]?.id ?? null) : null;
  }, [visibleWorkspaces, recentWorkspaceId]);

  const totalGridItems = visibleWorkspaces.length + (canCreate ? 1 : 0);
  const gridClass =
    totalGridItems <= 2
      ? 'grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch'
      : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch';

  const createButton = (
    <button
      type='button'
      onClick={handleOpenCreate}
      className='focus-ring bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs shrink-0'
    >
      <Plus className='w-4 h-4' aria-hidden='true' />
      <span>{t('workspace.shelf.create')}</span>
    </button>
  );

  return (
    <div className='min-h-screen flex flex-col font-sans bg-[#FAF9F5] text-stone-900'>
      {/* 1. STICKY TOP HEADER (§4.8.2 Toolbar strip) */}
      <header className='h-16 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-[inset_0_2px_0_var(--studio-accent)]'>
        <div className='max-w-7xl mx-auto w-full flex items-center justify-between gap-4'>
          <div className='flex items-center shrink-0'>
            <div className='flex items-center gap-1.5 select-none'>
              <span className='text-lg font-bold text-orange-600 tracking-tight font-serif'>
                PanelForge
              </span>
              <span className='text-xs font-bold tracking-wider uppercase bg-kraft text-kraft-ink px-1.5 py-0.5 rounded'>
                STUDIO
              </span>
            </div>
            <div className='h-5 w-px bg-stone-200 mx-3' aria-hidden='true' />
            <div className='flex items-center gap-1 text-xs font-medium'>
              <span className='px-2.5 py-1 rounded-lg text-kraft-ink bg-head-wash font-semibold flex items-center gap-1.5 border border-head-line'>
                <LayoutGrid className='w-3.5 h-3.5 text-accent-dark' aria-hidden='true' />
                <span>Workspaces</span>
              </span>
            </div>
          </div>

          {/* User Pill & Actions */}
          <div className='flex items-center gap-2.5 shrink-0'>
            {currentUser && (
              <Link
                to='/profile'
                title={t('workspace.shelf.profile')}
                aria-label={`${t('workspace.shelf.profile')}: ${currentUser.name}`}
                className='focus-ring flex items-center gap-2 bg-head-wash/70 hover:bg-head-wash pl-3 pr-1.5 py-1 rounded-full border border-head-line transition-colors text-xs cursor-pointer'
              >
                <span className='font-semibold text-stone-800 truncate max-w-[160px]'>
                  {currentUser.name}
                </span>
                {isAdmin && (
                  <span className='rounded-full bg-kraft px-2 py-0.5 text-xs font-semibold text-kraft-ink'>
                    {t('workspace.studioHub.directory.adminBadge')}
                  </span>
                )}
                <div className='w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 overflow-hidden'>
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
                className='focus-ring hidden sm:inline-flex bg-white hover:bg-stone-50 text-stone-800 font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors cursor-pointer items-center gap-1.5 border border-stone-200 shadow-2xs whitespace-nowrap'
              >
                <Plus className='w-4 h-4 text-accent-dark' aria-hidden='true' />
                <span>{t('workspace.shelf.create')}</span>
              </button>
            )}

            {onLogout && (
              <button
                type='button'
                onClick={onLogout}
                title={t('profile.logout')}
                aria-label={t('profile.logout')}
                className='focus-ring min-w-9 min-h-9 inline-flex items-center justify-center p-2 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 bg-white transition-colors cursor-pointer'
              >
                <LogOut className='w-4 h-4' aria-hidden='true' />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN DIRECTORY CONTENT */}
      <main className='w-full flex-1 bg-[#FAF9F5]'>
        <PageContainer className='py-6 md:py-8 flex flex-col gap-6 max-w-7xl mx-auto'>
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
              <div className='border-b border-head-line pb-4 space-y-2 animate-pulse'>
                <div className='h-3 w-24 rounded bg-stone-200/70' />
                <div className='h-7 w-64 rounded bg-stone-200/70' />
                <div className='h-4 w-80 rounded bg-stone-200/70' />
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
                {[0, 1, 2].map((i) => (
                  <Card key={i} className='animate-pulse'>
                    <div className='h-14 bg-head-wash border-b border-head-line' />
                    <CardBody className='space-y-3'>
                      <div className='h-16 rounded-xl bg-stone-200/70' />
                      <div className='h-8 rounded-lg bg-stone-200/70' />
                    </CardBody>
                  </Card>
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
                className='focus-ring bg-orange-600 hover:bg-orange-700 text-white inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer'
              >
                <RotateCw className='w-4 h-4' aria-hidden='true' />
                {t('workspace.shelf.retry')}
              </button>
            </Alert>
          ) : workspaces.length === 0 ? (
            /* Empty State */
            <div className='mt-4 bg-head-wash/60 border-2 border-dashed border-head-line rounded-2xl p-10 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left'>
              <BlankPageSketch />
              <div className='flex-1'>
                <h1 className='text-2xl font-serif font-bold text-stone-900 mb-2 tracking-tight'>
                  {t('workspace.emptyTitle')}
                </h1>
                <p className='text-sm text-stone-600 leading-relaxed max-w-prose'>
                  {canCreate ? t('workspace.shelf.emptyCreate') : t('workspace.shelf.emptyInvite')}
                </p>
              </div>
              {canCreate && createButton}
            </div>
          ) : (
            <>
              {/* PAGE HEADER (§4.8.2 — directly on paper background, no hollow wrapper card) */}
              <PageHeader
                icon={<Building2 className='w-5 h-5' aria-hidden='true' />}
                eyebrow={t('workspace.shelf.hubBadge')}
                title={
                  <span className='inline-flex flex-wrap items-center gap-2.5'>
                    <span>{t('workspace.studioHub.directory.title')}</span>
                    <span
                      id='dir-total-badge'
                      className='px-2.5 py-0.5 rounded-full bg-kraft text-kraft-ink font-sans font-semibold text-xs tabular-nums'
                    >
                      {t('workspace.shelf.count', { count: workspaces.length })}
                    </span>
                  </span>
                }
                description={
                  <div>
                    <p className='text-stone-600 text-sm leading-relaxed' data-testid='ws-summary'>
                      {summary}
                    </p>
                    {(pendingTotal > 0 || reviewTotal > 0) && (
                      <div className='mt-2.5 flex flex-wrap items-center gap-2'>
                        {pendingTotal > 0 && (
                          <span
                            className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-xs font-medium tabular-nums'
                            data-testid='ws-chip-pending'
                          >
                            <ListTodo className='w-3.5 h-3.5' aria-hidden='true' />
                            {t('workspace.shelf.pendingForYou', { count: pendingTotal })}
                          </span>
                        )}
                        {reviewTotal > 0 && (
                          <span
                            className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium tabular-nums'
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
                  canCreate ? (
                    <button
                      type='button'
                      onClick={handleOpenCreate}
                      className='focus-ring bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs shrink-0'
                    >
                      <Plus className='w-4 h-4' aria-hidden='true' />
                      <span>{t('workspace.studioHub.directory.createStudioBtn')}</span>
                    </button>
                  ) : undefined
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

              {/* Recently Visited Studio Quick Resume */}
              {recent && (
                <div className='flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-head-wash border border-head-line text-xs'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Clock className='w-4 h-4 text-accent-dark shrink-0' aria-hidden='true' />
                    <p className='text-stone-700 truncate'>
                      {t('workspace.shelf.recent')}{' '}
                      <strong className='font-semibold text-stone-900'>{recent.name}</strong>
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => onSelectWorkspace(recent)}
                    className='focus-ring inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-900 rounded cursor-pointer shrink-0'
                  >
                    {t('workspace.shelf.continue')}
                    <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
                  </button>
                </div>
              )}

              {/* TOOLBAR: SMART ROLE FILTER (only when >= 2 distinct roles) OR SECTION HEADER + SEARCH */}
              {showFilter ? (
                <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
                  <div
                    className='flex items-center gap-1.5 flex-wrap'
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
                          className={`focus-ring dir-role-pill px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors border tabular-nums ${
                            isActive
                              ? 'bg-orange-50 text-orange-800 border-orange-300 font-semibold shadow-2xs'
                              : 'bg-white border-stone-200 text-stone-600 hover:bg-head-wash hover:text-stone-900 font-medium'
                          }`}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className='flex items-center gap-2.5 w-full lg:w-auto'>
                    <div className='relative flex-1 lg:w-72'>
                      <Search
                        className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none'
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
                        className='w-full bg-white pl-9 pr-8 py-2 rounded-xl border border-stone-200 text-stone-800 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
                      />
                      {query && (
                        <button
                          type='button'
                          onClick={() => setQuery('')}
                          aria-label={t('workspace.portal.clearSearch')}
                          className='focus-ring absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-stone-700 cursor-pointer'
                        >
                          <X className='w-3.5 h-3.5' aria-hidden='true' />
                        </button>
                      )}
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
                          className='w-3 h-3 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none'
                          aria-hidden='true'
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <SectionHeader
                  title={t('workspace.shelf.title')}
                  count={q ? `${visibleWorkspaces.length}/${workspaces.length}` : workspaces.length}
                  actions={
                    <div className='flex items-center gap-2.5 w-full sm:w-auto'>
                      <div className='relative flex-1 sm:w-72'>
                        <Search
                          className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none'
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
                          className='w-full bg-white pl-9 pr-8 py-2 rounded-xl border border-stone-200 text-stone-800 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
                        />
                        {query && (
                          <button
                            type='button'
                            onClick={() => setQuery('')}
                            aria-label={t('workspace.portal.clearSearch')}
                            className='focus-ring absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-stone-700 cursor-pointer'
                          >
                            <X className='w-3.5 h-3.5' aria-hidden='true' />
                          </button>
                        )}
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
                            className='w-3 h-3 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none'
                            aria-hidden='true'
                          />
                        </div>
                      )}
                    </div>
                  }
                />
              )}

              {q && visibleWorkspaces.length === 0 && (
                <div className='border-2 border-dashed border-head-line bg-head-wash/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-center'>
                  <Search className='w-6 h-6 text-accent-dark' aria-hidden='true' />
                  <p className='text-sm font-medium text-stone-800'>
                    {t('workspace.shelf.search.empty', { query: query.trim() })}
                  </p>
                </div>
              )}

              {/* STUDIO DIRECTORY GRID (Adaptive 2-col / 3-col balanced grid) */}
              <div id='dir-studio-grid' className={gridClass}>
                {visibleWorkspaces.map((ws) => {
                  const isCurrent = ws.id === recentWorkspaceId;
                  const isFeatured = ws.id === featuredWorkspaceId;
                  const isProducer =
                    String(ws.currentUserRole || '').toUpperCase() === 'PRODUCER' || ws.isOwner;
                  const isEditor = String(ws.currentUserRole || '').toUpperCase() === 'EDITOR';
                  const mayManageCover = canManageCover(ws);

                  const quota = ws.storageQuotaBytes || 0;
                  const used = ws.usedStorageBytes || 0;
                  const rawPercent = quota > 0 ? (used / quota) * 100 : 0;
                  const storagePercent =
                    quota > 0 ? Math.min(100, Math.max(0, Math.round(rawPercent))) : 0;
                  const storagePercentLabel =
                    quota <= 0
                      ? '—'
                      : used > 0 && storagePercent === 0
                        ? '<1%'
                        : `${storagePercent}%`;

                  const roleBadgeClass = isProducer
                    ? 'bg-orange-50 text-orange-800 border-orange-200'
                    : isEditor
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-kraft text-kraft-ink border-head-line';

                  const ctaLabel = isEditor
                    ? t('workspace.shelf.enterReview')
                    : isProducer
                      ? t('workspace.studioHub.directory.enterStudio')
                      : t('workspace.shelf.enter');

                  const descriptionText = ws.description?.trim();

                  return (
                    <Card
                      key={ws.id}
                      as='article'
                      featured={isFeatured}
                      aria-label={ws.name}
                      data-role={ws.currentUserRole || 'Member'}
                      data-title={ws.name.toLowerCase()}
                      className='studio-dir-card flex flex-col justify-between h-full transition-studio hover:shadow-md hover:border-orange-300 group min-w-0'
                    >
                      <div>
                        {/* CardHeader (§4.8.2 — Warm wash band + crisp serif monogram instead of OS emojis) */}
                        <div className='flex items-center justify-between gap-3 bg-head-wash border-b border-head-line px-5 py-3.5'>
                          <div className='flex items-center gap-3 min-w-0 flex-1'>
                            <div className='relative shrink-0'>
                              <div
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center font-serif font-bold text-sm tracking-tight select-none overflow-hidden ${
                                  isProducer
                                    ? 'bg-accent-soft text-accent-dark border-orange-200/80'
                                    : isEditor
                                      ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                                      : 'bg-white text-kraft-ink border-head-line'
                                }`}
                              >
                                {getStudioMonogram(ws.name)}
                              </div>
                              {mayManageCover && (
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCoverModalWorkspace(ws);
                                  }}
                                  title={t('workspace.shelf.changeCover')}
                                  aria-label={t('workspace.shelf.changeCover')}
                                  className='focus-ring absolute -bottom-1 -right-1 p-1 rounded-md bg-white border border-stone-200 shadow-xs text-stone-600 hover:text-orange-600 cursor-pointer transition-colors'
                                >
                                  <Camera className='w-3 h-3 text-accent-dark' aria-hidden='true' />
                                </button>
                              )}
                            </div>

                            <div className='min-w-0 flex-1'>
                              <h3
                                title={ws.name}
                                className='font-serif font-bold text-stone-900 text-base leading-snug truncate'
                              >
                                {ws.name}
                              </h3>
                              {ws.ownerName && (
                                <p className='text-xs text-stone-600 truncate'>
                                  {t('workspace.owner')}: {ws.ownerName}
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold shrink-0 whitespace-nowrap ${roleBadgeClass}`}
                          >
                            {roleLabel(ws.currentUserRole)}
                          </span>
                        </div>

                        {/* Studio Cover Banner when custom cover exists */}
                        {ws.coverUrl && (
                          <div className='relative h-32 w-full border-b border-head-line overflow-hidden bg-head-wash'>
                            <AuthenticatedImage
                              src={ws.coverUrl}
                              alt=''
                              loading='lazy'
                              className='w-full h-full object-cover !bg-head-wash'
                              fallback={<SeriesBannerFallback />}
                            />
                          </div>
                        )}
                      </div>

                      <CardBody className='flex-1 flex flex-col justify-between gap-4 p-5'>
                        <div className='flex flex-col gap-3.5'>
                          {/* Optional Description (no lonely dash when empty) */}
                          {descriptionText && (
                            <p className='text-xs text-stone-600 leading-relaxed line-clamp-2'>
                              {descriptionText}
                            </p>
                          )}

                          {/* Operational Stats Box (Series & Crew; Storage only for Producer/Owner) */}
                          <div className='grid grid-cols-2 gap-3 bg-[#FAF9F5] p-3.5 rounded-xl border border-stone-200/80 text-xs'>
                            <div className='space-y-0.5'>
                              <span className='text-xs text-stone-500 flex items-center gap-1'>
                                <BookOpen
                                  className='w-3.5 h-3.5 text-accent-dark shrink-0'
                                  aria-hidden='true'
                                />
                                <span>{t('workspace.studioHub.directory.seriesLabel')}</span>
                              </span>
                              <span className='font-bold text-stone-900 text-sm block tabular-nums'>
                                {ws.seriesCount !== undefined && ws.seriesCount > 0
                                  ? t('workspace.shelf.series', { count: ws.seriesCount })
                                  : t('workspace.shelf.noSeries')}
                              </span>
                            </div>
                            <div className='space-y-0.5'>
                              <span className='text-xs text-stone-500 flex items-center gap-1'>
                                <Users
                                  className='w-3.5 h-3.5 text-stone-500 shrink-0'
                                  aria-hidden='true'
                                />
                                <span>{t('workspace.studioHub.directory.membersLabel')}</span>
                              </span>
                              <span className='font-bold text-stone-900 text-sm block tabular-nums'>
                                {t('workspace.shelf.members', { count: ws.memberCount ?? 1 })}
                              </span>
                            </div>

                            {/* Storage Bar: Producer/Owner governance metric only */}
                            {mayManageCover && quota > 0 && (
                              <div
                                className='col-span-2 pt-2 border-t border-stone-200/70'
                                data-testid='ws-card-storage'
                              >
                                <div className='flex items-center justify-between text-xs mb-1.5'>
                                  <span className='text-stone-600 tabular-nums'>
                                    {t('workspace.studioHub.directory.storageLabel', {
                                      used: formatBytes(used),
                                      quota: formatBytes(quota),
                                    })}
                                  </span>
                                  <span className='font-semibold text-stone-700 font-mono tabular-nums'>
                                    {storagePercentLabel}
                                  </span>
                                </div>
                                <div
                                  className='w-full bg-stone-200/80 h-1.5 rounded-full overflow-hidden'
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

                          {/* Featured Series chips */}
                          {ws.seriesPreviews && ws.seriesPreviews.length > 0 && (
                            <div className='flex flex-col gap-1.5' data-testid='ws-series-shelf'>
                              <span className='text-xs font-semibold text-stone-500'>
                                {t('workspace.studioHub.directory.featuredSeries')}
                              </span>
                              <div className='flex items-center gap-1.5 flex-wrap'>
                                {ws.seriesPreviews.slice(0, 2).map((s) => (
                                  <span
                                    key={s.id}
                                    title={s.title}
                                    className='px-2.5 py-1 rounded-lg bg-head-wash border border-head-line text-kraft-ink text-xs font-medium truncate max-w-[240px]'
                                  >
                                    {s.title}
                                  </span>
                                ))}
                                {ws.seriesCount !== undefined &&
                                  ws.seriesCount > ws.seriesPreviews.length && (
                                    <span className='px-2 py-0.5 rounded-full bg-kraft text-kraft-ink font-mono text-xs font-semibold shrink-0 tabular-nums'>
                                      +{ws.seriesCount - ws.seriesPreviews.length}
                                    </span>
                                  )}
                              </div>
                            </div>
                          )}

                          {/* Crew Avatar Row & Actionable Work Badges */}
                          {((ws.memberPreviews && ws.memberPreviews.length > 0) ||
                            ((ws.pendingTasks ?? 0) > 0 && !isEditor) ||
                            (ws.pendingEditorReviews ?? 0) > 0 ||
                            isEditor) && (
                            <div className='flex flex-wrap items-center justify-between gap-2 pt-0.5'>
                              {ws.memberPreviews && ws.memberPreviews.length > 0 && (
                                <div className='flex items-center -space-x-1.5'>
                                  {ws.memberPreviews.slice(0, 4).map((member) => (
                                    <span
                                      key={member.userId}
                                      title={member.fullName}
                                      className='relative inline-block w-6 h-6 rounded-full border-2 border-white bg-head-wash overflow-hidden shrink-0'
                                    >
                                      <span className='w-full h-full flex items-center justify-center text-xs font-bold text-kraft-ink'>
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
                                    <span className='inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-kraft text-xs font-bold text-kraft-ink tabular-nums'>
                                      +{ws.memberCount - ws.memberPreviews.length}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className='flex flex-wrap items-center gap-1.5'>
                                {(ws.pendingTasks ?? 0) > 0 && !isEditor && (
                                  <span className='text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 tabular-nums'>
                                    <ListTodo className='w-3.5 h-3.5 shrink-0' aria-hidden='true' />
                                    <span>
                                      {t('workspace.shelf.pendingForYou', {
                                        count: ws.pendingTasks ?? 0,
                                      })}
                                    </span>
                                  </span>
                                )}
                                {((ws.pendingEditorReviews ?? 0) > 0 || isEditor) && (
                                  <span
                                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border tabular-nums ${
                                      (ws.pendingEditorReviews ?? 0) > 0
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-stone-100 text-stone-600 border-stone-200'
                                    }`}
                                  >
                                    <ShieldCheck
                                      className='w-3.5 h-3.5 shrink-0'
                                      aria-hidden='true'
                                    />
                                    <span>
                                      {(ws.pendingEditorReviews ?? 0) > 0
                                        ? t('workspace.shelf.pendingReviews', {
                                            count: ws.pendingEditorReviews ?? 0,
                                          })
                                        : t('workspace.shelf.noPendingReviews')}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Activity Timestamp & Warm Studio Entry CTA */}
                        <div className='pt-3.5 border-t border-stone-100 flex items-center justify-between gap-3'>
                          {isCurrent ? (
                            <span className='text-xs text-emerald-700 font-semibold inline-flex items-center gap-1.5'>
                              <span
                                className='w-2 h-2 rounded-full bg-emerald-600 shrink-0'
                                aria-hidden='true'
                              />
                              {t('workspace.studioHub.directory.currentStudio')}
                            </span>
                          ) : ws.lastActivityAt ? (
                            <span className='text-xs text-stone-500 font-medium inline-flex items-center gap-1.5 truncate'>
                              <Clock className='w-3.5 h-3.5 shrink-0' aria-hidden='true' />
                              {t('workspace.shelf.updated', { days: timeAgo(ws.lastActivityAt) })}
                            </span>
                          ) : (
                            <span className='text-xs text-stone-500 font-medium truncate'>
                              {isEditor
                                ? t('workspace.studioHub.directory.rolePermissionEditor')
                                : t('workspace.joinedDate', { days: timeAgo(ws.createdAt) })}
                            </span>
                          )}

                          <button
                            type='button'
                            onClick={() => onSelectWorkspace(ws)}
                            aria-label={`${t('workspace.shelf.enter')}: ${ws.name}`}
                            className={`focus-ring px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                              isFeatured
                                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
                                : 'bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-800 border border-stone-200 hover:border-orange-300 shadow-2xs'
                            }`}
                          >
                            <span>{ctaLabel}</span>
                            <ArrowRight
                              className='w-4 h-4 transition-studio-transform group-hover:translate-x-0.5'
                              aria-hidden='true'
                            />
                          </button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}

                {/* DASHED CARD: TẠO KHÔNG GIAN STUDIO MỚI */}
                {canCreate && (
                  <div
                    onClick={handleOpenCreate}
                    className='border-2 border-dashed border-head-line hover:border-orange-400 bg-head-wash/40 hover:bg-head-wash rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-studio cursor-pointer group min-h-[260px]'
                  >
                    <div className='w-12 h-12 rounded-xl bg-accent-soft text-accent-dark flex items-center justify-center group-hover:scale-105 transition-studio-transform'>
                      <Building2 className='w-6 h-6' aria-hidden='true' />
                    </div>
                    <div>
                      <h3 className='font-serif font-bold text-stone-900 text-base group-hover:text-accent-dark transition-colors'>
                        {t('workspace.studioHub.directory.createNewCard')}
                      </h3>
                      <p className='text-xs text-stone-600 max-w-xs mt-1 leading-relaxed'>
                        {t('workspace.studioHub.directory.createNewDesc')}
                      </p>
                    </div>
                    <button
                      type='button'
                      className='focus-ring mt-1 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-800 font-semibold text-xs group-hover:bg-orange-600 group-hover:border-orange-600 group-hover:text-white transition-colors cursor-pointer shadow-2xs'
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
