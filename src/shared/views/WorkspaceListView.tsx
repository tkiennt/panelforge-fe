import React, { useEffect, useState } from 'react';
import { Layers, Compass, Plus, Loader2, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import { WorkspaceDto, WorkspaceRole, normalizeWorkspaceRole } from '@/types';
import { workspaceService } from '@/services/workspace.service';
import { CreateWorkspaceModal } from '@/roles/producer/modals/CreateWorkspaceModal';
import { PageContainer } from '@/shared/components/PageContainer';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { LucianInlineAlert } from '@/shared/components/lucian';

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
}

export const WorkspaceListView: React.FC<WorkspaceListViewProps> = ({
  onSelectWorkspace,
  onCreateWorkspace,
  currentUser,
  onLogout,
}) => {
  const confirm = useConfirm();
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAdmin =
    currentUser?.role?.toUpperCase() === 'ADMINISTRATOR' ||
    currentUser?.role?.toUpperCase() === 'ADMIN';

  // Gọi API thật lấy danh sách Workspace của user hiện tại từ database
  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await workspaceService.getMyWorkspaces();
      const mapped: WorkspaceDto[] = (data || []).map((ws) => ({
        ...ws,
        currentUserRole: normalizeWorkspaceRole(ws.currentUserRole),
        pendingTasks: (ws as any).pendingTasks ?? 0,
      }));
      setWorkspaces(mapped);
    } catch (error) {
      console.error('Lỗi khi tải danh sách Workspace:', error);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleOpenCreate = async () => {
    if (isAdmin) {
      await confirm({
        title: 'Giới hạn vai trò Quản trị viên',
        description:
          'Tài khoản Administrator không thể tạo hoặc sở hữu Studio Workspace. Vui lòng liên hệ Quản trị viên để được cấp quyền Producer.',
        confirmText: 'Đã hiểu',
        cancelText: 'Đóng',
        variant: 'warning',
      });
      return;
    }
    if (!currentUser?.canCreateStudio) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        try {
          window.alert(
            'Tài khoản của bạn chưa được cấp quyền Producer để tạo Studio. Vui lòng liên hệ Quản trị viên để được nâng cấp quyền hạn.',
          );
        } catch {
          // ignore
        }
      }
      await confirm({
        title: 'Yêu cầu quyền Producer',
        description:
          'Tài khoản của bạn chưa được cấp quyền Producer để tạo Studio. Vui lòng liên hệ Quản trị viên để được nâng cấp quyền hạn.',
        confirmText: 'Đã hiểu',
        cancelText: 'Đóng',
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

  const getRoleBadgeColor = (role?: WorkspaceRole | null) => {
    switch (role) {
      case 'PRODUCER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ARTIST':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'WRITER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EDITOR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LETTERER':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'PUBLISHER':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getRoleDisplayName = (role?: WorkspaceRole | null) => {
    if (!role) return 'Member';
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Joined today';
    if (diffDays === 1) return 'Joined 1 day ago';
    return `Joined ${diffDays} days ago`;
  };

  return (
    <div className='min-h-screen bg-[#F3F0E9] flex flex-col text-[#1C1917] font-sans'>
      {/* Top Navigation Bar with Brand, User Info and Logout */}
      <header className='sticky top-0 z-30 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#D8D2C5] px-4 md:px-6 lg:px-8 py-3.5 shadow-2xs'>
        <div className='w-full flex items-center justify-between'>
          {/* Logo & Brand */}
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-[#1C1917] flex items-center justify-center text-white shadow-2xs'>
              <Layers className='w-4 h-4' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-serif font-bold text-base text-[#1C1917] tracking-tight'>
                  PanelForge
                </span>
                <span className='text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-[#C2410C] border border-[#D8D2C5] uppercase tracking-wider'>
                  Studio Hub
                </span>
              </div>
              <p className='text-xs text-[#57534E] hidden sm:block'>Production Workspace Catalog</p>
            </div>
          </div>

          {/* User Profile & Logout Button */}
          <div className='flex items-center gap-3 sm:gap-4'>
            {currentUser && (
              <div className='flex items-center gap-3 pr-2 sm:pr-4 sm:border-r border-[#D8D2C5]'>
                <div className='w-9 h-9 rounded-full bg-[#1C1917] text-white flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden'>
                  {currentUser.avatarUrl && currentUser.avatarUrl.trim() ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span>{currentUser.name?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className='hidden sm:block text-left'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-xs font-semibold text-[#1C1917] truncate max-w-[140px]'>
                      {currentUser.name}
                    </span>
                    <span className='text-xs font-mono px-2 py-0.5 bg-[#FFF2E6] text-[#C2410C] border border-[#D8D2C5] rounded-full font-semibold uppercase'>
                      {currentUser.role || 'USER'}
                    </span>
                  </div>
                  <p className='text-xs text-[#57534E] truncate max-w-[160px]'>
                    {currentUser.email}
                  </p>
                </div>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className='flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100/80 border border-red-200 rounded-lg transition-all cursor-pointer shadow-2xs'
                title='Đăng xuất khỏi tài khoản'
              >
                <LogOut className='w-3.5 h-3.5' />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className='flex-1 py-6 md:py-12'>
        <PageContainer>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-24'>
              <Loader2 className='w-8 h-8 text-[#F97316] animate-spin mb-4' />
              <p className='text-[#57534E] font-mono text-xs uppercase tracking-wider font-semibold'>
                Loading Workspaces... (Đang tải danh sách Workspace)
              </p>
            </div>
          ) : workspaces.length === 0 ? (
            /* Empty State: Khi chưa có Workspace nào */
            <div className='flex flex-col items-center justify-center py-16 px-4'>
              <div className='max-w-md w-full bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-editorial p-8 sm:p-10 text-center relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-[#F97316]' />
                <div className='w-16 h-16 bg-[#FFF2E6] border border-[#D8D2C5] rounded-xl flex items-center justify-center mx-auto mb-6 text-[#C2410C] shadow-2xs'>
                  <Compass className='w-8 h-8' />
                </div>
                <h2 className='text-2xl font-serif font-bold text-[#1C1917] mb-2 tracking-tight'>
                  Welcome to PanelForge
                </h2>
                <p className='text-sm text-[#57534E] mb-8 leading-relaxed'>
                  You currently don't belong to any active Workspaces. Bạn chưa có Workspace nào
                  trong hệ thống. Hãy khởi tạo một Studio mới để bắt đầu hoặc nhờ Studio Producer
                  gửi lời mời tham gia qua email của bạn.
                </p>
                <button
                  onClick={handleOpenCreate}
                  aria-label='Create Workspace'
                  disabled={isAdmin}
                  title={
                    isAdmin ? 'Quản trị viên không thể tạo Studio (BR-07)' : 'Create Workspace'
                  }
                  className='w-full bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs'
                >
                  <Plus className='w-4 h-4' />
                  <span>Create Workspace (Tạo Studio Mới)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Populated State: Danh sách Workspace thật */
            <>
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
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10'>
                <div>
                  <h1 className='text-3xl font-serif font-bold text-[#1C1917] tracking-tight mb-2'>
                    Your Workspaces
                  </h1>
                  <p className='text-[#57534E] text-xs sm:text-sm'>
                    Chọn một Studio Workspace để tiếp tục công việc sản xuất truyện tranh của bạn.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreate}
                  aria-label='Create Workspace'
                  disabled={isAdmin}
                  title={isAdmin ? 'Quản trị viên không thể tạo Studio (BR-07)' : 'Tạo Studio Mới'}
                  className='self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer'
                >
                  <Plus className='w-4 h-4' />
                  <span>Tạo Studio Mới</span>
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6'>
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className='group bg-[#FCFBF8] rounded-xl border border-[#D8D2C5] hover:border-[#F97316] shadow-2xs hover:shadow-editorial transition-all duration-200 cursor-pointer overflow-hidden flex flex-col relative'
                  >
                    <div className='p-6 flex-1'>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='w-12 h-12 bg-[#F3F0E9] rounded-xl border border-[#D8D2C5] flex items-center justify-center text-[#1C1917] group-hover:scale-105 transition-transform duration-200 shadow-2xs'>
                          <Layers className='w-5 h-5 text-[#C2410C]' />
                        </div>
                        <div
                          className={`px-3 py-0.5 rounded-full border text-xs font-semibold font-mono tracking-wide ${getRoleBadgeColor(ws.currentUserRole)}`}
                        >
                          {getRoleDisplayName(ws.currentUserRole)}
                        </div>
                      </div>

                      <h3 className='text-lg font-serif font-bold text-[#1C1917] mb-2 group-hover:text-[#C2410C] transition-colors line-clamp-1'>
                        {ws.name}
                      </h3>

                      <div className='text-xs text-[#57534E] mb-6 flex flex-col gap-1.5 font-sans'>
                        <div className='flex items-center gap-1.5'>
                          <span className='w-1.5 h-1.5 rounded-full bg-stone-400'></span>
                          <span className='tabular-nums'>{ws.memberCount || 1} Members</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <span className='w-1.5 h-1.5 rounded-full bg-stone-400'></span>
                          <span>{getTimeAgo(ws.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className='px-6 py-3.5 bg-[#F8F6F0] border-t border-[#D8D2C5] flex items-center justify-between transition-colors'>
                      <div className='flex items-center gap-2'>
                        {ws.pendingTasks > 0 ? (
                          <>
                            <div className='w-2 h-2 rounded-full bg-amber-500 animate-pulse' />
                            <span className='text-xs font-semibold text-[#1C1917] font-mono tabular-nums'>
                              {ws.pendingTasks} Pending Tasks
                            </span>
                          </>
                        ) : (
                          <>
                            <div className='w-2 h-2 rounded-full bg-emerald-500' />
                            <span className='text-xs font-medium text-[#57534E] font-mono'>
                              All caught up
                            </span>
                          </>
                        )}
                      </div>
                      <ArrowRight className='w-4 h-4 text-[#57534E] group-hover:text-[#C2410C] transform group-hover:translate-x-1 transition-all' />
                    </div>
                  </div>
                ))}

                {/* Create New Workspace Card */}
                <div
                  onClick={handleOpenCreate}
                  className='bg-[#FCFBF8]/70 hover:bg-[#FCFBF8] rounded-xl border border-dashed border-[#D8D2C5] hover:border-[#F97316] transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-6 min-h-[240px] text-center group shadow-2xs hover:shadow-editorial'
                >
                  <div className='w-12 h-12 rounded-xl bg-[#FFF2E6] group-hover:bg-[#F97316] text-[#C2410C] group-hover:text-white border border-[#D8D2C5] flex items-center justify-center mb-3 transition-colors shadow-2xs'>
                    <Plus className='w-5 h-5' />
                  </div>
                  <h3 className='text-base font-serif font-bold text-[#1C1917] mb-1'>
                    Bắt đầu Studio mới
                  </h3>
                  <p className='text-[#57534E] text-xs max-w-[200px]'>
                    Tạo Studio và mời các họa sĩ, tác giả cộng tác sản xuất.
                  </p>
                </div>
              </div>
            </>
          )}
        </PageContainer>
      </main>

      {/* Modal Tạo Workspace Thật (gọi POST /api/Workspaces) */}
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
    </div>
  );
};
