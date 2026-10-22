import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  MoreVertical,
  Shield,
  Mail,
  Trash2,
  ArrowLeft,
  FolderKanban,
  Loader2,
  Edit,
} from 'lucide-react';
import { MangaProject } from '../../../types';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useToast } from '@/shared/context/ToastContext';
import { seriesService, SeriesMemberDto } from '@/services/series.service';
import { SeriesMembersModal } from '../modals/SeriesMembersModal';

interface ProjectMembersViewProps {
  projects: MangaProject[]; // Nhận toàn bộ danh sách dự án
}

const SERIES_ROLES = ['Writer', 'Artist', 'Letterer', 'Editor', 'Publisher'];

export const ProjectMembersView: React.FC<ProjectMembersViewProps> = ({ projects }) => {
  const confirm = useConfirm();
  const toast = useToast();

  // STATE ĐIỀU HƯỚNG: null = Đang ở màn hình chọn dự án, có data = Đang xem thành viên dự án đó
  const [selectedProject, setSelectedProject] = useState<MangaProject | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // State quản lý Modal Gán/Thêm Thành Viên Series
  const [isSeriesMembersModalOpen, setIsSeriesMembersModalOpen] = useState(false);

  const activeWorkspace = useMemo(() => {
    try {
      const saved = localStorage.getItem('activeWorkspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const workspaceId = activeWorkspace?.id || 'ws-default';

  // State quản lý Dropdown Thao Tác & Đổi Role
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState('Artist');

  // Danh sách thành viên thực tế của Series
  const [members, setMembers] = useState<SeriesMemberDto[]>([]);

  const loadSeriesMembers = async (seriesId: string) => {
    setLoading(true);
    try {
      const data = await seriesService.getSeriesMembers(workspaceId, seriesId);
      setMembers(data || []);
    } catch (err: any) {
      toast.error('Lỗi tải nhân sự', err.message || 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      loadSeriesMembers(String(selectedProject.id));
      setSearchQuery('');
      setOpenActionMenuId(null);
      setEditingUserId(null);
    }
  }, [selectedProject]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.seriesRole?.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const toggleActionMenu = (id: string) => {
    setOpenActionMenuId(openActionMenuId === id ? null : id);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!selectedProject) return;
    try {
      await seriesService.updateSeriesMember(workspaceId, String(selectedProject.id), userId, {
        seriesRole: newRole,
      });
      toast.success('Thành công', `Đã cập nhật vai trò thành ${newRole}`);
      setEditingUserId(null);
      setOpenActionMenuId(null);
      await loadSeriesMembers(String(selectedProject.id));
    } catch (err: any) {
      toast.error('Lỗi cập nhật', err.message || 'Không thể cập nhật vai trò');
    }
  };

  const handleRemoveMember = async (member: SeriesMemberDto) => {
    if (!selectedProject) return;
    const confirmed = await confirm({
      title: 'Xóa thành viên khỏi dự án?',
      description: `Bạn có chắc chắn muốn xóa thành viên "${member.fullName || member.email}" khỏi dự án "${selectedProject.title}"?`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await seriesService.removeSeriesMember(workspaceId, String(selectedProject.id), member.userId);
        toast.success(
          'Đã xóa thành viên',
          `Đã loại "${member.fullName || member.email}" khỏi dự án.`,
        );
        await loadSeriesMembers(String(selectedProject.id));
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
        className='flex items-center gap-2 text-sm text-gray-500 hover:text-[#171717] transition w-fit mb-4 cursor-pointer'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại danh sách dự án
      </button>

      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-[#171717]'>
            Nhân sự: <span className='text-[#F97316]'>{selectedProject.title}</span>
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Quản lý đội ngũ sản xuất và phân quyền vai trò cho dự án này
          </p>
        </div>
        <button
          onClick={() => setIsSeriesMembersModalOpen(true)}
          className='flex items-center gap-2 bg-[#F97316] text-white px-4 py-2 rounded-lg hover:bg-[#EA580C] transition shadow-sm cursor-pointer shrink-0'
        >
          <UserPlus className='w-4 h-4' />
          <span>Gán nhân sự vào Series</span>
        </button>
      </div>

      <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col'>
        <div className='p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50'>
          <input
            type='text'
            placeholder='Tìm kiếm thành viên...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-1/3 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#F97316] text-sm bg-white'
          />
          <div className='text-sm text-gray-500 font-medium'>
            Tổng số: {members.length} thành viên
          </div>
        </div>

        <div className='overflow-x-auto flex-1'>
          {loading ? (
            <div className='py-16 text-center text-gray-400 text-sm flex flex-col items-center gap-2'>
              <Loader2 className='w-6 h-6 animate-spin text-[#F97316]' />
              <span>Đang tải danh sách nhân sự...</span>
            </div>
          ) : (
            <table className='w-full text-left border-collapse min-w-[600px]'>
              <thead>
                <tr className='bg-white border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider'>
                  <th className='p-4 font-medium w-2/5'>Thành viên</th>
                  <th className='p-4 font-medium w-1/4'>Vai trò Series</th>
                  <th className='p-4 font-medium w-1/4'>Ngày tham gia</th>
                  <th className='p-4 font-medium text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id || member.userId}
                      className='border-b border-gray-50 hover:bg-gray-50/50 transition relative'
                    >
                      <td className='p-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-9 h-9 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden'>
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.fullName} className='w-full h-full object-cover' />
                            ) : (
                              (member.fullName || member.email || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className='min-w-0'>
                            <p className='font-semibold text-sm text-[#171717] truncate'>
                              {member.fullName || 'Thành viên'}
                            </p>
                            <p className='text-xs text-gray-500 flex items-center gap-1 truncate'>
                              <Mail className='w-3 h-3 shrink-0' /> {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='p-4'>
                        {editingUserId === member.userId ? (
                          <div className='flex items-center gap-2'>
                            <select
                              value={selectedNewRole}
                              onChange={(e) => setSelectedNewRole(e.target.value)}
                              className='text-xs px-2 py-1 border border-gray-300 rounded bg-white'
                            >
                              {SERIES_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleChangeRole(member.userId, selectedNewRole)}
                              className='text-xs bg-emerald-600 text-white px-2 py-1 rounded font-semibold cursor-pointer'
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className='text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded cursor-pointer'
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <span className='flex items-center gap-1.5 text-sm font-medium text-gray-700 whitespace-nowrap'>
                            <Shield className='w-4 h-4 text-gray-400 shrink-0' />
                            {member.seriesRole}
                          </span>
                        )}
                      </td>
                      <td className='p-4 text-xs text-gray-500 whitespace-nowrap'>
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className='p-4 text-right relative'>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActionMenu(member.userId);
                          }}
                          className='p-2 text-gray-400 hover:text-[#171717] rounded-lg hover:bg-gray-200 transition cursor-pointer'
                        >
                          <MoreVertical className='w-4 h-4' />
                        </button>

                        {openActionMenuId === member.userId && (
                          <div className='absolute right-8 top-10 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden text-left animate-in slide-in-from-top-2 duration-150'>
                            <button
                              onClick={() => {
                                setEditingUserId(member.userId);
                                setSelectedNewRole(member.seriesRole || 'Artist');
                                setOpenActionMenuId(null);
                              }}
                              className='w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer'
                            >
                              <Edit className='w-3.5 h-3.5 text-gray-500' /> Đổi vai trò
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member)}
                              className='w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 transition-colors cursor-pointer'
                            >
                              <Trash2 className='w-3.5 h-3.5' /> Xóa khỏi dự án
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className='p-8 text-center text-gray-500 text-sm'>
                      Chưa có thành viên nào trong dự án này. Hãy bấm "Gán nhân sự vào Series" để thêm từ Workspace Talent Pool.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {openActionMenuId !== null && (
        <div className='fixed inset-0 z-10' onClick={() => setOpenActionMenuId(null)} />
      )}

      {/* Series Members Modal */}
      {selectedProject && (
        <SeriesMembersModal
          isOpen={isSeriesMembersModalOpen}
          workspaceId={workspaceId}
          seriesId={String(selectedProject.id)}
          seriesTitle={selectedProject.title}
          onClose={() => setIsSeriesMembersModalOpen(false)}
          onMembersChanged={() => loadSeriesMembers(String(selectedProject.id))}
        />
      )}
    </div>
  );
};
