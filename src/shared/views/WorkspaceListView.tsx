import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  LogOut,
  AlertCircle,
  RotateCw,
  Users,
  Camera,
  Clock,
  ShieldCheck,
  Building2,
  KeyRound,
  ListTodo,
  BookOpen,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { formatBytes } from './studio-overview/formatters';
import { PendingInvitations, TodayTasks, type PendingInvitation } from './WorkspaceShelfSections';
import { sortByDue, type TodayTask } from './workspaceShelfTasks';
import { WorkspaceDto, WorkspaceRole, normalizeWorkspaceRole } from '@/types';
import { workspaceService } from '@/services/workspace.service';
import { CreateWorkspaceModal } from '@/roles/producer/modals/CreateWorkspaceModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { useTranslation } from '@/lib/i18n';
import { BrandMark } from '@/shared/components/BrandMark';
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

// Cover tab colours, picked deterministically from the studio id.
const COVER_TONES = ['#F97316', '#0F766E', '#7C3AED', '#B45309', '#BE123C', '#1D4ED8'];
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
  const { t } = useTranslation();
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

  // Gọi API thật lấy danh sách Workspace của user hiện tại (không phân trang → count là tổng thật)
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

  // Lời mời đang chờ: API đã có (accept/reject) nhưng trước đây chưa màn hình nào hiển thị
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

  // "Việc của bạn": chỉ gọi my-assignments cho studio có việc đang chờ (pendingTasks > 0)
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
        title: t('workspace.adminNoticeTitle') || 'Giới hạn vai trò Quản trị viên',
        description:
          t('workspace.adminNotice') ||
          'Tài khoản Administrator không thể tạo hoặc sở hữu Studio Workspace. Vui lòng liên hệ Quản trị viên để được cấp quyền Producer.',
        confirmText: t('common.understood') || 'Đã hiểu',
        cancelText: t('common.close') || 'Đóng',
        variant: 'warning',
      });
      return;
    }
    if (!currentUser?.canCreateStudio) {
      await confirm({
        title: t('workspace.producerNoticeTitle') || 'Yêu cầu quyền Producer',
        description:
          t('workspace.producerNotice') ||
          'Tài khoản của bạn chưa được cấp quyền Producer để tạo Studio. Vui lòng liên hệ Quản trị viên để được nâng cấp quyền hạn.',
        confirmText: t('common.understood') || 'Đã hiểu',
        cancelText: t('common.close') || 'Đóng',
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

  // KPI chỉ từ dữ liệu thật của API (không có số liệu giả, DESIGN_RULES §8)
  const ownedCount = workspaces.filter((w) => w.isOwner).length;
  const stats = [
    {
      key: 'total',
      icon: Building2,
      value: workspaces.length,
      tone: 'bg-white border-[#E5E0D8] text-[#1C1917]',
      iconTone: 'bg-[#FAF8F5] border border-[#EBE7DF] text-[#C2410C]',
    },
    {
      key: 'owned',
      icon: KeyRound,
      value: ownedCount,
      tone: 'bg-white border-[#E5E0D8] text-[#1C1917]',
      iconTone: 'bg-[#FAF8F5] border border-[#EBE7DF] text-[#C2410C]',
    },
    {
      key: 'pending',
      icon: ListTodo,
      value: workspaces.reduce((n, w) => n + (w.pendingTasks ?? 0), 0),
      tone: 'bg-blue-50/70 border-blue-200/80 text-blue-900',
      iconTone: 'bg-blue-100/80 text-blue-800',
    },
    {
      key: 'reviews',
      icon: ShieldCheck,
      value: workspaces.reduce((n, w) => n + (w.pendingEditorReviews ?? 0), 0),
      tone: 'bg-amber-50/70 border-amber-200/80 text-amber-900',
      iconTone: 'bg-amber-100/80 text-amber-800',
    },
  ] as const;

  // Lọc chỉ có nghĩa khi vừa có studio sở hữu vừa có studio được mời
  const [filter, setFilter] = useState<'all' | 'owned' | 'joined'>('all');
  const showFilter = ownedCount > 0 && ownedCount < workspaces.length;
  const filteredByOwner =
    !showFilter || filter === 'all'
      ? workspaces
      : workspaces.filter((w) => (filter === 'owned' ? w.isOwner : !w.isOwner));

  // Tìm kiếm & sắp xếp chỉ hiện khi đủ nhiều studio; ít hơn thì chỉ làm rối màn hình
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
          sort === 'name' ? a.name.localeCompare(b.name, 'vi') : activityTime(b) - activityTime(a),
        );

  const createButton = (
    <button
      type='button'
      onClick={handleOpenCreate}
      className='ws-btn-primary inline-flex items-center gap-2 px-4 h-10 text-sm font-semibold'
    >
      <Plus className='w-4 h-4' aria-hidden='true' />
      <span>{t('workspace.shelf.create')}</span>
    </button>
  );

  return (
    <div className='ws-shelf min-h-screen flex flex-col font-sans'>
      {/* Top Navigation Bar */}
      <header className='sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-xs px-4 md:px-6 lg:px-8 py-3'>
        <div className='w-full flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3 min-w-0'>
            <BrandMark size={32} className='shrink-0' />
            <div className='min-w-0'>
              <span className='font-serif font-bold text-base text-[#1C1917] tracking-tight'>
                PanelForge
              </span>
              <p className='text-xs text-[#57534E] hidden sm:block'>{t('workspace.catalog')}</p>
            </div>
          </div>

          <div className='flex items-center gap-2 sm:gap-3'>
            {currentUser && (
              <Link
                to='/profile'
                title={t('workspace.shelf.profile')}
                aria-label={`${t('workspace.shelf.profile')}: ${currentUser.name}`}
                className='ws-focus flex items-center gap-2.5 rounded-full sm:rounded-lg p-0.5 sm:pr-2 hover:bg-[#F3F0E9]'
              >
                <span className='w-9 h-9 rounded-full bg-[#1C1917] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0'>
                  {avatarUrl && !avatarFailed ? (
                    <img
                      src={avatarUrl}
                      alt=''
                      className='w-full h-full object-cover'
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span>{currentUser.name?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </span>
                <span className='hidden sm:block text-left'>
                  <span className='block text-xs font-semibold text-[#1C1917] truncate max-w-[160px]'>
                    {currentUser.name}
                  </span>
                  <span className='block text-xs text-[#57534E] truncate max-w-[160px]'>
                    {currentUser.email}
                  </span>
                </span>
              </Link>
            )}
            {onLogout && (
              <button
                type='button'
                onClick={onLogout}
                title={t('profile.logout')}
                className='ws-focus flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-[#57534E] hover:text-red-700 hover:bg-red-50 border border-[#D8D2C5] rounded-lg'
              >
                <LogOut className='w-3.5 h-3.5' aria-hidden='true' />
                <span className='hidden sm:inline'>{t('profile.logout')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className='flex-1 py-6 md:py-10'>
        <PageContainer>
          {isAdmin && (
            <div className='mb-6'>
              <LucianInlineAlert
                type='info'
                title='Tài khoản Quản trị viên hệ thống'
                description='Tài khoản Administrator không trực tiếp sở hữu hoặc tạo Studio Workspace theo quy tắc BR-07 nhằm đảm bảo tính bảo mật và phân lập dữ liệu.'
                dismissible={true}
              />
            </div>
          )}

          {loading ? (
            <div aria-busy='true'>
              <span className='sr-only'>{t('workspace.loading')}</span>
              <div className='h-8 w-56 rounded ws-skel mb-2' />
              <div className='h-4 w-72 rounded ws-skel mb-8' />
              <div className='ws-grid'>
                {[0, 1, 2].map((i) => (
                  <div key={i} className='ws-card ws-card-skel' aria-hidden='true'>
                    <div className='ws-card-cover ws-skel' />
                    <div className='p-4 md:p-5 flex-1 flex flex-col'>
                      <div className='flex items-start gap-3 mb-4'>
                        <div className='w-10 h-10 rounded-lg ws-skel shrink-0' />
                        <div className='flex-1'>
                          <div className='h-4 w-3/5 rounded ws-skel mb-2' />
                          <div className='h-3 w-20 rounded ws-skel' />
                        </div>
                      </div>
                      <div className='h-3 w-4/5 rounded ws-skel mb-4 mt-auto' />
                      <div className='pt-3 border-t border-stone-100 flex items-center justify-between'>
                        <div className='h-3 w-20 rounded ws-skel' />
                        <div className='h-7 w-24 rounded-lg ws-skel' />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : loadError ? (
            <div
              role='alert'
              className='max-w-md mx-auto mt-10 p-6 bg-white border border-stone-200/80 rounded-xl text-center shadow-xs'
            >
              <AlertCircle className='w-6 h-6 text-rose-600 mx-auto mb-3' aria-hidden='true' />
              <p className='text-sm text-[#44403C] mb-4'>{t('workspace.shelf.loadError')}</p>
              <button
                type='button'
                onClick={fetchWorkspaces}
                className='ws-btn-secondary inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold'
              >
                <RotateCw className='w-4 h-4' aria-hidden='true' />
                {t('workspace.shelf.retry')}
              </button>
            </div>
          ) : workspaces.length === 0 ? (
            /* Empty State */
            <div className='mt-6 bg-white border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left'>
              <BlankPageSketch />
              <div className='flex-1'>
                <h1 className='text-2xl font-serif font-bold text-[#1C1917] mb-2 tracking-tight'>
                  {t('workspace.emptyTitle')}
                </h1>
                <p className='text-sm text-[#57534E] leading-relaxed'>
                  {canCreate ? t('workspace.shelf.emptyCreate') : t('workspace.shelf.emptyInvite')}
                </p>
              </div>
              {canCreate && createButton}
            </div>
          ) : (
            <>
              {/* Hero header: cùng mẫu Script Hub / Series Bible (pill, tiêu đề serif, KPI thật) */}
              <section className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-5'>
                <div className='min-w-0 space-y-1.5'>
                  <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF2E6] border border-[#F97316]/30 text-[#C2410C] text-xs font-bold uppercase tracking-wider'>
                    <Building2 className='w-3.5 h-3.5' aria-hidden='true' />
                    {t('workspace.shelf.hubBadge')}
                  </span>
                  <h1 className='text-2xl font-serif font-bold text-[#1C1917] tracking-tight flex items-center gap-2.5 flex-wrap'>
                    {t('workspace.shelf.title')}
                    <span className='px-2.5 py-0.5 rounded-full bg-[#F3F0E9] text-[#57534E] text-xs font-semibold font-mono border border-[#D8D2C5]'>
                      {t('workspace.shelf.count', { count: workspaces.length })}
                    </span>
                  </h1>
                  <p className='text-sm text-[#57534E] leading-relaxed max-w-2xl'>
                    {t('workspace.shelf.subtitle')} {t('workspace.shelf.hint')}
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-3 sm:flex sm:items-center sm:flex-wrap shrink-0'>
                  {stats.map((stat) => (
                    <div
                      key={stat.key}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border shadow-2xs ${stat.tone}`}
                      data-testid={`ws-stat-${stat.key}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconTone}`}
                      >
                        <stat.icon className='w-4 h-4' aria-hidden='true' />
                      </div>
                      <div>
                        <div className='text-xs font-semibold uppercase tracking-wide opacity-80'>
                          {t(`workspace.shelf.stats.${stat.key}`)}
                        </div>
                        <div className='text-sm font-bold font-mono'>{stat.value}</div>
                      </div>
                    </div>
                  ))}
                  {canCreate && <div className='col-span-2 sm:col-span-1'>{createButton}</div>}
                </div>
              </section>

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

              {/* Recently Visited Bar (BR / UX Section 7) */}
              {recent && (
                <div className='ws-recent flex flex-wrap items-center justify-between gap-3 mb-5 px-4 py-2.5'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Clock className='w-4 h-4 text-[#C2410C] shrink-0' aria-hidden='true' />
                    <p className='text-sm text-[#57534E] truncate'>
                      {t('workspace.shelf.recent')}{' '}
                      <strong className='font-semibold text-[#1C1917]'>{recent.name}</strong>
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => onSelectWorkspace(recent)}
                    className='ws-focus inline-flex items-center gap-1 text-sm font-semibold text-[#C2410C] hover:text-[#9A3412] rounded'
                  >
                    {t('workspace.shelf.continue')}
                    <ArrowRight className='w-4 h-4' aria-hidden='true' />
                  </button>
                </div>
              )}

              {showSearch && (
                <div className='flex flex-col sm:flex-row sm:items-center gap-2.5 mb-4'>
                  <label className='relative flex-1 max-w-lg'>
                    <span className='sr-only'>{t('workspace.shelf.search.placeholder')}</span>
                    <Search
                      className='w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none'
                      aria-hidden='true'
                    />
                    <input
                      type='search'
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('workspace.shelf.search.placeholder')}
                      className='w-full h-10 pl-10 pr-3 rounded-full bg-white border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500'
                    />
                  </label>
                  <label className='inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white border border-stone-200 text-sm text-stone-700'>
                    <ArrowUpDown className='w-4 h-4 text-stone-500' aria-hidden='true' />
                    <span className='sr-only'>{t('workspace.shelf.search.sort')}</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as typeof sort)}
                      className='bg-transparent text-sm font-medium focus:outline-none cursor-pointer'
                      aria-label={t('workspace.shelf.search.sort')}
                    >
                      <option value='created'>{t('workspace.shelf.search.created')}</option>
                      <option value='recent'>{t('workspace.shelf.search.recent')}</option>
                      <option value='name'>{t('workspace.shelf.search.name')}</option>
                    </select>
                  </label>
                </div>
              )}

              {showFilter && (
                <div
                  className='flex items-center gap-2 flex-wrap mb-5'
                  role='group'
                  aria-label={t('workspace.shelf.filter.label')}
                >
                  {(
                    [
                      ['all', workspaces.length],
                      ['owned', ownedCount],
                      ['joined', workspaces.length - ownedCount],
                    ] as const
                  ).map(([key, count]) => {
                    const active = filter === key;
                    return (
                      <button
                        key={key}
                        type='button'
                        onClick={() => setFilter(key)}
                        aria-pressed={active}
                        className={`ws-focus inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                          active
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                      >
                        {t(`workspace.shelf.filter.${key}`)}
                        <span
                          className={`text-xs font-mono px-1.5 rounded-full ${active ? 'bg-orange-100' : 'bg-stone-100'}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q && visibleWorkspaces.length === 0 && (
                <p className='text-sm text-stone-600 mb-5'>
                  {t('workspace.shelf.search.empty', { query: query.trim() })}
                </p>
              )}

              {/* Studios Shelf Grid */}
              <ul className='ws-grid' role='list'>
                {visibleWorkspaces.map((ws) => {
                  const tone = toneFor(ws.id);
                  const mayManageCover = canManageCover(ws);

                  return (
                    <li key={ws.id} className='flex'>
                      <article
                        className='ws-card group'
                        style={{ '--ws-tone': tone } as React.CSSProperties}
                        aria-label={ws.name}
                      >
                        {/* 1. Cover Image Section (2:1 aspect ratio) */}
                        <div className='ws-card-cover'>
                          <span className='ws-card-tab' aria-hidden='true' />

                          {ws.coverUrl ? (
                            <AuthenticatedImage
                              src={ws.coverUrl}
                              alt={`Ảnh bìa Studio ${ws.name}`}
                              className='w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]'
                              loading='lazy'
                              fallback={
                                <StudioCoverFallback name={ws.name} tone={tone} id={ws.id} />
                              }
                            />
                          ) : (
                            <StudioCoverFallback name={ws.name} tone={tone} id={ws.id} />
                          )}

                          {/* Quick Action: Change Studio Cover (for Owner/Producer only) */}
                          {mayManageCover && (
                            <div className='absolute top-2.5 right-2.5 z-20'>
                              <button
                                type='button'
                                onClick={() => setCoverModalWorkspace(ws)}
                                title={t('workspace.shelf.changeCover')}
                                aria-label={t('workspace.shelf.changeCover')}
                                className='ws-cover-btn ws-focus inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/95 hover:bg-white text-stone-800 border border-stone-200 shadow-xs backdrop-blur-xs'
                              >
                                <Camera className='w-3.5 h-3.5 text-[#C2410C]' aria-hidden='true' />
                                <span className='hidden sm:inline'>
                                  {t('workspace.shelf.changeCover')}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 2. Card Content Body */}
                        <div className='flex-1 flex flex-col p-4 md:p-5'>
                          {/* Header: Monogram + Studio Name + Role */}
                          <div className='flex items-start gap-3 mb-2.5'>
                            <span className='ws-monogram' aria-hidden='true'>
                              {ws.name.trim().charAt(0).toUpperCase() || 'S'}
                            </span>
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-center gap-2 flex-wrap mb-0.5'>
                                <h2 className='text-xl font-serif font-bold text-stone-900 leading-snug line-clamp-1'>
                                  {ws.name}
                                </h2>
                                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-stone-100 text-stone-600 border border-stone-200'>
                                  {roleLabel(ws.currentUserRole)}
                                </span>
                              </div>
                              {ws.ownerName && (
                                <p className='text-xs text-[#78716C] truncate'>
                                  {t('workspace.owner')}: {ws.ownerName}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Description (if provided, max 2 lines, no fake filler content) */}
                          {ws.description?.trim() ? (
                            <p className='text-xs text-[#57534E] line-clamp-2 leading-relaxed mb-3'>
                              {ws.description.trim()}
                            </p>
                          ) : null}

                          {/* Series của studio (BE GetMyWorkspaces: seriesCount, 3 series mới cập nhật) */}
                          {ws.seriesCount !== undefined && (
                            <div
                              className='flex items-center gap-2.5 mb-3'
                              data-testid='ws-card-series'
                            >
                              {(ws.seriesPreviews?.length ?? 0) > 0 && (
                                <div className='flex items-center -space-x-1.5 shrink-0'>
                                  {ws.seriesPreviews!.map((s) => (
                                    <span
                                      key={s.id}
                                      title={s.title}
                                      className='relative w-7 h-9 rounded-md border-2 border-white bg-stone-100 overflow-hidden shadow-2xs flex items-center justify-center text-xs font-serif font-bold text-stone-500'
                                    >
                                      {s.title.trim().charAt(0).toUpperCase()}
                                      {s.coverUrl && (
                                        <AuthenticatedImage
                                          src={s.coverUrl}
                                          alt={s.title}
                                          className='absolute inset-0 w-full h-full object-cover'
                                          loading='lazy'
                                          fallback={
                                            <span className='absolute inset-0 flex items-center justify-center bg-stone-100'>
                                              {s.title.trim().charAt(0).toUpperCase()}
                                            </span>
                                          }
                                        />
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-stone-600'>
                                <BookOpen
                                  className='w-3.5 h-3.5 text-stone-500'
                                  aria-hidden='true'
                                />
                                {ws.seriesCount > 0
                                  ? t('workspace.shelf.series', { count: ws.seriesCount })
                                  : t('workspace.shelf.noSeries')}
                              </span>
                            </div>
                          )}

                          {/* Dung lượng: chỉ Owner/Producer quản lý; chặn chia 0 (DESIGN_RULES §3.3) */}
                          {mayManageCover &&
                            (() => {
                              const quota = ws.storageQuotaBytes || 0;
                              const used = ws.usedStorageBytes || 0;
                              const pct =
                                quota > 0 ? Math.min(100, Math.max(0, (used / quota) * 100)) : 0;
                              return (
                                <div className='mb-3' data-testid='ws-card-storage'>
                                  <div className='flex items-center justify-between text-xs text-stone-500 mb-1'>
                                    <span>{t('workspace.shelf.storage')}</span>
                                    <span className='font-mono tabular-nums'>
                                      {formatBytes(used)} / {quota > 0 ? formatBytes(quota) : '—'}
                                    </span>
                                  </div>
                                  <div
                                    className='h-1.5 rounded-full bg-stone-100 overflow-hidden'
                                    role='progressbar'
                                    aria-label={t('workspace.shelf.storage')}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(pct)}
                                  >
                                    <div
                                      className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-orange-500'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                          {/* Members & Tasks Row */}
                          <div className='flex items-center justify-between gap-2 text-xs text-[#57534E] mb-4 mt-auto pt-2'>
                            <div className='flex items-center gap-2 min-w-0'>
                              {/* Member Preview Avatars */}
                              {ws.memberPreviews && ws.memberPreviews.length > 0 ? (
                                <div className='flex items-center -space-x-2 overflow-hidden py-0.5 shrink-0'>
                                  {ws.memberPreviews.slice(0, 4).map((member) => (
                                    <span
                                      key={member.userId}
                                      title={member.fullName}
                                      className='relative inline-block w-7 h-7 rounded-full border-2 border-[#FCFBF8] bg-[#E7E1D5] overflow-hidden shrink-0'
                                    >
                                      <span className='w-full h-full flex items-center justify-center text-xs font-bold text-[#44403C]'>
                                        {member.fullName.charAt(0).toUpperCase()}
                                      </span>
                                      {member.avatarUrl && (
                                        // Initial sits underneath; a broken image just removes itself.
                                        <img
                                          src={member.avatarUrl}
                                          alt={member.fullName}
                                          className='absolute inset-0 w-full h-full object-cover'
                                          loading='lazy'
                                          onError={(e) => e.currentTarget.remove()}
                                        />
                                      )}
                                    </span>
                                  ))}
                                  {ws.memberCount > ws.memberPreviews.length && (
                                    <span
                                      title={`${t('workspace.shelf.members', { count: ws.memberCount })}`}
                                      className='inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-[#FCFBF8] bg-[#E7E1D5] text-xs font-bold text-[#57534E] shrink-0'
                                    >
                                      +{ws.memberCount - ws.memberPreviews.length}
                                    </span>
                                  )}
                                </div>
                              ) : null}

                              <span className='inline-flex items-center gap-1.5 text-xs text-[#57534E] tabular-nums font-medium truncate'>
                                <Users
                                  className='w-3.5 h-3.5 text-[#78716C] shrink-0'
                                  aria-hidden='true'
                                />
                                <span>
                                  {t('workspace.shelf.members', { count: ws.memberCount })}
                                </span>
                              </span>
                            </div>

                            {/* Editor Review Queue Badge (Gate 1 & Gate 2) */}
                            {(ws.currentUserRole === 'EDITOR' ||
                              (ws.pendingEditorReviews ?? 0) > 0) && (
                              <span
                                className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full text-xs tabular-nums shrink-0 border ${
                                  (ws.pendingEditorReviews ?? 0) > 0
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-stone-100 text-stone-600 border-stone-200'
                                }`}
                              >
                                <ShieldCheck className='w-3.5 h-3.5' aria-hidden='true' />
                                <span>
                                  {(ws.pendingEditorReviews ?? 0) > 0
                                    ? t('workspace.shelf.pendingReviews', {
                                        count: ws.pendingEditorReviews ?? 0,
                                      })
                                    : t('workspace.shelf.noPendingReviews')}
                                </span>
                              </span>
                            )}

                            {(ws.pendingTasks ?? 0) > 0 && ws.currentUserRole !== 'EDITOR' && (
                              <span className='font-semibold text-[#B45309] text-xs tabular-nums shrink-0'>
                                {t('workspace.shelf.pendingForYou', {
                                  count: ws.pendingTasks ?? 0,
                                })}
                              </span>
                            )}
                          </div>

                          {/* Footer: Date & Enter Button */}
                          <div className='pt-3 border-t border-stone-100 flex items-center justify-between gap-2'>
                            <span className='text-xs text-stone-500 inline-flex items-center gap-1'>
                              <Clock className='w-3.5 h-3.5' aria-hidden='true' />
                              {ws.lastActivityAt
                                ? t('workspace.shelf.updated', { days: timeAgo(ws.lastActivityAt) })
                                : t('workspace.shelf.created', { days: timeAgo(ws.createdAt) })}
                            </span>
                            <button
                              type='button'
                              onClick={() => onSelectWorkspace(ws)}
                              className='ws-btn-enter ws-focus inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold text-orange-800 bg-orange-50 border border-orange-200 hover:bg-orange-100 active:scale-[0.98]'
                              aria-label={`${t('workspace.shelf.enter')}: ${ws.name}`}
                            >
                              <span>
                                {ws.currentUserRole === 'EDITOR'
                                  ? t('workspace.shelf.enterReview')
                                  : t('workspace.shelf.enter')}
                              </span>
                              <ArrowRight className='ws-arrow w-3.5 h-3.5' aria-hidden='true' />
                            </button>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
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
