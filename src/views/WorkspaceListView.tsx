import React, { useEffect, useState } from 'react';
import { Layers, Compass, Plus, Loader2, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import { WorkspaceDto, WorkspaceRole, normalizeWorkspaceRole } from '../types';
import { workspaceService } from '../services/workspace.service';
import { CreateWorkspaceModal } from '../components/modals/CreateWorkspaceModal';

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

  const handleOpenCreate = () => {
    if (isAdmin) {
      alert(
        'Tài khoản Administrator không thể tạo hoặc sở hữu Studio Workspace (BR-07). Vui lòng sử dụng trang Quản trị hệ thống.',
      );
      return;
    }
    if (!currentUser?.canCreateStudio) {
      alert(
        'Tài khoản của bạn chưa được cấp quyền Producer để tạo Studio. Vui lòng liên hệ Quản trị viên để được cấp quyền (BR-07).',
      );
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
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ARTIST':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'WRITER':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'EDITOR':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'LETTERER':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
    <div className='min-h-screen bg-zinc-50 flex flex-col'>
      {/* Top Navigation Bar with Brand, User Info and Logout */}
      <header className='sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-6 py-3.5 shadow-sm'>
        <div className='max-w-6xl mx-auto flex items-center justify-between'>
          {/* Logo & Brand */}
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-orange-500 flex items-center justify-center text-white shadow-sm'>
              <Layers className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-base text-zinc-900 tracking-tight'>
                  PanelForge
                </span>
                <span className='text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200/60 uppercase tracking-wider'>
                  Studio Hub
                </span>
              </div>
              <p className='text-[11px] text-zinc-500 hidden sm:block'>
                Production Workspace Catalog
              </p>
            </div>
          </div>

          {/* User Profile & Logout Button */}
          <div className='flex items-center gap-3 sm:gap-4'>
            {currentUser && (
              <div className='flex items-center gap-3 pr-2 sm:pr-4 sm:border-r border-zinc-200'>
                <div className='w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden'>
                  {currentUser.avatarUrl ? (
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
                    <span className='text-sm font-semibold text-zinc-900 truncate max-w-[140px]'>
                      {currentUser.name}
                    </span>
                    <span className='text-[10px] font-mono px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded font-bold uppercase'>
                      {currentUser.role || 'USER'}
                    </span>
                  </div>
                  <p className='text-xs text-zinc-500 truncate max-w-[160px]'>
                    {currentUser.email}
                  </p>
                </div>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className='flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 bg-red-50/60 hover:bg-red-50 border border-red-200 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-sm'
                title='Đăng xuất khỏi tài khoản'
              >
                <LogOut className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className='flex-1 p-6 md:p-12'>
        <div className='max-w-6xl mx-auto'>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-24'>
              <Loader2 className='w-8 h-8 text-orange-500 animate-spin mb-4' />
              <p className='text-zinc-500 font-mono text-xs uppercase tracking-wider font-semibold'>
                Loading Workspaces... (Đang tải danh sách Workspace)
              </p>
            </div>
          ) : workspaces.length === 0 ? (
            /* Empty State: Khi chưa có Workspace nào */
            <div className='flex flex-col items-center justify-center py-16 px-4'>
              <div className='max-w-md w-full bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 sm:p-10 text-center relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 to-amber-500' />
                <div className='w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-orange-600 shadow-sm'>
                  <Compass className='w-10 h-10' />
                </div>
                <h2 className='text-2xl font-bold text-zinc-900 mb-2 tracking-tight'>
                  Welcome to PanelForge
                </h2>
                <p className='text-sm text-zinc-500 mb-8 leading-relaxed'>
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
                  className='w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md'
                >
                  <Plus className='w-5 h-5' />
                  <span>Create Workspace (Tạo Studio Mới)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Populated State: Danh sách Workspace thật */
            <>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10'>
                <div>
                  <h1 className='text-3xl font-bold text-zinc-900 tracking-tight mb-2'>
                    Your Workspaces
                  </h1>
                  <p className='text-zinc-500 text-sm sm:text-base'>
                    Chọn một Studio Workspace để tiếp tục công việc sản xuất truyện tranh của bạn.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreate}
                  aria-label='Create Workspace'
                  disabled={isAdmin}
                  title={isAdmin ? 'Quản trị viên không thể tạo Studio (BR-07)' : 'Tạo Studio Mới'}
                  className='self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer'
                >
                  <Plus className='w-4 h-4' />
                  <span>Tạo Studio Mới</span>
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className='group bg-white rounded-2xl border border-zinc-200 hover:border-orange-500 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex flex-col relative'
                  >
                    {/* Highlight bar on hover */}
                    <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F97316] to-amber-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300' />

                    <div className='p-6 flex-1'>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='w-12 h-12 bg-gray-50 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-900 group-hover:scale-110 transition-transform duration-300'>
                          <Layers className='w-6 h-6' />
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full border text-xs font-semibold font-mono tracking-wide ${getRoleBadgeColor(ws.currentUserRole)}`}
                        >
                          {getRoleDisplayName(ws.currentUserRole)}
                        </div>
                      </div>

                      <h3 className='text-lg font-bold text-zinc-900 mb-2 group-hover:text-orange-500 transition-colors line-clamp-1'>
                        {ws.name}
                      </h3>

                      <div className='text-xs text-zinc-500 mb-6 flex flex-col gap-1.5'>
                        <div className='flex items-center gap-1.5'>
                          <span className='w-1.5 h-1.5 rounded-full bg-gray-300'></span>
                          <span>{ws.memberCount || 1} Members</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <span className='w-1.5 h-1.5 rounded-full bg-gray-300'></span>
                          <span>{getTimeAgo(ws.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className='px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between group-hover:bg-[#FFF7ED] transition-colors'>
                      <div className='flex items-center gap-2'>
                        {ws.pendingTasks > 0 ? (
                          <>
                            <div className='w-2 h-2 rounded-full bg-orange-500 animate-pulse' />
                            <span className='text-xs font-semibold text-zinc-900'>
                              {ws.pendingTasks} Pending Tasks
                            </span>
                          </>
                        ) : (
                          <>
                            <div className='w-2 h-2 rounded-full bg-emerald-500' />
                            <span className='text-xs font-semibold text-zinc-500'>
                              All caught up
                            </span>
                          </>
                        )}
                      </div>
                      <ArrowRight className='w-4 h-4 text-zinc-500 group-hover:text-orange-500 transform group-hover:translate-x-1 transition-all' />
                    </div>
                  </div>
                ))}

                {/* Create New Workspace Card */}
                <div
                  onClick={handleOpenCreate}
                  className='bg-white/50 hover:bg-white rounded-2xl border-2 border-dashed border-zinc-300 hover:border-zinc-900 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-6 min-h-[240px] text-center group shadow-sm hover:shadow-sm'
                >
                  <div className='w-12 h-12 rounded-full bg-gray-100 group-hover:bg-zinc-900 text-zinc-500 group-hover:text-white flex items-center justify-center mb-3 transition-colors'>
                    <Plus className='w-6 h-6' />
                  </div>
                  <h3 className='text-base font-bold text-zinc-900 mb-1'>Bắt đầu Studio mới</h3>
                  <p className='text-zinc-500 text-xs max-w-[200px]'>
                    Tạo Studio và mời các họa sĩ, tác giả cộng tác sản xuất.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal Tạo Workspace Thật (gọi POST /api/Workspaces) */}
      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newWs) => {
          setWorkspaces((prev) => [newWs, ...prev]);
        }}
      />
    </div>
  );
};
