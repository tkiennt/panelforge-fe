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
} from 'lucide-react';
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
      <header className='sticky top-0 z-30 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#D8D2C5] px-4 md:px-6 lg:px-8 py-3'>
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
                      <div className='pt-3 border-t border-[#ECE7DD] flex items-center justify-between'>
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
              className='max-w-md mx-auto mt-10 p-6 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl text-center shadow-xs'
            >
              <AlertCircle className='w-6 h-6 text-red-600 mx-auto mb-3' aria-hidden='true' />
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
            <div className='max-w-md mx-auto mt-10 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] p-8 text-center shadow-xs'>
              <h1 className='text-2xl font-serif font-bold text-[#1C1917] mb-2 tracking-tight'>
                {t('workspace.emptyTitle')}
              </h1>
              <p className='text-sm text-[#57534E] mb-6 leading-relaxed'>
                {canCreate ? t('workspace.shelf.emptyCreate') : t('workspace.shelf.emptyInvite')}
              </p>
              {canCreate && createButton}
            </div>
          ) : (
            <>
              {/* Shelf Heading */}
              <div className='flex flex-wrap items-end justify-between gap-4 mb-6'>
                <div>
                  <h1 className='text-[28px] leading-tight font-serif font-bold text-[#1C1917] tracking-tight'>
                    {t('workspace.shelf.title')}
                    <span className='text-[#78716C] font-normal'> · {workspaces.length}</span>
                  </h1>
                  <p className='text-sm text-[#57534E] mt-1'>{t('workspace.shelf.subtitle')}</p>
                </div>
                {canCreate && createButton}
              </div>

              {/* Recently Visited Bar (BR / UX Section 7) */}
              {recent && (
                <div className='ws-recent flex flex-wrap items-center justify-between gap-3 mb-6 px-4 py-2.5'>
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

              {/* Studios Shelf Grid */}
              <ul className='ws-grid' role='list'>
                {workspaces.map((ws) => {
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
                          <span className='ws-card-fold' aria-hidden='true' />

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
                                className='ws-cover-btn ws-focus inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FCFBF8]/95 hover:bg-[#FCFBF8] text-[#1C1917] border border-[#D8D2C5] shadow-xs backdrop-blur-xs'
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
                                <h2 className='text-base font-serif font-bold text-[#1C1917] leading-snug line-clamp-1'>
                                  {ws.name}
                                </h2>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                    ws.currentUserRole === 'EDITOR'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold'
                                      : 'bg-[#E7E1D5]/60 text-[#57534E]'
                                  }`}
                                >
                                  {roleLabel(ws.currentUserRole)}
                                </span>
                              </div>
                              {ws.ownerName && (
                                <p className='text-xs text-[#78716C] truncate'>
                                  {t('workspace.owner') || 'Chủ sở hữu'}: {ws.ownerName}
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
                                      className='relative inline-block w-6 h-6 rounded-full border-2 border-[#FCFBF8] bg-[#E7E1D5] overflow-hidden shrink-0'
                                    >
                                      <span className='w-full h-full flex items-center justify-center text-[10px] font-bold text-[#44403C]'>
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
                                      className='inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#FCFBF8] bg-[#E7E1D5] text-[10px] font-bold text-[#57534E] shrink-0'
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
                            {(ws.currentUserRole === 'EDITOR' || (ws.pendingEditorReviews ?? 0) > 0) && (
                              <span
                                className='inline-flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-md text-xs tabular-nums shrink-0 shadow-2xs'
                                title='Số bài nộp chờ Editor kiểm tra và duyệt chất lượng (Gate 1 Storyboard & Gate 2 Composite)'
                              >
                                <span className='w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse' aria-hidden='true' />
                                <ShieldCheck className='w-3 h-3 text-rose-600' aria-hidden='true' />
                                <span>
                                  {(ws.pendingEditorReviews ?? 0) > 0
                                    ? `${ws.pendingEditorReviews} bài chờ duyệt`
                                    : 'Sẵn sàng duyệt bài'}
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
                          <div className='pt-3 border-t border-[#ECE7DD] flex items-center justify-between gap-2'>
                            <span className='text-xs text-[#78716C]'>
                              {t('workspace.shelf.created', { days: timeAgo(ws.createdAt) })}
                            </span>
                            <button
                              type='button'
                              onClick={() => onSelectWorkspace(ws)}
                              className={`ws-btn-enter ws-focus inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                ws.currentUserRole === 'EDITOR'
                                  ? 'text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 shadow-2xs'
                                  : 'text-[#C2410C] bg-[#FFF7ED] border border-[#FDBA74] hover:bg-[#FFEDD5]'
                              }`}
                              aria-label={`${t('workspace.shelf.enter')}: ${ws.name}`}
                            >
                              <span>{ws.currentUserRole === 'EDITOR' ? 'Vào Bàn Duyệt' : t('workspace.shelf.enter')}</span>
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
