import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  MoreVertical,
  Shield,
  Mail,
  X,
  Edit,
  Lock,
  Unlock,
  Trash2,
  ArrowLeft,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { MangaProject } from '../../../types';
import { InviteMemberModal } from '../modals/InviteMemberModal';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useToast } from '@/shared/context/ToastContext';

interface ProjectMembersViewProps {
  projects: MangaProject[]; // Nhận toàn bộ danh sách dự án
}

export const ProjectMembersView: React.FC<ProjectMembersViewProps> = ({ projects }) => {
  const confirm = useConfirm();
  // STATE ĐIỀU HƯỚNG: null = Đang ở màn hình chọn dự án, có data = Đang xem thành viên dự án đó
  const [selectedProject, setSelectedProject] = useState<MangaProject | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // State quản lý Modal Mời Thành Viên & Toast
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const toast = useToast();
  const showToast = toast.showToast;

  const activeWorkspace = useMemo(() => {
    try {
      const saved = localStorage.getItem('activeWorkspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const workspaceId = activeWorkspace?.id || selectedProject?.id || 'ws-default';
  const workspaceName = activeWorkspace?.name || selectedProject?.title;

  // State quản lý Dropdown Thao Tác
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  // Dữ liệu mock thành viên
  const [members, setMembers] = useState([
    {
      id: 1,
      name: 'Tatsuki Fujimoto',
      role: 'Artist (Lead)',
      email: 'tatsuki@studio.com',
      status: 'Active',
    },
    { id: 2, name: 'Aka Akasaka', role: 'Writer', email: 'aka@studio.com', status: 'Active' },
    { id: 3, name: 'Shiro', role: 'Letterer', email: 'shiro@studio.com', status: 'Offline' },
  ]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleActionMenu = (id: number) => {
    setOpenActionMenuId(openActionMenuId === id ? null : id);
  };

  const toggleMemberStatus = (id: number) => {
    setMembers(
      members.map((member) =>
        member.id === id
          ? { ...member, status: member.status === 'Locked' ? 'Active' : 'Locked' }
          : member,
      ),
    );
    setOpenActionMenuId(null);
  };

  const handleRemoveMember = async (id: number) => {
    const member = members.find((m) => m.id === id);
    if (
      await confirm({
        title: 'Xóa thành viên khỏi dự án?',
        description: `Bạn có chắc chắn muốn xóa thành viên "${member?.name || member?.email || 'này'}" khỏi dự án?`,
        confirmText: 'Xác nhận xóa',
        cancelText: 'Giữ lại',
        variant: 'danger',
      })
    ) {
      try {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        toast.success(
          'Đã xóa thành viên thành công',
          `Đã xóa "${member?.name || member?.email}" khỏi dự án.`,
        );
      } catch (err: any) {
        toast.error('Xóa thành viên thất bại', err.message || 'Không thể xóa thành viên khỏi dự án.');
      }
    }
    setOpenActionMenuId(null);
  };

  // ==========================================
  // MÀN HÌNH 1: HIỂN THỊ DANH SÁCH DỰ ÁN
  // ==========================================
  if (!selectedProject) {
    return (
      <div className='p-6 h-full flex flex-col bg-[#FAF8F4] overflow-y-auto custom-scrollbar'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-[#171717]'>Chọn dự án</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Chọn một dự án bên dưới để xem và quản lý nhân sự
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition group'
            >
              <div className='flex items-start justify-between mb-4'>
                <div className='w-10 h-10 bg-[#FFF7ED] text-[#F97316] rounded-lg flex items-center justify-center group-hover:bg-[#F97316] group-hover:text-white transition-colors'>
                  <FolderKanban className='w-5 h-5' />
                </div>
                <span className='text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600'>
                  {project.status}
                </span>
              </div>
              <h3 className='font-bold text-[#171717] mb-1 truncate'>{project.title}</h3>
              <p className='text-sm text-gray-500 line-clamp-1'>{project.subtitle}</p>

              <div className='mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-sm'>
                <span className='text-gray-500'>Thành viên:</span>
                <span className='font-bold text-[#171717]'>Quản lý ngay →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // MÀN HÌNH 2: HIỂN THỊ THÀNH VIÊN CỦA DỰ ÁN
  // ==========================================
  return (
    <div className='p-6 h-full flex flex-col bg-[#FAF8F4] relative'>
      {/* Nút quay lại */}
      <button
        onClick={() => setSelectedProject(null)}
        className='flex items-center gap-2 text-sm text-gray-500 hover:text-[#171717] transition w-fit mb-4'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại danh sách dự án
      </button>

      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-[#171717]'>
            Nhân sự: <span className='text-[#F97316]'>{selectedProject.title}</span>
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Quản lý đội ngũ sản xuất và phân quyền cho dự án này
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className='flex items-center gap-2 bg-[#F97316] text-white px-4 py-2 rounded-lg hover:bg-[#EA580C] transition shadow-sm'
        >
          <UserPlus className='w-4 h-4' />
          <span>Mời thành viên</span>
        </button>
      </div>

      <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1'>
        <div className='p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50'>
          <input
            type='text'
            placeholder='Tìm kiếm thành viên...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-1/3 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#F97316] text-sm'
          />
          <div className='text-sm text-gray-500 font-medium'>
            Tổng số: {members.length} thành viên
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse min-w-[600px]'>
            <thead>
              <tr className='bg-white border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider'>
                <th className='p-4 font-medium w-2/5'>Thành viên</th>
                <th className='p-4 font-medium w-1/4'>Vai trò</th>
                <th className='p-4 font-medium w-1/4'>Trạng thái</th>
                <th className='p-4 font-medium text-right'>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className='border-b border-gray-50 hover:bg-gray-50/50 transition relative'
                  >
                    <td className='p-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-9 h-9 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs shrink-0'>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className='min-w-0'>
                          <p className='font-semibold text-sm text-[#171717] truncate'>
                            {member.name}
                          </p>
                          <p className='text-xs text-gray-500 flex items-center gap-1 truncate'>
                            <Mail className='w-3 h-3 shrink-0' /> {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='p-4'>
                      <span className='flex items-center gap-1.5 text-sm font-medium text-gray-700 whitespace-nowrap'>
                        <Shield className='w-4 h-4 text-gray-400 shrink-0' />
                        {member.role}
                      </span>
                    </td>
                    <td className='p-4'>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                          ${
                            member.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : member.status === 'Locked'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className='p-4 text-right relative'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActionMenu(member.id);
                        }}
                        className='p-2 text-gray-400 hover:text-[#171717] rounded-lg hover:bg-gray-200 transition'
                      >
                        <MoreVertical className='w-4 h-4' />
                      </button>

                      {openActionMenuId === member.id && (
                        <div className='absolute right-8 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden text-left animate-in slide-in-from-top-2 duration-150'>
                          <button
                            onClick={() => {
                              console.log('Chỉnh sửa role');
                              setOpenActionMenuId(null);
                            }}
                            className='w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors'
                          >
                            <Edit className='w-4 h-4 text-gray-500' /> Đổi vai trò
                          </button>
                          <button
                            onClick={() => toggleMemberStatus(member.id)}
                            className='w-full px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 border-t border-gray-100 transition-colors'
                          >
                            {member.status === 'Locked' ? (
                              <>
                                <Unlock className='w-4 h-4' /> Mở khóa tài khoản
                              </>
                            ) : (
                              <>
                                <Lock className='w-4 h-4' /> Khóa tài khoản
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className='w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 transition-colors'
                          >
                            <Trash2 className='w-4 h-4' /> Xóa khỏi dự án
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className='p-8 text-center text-gray-500'>
                    Không tìm thấy thành viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openActionMenuId !== null && (
        <div className='fixed inset-0 z-10' onClick={() => setOpenActionMenuId(null)} />
      )}



      {/* Unified Invite Member Modal with Lucian #285 and Batch Invite */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        onClose={() => setIsInviteModalOpen(false)}
        onInvited={(newMember) => {
          setMembers((prev) => [
            ...prev,
            {
              id: Date.now(),
              name: newMember.fullName || newMember.email.split('@')[0],
              email: newMember.email,
              role: String(newMember.role),
              status: newMember.status || 'Active',
            },
          ]);
        }}
        onShowToast={showToast}
      />
    </div>
  );
};
